#!/usr/bin/env node
// Katalog komponen kit UI untuk Zentara AI, `zentara ui`, dan galeri /_zentara/ui, dibuat dari sumber:
// setiap fungsi yang diekspor di src/ui dengan tag JSDoc @group masuk katalog. Teks utama JSDoc = id,
// @en = Bahasa Inggris, @example = contoh pemakaian. Props dan tipenya dibaca lewat TypeScript.
//
//   node scripts/ui-catalog.mjs          tulis src/ui/catalog.gen.ts
//   node scripts/ui-catalog.mjs --check  gagal bila file itu belum diperbarui (dijalankan di test)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCES = ["src/ui/layout.ts", "src/ui/forms.ts", "src/ui/index.ts", "src/ui/nav.ts", "src/ui/overlay.ts", "src/ui/feedback.ts", "src/ui/data.ts", "src/ui/status.ts", "src/ui/public.ts", "src/ui/commerce.ts", "src/core/flash.ts"];
export const OUTPUT = "src/ui/catalog.gen.ts";
/** Contoh halaman utuh (src/ui/examples/{id,en}/<nama>.ts), urut seperti di katalog. */
export const EXAMPLES = ["landing", "profile", "store", "booking", "dashboard"];
const GROUPS = ["page", "layout", "nav", "form", "overlay", "data", "public", "commerce", "feedback", "format"];

const clean = (text) => text.replace(/\s+/g, " ").trim();

function jsdoc(node, checker, symbol) {
  const id = clean(ts.displayPartsToString(symbol.getDocumentationComment(checker)));
  const tags = {};
  for (const tag of symbol.getJsDocTags(checker)) tags[tag.name] = ts.displayPartsToString(tag.text ?? []).trim();
  return { id, tags };
}

/**
 * Tipe prop untuk dibaca manusia dan model: pilihan literal ditulis lengkap ("sm" | "md"), selain itu
 * seperti yang tertulis di sumber (mis. Child, Option[]), bukan hasil penjabaran tipe yang panjang.
 */
