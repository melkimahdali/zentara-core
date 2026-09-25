// Bangkitkan packages/zentara/src/ui/font.ts dari paket @fontsource-variable/plus-jakarta-sans (OFL 1.1).
//   node scripts/brand/font.mjs <folder hasil ekstrak paket fontsource>
//   (npm pack @fontsource-variable/plus-jakarta-sans && tar xzf *.tgz → folder "package")
// Font brand Zentara Core disajikan framework di /_zentara/fonts/*, tanpa permintaan ke Google Fonts.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = process.argv[2];
if (!src) {
  console.error("Pemakaian: node scripts/brand/font.mjs <folder paket fontsource>");
  process.exit(1);
}
const pkg = JSON.parse(fs.readFileSync(path.join(src, "package.json"), "utf8"));
const read = (subset) => fs.readFileSync(path.join(src, "files", `plus-jakarta-sans-${subset}-wght-normal.woff2`)).toString("base64");
const css = fs.readFileSync(path.join(src, "index.css"), "utf8");
const range = (subset) => new RegExp(`/\\* plus-jakarta-sans-${subset}-wght-normal \\*/[\\s\\S]*?unicode-range: ([^;]+);`).exec(css)?.[1];
const license = fs.readFileSync(path.join(src, "LICENSE"), "utf8");

const out = `// Dibangkitkan oleh scripts/brand/font.mjs dari ${pkg.name}@${pkg.version}. Jangan diedit manual.
// Plus Jakarta Sans (c) 2020 The Plus Jakarta Sans Project Authors, SIL Open Font License 1.1 (lihat FONT_LICENSE).

/** Font variabel Plus Jakarta Sans (berat 200-800), subset latin & latin-ext, base64 woff2. */
export const FONT_LATIN = "${read("latin")}";
export const FONT_LATIN_EXT = "${read("latin-ext")}";
export const FONT_LATIN_RANGE = ${JSON.stringify(range("latin"))};
export const FONT_LATIN_EXT_RANGE = ${JSON.stringify(range("latin-ext"))};
export const FONT_LICENSE = ${JSON.stringify(license)};
`;
const target = path.join(ROOT, "packages", "zentara", "src", "ui", "font.ts");
fs.writeFileSync(target, out);
console.log(`${path.relative(ROOT, target)}: ${(out.length / 1024).toFixed(0)} KB`);
