import { LOGO_PIXELS } from "./assets.js";

/** Token warna Zentara Core (Brand Identity Guidelines, Concept C · Nusantara Tech). */
export const BRAND = {
  teal: "#2ED3B7",
  gold: "#C89B52",
  obsidian: "#0D1719",
  pearl: "#F2F4F0",
  slate: "#829490",
} as const;

export const TAGLINE = "Rooted here. Built for what's next.";
export const DESCRIPTION = "AI-driven TypeScript web framework from Indonesia";

export type ColorDepth = "truecolor" | "256" | "basic" | "none";

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const n = parseInt(hex.replace("#", ""), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Kemampuan warna terminal, menghormati NO_COLOR / FORCE_COLOR. */
export function colorDepth(stream: NodeJS.WriteStream = process.stdout, env: NodeJS.ProcessEnv = process.env): ColorDepth {
  if (env.NO_COLOR !== undefined && env.NO_COLOR !== "") return "none";
  if (!stream.isTTY && !env.FORCE_COLOR) return "none";
  const depth = typeof stream.getColorDepth === "function" ? stream.getColorDepth(env) : 4;
  if (depth >= 24) return "truecolor";
  if (depth >= 8) return "256";
  if (depth >= 4) return "basic";
  return "none";
}

/** Warna xterm-256 terdekat untuk RGB. */
export function to256([r, g, b]: RGB): number {
  const level = (v: number) => (v < 48 ? 0 : v < 115 ? 1 : Math.floor((v - 35) / 40));
  return 16 + 36 * level(r) + 6 * level(g) + level(b);
}

function fg(rgb: RGB, depth: ColorDepth): string {
  return depth === "truecolor" ? `38;2;${rgb[0]};${rgb[1]};${rgb[2]}` : `38;5;${to256(rgb)}`;
}
function bg(rgb: RGB, depth: ColorDepth): string {
  return depth === "truecolor" ? `48;2;${rgb[0]};${rgb[1]};${rgb[2]}` : `48;5;${to256(rgb)}`;
}

/** Pewarna teks dengan warna brand sesuai kemampuan terminal. */
export function brandPaint(hex: string, depth: ColorDepth, basicCode = "36"): (s: string) => string {
  if (depth === "none") return (s) => s;
  const code = depth === "basic" ? basicCode : fg(hexToRgb(hex), depth);
  return (s) => `\x1b[${code}m${s}\x1b[0m`;
}

const PIXELS: (RGB | undefined)[][] = LOGO_PIXELS.map((row) => row.split(" ").map((p) => (p === "." ? undefined : hexToRgb(p))));

/**
 * Logo Z untuk terminal (16 baris × 32 kolom, karakter half-block ▀▄), dikonversi dari master logo.
 * Latar transparan, jadi rapi di terminal gelap maupun terang. Tanpa warna: siluet satu warna,
 * celah garis emas tetap terlihat.
 */
export function terminalLogo(depth: ColorDepth): string[] {
  const lines: string[] = [];
  const luminance = (p: RGB) => 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
  for (let y = 0; y < PIXELS.length; y += 2) {
    let line = "";
    for (let x = 0; x < PIXELS[y]!.length; x++) {
      const top = PIXELS[y]![x];
      const bottom = PIXELS[y + 1]?.[x];
      if (depth === "none" || depth === "basic") {
        // Piksel gelap (garis pemisah) dianggap kosong agar bentuknya tetap terbaca dalam satu warna.
        const on = (p: RGB | undefined) => p !== undefined && luminance(p) > 55;
        const t = on(top);
        const b = on(bottom);
        const ch = t && b ? "█" : t ? "▀" : b ? "▄" : " ";
        // 16 warna: emas (merah > hijau) jadi kuning, selebihnya cyan.
        const sample = t ? top! : bottom;
        line += depth === "basic" && sample ? `\x1b[${sample[0] > sample[1] ? "33" : "36"}m${ch}\x1b[0m` : ch;
        continue;
      }
      if (top && bottom) line += `\x1b[${fg(top, depth)};${bg(bottom, depth)}m▀\x1b[0m`;
      else if (top) line += `\x1b[${fg(top, depth)}m▀\x1b[0m`;
      else if (bottom) line += `\x1b[${fg(bottom, depth)}m▄\x1b[0m`;
      else line += " ";
    }
    lines.push(line.replace(/ +$/, ""));
  }
  // Buang baris kosong di atas/bawah.
  while (lines.length && lines[0]!.trim() === "") lines.shift();
  while (lines.length && lines.at(-1)!.trim() === "") lines.pop();
  return lines;
}

/** Lebar tampilan (tanpa kode ANSI). */
export function visibleWidth(text: string): number {
  return text.replace(/\x1b\[[0-9;]*m/g, "").length;
}

export interface BannerOptions {
  version: string;
  columns: number;
  depth: ColorDepth;
  /** Baris tambahan di bawah deskripsi (mis. folder, provider AI). */
  details?: string[];
}

/**
 * Banner Zentara Core: logo di kiri dan teks di kanan pada terminal lebar, teks saja pada terminal
 * sempit, satu baris pada terminal sangat sempit (pedoman brand bagian 05).
 */
export function banner(options: BannerOptions): string[] {
  const { depth, columns } = options;
  const teal = brandPaint(BRAND.teal, depth, "36");
  const gold = brandPaint(BRAND.gold, depth, "33");
  const slate = brandPaint(BRAND.slate, depth, "2");
  const bold = (s: string) => (depth === "none" ? s : `\x1b[1m${s}\x1b[0m`);
  const text = [
    `${bold("Zentara")} ${bold(teal("Core"))}  ${slate(`v${options.version}`)}`,
    slate(DESCRIPTION),
    gold(TAGLINE),
    ...(options.details?.length ? ["", ...options.details] : []),
  ];

  if (columns < 44) return [`${teal("Z>")} ${bold("Zentara")} ${teal("Core")} ${slate(`v${options.version}`)}`];
  const logo = terminalLogo(depth);
  const logoWidth = Math.max(...logo.map(visibleWidth));
  if (columns < logoWidth + 4 + 40) return ["", ...text.map((l) => `  ${l}`)];

  const top = Math.max(0, Math.floor((logo.length - text.length) / 2));
  const rows = Math.max(logo.length, top + text.length);
  const out: string[] = [];
  for (let i = 0; i < rows; i++) {
    const left = logo[i] ?? "";
    const right = text[i - top] ?? "";
    out.push(`  ${left}${" ".repeat(logoWidth - visibleWidth(left))}   ${right}`.replace(/ +$/, ""));
  }
  return out;
}
