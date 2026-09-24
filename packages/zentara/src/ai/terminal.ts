import readline from "node:readline/promises";
import type { AgentUI } from "./agent.js";
import type { ApprovalAnswer, PendingAction, Prompter } from "./approval.js";
import type { ToolCall, ToolResult } from "./types.js";

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
export const c = { dim: paint("2"), bold: paint("1"), red: paint("31"), green: paint("32"), yellow: paint("33"), cyan: paint("36") };

export interface Output {
  out: (line: string) => void;
  err: (line: string) => void;
}

function summarizeCall(call: ToolCall): string {
  const input = (call.input ?? {}) as Record<string, unknown>;
  const main = input.path ?? input.query ?? input.check ?? input.name ?? input.action;
  return typeof main === "string" ? `${call.name} ${main}` : call.name;
}

export class TerminalUI implements AgentUI {
  constructor(private readonly io: Output, private readonly verbose = false) {}

  thinking(provider: string): void {
    if (this.verbose) this.io.out(c.dim(`… ${provider} berpikir`));
  }

  assistant(text: string, provider: string): void {
    this.io.out(`\n${c.cyan("◆ Zentara AI")} ${c.dim(`(${provider})`)}\n${text}\n`);
  }

  toolStart(call: ToolCall): void {
    this.io.out(c.dim(`  ⚙ ${summarizeCall(call)}`));
  }

  toolEnd(call: ToolCall, result: ToolResult): void {
    if (result.isError) this.io.out(c.yellow(`    ✗ ${result.content.split("\n")[0]}`));
    else if (/^(write_file|edit_file|delete_file|install_package|database)$/.test(call.name)) {
      this.io.out(c.green(`    ✓ ${result.content.split("\n")[0]}`));
    }
  }

  info(message: string): void {
    this.io.out(c.dim(`» ${message}`));
  }

  fallback(from: string, reason: string, to: string | undefined): void {
    this.io.out(c.yellow(`✗ ${from} tidak tersedia: ${reason}`));
    if (to) this.io.out(c.yellow(`→ pindah ke ${to}...`));
  }
}

/** Prompter persetujuan interaktif lewat terminal. */
export function terminalPrompter(rl: readline.Interface, io: Output): Prompter {
  return async (action: PendingAction): Promise<ApprovalAnswer> => {
    const critical = action.risk === "critical";
    io.out("");
    io.out(critical ? c.red(c.bold(`⚠ AKSI KRUSIAL: ${action.summary}`)) : c.bold(`✎ ${action.summary}`));
    if (action.reason) io.out(c.red(`  Alasan perlu persetujuan: ${action.reason}`));
    if (action.preview) io.out(c.dim(action.preview.split("\n").map((l) => `  │ ${l}`).join("\n")));
    const choices = critical ? "[y] ya  [n] tidak" : "[y] ya  [n] tidak  [s] setujui semua perubahan biasa";
    for (;;) {
      const answer = (await rl.question(`  ${choices} > `)).trim().toLowerCase();
      if (["y", "ya", "yes"].includes(answer)) return "yes";
      if (["n", "t", "tidak", "no", ""].includes(answer)) return "no";
      if (!critical && ["s", "semua", "all", "a"].includes(answer)) return "all";
    }
  };
}