function typeText(checker, symbol, at) {
  const type = checker.getNonNullableType(checker.getTypeOfSymbolAtLocation(symbol, at));
  const parts = type.isUnion() ? type.types : [type];
  const literal = parts.every((p) => p.isLiteral() || p.flags & ts.TypeFlags.BooleanLiteral);
  const decl = symbol.valueDeclaration ?? symbol.declarations?.[0];
  const node = decl && (ts.isPropertySignature(decl) || ts.isPropertyDeclaration(decl)) ? decl.type : undefined;
  if (node && literal) {
    // Alias seperti Gap ditulis sebagai pilihannya, dalam urutan di sumber.
    let target = node;
    while (ts.isTypeReferenceNode(target)) {
      let sym = checker.getSymbolAtLocation(target.typeName);
      if (sym && sym.flags & ts.SymbolFlags.Alias) sym = checker.getAliasedSymbol(sym);
      const alias = sym?.declarations?.find(ts.isTypeAliasDeclaration);
      if (!alias) break;
      target = alias.type;
    }
    return clean(target.getText());
  }
  if (node) return clean(node.getText());
  return checker.typeToString(type, at, ts.TypeFormatFlags.NoTruncation).replace(/\bimport\("[^"]+"\)\./g, "");
}

/**
 * Baca satu contoh halaman utuh: baris pertama JSDoc pembuka = judul, sisanya = keterangan. Sumbernya
 * ditulis ulang seperti file route di aplikasi: impor relatif menjadi "zentara" dan "zentara/ui".
 */
function readExample(file) {
  const code = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n");
  const doc = /^\/\*\*\n([\s\S]*?)\*\/\n/.exec(code);
  if (!doc) throw new Error(`${file}: butuh JSDoc pembuka (judul lalu keterangan)`);
  const lines = doc[1].split("\n").map((l) => l.replace(/^\s*\* ?/, "").trim()).filter(Boolean);
  const source = code
    .slice(doc[0].length)
    .replace(/from "\.\.\/\.\.\/\.\.\/core\/view\.js"/g, 'from "zentara"')
    .replace(/from "\.\.\/\.\.\/index\.js"/g, 'from "zentara/ui"');
  if (/from "\./.test(source)) throw new Error(`${file}: contoh hanya boleh mengimpor dari zentara dan zentara/ui`);
  return { title: lines[0], text: clean(lines.slice(1).join(" ")), source: source.trim() + "\n" };
}

export function generateCatalog(root = ROOT) {
  const files = SOURCES.map((f) => path.join(root, f));
  const program = ts.createProgram(files, { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.NodeNext, moduleResolution: ts.ModuleResolutionKind.NodeNext, strict: true, skipLibCheck: true, noEmit: true });
  const checker = program.getTypeChecker();
  const entries = [];
  for (const file of files) {
    const source = program.getSourceFile(file);
    for (const node of source.statements) {
      if (!ts.isFunctionDeclaration(node) || !node.name || !node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) continue;
      const symbol = checker.getSymbolAtLocation(node.name);
      const { id, tags } = jsdoc(node, checker, symbol);
      if (!tags.group) continue;
      if (!GROUPS.includes(tags.group)) throw new Error(`${node.name.text}: @group ${tags.group} tidak dikenal (${GROUPS.join(", ")})`);
      if (!tags.en || !tags.example || !id) throw new Error(`${node.name.text}: JSDoc butuh teks id, @en, dan @example`);
      const name = node.name.text;
      const entry = { name, group: tags.group, kind: /^[A-Z]/.test(name) ? "component" : "function", id, en: clean(tags.en), example: clean(tags.example), props: [] };
      const param = node.parameters[0];
      if (entry.kind === "component" && param) {
        const type = checker.getTypeAtLocation(param);
        for (const prop of checker.getPropertiesOfType(type)) {
          if (prop.name === "children") continue;
          const doc = clean(ts.displayPartsToString(prop.getDocumentationComment(checker)));
          const item = { name: prop.name, type: typeText(checker, prop, param), required: !(prop.flags & ts.SymbolFlags.Optional) };
          if (doc) item.doc = doc;
          entry.props.push(item);
        }
      } else {
        const signature = checker.getSignatureFromDeclaration(node);
        entry.signature = `${name}${checker.signatureToString(signature, node, ts.TypeFormatFlags.NoTruncation)}`.replace(/\bimport\("[^"]+"\)\./g, "");
      }
      entries.push(entry);
    }
  }
  entries.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group));
  const examples = EXAMPLES.map((name) => {
    const out = { name, title: {}, text: {}, source: {} };
    for (const lang of ["id", "en"]) {
      const { title, text, source } = readExample(path.join(root, "src/ui/examples", lang, `${name}.ts`));
      out.title[lang] = title;
      out.text[lang] = text;
      out.source[lang] = source;
    }
    return out;
  });
  return `// Dibuat otomatis oleh scripts/ui-catalog.mjs dari JSDoc di src/ui. Jangan diubah manual:
// ubah JSDoc komponennya, lalu jalankan \`node scripts/ui-catalog.mjs\` di packages/zentara.
import type { CatalogEntry, PageExample } from "./catalog.js";

export const UI_CATALOG: CatalogEntry[] = ${JSON.stringify(entries, null, 2)};

export const UI_EXAMPLES: PageExample[] = ${JSON.stringify(examples, null, 2)};
`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const out = path.join(ROOT, OUTPUT);
  const next = generateCatalog();
  if (process.argv.includes("--check")) {
    const current = fs.existsSync(out) ? fs.readFileSync(out, "utf8") : "";
    if (current !== next) {
      console.error(`${OUTPUT} belum diperbarui. Jalankan: node scripts/ui-catalog.mjs`);
      process.exit(1);
    }
    console.log(`${OUTPUT} sudah sesuai.`);
  } else {
    fs.writeFileSync(out, next);
    console.log(`Ditulis ${OUTPUT}`);
  }
}
