import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { pathToFileURL } from "node:url";
import { resolveAiConfig } from "../src/ai/config.js";
import { AnthropicProvider } from "../src/ai/providers/anthropic.js";
import { OpenAICompatibleProvider } from "../src/ai/providers/openai-compatible.js";
import { estimateTokens } from "../src/ai/sessions.js";
import { agentTools, type ToolContext } from "../src/ai/tools.js";
import type { ChatMessage, ToolImage } from "../src/ai/types.js";
import { run } from "../src/cli.js";
import { ZenRuntime } from "../src/core/index.js";
import { setAppInfo } from "../src/core/devpage/info.js";
import { clearTraces, finishTrace, recordLog, recordQuery, repeatedQueries, runWithTrace, sessionPreview, setTracing, type RequestTrace } from "../src/core/devtrace.js";
import { h, renderToString, setSourceTracking } from "../src/core/view.js";
import { Card } from "../src/ui/index.js";
import { startDevtools } from "../src/dev/devtools.js";
import { formatTrace, formatTraceList } from "../src/dev/requests.js";
import { findChrome } from "../src/dev/screenshot.js";
import { formatSnapshot, normalizeSnapshot, pageScore, parseVariant, parseViewport, withVariant, type PageAudit, type PageViewer } from "../src/dev/view.js";
import { setLocale } from "../src/i18n/index.js";

const DEV_ENV = { ZENTARA_DEV: "1", ZENTARA_DEVTOOLS_PORT: "4567", ZENTARA_DEVTOOLS_TOKEN: "tok" };
const SRC = path.resolve("src");

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

describe("jejak request (devtrace)", () => {
  before(() => setTracing(true));
  after(() => {
    setTracing(false);
    clearTraces();
  });

  it("mencatat query, log, dan query berulang (N+1) per request", async () => {
    let trace: RequestTrace | undefined;
    await runWithTrace({ method: "GET", path: "/produk" }, async (tr) => {
      trace = tr;
      for (let i = 0; i < 3; i++) {
        await Promise.resolve();
        recordQuery("select * from  items where id = ?", 0.123);
      }
      recordQuery("insert into log values (?)");
      recordLog("warn", ["stok %s", "habis"]);
    });
    // Di luar request tidak ada yang dicatat.
    recordQuery("select 1");
    assert.ok(trace);
    finishTrace(trace, { status: 200, route: "src/app/routes/produk.ts", session: { userId: 7, csrfToken: "rahasia" } });
    assert.equal(trace.queries.length, 4);
    assert.deepEqual(trace.queries[0], { sql: "select * from items where id = ?", ms: 0.12 });
    assert.deepEqual(trace.repeated, [{ sql: "select * from items where id = ?", count: 3 }]);
    assert.deepEqual(trace.logs, [{ level: "warn", message: "stok habis" }]);
    assert.deepEqual(trace.session, { userId: "7", csrfToken: "•••" });
    assert.equal(trace.status, 200);
  });

  it("insert berulang bukan N+1; aset /_zentara/ tidak disimpan", () => {
    assert.deepEqual(repeatedQueries([1, 2, 3].map(() => ({ sql: "insert into a values (?)" }))), []);
    const before = runWithTrace({ method: "GET", path: "/_zentara/ui.css" }, (tr) => tr)!;
    finishTrace(before, { status: 200 });
    assert.deepEqual(sessionPreview({ password: "x", nama: "Ani", data: { a: 1 } }), { password: "•••", nama: "Ani", data: '{"a":1}' });
  });
});

