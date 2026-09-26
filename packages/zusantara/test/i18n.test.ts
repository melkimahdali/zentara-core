import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { run } from "../src/cli.js";
import { resolveConfig } from "../src/core/config.js";
import { renderStatusPage } from "../src/core/devpage/error.js";
import { setAppInfo } from "../src/core/devpage/info.js";
import { h, welcomePage } from "../src/core/index.js";
import { docsUrl, getLocale, parseLocale, readSettings, resolveLocale, setLocale, t, writeSettings } from "../src/i18n/index.js";
import { hostCommands } from "../src/repl/host.js";
import { AppShell, formatNumber, page, Search, Table } from "../src/ui/index.js";

/** Semua jalur kunci beserta jenis nilainya (string, function/arity, array, object). */
function shape(value: unknown, prefix = ""): string[] {
  if (typeof value === "function") return [`${prefix}:fn${value.length}`];
  if (Array.isArray(value)) return [`${prefix}:array`];
  if (value && typeof value === "object") return Object.keys(value).sort().flatMap((k) => shape((value as Record<string, unknown>)[k], `${prefix}.${k}`));
  return [`${prefix}:${typeof value}`];
}

describe("i18n (Bahasa Indonesia & English)", () => {
  afterEach(() => setLocale("id"));

  it("katalog en punya kunci dan jenis nilai yang sama persis dengan id", () => {
    assert.deepEqual(shape(t("en")), shape(t("id")));
    // Array paralel (daftar perintah, saran) punya panjang yang sama.
    assert.equal(t("en").host.commands.length, t("id").host.commands.length);
    assert.equal(t("en").dev.welcome.suggestions.length, t("id").dev.welcome.suggestions.length);
    assert.deepEqual(Object.keys(t("en").dev.status).sort(), Object.keys(t("id").dev.status).sort());
  });

  it("parseLocale mengenali kode dan nama bahasa", () => {
    for (const v of ["en", "EN", "en-US", "en_GB", "english", "inggris"]) assert.equal(parseLocale(v), "en", v);
    for (const v of ["id", "id-ID", "in", "indonesia", "Bahasa"]) assert.equal(parseLocale(v), "id", v);
    for (const v of ["fr", "", undefined, 3]) assert.equal(parseLocale(v), undefined);
  });

  it("urutan: env ZUSANTARA_LANG > config > preferensi global > Indonesia", () => {
    assert.equal(resolveLocale({ env: {} }), "id");
    assert.equal(resolveLocale({ env: {}, settings: { locale: "en" } }), "en");
    assert.equal(resolveLocale({ env: {}, config: "id", settings: { locale: "en" } }), "id");
    assert.equal(resolveLocale({ env: { ZUSANTARA_LANG: "en" }, config: "id" }), "en");
  });

  it("preferensi global disimpan di ZUSANTARA_HOME/settings.json tanpa menghapus isi lain", () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-set-"));
    const env = { ZUSANTARA_HOME: home };
    fs.writeFileSync(path.join(home, "settings.json"), JSON.stringify({ other: 1 }));
    writeSettings({ locale: "en" }, env);
    assert.deepEqual(readSettings(env), { locale: "en" });
    assert.equal(JSON.parse(fs.readFileSync(path.join(home, "settings.json"), "utf8")).other, 1);
    fs.rmSync(home, { recursive: true, force: true });
  });

  it("`zusantara lang en` menyimpan preferensi; CLI lalu berbahasa Inggris", async () => {
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-lang-"));
    const out: string[] = [];
    const io = { cwd, out: (l: string) => out.push(l), err: (l: string) => out.push(l) };
    assert.equal(await run(["lang"], io), 0);
    assert.match(out.join("\n"), /Bahasa Zusantara: Bahasa Indonesia \(bawaan\)/);
    assert.equal(await run(["lang", "en"], io), 0);
    assert.match(out.at(-1)!, /Language changed to English/);
    out.length = 0;
    assert.equal(await run(["help"], io), 0);
    assert.match(out.join("\n"), /Running your app:/);
    assert.equal(await run(["lang", "klingon"], io), 1);
    assert.match(out.at(-1)!, /Unknown language: klingon/);
    // Config proyek menang atas preferensi global.
    fs.writeFileSync(path.join(cwd, "zusantara.config.mjs"), 'export default { locale: "id" };\n');
    out.length = 0;
    await run(["help"], io);
    assert.match(out.join("\n"), /Menjalankan aplikasi:/);
    writeSettings({ locale: "id" });
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it("config `locale` dipakai runtime; produksi mengabaikan preferensi global", () => {
    assert.equal(resolveConfig({ locale: "en" }, {}).locale, "en");
    writeSettings({ locale: "en" });
    const home = { ZUSANTARA_HOME: process.env.ZUSANTARA_HOME };
    assert.equal(resolveConfig({}, home).locale, "en");
    assert.equal(resolveConfig({}, { ...home, NODE_ENV: "production" }).locale, "id");
    writeSettings({ locale: "id" });
  });

  it("halaman bawaan, kit UI, dan perintah CLI mengikuti bahasa aktif", () => {
    setLocale("en");
    assert.equal(getLocale(), "en");
    const status = renderStatusPage(404);
    assert.match(status, /<html lang="en">/);
    assert.match(status, /Page not found/);
    setAppInfo({ appName: "Demo", env: "production", debug: false, root: process.cwd(), routes: [] });
    const welcome = welcomePage();
    assert.match(welcome, /Your app <span>is running\.<\/span>/);
    assert.match(welcome, /zusantara\.morixa\.id\/en\//);
    const html = page(
      { title: "t" },
      h(AppShell, { appName: "Demo", title: "Home", active: "/", user: { name: "Ann Lee", email: "a@b.c" }, nav: [{ href: "/", label: "Home" }] }),
      h(Search, { action: "/x", value: "q" }),
      h(Table, { columns: [{ label: "Name" }], rows: [] }),
    );
    assert.match(html, /<html lang="en">/);
    assert.match(html, /Skip to content/);
    assert.match(html, />Sign out</);
    assert.match(html, />Clear</);
    assert.match(html, /No data yet/);
    assert.equal(formatNumber(12500), "12,500");
    assert.deepEqual(hostCommands().find(([c]) => c === "/lang"), ["/lang", "Change the language: /lang id or /lang en"]);
    assert.equal(docsUrl("ui.html"), "https://zusantara.morixa.id/en/ui.html");

    setLocale("id");
    assert.match(renderStatusPage(404), /Halaman tidak ditemukan/);
    assert.match(page({ title: "t" }), /Lewati ke konten/);
    assert.equal(formatNumber(12500), "12.500");
    assert.equal(docsUrl("ui.html"), "https://zusantara.morixa.id/ui.html");
  });
});
