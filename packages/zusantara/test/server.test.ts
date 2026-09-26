import assert from "node:assert/strict";
import http from "node:http";
import { after, before, describe, it } from "node:test";
import { definePlugin } from "../src/core/index.js";
import { startServer } from "./helpers.js";

/** Request mentah agar path seperti "/../x" tidak dinormalisasi oleh fetch. */
function rawRequest(port: number, path: string, method = "GET"): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: "127.0.0.1", port, path, method }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (c: string) => (body += c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body }));
    });
    req.on("error", reject);
    req.end();
  });
}

describe("server", () => {
  let base: string;
  let port: number;
  let close: () => Promise<void>;
  const pluginCalls: string[] = [];

  before(async () => {
    const plugin = definePlugin({ name: "test-plugin", setup: (rt) => void pluginCalls.push(rt.config.appName) });
    ({ base, port, close } = await startServer({ appName: "Test", plugins: [plugin], bodyLimit: 64 }));
  });
  after(() => close());

  it("menjalankan plugin saat boot", () => {
    assert.deepEqual(pluginCalls, ["Test"]);
  });

  it("string -> HTML, object -> JSON", async () => {
    const home = await fetch(`${base}/`);
    assert.equal(home.status, 200);
    assert.match(home.headers.get("content-type") ?? "", /text\/html/);
    assert.equal(await home.text(), "<h1>home</h1>");

    const users = await fetch(`${base}/users`);
    assert.match(users.headers.get("content-type") ?? "", /application\/json/);
    assert.deepEqual(await users.json(), { users: [] });
  });

  it("query string dan parameter dinamis", async () => {
    assert.deepEqual(await (await fetch(`${base}/api/items?q=kopi&tag=a&tag=b`)).json(), { q: "kopi", tags: ["a", "b"] });
    assert.deepEqual(await (await fetch(`${base}/users/7`)).json(), { id: "7" });
    assert.deepEqual(await (await fetch(`${base}/docs/intro/setup`)).json(), { slug: "intro/setup" });
  });

  it("POST JSON dengan status & header kustom", async () => {
    const res = await fetch(`${base}/api/items`, { method: "POST", body: JSON.stringify({ a: 1 }) });
    assert.equal(res.status, 201);
    assert.equal(res.headers.get("x-created"), "yes");
    assert.deepEqual(await res.json(), { received: { a: 1 } });
  });

  it("JSON tidak valid -> 400", async () => {
    const res = await fetch(`${base}/api/items`, { method: "POST", body: "{nope", headers: { Accept: "application/json" } });
    assert.equal(res.status, 400);
    assert.deepEqual(await res.json(), { error: { status: 400, message: "Invalid JSON body" } });
  });

  it("body melebihi batas -> 413", async () => {
    const res = await fetch(`${base}/api/items`, { method: "POST", body: JSON.stringify({ big: "x".repeat(500) }) });
    assert.equal(res.status, 413);
  });

  it("method tidak didukung -> 405 dengan header Allow", async () => {
    const res = await fetch(`${base}/api/items`, { method: "DELETE" });
    assert.equal(res.status, 405);
    assert.equal(res.headers.get("allow"), "GET, HEAD, POST, OPTIONS");
  });

  it("OPTIONS otomatis -> 204 dengan Allow", async () => {
    const res = await fetch(`${base}/users/1`, { method: "OPTIONS" });
    assert.equal(res.status, 204);
    assert.equal(res.headers.get("allow"), "GET, HEAD, DELETE, OPTIONS");
  });

  it("HEAD memakai GET tanpa body; undefined -> 204", async () => {
    const head = await fetch(`${base}/users`, { method: "HEAD" });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
    assert.ok(Number(head.headers.get("content-length")) > 0);
    assert.equal((await fetch(`${base}/users/1`, { method: "DELETE" })).status, 204);
  });

  it("error di handler -> 500 tanpa membocorkan detail, dan server tetap hidup", async () => {
    const res = await fetch(`${base}/api/boom`);
    assert.equal(res.status, 500);
    assert.equal(await res.text(), "Internal Server Error");
    assert.equal((await fetch(`${base}/users`)).status, 200);
  });

  it("HttpError memakai status & pesannya", async () => {
    const res = await fetch(`${base}/api/forbidden`);
    assert.equal(res.status, 403);
    assert.equal(await res.text(), "Akses ditolak");
  });

  it("handler boleh menulis ctx.res sendiri; redirect()", async () => {
    const manual = await fetch(`${base}/api/manual`);
    assert.equal(manual.status, 202);
    assert.equal(await manual.text(), "manual");
    const go = await fetch(`${base}/api/go`, { redirect: "manual" });
    assert.equal(go.status, 303);
    assert.equal(go.headers.get("location"), "/users");
  });

  it("input pengguna di-escape saat dirender", async () => {
    const res = await fetch(`${base}/xss?q=${encodeURIComponent('<script>alert(1)</script>"')}`);
    const body = await res.text();
    assert.ok(!body.includes("<script>"));
    assert.equal(body, '<p title="&lt;script&gt;alert(1)&lt;/script&gt;&quot;">&lt;script&gt;alert(1)&lt;/script&gt;&quot;</p>');
  });

  it("404 untuk route tidak dikenal", async () => {
    const res = await fetch(`${base}/tidak-ada`);
    assert.equal(res.status, 404);
    assert.equal(await res.text(), "Not Found");
  });

  it("melayani file statis dari public/", async () => {
    const res = await fetch(`${base}/hello.txt`);
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type") ?? "", /text\/plain/);
    assert.equal(await res.text(), "halo statis\n");
    assert.equal((await fetch(`${base}/file%20with%20space.json`)).status, 200);
  });

  it("menolak path traversal dan dotfile", async () => {
    for (const p of ["/../package.json", "/..%2f..%2fpackage.json", "/%2e%2e/%2e%2e/package.json", "/.secret/key.txt", "/%2esecret/key.txt", "/hello.txt%00"]) {
      const res = await rawRequest(port, p);
      assert.equal(res.status, 404, `${p} -> ${res.status}`);
      assert.ok(!res.body.includes("rahasia") && !res.body.includes("zusantara-core"), p);
    }
  });

  it("path diawali // tidak dianggap host lain", async () => {
    const res = await rawRequest(port, "//users");
    assert.equal(res.status, 200);
  });

  it("encoding persen rusak -> 400", async () => {
    assert.equal((await rawRequest(port, "/users/%E0%A4%A")).status, 400);
  });
});
