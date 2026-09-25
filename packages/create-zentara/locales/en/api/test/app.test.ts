import assert from "node:assert/strict";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { ZenRuntime } from "zentara";

// Tests for the example app (src/app) with an in-memory SQLite database.
process.env.DATABASE_URL = ":memory:";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

describe("example app: auth + notes", () => {
  let base: string;
  let runtime: ZenRuntime;

  before(async () => {
    const { db } = await import("../src/app/db/index.js");
    const { migrateDatabase } = await import("zentara/db");
    await migrateDatabase(db, path.join(ROOT, "drizzle"));
    const seed = (await import("../src/app/db/seed.js")).default;
    await seed(db);
    runtime = new ZenRuntime({ port: 0, host: "127.0.0.1", logLevel: "silent", publicDir: false, locale: "en" });
    const { port } = await runtime.start();
    base = `http://127.0.0.1:${port}`;
  });
  after(() => runtime.stop());

  const post = (url: string, body: unknown, cookie = "") =>
    fetch(`${base}${url}`, { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify(body) });
  const cookieOf = (res: Response) => res.headers.getSetCookie()[0]?.split(";")[0] ?? "";

  it("register -> me -> logout", async () => {
    const reg = await post("/api/auth/register", { name: "Sarah", email: "SARAH@mail.test", password: "secret123" });
    assert.equal(reg.status, 201);
    const body = (await reg.json()) as { user: Record<string, unknown> };
    assert.equal(body.user.email, "sarah@mail.test");
    assert.equal("passwordHash" in body.user, false, "the password hash does not leak");
    const cookie = cookieOf(reg);
    assert.equal((await fetch(`${base}/api/auth/me`, { headers: { cookie } })).status, 200);
    assert.equal((await post("/api/auth/register", { name: "Sarah", email: "sarah@mail.test", password: "secret123" })).status, 409);
    const out = await post("/api/auth/logout", {}, cookie);
    assert.equal(out.status, 204);
  });

  it("notes API: sign-in required, own notes only, filters, partial updates", async () => {
    assert.equal((await fetch(`${base}/api/notes`)).status, 401);
    assert.equal((await post("/api/notes", { title: "Guest" })).status, 401);

    const sari = cookieOf(await post("/api/auth/login", { email: "sarah@mail.test", password: "secret123" }));
    assert.deepEqual(await (await fetch(`${base}/api/notes`, { headers: { cookie: sari } })).json(), [], "the admin's notes are not visible");
    assert.equal((await post("/api/notes", { title: "" }, sari)).status, 422);
    const created = await post("/api/notes", { title: "Groceries 100%", body: "Rice and eggs" }, sari);
    assert.equal(created.status, 201);
    const note = (await created.json()) as { id: number; userId: number; body: string };
    assert.equal(note.body, "Rice and eggs");

    const list = (q: string) => fetch(`${base}/api/notes?q=${encodeURIComponent(q)}`, { headers: { cookie: sari } }).then((r) => r.json());
    assert.equal(((await list("eggs")) as unknown[]).length, 1, "searches the body");
    assert.equal(((await list("%")) as unknown[]).length, 1, "wildcards are escaped");
    assert.equal(((await list("_x")) as unknown[]).length, 0);

    const put = await fetch(`${base}/api/notes/${note.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", cookie: sari },
      body: JSON.stringify({ title: "Weekly groceries" }),
    });
    const updated = (await put.json()) as { title: string; body: string };
    assert.deepEqual([updated.title, updated.body], ["Weekly groceries", "Rice and eggs"], "a partial update keeps the other fields");

    // Other people's notes: 404 (not 403), so their existence does not leak.
    const admin = cookieOf(await post("/api/auth/login", { email: "admin@zentara.test", password: "admin12345" }));
    assert.equal((await fetch(`${base}/api/notes/${note.id}`, { headers: { cookie: admin } })).status, 404);
    assert.equal((await fetch(`${base}/api/notes/${note.id}`, { method: "DELETE", headers: { cookie: admin } })).status, 404);
    assert.equal(((await (await fetch(`${base}/api/notes`, { headers: { cookie: admin } })).json()) as unknown[]).length, 2, "example notes from the seed");

    assert.equal((await fetch(`${base}/api/notes/${note.id}`, { method: "DELETE", headers: { cookie: sari } })).status, 204);
    assert.equal((await fetch(`${base}/api/notes/${note.id}`, { headers: { cookie: sari } })).status, 404);
    assert.equal((await fetch(`${base}/api/notes/abc`, { headers: { cookie: sari } })).status, 404);
  });

  // HTML forms (like a browser: application/x-www-form-urlencoded, redirects not followed).
  const form = (url: string, fields: Record<string, string>, cookie = "") =>
    fetch(`${base}${url}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", cookie },
      body: new URLSearchParams(fields).toString(),
      redirect: "manual",
    });
  const page = (url: string, cookie = "") => fetch(`${base}${url}`, { headers: { cookie }, redirect: "manual" });

  it("pages: sign in, dashboard, and back to the original page", async () => {
    const loginPage = await page("/login");
    assert.equal(loginPage.status, 200);
    assert.match(await loginPage.text(), /<form class="zu-form" method="post" action="\/login">/);
    assert.equal((await page("/_zentara/ui.css")).status, 200);

    const guest = await page("/dashboard");
    assert.equal(guest.status, 303);
    assert.equal(guest.headers.get("location"), "/login?next=%2Fdashboard");

    const wrong = await form("/login", { email: "admin@zentara.test", password: "wrong" });
    assert.equal(wrong.status, 401);
    const wrongHtml = await wrong.text();
    assert.match(wrongHtml, /Wrong email or password/);
    assert.match(wrongHtml, /value="admin@zentara.test"/, "the email is kept");

    const empty = await form("/login", { email: "", password: "" });
    assert.equal(empty.status, 422);
    assert.match(await empty.text(), /Email is required/);

    const ok = await form("/login", { email: "Admin@Zentara.test", password: "admin12345", next: "/admin/users" });
    assert.equal(ok.status, 303);
    assert.equal(ok.headers.get("location"), "/admin/users");
    const cookie = cookieOf(ok);
    const dash = await page("/dashboard", cookie);
    assert.equal(dash.status, 200);
    const dashHtml = await dash.text();
    assert.match(dashHtml, /Hi, Admin/);
    assert.match(dashHtml, /Welcome to your app/);
    assert.match(dashHtml, /aria-current="page">Dashboard/);

    // Only local paths may be the destination after signing in.
    for (const next of ["https://evil.test", "//evil.test", "/\\evil.test"]) {
      const res = await form("/login", { email: "admin@zentara.test", password: "admin12345", next });
      assert.equal(res.headers.get("location"), "/dashboard", next);
    }
    assert.equal((await page("/login", cookie)).headers.get("location"), "/dashboard", "already signed in -> dashboard");

    const out = await form("/logout", {}, cookie);
    assert.equal(out.status, 303);
    assert.equal(out.headers.get("location"), "/login");
  });

  it("pages: registration, validation, and admin-only access", async () => {
    const invalid = await form("/register", { name: "B", email: "not-an-email", password: "123" });
    assert.equal(invalid.status, 422);
    const html = await invalid.text();
    assert.match(html, /Name must be at least 2 characters/);
    assert.match(html, /Password must be at least 8 characters/);
    assert.match(html, /value="not-an-email"/);
    assert.ok(!html.includes('value="123"'), "the password is never refilled");

    const reg = await form("/register", { name: "Ben Carter", email: "ben@mail.test", password: "secret123" });
    assert.equal(reg.status, 303);
    const budi = cookieOf(reg);
    assert.match(await (await page("/dashboard", budi)).text(), /Hi, Ben/);
    assert.equal((await form("/register", { name: "Ben", email: "ben@mail.test", password: "secret123" })).status, 409);

    // Regular users: no Manage menu and no access to admin pages.
    assert.doesNotMatch(await (await page("/dashboard", budi)).text(), /\/admin\/users/);
    assert.equal((await page("/admin/users", budi)).status, 403);
    assert.equal((await page("/admin", budi)).status, 403);
  });

  it("notes pages: write, search, edit, delete", async () => {
    const budi = cookieOf(await form("/login", { email: "ben@mail.test", password: "secret123" }));
    const bad = await form("/notes", { title: " ", body: "text" }, budi);
    assert.equal(bad.status, 422);
    const badHtml = await bad.text();
    assert.match(badHtml, /Title is required/);
    assert.match(badHtml, /<textarea class="zu-input zu-textarea" id="f-body" name="body" rows="5"[^>]*>text<\/textarea>/, "the body is kept");
    assert.match(badHtml, /<details class="zu-disclosure" open>/);

    const created = await form("/notes", { title: "Team <sync>", body: "Discuss the release" }, budi);
    assert.equal(created.headers.get("location"), "/notes?msg=created");
    const list = await (await page("/notes?msg=created", budi)).text();
    assert.match(list, /Note saved/);
    assert.match(list, /Team &lt;sync&gt;/);
    assert.match(list, /aria-current="page">Notes/);
    const id = /href="\/notes\/(\d+)">Team/.exec(list)![1];
    assert.match(await (await page("/notes?q=release", budi)).text(), /Found 1 for/);
    assert.match(await (await page("/notes?q=nothing-here", budi)).text(), /No notes match/);

    assert.equal((await form(`/notes/${id}`, { title: "Team sync", body: "Discuss the 1.0 release" }, budi)).status, 303);
    assert.match(await (await page(`/notes/${id}`, budi)).text(), /Discuss the 1\.0 release<\/textarea>/);

    // Even admins cannot open other people's notes.
    const admin = cookieOf(await form("/login", { email: "admin@zentara.test", password: "admin12345" }));
    assert.equal((await page(`/notes/${id}`, admin)).status, 404);
    assert.equal((await form(`/notes/${id}/delete`, {}, admin)).status, 404);

    assert.equal((await form(`/notes/${id}/delete`, {}, budi)).headers.get("location"), "/notes?msg=deleted");
    assert.equal((await page(`/notes/${id}`, budi)).status, 404);
    assert.equal((await page("/notes/abc", budi)).status, 404);
    assert.equal((await page("/admin", admin)).headers.get("location"), "/admin/users");
    assert.match(await (await page("/admin/users", admin)).text(), /ben@mail\.test/);
  });

  it("wrong sign-in -> the same 401; brute force -> 429", async () => {
    const wrong = await post("/api/auth/login", { email: "admin@zentara.test", password: "wrong" });
    const unknown = await post("/api/auth/login", { email: "who@mail.test", password: "wrong" });
    assert.equal(wrong.status, 401);
    assert.equal(await wrong.text(), await unknown.text());
    let last = 0;
    for (let i = 0; i < 10; i++) last = (await post("/api/auth/login", { email: "x@y.test", password: "wrong" })).status;
    assert.equal(last, 429);
  });
});
