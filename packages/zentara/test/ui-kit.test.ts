import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, afterEach, describe, it } from "node:test";
import { agentTools } from "../src/ai/tools.js";
import { SYSTEM_PROMPT } from "../src/ai/prompt.js";
import { run } from "../src/cli.js";
import { editConfigUi, writeConfigUi } from "../src/core/config-edit.js";
import { resolveConfig } from "../src/core/config.js";
import { session } from "../src/core/session.js";
import { h, renderToString, type Child } from "../src/core/view.js";
import { setLocale } from "../src/i18n/index.js";
import { catalogDetail, catalogForAi, findCatalogEntry, similarEntries, UI_CATALOG } from "../src/ui/catalog.js";
import { GALLERY_DEMOS, WHOLE_PAGE } from "../src/ui/gallery.js";
import * as ui from "../src/ui/index.js";
import {
  Checkbox,
  CheckboxGroup,
  Cluster,
  Columns,
  Container,
  Divider,
  Field,
  Fieldset,
  FileInput,
  Form,
  page,
  PageHeader,
  RadioGroup,
  Row,
  Section,
  Select,
  Stack,
  Switch,
} from "../src/ui/index.js";
import { accentPalette, ACCENT_PRESETS, contrast, resolveUiTheme, setUiTheme, themeCss } from "../src/ui/theme.js";
import { FIXTURES, startServer } from "./helpers.js";
// @ts-expect-error skrip .mjs tanpa deklarasi tipe
import { generateCatalog, OUTPUT } from "../scripts/ui-catalog.mjs";

const html = (node: Child) => renderToString(node);
const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16)) as [number, number, number];

describe("kit UI 12b: tata letak", () => {
  it("Container, Stack, Row, Cluster, Columns memakai kelas bernilai terbatas", () => {
    assert.equal(html(h(Container, null, "x")), '<div class="zu-container">x</div>');
    assert.equal(html(h(Container, { size: "sm", pad: true }, "x")), '<div class="zu-container sm pad">x</div>');
    assert.equal(html(h(Stack, { gap: "lg", align: "start" }, "x")), '<div class="zu-stack zu-gap-lg zu-align-start">x</div>');
    assert.equal(html(h(Row, { justify: "between", wrap: false }, "x")), '<div class="zu-row zu-gap-md zu-justify-between nowrap">x</div>');
    assert.equal(html(h(Cluster, null, "x")), '<div class="zu-row zu-gap-sm">x</div>');
    assert.equal(html(h(Columns, { cols: 3 }, "x")), '<div class="zu-cols c3">x</div>');
  });

  it("Section, Divider, PageHeader (breadcrumb dengan halaman saat ini, teks di-escape)", () => {
    assert.match(html(h(Section, { title: "Pesanan", description: "Terbaru", id: "p" }, "isi")), /^<section class="zu-section" id="p"><div class="zu-section-head"><div><h2>Pesanan<\/h2><p>Terbaru<\/p><\/div><\/div>isi<\/section>$/);
    assert.equal(html(h(Section, null, "isi")), '<section class="zu-section">isi</section>');
    assert.equal(html(h(Divider, null)), '<hr class="zu-divider">');
    assert.equal(html(h(Divider, { label: "atau" })), '<div class="zu-divider-label" role="separator">atau</div>');
    const head = html(h(PageHeader, { title: "Produk <b>", breadcrumb: [{ label: "Beranda", href: "/" }, { label: "Produk", href: "/produk" }], actions: h("a", { href: "/baru" }, "Tambah") }));
    assert.match(head, /<nav class="zu-crumbs" aria-label="Lokasi halaman"><ol><li><a href="\/">Beranda<\/a><\/li><li><span aria-current="page">Produk<\/span><\/li><\/ol><\/nav>/);
    assert.match(head, /<h1>Produk &lt;b&gt;<\/h1>/);
    assert.match(head, /<a href="\/baru">Tambah<\/a><\/header>$/);
  });
});

