import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { resolveAiConfig } from "../src/ai/config.js";
import { agentTools, createScriptRunner } from "../src/ai/tools.js";
import { ZenRuntime } from "../src/core/index.js";
import { setAppInfo } from "../src/core/devpage/info.js";
import { injectDevTools } from "../src/core/devpage/widget.js";
import { startDevtools, type Devtools } from "../src/dev/devtools.js";
import { checkExpect, formatSnapshot, htmlOutline, normalizeSnapshot, resolveViewTarget, viewPage } from "../src/dev/view.js";
import { setLocale } from "../src/i18n/index.js";

const DOC = "<!doctype html><html><head><title>Catatan</title></head><body><h1>Catatan</h1></body></html>";
const DEV_ENV = { ZUSANTARA_DEV: "1", ZUSANTARA_DEVTOOLS_PORT: "4567", ZUSANTARA_DEVTOOLS_TOKEN: "tok" };

function setEnv(values: Record<string, string | undefined>): () => void {
  const previous = Object.fromEntries(Object.keys(values).map((k) => [k, process.env[k]]));
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  return () => {
    for (const [k, v] of Object.entries(previous)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  };
}

function devApp(debug: boolean): void {
  setAppInfo({ appName: "Uji", env: debug ? "development" : "production", debug, root: process.cwd(), routes: [] });
}

describe("widget chat: hanya disisipkan oleh server pengembangan", () => {
  let restore: () => void = () => {};
  afterEach(() => {
    restore();
    devApp(false);
  });

  it("disisipkan bila debug + ZUSANTARA_DEV + devtools", () => {
    devApp(true);
    restore = setEnv({ ...DEV_ENV, NODE_ENV: undefined });
    const out = injectDevTools(DOC, { route: "src/app/routes/notes/index.ts" });
    assert.match(out, /<head><script src="\/_zusantara\/dev\/probe\.js" data-port="4567" data-route="src\/app\/routes\/notes\/index\.ts"><\/script><title>/);
    assert.match(out, /<script src="\/_zusantara\/dev\/widget\.js" data-port="4567" data-token="tok" data-ui="on" defer><\/script><\/body>/);
  });

  for (const [name, env, debug] of [
    ["tanpa ZUSANTARA_DEV", { ...DEV_ENV, ZUSANTARA_DEV: undefined }, true],
    ["NODE_ENV=production", { ...DEV_ENV, NODE_ENV: "production" }, true],
    ["mode debug mati", DEV_ENV, false],
    ["tanpa token devtools", { ...DEV_ENV, ZUSANTARA_DEVTOOLS_TOKEN: undefined }, true],
  ] as const) {
    it(`tidak disisipkan: ${name}`, () => {
      devApp(debug);
      restore = setEnv({ NODE_ENV: undefined, ...env });
      assert.equal(injectDevTools(DOC), DOC);
    });
  }

  it("potongan HTML, request htmx, dan halaman yang sudah punya chat", () => {
    devApp(true);
    restore = setEnv({ ...DEV_ENV, NODE_ENV: undefined });
    assert.equal(injectDevTools("<tr><td>1</td></tr>"), "<tr><td>1</td></tr>");
    assert.equal(injectDevTools(DOC, { headers: { "hx-request": "true" } }), DOC);
    const own = injectDevTools(`<!doctype html><html><head></head><body><script>window.ZusantaraChat = {}</script></body></html>`);
    assert.match(own, /data-ui="off"/);
  });
});

describe("widget chat di server aplikasi", () => {
  let dir: string;
  let restore: () => void = () => {};

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-widget-"));
    fs.mkdirSync(path.join(dir, "routes"));
    fs.writeFileSync(path.join(dir, "routes", "index.ts"), `export const GET = () => ${JSON.stringify(DOC)};\n`);
    fs.writeFileSync(path.join(dir, "routes", "data.ts"), `export const GET = () => ({ ok: true });\n`);
    fs.writeFileSync(path.join(dir, "routes", "part.ts"), `export const GET = () => "<li>satu</li>";\n`);
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  afterEach(() => restore());

  async function start(debug: boolean) {
    const runtime = new ZenRuntime({ port: 0, host: "127.0.0.1", logLevel: "silent", routesDir: path.join(dir, "routes"), publicDir: false, debug });
    const { port } = await runtime.start();
    return { runtime, base: `http://127.0.0.1:${port}` };
  }

  it("saat pengembangan: halaman memuat widget, script tersedia, JSON dan potongan tidak diubah", async () => {
    restore = setEnv({ ...DEV_ENV, NODE_ENV: undefined });
    const { runtime, base } = await start(true);
    try {
      const page = await (await fetch(`${base}/`, { headers: { Accept: "text/html" } })).text();
      assert.match(page, /\/_zusantara\/dev\/probe\.js/);
      assert.match(page, /\/_zusantara\/dev\/widget\.js/);
      assert.match(page, /data-route="[^"]*routes\/index\.ts"/);
      const widget = await fetch(`${base}/_zusantara/dev/widget.js`);
      assert.equal(widget.status, 200);
      assert.match(widget.headers.get("content-type") ?? "", /javascript/);
      const js = await widget.text();
      assert.match(js, /window\.ZusantaraChat = /);
      assert.match(js, /Tanya Zusantara AI/);
      assert.match(await (await fetch(`${base}/_zusantara/dev/probe.js`)).text(), /__zusantaraDev/);
      assert.deepEqual(await (await fetch(`${base}/data`)).json(), { ok: true });
      assert.equal(await (await fetch(`${base}/part`)).text(), "<li>satu</li>");
      // Halaman 404 pengembangan juga terhubung ke kanal halaman (tanpa tombol ganda).
      const notFound = await (await fetch(`${base}/tidak-ada`, { headers: { Accept: "text/html" } })).text();
      assert.match(notFound, /\/_zusantara\/dev\/widget\.js/);
    } finally {
      await runtime.stop();
    }
  });

  it("produksi: HTML tanpa widget dan script 404, walau env devtools terbawa", async () => {
    restore = setEnv({ ...DEV_ENV, NODE_ENV: "production" });
    const { runtime, base } = await start(false);
    try {
      const page = await (await fetch(`${base}/`, { headers: { Accept: "text/html" } })).text();
      assert.equal(page, DOC);
      assert.doesNotMatch(page, /_zusantara\/dev/);
      assert.equal((await fetch(`${base}/_zusantara/dev/widget.js`)).status, 404);
      assert.equal((await fetch(`${base}/_zusantara/dev/probe.js`)).status, 404);
    } finally {
      await runtime.stop();
    }
  });
});

describe("melihat halaman (view_page)", () => {
  // Hasil view_page mengikuti bahasa Zusantara; uji di sini memakai teks Bahasa Inggris.
  before(() => setLocale("en"));
  after(() => setLocale("id"));
  const html = `<!doctype html><html><head><title>Catatan · Uji</title><style>h1{}</style></head><body>
    <nav><a href="/dashboard">Dasbor</a></nav><main><h1>Catatan</h1>
    <div role="alert">Tersimpan &amp; aman</div>
    <form method="post" action="/notes"><label>Judul</label><input name="title" placeholder="Judul" required><input type="hidden" name="_x" value="rahasia"><button>Simpan</button></form>
    <table><thead><tr><th>Judul</th><th>Dibuat</th></tr></thead><tbody><tr><td>A</td><td>1</td></tr><tr><td>B</td><td>2</td></tr></tbody></table>
    <script>console.log("abaikan")</script></main></body></html>`;

  it("versi teks meringkas judul, heading, tabel, form, dan tombol", () => {
    const outline = htmlOutline(html);
    assert.equal(outline.title, "Catatan · Uji");
    const text = outline.lines.join("\n");
    assert.match(text, /- h1 "Catatan"/);
    assert.match(text, /- table 2 rows \[Judul \| Dibuat\]/);
    assert.match(text, /- form \(method=post action="\/notes"\)/);
    assert.match(text, /- input \(type=text name="title" placeholder="Judul" required\)/);
    assert.match(text, /- button "Simpan"/);
    assert.match(text, /- alert "Tersimpan & aman"/);
    assert.doesNotMatch(text, /rahasia/);
    assert.doesNotMatch(outline.text, /abaikan/);
  });

  it("snapshot browser dirapikan dan dibatasi", () => {
    const snap = normalizeSnapshot({
      url: "http://localhost:3000/notes",
      title: "Catatan",
      status: 200,
      route: "src/app/routes/notes/index.ts",
      viewport: { w: 1280, h: 720 },
      elements: [...Array(400)].map((_, i) => ({ tag: "LI", text: `baris ${i}`, x: 1.4, y: i * 20, w: 100, h: 20, evil: "x" })),
      text: "a".repeat(10_000),
      errors: [{ kind: "console", message: "TypeError: x is undefined" }],
      failed: [{ method: "get", url: "/api/notes", status: 500 }],
    })!;
    assert.equal(snap.elements.length, 250);
    assert.equal(snap.truncated, true);
    assert.equal(snap.text.length, 4000);
    assert.deepEqual(snap.elements[0], { tag: "li", text: "baris 0", x: 1, y: 0, w: 100, h: 20 });
    const text = formatSnapshot(snap);
    assert.match(text, /Route file: src\/app\/routes\/notes\/index\.ts/);
    assert.match(text, /Console errors \(1\):\n- \[console\] TypeError: x is undefined/);
    assert.match(text, /- GET \/api\/notes -> 500/);
    assert.equal(normalizeSnapshot("bukan objek"), undefined);
  });

  it("pemeriksaan expect: teks, selector, dan error", () => {
    const snapshot = normalizeSnapshot({ url: "/", title: "T", viewport: {}, elements: [{ tag: "button", text: "Ekspor", x: 0, y: 0, w: 1, h: 1 }], text: "", errors: [{ kind: "error", message: "boom" }], failed: [], matches: { table: 0 } })!;
    const check = checkExpect({ text: ["ekspor"], selector: ["table"], noConsoleErrors: true }, { snapshot });
    assert.equal(check.ok, false);
    assert.deepEqual(check.lines.map((l) => l.split(" ")[0]), ["PASS", "FAIL", "FAIL"]);
  });

  it("hanya halaman lokal", () => {
    assert.deepEqual(resolveViewTarget("/notes?q=1", "http://localhost:3000"), { path: "/notes?q=1", url: "http://localhost:3000/notes?q=1" });
    assert.equal(resolveViewTarget("http://127.0.0.1:4000/x", "http://localhost:3000").path, "/x");
    assert.throws(() => resolveViewTarget("https://example.com/", "http://localhost:3000"), /local app/);
    assert.throws(() => resolveViewTarget("notes", "http://localhost:3000"), /start with/);
  });

  it("tanpa browser: versi teks dari server, termasuk redirect ke login", async () => {
    const server = http.createServer((req, res) => {
      if (req.url === "/admin") {
        res.writeHead(302, { Location: "/login" });
        return res.end();
      }
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const page = await viewPage({ path: "/notes", expect: { text: ["Simpan"], noConsoleErrors: true } }, undefined, { fallbackBase: base });
      assert.equal(page.mode, "text");
      // Halaman uji tidak memakai kit UI dan punya <style>: ada temuan tampilan, pemeriksaan expect tetap lulus.
      assert.equal(page.ok, false);
      assert.match(page.text, /PASS text "Simpan"/);
      assert.match(page.text, /- \[kit\] The page does not use the UI kit/);
      assert.match(page.text, /No browser tab/);
      assert.match(page.text, /- table 2 rows/);
      const admin = await viewPage({ path: "/admin" }, undefined, { fallbackBase: base });
      assert.match(admin.text, /HTTP 302/);
      assert.match(admin.text, /Redirects to: \/login \(the page needs a logged-in user/);
      // Lewat tool AI: memakai alamat dari viewer, bukan PORT.
      const tool = agentTools.find((t) => t.spec.name === "view_page")!;
      const viewer = { appUrl: () => base, browser: async () => undefined, waitForApp: async () => {} };
      const out = await tool.run({ path: "/notes", expect: { selector: ["table"] } }, { root: os.tmpdir(), viewer } as never);
      assert.match(out, /SKIP selector "table"/);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });
});

describe("devtools: kanal halaman untuk view_page", () => {
  let root: string;
  let dt: Devtools;
  let base: string;

  before(async () => {
    setLocale("en");
    root = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-view-"));
    fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "uji", scripts: {} }));
    const config = resolveAiConfig({ mode: "ask", providers: [] });
    dt = await startDevtools({ root, loadConfig: async () => config });
    base = `http://127.0.0.1:${dt.port}`;
  });
  after(async () => {
    setLocale("id");
    await dt.close();
    fs.rmSync(root, { recursive: true, force: true });
  });

  const auth = () => ({ "X-Zusantara-Token": dt.token, "Content-Type": "application/json" });

  it("env server aplikasi memuat ZUSANTARA_DEV", () => {
    assert.equal(dt.env.ZUSANTARA_DEV, "1");
  });

  it("tanpa tab terbuka: undefined (lalu versi teks)", async () => {
    assert.equal(await dt.viewer.browser("/x", {}), undefined);
  });

  it("belum ada server aplikasi yang melapor: tidak menunggu", async () => {
    const start = Date.now();
    await dt.viewer.waitForApp(Date.now(), { timeoutMs: 5000 });
    assert.ok(Date.now() - start < 1000);
  });

  it("kanal halaman butuh token", async () => {
    assert.equal((await fetch(`${base}/page-channel`)).status, 401);
  });

  it("server aplikasi melaporkan alamatnya; hanya localhost", async () => {
    await fetch(`${base}/app`, { method: "POST", headers: auth(), body: JSON.stringify({ url: "http://evil.example" }) });
    assert.equal(dt.viewer.appUrl(), undefined);
    await fetch(`${base}/app`, { method: "POST", headers: auth(), body: JSON.stringify({ url: "http://localhost:3000" }) });
    assert.equal(dt.viewer.appUrl(), "http://localhost:3000");
  });

  it("menunggu server aplikasi dimulai ulang setelah file berubah", async () => {
    const changedAt = Date.now();
    let waited = false;
    const waiting = dt.viewer.waitForApp(changedAt, { timeoutMs: 5000 }).then(() => (waited = true));
    await new Promise((r) => setTimeout(r, 50));
    assert.equal(waited, false, "masih menunggu server lama");
    await fetch(`${base}/app`, { method: "POST", headers: auth(), body: JSON.stringify({ url: "http://localhost:3000" }) });
    await waiting;
    assert.equal(waited, true);
    // Server sudah mulai setelah perubahan: tidak menunggu.
    const start = Date.now();
    await dt.viewer.waitForApp(changedAt, { timeoutMs: 5000 });
    assert.ok(Date.now() - start < 1000);
  });

  it("tab menerima permintaan lihat halaman dan mengirim snapshot", async () => {
    const controller = new AbortController();
    const res = await fetch(`${base}/page-channel?url=${encodeURIComponent("http://localhost:3000/")}`, { headers: auth(), signal: controller.signal });
    assert.equal(res.status, 200);
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const next = async (): Promise<Record<string, any>> => {
      for (;;) {
        const nl = buffer.indexOf("\n");
        if (nl >= 0) {
          const line = buffer.slice(0, nl);
          buffer = buffer.slice(nl + 1);
          if (line.trim()) return JSON.parse(line) as Record<string, any>;
          continue;
        }
        const { value, done } = await reader.read();
        if (done) throw new Error("kanal tertutup");
        buffer += decoder.decode(value, { stream: true });
      }
    };
    try {
      assert.equal((await next()).type, "hello");
      const pending = dt.viewer.browser("/notes", { selectors: ["table"] });
      const request = await next();
      assert.deepEqual({ type: request.type, path: request.path, selectors: request.selectors }, { type: "view", path: "/notes", selectors: ["table"] });
      const snapshot = { url: "http://localhost:3000/notes", title: "Catatan", viewport: { w: 800, h: 600 }, elements: [{ tag: "table", rows: 3, x: 0, y: 0, w: 10, h: 10 }], text: "Catatan", errors: [], failed: [], matches: { table: 1 } };
      const posted = await fetch(`${base}/view-result`, { method: "POST", headers: auth(), body: JSON.stringify({ id: request.id, snapshot }) });
      assert.equal(posted.status, 200);
      const view = await pending;
      assert.ok(view && "snapshot" in view);
      assert.equal(view.snapshot.elements[0]!.rows, 3);

      // Tool view_page memakai tab ini.
      const tool = agentTools.find((t) => t.spec.name === "view_page")!;
      const running = tool.run({ path: "/notes", expect: { selector: ["table"], noErrors: true } }, { root, viewer: dt.viewer } as never);
      const again = await next();
      await fetch(`${base}/view-result`, { method: "POST", headers: auth(), body: JSON.stringify({ id: again.id, snapshot }) });
      const out = await running;
      assert.match(out, /seen in the developer's browser/);
      assert.match(out, /PASS selector "table" matches 1/);
      assert.match(out, /PASS no console errors/);

      // Iframe gagal (mis. X-Frame-Options): kembali ke versi teks.
      const failing = dt.viewer.browser("/x", {});
      const third = await next();
      await fetch(`${base}/view-result`, { method: "POST", headers: auth(), body: JSON.stringify({ id: third.id, error: "blocked" }) });
      assert.deepEqual(await failing, { error: "blocked" });
    } finally {
      controller.abort();
    }
  });
});

describe("skrip proyek untuk verifikasi AI", () => {
  it("tidak mewarisi PORT server dev (test tidak bentrok dengan server yang berjalan)", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-script-"));
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "uji", scripts: { test: 'node -e "process.stdout.write(String(process.env.PORT) + String(process.env.ZUSANTARA_DEV))"' } }));
    const restore = setEnv({ PORT: "4499", ZUSANTARA_DEV: "1" });
    try {
      const result = await createScriptRunner(dir)("test");
      assert.equal(result.ok, true);
      assert.match(result.output, /undefinedundefined/);
    } finally {
      restore();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
