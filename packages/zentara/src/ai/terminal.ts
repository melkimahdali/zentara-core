import readline from "node:readline/promises";
import type { AgentUI } from "./agent.js";
import type { ApprovalAnswer, PendingAction, Prompter } from "./approval.js";
import type { ToolCall, ToolResult } from "./types.js";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
export const c = {
  dim: paint("2"),
  bold: paint("1"),
  italic: paint("3"),
  red: paint("31"),
  green: paint("32"),
  yellow: paint("33"),
  blue: paint("34"),
  magenta: paint("35"),
  cyan: paint("36"),
  gray: paint("90"),
};
/** Warna aksen Zentara (teal). */
export const accent = (s: string) => (useColor ? `\x1b[38;5;43m${s}\x1b[0m` : s);

export interface Output {
  out: (line: string) => void;
  err: (line: string) => void;
}

/** Nama tool yang ramah dibaca, gaya "Baca(src/app/x.ts)". */
const TOOL_NAMES: Record<string, string> = {
  list_files: "Daftar",
  read_file: "Baca",
  search: "Cari",
  list_routes: "Route",
  write_file: "Tulis",
  edit_file: "Ubah",
  delete_file: "Hapus",
  run_check: "Cek",
  database: "Database",
  install_package: "Pasang",
  dev_server: "Server",
};

function mainArg(call: ToolCall): string | undefined {
  const input = (call.input ?? {}) as Record<string, unknown>;
  const main = input.path ?? input.query ?? input.check ?? input.name ?? input.action;
  return typeof main === "string" ? main : undefined;
}

export function summarizeCall(call: ToolCall): string {
  const main = mainArg(call);
  return main ? `${call.name} ${main}` : call.name;
}

export function toolTitle(call: ToolCall): string {
  const main = mainArg(call);
  return `${c.bold(TOOL_NAMES[call.name] ?? call.name)}${main ? `(${main})` : ""}`;
}

/** Ringkasan hasil tool dalam satu baris. */
export function toolResultSummary(call: ToolCall, result: ToolResult): string {
  const first = result.content.split("\n")[0] ?? "";
  if (result.isError) return first;
  const lines = result.content.split("\n").filter(Boolean).length;
  switch (call.name) {
    case "read_file":
      return `${result.content.split("\n").length} baris`;
    case "list_files":
    case "list_routes":
      return result.content.startsWith("(") ? result.content : `${lines} ${call.name === "list_files" ? "file" : "route"}`;
    case "search":
      return result.content === "Tidak ada hasil." ? result.content : `${lines} hasil`;
    default:
      return first;
  }
}

/** Markdown sederhana untuk terminal: judul, tebal, kode, daftar, blok kode. */
export function renderMarkdown(text: string): string {
  const out: string[] = [];
  let inCode = false;
  for (const line of text.split("\n")) {
    if (/^\s*```/.test(line)) {
      inCode = !inCode;
      continue;
    }
    if (inCode) {
      out.push(c.gray("│ ") + c.cyan(line));
      continue;
    }
    let l = line
      .replace(/\*\*([^*]+)\*\*/g, (_, t: string) => c.bold(t))
      .replace(/`([^`]+)`/g, (_, t: string) => c.cyan(t));
    const heading = /^#{1,6}\s+(.*)$/.exec(l);
    if (heading) l = c.bold(heading[1]!);
    l = l.replace(/^(\s*)[-*]\s+/, "$1• ");
    out.push(l);
  }
  return out.join("\n");
}

/** Pratinjau perubahan berwarna: diff (+/-) atau isi file baru dengan nomor baris. */
export function formatPreview(action: PendingAction, maxLines = 40): string[] {
  if (!action.preview) return [];
  const lines = action.preview.split("\n");
  const isDiff = action.tool === "edit_file";
  const shown = lines.slice(0, maxLines).map((l, i) => {
    if (isDiff) return l.startsWith("+ ") ? c.green(l) : l.startsWith("- ") ? c.red(l) : c.dim(l);
    if (l.startsWith("… (+")) return c.dim(l);
    return `${c.gray(String(i + 1).padStart(3))} ${action.tool === "write_file" ? c.green(l) : l}`;
  });
  if (lines.length > maxLines) shown.push(c.dim(`… (+${lines.length - maxLines} baris)`));
  return shown;
}

/** Tampilan agen di terminal (gaya ⏺ / ⎿). */
export class TerminalUI implements AgentUI {
  constructor(
    private readonly io: Output,
    private readonly verbose = false,
    /** Dipanggil sebelum mencetak apa pun (mis. untuk menghentikan spinner). */
    private readonly beforePrint: () => void = () => {},
  ) {}

  thinking(provider: string): void {
    if (this.verbose) {
      this.beforePrint();
      this.io.out(c.dim(`… ${provider} berpikir`));
    }
  }

  assistant(text: string, provider: string): void {
    this.beforePrint();
    const body = renderMarkdown(text).split("\n");
    this.io.out(`\n${accent("⏺")} ${body[0]}${this.verbose ? c.dim(`  (${provider})`) : ""}`);
    for (const line of body.slice(1)) this.io.out(`  ${line}`);
  }

  toolStart(call: ToolCall): void {
    this.beforePrint();
    this.io.out(`${c.gray("⏺")} ${toolTitle(call)}`);
  }

  toolEnd(call: ToolCall, result: ToolResult): void {
    this.beforePrint();
    const summary = toolResultSummary(call, result);
    this.io.out(`  ${c.gray("⎿")}  ${result.isError ? c.yellow(summary) : c.dim(summary)}`);
  }

  info(message: string): void {
    this.beforePrint();
    this.io.out(c.dim(`  ${message}`));
  }

  fallback(from: string, reason: string, to: string | undefined): void {
    this.beforePrint();
    this.io.out(c.yellow(`  ✗ ${from} tidak tersedia: ${reason}`));
    if (to) this.io.out(c.yellow(`  → pindah ke ${to}...`));
  }
}

/** Judul persetujuan beserta pratinjau berwarna. */
export function printApprovalHeader(io: Output, action: PendingAction): void {
  const critical = action.risk === "critical";
  io.out("");
  io.out(critical ? c.red(c.bold(`  ⚠ AKSI KRUSIAL: ${action.summary}`)) : c.bold(`  ✎ ${action.summary}`));
  if (action.reason) io.out(c.red(`    Perlu persetujuan: ${action.reason}`));
  const preview = formatPreview(action);
  if (preview.length) {
    io.out(c.gray("  ╭" + "─".repeat(40)));
    for (const line of preview) io.out(`${c.gray("  │")} ${line}`);
    io.out(c.gray("  ╰" + "─".repeat(40)));
  }
}

/** Prompter persetujuan lewat ketikan (dipakai untuk perintah satu kali `zentara "..."`). */
export function terminalPrompter(rl: readline.Interface, io: Output): Prompter {
  return async (action: PendingAction): Promise<ApprovalAnswer> => {
    const critical = action.risk === "critical";
    printApprovalHeader(io, action);
    const choices = critical ? "[y] ya  [n] tidak" : "[y] ya  [n] tidak  [s] setujui semua perubahan biasa";
    for (;;) {
      const answer = (await rl.question(`  ${choices} > `)).trim().toLowerCase();
      if (["y", "ya", "yes"].includes(answer)) return "yes";
      if (["n", "t", "tidak", "no", ""].includes(answer)) return "no";
      if (!critical && ["s", "semua", "all", "a"].includes(answer)) return "all";
    }
  };
}