describe("kit UI 12b: formulir", () => {
  afterEach(() => setLocale("id"));

  it("Field: awalan/akhiran, tombol tampilkan password (tersembunyi tanpa JS), tipe baru", () => {
    const price = html(h(Field, { name: "harga", label: "Harga", type: "number", prefix: "Rp", suffix: "/kg", value: 45000, error: "Wajib" }));
    assert.match(price, /<div class="zu-affix invalid"><span aria-hidden="true">Rp<\/span><input class="zu-input" id="f-harga" name="harga" type="number" value="45000" aria-invalid="true" aria-describedby="f-harga-error"><span aria-hidden="true">\/kg<\/span><\/div>/);
    const pw = html(h(Field, { name: "password", label: "Kata sandi", type: "password", value: "rahasia" }));
    assert.ok(!pw.includes("rahasia"));
    assert.match(pw, /<button class="zu-reveal" type="button" hidden data-zu-reveal="f-password" data-show="Tampilkan" data-hide="Sembunyikan" aria-pressed="false" aria-label="Tampilkan kata sandi">Tampilkan<\/button>/);
    assert.ok(!html(h(Field, { name: "p", label: "P", type: "password", reveal: false })).includes("zu-reveal"));
    assert.match(html(h(Field, { name: "c", label: "Warna", type: "color", value: "#097e6b" })), /class="zu-input zu-color" id="f-c" name="c" type="color" value="#097e6b"/);
    assert.match(html(h(Field, { name: "r", label: "Jumlah", type: "range", min: 0, max: 10 })), /class="zu-input zu-range" id="f-r" name="r" type="range" min="0" max="10"/);
    for (const type of ["time", "datetime-local", "month"] as const) assert.match(html(h(Field, { name: "t", label: "T", type })), new RegExp(`type="${type}"`));
  });

  it("Select: pilihan, kelompok, placeholder, nilai terpilih, multiple", () => {
    const s = html(h(Select, { name: "kategori", label: "Kategori", placeholder: "Pilih", value: "teh", options: [{ group: "Minuman", options: [{ value: "kopi", label: "Kopi" }, { value: "teh", label: "Teh <x>" }] }, "Kue"], hint: "Satu saja" }));
    assert.match(s, /<select class="zu-input zu-select" id="f-kategori" name="kategori" aria-describedby="f-kategori-hint"><option value="">Pilih<\/option><optgroup label="Minuman"><option value="kopi">Kopi<\/option><option value="teh" selected>Teh &lt;x&gt;<\/option><\/optgroup><option value="Kue">Kue<\/option><\/select><small id="f-kategori-hint">Satu saja<\/small>/);
    assert.match(html(h(Select, { name: "k", label: "K", placeholder: "", options: ["a"] })), /<option value="" selected>Pilih…<\/option>/);
    const multi = html(h(Select, { name: "tag", label: "Tag", multiple: true, placeholder: "x", value: ["a", 2], options: ["a", "b", { value: "2", label: "Dua" }] }));
    assert.ok(!multi.includes('value=""'));
    assert.match(multi, /multiple>.*<option value="a" selected>a<\/option><option value="b">b<\/option><option value="2" selected>Dua<\/option>/);
  });

  it("Checkbox, CheckboxGroup, RadioGroup, Switch: label yang bisa diklik, fieldset dengan legend", () => {
    assert.match(html(h(Checkbox, { name: "ingat", label: "Ingat saya", checked: true })), /<label class="zu-check"><input type="checkbox" id="f-ingat" name="ingat" value="1" checked><span>Ingat saya<\/span><\/label>/);
    const group = html(h(CheckboxGroup, { name: "hari", label: "Hari", inline: true, options: ["Senin", { value: "sel", label: "Selasa", disabled: true }], values: ["Senin"], error: "Pilih satu" }));
    assert.match(group, /^<fieldset class="zu-fieldset" id="f-hari" aria-describedby="f-hari-error"><legend>Hari<\/legend><div class="zu-choices inline">/);
    assert.match(group, /<input type="checkbox" id="f-hari-0" name="hari" value="Senin" checked>/);
    assert.match(group, /<label class="zu-check disabled"><input type="checkbox" id="f-hari-1" name="hari" value="sel" disabled>/);
    assert.match(group, /<span class="zu-error" id="f-hari-error">Pilih satu<\/span><\/fieldset>$/);
    const radio = html(h(RadioGroup, { name: "kirim", label: "Kirim", value: "kurir", required: true, options: [{ value: "ambil", label: "Ambil" }, { value: "kurir", label: "Kurir", hint: "Rp10.000" }] }));
    assert.match(radio, /<input type="radio" id="f-kirim-1" name="kirim" value="kurir" checked required><span>Kurir<small>Rp10.000<\/small><\/span>/);
    assert.match(html(h(Switch, { name: "notif", label: "Notifikasi", checked: true })), /<input type="checkbox" role="switch" id="f-notif" name="notif" value="1" checked><span class="zu-switch-track" aria-hidden="true"><\/span>/);
  });

  it("FileInput mengikuti opsi saveUpload: accept, petunjuk otomatis (id/en), pratinjau", () => {
    const f = html(h(FileInput, { name: "foto", label: "Foto", types: ["image/*"], maxBytes: "5mb", preview: "/uploads/a.png" }));
    assert.match(f, /<img class="zu-file-preview" id="f-foto-preview" src="\/uploads\/a.png" alt="Pratinjau file">/);
    assert.match(f, /accept="image\/\*"/);
    assert.match(f, /data-zu-preview="f-foto-preview"/);
    assert.match(f, /<small id="f-foto-hint">Gambar, maks\. 5 MB<\/small>/);
    assert.match(html(h(FileInput, { name: "cv", label: "CV", types: ["application/pdf"], maxBytes: 2 * 1024 * 1024 })), /<small id="f-cv-hint">PDF, maks\. 2 MB<\/small>/);
    // Tanpa gambar tersimpan: pratinjau disembunyikan tanpa src (tidak dianggap gambar rusak).
    assert.match(html(h(FileInput, { name: "a", label: "A", types: ["image/png"] })), /<img class="zu-file-preview" id="f-a-preview" alt="Pratinjau file" hidden>/);
    assert.ok(!html(h(FileInput, { name: "d", label: "D", types: ["application/pdf"] })).includes("<img"));
    setLocale("en");
    assert.match(html(h(FileInput, { name: "foto", label: "Photo", types: ["image/png", "image/jpeg"], maxBytes: "5mb" })), /PNG, JPEG, max\. 5 MB/);
  });

  it("Form upload dan Fieldset", () => {
    assert.equal(html(h(Form, { action: "/p", upload: true }, "x")), '<form class="zu-form" method="post" action="/p" enctype="multipart/form-data">x</form>');
    assert.equal(html(h(Fieldset, { legend: "Alamat", box: true }, "x")), '<fieldset class="zu-fieldset box"><legend>Alamat</legend>x</fieldset>');
  });

  it("teks bawaan Bahasa Inggris", () => {
    setLocale("en");
    assert.match(html(h(Field, { name: "p", label: "Password", type: "password" })), /data-show="Show" data-hide="Hide"[^>]*aria-label="Show password">Show</);
    assert.match(html(h(Select, { name: "k", label: "K", placeholder: "", options: [] })), /Choose…/);
    assert.match(html(h(PageHeader, { title: "T", breadcrumb: [{ label: "Home" }] })), /aria-label="Breadcrumb"/);
  });
});

