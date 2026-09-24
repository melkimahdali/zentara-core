import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { z } from "zod";
import { parse, type StandardSchemaV1 } from "../src/core/index.js";
import { startServer } from "./helpers.js";

/** Schema buatan tangan untuk membuktikan core tidak bergantung pada zod. */
const positiveInt: StandardSchemaV1<unknown, number> = {
  "~standard": {
    version: 1,
    vendor: "manual",
    validate: (v) =>
      typeof v === "number" && Number.isInteger(v) && v > 0 ? { value: v } : { issues: [{ message: "harus bilangan bulat positif" }] },
  },
};

describe("parse", () => {
  it("mengembalikan nilai valid", async () => {
    assert.equal(await parse(positiveInt, 5), 5);
    assert.deepEqual(await parse(z.object({ a: z.string() }), { a: "x", b: 1 }), { a: "x" });
  });

  it("melempar 422 dengan detail per field", async () => {
    await assert.rejects(parse(z.object({ items: z.array(z.object({ qty: z.number() })) }), { items: [{ qty: "x" }] }, "body"), (err: any) => {
      assert.equal(err.status, 422);
      assert.equal(err.details.source, "body");
      assert.equal(err.details.issues[0].path, "items.0.qty");
      return true;
    });
    await assert.rejects(parse(positiveInt, -1), (err: any) => err.details.issues[0].path === "");
  });
});

describe("validate() di route", () => {
  let base: string;
  let close: () => Promise<void>;
  before(async () => {
    ({ base, close } = await startServer());
  });
  after(() => close());

  it("JSON valid -> handler menerima data bertipe", async () => {
    const res = await fetch(`${base}/api/signup?ref=ig`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "budi", age: "20" }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { name: "BUDI", age: 20, ref: "ig" });
  });

  it("form HTML (urlencoded) juga didukung", async () => {
    const res = await fetch(`${base}/api/signup`, { method: "POST", body: new URLSearchParams({ name: "sari", age: "30" }) });
    assert.deepEqual(await res.json(), { name: "SARI", age: 30, ref: null });
  });

  it("input tidak valid -> 422 JSON dengan daftar error", async () => {
    const res = await fetch(`${base}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "b", age: 10 }),
    });
    assert.equal(res.status, 422);
    const body = (await res.json()) as { error: { status: number; message: string; details: { source: string; issues: { path: string }[] } } };
    assert.equal(body.error.message, "Validasi gagal");
    assert.equal(body.error.details.source, "body");
    assert.deepEqual(body.error.details.issues.map((i) => i.path).sort(), ["age", "name"]);
  });
});
