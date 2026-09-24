import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ZenRuntime } from "zentara";

// Uji aplikasi contoh (src/app) dengan database SQLite di memori.
process.env.DATABASE_URL = ":memory:";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("aplikasi contoh: auth + produk", () => {
  let base: string;
  let runtime: ZenRuntime;

  before(async () => {
    const { db } = await import("../src/app/db/index.js");
    const { migrateDatabase } = await import("zentara/db");
    await migrateDatabase(db, path.join(ROOT, "drizzle"));
    const seed = (await import("../src/app/db/seed.js")).default;
    await seed(db);
    runtime = new ZenRuntime({ port: 0, host: "127.0.0.1", logLevel: "silent", publicDir: false });
    const { port } = await runtime.start();
    base = `http://127.0.0.1:${port}`;
  });
  after(() => runtime.stop());

  const post = (url: string, body: unknown, cookie = "") =>
    fetch(`${base}${url}`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify(body) });
  const cookieOf = (res: Response) => res.headers.getSetCookie()[0]?.split(";")[0] ?? "";

  it("produk publik dengan filter", async () => {
    const all = (await (await fetch(`${base}/api/products`)).json()) as { name: string }[];
    assert.equal(all.length, 3);
    const cheap = (await (await fetch(`${base}/api/products?maxHarga=15000`)).json()) as { price: number }[];
    assert.ok(cheap.every((p) => p.price <= 15000) && cheap.length === 2);
    assert.deepEqual(await (await fetch(`${base}/api/products?q=%25`)).json(), [], "wildcard di-escape");
    assert.equal((await fetch(`${base}/api/products?maxHarga=abc`)).status, 422);
  });

  it("register -> me -> logout", async () => {
    const reg = await post("/api/auth/register", { name: "Sari", email: "SARI@mail.id", password: "rahasia123" });
    assert.equal(reg.status, 201);
    const body = (await reg.json()) as { user: Record<string, unknown> };
    assert.equal(body.user.email, "sari@mail.id");
    assert.equal("passwordHash" in body.user, false, "hash password tidak bocor");
    const cookie = cookieOf(reg);
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: { cookie } })).status, 200);
    assert.equal((await post("/api/auth/register", { name: "Sari", email: "sari@mail.id", password: "rahasia123" })).status, 409);
    const out = await post("/api/auth/logout", {}, cookie);
    assert.equal(out.status, 204);
  });

  it("user biasa tidak boleh mengubah produk; admin boleh", async () => {
    const user = cookieOf(await post("/api/auth/login", { email: "sari@mail.id", password: "rahasia123" }));
    assert.equal((await post("/api/products", { name: "Sambal", price: 20000 }, user)).status, 403);
    assert.equal((await post("/api/products", { name: "Sambal", price: 20000 })).status, 401);

    const admin = cookieOf(await post("/api/auth/login", { email: "admin@zentara.test", password: "admin12345" }));
    const created = (await (await post("/api/products", { name: "Sambal Roa", price: 20000, stock: 7 }, admin)).json()) as { id: number };
    const put = await fetch(`${base}/api/products/${created.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie: admin },
      body: JSON.stringify({ price: 18000 }),
    });
    assert.deepEqual(
      { price: ((await put.json()) as { price: number; stock: number }).price },
      { price: 18000 },
    );
    const after = (await (await fetch(`${base}/api/products/${created.id}`)).json()) as { stock: number };
    assert.equal(after.stock, 7, "update sebagian tidak mereset field lain");
    assert.equal((await fetch(`${base}/api/products/${created.id}`, { method: "DELETE", headers: { cookie: admin } })).status, 204);
    assert.equal((await fetch(`${base}/api/products/${created.id}`)).status, 404);
  });

  it("login salah -> 401 yang sama; brute force -> 429", async () => {
    const wrong = await post("/api/auth/login", { email: "admin@zentara.test", password: "salah" });
    const unknown = await post("/api/auth/login", { email: "siapa@mail.id", password: "salah" });
    assert.equal(wrong.status, 401);
    assert.equal(await wrong.text(), await unknown.text());
    let last = 0;
    for (let i = 0; i < 10; i++) last = (await post("/api/auth/login", { email: "x@y.id", password: "salah" })).status;
    assert.equal(last, 429);
  });
});