describe("runtime saat zentara dev: jejak, varian, sumber elemen", () => {
  let dir: string;
  let restore: () => void = () => {};
  const devtrace = pathToFileURL(path.join(SRC, "core", "devtrace.ts")).href;
  const ui = pathToFileURL(path.join(SRC, "ui", "index.ts")).href;
  const core = pathToFileURL(path.join(SRC, "core", "index.ts")).href;

  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-devtrace-"));
    fs.mkdirSync(path.join(dir, "routes"));
    // Seperti proyek Zentara: ESM, supaya route memakai modul framework yang sama dengan runtime.
    fs.writeFileSync(path.join(dir, "package.json"), '{ "type": "module" }\n');
    fs.writeFileSync(
      path.join(dir, "routes", "index.ts"),
      `import { recordQuery } from ${JSON.stringify(devtrace)};
import { page } from ${JSON.stringify(ui)};
import { h } from ${JSON.stringify(core)};
export function GET(ctx) {
  for (let i = 0; i < 3; i++) recordQuery("select * from notes where id = ?", 1);
  if (ctx.url.searchParams.has("log")) console.log("halo dari route");
  return page({ title: "Uji" }, h("h1", null, "Judul"), h("p", null, ctx.url.search || "tanpa query"));
}
`,
    );
    fs.writeFileSync(path.join(dir, "routes", "data.ts"), `export const GET = (ctx) => ({ search: ctx.url.search });\n`);
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));
  afterEach(() => {
    restore();
    setAppInfo({ appName: "Uji", env: "production", debug: false, root: process.cwd(), routes: [] });
    setTracing(false);
    setSourceTracking(undefined);
    clearTraces();
  });

  async function start(debug: boolean, cwd = dir) {
    const previous = process.cwd();
    process.chdir(cwd);
    try {
      const runtime = new ZenRuntime({ port: 0, host: "127.0.0.1", logLevel: "silent", routesDir: path.join(dir, "routes"), publicDir: false, debug });
      const { port } = await runtime.start();
      return { runtime, base: `http://127.0.0.1:${port}` };
    } finally {
      process.chdir(previous);
    }
  }

  it("header id request, probe data-request, endpoint jejak dengan token, N+1 dan log", async () => {
    restore = setEnv({ ...DEV_ENV, NODE_ENV: undefined });
    const { runtime, base } = await start(true);
    try {
      const res = await fetch(`${base}/?log`);
      const html = await res.text();
      const id = res.headers.get("x-zentara-request");
      assert.ok(id);
      assert.match(html, new RegExp(`data-request="${id}"`));
      assert.equal((await fetch(`${base}/_zentara/dev/requests`)).status, 401);
      assert.equal((await fetch(`${base}/_zentara/dev/requests`, { headers: { "X-Zentara-Token": "salah" } })).status, 401);
      const trace = (await (await fetch(`${base}/_zentara/dev/requests/${id}`, { headers: { "X-Zentara-Token": "tok" } })).json()) as RequestTrace;
      assert.equal(trace.status, 200);
      assert.match(trace.route ?? "", /routes\/index\.ts$/);
      assert.equal(trace.queries.length, 3);
      assert.deepEqual(trace.repeated, [{ sql: "select * from notes where id = ?", count: 3 }]);
      assert.deepEqual(trace.logs, [{ level: "log", message: "halo dari route" }]);
      const list = (await (await fetch(`${base}/_zentara/dev/requests`, { headers: { "X-Zentara-Token": "tok" } })).json()) as { requests: RequestTrace[] };
      assert.equal(list.requests[0]!.id, id);
      assert.equal((await fetch(`${base}/_zentara/dev/requests/tidak-ada`, { headers: { "X-Zentara-Token": "tok" } })).status, 404);
    } finally {
      await runtime.stop();
    }
  });

  it("varian bahasa dan mode per request, parameter dibuang sebelum routing; tangkapan layar tanpa widget", async () => {
    restore = setEnv({ ...DEV_ENV, NODE_ENV: undefined });
    const { runtime, base } = await start(true);
    try {
      const html = await (await fetch(`${base}/?a=1&__zentara_lang=en&__zentara_mode=dark`)).text();
      assert.match(html, /<html lang="en" data-zu-mode="dark"/);
      assert.match(html, /\?a=1</);
      assert.doesNotMatch(html, /__zentara_/);
      // Request berikutnya kembali ke bahasa dan mode proses.
      assert.match(await (await fetch(`${base}/`)).text(), /<html lang="id">/);
      assert.deepEqual(await (await fetch(`${base}/data?__zentara_mode=dark`)).json(), { search: "" });
      const shot = await (await fetch(`${base}/?__zentara_shot=1`)).text();
      assert.doesNotMatch(shot, /_zentara\/dev\//);
    } finally {
      await runtime.stop();
    }
  });

  it("produksi: tanpa jejak, tanpa varian, tanpa data-zsrc", async () => {
    restore = setEnv({ ...DEV_ENV, NODE_ENV: "production" });
    const { runtime, base } = await start(false);
    try {
      const res = await fetch(`${base}/?__zentara_lang=en`);
      const html = await res.text();
      assert.equal(res.headers.get("x-zentara-request"), null);
      assert.doesNotMatch(html, /data-zsrc|lang="en"/);
      assert.equal((await fetch(`${base}/_zentara/dev/requests`, { headers: { "X-Zentara-Token": "tok" } })).status, 404);
    } finally {
      await runtime.stop();
    }
  });

  it("sumber elemen: file:baris pemanggil h(), dan akar keluaran komponen", () => {
    setSourceTracking(path.resolve("."));
    const Box = ({ children }: { children?: unknown }) => h("section", { class: "c" }, h("div", null, children as never));
    const line = Number(new Error().stack!.split("\n")[1]!.match(/:(\d+):\d+\)?$/)![1]) + 1;
    const html = renderToString(h("main", null, h(Card, { title: "T" }, "isi"), h(Box, null, "x"), h("script", null, "")));
    const at = `data-zsrc="test/devtools-extra.test.ts:${line}"`;
    // Elemen HTML dari kode aplikasi dan akar keluaran komponen kit UI mendapat baris pemanggilnya;
    // isi komponen kit UI tidak; komponen milik aplikasi memakai baris di dalam komponen itu.
    assert.match(html, new RegExp(`^<main ${at}><section class="zu-card" ${at}><div class="zu-card-head"><h2>T</h2></div>isi</section>`));
    assert.match(html, /<section class="c" data-zsrc="test\/devtools-extra\.test\.ts:\d+"><div data-zsrc=/);
    assert.match(html, /<script><\/script><\/main>$/);
    setSourceTracking(undefined);
    assert.equal(renderToString(h("p", null, "x")), "<p>x</p>");
  });
});

