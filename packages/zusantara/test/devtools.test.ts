import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { resolveAiConfig } from "../src/ai/config.js";
import { startDevtools, type Devtools } from "../src/dev/devtools.js";

/**
 * Server palsu berformat OpenAI: langkah 1 menulis file, langkah 2 menjawab selesai, lalu (diminta memeriksa
 * halaman yang berubah) memanggil view_page dan menjawab selesai.
 */
async function fakeModel() {
  let calls = 0;
  const call = (id: string, name: string, args: unknown) => ({ id, type: "function", function: { name, arguments: JSON.stringify(args) } });
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      calls++;
      const message =
        calls === 1
          ? { content: "Saya buat halamannya.", tool_calls: [call("c1", "write_file", { path: "src/app/routes/tentang.ts", content: "export const GET = () => 'hai';\n" })] }
          : calls === 3
            ? { content: "", tool_calls: [call("c2", "view_page", { url: "/tentang" })] }
            : { content: "Selesai, buka /tentang." };
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message, finish_reason: message.tool_calls ? "tool_calls" : "stop" }] }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`, close: () => new Promise<void>((r) => server.close(() => r())) };
}

describe("devtools (chat AI dari browser)", () => {
  let root: string;
  let model: Awaited<ReturnType<typeof fakeModel>>;
  let dt: Devtools;
  let base: string;
  const logs: string[] = [];

  before(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-devtools-"));
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "uji", scripts: {} }));
    model = await fakeModel();
    const config = resolveAiConfig({ mode: "ask", providers: [{ type: "openai-compatible", name: "palsu", baseUrl: model.url, model: "m" }] });
    dt = await startDevtools({ root, loadConfig: async () => config, log: (l) => logs.push(l) });
    base = `http://127.0.0.1:${dt.port}`;
  });
  after(async () => {
    await dt.close();
    await model.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const auth = () => ({ "X-Zusantara-Token": dt.token, "Content-Type": "application/json" });

  it("menolak request tanpa token yang benar", async () => {
    assert.equal((await fetch(`${base}/status`)).status, 401);
    assert.equal((await fetch(`${base}/status`, { headers: { "X-Zusantara-Token": "salah" } })).status, 401);
  });

  it("menolak origin di luar localhost dan Host asing (DNS rebinding)", async () => {
    const evil = await fetch(`${base}/status`, { headers: { ...auth(), Origin: "https://situs-jahat.example" } });
    assert.equal(evil.status, 403);
    const rebinding = await new Promise<number>((resolve, reject) => {
      http
        .get({ host: "127.0.0.1", port: dt.port, path: "/status", headers: { host: "situs-jahat.example", "x-zusantara-token": dt.token } }, (res) => {
          res.resume();
          resolve(res.statusCode ?? 0);
        })
        .on("error", reject);
    });
    assert.equal(rebinding, 403);
  });

  it("preflight CORS hanya untuk localhost", async () => {
    const res = await fetch(`${base}/chat`, { method: "OPTIONS", headers: { Origin: "http://localhost:3000", "Access-Control-Request-Method": "POST" } });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("access-control-allow-origin"), "http://localhost:3000");
    assert.match(res.headers.get("access-control-allow-headers") ?? "", /X-Zusantara-Token/);
  });

  it("status menampilkan provider dan mode", async () => {
    const status = (await (await fetch(`${base}/status`, { headers: auth() })).json()) as { providers: string[]; mode: string; busy: boolean };
    assert.deepEqual({ providers: status.providers, mode: status.mode, busy: status.busy }, { providers: ["palsu"], mode: "ask", busy: false });
  });

  it("chat: rencana, persetujuan dari browser, file ditulis, lalu bisa di-undo", async (t) => {
    // Server aplikasi tidak berjalan (port 1): view_page tidak bisa melihat apa pun, jadi tugas tetap selesai.
    const savedPort = process.env.PORT;
    process.env.PORT = "1";
    t.after(() => {
      if (savedPort === undefined) delete process.env.PORT;
      else process.env.PORT = savedPort;
    });
    const res = await fetch(`${base}/chat`, { method: "POST", headers: auth(), body: JSON.stringify({ message: "buatkan halaman tentang" }) });
    assert.equal(res.status, 200);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    const events: Record<string, any>[] = [];
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop()!;
      for (const line of lines.filter(Boolean)) {
        const event = JSON.parse(line) as Record<string, any>;
        events.push(event);
        if (event.type === "approval") {
          // Sementara menunggu persetujuan, tugas lain ditolak.
          const busy = await fetch(`${base}/chat`, { method: "POST", headers: auth(), body: JSON.stringify({ message: "lain" }) });
          assert.equal(busy.status, 409);
          await fetch(`${base}/approve`, { method: "POST", headers: auth(), body: JSON.stringify({ id: event.id, answer: "yes" }) });
        }
      }
    }
    const types = events.map((e) => e.type);
    assert.ok(types.includes("assistant"));
    const approval = events.find((e) => e.type === "approval")!;
    assert.match(approval.summary, /Buat src\/app\/routes\/tentang\.ts/);
    const done = events.at(-1)!;
    assert.equal(done.type, "done");
    assert.equal(done.status, "done");
    assert.deepEqual(done.changedFiles, ["src/app/routes/tentang.ts"]);
    assert.ok(fs.existsSync(path.join(root, "src/app/routes/tentang.ts")));

    const undo = (await (await fetch(`${base}/undo`, { method: "POST", headers: auth() })).json()) as unknown;
    assert.deepEqual(undo, { ok: true, files: ["src/app/routes/tentang.ts"] });
    assert.ok(!fs.existsSync(path.join(root, "src/app/routes/tentang.ts")));
    assert.ok(logs.some((l) => l.includes("buatkan halaman tentang")));
  });
});
