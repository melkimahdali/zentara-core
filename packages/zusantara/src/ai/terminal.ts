import readline from "node:readline/promises";
import { t } from "../i18n/index.js";
import { BRAND, brandPaint, colorDepth } from "../brand/index.js";
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
const depth = useColor ? colorDepth(process.stdout) : "none";
/** Warna aksen Zusantara Teal (#2ED3B7) dan Heritage Gold (#C89B52), sesuai kemampuan terminal. */
export const accent = brandPaint(BRAND.teal, depth, "36");
export const gold = brandPaint(BRAND.gold, depth, "33");

export interface Output {
  out: (line: string) => void;
  err: (line: string) => void;
}

/** Nama tool yang ramah dibaca, gaya "Baca(src/app/x.ts)". */

function mainArg(call: ToolCall): string | undefined {
  const input = (call.input ?? {}) as Record<string, unknown>;
  const main = input.path ?? input.url ?? input.query ?? input.check ?? input.command ?? input.name ?? input.action ?? input.component ?? input.group;
  if (typeof main !== "string") return undefined;
  // view_page: sebutkan layar dan varian, mis. "view_page /notes (mobile, dark)".
  if (call.name !== "view_page") return main;
  const extra = [input.viewport === "mobile" || input.viewport === "tablet" ? input.viewport : "", input.theme === "dark" || input.theme === "light" ? input.theme : "", input.lang === "en" || input.lang === "id" ? input.lang : ""].filter(Boolean);
  return extra.length ? `${main} (${extra.join(", ")})` : main;
}

export function summarizeCall(call: ToolCall): string {
  const main = mainArg(call);
  return main ? `${call.name} ${main}` : call.name;
}

export function toolTitle(call: ToolCall): string {
  const main = mainArg(call);
  return `${c.bold(t().ai.toolNames[call.name] ?? call.name)}${main ? `(${main})` : ""}`;
}

/** Ringkasan hasil tool dalam satu baris. */
export function toolResultSummary(call: ToolCall, result: ToolResult): string {
  const first = result.content.split("\n")[0] ?? "";
  if (result.isError) return first;
  const lines = result.content.split("\n").filter(Boolean).length;
  switch (call.name) {
    case "read_file":
      return t().ai.summary.lines(result.content.split("\n").length);
    case "list_files":
    case "list_routes":
      return result.content.startsWith("(") ? result.content : call.name === "list_files" ? t().ai.summary.files(lines) : t().ai.summary.routes(lines);
    case "ui_catalog":
      return (call.input as Record<string, unknown> | undefined)?.component ? first : t().ai.summary.catalog(result.content.split("\n").filter((l) => l.startsWith("- ")).length);
    case "search":
      return result.content === t().ai.tools.noResults ? result.content : t().ai.summary.hits(lines);
    case "view_page": {
      // Baris pertama hasil view_page: "RESULT ok|fail · browser|text · desktop|tablet|mobile[ · dark][ · en] · N temuan[ · N FAIL][ · skor N]".
      const head = /^RESULT (ok|fail) · (browser|text) · (desktop|tablet|mobile)(?: · (?:light|dark))?(?: · (?:id|en))? · (\d+)[^·]*(?:· (\d+) FAIL)?/.exec(result.content);
      if (!head) return first;
      return t().ai.summary.view(head[2] === "browser", head[3] === "desktop" ? "" : head[3]!, Number(head[4]), Number(head[5] ?? 0));
    }
    default:
      return first;
  }
}

/** Perender Markdown per baris (untuk streaming): mengingat apakah sedang di dalam blok kode. */
export class MarkdownLines {
  private inCode = false;