describe("tema kit UI", () => {
  afterEach(() => setUiTheme());

  it("preset, nama Indonesia, dan hex; nilai salah menyebut pilihannya", () => {
    assert.deepEqual(resolveUiTheme(undefined), { accent: "teal", radius: "md", font: "jakarta", mode: "auto" });
    assert.equal(resolveUiTheme({ accent: "Biru" }).accent, "blue");
    assert.equal(resolveUiTheme({ accent: "merah muda" }).accent, "pink");
    assert.equal(resolveUiTheme({ accent: "#FC0" }).accent, "#ffcc00");
    assert.deepEqual(resolveUiTheme({ radius: "LG", font: "system", mode: "dark" }), { accent: "teal", radius: "lg", font: "system", mode: "dark" });
    assert.throws(() => resolveUiTheme({ accent: "pelangi" }), /ui\.accent.*pelangi.*teal, blue/);
    assert.throws(() => resolveUiTheme({ radius: "xl" }), /ui\.radius.*none, sm, md, lg/);
    assert.throws(() => resolveUiTheme("blue"), /harus berupa objek/);
    assert.throws(() => resolveConfig({ ui: { mode: "sepia" as "dark" } }), /ui\.mode/);
  });

  it("setiap warna aksen memenuhi kontras WCAG AA di mode terang dan gelap", () => {
    for (const accent of [...Object.keys(ACCENT_PRESETS), "#ffff00", "#000000", "#ffffff", "#123456"]) {
      const p = accentPalette(accent);
      assert.ok(contrast([255, 255, 255], hex(p.light.accent)) >= 4.5, `${accent} putih di atas aksen`);
      assert.ok(contrast(hex(p.light.accent), hex("#f3f5f3")) >= 4.5, `${accent} aksen di latar terang`);
      assert.ok(contrast(hex(p.dark.accent), hex("#0d1719")) >= 4.5, `${accent} aksen di latar gelap`);
    }
  });

  it("page() memuat theme.css hanya bila tema berbeda dari default; mode dan font ikut", () => {
    const plain = page({ title: "t" });
    assert.ok(!plain.includes("theme.css"));
    assert.ok(!plain.includes("data-zu-mode"));
    assert.match(plain, /plus-jakarta-sans-latin\.woff2/);
    const active = setUiTheme({ accent: "blue", radius: "lg", font: "system", mode: "dark" });
    const themed = page({ title: "t" });
    assert.match(themed, new RegExp(`<link rel="stylesheet" href="/_zentara/theme\\.css\\?v=${active.hash}">`));
    assert.match(themed, /<html lang="id" data-zu-mode="dark">/);
    assert.match(themed, /<meta name="color-scheme" content="dark">/);
    assert.ok(!themed.includes('content="#f3f5f3"'));
    assert.ok(!themed.includes("plus-jakarta-sans-latin.woff2"), "font lain: tidak perlu memuat Plus Jakarta Sans");
    assert.match(active.css, /--zu-accent:#[0-9a-f]{6}/);
    assert.match(active.css, /--zu-r-lg:22px/);
    assert.match(active.css, /--zu-font:ui-sans-serif/);
    assert.match(active.css, /:root\[data-zu-mode=dark\]\{--zu-accent:/);
    assert.equal(themeCss(resolveUiTheme({})), "");
  });

  it("runtime memasang tema dari config dan menyajikan /_zentara/theme.css", async () => {
    const srv = await startServer({ ui: { accent: "rose" } });
    try {
      const res = await fetch(`${srv.base}/_zentara/theme.css?v=x`);
      assert.equal(res.status, 200);
      assert.match(res.headers.get("content-type") ?? "", /text\/css/);
      assert.match(await res.text(), /--zu-accent:#/);
      assert.match(page({ title: "t" }), /theme\.css/);
    } finally {
      await srv.close();
    }
  });
});

describe("katalog komponen dan galeri", () => {
  it("catalog.gen.ts sama dengan hasil generator (jalankan node scripts/ui-catalog.mjs bila gagal)", () => {
    const file = path.join(import.meta.dirname, "..", OUTPUT);
    assert.equal(fs.readFileSync(file, "utf8"), generateCatalog());
  });

  it("setiap komponen yang diekspor zentara/ui ada di katalog, dengan teks id/en dan contoh", () => {
    const exported = Object.entries(ui)
      .filter(([name, v]) => typeof v === "function" && name !== "resolveUiTheme")
      .map(([name]) => name);
    const names = new Set(UI_CATALOG.map((e) => e.name));
    for (const name of exported) assert.ok(names.has(name), `${name} belum punya JSDoc @group/@en/@example`);
    for (const e of UI_CATALOG) assert.ok(e.id && e.en && e.example, e.name);
    const select = findCatalogEntry("select")!;
    assert.deepEqual(select.props.find((p) => p.name === "options"), { name: "options", type: "(Option | OptionGroup)[]", required: true });
    assert.equal(findCatalogEntry("Stack")!.props[0]!.type, '"none" | "xs" | "sm" | "md" | "lg" | "xl"');
  });

  it("setiap komponen katalog punya contoh hidup di galeri", () => {
    for (const e of UI_CATALOG) if (!WHOLE_PAGE.has(e.name)) assert.ok(GALLERY_DEMOS[e.name], `${e.name} belum ada di GALLERY_DEMOS`);
  });

  it("detail, saran nama, dan teks untuk AI", () => {
    const detail = catalogDetail(findCatalogEntry("Switch")!, "en");
    assert.match(detail, /^Switch · Forms\nOn\/off switch/);
    assert.match(detail, /name: string \(required\)/);
    assert.match(detail, /Example:\n {2}h\(Switch, /);
    assert.deepEqual(similarEntries("Selekt"), ["Select"]);
    assert.equal(catalogForAi({ component: "Nope" }), undefined);
    assert.match(catalogForAi({ group: "form" })!, /^form:\n- Form\(\{ action\?, method\?, upload\? \}\): POST form/);
    assert.match(SYSTEM_PROMPT, /- layout: Container\(\{ size\?, pad\? \}\), Stack\(/);
    assert.match(SYSTEM_PROMPT, /theme --accent blue, never CSS/);
  });

  it("tool ui_catalog", async () => {
    const tool = agentTools.find((x) => x.spec.name === "ui_catalog")!;
    const ctx = {} as Parameters<typeof tool.run>[1];
    assert.match(await tool.run({ component: "FileInput" }, ctx), /types\?: string\[\]/);
    assert.match(await tool.run({}, ctx), /^page:\n/);
    await assert.rejects(tool.run({ component: "Selekt" }, ctx), /Select/);
  });

  it("galeri /_zentara/ui hanya saat debug, berisi setiap komponen", async () => {
    const dev = await startServer({ debug: true });
    const prod = await startServer({ debug: false });
    try {
      const res = await fetch(`${dev.base}/_zentara/ui`);
      assert.equal(res.status, 200);
      const body = await res.text();
      for (const e of UI_CATALOG) assert.ok(body.includes(`<h2>${e.name}</h2>`), e.name);
      assert.equal((await fetch(`${prod.base}/_zentara/ui`)).status, 404);
    } finally {
      await dev.close();
      await prod.close();
    }
  });
});

describe("zentara theme dan zentara ui", () => {
  const dirs: string[] = [];
  const tmp = () => {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-theme-"));
    dirs.push(d);
    return d;
  };
  after(() => {
    for (const d of dirs) fs.rmSync(d, { recursive: true, force: true });
  });
  const cli = async (cwd: string, args: string[]) => {
    const out: string[] = [];
    const err: string[] = [];
    const code = await run(args, { cwd, out: (l) => out.push(l), err: (l) => err.push(l) });
    return { code, out: out.join("\n"), err: err.join("\n") };
  };

  it("editConfigUi: tambah, ganti satu baris, hapus; bentuk lain tidak diubah", () => {
    const base = "export default {\n  appName: \"A\",\n};\n";
    const added = editConfigUi(base, { accent: "blue" });
    assert.deepEqual(added, { ok: true, text: 'export default {\n  ui: { accent: "blue" },\n  appName: "A",\n};\n' });
    const replaced = editConfigUi(added.ok ? added.text : "", { accent: "rose", mode: "dark" });
    assert.ok(replaced.ok && replaced.text.includes('  ui: { accent: "rose", mode: "dark" },\n  appName'));
    const removed = editConfigUi(replaced.ok ? replaced.text : "", null);
    assert.deepEqual(removed, { ok: true, text: base });
    assert.deepEqual(editConfigUi("export default {\n  ui: {\n    accent: \"blue\",\n  },\n};\n", { accent: "red" }), { ok: false, reason: "multiline" });
    assert.deepEqual(editConfigUi("module.exports = {};\n", { accent: "red" }), { ok: false, reason: "noExport" });
    assert.ok(editConfigUi("export default defineConfig({\n});\n", { font: "serif" }).ok);
  });

  it("zentara theme menulis dan membaca tema di zentara.config.mjs", async () => {
    const dir = tmp();
    fs.writeFileSync(path.join(dir, "zentara.config.mjs"), "/** @type {import(\"zentara\").UserConfig} */\nexport default {\n  appName: \"A\",\n  locale: \"id\",\n};\n");
    const shown = await cli(dir, ["theme"]);
    assert.equal(shown.code, 0);
    assert.match(shown.out, /accent {2}teal \(bawaan\)/);
    const saved = await cli(dir, ["theme", "--accent", "biru", "--radius", "lg"]);
    assert.equal(saved.code, 0, saved.err);
    assert.match(saved.out, /Tema disimpan di zentara\.config\.mjs: accent blue · radius lg/);
    assert.match(fs.readFileSync(path.join(dir, "zentara.config.mjs"), "utf8"), /\n {2}ui: \{ accent: "blue", radius: "lg" \},\n {2}appName/);
    const bad = await cli(dir, ["theme", "--font", "comic"]);
    assert.equal(bad.code, 1);
    assert.match(bad.err, /ui\.font.*jakarta, system, serif, mono/);
    assert.equal((await cli(dir, ["theme", "--accent"])).code, 1);
    assert.equal((await cli(dir, ["theme", "--reset"])).code, 0);
    assert.ok(!fs.readFileSync(path.join(dir, "zentara.config.mjs"), "utf8").includes("ui:"));
  });

  it("writeConfigUi membuat config bila belum ada", () => {
    const dir = tmp();
    const r = writeConfigUi(dir, { accent: "green" });
    assert.ok(r.ok && r.created);
    assert.match(fs.readFileSync(path.join(dir, "zentara.config.mjs"), "utf8"), /export default \{\n {2}ui: \{ accent: "green" \},\n\};/);
  });

  it("zentara ui: daftar, detail, JSON, dan nama yang salah", async () => {
    const dir = tmp();
    const list = await cli(dir, ["ui"]);
    assert.equal(list.code, 0);
    assert.match(list.out, /Tata letak\n {2}Container +Pembungkus konten/);
    const detail = await cli(dir, ["ui", "select"]);
    assert.match(detail.out, /^Select · Formulir/);
    assert.match(detail.out, /options: \(Option \| OptionGroup\)\[\] \(wajib\)/);
    const json = await cli(dir, ["ui", "--group", "layout", "--json"]);
    assert.ok((JSON.parse(json.out) as { group: string }[]).every((e) => e.group === "layout"));
    const missing = await cli(dir, ["ui", "Selekt"]);
    assert.equal(missing.code, 1);
    assert.match(missing.err, /Mungkin maksud Anda: Select/);
    assert.equal((await cli(dir, ["ui", "--group", "x"])).code, 1);
  });
});

describe("kit UI 12c: navigasi, lapisan, umpan balik, tampilan data", () => {
  afterEach(() => setLocale("id"));

  it("Navbar: tautan aktif, aksi, dan menu ponsel <details> tanpa JavaScript", () => {
    const out = html(h(ui.Navbar, { appName: "Toko <Senja>", links: [{ href: "/", label: "Beranda" }, { href: "/menu", label: "Menu" }], active: "/menu", actions: h(ui.Button, { href: "/pesan" }, "Pesan") }));
    assert.match(out, /^<header class="zu-navbar">/);
    assert.match(out, /Toko <b>&lt;Senja&gt;<\/b>/);
    assert.match(out, /<nav class="zu-navbar-links" aria-label="Navigasi utama"><a href="\/">Beranda<\/a><a href="\/menu" aria-current="page">Menu<\/a><\/nav>/);
    assert.match(out, /<details class="zu-navbar-menu"><summary aria-label="Menu">/);
    assert.equal((out.match(/href="\/pesan"/g) ?? []).length, 2, "aksi ada di bilah dan di menu ponsel");
  });

  it("Breadcrumb, Tabs, Steps", () => {
    assert.equal(html(h(ui.Breadcrumb, { items: [] })), "");
    assert.match(html(h(ui.Breadcrumb, { items: [{ label: "Beranda", href: "/" }, { label: "Kopi", href: "/kopi" }] })), /<li><span aria-current="page">Kopi<\/span><\/li>/);
    const tabs = html(h(ui.Tabs, { items: [{ href: "?tab=a", label: "Baru", count: 3 }, { href: "?tab=b", label: "Selesai" }], active: "?tab=a" }));
    assert.match(tabs, /<a href="\?tab=a" aria-current="page">Baru<span class="zu-tab-count">3<\/span><\/a><a href="\?tab=b">Selesai<\/a>/);
    const steps = html(h(ui.Steps, { steps: ["Keranjang", { label: "Alamat", description: "Ke mana" }, "Bayar"], current: 2 }));
    assert.match(steps, /<li class="done">.*✓.*<li class="current" aria-current="step">.*<b>Alamat<\/b><small>Ke mana<\/small>.*<li class="todo">/);
  });

  it("Pagination: nomor di sekitar halaman aktif, celah, tepi nonaktif, dan teks id/en", () => {
    assert.equal(html(h(ui.Pagination, { page: 1, pages: 1 })), "");
    const out = html(h(ui.Pagination, { page: 5, pages: 12, href: "/produk?page={page}" }));
    const numbers = [...out.matchAll(/<li>(?:<a[^>]*>|<span[^>]*>)([^<]+)</g)].map((m) => m[1]);
    assert.deepEqual(numbers, ["1", "…", "4", "5", "6", "…", "12"]);
    assert.match(out, /<a class="zu-page edge" href="\/produk\?page=4" rel="prev">‹ Sebelumnya<\/a>/);
    assert.match(out, /<span class="zu-page" aria-current="page">5<\/span>/);
    assert.match(out, /Halaman 5 dari 12/);
    assert.deepEqual([...html(h(ui.Pagination, { page: 2, pages: 4 })).matchAll(/<li>(?:<a[^>]*>|<span[^>]*>)([^<]+)</g)].map((m) => m[1]), ["1", "2", "3", "4"]);
    const first = html(h(ui.Pagination, { page: 0, pages: 3 }));
    assert.match(first, /<span class="zu-page edge" aria-disabled="true">‹ Sebelumnya<\/span>/, "halaman di luar batas dijepit ke 1");
    setLocale("en");
    assert.match(html(h(ui.Pagination, { page: 2, pages: 3 })), /Page 2 of 3.*Next ›/);
  });

  it("DropdownMenu: tautan dan aksi POST; BottomNav; Footer", () => {
    const menu = html(h(ui.DropdownMenu, { label: "Aksi", align: "end", items: [{ label: "Ubah", href: "/p/1" }, { label: "Hapus", action: "/p/1/hapus", danger: true }] }));
    assert.match(menu, /^<details class="zu-dropdown end"><summary class="zu-btn secondary small">Aksi/);
    assert.match(menu, /<form method="post" action="\/p\/1\/hapus"><button type="submit" class="zu-menu-item danger">Hapus<\/button><\/form>/);
    assert.match(html(h(ui.BottomNav, { items: [{ href: "/", label: "Beranda", icon: "⌂" }], active: "/" })), /<a href="\/" aria-current="page"><span class="zu-bottomnav-icon" aria-hidden="true">⌂<\/span><span>Beranda<\/span><\/a>/);
    const footer = html(h(ui.Footer, { appName: "Toko Senja", columns: [{ title: "Toko", links: [{ href: "/menu", label: "Menu" }] }] }));
    assert.match(footer, new RegExp(`© ${new Date().getFullYear()} Toko Senja`));
    assert.match(footer, /<h2>Toko<\/h2><ul><li><a href="\/menu">Menu<\/a><\/li><\/ul>/);
  });

  it("Button opens/closes, Dialog, ConfirmDialog, Drawer, Sheet, Popover, Tooltip memakai popover bawaan", () => {
    assert.equal(html(h(ui.Button, { opens: "d" }, "Buka")), '<button class="zu-btn primary" type="button" popovertarget="d" popovertargetaction="show">Buka</button>');
    assert.equal(html(h(ui.Button, null, "Simpan")), '<button class="zu-btn primary" type="submit">Simpan</button>', "tombol biasa tidak berubah");
    const dialog = html(h(ui.Dialog, { id: "tambah", title: "Tambah <produk>", trigger: "Tambah", open: true }, "isi"));
    assert.match(dialog, /^<button class="zu-btn primary" type="button" popovertarget="tambah" popovertargetaction="show">Tambah<\/button><dialog class="zu-dialog" id="tambah" popover="auto" aria-labelledby="tambah-title" data-zu-open="">/);
    assert.match(dialog, /<h2 id="tambah-title">Tambah &lt;produk&gt;<\/h2><button class="zu-close" type="button" popovertarget="tambah" popovertargetaction="hide" aria-label="Tutup">×<\/button>/);
    const confirm = html(h(ui.ConfirmDialog, { id: "hapus", title: "Hapus?", text: "Tidak bisa dikembalikan.", action: "/p/1/hapus", confirm: "Hapus" }));
    assert.match(confirm, /role="alertdialog"/);
    assert.match(confirm, /<form class="zu-dialog-foot" method="post" action="\/p\/1\/hapus"><button class="zu-btn secondary" type="button" popovertarget="hapus" popovertargetaction="hide">Batal<\/button><button class="zu-btn danger" type="submit">Hapus<\/button><\/form>/);
    assert.match(html(h(ui.Drawer, { id: "f", title: "Filter", side: "left" }, "x")), /<dialog class="zu-drawer left" id="f" popover="auto"/);
    assert.match(html(h(ui.Sheet, { id: "s", title: "Bagikan" }, "x")), /<dialog class="zu-drawer bottom" id="s"/);
    assert.match(html(h(ui.Popover, { id: "p", trigger: "Info" }, "isi")), /<button class="zu-btn secondary small" type="button" popovertarget="p">Info<\/button><div class="zu-popover" id="p" popover="auto">isi<\/div>/);
    assert.match(html(h(ui.Tooltip, { text: "PPN <11%>" }, h("button", null, "Harga"))), /<span class="zu-tip" data-zu-tip="(zu-tip-\d+)"><button>Harga<\/button><span class="zu-tip-text" role="tooltip" id="\1">PPN &lt;11%&gt;<\/span><\/span>/);
    setLocale("en");
    assert.match(html(h(ui.ConfirmDialog, { id: "x", title: "Delete?", action: "/x", confirm: "Delete" })), /aria-label="Close".*>Cancel<\/button>/);
  });

  it("Toast (termasuk dari flash), Progress, Spinner, Skeleton", () => {
    assert.equal(html(h(ui.Toast, { flash: undefined })), "", "tanpa pesan flash tidak merender apa-apa");
    const toast = html(h(ui.Toast, { flash: { message: "Tersimpan <ok>", tone: "error" } }));
    assert.match(toast, /<div class="zu-toast error" role="alert" data-zu-timeout="6"><span>Tersimpan &lt;ok&gt;<\/span><button class="zu-close" type="button" data-zu-dismiss="" aria-label="Tutup" hidden>×<\/button><\/div>/);
    assert.match(html(h(ui.Toast, { timeout: 0 }, "Halo")), /<div class="zu-toast success" role="status"><span>Halo<\/span>/);
    assert.match(html(h(ui.Progress, { label: "Kuota", value: 7, max: 10 })), /<small>70%<\/small><\/div><progress value="7" max="10" aria-label="Kuota"><\/progress>/);
    assert.match(html(h(ui.Progress, { label: "Mengunggah" })), /<progress max="100" aria-label="Mengunggah"><\/progress>/);
    assert.match(html(h(ui.Spinner, null)), /role="status" aria-label="Memuat…"/);
    assert.match(html(h(ui.Spinner, { text: "Memuat pesanan" })), /<span class="zu-spinner" role="status"><span class="zu-spinner-ring" aria-hidden="true"><\/span><span>Memuat pesanan<\/span><\/span>/);
    assert.equal((html(h(ui.Skeleton, { lines: 3, avatar: true })).match(/zu-skel-line[" ]/g) ?? []).length, 3);
  });

  it("DescriptionList, Accordion, Timeline, Tag, AvatarGroup, Stat dengan tren", () => {
    assert.match(html(h(ui.DescriptionList, { columns: 2, items: [{ label: "Total", value: "Rp1" }] })), /<dl class="zu-dl c2"><div><dt>Total<\/dt><dd>Rp1<\/dd><\/div><\/dl>/);
    const acc = html(h(ui.Accordion, { single: true, items: [{ title: "A", content: "a", open: true }, { title: "B", content: "b" }] }));
    const names = [...acc.matchAll(/<details name="(zu-acc-\d+)"/g)].map((m) => m[1]);
    assert.equal(names.length, 2);
    assert.equal(names[0], names[1], "single: bagian berbagi name");
    assert.match(acc, /<details name="zu-acc-\d+" open><summary>A<\/summary><div>a<\/div><\/details>/);
    assert.doesNotMatch(html(h(ui.Accordion, { items: [{ title: "A", content: "a" }] })), /name=/);
    assert.match(html(h(ui.Timeline, { items: [{ title: "Dibayar", time: "09.15", tone: "ok" }] })), /<li class="ok"><div class="zu-timeline-head"><b>Dibayar<\/b><time>09.15<\/time><\/div><\/li>/);
    assert.equal(html(h(ui.Tag, { href: "/k", active: true }, "Kopi")), '<a class="zu-tag active" href="/k" aria-current="true">Kopi</a>');
    const avatars = html(h(ui.AvatarGroup, { names: ["Sari Dewi", "Budi", "Rina"], max: 2 }));
    assert.match(avatars, /aria-label="Sari Dewi, Budi, Rina"/);
    assert.match(avatars, />SD<\/span><span class="zu-avatar" aria-hidden="true">B<\/span><span class="zu-avatar more" aria-hidden="true">\+1<\/span>/);
    const up = html(h(ui.Stat, { label: "Pendapatan", value: 10, trend: "up", change: "12%", hint: "dari bulan lalu" }));
    assert.match(up, /<small><span class="zu-trend good"><span role="img" aria-label="naik">↑<\/span> 12%<\/span> dari bulan lalu<\/small>/);
    assert.match(html(h(ui.Stat, { label: "Keluhan", value: 3, trend: "down", good: "down" })), /zu-trend good/);
    assert.match(html(h(ui.Stat, { label: "Pesanan", value: 3, trend: "down" })), /zu-trend bad/);
    assert.equal(html(h(ui.Stat, { label: "A", value: 1, hint: "h" })), '<div class="zu-stat"><span>A</span><b>1</b><small>h</small></div>', "Stat lama tidak berubah");
  });

  it("Rating: tampilan dan input bintang (radio tanpa JavaScript), CodeBlock", () => {
    const shown = html(h(ui.Rating, { value: 4.5, count: 1280 }));
    assert.match(shown, /aria-label="Rating 4,5 dari 5"/);
    assert.match(shown, /<b>4,5<\/b><small>\(1\.280\)<\/small>/);
    const input = html(h(ui.Rating, { name: "nilai", value: 4 }));
    assert.equal((input.match(/type="radio"/g) ?? []).length, 5);
    assert.match(input, /<input type="radio" id="nilai-4" name="nilai" value="4" checked aria-label="4 bintang">/);
    const code = html(h(ui.CodeBlock, { code: "a < b", title: "Terminal" }));
    assert.match(code, /<figcaption><span>Terminal<\/span><button class="zu-copy" type="button" data-zu-copy="" data-done="Tersalin" hidden>Salin<\/button><\/figcaption><pre><code>a &lt; b<\/code><\/pre>/);
    setLocale("en");
    assert.match(html(h(ui.Rating, { value: 4.5 })), /aria-label="Rated 4.5 out of 5"/);
  });

  it("Calendar: minggu mulai Senin (id) atau Minggu (en), acara per hari, tautan bulan, daftar", () => {
    const events = [
      { date: "2026-09-08", time: "10.00", title: "Kelas <latte>", href: "/k/1" },
      { date: "2026-09-25", title: "Live musik", tone: "ok" as const },
      { date: "2026-10-01", title: "Bulan lain" },
    ];
    const out = html(h(ui.Calendar, { month: "2026-09", events, href: "/jadwal?bulan={month}", today: "2026-09-25" }));
    assert.match(out, /<h2>September 2026<\/h2>/);
    assert.match(out, /href="\/jadwal\?bulan=2026-08" aria-label="Bulan sebelumnya"/);
    assert.match(out, /href="\/jadwal\?bulan=2026-10" aria-label="Bulan berikutnya"/);
    assert.match(out, /<th scope="col">Sen<\/th>/);
    // 1 September 2026 hari Selasa: satu sel kosong sebelum tanggal 1 (minggu mulai Senin).
    assert.match(out, /<tbody><tr><td class="out"><\/td><td><span class="zu-cal-day">1<\/span><\/td>/);
    assert.match(out, /<td class="today"><span class="zu-cal-day" aria-current="date">25<\/span><span class="zu-cal-event ok">/);
    assert.match(out, /<a class="zu-cal-event" href="\/k\/1"><span class="zu-cal-time">10.00<\/span> Kelas &lt;latte&gt;<\/a>/);
    assert.doesNotMatch(out, /Bulan lain/, "acara bulan lain tidak ditampilkan");
    assert.match(out, /<ol class="zu-cal-list">/);
    assert.match(html(h(ui.Calendar, { month: "2026-09", view: "list" })), /<section class="zu-calendar list">.*Belum ada acara bulan ini/);
    assert.match(html(h(ui.Calendar, { month: "2026-12", href: "?m={month}" })), /href="\?m=2027-01"/);
    setLocale("en");
    const en = html(h(ui.Calendar, { month: "2026-09" }));
    assert.match(en, /<th scope="col">Sun<\/th>/);
    assert.match(en, /<tbody><tr><td class="out"><\/td><td class="out"><\/td><td><span class="zu-cal-day">1<\/span>/);
  });
});

describe("pesan flash dan halaman error bertema", () => {
  const dir = path.join(FIXTURES, "flash");
  const cookieOf = (res: Response) => res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");

  it("tanpa session: cookie zen_flash, tampil sekali, lalu dihapus", async () => {
    const srv = await startServer({ routesDir: dir });
    try {
      const saved = await fetch(`${srv.base}/simpan`, { method: "POST", redirect: "manual", headers: { origin: srv.base } });
      assert.equal(saved.status, 303);
      const cookie = cookieOf(saved);
      assert.match(cookie, /^zen_flash=/);
      const shown = await fetch(`${srv.base}/lihat`, { headers: { cookie } });
      assert.match(await shown.text(), /<div class="zu-toast success" role="status" data-zu-timeout="6"><span>Tersimpan &lt;ok&gt;<\/span>/);
      assert.match(shown.headers.getSetCookie().join(), /zen_flash=; .*Max-Age=0/);
      assert.doesNotMatch(await (await fetch(`${srv.base}/lihat`)).text(), /class="zu-toast/);
      const forged = await fetch(`${srv.base}/lihat`, { headers: { cookie: "zen_flash=bukan-json" } });
      assert.doesNotMatch(await forged.text(), /class="zu-toast/, "cookie rusak diabaikan");
      const same = await fetch(`${srv.base}/sekaligus`);
      assert.match(await same.text(), /zu-toast info/);
      assert.match(same.headers.getSetCookie().join(), /zen_flash=; .*Max-Age=0/, "pesan yang sudah tampil tidak terbawa ke request berikutnya");
    } finally {
      await srv.close();
    }
  });

  it("dengan session(): pesan disimpan di session", async () => {
    const srv = await startServer({ routesDir: dir, middleware: [session({ secret: "s".repeat(32) })] });
    try {
      const saved = await fetch(`${srv.base}/simpan`, { method: "POST", redirect: "manual", headers: { origin: srv.base } });
      const cookie = cookieOf(saved);
      assert.match(cookie, /^zen_session=/);
      assert.doesNotMatch(cookie, /zen_flash/);
      const shown = await fetch(`${srv.base}/lihat`, { headers: { cookie } });
      assert.match(await shown.text(), /Tersimpan &lt;ok&gt;/);
      assert.doesNotMatch(await (await fetch(`${srv.base}/lihat`, { headers: { cookie: cookieOf(shown) } })).text(), /class="zu-toast/);
    } finally {
      await srv.close();
    }
  });

  it("produksi: 403/404/500 memakai kit UI dengan tema dan nama aplikasi, tanpa detail internal", async () => {
    const srv = await startServer({ routesDir: dir, debug: false, appName: "Toko Senja", ui: { accent: "blue" } });
    try {
      const html403 = await (await fetch(`${srv.base}/admin`, { headers: { accept: "text/html" } })).text();
      assert.match(html403, /<body class="zu">/);
      assert.match(html403, /\/_zentara\/theme\.css\?v=/);
      assert.match(html403, /<p class="zu-status-code">403<\/p><h1>Akses ditolak<\/h1><p>Khusus admin &lt;toko&gt;<\/p>/);
      assert.match(html403, /Toko <b>Senja<\/b>/);
      const missing = await fetch(`${srv.base}/tidak-ada`, { headers: { accept: "text/html" } });
      assert.equal(missing.status, 404);
      assert.match(await missing.text(), /<p class="zu-status-code">404<\/p><h1>Halaman tidak ditemukan<\/h1>/);
      const broken = await (await fetch(`${srv.base}/rusak`, { headers: { accept: "text/html" } })).text();
      assert.match(broken, /<p class="zu-status-code">500<\/p><h1>Terjadi kesalahan<\/h1>/);
      assert.doesNotMatch(broken, /rahasia internal/);
    } finally {
      await srv.close();
      setUiTheme(resolveUiTheme(undefined));
    }
  });
});
