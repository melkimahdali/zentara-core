import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { isPageFile, pendingViews, type AgentResult } from "../src/ai/agent.js";
import { resolveAiConfig } from "../src/ai/config.js";
import { readTaskLog, appendTaskLog, taskLogEntry, taskLogPath } from "../src/ai/task-log.js";
import { agentTools, type ToolContext, type ViewRecord } from "../src/ai/tools.js";
import { run } from "../src/cli.js";
import { devtoolsInfoPath, readDevtoolsInfo, startDevtools } from "../src/dev/devtools.js";
import {
  checkExpect,
  contrastRatio,
  htmlFacts,
  issueTotal,
  layoutIssues,
  normalizeSnapshot,
  staticIssues,
  viewPage,
  type LayoutBox,
  type PageSnapshot,
  type PageViewer,
} from "../src/dev/view.js";
import { setLocale } from "../src/i18n/index.js";

const WHITE = [255, 255, 255, 1];
const DARK = [20, 20, 20, 1];

/** Snapshot browser dengan data tampilan buatan (seperti yang diukur probe). */
function snap(boxes: Partial<LayoutBox>[], layout: Partial<NonNullable<PageSnapshot["layout"]>> = {}): PageSnapshot {
  return normalizeSnapshot({
    url: "http://localhost:3000/x",
    title: "X",
    route: "src/app/routes/x.ts",
    viewport: { w: 390, h: 844 },
    elements: [],
    text: "",
    errors: [],
    failed: [],
    layout: {
      docWidth: 390,
      width: 390,
      kit: true,
      viewportMeta: true,
      styled: [],
      styleTags: 0,
      sheets: [],
      ...layout,
      boxes: boxes.map((b) => ({ p: -1, tag: "div", d: "div", x: 0, y: 0, w: 10, h: 10, ...b })),
    },
  })!;
}

const kinds = (s: PageSnapshot) => layoutIssues(s).map((i) => i.kind);