describe("view_page: skor, varian, rekaman langkah, jejak", () => {
  before(() => setLocale("en"));
  after(() => setLocale("id"));

  const good: PageAudit = { load: 400, bytes: 120_000, requests: 8, title: true, description: true, lang: true, h1: 1, imgNoAlt: [], unlabeled: [], unnamed: [] };

  it("skor halaman 0-100 dari kecepatan, ukuran, SEO, dan aksesibilitas", () => {
    assert.deepEqual(pageScore(good), { value: 100, findings: [] });
    const bad = pageScore({
      ...good,
      load: 3500,
      bytes: 2_500_000,
      requests: 70,
      title: false,
      description: false,
      h1: 0,
      lang: false,
      imgNoAlt: ["/a.png"],
      unlabeled: ["input[name=q]"],
      unnamed: ["button"],
    });
    assert.equal(bad.value, 100 - 15 - 15 - 10 - 10 - 5 - 5 - 5 - 5 - 5 - 5);
    assert.deepEqual(
      bad.findings.map((f) => f.kind),
      ["speed", "size", "requests", "seo", "seo", "seo", "seo", "a11y", "a11y", "a11y"],
    );
    assert.equal(
      pageScore({
        ...good,
        imgNoAlt: Array(20).fill("x"),
        unlabeled: Array(20).fill("y"),
        unnamed: Array(20).fill("z"),
        title: false,
        description: false,
        lang: false,
        h1: 3,
        load: 9000,
        bytes: 9e6,
        requests: 99,
      }).value,
      0,
    );
  });

  it("varian, ukuran tablet, dan parameter URL", () => {
    assert.equal(parseViewport("tablet"), "tablet");
    assert.equal(parseViewport("tv"), "desktop");
    assert.deepEqual(parseVariant({ theme: "dark", lang: "en" }), { theme: "dark", lang: "en" });
    assert.deepEqual(parseVariant({ theme: "ungu", lang: "fr" }), {});
    assert.equal(withVariant("/produk", {}), "/produk");
    assert.equal(withVariant("/produk?x=1#a", { theme: "dark", lang: "en" }), "/produk?x=1&__zentara_mode=dark&__zentara_lang=en#a");
    assert.equal(withVariant("/", { shot: true }), "/?__zentara_shot=1");
  });

  it("snapshot: sumber elemen, skor, langkah pengguna, dan id request", () => {
    const snap = normalizeSnapshot({
      url: "http://localhost:3000/produk",
      title: "Produk",
      viewport: { w: 768, h: 1024 },
      device: "tablet",
      elements: [
        { tag: "button", text: "Simpan", x: 1, y: 2, w: 3, h: 4, at: "src/app/routes/produk.ts:12" },
        { tag: "p", text: "x", x: 0, y: 0, w: 1, h: 1, at: "<script>" },
      ],
      text: "",
      errors: [],
      failed: [],
      request: "abc_1",
      audit: { ...good, load: "400", title: true, evil: 1 },
      steps: [
        { kind: "load", url: "/produk", request: "abc_0" },
        { kind: "input", target: "input[name=q] @src/app/routes/produk.ts:9", value: "kue" },
        { kind: "click", target: 'button "Simpan"' },
        { kind: "hack", target: "x" },
      ],
    })!;
    assert.equal(snap.device, "tablet");
    assert.equal(snap.elements[0]!.at, "src/app/routes/produk.ts:12");
    assert.equal(snap.elements[1]!.at, undefined);
    assert.equal(snap.request, "abc_1");
    assert.equal(snap.audit?.load, 400);
    assert.equal(snap.steps?.length, 3);
    const text = formatSnapshot(snap);
    assert.match(text, /Screen: tablet 768x1024/);
    assert.match(text, /- button "Simpan" @1,2 3x4 ← src\/app\/routes\/produk\.ts:12/);
    assert.match(text, /Server request: abc_1/);
    assert.match(text, /Page score: 100\/100 \(load 400 ms, 120 KB, 8 requests\)/);
    assert.match(
      text,
      /The user's last steps in this tab \(3, oldest first\):\n- open \/produk \(request abc_0\)\n- fill input\[name=q\] @src\/app\/routes\/produk\.ts:9 = "kue"\n- click button "Simpan"/,
    );
  });

  it("jejak request dalam teks: daftar dan rincian", () => {
    const tr: RequestTrace = {
      id: "r1",
      method: "GET",
      path: "/produk",
      at: 0,
      status: 200,
      ms: 12.5,
      route: "src/app/routes/produk.ts",
      queries: [
        { sql: "select 1", ms: 1.5 },
        { sql: "select 1", ms: 2 },
        { sql: "select 1", ms: 1 },
      ],
      repeated: [{ sql: "select 1", count: 3 }],
      logs: [{ level: "error", message: "gagal" }],
      session: { userId: "7" },
    };
    const list = formatTraceList([tr]);
    assert.match(list, /- r1 {2}GET \/produk -> 200 · 12.5 ms · 3 queries · N\+1 · has errors/);
    const detail = formatTrace(tr);
    assert.match(detail, /3 queries · 4.5 ms total in the database/);
    assert.match(detail, /- 3x select 1/);
    assert.match(detail, /Session:\n- userId: 7/);
    assert.match(detail, /- \[error\] gagal/);
    assert.match(formatTraceList([]), /No requests recorded yet/);
  });

  it("view_page meneruskan varian ke tab, menampilkan jejak request; request_log", async () => {
    const trace: RequestTrace = { id: "q9", method: "GET", path: "/produk", at: 0, status: 200, ms: 3, queries: [], repeated: [], logs: [] };
    const seen: string[] = [];
    const viewer: PageViewer = {
      appUrl: () => "http://localhost:3000",
      waitForApp: async () => {},
      browser: async (p) => {
        seen.push(p);
        return { snapshot: { url: `http://localhost:3000${p}`, title: "Produk", viewport: { w: 1280, h: 800 }, elements: [], text: "", errors: [], failed: [], request: "q9", audit: good } };
      },
      trace: async (id) => (id === "q9" ? trace : undefined),
      traces: async (id) => (id ? (id === "q9" ? [trace] : []) : [trace]),
    };
    const ctx = { root: process.cwd(), viewer, views: [], images: [] as ToolImage[] } as unknown as ToolContext;
    const tool = (name: string) => agentTools.find((t) => t.spec.name === name)!;
    const out = await tool("view_page").run({ url: "/produk", viewport: "tablet", theme: "dark", lang: "en", expect: { minScore: 90 } }, ctx);
    assert.deepEqual(seen, ["/produk?__zentara_mode=dark&__zentara_lang=en"]);
    assert.match(out, /^RESULT ok · browser · tablet · dark · en · 0 findings · score 100/);
    assert.match(out, /Request q9: GET \/produk -> 200 · 3 ms/);
    assert.match(out, /PASS page score at least 90 \(score 100\)/);
    assert.equal(ctx.views![0]!.viewport, "tablet");
    assert.match(await tool("request_log").run({}, ctx), /- q9 {2}GET \/produk/);
    assert.match(await tool("request_log").run({ id: "q9" }, ctx), /^Request q9/);
    await assert.rejects(tool("request_log").run({ id: "nope" }, ctx), /not found/);
    await assert.rejects(tool("request_log").run({}, { ...ctx, viewer: undefined }), /only available while the app runs under `zentara dev`/);
  });

  it("tangkapan layar: CHROME_PATH yang tidak ada tidak dipakai", () => {
    assert.equal(findChrome({ CHROME_PATH: path.join(os.tmpdir(), "tidak-ada-chrome") }), undefined);
  });
});

