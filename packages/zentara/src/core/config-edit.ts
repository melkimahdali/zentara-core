import fs from "node:fs";
import path from "node:path";
import type { UiThemeConfig } from "../ui/theme.js";

/**
 * Ubah `ui` di zentara.config.mjs tanpa menyentuh bagian lain file (dipakai `zentara theme`). Hanya
 * menangani bentuk yang aman diubah otomatis: `ui: { ... }` dalam satu baris, atau belum ada `ui` sama
 * sekali (ditambahkan tepat setelah `export default {`). Selain itu pengguna diminta mengubahnya sendiri.
 */

export type ConfigEditResult =
  | { ok: true; file: string; created: boolean; changed: boolean }
  | { ok: false; file: string; reason: "multiline" | "noExport" };

const CONFIG_FILES = ["zentara.config.mjs", "zentara.config.js"];
const SINGLE_LINE = /^([ \t]*)ui[ \t]*:[ \t]*\{[^{}\n]*\}[ \t]*,?[ \t]*(\/\/[^\n]*)?\r?\n?/m;
const ANY_UI = /^[ \t]*ui[ \t]*:/m;
const EXPORT_OPEN = /export[ \t]+default[ \t]+(?:defineConfig[ \t]*\([ \t]*)?\{[ \t]*\r?\n/;

/** `{ accent: "blue", radius: "lg" }` dengan urutan kunci yang tetap. */
export function formatUiObject(ui: UiThemeConfig): string {
  const keys = (["accent", "radius", "font", "mode"] as const).filter((k) => ui[k] !== undefined);
  return `{ ${keys.map((k) => `${k}: ${JSON.stringify(ui[k])}`).join(", ")} }`;
}

/** Ganti (atau hapus, bila `ui` null/kosong) properti `ui` di teks config. */
export function editConfigUi(source: string, ui: UiThemeConfig | null): { ok: true; text: string } | { ok: false; reason: "multiline" | "noExport" } {
  const empty = !ui || Object.values(ui).every((v) => v === undefined);
  const single = SINGLE_LINE.exec(source);
  if (single) {
    const indent = single[1] ?? "  ";
    const eol = single[0].endsWith("\n") ? (single[0].endsWith("\r\n") ? "\r\n" : "\n") : "";
    const replacement = empty ? "" : `${indent}ui: ${formatUiObject(ui!)},${eol}`;
    return { ok: true, text: source.slice(0, single.index) + replacement + source.slice(single.index + single[0].length) };
  }
  if (ANY_UI.test(source)) return { ok: false, reason: "multiline" };
  if (empty) return { ok: true, text: source };
  const open = EXPORT_OPEN.exec(source);
  if (!open) return { ok: false, reason: "noExport" };
  const at = open.index + open[0].length;
  return { ok: true, text: `${source.slice(0, at)}  ui: ${formatUiObject(ui!)},\n${source.slice(at)}` };
}

/** Tulis `ui` ke zentara.config.mjs proyek (dibuat bila belum ada). */
export function writeConfigUi(cwd: string, ui: UiThemeConfig | null): ConfigEditResult {
  const existing = CONFIG_FILES.map((f) => path.join(cwd, f)).find((f) => fs.existsSync(f));
  if (!existing) {
    const file = path.join(cwd, CONFIG_FILES[0]!);
    if (!ui || Object.values(ui).every((v) => v === undefined)) return { ok: true, file, created: false, changed: false };
    fs.writeFileSync(file, `/** @type {import("zentara").UserConfig} */\nexport default {\n  ui: ${formatUiObject(ui)},\n};\n`);
    return { ok: true, file, created: true, changed: true };
  }
  const before = fs.readFileSync(existing, "utf8");
  const edited = editConfigUi(before, ui);
  if (!edited.ok) return { ok: false, file: existing, reason: edited.reason };
  if (edited.text !== before) fs.writeFileSync(existing, edited.text);
  return { ok: true, file: existing, created: false, changed: edited.text !== before };
}