  /** Baris siap cetak, atau undefined untuk baris pembatas blok kode (```). */
  render(line: string): string | undefined {
    if (/^\s*```/.test(line)) {
      this.inCode = !this.inCode;
      return undefined;
    }
    if (this.inCode) return c.gray("│ ") + c.cyan(line);
    let l = line
      .replace(/\*\*([^*]+)\*\*/g, (_, t: string) => c.bold(t))
      .replace(/`([^`]+)`/g, (_, t: string) => c.cyan(t));
    const heading = /^#{1,6}\s+(.*)$/.exec(l);
    if (heading) l = c.bold(heading[1]!);
    return l.replace(/^(\s*)[-*]\s+/, "$1• ");
  }
}

/** Markdown sederhana untuk terminal: judul, tebal, kode, daftar, blok kode. */
export function renderMarkdown(text: string): string {
  const md = new MarkdownLines();
  return text
    .split("\n")
    .map((line) => md.render(line))
    .filter((l): l is string => l !== undefined)
    .join("\n");
}

/** Pratinjau perubahan berwarna: diff (+/-) atau isi file baru dengan nomor baris. */
export function formatPreview(action: PendingAction, maxLines = 40): string[] {
  if (!action.preview) return [];
  const lines = action.preview.split("\n");
  const kind = action.previewKind ?? (action.tool === "edit_file" ? "diff" : "file");
  const shown = lines.slice(0, maxLines).map((l, i) => {
    if (kind === "diff") return l.startsWith("@@") ? c.cyan(l) : l.startsWith("+") ? c.green(l) : l.startsWith("-") ? c.red(l) : c.dim(l);
    if (kind === "command") return c.bold(l);
    if (l.startsWith("… (+")) return c.dim(l);
    return `${c.gray(String(i + 1).padStart(3))} ${action.tool === "write_file" ? c.green(l) : l}`;
  });
  if (lines.length > maxLines) shown.push(c.dim(t().ai.summary.moreLines(lines.length - maxLines)));
  return shown;
}

/** Tampilan agen di terminal (gaya ⏺ / ⎿). Jawaban AI dicetak bertahap per baris saat dialirkan. */
export class TerminalUI implements AgentUI {
  /** Jawaban yang sedang dialirkan: sisa baris yang belum lengkap, dan apakah baris pertama sudah dicetak. */
  private stream: { pending: string; started: boolean; md: MarkdownLines; streamed: boolean } | undefined;

  constructor(
    private readonly io: Output,
    private readonly verbose = false,
    /** Dipanggil sebelum mencetak apa pun (mis. untuk menghentikan spinner). */
    private readonly beforePrint: () => void = () => {},
  ) {}

  thinking(provider: string): void {
    this.stream = undefined;
    if (this.verbose) {
      this.beforePrint();
      this.io.out(c.dim(t().ai.terminal.thinking(provider)));
    }
  }

  assistantDelta(delta: string): void {
    const s = (this.stream ??= { pending: "", started: false, md: new MarkdownLines(), streamed: false });
    s.streamed = true;
    s.pending += delta;
    let nl: number;
    while ((nl = s.pending.indexOf("\n")) !== -1) {
      this.printStreamLine(s.pending.slice(0, nl));
      s.pending = s.pending.slice(nl + 1);
    }
  }

  private printStreamLine(raw: string): void {
    const s = this.stream!;
    // Lewati baris kosong di awal jawaban (model sering memulai dengan baris baru).
    if (!s.started && raw.trim() === "") return;
    const line = s.md.render(raw);
    if (line === undefined) return;
    this.beforePrint();
    if (!s.started) {
      s.started = true;
      this.io.out(`\n${accent("⏺")} ${line}`);
    } else this.io.out(`  ${line}`);
  }

  assistant(text: string, provider: string): void {
    const s = this.stream;
    this.stream = undefined;
    if (s?.streamed) {
      // Sudah tampil saat dialirkan: cetak sisa baris terakhir saja.
      this.stream = s;
      if (s.pending.trim()) this.printStreamLine(s.pending);
      this.stream = undefined;
      if (this.verbose) this.io.out(c.dim(`  (${provider})`));
      return;
    }
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
    // Jawaban yang terputus di tengah jalan akan diulang oleh provider berikutnya.
    this.stream = undefined;
    this.beforePrint();
    this.io.out(c.yellow(t().ai.terminal.unavailable(from, reason)));
    if (to) this.io.out(c.yellow(t().ai.terminal.switching(to)));
  }
}

/** Judul persetujuan beserta pratinjau berwarna. */
export function printApprovalHeader(io: Output, action: PendingAction): void {
  const critical = action.risk === "critical";
  io.out("");
  io.out(critical ? c.red(c.bold(`  ${t().ai.approval.critical}${action.summary}`)) : c.bold(`  ✎ ${action.summary}`));
  if (action.reason) io.out(c.red(`    ${t().ai.approval.needsApproval(action.reason)}`));
  const preview = formatPreview(action);
  if (preview.length) {
    io.out(c.gray("  ╭" + "─".repeat(40)));
    for (const line of preview) io.out(`${c.gray("  │")} ${line}`);
    io.out(c.gray("  ╰" + "─".repeat(40)));
  }
}

/** Prompter persetujuan lewat ketikan (dipakai untuk perintah satu kali `zusantara "..."`). */
export function terminalPrompter(rl: readline.Interface, io: Output): Prompter {
  return async (action: PendingAction): Promise<ApprovalAnswer> => {
    const critical = action.risk === "critical";
    printApprovalHeader(io, action);
    const m = t().ai.approval;
    const choices = critical ? m.promptCritical : m.prompt;
    for (;;) {
      const answer = (await rl.question(`  ${choices} > `)).trim().toLowerCase();
      if (m.yesWords.includes(answer)) return "yes";
      if (m.noWords.includes(answer)) return "no";
      if (!critical && m.allWords.includes(answer)) return "all";
    }
  };
}