describe("gambar di hasil tool", () => {
  const img: ToolImage = { mediaType: "image/png", data: "iVBORw0KGgo=" };
  const history: ChatMessage[] = [
    { role: "user", text: "lihat halaman" },
    { role: "assistant", text: "", toolCalls: [{ id: "c1", name: "view_page", input: { url: "/" } }] },
    { role: "tool_results", results: [{ id: "c1", content: "RESULT ok", images: [img] }] },
  ];

  async function capture(reply: unknown) {
    const bodies: any[] = [];
    const server = http.createServer((req, res) => {
      let raw = "";
      req.on("data", (c) => (raw += c));
      req.on("end", () => {
        bodies.push(JSON.parse(raw));
        res.writeHead(200, { "Content-Type": "application/json" }).end(JSON.stringify(reply));
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    return { base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, bodies, close: () => new Promise<void>((r) => server.close(() => r())) };
  }

  it("Claude menerima blok gambar; provider format OpenAI mendapat catatan teks", async () => {
    const claude = await capture({
      id: "m",
      type: "message",
      role: "assistant",
      model: "x",
      stop_reason: "end_turn",
      stop_sequence: null,
      content: [{ type: "text", text: "ok" }],
      usage: { input_tokens: 1, output_tokens: 1 },
    });
    try {
      await new AnthropicProvider({ apiKey: "k", baseURL: claude.base, maxRetries: 0 }).complete({ system: "s", messages: history, tools: [] });
      const block = claude.bodies[0].messages[2].content[0];
      assert.equal(block.type, "tool_result");
      assert.deepEqual(block.content, [
        { type: "text", text: "RESULT ok" },
        { type: "image", source: { type: "base64", media_type: "image/png", data: "iVBORw0KGgo=" } },
      ]);
    } finally {
      await claude.close();
    }
    const openai = await capture({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] });
    try {
      await new OpenAICompatibleProvider({ name: "openai", baseUrl: `${openai.base}/v1`, apiKey: "k", model: "m" }).complete({ system: "s", messages: history, tools: [] });
      const tool = openai.bodies[0].messages.find((m: { role: string }) => m.role === "tool");
      assert.match(tool.content, /^RESULT ok\n.+(image|gambar)/i);
    } finally {
      await openai.close();
    }
  });

  it("perkiraan token menghitung gambar sebagai ±1600 token, bukan panjang base64", () => {
    const big: ChatMessage[] = [{ role: "tool_results", results: [{ id: "a", content: "x", images: [{ mediaType: "image/png", data: "A".repeat(400_000) }] }] }];
    const tokens = estimateTokens(big);
    assert.ok(tokens > 1600 && tokens < 2000, String(tokens));
  });
});

describe("muat ulang otomatis dan zentara requests", () => {
  let root: string;
  before(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-reload-"));
  });
  after(() => fs.rmSync(root, { recursive: true, force: true }));

  it("server aplikasi mulai ulang -> tab yang terhubung menerima perintah reload", async () => {
    const dt = await startDevtools({ root, loadConfig: async () => resolveAiConfig({}) });
    const base = `http://127.0.0.1:${dt.port}`;
    const headers = { "X-Zentara-Token": dt.token, "Content-Type": "application/json" };
    try {
      const channel = await fetch(`${base}/page-channel?url=x`, { headers });
      const reader = channel.body!.getReader();
      let text = "";
      const read = async (want: string) => {
        const deadline = Date.now() + 3000;
        while (!text.includes(want) && Date.now() < deadline) {
          const { value, done } = await reader.read();
          if (done) break;
          text += new TextDecoder().decode(value);
        }
        return text.includes(want);
      };
      assert.ok(await read('"hello"'));
      // Laporan pertama (server baru mulai) tidak memuat ulang; laporan berikutnya (mulai ulang) memuat ulang.
      await fetch(`${base}/app`, { method: "POST", headers, body: JSON.stringify({ url: "http://localhost:3999" }) });
      await fetch(`${base}/app`, { method: "POST", headers, body: JSON.stringify({ url: "http://localhost:3999" }) });
      assert.ok(await read('"reload"'));
      assert.equal(text.match(/"reload"/g)!.length, 1);
      await reader.cancel();
      // Aplikasi tidak menjawab: daftar request gagal dengan pesan jelas.
      const res = await fetch(`${base}/requests`, { headers });
      assert.equal(res.status, 400);
    } finally {
      await dt.close();
    }
  });

  it("zentara requests tanpa server dev: pesan jelas, kode keluar 1", async () => {
    const out: string[] = [];
    const err: string[] = [];
    const code = await run(["requests"], { cwd: root, out: (l) => out.push(l), err: (l) => err.push(l) });
    assert.equal(code, 1);
    assert.match(err.join("\n"), /zentara dev/);
  });
});
