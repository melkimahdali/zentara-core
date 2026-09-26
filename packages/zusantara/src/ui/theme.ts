import { createHash } from "node:crypto";
import { BRAND } from "../brand/index.js";
import { t } from "../i18n/index.js";

/**
 * Tema kit UI dari `zusantara.config.mjs`:
 *
 *   export default { ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" } };
 *
 * Warna aksen disesuaikan otomatis untuk mode terang dan gelap supaya teks di atasnya tetap memenuhi
 * kontras WCAG AA. Stylesheet tema disajikan di /_zusantara/theme.css dan dimuat page() hanya bila tema
 * berbeda dari default.
 */

export type ThemeMode = "auto" | "light" | "dark";
export type ThemeRadius = "none" | "sm" | "md" | "lg";
export type ThemeFont = "jakarta" | "system" | "serif" | "mono";

export interface UiThemeConfig {
  /** Nama warna (mis. "blue", "biru", "rose") atau hex (#2563eb). Default "teal" (Zusantara Teal). */
  accent?: string;
  /** Sudut komponen: "none", "sm", "md" (default), atau "lg". */
  radius?: ThemeRadius;
  /** "jakarta" (Plus Jakarta Sans, default), "system", "serif", atau "mono". */
  font?: ThemeFont;
  /** "auto" (ikuti sistem, default), "light", atau "dark". */
  mode?: ThemeMode;
}

export interface UiTheme {
  /** Nama preset atau hex yang dinormalkan (huruf kecil, 6 digit). */
  accent: string;
  radius: ThemeRadius;
  font: ThemeFont;
  mode: ThemeMode;
}

export const DEFAULT_THEME: UiTheme = { accent: "teal", radius: "md", font: "jakarta", mode: "auto" };

/** Warna aksen siap pakai. "teal" memakai warna bawaan kit UI apa adanya. */
export const ACCENT_PRESETS: Record<string, string> = {
  teal: BRAND.teal,
  blue: "#2563eb",
  sky: "#0284c7",
  cyan: "#0891b2",
  indigo: "#4f46e5",
  violet: "#7c3aed",
  purple: "#9333ea",
  pink: "#db2777",
  rose: "#e11d48",
  red: "#dc2626",
  orange: "#ea580c",
  amber: "#d97706",
  gold: BRAND.gold,
  brown: "#92400e",
  green: "#16a34a",
  emerald: "#059669",
  slate: "#475569",
};

/** Nama warna dalam Bahasa Indonesia, mis. `accent: "biru"`. */
const ACCENT_ALIASES: Record<string, string> = {
  toska: "teal",
  hijau_toska: "teal",
  biru: "blue",
  biru_langit: "sky",
  nila: "indigo",
  ungu: "purple",
  merah_muda: "pink",
  merah: "red",
  oranye: "orange",
  jingga: "orange",
  kuning: "amber",
  emas: "gold",
  cokelat: "brown",
  coklat: "brown",
  hijau: "green",
  zamrud: "emerald",
  abu: "slate",
  abu_abu: "slate",
};

export const THEME_RADII: readonly ThemeRadius[] = ["none", "sm", "md", "lg"];
export const THEME_FONTS: readonly ThemeFont[] = ["jakarta", "system", "serif", "mono"];
export const THEME_MODES: readonly ThemeMode[] = ["auto", "light", "dark"];

function normalizeAccent(value: string): string | undefined {
  const v = value.trim().toLowerCase();
  const key = v.replace(/[\s-]+/g, "_");
  if (ACCENT_PRESETS[key]) return key;
  if (ACCENT_ALIASES[key]) return ACCENT_ALIASES[key];
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v)?.[1];
  if (!hex) return undefined;
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join("") : hex;
  return `#${full}`;
}

