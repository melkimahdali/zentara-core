import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DOCS_URL } from "../brand/index.js";
import { en } from "./en/index.js";
import { id, type Messages } from "./id/index.js";

/**
 * Bahasa antarmuka Zusantara (CLI, halaman bawaan, pesan error, kit UI).
 *
 * Urutan penentuan bahasa (yang pertama ada yang dipakai):
 *   1. env `ZUSANTARA_LANG` (id | en);
 *   2. `locale` di zusantara.config.mjs proyek;
 *   3. preferensi global `~/.zusantara/settings.json`, diatur dengan `zusantara lang en` atau `/lang en`;
 *   4. Bahasa Indonesia.
 */
export type Locale = "id" | "en";
export type { Messages };

export const LOCALES: readonly Locale[] = ["id", "en"];
export const DEFAULT_LOCALE: Locale = "id";
/** Nama bahasa dalam bahasanya sendiri, untuk menu pilihan. */
export const LOCALE_NAMES: Record<Locale, string> = { id: "Bahasa Indonesia", en: "English" };

const CATALOGS: Record<Locale, Messages> = { id, en };

/** Kenali kode atau nama bahasa ("en", "en-US", "english", "inggris", "id-ID", "in", "indonesia"). */
export function parseLocale(value: unknown): Locale | undefined {
  if (typeof value !== "string") return undefined;
  const v = value.trim().toLowerCase().replace(/_/g, "-");
  if (!v) return undefined;
  if (v === "en" || v.startsWith("en-") || v === "english" || v === "inggris") return "en";
  if (v === "id" || v === "in" || v.startsWith("id-") || v.startsWith("in-") || v === "indonesia" || v === "indonesian" || v === "bahasa") return "id";
  return undefined;
}

let current: Locale = parseLocale(process.env.ZUSANTARA_LANG) ?? DEFAULT_LOCALE;

let override: (() => Locale | undefined) | undefined;

export function getLocale(): Locale {
  return override?.() ?? current;
}

/**
 * Bahasa per request, mis. varian `en` di `view_page` saat pengembangan. Fungsi ini dipanggil setiap
 * kali bahasa aktif dibaca; undefined = pakai bahasa proses.
 */
export function setLocaleOverride(fn: (() => Locale | undefined) | undefined): void {
  override = fn;
}

/** Ganti bahasa aktif untuk seluruh proses. ZUSANTARA_LANG tetap menang bila diisi. */
export function setLocale(locale: Locale): void {
  current = parseLocale(process.env.ZUSANTARA_LANG) ?? locale;
}

/** Katalog pesan untuk bahasa aktif (atau bahasa tertentu). */
export function t(locale: Locale = getLocale()): Messages {
  return CATALOGS[locale];
}

/** Tag bahasa BCP 47 untuk Intl dan atribut `lang` HTML. */
export function intlLocale(locale: Locale = getLocale()): string {
  return locale === "en" ? "en-US" : "id-ID";
}

/** Alamat dokumentasi dalam bahasa aktif (Bahasa Inggris di /en/), mis. docsUrl("mulai-cepat.html"). */
export function docsUrl(page = "", locale: Locale = getLocale()): string {
  return `${DOCS_URL}${locale === "en" ? "en/" : ""}${page}`;
}

// ── Preferensi global ─────────────────────────────────────────────────────

export interface GlobalSettings {
  locale?: Locale;
}

/** Folder pengaturan global (bisa diganti lewat ZUSANTARA_HOME, mis. untuk test). */
export function settingsDir(env: NodeJS.ProcessEnv = process.env): string {
  return env.ZUSANTARA_HOME ? path.resolve(env.ZUSANTARA_HOME) : path.join(os.homedir(), ".zusantara");
}

export function readSettings(env: NodeJS.ProcessEnv = process.env): GlobalSettings {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(settingsDir(env), "settings.json"), "utf8")) as Record<string, unknown>;
    return { locale: parseLocale(raw.locale) };
  } catch {
    return {};
  }
}

export function writeSettings(patch: GlobalSettings, env: NodeJS.ProcessEnv = process.env): string {
  const dir = settingsDir(env);
  const file = path.join(dir, "settings.json");
  let existing: Record<string, unknown> = {};
  try {
    existing = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    // file belum ada atau rusak: mulai dari kosong
  }
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file, JSON.stringify({ ...existing, ...patch }, null, 2) + "\n");
  return file;
}

/** Bahasa yang dipakai berdasarkan env, config proyek, dan preferensi global. */
export function resolveLocale(options: { env?: NodeJS.ProcessEnv; config?: unknown; settings?: GlobalSettings } = {}): Locale {
  const env = options.env ?? process.env;
  return parseLocale(env.ZUSANTARA_LANG) ?? parseLocale(options.config) ?? options.settings?.locale ?? DEFAULT_LOCALE;
}