describe("pemeriksaan tampilan (layoutIssues)", () => {
  before(() => setLocale("en"));
  after(() => setLocale("id"));

  it("halaman rapi tidak punya temuan", () => {
    const page = snap([
      { tag: "main", d: "main", w: 390, h: 800 },
      { p: 0, tag: "h1", d: 'h1 "Catatan"', x: 16, y: 16, w: 200, h: 30, txt: true, fg: DARK, bg: WHITE, fs: 28, fw: 650 },
      { p: 0, tag: "button", d: 'button "Simpan"', x: 16, y: 60, w: 100, h: 40, txt: true, fg: WHITE, bg: [0, 110, 100, 1] },
    ]);
    assert.deepEqual(layoutIssues(page), []);
  });

  it("keluar layar: hanya elemen terluar yang dilaporkan, area gulir dan fixed dilewati", () => {
    const page = snap(
      [
        { tag: "div", d: "div.lebar", x: 0, w: 600, h: 20 },
        { p: 0, tag: "p", d: 'p "anak"', x: 0, w: 600, h: 20, txt: true },
        { tag: "table", d: "table", x: 0, w: 900, h: 100, sc: true },
        { tag: "div", d: "div.laci", x: 300, w: 300, h: 100, fx: true },
        { tag: "div", d: "div.tersembunyi", x: -500, w: 200, h: 20 },
        { tag: "div", d: "div.kiri", x: -40, w: 200, h: 20 },
      ],
      { docWidth: 600 },
    );
    const messages = layoutIssues(page).filter((i) => i.kind === "overflow").map((i) => i.message);
    assert.deepEqual(messages, ["div.lebar sticks out 210px past the right edge of the screen", "div.kiri sticks out 40px past the left edge of the screen"]);
  });

  it("scroll mendatar tanpa elemen penyebab yang terukur tetap dilaporkan", () => {
    const messages = layoutIssues(snap([], { docWidth: 450 })).map((i) => i.message);
    assert.deepEqual(messages, ["The page is wider than the screen (450px on a 390px screen), so it scrolls sideways"]);
  });

  it("saling menimpa: bukan leluhur, bukan inline beberapa baris, bukan fixed", () => {
    const page = snap([
      { tag: "button", d: 'button "Satu"', x: 0, y: 0, w: 120, h: 40, txt: true },
      { tag: "button", d: 'button "Dua"', x: 10, y: 5, w: 120, h: 40, txt: true },
      // Anak di dalam tombol: menimpa induknya itu wajar.
      { tag: "button", d: 'button "Tiga"', x: 0, y: 200, w: 120, h: 40 },
      { p: 2, tag: "span", d: "span", x: 4, y: 204, w: 20, h: 20, txt: true },
      { tag: "a", d: "a.baris", x: 0, y: 100, w: 300, h: 40, ml: true },
      { tag: "a", d: "a.lain", x: 0, y: 100, w: 300, h: 40 },
      { tag: "header", d: "header", x: 0, y: 0, w: 390, h: 60, fx: true, txt: true },
    ]);
    const overlap = layoutIssues(page).filter((i) => i.kind === "overlap");
    assert.deepEqual(overlap.map((i) => i.message), ['button "Dua" overlaps button "Satu"']);
  });

  it("teks terpotong dan gambar rusak", () => {
    const page = snap([
      { tag: "td", d: 'td "alamat panjang"', clip: "x", txt: true },
      { tag: "img", d: 'img "logo"', y: 50, br: true },
    ]);
    assert.deepEqual(kinds(page), ["truncated", "image"]);
  });

  it("kontras: rasio WCAG, teks besar 3:1, disabled dilewati, warna sama dikelompokkan", () => {
    assert.equal(contrastRatio([0, 0, 0, 1], [255, 255, 255, 1]).toFixed(1), "21.0");
    assert.equal(contrastRatio([119, 119, 119, 1], [255, 255, 255, 1]).toFixed(2), "4.48");
    // Teks setengah transparan dicampur dengan latarnya.
    assert.ok(contrastRatio([0, 0, 0, 0.3], [255, 255, 255, 1]) < 3);
    const grey = [130, 130, 130, 1];
    const page = snap([
      { tag: "td", d: 'td "a"', y: 0, txt: true, fg: grey, bg: WHITE, fs: 14 },
      { tag: "td", d: 'td "b"', y: 20, txt: true, fg: grey, bg: WHITE, fs: 14 },
      { tag: "h1", d: 'h1 "Judul"', y: 40, txt: true, fg: grey, bg: WHITE, fs: 32 },
      { tag: "b", d: 'b "tebal"', y: 60, txt: true, fg: grey, bg: WHITE, fs: 19, fw: 700 },
      { tag: "button", d: 'button "x"', y: 80, txt: true, fg: grey, bg: WHITE, dis: true },
      { tag: "p", d: 'p "gambar"', y: 100, txt: true, fg: grey },
    ]);
    const contrast = layoutIssues(page).filter((i) => i.kind === "contrast").map((i) => i.message);
    assert.deepEqual(contrast, ['Text contrast too low in td "a": 3.84:1 (minimum 4.5:1) (+1 more)']);
  });

  it("CSS sendiri, tanpa kit UI, dan tanpa meta viewport; halaman bawaan dilewati", () => {
    const page = snap([], { kit: false, viewportMeta: false, styled: ["div.a", "p"], styleTags: 1, sheets: ["/css/app.css"] });
    assert.deepEqual(kinds(page), ["kit", "meta", "style", "style", "style", "style"]);
    assert.deepEqual(layoutIssues(snap([], { kit: false, viewportMeta: false, styleTags: 2, framework: true })), []);
  });

  it("temuan sejenis dibatasi dan sisanya dihitung", () => {
    const page = snap([...Array(10)].map((_, i) => ({ tag: "img", d: `img#g${i}`, y: i * 20, br: true })));
    const issues = layoutIssues(page);
    assert.equal(issues.length, 7);
    assert.equal(issues.at(-1)!.message, "(+4 more)");
    assert.equal(issueTotal(issues), 10);
  });

  it("snapshot dari browser dirapikan: box tidak valid dan induk yang salah dibuang", () => {
    const s = normalizeSnapshot({
      url: "/",
      title: "",
      viewport: {},
      elements: [],
      text: "",
      errors: [],
      failed: [],
      layout: { docWidth: "x", width: 390, boxes: [{ p: 5, tag: "DIV", d: "div", x: 1, y: 2, w: 3, h: 4, fg: [300, -1, 0, 2], evil: 1 }, null], styled: ["a"], kit: true },
    })!;
    assert.deepEqual(s.layout!.boxes, [{ p: -1, tag: "div", d: "div", x: 1, y: 2, w: 3, h: 4, fg: [255, 0, 0, 1] }]);
    assert.equal(s.layout!.docWidth, 0);
  });

  it("teks temuan tersedia dalam Bahasa Indonesia", () => {
    setLocale("id");
    try {
      const page = snap([{ tag: "img", d: "img", br: true }], { kit: false });
      assert.deepEqual(layoutIssues(page).map((i) => i.message), ["Gambar gagal dimuat: img", "Halaman tidak memakai kit UI (page() dari zentara/ui)"]);
    } finally {
      setLocale("en");
    }
  });
});