/** Normalkan `ui` dari config. Nilai yang tidak dikenal menghasilkan error yang menyebut pilihan yang ada. */
export function resolveUiTheme(input: unknown = {}): UiTheme {
  if (input === undefined || input === null) return { ...DEFAULT_THEME };
  if (typeof input !== "object" || Array.isArray(input)) throw new Error(t().ui.theme.invalidObject);
  const raw = input as Record<string, unknown>;
  const m = t().ui.theme;
  const pick = <T extends string>(key: string, allowed: readonly T[], fallback: T): T => {
    const value = raw[key];
    if (value === undefined) return fallback;
    if (typeof value === "string" && (allowed as readonly string[]).includes(value.trim().toLowerCase())) return value.trim().toLowerCase() as T;
    throw new Error(m.invalid(key, String(value), allowed.join(", ")));
  };
  let accent = DEFAULT_THEME.accent;
  if (raw.accent !== undefined) {
    const normalized = typeof raw.accent === "string" ? normalizeAccent(raw.accent) : undefined;
    if (!normalized) throw new Error(m.invalid("accent", String(raw.accent), `${Object.keys(ACCENT_PRESETS).join(", ")}, #rrggbb`));
    accent = normalized;
  }
  return {
    accent,
    radius: pick("radius", THEME_RADII, DEFAULT_THEME.radius),
    font: pick("font", THEME_FONTS, DEFAULT_THEME.font),
    mode: pick("mode", THEME_MODES, DEFAULT_THEME.mode),
  };
}

export function isDefaultTheme(theme: UiTheme): boolean {
  return theme.accent === DEFAULT_THEME.accent && theme.radius === DEFAULT_THEME.radius && theme.font === DEFAULT_THEME.font && theme.mode === DEFAULT_THEME.mode;
}

// ── Warna ────────────────────────────────────────────────────────────────

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(rgb: RGB): string {
  return `#${rgb.map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(rgb: RGB): number {
  const [r, g, b] = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as RGB;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: RGB, b: RGB): number {
  const l1 = luminance(a);
  const l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function mix(a: RGB, b: RGB, amount: number): RGB {
  return [0, 1, 2].map((i) => a[i]! * (1 - amount) + b[i]! * amount) as RGB;
}

function toHsl([r, g, b]: RGB): [number, number, number] {
  const [rr, gg, bb] = [r / 255, g / 255, b / 255];
  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const hue = max === rr ? (gg - bb) / d + (gg < bb ? 6 : 0) : max === gg ? (bb - rr) / d + 2 : (rr - gg) / d + 4;
  return [hue / 6, s, l];
}

function fromHsl([hue, s, l]: [number, number, number]): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (x: number) => {
    const tt = x < 0 ? x + 1 : x > 1 ? x - 1 : x;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
  };
  return [channel(hue + 1 / 3) * 255, channel(hue) * 255, channel(hue - 1 / 3) * 255];
}

/** Geser kecerahan sedikit demi sedikit sampai `ok` terpenuhi (atau batasnya tercapai). */
function adjust(rgb: RGB, step: number, ok: (c: RGB) => boolean): RGB {
  const [hue, s, start] = toHsl(rgb);
  for (let l = start; l >= 0 && l <= 1; l += step) {
    const c = fromHsl([hue, s, l]).map(Math.round) as RGB;
    if (ok(c)) return c;
  }
  return step < 0 ? [0, 0, 0] : [255, 255, 255];
}

const WHITE: RGB = [255, 255, 255];
const LIGHT_BG = hexToRgb("#f3f5f3");
const DARK_BG = hexToRgb(BRAND.obsidian);
const DARK_SURFACE_3 = hexToRgb("#1c2f31");
const AA = 4.6; // sedikit di atas 4,5 agar pembulatan tidak membuatnya gagal

export interface AccentPalette {
  light: { accent: string; hover: string; soft: string; line: string; glow: string };
  dark: { accent: string; hover: string; soft: string; line: string; glow: string };
}

const rgba = (c: RGB, a: number) => `rgba(${c.map(Math.round).join(",")},${a})`;

/**
 * Turunan warna aksen untuk kedua mode. Mode terang: teks putih di atas aksen, dan teks beraksen di latar
 * halaman serta di latar lembut (badge), minimal 4,5:1. Mode gelap: aksen cukup terang di latar gelap,
 * dengan teks gelap di atasnya.
 */
export function accentPalette(accent: string): AccentPalette {
  const base = hexToRgb(accent.startsWith("#") ? accent : ACCENT_PRESETS[accent]!);
  const light = adjust(base, -0.01, (c) => contrast(WHITE, c) >= AA && contrast(c, LIGHT_BG) >= AA && contrast(c, mix(WHITE, c, 0.1)) >= AA);
  const lightHover = fromHsl([toHsl(light)[0], toHsl(light)[1], Math.max(0, toHsl(light)[2] - 0.05)]);
  const dark = adjust(base, 0.01, (c) => contrast(c, DARK_BG) >= AA && contrast(c, DARK_SURFACE_3) >= AA && contrast(DARK_BG, c) >= AA);
  const darkHover = fromHsl([toHsl(dark)[0], toHsl(dark)[1], Math.min(1, toHsl(dark)[2] + 0.06)]);
  return {
    light: { accent: rgbToHex(light), hover: rgbToHex(lightHover), soft: rgba(light, 0.1), line: rgba(light, 0.35), glow: rgba(base, 0.14) },
    dark: { accent: rgbToHex(dark), hover: rgbToHex(darkHover), soft: rgba(dark, 0.11), line: rgba(dark, 0.4), glow: rgba(dark, 0.08) },
  };
}

const RADII: Record<ThemeRadius, [string, string, string]> = {
  none: ["0", "0", "0"],
  sm: ["4px", "6px", "10px"],
  md: ["6px", "10px", "16px"],
  lg: ["8px", "14px", "22px"],
};

const FONTS: Record<ThemeFont, string> = {
  jakarta: `"Plus Jakarta Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`,
  system: `ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`,
  serif: `ui-serif,Georgia,Cambria,"Times New Roman",Times,serif`,
  mono: `"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace`,
};

