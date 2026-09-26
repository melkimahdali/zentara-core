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
import { startServer } from "./helpers.js";
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
