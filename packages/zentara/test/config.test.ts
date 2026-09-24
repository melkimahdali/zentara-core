import assert from "node:assert/strict";
import path from "node:path";
import { describe, it } from "node:test";
import { resolveConfig } from "../src/core/index.js";

describe("resolveConfig", () => {
  it("memakai default", () => {
    const c = resolveConfig({}, {}, "/proj");
    assert.equal(c.port, 3000);
    assert.equal(c.env, "development");
    assert.equal(c.publicDir, path.resolve("/proj", "public"));
    assert.equal(c.bodyLimit, 1024 * 1024);
    assert.ok(c.routesDir.endsWith(path.join("app", "routes")));
  });

  it("variabel lingkungan menimpa config file", () => {
    const c = resolveConfig({ port: 3000, env: "development" }, { PORT: "8080", NODE_ENV: "production", LOG_LEVEL: "error" });
    assert.equal(c.port, 8080);
    assert.equal(c.env, "production");
    assert.equal(c.logLevel, "error");
  });

  it("memvalidasi nilai", () => {
    assert.throws(() => resolveConfig({}, { PORT: "abc" }), /Invalid port/);
    assert.throws(() => resolveConfig({ port: 70000 }, {}), /Invalid port/);
    assert.throws(() => resolveConfig({}, { LOG_LEVEL: "loud" }), /Invalid logLevel/);
    assert.throws(() => resolveConfig({ bodyLimit: -1 }, {}), /Invalid bodyLimit/);
  });

  it("publicDir bisa dimatikan", () => {
    assert.equal(resolveConfig({ publicDir: false }, {}).publicDir, false);
  });
});

describe("debug (halaman error lengkap)", () => {
  it("hanya aktif bila pengembangan diatur eksplisit", () => {
    assert.equal(resolveConfig({}, {}).debug, false, "NODE_ENV kosong: jangan bocorkan detail error");
    assert.equal(resolveConfig({}, { NODE_ENV: "development" }).debug, true);
    assert.equal(resolveConfig({ env: "development" }, {}).debug, true);
    assert.equal(resolveConfig({}, { NODE_ENV: "production" }).debug, false);
    assert.equal(resolveConfig({ debug: true }, { NODE_ENV: "production" }).debug, true);
    assert.equal(resolveConfig({ debug: true }, { NODE_ENV: "development", ZENTARA_DEBUG: "false" }).debug, false);
  });
});
