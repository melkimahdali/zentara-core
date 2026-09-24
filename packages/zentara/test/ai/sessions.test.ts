import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import type { SessionUI } from "../../src/ai/session.js";
import { createAiSession } from "../../src/ai/session.js";
import { resolveAiConfig } from "../../src/ai/config.js";
import { estimateTokens, listSessions, loadSession, newSessionId, saveSession } from "../../src/ai/sessions.js";

let root: string;
beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-sessions-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "demo", scripts: {} }));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("penyimpanan sesi", () => {
  it("simpan, muat, urutkan terbaru dulu, dan hanya bisa dibaca pemilik", () => {
    const base = { createdAt: "2026-01-01T00:00:00.000Z", messages: [{ role: "user" as const, text: "halo" }] };
    saveSession(root, { ...base, id: "a", title: "lama", updatedAt: "2026-01-01T00:00:00.000Z" });
    saveSession(root, { ...base, id: "b", title: "baru", updatedAt: "2026-02-01T00:00:00.000Z" });
    assert.deepEqual(listSessions(root).map((s) => s.title), ["baru", "lama"]);
    assert.equal(listSessions(root)[0]!.turns, 1);
    assert.deepEqual(loadSession(root, "a")!.messages, base.messages);
    if (process.platform !== "win32") assert.equal(fs.statSync(path.join(root, ".zentara", "sessions", "a.json")).mode & 0o777, 0o600);
  });

  it("ID dengan path ditolak; file rusak dilewati; sesi lama dipangkas", () => {
    assert.throws(() => loadSession(root, "../../etc/passwd") ?? saveSession(root, { id: "../x", title: "", createdAt: "", updatedAt: "", messages: [] }), /tidak valid/);
    fs.mkdirSync(path.join(root, ".zentara", "sessions"), { recursive: true });
    fs.writeFileSync(path.join(root, ".zentara", "sessions", "rusak.json"), "{");
    fs.utimesSync(path.join(root, ".zentara", "sessions", "rusak.json"), new Date(2000, 0, 1), new Date(2000, 0, 1));
    const dir = path.join(root, ".zentara", "sessions");
    for (let i = 0; i < 35; i++) {
      saveSession(root, { id: `s${i}`, title: `t${i}`, createdAt: "", updatedAt: new Date(2026, 0, 1, 0, i).toISOString(), messages: [] });
      const at = new Date(2026, 0, 1, 0, i);
      fs.utimesSync(path.join(dir, `s${i}.json`), at, at);
    }
    const list = listSessions(root);
    assert.equal(list.length, 30);
    assert.ok(!fs.existsSync(path.join(dir, "s0.json")));
    assert.ok(!fs.existsSync(path.join(dir, "rusak.json")), "file rusak yang lama ikut dipangkas");
    assert.equal(list[0]!.title, "t34");
    assert.match(newSessionId(), /^[\w-]+$/);
  });
});

/** Server OpenAI-compatible palsu: meringkas bila diminta, selain itu menjawab "selesai N". */
async function fakeModel() {
  const requests: any[] = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw);
      requests.push(body);
      const last = body.messages.at(-1).content as string;
      const content = /^Ringkas seluruh percakapan/.test(last) ? "- Pengguna membuat API produk." : `selesai ${requests.length}`;
      res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify({ choices: [{ message: { content }, finish_reason: "stop" }] }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`;
  return { base, requests, close: () => new Promise<void>((r) => server.close(() => r())) };
}

const quiet: SessionUI & { infos: string[] } = {
  infos: [],
  thinking() {},
  assistant() {},
  toolStart() {},
  toolEnd() {},
  info(m) {
    quiet.infos.push(m);
  },
  fallback() {},
};

describe("AiSession: simpan, lanjutkan, ringkas", () => {
  it("percakapan tersimpan lalu bisa dilanjutkan di sesi baru", async () => {
    const model = await fakeModel();
    try {
      const config = resolveAiConfig({ providers: [{ type: "openai-compatible", name: "lokal", baseUrl: model.base, model: "m" }] }, {});
      const first = createAiSession({ root, config, ui: quiet, persist: true });
      await first.run("buat API produk");
      await first.run("tambah harga");
      const saved = listSessions(root);
      assert.equal(saved.length, 1);
      assert.equal(saved[0]!.title, "buat API produk");
      assert.equal(saved[0]!.id, first.id);

      const second = createAiSession({ root, config, ui: quiet, persist: true });
      assert.equal(second.resume(saved[0]!.id), true);
      await second.run("lanjut");
      // Riwayat lama ikut terkirim, tanpa gambaran proyek ganda.
      const sent = model.requests.at(-1).messages.map((m: any) => m.content);
      assert.ok(sent.some((c: string) => c?.includes("buat API produk")));
      assert.equal(sent.filter((c: string) => c?.includes("<project>")).length, 1);
      assert.equal(listSessions(root).length, 1);
      assert.equal(second.resume("tidak-ada"), false);
    } finally {
      await model.close();
    }
  });

  it("/compact meringkas riwayat; otomatis saat melewati ai.compactAt", async () => {
    const model = await fakeModel();
    try {
      const config = resolveAiConfig({ providers: [{ type: "openai-compatible", name: "lokal", baseUrl: model.base, model: "m" }], compactAt: 0 }, {});
      const session = createAiSession({ root, config, ui: quiet, persist: true });
      assert.equal(await session.compact(), undefined, "percakapan kosong tidak diringkas");
      await session.run("buat API produk " + "x".repeat(4000));
      await session.run("tambah harga");
      const before = session.tokens;
      const res = await session.compact();
      assert.ok(res && res.after < res.before && res.before === before);
      // Permintaan ringkasan tanpa tools.
      assert.equal("tools" in model.requests.at(-1), false);
      await session.run("lanjut");
      const sent = model.requests.at(-1).messages.map((m: any) => m.content).join("\n");
      assert.match(sent, /Pengguna membuat API produk/);
      assert.match(sent, /<project>/, "gambaran proyek dikirim ulang setelah diringkas");
      assert.doesNotMatch(sent, /x{100}/);

      const auto = createAiSession({ root, config: { ...config, compactAt: 500 }, ui: quiet });
      await auto.run("tugas " + "y".repeat(4000));
      quiet.infos.length = 0;
      await auto.run("berikutnya");
      assert.ok(quiet.infos.some((m) => /meringkas dulu/.test(m)));
      assert.ok(auto.tokens < 1000);
      assert.equal(estimateTokens([]), 1);
    } finally {
      await model.close();
    }
  });
});
