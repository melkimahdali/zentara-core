import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { jobs, outbox, ZenRuntime } from "zentara";

// Uji aplikasi contoh (src/app) dengan database SQLite di memori.
process.env.DATABASE_URL = ":memory:";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("aplikasi contoh: auth + catatan", () => {
  let base: string;
  let runtime: ZenRuntime;

  before(async () => {
    const { db } = await import("../src/app/db/index.js");
    const { migrateDatabase } = await import("zentara/db");
    await migrateDatabase(db, path.join(ROOT, "drizzle"));
    const seed = (await import("../src/app/db/seed.js")).default;
    await seed(db);
    runtime = new ZenRuntime({ port: 0, host: "127.0.0.1", logLevel: "silent", publicDir: false, locale: "id", jobs: { store: "memory" }, mail: { url: "memory" } });
    const { port } = await runtime.start();
    base = `http://127.0.0.1:${port}`;
  });
  after(() => runtime.stop());

  const post = (url: string, body: unknown, cookie = "") =>
    fetch(`${base}${url}`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify(body) });
  const cookieOf = (res: Response) => res.headers.getSetCookie()[0]?.split(";")[0] ?? "";

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

    // Email sambutan dikirim oleh job di latar belakang.
    await jobs.drain();
    const welcome = outbox.find((m) => m.to.includes("sari@mail.id"));
    assert.match(welcome?.subject ?? "", /Selamat datang di Zentara App/);
  });

  it("API catatan: butuh login, milik sendiri, filter, update sebagian", async () => {
    assert.equal((await fetch(`${base}/api/notes`)).status, 401);
    assert.equal((await post("/api/notes", { title: "Tamu" })).status, 401);

    const sari = cookieOf(await post("/api/auth/login", { email: "sari@mail.id", password: "rahasia123" }));
    assert.deepEqual(await (await fetch(`${base}/api/notes`, { headers: { cookie: sari } })).json(), [], "catatan admin tidak terlihat");
    assert.equal((await post("/api/notes", { title: "" }, sari)).status, 422);
    const created = await post("/api/notes", { title: "Belanja 100%", body: "Beras dan telur" }, sari);
    assert.equal(created.status, 201);
    const note = (await created.json()) as { id: number; userId: number; body: string };
    assert.equal(note.body, "Beras dan telur");

    const list = (q: string) => fetch(`${base}/api/notes?q=${encodeURIComponent(q)}`, { headers: { cookie: sari } }).then((r) => r.json());
    assert.equal(((await list("telur")) as unknown[]).length, 1, "cari di isi");
    assert.equal(((await list("%")) as unknown[]).length, 1, "wildcard di-escape");
    assert.equal(((await list("_x")) as unknown[]).length, 0);

    const put = await fetch(`${base}/api/notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie: sari },
      body: JSON.stringify({ title: "Belanja mingguan" }),
    });
    const updated = (await put.json()) as { title: string; body: string };
    assert.deepEqual([updated.title, updated.body], ["Belanja mingguan", "Beras dan telur"], "update sebagian tidak mereset field lain");

    // Catatan orang lain: 404 (bukan 403), agar keberadaannya tidak bocor.
    const admin = cookieOf(await post("/api/auth/login", { email: "admin@zentara.test", password: "admin12345" }));
    assert.equal((await fetch(`${base}/api/notes/${note.id}`, { headers: { cookie: admin } })).status, 404);
    assert.equal((await fetch(`${base}/api/notes/${note.id}`, { method: "DELETE", headers: { cookie: admin } })).status, 404);
    assert.equal(((await (await fetch(`${base}/api/notes`, { headers: { cookie: admin } })).json()) as unknown[]).length, 2, "catatan contoh dari seed");

    assert.equal((await fetch(`${base}/api/notes/${note.id}`, { method: "DELETE", headers: { cookie: sari } })).status, 204);
    assert.equal((await fetch(`${base}/api/notes/${note.id}`, { headers: { cookie: sari } })).status, 404);
    assert.equal((await fetch(`${base}/api/notes/abc`, { headers: { cookie: sari } })).status, 404);
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
    assert.match(dashHtml, /Selamat datang di aplikasi Anda/);
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
    assert.doesNotMatch(await (await page("/dashboard", budi)).text(), /\/admin\/users/);
    assert.equal((await page("/admin/users", budi)).status, 403);
    assert.equal((await page("/admin", budi)).status, 403);
  });

  it("halaman catatan: tulis, cari, ubah, hapus", async () => {
    const budi = cookieOf(await form("/login", { email: "budi@mail.id", password: "rahasia123" }));
    const bad = await form("/notes", { title: " ", body: "isi" }, budi);
    assert.equal(bad.status, 422);
    const badHtml = await bad.text();
    assert.match(badHtml, /Judul wajib diisi/);
    assert.match(badHtml, /<textarea class="zu-input zu-textarea" id="f-body" name="body" rows="5"[^>]*>isi<\/textarea>/, "isi diisi ulang");
    assert.match(badHtml, /<details class="zu-disclosure" open>/);

    const created = await form("/notes", { title: "Rapat <tim>", body: "Bahas rilis" }, budi);
    assert.equal(created.headers.get("location"), "/notes");
    const listRes = await page("/notes", cookieOf(created));
    const list = await listRes.text();
    assert.match(list, /class="zu-toast success" role="status"[^>]*><span>Catatan disimpan\./);
    assert.doesNotMatch(await (await page("/notes", cookieOf(listRes))).text(), /Catatan disimpan/, "pesan flash hanya tampil sekali");
    assert.match(list, /Rapat &lt;tim&gt;/);
    assert.match(list, /aria-current="page">Catatan/);
    const id = /href="\/notes\/(\d+)">Rapat/.exec(list)![1];
    assert.match(await (await page("/notes?q=rilis", budi)).text(), /1 hasil untuk/);
    assert.match(await (await page("/notes?q=tidak-ada", budi)).text(), /Tidak ada catatan yang cocok/);

    assert.equal((await form(`/notes/${id}`, { title: "Rapat tim", body: "Bahas rilis 1.0" }, budi)).status, 303);
    assert.match(await (await page(`/notes/${id}`, budi)).text(), /Bahas rilis 1\.0<\/textarea>/);

    // Admin pun tidak bisa membuka catatan milik orang lain.
    const admin = cookieOf(await form("/login", { email: "admin@zentara.test", password: "admin12345" }));
    assert.equal((await page(`/notes/${id}`, admin)).status, 404);
    assert.equal((await form(`/notes/${id}/delete`, {}, admin)).status, 404);

    assert.equal((await form(`/notes/${id}/delete`, {}, budi)).headers.get("location"), "/notes");
    assert.equal((await page(`/notes/${id}`, budi)).status, 404);
    assert.equal((await page("/notes/abc", budi)).status, 404);
    assert.equal((await page("/admin", admin)).headers.get("location"), "/admin/users");
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
