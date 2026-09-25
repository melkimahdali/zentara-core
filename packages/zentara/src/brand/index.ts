import { LOGO_TERMINAL } from "./assets.js";

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

/**
 * Logo Z untuk terminal (18 baris × 48 kolom, karakter half-block ▀▄): logo asli lengkap dengan
 * motif Nusantara, diposterisasi ke warna brand flat (teal/emas) tanpa gradasi. Latar transparan,
 * jadi rapi di terminal gelap maupun terang. Tanpa warna: siluet satu warna.
 */
export function terminalLogo(depth: ColorDepth): string[] {
  return renderGrid(LOGO_TERMINAL, depth);
}

/**
 * Satu frame animasi pembuka logo (progress 0 → 1): logo tersapu muncul mengikuti arah goresan Z
 * (kiri bawah ke kanan atas) dengan kilau Pearl di tepi sapuan, lalu motif emas menyusul.
 * progress >= 1 menghasilkan logo diam yang sama dengan terminalLogo().
 */
export function terminalLogoFrame(depth: ColorDepth, progress: number): string[] {
  if (progress >= 1) return terminalLogo(depth);
  const h = LOGO_TERMINAL.length;
  const w = LOGO_TERMINAL[0]!.length;
  const edge = Math.max(0, progress) * 1.3 - 0.1;
  const goldEdge = edge - 0.3;
  const SHINE = 0.07;
  const grid = LOGO_TERMINAL.map((row, y) =>
    [...row]
      .map((cell, x) => {
        if (cell === ".") return ".";
        // Posisi sepanjang diagonal: 0 di kiri bawah, 1 di kanan atas.
        const d = (x / (w - 1)) * 0.6 + ((h - 1 - y) / (h - 1)) * 0.4;
        const front = cell === "G" ? goldEdge : edge;
        if (d > front) return ".";
        return front - d < SHINE ? "W" : cell;
      })
      .join(""),
  );
  return renderGrid(grid, depth);
}

/** Warna tiap jenis sel grid logo: T = teal, G = emas, W = kilau Pearl (animasi). */
const CELL_HEX: Record<string, string> = { T: BRAND.teal, G: BRAND.gold, W: BRAND.pearl };
const CELL_BASIC: Record<string, string> = { T: "36", G: "33", W: "97" };

function renderGrid(grid: readonly string[], depth: ColorDepth): string[] {
  const fgCode = (cell: string) => (depth === "basic" ? CELL_BASIC[cell]! : fg(hexToRgb(CELL_HEX[cell]!), depth));
  const bgCode = (cell: string) => (depth === "basic" ? String(Number(CELL_BASIC[cell]) + 10) : bg(hexToRgb(CELL_HEX[cell]!), depth));

  const lines: string[] = [];
  for (let y = 0; y < grid.length; y += 2) {
    const top = grid[y]!;
    const bottom = grid[y + 1] ?? ".".repeat(top.length);
    let line = "";
    for (let x = 0; x < top.length; x++) {
      const t = top[x]!;
      const b = bottom[x]!;
      if (t === "." && b === ".") line += " ";
      else if (depth === "none") line += t !== "." && b !== "." ? "█" : t !== "." ? "▀" : "▄";
      else if (t !== "." && b !== ".") line += t === b ? `\x1b[${fgCode(t)}m█\x1b[0m` : `\x1b[${fgCode(t)};${bgCode(b)}m▀\x1b[0m`;
      else if (t !== ".") line += `\x1b[${fgCode(t)}m▀\x1b[0m`;
      else line += `\x1b[${fgCode(b)}m▄\x1b[0m`;
    }
    lines.push(line.replace(/ +$/, ""));
  }
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
  if (columns < logoWidth + 4) return ["", ...text.map((l) => `  ${l}`)];
  // Terminal sedang: logo di atas, teks di bawahnya.
  if (columns < logoWidth + 5 + 56) return [...logo.map((l) => `  ${l}`), "", ...text.map((l) => `  ${l}`)];

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
