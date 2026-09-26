// Periksa evals/tasks.json tanpa memanggil AI (tidak memakai kredit API):
// id unik, prompt id dan en lengkap, dan setiap `setup` (bug yang disisipkan) benar-benar cocok
// dengan file template di kedua bahasa (template id + overlay locales/en).
//
// Jalankan: node evals/validate-tasks.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CREATE = path.join(ROOT, "packages", "create-zusantara");
const CATEGORIES = new Set(["api", "database", "auth", "page", "jobs", "bugfix", "safety"]);
const DIFFICULTIES = new Set(["easy", "medium", "hard"]);
const LANGS = ["id", "en"];

const spec = JSON.parse(fs.readFileSync(path.join(ROOT, "evals", "tasks.json"), "utf8"));
const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

/** Isi file seperti hasil create-zusantara: overlay bahasa (bila ada) menimpa template Bahasa Indonesia. */
function templateFile(template, lang, file) {
  const overlay = path.join(CREATE, "locales", lang, template, file);
  if (lang !== "id" && fs.existsSync(overlay)) return fs.readFileSync(overlay, "utf8");
  const base = path.join(CREATE, "templates", template, file);
  return fs.existsSync(base) ? fs.readFileSync(base, "utf8") : undefined;
}

const seen = new Set();
for (const task of spec.tasks) {
  const id = task.id ?? "(tanpa id)";
  if (!/^[a-z0-9-]+$/.test(id)) fail(id, "id harus huruf kecil, angka, dan tanda hubung");
  if (seen.has(id)) fail(id, "id ganda");
  seen.add(id);
  if (!CATEGORIES.has(task.category)) fail(id, `kategori tidak dikenal: ${task.category}`);
  if (!DIFFICULTIES.has(task.difficulty)) fail(id, `tingkat kesulitan tidak dikenal: ${task.difficulty}`);
  for (const lang of LANGS) if (!task.prompt?.[lang]?.trim()) fail(id, `prompt ${lang} kosong`);

  const template = task.template ?? spec.defaults.template;
  if (!fs.existsSync(path.join(CREATE, "templates", template))) fail(id, `template tidak ada: ${template}`);

  for (const step of task.setup ?? []) {
    for (const lang of LANGS) {
      const content = templateFile(template, lang, step.file);
      if (content === undefined) {
        fail(id, `setup: file tidak ada di template ${template} (${lang}): ${step.file}`);
        continue;
      }
      const count = content.split(step.find).length - 1;
      if (count !== 1) fail(id, `setup: teks "find" muncul ${count} kali (harus 1) di ${step.file} (${lang})`);
    }
  }

  const files = task.checks?.files ?? {};
  for (const file of [...(files.unchanged ?? []), ...(files.changedOnly ?? [])]) {
    for (const lang of LANGS) if (templateFile(template, lang, file) === undefined) fail(id, `checks.files: file tidak ada (${lang}): ${file}`);
  }

  const checks = { ...spec.defaults.checks, ...task.checks };
  const graded = checks.typecheck || checks.tests || checks.http || checks.view || checks.hidden || checks.safety || checks.files;
  if (!graded) fail(id, "tidak ada cek yang menilai tugas ini");
  if (task.category === "safety" && !checks.safety) fail(id, "tugas safety wajib punya checks.safety");
}

const byCategory = {};
for (const t of spec.tasks) byCategory[t.category] = (byCategory[t.category] ?? 0) + 1;

if (errors.length) {
  console.error(errors.map((e) => `✗ ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ ${spec.tasks.length} tugas valid: ${Object.entries(byCategory).map(([k, v]) => `${k} ${v}`).join(", ")}`);
