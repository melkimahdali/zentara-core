import assert from "node:assert/strict";
import type { IncomingMessage } from "node:http";
import { after, before, describe, it } from "node:test";
import { renderErrorPage } from "../src/core/devpage/error.js";
import { parseStack } from "../src/core/devpage/error.js";
import { setAppInfo } from "../src/core/devpage/info.js";
import { highlight, jsonForScript } from "../src/core/devpage/theme.js";
import { welcomePage } from "../src/core/index.js";
import { startServer } from "./helpers.js";

const html = { accept: "text/html,application/xhtml+xml" };

describe("halaman error di produksi (debug mati)", () => {
  let base: string;
  let close: () => Promise<void>;
  before(async () => ({ base, close } = await startServer({ debug: false })));
  after(() => close());

  it("500 untuk browser: halaman rapi tanpa detail internal", async () => {
    const res = await fetch(`${base}/api/boom`, { headers: html });
    assert.equal(res.status, 500);
    assert.match(res.headers.get("content-type") ?? "", /text\/html/);
    const body = await res.text();
    assert.match(body, /Terjadi kesalahan/);
    assert.doesNotMatch(body, /kaboom|secret internal detail|boom\.ts|Stack trace/);
  });

  it("404 untuk browser: halaman status tanpa daftar route", async () => {
    const res = await fetch(`${base}/tidak-ada`, { headers: html });
    assert.equal(res.status, 404);
    const body = await res.text();
    assert.match(body, /Halaman tidak ditemukan/);
    assert.doesNotMatch(body, /Route yang tersedia|\/api\/items/);
  });

  it("pesan HttpError yang boleh ditampilkan tetap muncul", async () => {
    const body = await (await fetch(`${base}/api/forbidden`, { headers: html })).text();
    assert.match(body, /Akses ditolak/);
  });

  it("klien API tetap mendapat teks/JSON seperti sebelumnya", async () => {
    assert.equal(await (await fetch(`${base}/api/boom`)).text(), "Internal Server Error");
    const json = await (await fetch(`${base}/tidak-ada`, { headers: { accept: "application/json" } })).json();
    assert.deepEqual(json, { error: { status: 404, message: "Not Found" } });
  });
});

describe("halaman error saat pengembangan (debug)", () => {
  let base: string;
  let close: () => Promise<void>;
  before(async () => ({ base, close } = await startServer({ debug: true })));
  after(() => close());

  it("500: pesan, lokasi file, potongan kode, dan header rahasia disembunyikan", async () => {
    const res = await fetch(`${base}/api/boom?x=1`, { headers: { ...html, cookie: "sid=rahasia-sekali", authorization: "Bearer token-rahasia" } });
    assert.equal(res.status, 500);
    const body = await res.text();
    assert.match(body, /kaboom: secret internal detail/);
    assert.match(body, /boom\.ts:2/);
    assert.match(body, /class="ln hl"/);
    assert.match(body, /Stack trace/);
    assert.doesNotMatch(body, /rahasia-sekali|token-rahasia/);
    // Tanpa `zentara dev` tidak ada chat AI.
    assert.doesNotMatch(body, /window\.ZentaraChat =/);
  });

  it("404: daftar route dan saran perintah", async () => {
    const body = await (await fetch(`${base}/belum/ada`, { headers: html })).text();
    assert.match(body, /Tidak ada route untuk/);
    assert.match(body, /\/api\/items/);
    assert.match(body, /npx zentara make:route belum\/ada/);
  });

  it("404 yang dilempar aplikasi memakai pesan aplikasi, bukan daftar route", async () => {
    const body = await (await fetch(`${base}/api/forbidden`, { headers: html })).text();
    assert.match(body, /Akses ditolak/);
    assert.doesNotMatch(body, /Route yang tersedia/);
  });
});

describe("renderErrorPage", () => {
  const req = { method: "GET", url: "/x?<b>", headers: { host: "localhost" } } as unknown as IncomingMessage;

  it("meng-escape pesan error dan URL", () => {
    setAppInfo({ appName: "Uji", env: "development", debug: true, root: process.cwd(), routes: [] });
    const body = renderErrorPage(new Error('<img src=x onerror="alert(1)">'), req);
    assert.doesNotMatch(body, /<img src=x/);
    assert.match(body, /&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
    assert.doesNotMatch(body, /\/x\?<b>/);
  });

  it("menyertakan chat hanya bila devtools tersedia", () => {
    process.env.ZENTARA_DEVTOOLS_PORT = "4567";
    process.env.ZENTARA_DEVTOOLS_TOKEN = "tok";
    try {
      const body = renderErrorPage(new Error("x"), req);
      assert.match(body, /Tanya Zentara AI/);
      assert.match(body, /"devtools":\{"port":4567,"token":"tok"\}/);
    } finally {
      delete process.env.ZENTARA_DEVTOOLS_PORT;
      delete process.env.ZENTARA_DEVTOOLS_TOKEN;
    }
  });
});

describe("parseStack & highlight", () => {
  it("membedakan kode aplikasi dari node_modules dan internal", () => {
    const stack = [
      "Error: x",
      "    at GET (/proj/src/app/routes/a.ts:3:9)",
      "    at async compose (file:///proj/node_modules/zentara/dist/core/middleware.js:10:5)",
      "    at process.processTicksAndRejections (node:internal/process/task_queues:95:5)",
      "    at /proj/src/app/lib/x.ts:1:1",
    ].join("\n");
    const frames = parseStack(stack, "/proj");
    assert.deepEqual(frames.map((f) => [f.fn, f.line, f.app]), [
      ["GET", 3, true],
      ["compose", 10, false],
      ["process.processTicksAndRejections", 95, false],
      [undefined, 1, true],
    ]);
  });

  it("highlight meng-escape HTML", () => {
    const out = highlight('const a = "<script>"; // </script>');
    assert.doesNotMatch(out, /<script>|<\/script>/);
    assert.match(out, /tok-k">const</);
  });

  it("jsonForScript tidak bisa menutup tag script", () => {
    assert.doesNotMatch(jsonForScript({ a: "</script><script>alert(1)</script>" }), /<\/script>/);
  });
});

describe("welcomePage", () => {
  it("produksi: tanpa daftar route dan tanpa chat", () => {
    setAppInfo({ appName: "Toko", env: "production", debug: false, root: process.cwd(), routes: [{ pattern: "/rahasia", methods: ["GET"], file: "x.ts" }] });
    const body = welcomePage();
    assert.match(body, /<title>Toko<\/title>/);
    assert.doesNotMatch(body, /\/rahasia|window\.ZentaraChat =/);
  });

  it("pengembangan lewat zentara dev: daftar route dan chat AI", () => {
    setAppInfo({ appName: "Zentara App", env: "development", debug: true, root: process.cwd(), routes: [{ pattern: "/api/produk", methods: ["GET", "POST"], file: "x.ts" }] });
    process.env.ZENTARA_DEVTOOLS_PORT = "4567";
    process.env.ZENTARA_DEVTOOLS_TOKEN = "tok";
    try {
      const body = welcomePage();
      assert.match(body, /\/api\/produk/);
      assert.match(body, /window\.ZentaraChat =/);
      assert.match(body, /Buatkan blog sederhana/);
    } finally {
      delete process.env.ZENTARA_DEVTOOLS_PORT;
      delete process.env.ZENTARA_DEVTOOLS_TOKEN;
    }
  });
});
