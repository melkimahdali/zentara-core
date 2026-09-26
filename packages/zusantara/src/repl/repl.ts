import readline from "node:readline";
import readlinePromises from "node:readline/promises";
import type { ApprovalAnswer } from "../ai/approval.js";
import { askSecret } from "../ai/setup.js";
import { accent, c, gold, printApprovalHeader, TerminalUI, type Output } from "../ai/terminal.js";
import { colorDepth, terminalLogo, visibleWidth } from "../brand/index.js";
import { t } from "../i18n/index.js";
import { PUSH_TITLE, RESTORE_TITLE, setTitle } from "../tui/layout.js";
import { createReplHost, hostCommands, type HostOptions, type HostStatus, type HostUI, type ReplHost, type Tone } from "./host.js";
import { Keys, select, Spinner, type Choice } from "./widgets.js";

export type ReplOptions = HostOptions & { io: Output };

/**
 * CLI interaktif klasik (`zusantara --classic`): tampilan readline biasa di atas inti yang sama dengan
 * tampilan Ink (createReplHost). Semua perintah garis miring, server dev, OmniRoute, dan sesi
 * tersimpan ditangani host; file ini hanya menggambar teks, spinner, dan menu panah.
 */
export async function startRepl(options: ReplOptions): Promise<number> {
  const { io } = options;
  const out = process.stdout;
  const keys = new Keys();
  const spinner = new Spinner();
  let busyLabel: string | undefined;
  let activeRl: readline.Interface | undefined;
  const history: string[] = [];

  const resumeSpinner = () => {
    if (busyLabel && !activeRl) spinner.start(busyLabel);
  };
  /** Keluaran AI (Markdown mengalir, tool) memakai tampilan terminal yang sama dengan `zusantara "..."`. */
  const term = new TerminalUI(io, false, () => spinner.clear());
  const paint: Record<Tone, (s: string) => string> = { info: (s) => s, ok: c.green, warn: c.yellow, error: c.red, dim: c.dim };

  /** Cetak satu baris tanpa merusak spinner atau baris input yang sedang diketik. */
  const print = (line: string) => {
    if (activeRl) {
      readline.clearLine(out, 0);
      readline.cursorTo(out, 0);
      io.out(line);
      activeRl.prompt(true);
      return;
    }
    spinner.clear();
    io.out(line);
    resumeSpinner();
  };

  const ui: HostUI = {
    thinking: () => {
      term.thinking("");
      ui.busy(t().tui.thinking);
    },
    delta: (text) => {
      term.assistantDelta(text);
      ui.busy(t().tui.writing);
    },
    assistant: (text) => term.assistant(text, ""),
    toolStart: (call) => {
      term.toolStart(call);
      ui.busy(t().tui.working);
    },
    toolEnd: (call, result) => {
      term.toolEnd(call, result);
      resumeSpinner();
    },
    notice: (text, tone = "info") => print(`  ${paint[tone](text)}`),
    approve: async (action, signal) => {
      if (signal?.aborted) return "no";
      spinner.clear();
      printApprovalHeader(io, action);
      const m = t().tui;
      const choices: Choice<ApprovalAnswer>[] = [{ label: m.yes, value: "yes" }];
      if (action.risk !== "critical") choices.push({ label: m.yesAll, value: "all" });
      choices.push({ label: m.no, value: "no" });
      const answer = await select(keys, action.risk === "critical" ? m.allowCritical : m.proceed, choices, "no");
      if (!signal?.aborted) resumeSpinner();
      return answer;
    },
    choose: async (question, choices, cancel) => {
      spinner.clear();
      io.out("");
      const answer = await select(keys, question, choices, cancel);
      resumeSpinner();
      return answer;
    },
    ask: async (question, askOptions = {}) => {
      spinner.clear();
      const rl = readlinePromises.createInterface({ input: process.stdin, output: out, terminal: true });
      try {
        const hint = askOptions.placeholder ? ` ${c.dim(`(${askOptions.placeholder})`)}` : "";
        const answer = askOptions.secret ? await askSecret(rl, `  ${question}: `) : await rl.question(`  ${question}${hint}: `);
        return answer.trim() || askOptions.placeholder || undefined;
      } catch {
        return undefined;
      } finally {
        rl.close();
      }
    },
    busy: (label) => {
      busyLabel = label;
      if (label) resumeSpinner();
      else spinner.stop();
    },
    changed: () => undefined,
    clear: () => {
      if (out.isTTY) out.write("\x1b[2J\x1b[H");
    },
    suspend: async (fn) => {
      spinner.stop();
      return fn();
    },
  };

  let host: ReplHost;
  try {
    host = await createReplHost(options, ui);
  } catch (err) {
    io.err(c.red((err as Error).message));
    return 1;
  }

  printBanner(io, host.info, host.status());
  // Judul tab terminal selama CLI terbuka; dikembalikan saat keluar.
  const tty = process.stdout.isTTY;
  if (tty) process.stdout.write(PUSH_TITLE + setTitle("zusantara"));
  const restoreTitle = () => {
    if (tty) process.stdout.write(RESTORE_TITLE);
  };

  const code = await host.startup().catch((err: unknown) => {
    io.out(c.red(`  ✗ ${(err as Error).message}`));
    return undefined;
  });
  if (code !== undefined) {
    await host.close();
    restoreTitle();
    return code;
  }

  /** Esc atau Ctrl+C menghentikan AI selama permintaan berjalan. */
  const whileRunning = async <T>(fn: () => Promise<T>): Promise<T> => {
    const release = keys.push((_str, key) => {
      if (key.name === "escape" || (key.ctrl && key.name === "c")) host.interrupt();
    });
    try {
      return await fn();
    } finally {
      spinner.stop();
      busyLabel = undefined;
      release();
    }
  };

  let lastCtrlC = 0;
  /** Baris status di atas input: mode persetujuan dan server dev. */
  const statusLine = (status: HostStatus): string => {
    const m = t().tui;
    const mode = status.mode === "auto" ? `${gold(m.modeAutoLine)}${c.dim(m.toggle)}` : c.dim(`${m.modeAskLine}${m.toggle}`);
    const s = status.server;
    const server =
      s.state === "running" || s.state === "external"
        ? `${c.green("●")} ${s.url}`
        : s.state === "starting"
          ? c.yellow(t().host.server.starting)
          : s.state === "crashed"
            ? c.red(t().host.server.crashed)
            : c.dim(s.state === "stopped" ? t().host.server.stopped : t().host.server.none);
    const cols = Math.max(20, (out.columns ?? 80) - 2);
    const gap = Math.max(2, cols - visibleWidth(mode) - visibleWidth(server));
    return `  ${mode}${" ".repeat(gap)}${server}`;
  };

  function readInput(): Promise<string | null> {
    io.out("");
    io.out(statusLine(host.status()));
    const completer = (line: string): [string[], string] => [line.startsWith("/") ? hostCommands().map(([cmd]) => cmd).filter((cmd) => cmd.startsWith(line)) : [], line];
    const rl = readline.createInterface({ input: process.stdin, output: out, terminal: true, history: [...history], historySize: 200, completer, removeHistoryDuplicates: true });
    activeRl = rl;
    const onKey = (_str: string | undefined, key: { name?: string; shift?: boolean } | undefined) => {
      if (key?.name === "tab" && key.shift) host.toggleMode();
    };
    process.stdin.on("keypress", onKey);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        activeRl = undefined;
        process.stdin.off("keypress", onKey);
        history.splice(0, history.length, ...((rl as unknown as { history?: string[] }).history ?? history));
        rl.close();
        resolve(value);
      };
      rl.on("SIGINT", () => {
        if (rl.line) {
          rl.write(null, { ctrl: true, name: "u" });
          return;
        }
        if (Date.now() - lastCtrlC < 2000) {
          out.write("\n");
          return finish(null);
        }
        lastCtrlC = Date.now();
        print(c.yellow(`  ${t().tui.pressAgain("Ctrl+C")}`));
      });
      rl.on("close", () => finish(null));
      rl.question(`${accent("❯")} `, (answer) => finish(answer));
    });
  }

  try {
    for (;;) {
      const line = await readInput();
      if (line === null) break;
      if (!line.trim()) continue;
      const result = await whileRunning(() => host.submit(line));
      if (result === "exit") break;
    }
  } finally {
    spinner.stop();
    await host.close();
    restoreTitle();
    io.out(c.dim(`  ${t().tui.goodbye}`));
  }
  return 0;
}