describe("pemeriksaan tampilan versi teks (tanpa browser)", () => {
  before(() => setLocale("en"));
  after(() => setLocale("id"));

  const KIT = `<!doctype html><html><head><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="/_zentara/ui.css?v=1"></head><body class="zu"><h1>Rapi</h1><img src="/logo.png" alt="logo"></body></html>`;
  const BROKEN = `<!doctype html><html><head><style>.x{}</style><link rel="stylesheet" href="/app.css"></head><body><div style="width:900px" class="a b c">x</div><img src="/hilang.png" alt=""><img src="https://cdn.example/x.png" alt=""></body></html>`;

  it("fakta HTML: kit UI, meta viewport, style, stylesheet, gambar lokal, halaman bawaan", () => {
    assert.deepEqual(htmlFacts(KIT), { styled: [], styleTags: 0, sheets: [], kit: true, viewportMeta: true, framework: false, images: ["/logo.png"] });
    const broken = htmlFacts(BROKEN);
    assert.deepEqual(broken.styled, ["div.a.b"]);
    assert.equal(broken.styleTags, 1);
    assert.deepEqual(broken.sheets, ["/app.css"]);
    assert.equal(broken.kit, false);
    assert.deepEqual(broken.images, ["/hilang.png"]);
    assert.equal(htmlFacts(`<script>window.ZentaraChat=1</script><style></style>`).framework, true);
    assert.deepEqual(staticIssues(htmlFacts(`<script>window.ZentaraChat=1</script><style></style>`)), []);
  });

  it("viewPage versi teks: memeriksa gambar lokal dan menandai hasil", async () => {
    const server = http.createServer((req, res) => {
      if (req.url === "/rapi" || req.url === "/rusak") {
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        return res.end(req.url === "/rapi" ? KIT : BROKEN);
      }
      if (req.url === "/logo.png") {
        res.writeHead(200, { "Content-Type": "image/png" });
        return res.end("png");
      }
      res.writeHead(404);
      res.end();
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
    const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      const clean = await viewPage({ path: "/rapi", viewport: "mobile", expect: { noLayoutIssues: true } }, undefined, { fallbackBase: base });
      assert.equal(clean.ok, true);
      assert.match(clean.text, /^RESULT ok · text · mobile · 0 findings/);
      assert.match(clean.text, /The mobile screen size can only be checked in the browser/);
      assert.match(clean.text, /PASS no layout check findings/);
      assert.deepEqual(clean.summary, { path: "/rapi", viewport: "mobile", mode: "text", ok: true, issues: 0, errors: 0, failedChecks: 0 });

      const broken = await viewPage({ path: "/rusak", expect: { noLayoutIssues: true } }, undefined, { fallbackBase: base });
      assert.equal(broken.ok, false);
      assert.match(broken.text, /^RESULT fail · text · desktop · 6 findings · 1 FAIL/);
      assert.match(broken.text, /- \[image\] Image failed to load: img "\/hilang.png"/);
      assert.match(broken.text, /- \[style\] style attribute on div\.a\.b/);
      assert.match(broken.text, /- \[style\] Stylesheet outside the UI kit: \/app\.css/);
      assert.match(broken.text, /Position, overlap, truncated text, and contrast are only checked in the browser/);
    } finally {
      await new Promise<void>((r) => server.close(() => r()));
    }
  });

  it("expect noLayoutIssues dan noConsoleErrors di browser", () => {
    const s = snap([{ tag: "img", d: "img", br: true }]);
    s.errors.push({ kind: "console", message: "boom" });
    const check = checkExpect({ noConsoleErrors: true, noLayoutIssues: true }, { snapshot: s });
    assert.deepEqual(check.lines, ["FAIL no console errors or failed requests (1 errors, 0 failed requests)", "FAIL no layout check findings (1 findings)"]);
  });
});

describe("tool view_page", () => {
  before(() => setLocale("en"));
  after(() => setLocale("id"));

  const tool = agentTools.find((t) => t.spec.name === "view_page")!;
  const withViewer = (snapshot: (viewport: string | undefined) => unknown) => {
    const asked: { path: string; viewport?: string }[] = [];
    const viewer: PageViewer = {
      appUrl: () => "http://localhost:3999",
      browser: async (p, o) => {
        asked.push({ path: p, viewport: o.viewport });
        return { snapshot: normalizeSnapshot(snapshot(o.viewport))! };
      },
      waitForApp: async () => {},
    };
    return { viewer, asked };
  };

  it("url + viewport mobile dikirim ke tab browser dan hasilnya dicatat", async () => {
    const { viewer, asked } = withViewer((viewport) => ({ url: "http://localhost:3999/notes", title: "N", viewport: viewport === "mobile" ? { w: 390, h: 844 } : { w: 1280, h: 800 }, elements: [], text: "Tambah", errors: [], failed: [] }));
    const views: ViewRecord[] = [];
    const ctx = { root: os.tmpdir(), viewer, views } as unknown as ToolContext;
    const out = await tool.run({ url: "/notes", viewport: "mobile", expect: { text: "Tambah", noLayoutIssues: true } }, ctx);
    assert.deepEqual(asked, [{ path: "/notes", viewport: "mobile" }]);
    assert.match(out, /^RESULT ok · browser · mobile · 0 findings/);
    assert.match(out, /Screen: mobile 390x844/);
    assert.match(out, /PASS text "Tambah"/);
    // Nama lama tetap diterima: path dan noErrors.
    await tool.run({ path: "/notes", expect: { noErrors: true } }, ctx);
    assert.deepEqual(asked.at(-1), { path: "/notes", viewport: "desktop" });
    assert.deepEqual(views.map((v) => [v.path, v.viewport, !v.unreachable && v.ok]), [["/notes", "mobile", true], ["/notes", "desktop", true]]);
    await assert.rejects(tool.run({}, ctx), /url is required/);
  });

  it("server aplikasi tidak bisa dihubungi: dicatat sebagai unreachable", async () => {
    const views: ViewRecord[] = [];
    const saved = process.env.PORT;
    process.env.PORT = "1";
    try {
      await assert.rejects(tool.run({ url: "/x" }, { root: os.tmpdir(), views } as unknown as ToolContext), /Could not reach the app/);
    } finally {
      if (saved === undefined) delete process.env.PORT;
      else process.env.PORT = saved;
    }
    assert.deepEqual(views, [{ path: "/x", viewport: "desktop", unreachable: true }]);
  });
});

describe("pemeriksaan tampilan wajib di alur AI", () => {
  it("file halaman: route non-API, views, components; bukan API, test, atau database", () => {
    assert.equal(isPageFile("src/app/routes/notes/index.ts"), true);
    assert.equal(isPageFile("src/app/components/card.tsx"), true);
    assert.equal(isPageFile("src/app/routes/api/notes.ts"), false);
    assert.equal(isPageFile("src/app/routes/notes.test.ts"), false);
    assert.equal(isPageFile("src/app/db/schema.ts"), false);
    assert.equal(isPageFile("src/app/routes/logo.png"), false);
  });

  const v = (path: string, viewport: "desktop" | "mobile", ok = true): ViewRecord => ({ path, viewport, mode: "browser", ok, issues: ok ? 0 : 2, errors: 0, failedChecks: 0 });

  it("pendingViews: desktop dan ponsel wajib, hasil terakhir yang dihitung, server mati dilewati", () => {
    assert.deepEqual(pendingViews([]), { problems: [] });
    assert.deepEqual(pendingViews([v("/a", "desktop")]), { problems: [] });
    assert.equal(pendingViews([v("/a", "desktop"), v("/a", "mobile")]), undefined);
    assert.deepEqual(pendingViews([v("/a", "desktop"), v("/a", "mobile", false)]), { problems: ["/a (mobile): 2 layout"] });
    assert.equal(pendingViews([v("/a", "desktop"), v("/a", "mobile", false), v("/a", "mobile")]), undefined);
    assert.equal(pendingViews([{ path: "/a", viewport: "desktop", unreachable: true }]), undefined);
  });
});

describe("journal hasil tugas AI", () => {
  let dir: string;
  afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));

  const result = (status: AgentResult["status"]): AgentResult => ({
    status,
    changedFiles: ["src/app/routes/a.ts"],
    steps: 5,
    providersUsed: ["claude"],
    models: ["m"],
    usage: { inputTokens: 10, outputTokens: 2, unreported: 0 },
    fixAttempts: 1,
    toolCalls: [{ name: "write_file", ok: true }],
    denied: [],
    durationMs: 1200,
    checks: {
      verify: [
        { name: "typecheck", ok: true },
        { name: "test", ok: true },
      ],
      views: [{ path: "/a", viewport: "mobile", mode: "browser", ok: true, issues: 0, errors: 0, failedChecks: 0 }],
      viewAttempts: 1,
    },
  });

  it("entri berisi ringkasan saja, dibaca kembali oleh zentara ai:log", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-tasklog-"));
    const entry = taskLogEntry("buat halaman a\n<konteks>rahasia halaman</konteks>", result("done"), { now: new Date("2026-09-26T07:00:00Z") });
    assert.equal(entry.task, "buat halaman a");
    assert.deepEqual(entry.checks, { typecheck: true, test: true, views: [{ path: "/a", viewport: "mobile", mode: "browser", ok: true, issues: 0 }], viewAttempts: 1 });
    appendTaskLog(dir, entry);
    appendTaskLog(dir, taskLogEntry("tugas gagal", { error: "provider mati" }));
    fs.appendFileSync(taskLogPath(dir), "bukan json\n");
    const entries = readTaskLog(dir);
    assert.deepEqual(entries.map((e) => [e.status, e.ok]), [["done", true], ["error", false]]);
    assert.doesNotMatch(fs.readFileSync(taskLogPath(dir), "utf8"), /rahasia halaman/);

    const out: string[] = [];
    assert.equal(await run(["ai:log"], { cwd: dir, out: (l) => out.push(l), err: () => {} }), 0);
    assert.match(out[0]!, /2026-09-26 07:00 {2}✓ done +5 langkah · typecheck ✓ · test ✓ · view_page 1\/1 {2}buat halaman a/);
    assert.match(out.at(-1)!, /2 tugas, 1 selesai \(50%\)/);
    const json: string[] = [];
    await run(["ai:log", "--json", "--limit", "1"], { cwd: dir, out: (l) => json.push(l), err: () => {} });
    assert.equal((JSON.parse(json.join("\n")) as unknown[]).length, 1);
  });

  it("journal kosong", async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-tasklog-"));
    const out: string[] = [];
    assert.equal(await run(["ai:log"], { cwd: dir, out: (l) => out.push(l), err: () => {} }), 0);
    assert.match(out.join("\n"), /Belum ada tugas Zentara AI/);
  });
});

