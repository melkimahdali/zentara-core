// Naikkan versi semua paket bersamaan: node scripts/version.mjs 0.6.1
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/.test(version)) {
  console.error("Pemakaian: node scripts/version.mjs <versi>   (mis. 0.6.1 atau 0.7.0-beta.1)");
  process.exit(1);
}

const edit = (file, fn) => {
  const full = path.join(ROOT, file);
  const json = JSON.parse(fs.readFileSync(full, "utf8"));
  fn(json);
  fs.writeFileSync(full, JSON.stringify(json, null, 2) + "\n");
  console.log(`  ${file}`);
};

console.log(`Versi -> ${version}`);
edit("packages/zusantara/package.json", (p) => (p.version = version));
edit("packages/create-zusantara/package.json", (p) => (p.version = version));
for (const t of fs.readdirSync(path.join(ROOT, "packages/create-zusantara/templates"))) {
  edit(`packages/create-zusantara/templates/${t}/package.json`, (p) => (p.dependencies.zusantara = `^${version}`));
}
console.log(`\nLanjutkan: npm install (memperbarui lockfile), perbarui CHANGELOG.md, commit, lalu buat GitHub Release dengan tag v${version}.`);