/** Header gaya Claude Code: logo Zusantara Core di kiri, versi, AI, dan folder di kanan. */
function printBanner(io: Output, info: { version: string; shortCwd: string }, status: HostStatus): void {
  const m = t().tui;
  const aiLine = status.provider
    ? c.dim(`${status.provider === "omniroute" ? m.freeOmniroute : status.provider} · ${status.mode === "auto" ? m.modeAuto : m.modeAsk}`)
    : c.yellow(m.aiNotSet);
  const lines = [`${c.bold("Zusantara")} ${c.bold(accent("Core"))} ${c.dim(`v${info.version}`)}`, aiLine, c.dim(info.shortCwd)];
  const columns = process.stdout.columns ?? 80;
  const mark = columns >= 56 ? terminalLogo(colorDepth(process.stdout)) : [];
  const markWidth = mark.length ? Math.max(...mark.map(visibleWidth)) : 0;
  // Mulai dari layar bersih seperti Claude Code (riwayat terminal tetap bisa di-scroll).
  if (process.stdout.isTTY) process.stdout.write("\x1b[2J\x1b[H");
  io.out("");
  if (mark.length && columns >= markWidth + 4 + 44) {
    mark.forEach((line, i) => io.out(` ${line}${" ".repeat(markWidth - visibleWidth(line))}   ${lines[i - 1] ?? ""}`.replace(/ +$/, "")));
  } else {
    for (const line of mark) io.out(` ${line}`);
    if (mark.length) io.out("");
    for (const line of lines) io.out(`  ${line}`);
  }
}
