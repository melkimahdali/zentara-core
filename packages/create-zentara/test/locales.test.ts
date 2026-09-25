import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import { messages, parseLang } from "../src/messages.js";
import { parseArgs, scaffold } from "../src/index.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LOCALES = path.join(ROOT, "locales");

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]));
}

/**
 * Bentuk kode tanpa teks: jenis node, nama identifier, dan angka. Isi string, template literal, regex,
 * dan komentar diabaikan. Terjemahan hanya boleh mengubah teks, bukan logika.
 */
function codeShape(file: string): string[] {
  const source = ts.createSourceFile(file, fs.readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const out: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node)) out.push(`id:${node.text}`);
    else if (ts.isNumericLiteral(node)) out.push(`num:${node.text}`);
    else out.push(ts.SyntaxKind[node.kind]!);
    ts.forEachChild(node, visit);
  };
  visit(source);
  return out;
}

describe("template dua bahasa", () => {
  const overlays = walk(LOCALES).map((f) => path.relative(LOCALES, f));

  it("setiap file terjemahan punya pasangan di template Bahasa Indonesia", () => {
    assert.ok(overlays.length > 20);
    for (const rel of overlays) {
      const [, template, ...rest] = rel.split(path.sep);
      assert.ok(fs.existsSync(path.join(ROOT, "templates", template!, ...rest)), rel);
    }
  });

  it("kode terjemahan sama persis dengan aslinya (hanya teks yang berbeda)", () => {
    for (const rel of overlays.filter((f) => /\.(ts|mjs)$/.test(f))) {
      const [, template, ...rest] = rel.split(path.sep);
      const original = path.join(ROOT, "templates", template!, ...rest);
      assert.deepEqual(codeShape(path.join(LOCALES, rel)), codeShape(original), `kode ${rel} berbeda dari templates/${template}/${rest.join("/")}`);
    }
  });

  it("katalog pesan create-zentara lengkap di kedua bahasa", () => {
    const shape = (v: unknown, p = ""): string[] =>
      typeof v === "function" ? [`${p}:fn${v.length}`] : v && typeof v === "object" ? Object.keys(v).sort().flatMap((k) => shape((v as Record<string, unknown>)[k], `${p}.${k}`)) : [`${p}:${typeof v}`];
    assert.deepEqual(shape(messages("en")), shape(messages("id")));
    assert.equal(parseLang("EN-us"), "en");
    assert.equal(parseLang("Indonesia"), "id");
    assert.equal(parseArgs(["app", "--lang", "en"]).lang, "en");
    assert.equal(parseArgs(["--lang=id"]).lang, "id");
  });

  describe("scaffold --lang en", () => {
    let tmp: string;
    before(() => {
      tmp = fs.mkdtempSync(path.join(os.tmpdir(), "create-zentara-en-"));
    });
    after(() => fs.rmSync(tmp, { recursive: true, force: true }));

    it("api: teks, README, dan locale Bahasa Inggris; struktur file sama", () => {
      scaffold({ targetDir: path.join(tmp, "id-app"), template: "api" });
      scaffold({ targetDir: path.join(tmp, "en-app"), template: "api", lang: "en" });
      const read = (app: string, file: string) => fs.readFileSync(path.join(tmp, app, file), "utf8");
      assert.match(read("en-app", "zentara.config.mjs"), /locale: "en"/);
      assert.match(read("id-app", "zentara.config.mjs"), /locale: "id"/);
      assert.match(read("en-app", "README.md"), /Start from a blank canvas/);
      assert.match(read("en-app", "src/app/routes/login.ts"), /title: "Sign in"/);
      assert.match(read("id-app", "src/app/routes/login.ts"), /title: "Masuk"/);
      const files = (app: string) => walk(path.join(tmp, app)).map((f) => path.relative(path.join(tmp, app), f)).filter((f) => f !== ".env").sort();
      assert.deepEqual(files("en-app"), files("id-app"));
    });

    it("pesan error scaffold mengikuti bahasa", () => {
      const busy = path.join(tmp, "busy");
      fs.mkdirSync(busy);
      fs.writeFileSync(path.join(busy, "x"), "x");
      assert.throws(() => scaffold({ targetDir: busy, template: "api", lang: "en" }), /already contains files/);
      assert.throws(() => scaffold({ targetDir: busy, template: "api" }), /sudah berisi file/);
    });
  });
});