describe("devtools: zentara view dari terminal lain", () => {
  it("port dan token di .zentara/devtools.json (hanya pemilik), dihapus saat berhenti; /view memakai viewPage", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-dtinfo-"));
    const dt = await startDevtools({ root, loadConfig: async () => resolveAiConfig({ mode: "ask", providers: [] }) });
    try {
      assert.deepEqual(readDevtoolsInfo(root), { port: dt.port, token: dt.token });
      if (process.platform !== "win32") assert.equal(fs.statSync(devtoolsInfoPath(root)).mode & 0o777, 0o600);
      const denied = await fetch(`http://127.0.0.1:${dt.port}/view`, { method: "POST", body: "{}" });
      assert.equal(denied.status, 401);
      // Tidak ada tab dan tidak ada server aplikasi: pesan error dari viewPage.
      const res = await fetch(`http://127.0.0.1:${dt.port}/view`, {
        method: "POST",
        headers: { "X-Zentara-Token": dt.token, "Content-Type": "application/json" },
        body: JSON.stringify({ path: "/x", viewport: "mobile", base: "http://127.0.0.1:1" }),
      });
      assert.equal(res.status, 400);
      assert.match(((await res.json()) as { error: string }).error, /127\.0\.0\.1:1\/x/);
    } finally {
      await dt.close();
    }
    assert.equal(readDevtoolsInfo(root), undefined);
    fs.rmSync(root, { recursive: true, force: true });
  });
});
