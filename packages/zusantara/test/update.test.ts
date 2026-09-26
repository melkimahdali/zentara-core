import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { checkForUpdate, isNewer } from "../src/update.js";

describe("cek versi baru", () => {
  it("isNewer", () => {
    assert.equal(isNewer("0.8.1", "0.8.0"), true);
    assert.equal(isNewer("0.10.0", "0.9.9"), true);
    assert.equal(isNewer("0.8.0", "0.8.0"), false);
    assert.equal(isNewer("0.7.9", "0.8.0"), false);
    assert.equal(isNewer("0.9.0", "0.9.0-beta.1"), true);
  });

  it("mengambil dari registry sekali sehari dan tidak pernah melempar error", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-update-"));
    const cacheFile = path.join(dir, "check.json");
    let calls = 0;
    const fetchImpl = (async () => {
      calls++;
      return new Response(JSON.stringify({ version: "0.9.0" }));
    }) as typeof fetch;
    assert.equal(await checkForUpdate({ current: "0.8.0", cacheFile, fetchImpl, env: {}, now: 1000 }), "0.9.0");
    assert.equal(await checkForUpdate({ current: "0.8.0", cacheFile, fetchImpl, env: {}, now: 2000 }), "0.9.0");
    assert.equal(calls, 1, "hasil disimpan 24 jam");
    assert.equal(await checkForUpdate({ current: "0.9.0", cacheFile, fetchImpl, env: {}, now: 3000 }), undefined);
    const failing = (async () => {
      throw new Error("offline");
    }) as typeof fetch;
    assert.equal(await checkForUpdate({ current: "0.8.0", cacheFile: path.join(dir, "x.json"), fetchImpl: failing, env: {} }), undefined);
    assert.equal(await checkForUpdate({ current: "0.8.0", cacheFile, fetchImpl, env: { CI: "true" } }), undefined);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