/** Stylesheet tema (kosong untuk tema default). Dimuat setelah ui.css sehingga variabelnya menang. */
export function themeCss(theme: UiTheme): string {
  const root: string[] = [];
  let dark = "";
  if (theme.accent !== DEFAULT_THEME.accent) {
    const p = accentPalette(theme.accent);
    root.push(`--zu-accent:${p.light.accent};--zu-accent-hover:${p.light.hover};--zu-on-accent:#fff;--zu-accent-soft:${p.light.soft};--zu-accent-line:${p.light.line};--zu-glow:${p.light.glow}`);
    const vars = `--zu-accent:${p.dark.accent};--zu-accent-hover:${p.dark.hover};--zu-on-accent:${BRAND.obsidian};--zu-accent-soft:${p.dark.soft};--zu-accent-line:${p.dark.line};--zu-glow:${p.dark.glow}`;
    dark = `@media (prefers-color-scheme:dark){:root:not([data-zu-mode=light]){${vars}}}\n:root[data-zu-mode=dark]{${vars}}`;
  }
  if (theme.radius !== DEFAULT_THEME.radius) {
    const [sm, md, lg] = RADII[theme.radius];
    root.push(`--zu-r-sm:${sm};--zu-r-md:${md};--zu-r-lg:${lg}`);
  }
  if (theme.font !== DEFAULT_THEME.font) root.push(`--zu-font:${FONTS[theme.font]}`);
  return [root.length ? `:root{${root.join(";")}}` : "", dark].filter(Boolean).join("\n");
}

// ── Tema aktif ───────────────────────────────────────────────────────────

export interface ActiveTheme {
  theme: UiTheme;
  css: string;
  /** Versi stylesheet untuk cache browser (?v=). */
  hash: string;
}

// Disimpan di globalThis: aplikasi bisa memuat `zusantara/ui` dari salinan paket yang berbeda dengan
// runtime (mis. CLI global dan paket proyek), dan keduanya harus melihat tema yang sama.
const KEY = Symbol.for("zusantara.ui.theme");
type Store = { [KEY]?: ActiveTheme };

/** Pasang tema untuk proses ini (dipanggil runtime dari config). Tanpa argumen: kembali ke default. */
export function setUiTheme(theme?: UiThemeConfig | UiTheme): ActiveTheme {
  const resolved = resolveUiTheme(theme);
  const css = themeCss(resolved);
  const active: ActiveTheme = { theme: resolved, css, hash: createHash("sha256").update(css).digest("hex").slice(0, 10) };
  (globalThis as Store)[KEY] = active;
  return active;
}

export function activeTheme(): ActiveTheme {
  return (globalThis as Store)[KEY] ?? setUiTheme();
}
