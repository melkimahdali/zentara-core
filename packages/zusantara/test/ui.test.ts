import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { z } from "zod";
import { h, login, requireAuth, session, tryParse, withMiddleware, type ZenContext } from "../src/core/index.js";
import { Alert, AppShell, AuthCard, Button, Disclosure, Field, page, PostButton, rupiah, Search, Stat, StatGroup, Table } from "../src/ui/index.js";
import { startServer } from "./helpers.js";

describe("kit UI (zusantara/ui)", () => {
  it("page: dokumen lengkap dengan stylesheet bawaan; teks di-escape", () => {
    const html = page({ title: "Masuk <x>" }, h("p", null, "<script>alert(1)</script>"));
    assert.match(html, /^<!doctype html><html lang="id">/);
    assert.match(html, /<link rel="stylesheet" href="\/_zusantara\/ui\.css\?v=\d+\.\d+\.\d+/);
    assert.match(html, /<title>Masuk &lt;x&gt;<\/title>/);
    assert.ok(!html.includes("<script>alert(1)"));
    assert.match(html, /<body class="zu">/);
    assert.match(html, /<a class="zu-skip" href="#konten">Lewati ke konten<\/a>/);
    assert.match(html, /<link rel="preload" href="\/_zusantara\/fonts\/plus-jakarta-sans-latin\.woff2" as="font" type="font\/woff2" crossorigin="anonymous">/);
    assert.match(html, /<script>document\.addEventListener\("submit"/);
    assert.ok(!page({ title: "t", script: false }).includes("<script>"));
  });

  it("Button loading, Search, Disclosure, StatGroup", () => {
    const html = page(
      { title: "t" },
      h(Button, { loading: "Menyimpan…" }, "Simpan"),
      h(Search, { action: "/produk", value: '"kopi"' }),
      h(Disclosure, { summary: "Tambah produk", open: true }, h("p", null, "isi")),
      h(StatGroup, null, h(Stat, { label: "Produk", value: 3, hint: "jenis" })),
    );
    assert.match(html, /<button class="zu-btn primary" type="submit" data-loading="Menyimpan…">Simpan<\/button>/);
    assert.match(html, /<form class="zu-search" method="get" action="\/produk" role="search">/);
    assert.match(html, /value="&quot;kopi&quot;"/);
    assert.match(html, /<a class="zu-link" href="\/produk">Hapus<\/a>/);
    assert.match(html, /<details class="zu-disclosure" open><summary>Tambah produk<\/summary>/);
    assert.match(html, /<section class="zu-stats" aria-label="Ringkasan"><div class="zu-stat"><span>Produk<\/span><b>3<\/b><small>jenis<\/small><\/div><\/section>/);
    assert.ok(!page({ title: "t" }, h(Search, { action: "/produk" })).includes("Hapus"));
  });

  it("Field: label, error, aria; password tidak pernah diisi ulang", () => {
    const html = page({ title: "t" }, h(Field, { name: "email", label: "Email", type: "email", value: 'a"b@x.id', error: "Email tidak valid" }), h(Field, { name: "password", label: "Password", type: "password", value: "rahasia" }));
    assert.match(html, /<label for="f-email">Email<\/label>/);
    assert.match(html, /value="a&quot;b@x.id"/);
    assert.match(html, /aria-invalid="true" aria-describedby="f-email-error"/);
    assert.match(html, /<span class="zu-error" id="f-email-error">Email tidak valid<\/span>/);
    assert.ok(!html.includes("rahasia"));
  });

  it("AppShell menandai menu aktif dan menyediakan tombol keluar (POST)", () => {
    const html = page(
      { title: "Dasbor" },
      h(AppShell, { appName: "Studio Senja", title: "Dasbor", active: "/dashboard", user: { name: "Sari Dewi", email: "sari@x.id" }, nav: [{ href: "/dashboard", label: "Dasbor" }, { href: "/admin", label: "Admin", section: "Kelola" }] }, h(Alert, { tone: "success" }, "Tersimpan")),
    );
    assert.match(html, /<a href="\/dashboard" aria-current="page">Dasbor<\/a>/);
    assert.match(html, /<a href="\/admin">Admin<\/a>/);
    assert.match(html, /<form method="post" action="\/logout">/);
    assert.match(html, /Studio <b>Senja<\/b>/);
    assert.match(html, /aria-hidden="true">SD<\/span>/);
  });

  it("Table kosong menampilkan EmptyState; PostButton dengan konfirmasi aman", () => {
    assert.match(page({ title: "t" }, h(Table, { columns: [{ label: "Nama" }], rows: [] })), /Belum ada data/);
    const html = page({ title: "t" }, h(PostButton, { action: "/x/1/delete", confirm: `Hapus "a" </button>?` }, "Hapus"));
    assert.match(html, /onclick="return confirm\(&quot;Hapus \\&quot;a\\&quot; &lt;\/button&gt;\?&quot;\)"/);
    assert.equal(rupiah(45000), "Rp45.000");
    const auth = page({ title: "t" }, h(AuthCard, { title: "Masuk", aside: { title: "Semua pekerjaan tim Anda", text: "Satu tempat." } }, h(Button, { block: true }, "Masuk")));
    assert.match(auth, /zu-btn primary block/);
    assert.match(auth, /Semua pekerjaan tim Anda/);
  });
});

describe("aset bawaan /_zusantara", () => {
  let base: string;
  let close: () => Promise<void>;
  before(async () => ({ base, close } = await startServer()));
  after(() => close());

  it("ui.css, logo, favicon tersedia dengan tipe & cache yang benar", async () => {
    const css = await fetch(`${base}/_zusantara/ui.css`);
    assert.equal(css.status, 200);
    assert.match(css.headers.get("content-type")!, /text\/css/);
    assert.match(css.headers.get("cache-control")!, /max-age/);
    assert.match(await css.text(), /--zu-accent/);
    const logo = await fetch(`${base}/_zusantara/logo.webp`);
    assert.equal(logo.headers.get("content-type"), "image/webp");
    assert.equal((await logo.arrayBuffer()).byteLength > 1000, true);
    assert.equal((await fetch(`${base}/_zusantara/favicon.png`)).headers.get("content-type"), "image/png");
    const font = await fetch(`${base}/_zusantara/fonts/plus-jakarta-sans-latin.woff2`);
    assert.equal(font.headers.get("content-type"), "font/woff2");
    assert.equal(Buffer.from(await font.arrayBuffer()).subarray(0, 4).toString(), "wOF2");
    assert.equal((await fetch(`${base}/_zusantara/fonts/plus-jakarta-sans-latin-ext.woff2`)).status, 200);
    assert.match(await (await fetch(`${base}/_zusantara/fonts/LICENSE.txt`)).text(), /SIL OPEN FONT LICENSE/i);
    assert.equal((await fetch(`${base}/_zusantara/tidak-ada`)).status, 404);
    assert.equal((await fetch(`${base}/_zusantara/ui.css`, { method: "POST" })).status, 404);
  });
});

describe("tryParse & requireAuth({ redirectTo })", () => {
  it("tryParse mengembalikan pesan pertama per field tanpa melempar", async () => {
    const Schema = z.object({ email: z.email("Email tidak valid"), age: z.coerce.number().min(18, "Minimal 18") });
    const bad = await tryParse(Schema, { email: "x", age: "3" });
    assert.deepEqual(bad, { ok: false, errors: { email: "Email tidak valid", age: "Minimal 18" } });
    const good = await tryParse(Schema, { email: "a@b.id", age: "20" });
    assert.deepEqual(good, { ok: true, data: { email: "a@b.id", age: 20 } });
  });

  it("halaman terlindungi mengarahkan ke login dengan ?next, role salah tetap 403", async () => {
    const users = new Map([[1, { id: 1, role: "user" }]]);
    const loadUser = (id: string | number) => users.get(Number(id));
    const routes: Record<string, (ctx: ZenContext) => unknown> = {
      "/masuk": (ctx) => (login(ctx, users.get(1)!), "ok"),
      "/dasbor": withMiddleware([requireAuth({ loadUser, redirectTo: "/login" })], () => "dasbor"),
      "/admin": withMiddleware([requireAuth({ loadUser, roles: ["admin"], redirectTo: "/login" })], () => "admin"),
    };
    const { base, close } = await startServer({
      middleware: [session({ secret: "k".repeat(32) }), (ctx, next) => (routes[ctx.path] ? routes[ctx.path]!(ctx) : next())],
    });
    try {
      const anon = await fetch(`${base}/dasbor?tab=1`, { redirect: "manual" });
      assert.equal(anon.status, 303);
      assert.equal(anon.headers.get("location"), "/login?next=%2Fdasbor%3Ftab%3D1");
      const cookie = (await fetch(`${base}/masuk`)).headers.getSetCookie()[0]!.split(";")[0]!;
      assert.equal(await (await fetch(`${base}/dasbor`, { headers: { cookie } })).text(), "dasbor");
      assert.equal((await fetch(`${base}/admin`, { headers: { cookie }, redirect: "manual" })).status, 403);
    } finally {
      await close();
    }
  });
});
