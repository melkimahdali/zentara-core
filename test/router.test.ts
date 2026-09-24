import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { ZenLogger } from "../src/core/index.js";
import { allowedMethods, resolveHandler, segmentsFromFile, ZenRouter } from "../src/core/router.js";
import { FIXTURES } from "./helpers.js";

describe("segmentsFromFile", () => {
  it("memetakan file ke segmen", () => {
    assert.deepEqual(segmentsFromFile("index.ts"), []);
    assert.deepEqual(segmentsFromFile(path.join("users", "index.ts")), [{ kind: "static", value: "users" }]);
    assert.deepEqual(segmentsFromFile(path.join("users", "[id].ts")), [
      { kind: "static", value: "users" },
      { kind: "param", name: "id" },
    ]);
    assert.deepEqual(segmentsFromFile(path.join("docs", "[...slug].js")), [
      { kind: "static", value: "docs" },
      { kind: "catchAll", name: "slug" },
    ]);
  });

  it("menolak pola yang tidak valid", () => {
    assert.throws(() => segmentsFromFile(path.join("[...a]", "b.ts")), /Catch-all/);
    assert.throws(() => segmentsFromFile(path.join("[id]", "[id].ts")), /duplikat/);
    assert.throws(() => segmentsFromFile("a[b].ts"), /tidak valid/);
    assert.throws(() => segmentsFromFile("[1x].ts"), /tidak valid/);
  });
});

describe("ZenRouter.match", () => {
  const router = new ZenRouter(new ZenLogger("silent"));
  before(() => router.loadRoutes(path.join(FIXTURES, "routes")));

  it("mengabaikan file berawalan _", () => {
    assert.ok(!router.list.some((r) => r.file.endsWith("_helper.ts")));
  });

  it("mencocokkan route statis, index, dan trailing slash", () => {
    assert.equal(router.match("/")?.route.pattern, "/");
    assert.equal(router.match("/users")?.route.pattern, "/users");
    assert.equal(router.match("/users/")?.route.pattern, "/users");
  });

  it("route statis menang atas [param]", () => {
    assert.equal(router.match("/users/new")?.route.pattern, "/users/new");
    assert.deepEqual(router.match("/users/42")?.params, { id: "42" });
  });

  it("men-decode parameter dan menangani catch-all", () => {
    assert.deepEqual(router.match("/users/budi%20santoso")?.params, { id: "budi santoso" });
    assert.deepEqual(router.match("/docs/a/b/c")?.params, { slug: "a/b/c" });
    assert.equal(router.match("/docs"), undefined);
  });

  it("tidak mencocokkan path yang lebih panjang atau tidak dikenal", () => {
    assert.equal(router.match("/users/1/extra"), undefined);
    assert.equal(router.match("/nope"), undefined);
  });

  it("melempar 400 untuk encoding persen yang rusak", () => {
    assert.throws(() => router.match("/users/%E0%A4%A"), (err: { status?: number }) => err.status === 400);
  });
});

describe("method dispatch", () => {
  const GET = () => "get";
  it("HEAD memakai GET, default menangani semua method", () => {
    assert.equal(resolveHandler({ GET }, "HEAD"), GET);
    assert.equal(resolveHandler({ GET }, "POST"), undefined);
    const any = () => "any";
    assert.equal(resolveHandler({ default: any }, "DELETE"), any);
    assert.equal(resolveHandler({ default: any, GET }, "GET"), GET);
  });

  it("menghitung header Allow", () => {
    assert.deepEqual(allowedMethods({ GET, POST: GET }), ["GET", "HEAD", "POST", "OPTIONS"]);
  });
});

describe("loadRoutes validation", () => {
  let dir: string;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-routes-"));
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("menolak route yang bentrok", async () => {
    fs.mkdirSync(path.join(dir, "clash", "a"), { recursive: true });
    fs.writeFileSync(path.join(dir, "clash", "a.mjs"), "export default () => 1;");
    fs.writeFileSync(path.join(dir, "clash", "a", "index.mjs"), "export default () => 2;");
    await assert.rejects(new ZenRouter(new ZenLogger("silent")).loadRoutes(path.join(dir, "clash")), /bentrok/);
  });

  it("menolak file tanpa handler", async () => {
    fs.mkdirSync(path.join(dir, "empty"));
    fs.writeFileSync(path.join(dir, "empty", "x.mjs"), "export const notAHandler = 1;");
    await assert.rejects(new ZenRouter(new ZenLogger("silent")).loadRoutes(path.join(dir, "empty")), /tidak meng-export handler/);
  });

  it("folder yang tidak ada menghasilkan 0 route", async () => {
    const router = new ZenRouter(new ZenLogger("silent"));
    await router.loadRoutes(path.join(dir, "missing"));
    assert.equal(router.list.length, 0);
  });
});
