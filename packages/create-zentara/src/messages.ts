import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Bahasa proyek yang dibuat (teks halaman, pesan, README, test) dan bahasa pembuat proyek ini. */
export type Lang = "id" | "en";
export const LANGS: readonly Lang[] = ["id", "en"];

/** Kenali kode atau nama bahasa ("en", "en-US", "english", "id", "indonesia"). */
export function parseLang(value: unknown): Lang | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase().replace(/_/g, "-");
  if (v === "en" || v.startsWith("en-") || v === "english" || v === "inggris") return "en";
  if (v === "id" || v === "in" || v.startsWith("id-") || v === "indonesia" || v === "indonesian" || v === "bahasa") return "id";
  return undefined;
}

/**
 * Bahasa bawaan: env ZENTARA_LANG, lalu preferensi global `zentara lang` (~/.zentara/settings.json),
 * lalu Bahasa Indonesia. Sama dengan urutan di paket zentara.
 */
export function defaultLang(env: NodeJS.ProcessEnv = process.env): Lang {
  const fromEnv = parseLang(env.ZENTARA_LANG);
  if (fromEnv) return fromEnv;
  try {
    const dir = env.ZENTARA_HOME ? path.resolve(env.ZENTARA_HOME) : path.join(os.homedir(), ".zentara");
    const settings = JSON.parse(fs.readFileSync(path.join(dir, "settings.json"), "utf8")) as { locale?: unknown };
    return parseLang(settings.locale) ?? "id";
  } catch {
    return "id";
  }
}

const id = {
  templates: {
    api: "Aplikasi web: login, dasbor, database (SQLite), contoh CRUD",
    minimal: "Minimal: halaman & API sederhana, tanpa database",
  },
  help: (templates: string) => `Buat proyek Zentara baru

  npm create zentara@latest [folder] [-- --template api|minimal] [--lang id|en] [--no-install] [--yes]

Template:
${templates}

Bahasa (--lang): id (Bahasa Indonesia) atau en (English). Mengatur teks aplikasi contoh, README,
dan bahasa Zentara di proyek ini.
`,
  folderNotEmpty: (dir: string) => `Folder ${dir} sudah berisi file. Pilih nama folder lain atau kosongkan dulu.`,
  unknownTemplate: (name: string, choices: string) => `Template tidak dikenal: ${name}. Pilihan: ${choices}`,
  unknownLang: (name: string) => `Bahasa tidak dikenal: ${name}. Pilihan: id, en`,
  invalidPackage: (name: string) => `Nama paket tidak valid: ${name}`,
  folderQuestion: "Nama folder proyek",
  chooseTemplate: "Pilih template:",
  number: "Nomor",
  installQuestion: "Pasang dependency sekarang?",
  omnirouteIntro: (name: string, free: string) => `\nZentara AI memakai ${name} sebagai provider default: ${free}, tanpa API key.`,
  free: "gratis",
  omnirouteQuestion: "Pasang OmniRoute sekarang (npm install -g omniroute, sekali saja)?",
  created: (pkg: string, where: string, template: string) => `Proyek ${pkg} dibuat di ${where} (template ${template})`,
  installFailed: (where: string, pm: string) => `Gagal memasang dependency. Coba jalankan manual: cd ${where} && ${pm} install`,
  omnirouteInstalled: "OmniRoute terpasang.",
  omnirouteOffer: "npx zentara akan menawarkan menjalankannya di latar belakang.",
  omnirouteFailed: "Gagal memasang OmniRoute. Coba manual: npm install -g omniroute (di Windows mungkin perlu terminal Administrator).",
  nextSteps: "\nLangkah berikutnya:\n",
  omnirouteHint: "# AI gratis (sekali saja); atau pilih provider lain: npx zentara ai:setup",
  zentaraHint: "# chat dengan Zentara AI + server dev di latar belakang",
  serverOnly: (cmd: string) => `\nAtau jalankan server saja: ${cmd} dev`,
  globalTip: 'Tip: npm install -g zentara agar cukup mengetik "zentara" dari folder mana pun.\n',
};

type Messages = typeof id;

const en: Messages = {
  templates: {
    api: "Web app: sign-in, dashboard, database (SQLite), example CRUD",
    minimal: "Minimal: simple pages & API, no database",
  },
  help: (templates) => `Create a new Zentara project

  npm create zentara@latest [folder] [-- --template api|minimal] [--lang id|en] [--no-install] [--yes]

Templates:
${templates}

Language (--lang): id (Bahasa Indonesia) or en (English). Sets the example app's text, the README,
and Zentara's language in this project.
`,
  folderNotEmpty: (dir) => `Folder ${dir} already contains files. Choose another folder name or empty it first.`,
  unknownTemplate: (name, choices) => `Unknown template: ${name}. Choices: ${choices}`,
  unknownLang: (name) => `Unknown language: ${name}. Choices: id, en`,
  invalidPackage: (name) => `Invalid package name: ${name}`,
  folderQuestion: "Project folder name",
  chooseTemplate: "Choose a template:",
  number: "Number",
  installQuestion: "Install dependencies now?",
  omnirouteIntro: (name, free) => `\nZentara AI uses ${name} as the default provider: ${free}, no API key.`,
  free: "free",
  omnirouteQuestion: "Install OmniRoute now (npm install -g omniroute, only once)?",
  created: (pkg, where, template) => `Project ${pkg} created in ${where} (${template} template)`,
  installFailed: (where, pm) => `Installing dependencies failed. Try it manually: cd ${where} && ${pm} install`,
  omnirouteInstalled: "OmniRoute installed.",
  omnirouteOffer: "npx zentara will offer to run it in the background.",
  omnirouteFailed: "Installing OmniRoute failed. Try it manually: npm install -g omniroute (on Windows you may need an Administrator terminal).",
  nextSteps: "\nNext steps:\n",
  omnirouteHint: "# free AI (only once); or choose another provider: npx zentara ai:setup",
  zentaraHint: "# chat with Zentara AI + dev server in the background",
  serverOnly: (cmd) => `\nOr just run the server: ${cmd} dev`,
  globalTip: 'Tip: npm install -g zentara so you can just type "zentara" from any folder.\n',
};

export function messages(lang: Lang): Messages {
  return lang === "en" ? en : id;
}
