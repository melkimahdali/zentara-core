import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { formatPreview, renderMarkdown, TerminalUI } from "../src/ai/terminal.js";
import { DevServer, isServerUp } from "../src/dev/server.js";
import { devWatchArgs } from "../src/cli.js";

describe("DevServer (npm run dev di latar belakang)", () => {
  let root: string;
  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-devserver-"));
    // "Server" palsu: mencetak baris siap seperti Zusantara, lalu hidup sampai dihentikan.
    fs.writeFileSync(
      path.join(root, "server.mjs"),
      `import http from "node:http";
const s = http.createServer((q, r) => r.end("ok")).listen(0, "127.0.0.1", () => {
  console.log("[INFO] 🚀 Running at http://127.0.0.1:" + s.address().port);
  console.error("[ERROR] contoh error");
});`,
    );
  });
  after(() => fs.rmSync(root, { recursive: true, force: true }));

  it("tanpa skrip dev: memakai perintah cadangan, menangkap URL, log, dan error; stop menghentikan server", async () => {
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "x" }));
    const server = new DevServer({ cwd: root, env: process.env, fallback: { command: process.execPath, args: ["server.mjs"] } });
    assert.equal(server.commandText, "zusantara dev");
    const errors: string[] = [];
    server.on("problem", (l: string) => errors.push(l));
    const ready = new Promise<string>((resolve) => server.once("ready", resolve));
    server.start();
    const url = await ready;
    assert.match(url, /^http:\/\/127\.0\.0\.1:\d+$/);
    assert.equal(server.state, "running");
    assert.ok(await isServerUp(url));
    await new Promise((r) => setTimeout(r, 100));
    assert.ok(server.logs().some((l) => l.includes("Running at")));
    assert.deepEqual(errors, ["[ERROR] contoh error"]);
    await server.stop();
    assert.equal(server.running, false);
    assert.equal(await isServerUp(url), false);
  });

  it("dengan skrip dev: menjalankan npm run dev", async () => {
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "x", scripts: { dev: "node server.mjs" } }));
    const server = new DevServer({ cwd: root, env: process.env, fallback: { command: "false", args: [] } });
    assert.equal(server.commandText, "npm run dev");
    const ready = new Promise<string>((resolve) => server.once("ready", resolve));
    server.start();
    const url = await ready;
    await server.stop();
    assert.equal(await isServerUp(url), false, "seluruh pohon proses (npm → node) ikut berhenti");
  });
});

describe("tampilan terminal", () => {
  it("renderMarkdown: bullet, kode, dan blok kode", () => {
    const out = renderMarkdown("Rencana:\n- buat `a.ts`\n```\nconst x = 1;\n```").replace(/\x1b\[[0-9;]*m/g, "");
    assert.equal(out, "Rencana:\n• buat a.ts\n│ const x = 1;");
  });

  it("TerminalUI: jawaban yang dialirkan dicetak per baris, sekali saja", () => {
    const lines: string[] = [];
    const ui = new TerminalUI({ out: (l) => lines.push(l.replace(/\x1b\[[0-9;]*m/g, "")), err: () => {} });
    ui.thinking("x");
    for (const d of ["\nRenc", "ana:\n- buat `a", ".ts`\n```\nconst x", " = 1;\n```\nSel", "esai"]) ui.assistantDelta(d);
    assert.deepEqual(lines, ["\n⏺ Rencana:", "  • buat a.ts", "  │ const x = 1;"]);
    ui.assistant("Rencana:\n- buat `a.ts`\n```\nconst x = 1;\n```\nSelesai", "x");
    assert.deepEqual(lines.slice(3), ["  Selesai"]);
    // Tanpa streaming, jawaban utuh tetap dicetak seperti biasa.
    ui.thinking("x");
    ui.assistant("Halo", "x");
    assert.deepEqual(lines.slice(4), ["\n⏺ Halo"]);
  });

  it("formatPreview: diff dan nomor baris file baru", () => {
    const strip = (l: string) => l.replace(/\x1b\[[0-9;]*m/g, "");
    assert.deepEqual(formatPreview({ tool: "edit_file", risk: "write", summary: "", preview: "@@ -1,1 +1,1 @@\n-a\n+b", previewKind: "diff" }).map(strip), ["@@ -1,1 +1,1 @@", "-a", "+b"]);
    assert.deepEqual(formatPreview({ tool: "write_file", risk: "write", summary: "", preview: "x\ny" }).map(strip), ["  1 x", "  2 y"]);
  });

  it("zusantara dev juga memantau folder aplikasi (route baru) dan .env", () => {
    const args = devWatchArgs("/proj", "/proj/src/app", "serve.js");
    assert.deepEqual(args.slice(-1), ["serve.js"]);
    assert.ok(args.includes("/proj/src/app"));
    assert.ok(args.includes(path.join("/proj", ".env")));
  });
});
