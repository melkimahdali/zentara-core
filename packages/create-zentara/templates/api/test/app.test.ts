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

  // Formulir HTML (seperti browser: application/x-www-form-urlencoded, redirect tidak diikuti).
  const form = (url: string, fields: Record<string, string>, cookie = "") =>
    fetch(`${base}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", cookie },
      body: new URLSearchParams(fields).toString(),
      redirect: "manual",
    });
  const page = (url: string, cookie = "") => fetch(`${base}${url}`, { headers: { cookie }, redirect: "manual" });

  it("halaman: login, dasbor, dan kembali ke halaman asal", async () => {
    const loginPage = await page("/login");
    assert.equal(loginPage.status, 200);
    assert.match(await loginPage.text(), /<form class="zu-form" method="post" action="\/login">/);
    assert.equal((await page("/_zentara/ui.css")).status, 200);

    const guest = await page("/dashboard");
    assert.equal(guest.status, 303);
    assert.equal(guest.headers.get("location"), "/login?next=%2Fdashboard");

    const wrong = await form("/login", { email: "admin@zentara.test", password: "salah" });
    assert.equal(wrong.status, 401);
    const wrongHtml = await wrong.text();
    assert.match(wrongHtml, /Email atau password salah/);
    assert.match(wrongHtml, /value="admin@zentara.test"/, "email diisi ulang");

    const empty = await form("/login", { email: "", password: "" });
    assert.equal(empty.status, 422);
    assert.match(await empty.text(), /Email wajib diisi/);

    const ok = await form("/login", { email: "Admin@Zentara.test", password: "admin12345", next: "/admin/users" });
    assert.equal(ok.status, 303);
    assert.equal(ok.headers.get("location"), "/admin/users");
    const cookie = cookieOf(ok);
    const dash = await page("/dashboard", cookie);
    assert.equal(dash.status, 200);
    const dashHtml = await dash.text();
    assert.match(dashHtml, /Halo, Admin/);
    assert.match(dashHtml, /Kopi Gayo 250g/);
    assert.match(dashHtml, /aria-current="page">Dasbor/);

    // Hanya path lokal yang boleh jadi tujuan setelah login.
    for (const next of ["https://jahat.id", "//jahat.id", "/\\jahat.id"]) {
      const res = await form("/login", { email: "admin@zentara.test", password: "admin12345", next });
      assert.equal(res.headers.get("location"), "/dashboard", next);
    }
    assert.equal((await page("/login", cookie)).headers.get("location"), "/dashboard", "sudah login -> ke dasbor");

    const out = await form("/logout", {}, cookie);
    assert.equal(out.status, 303);
    assert.equal(out.headers.get("location"), "/login");
  });

  it("halaman: daftar akun, validasi, dan batas akses admin", async () => {
    const invalid = await form("/register", { name: "B", email: "bukan-email", password: "123" });
    assert.equal(invalid.status, 422);
    const html = await invalid.text();
    assert.match(html, /Nama minimal 2 karakter/);
    assert.match(html, /Password minimal 8 karakter/);
    assert.match(html, /value="bukan-email"/);
    assert.ok(!html.includes('value="123"'), "password tidak diisi ulang");

    const reg = await form("/register", { name: "Budi Santoso", email: "budi@mail.id", password: "rahasia123" });
    assert.equal(reg.status, 303);
    const budi = cookieOf(reg);
    assert.match(await (await page("/dashboard", budi)).text(), /Halo, Budi/);
    assert.equal((await form("/register", { name: "Budi", email: "budi@mail.id", password: "rahasia123" })).status, 409);

    // User biasa: tidak ada menu Kelola dan tidak boleh membuka halaman admin.
    assert.doesNotMatch(await (await page("/dashboard", budi)).text(), /\/admin\/products/);
    assert.equal((await page("/admin/products", budi)).status, 403);
    assert.equal((await form("/admin/products", { name: "Curang", price: "1", stock: "1" }, budi)).status, 403);
  });

  it("halaman admin: tambah, ubah, hapus produk", async () => {
    const admin = cookieOf(await form("/login", { email: "admin@zentara.test", password: "admin12345" }));
    const bad = await form("/admin/products", { name: "X", price: "-5", stock: "abc" }, admin);
    assert.equal(bad.status, 422);
    const badHtml = await bad.text();
    assert.match(badHtml, /Nama minimal 2 karakter/);
    assert.match(badHtml, /Harga tidak boleh negatif/);

    const created = await form("/admin/products", { name: "Rendang Kaleng", price: "55000", stock: "0" }, admin);
    assert.equal(created.headers.get("location"), "/admin/products?pesan=dibuat");
    const list = await (await page("/admin/products?pesan=dibuat", admin)).text();
    assert.match(list, /Produk ditambahkan/);
    assert.match(list, /Rendang Kaleng/);
    assert.match(list, /Rp55\.000/);
    const id = /href="\/admin\/products\/(\d+)"[^>]*>Ubah<\/a>/.exec(list)![1];

    assert.equal((await form(`/admin/products/${id}`, { name: "Rendang Kaleng 200g", price: "57000", stock: "3" }, admin)).status, 303);
    const product = (await (await fetch(`${base}/api/products/${id}`)).json()) as { name: string; price: number };
    assert.deepEqual([product.name, product.price], ["Rendang Kaleng 200g", 57000]);
    assert.match(await (await page(`/admin/products/${id}`, admin)).text(), /Hapus Rendang Kaleng 200g\?/);

    assert.equal((await form(`/admin/products/${id}/hapus`, {}, admin)).headers.get("location"), "/admin/products?pesan=dihapus");
    assert.equal((await page(`/admin/products/${id}`, admin)).status, 404);
    assert.equal((await page("/admin/products/abc", admin)).status, 404);
    assert.match(await (await page("/admin/users", admin)).text(), /budi@mail\.id/);
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
