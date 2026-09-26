import { t, type Locale, getLocale } from "../i18n/index.js";
import { UI_CATALOG } from "./catalog.gen.js";

/**
 * Katalog komponen kit UI: kegunaan (id/en), props, dan contoh untuk setiap komponen. Isinya dibuat
 * otomatis dari JSDoc di src/ui (scripts/ui-catalog.mjs), jadi selalu sama dengan kodenya. Dipakai
 * Zentara AI (tool ui_catalog dan prompt), `zentara ui`, dan galeri /_zentara/ui.
 */

export interface CatalogProp {
  name: string;
  type: string;
  required: boolean;
  /** Keterangan dari JSDoc prop (Bahasa Indonesia). */
  doc?: string;
}

export interface CatalogEntry {
  name: string;
  group: "page" | "layout" | "nav" | "form" | "overlay" | "data" | "feedback" | "format" | string;
  /** "component" dipakai dengan h(Nama, props); "function" dipanggil langsung. */
  kind: "component" | "function";
  id: string;
  en: string;
  example: string;
  props: CatalogProp[];
  signature?: string;
}

export { UI_CATALOG };

export const CATALOG_GROUPS = ["page", "layout", "nav", "form", "overlay", "data", "feedback", "format"] as const;

export function findCatalogEntry(name: string): CatalogEntry | undefined {
  const n = name.trim().toLowerCase();
  return UI_CATALOG.find((e) => e.name.toLowerCase() === n);
}

/** Nama yang mirip untuk saran "mungkin maksud Anda". */
export function similarEntries(name: string, limit = 3): string[] {
  const n = name.trim().toLowerCase();
  return UI_CATALOG.map((e) => e.name)
    .filter((x) => x.toLowerCase().includes(n) || n.includes(x.toLowerCase()) || x.toLowerCase().startsWith(n.slice(0, 3)))
    .slice(0, limit);
}

const firstSentence = (text: string) => /^.*?[.!?](?=\s+[A-Z`]|$)/.exec(text)?.[0] ?? text;

/** Kegunaan komponen dalam bahasa tertentu. */
export function entryText(e: CatalogEntry, locale: Locale = getLocale()): string {
  return locale === "en" ? e.en : e.id;
}

/** Tanda tangan singkat, mis. `Select({ name, label, options, value?, … })`. */
export function entryUsage(e: CatalogEntry): string {
  if (e.kind === "function") return e.signature ?? `${e.name}()`;
  const props = e.props.map((p) => (p.required ? p.name : `${p.name}?`));
  return props.length ? `${e.name}({ ${props.join(", ")} })` : `${e.name}()`;
}

/** Daftar semua komponen per kelompok, satu baris per komponen. */
export function catalogList(locale: Locale = getLocale(), group?: string): string {
  const m = t(locale).ui;
  const lines: string[] = [];
  for (const g of CATALOG_GROUPS) {
    if (group && g !== group) continue;
    const entries = UI_CATALOG.filter((e) => e.group === g);
    if (!entries.length) continue;
    if (lines.length) lines.push("");
    lines.push(m.groups[g] ?? g);
    const width = Math.max(...entries.map((e) => e.name.length));
    for (const e of entries) lines.push(`  ${e.name.padEnd(width)}  ${firstSentence(entryText(e, locale))}`);
  }
  return lines.join("\n");
}

/** Detail satu komponen: kegunaan, props dengan tipenya, dan contoh. */
export function catalogDetail(e: CatalogEntry, locale: Locale = getLocale()): string {
  const m = t(locale).ui.catalog;
  const lines = [`${e.name} · ${t(locale).ui.groups[e.group] ?? e.group}`, entryText(e, locale)];
  if (e.kind === "function") lines.push("", e.signature ?? e.name);
  else if (e.props.length) {
    lines.push("", m.props);
    for (const p of e.props) lines.push(`  ${p.name}${p.required ? "" : "?"}: ${p.type}${p.required ? ` (${m.required})` : ""}${p.doc && locale === "id" ? `  ${p.doc}` : ""}`);
  }
  lines.push("", m.example, `  ${e.example}`);
  return lines.join("\n");
}

/**
 * Ringkasan katalog untuk prompt sistem Zentara AI: setiap kelompok dengan komponen dan nama props-nya.
 * Tetap sama selama kodenya sama, jadi prompt caching tetap efektif.
 */
export function compactCatalog(): string {
  return CATALOG_GROUPS.map((g) => {
    const entries = UI_CATALOG.filter((e) => e.group === g);
    return `- ${g}: ${entries.map(entryUsage).join(", ")}`;
  }).join("\n");
}

/** Katalog untuk tool ui_catalog Zentara AI (Bahasa Inggris): satu baris per komponen, atau detail satu komponen. */
export function catalogForAi(options: { component?: string; group?: string } = {}): string | undefined {
  if (options.component) {
    const e = findCatalogEntry(options.component);
    return e ? catalogDetail(e, "en") : undefined;
  }
  const lines: string[] = [];
  for (const g of CATALOG_GROUPS) {
    if (options.group && g !== options.group) continue;
    lines.push(`${g}:`);
    for (const e of UI_CATALOG.filter((x) => x.group === g)) lines.push(`- ${entryUsage(e)}: ${firstSentence(e.en)}`);
  }
  return lines.join("\n");
}
