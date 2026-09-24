import readline from "node:readline/promises";
import { Agent, type AgentResult, type AgentUI } from "./agent.js";
import { ApprovalPolicy, denyPrompter, type Prompter } from "./approval.js";
import { ProviderChain } from "./chain.js";
import { createProviders, type AiConfig } from "./config.js";
import { Journal } from "./journal.js";
import { projectSnapshot, SYSTEM_PROMPT } from "./prompt.js";
import { c, terminalPrompter, TerminalUI, type Output } from "./terminal.js";
import { agentTools, createDbRunner, createScriptRunner, type AgentTool } from "./tools.js";

/** Tampilan sesi AI: terminal, browser (devtools), atau tes. */
export interface SessionUI extends AgentUI {
  fallback(from: string, reason: string, to: string | undefined): void;
}

export interface AiSessionOptions {
  root: string;
  config: AiConfig;
  ui: SessionUI;
  /** Penanya persetujuan; tanpa ini semua aksi yang butuh persetujuan ditolak. */
  prompter?: Prompter;
  dryRun?: boolean;
  /** Tool tambahan di luar tool bawaan (mis. kendali server dev dari CLI interaktif). */
  extraTools?: AgentTool[];
}

export interface AiSession {
  run(task: string, options?: { signal?: AbortSignal }): Promise<AgentResult>;
  /** Mulai percakapan baru (riwayat dilupakan). */
  reset(): void;
  readonly approval: ApprovalPolicy;
  readonly chain: ProviderChain;
}

export function createAiSession(options: AiSessionOptions): AiSession {
  const { root, config, ui } = options;
  const chain = new ProviderChain(createProviders(config.providers), {
    onFallback: (from, reason, to) => ui.fallback(from.name, reason, to?.name),
  });
  const approval = new ApprovalPolicy(config.mode, options.prompter ?? denyPrompter);
  const context = {
    root,
    approval,
    journal: new Journal(root, ""),
    dryRun: options.dryRun ?? false,
    runScript: createScriptRunner(root),
    runDb: createDbRunner(root),
  };
  const agent = new Agent({
    chain,
    tools: [...agentTools, ...(options.extraTools ?? [])],
    system: SYSTEM_PROMPT,
    ui,
    maxSteps: config.maxSteps,
    context,
  });

  let first = true;
  return {
    approval,
    chain,
    async run(task, runOptions = {}) {
      const text = first ? `<project>\n${projectSnapshot(root)}\n</project>\n\n${task}` : task;
      first = false;
      // Satu jurnal per perintah, jadi `zentara undo` membatalkan perintah terakhir saja.
      context.journal = new Journal(root, task);
      return agent.run(text, runOptions);
    },
    reset() {
      agent.reset();
      first = true;
    },
  };
}

/** Ringkasan akhir satu perintah AI untuk terminal. */
export function printResult(io: Output, result: AgentResult): void {
  const statusText = {
    done: c.green("✓ Selesai"),
    incomplete: c.yellow("… Belum selesai (batas langkah)"),
    refused: c.yellow("✗ Ditolak model"),
    verification_failed: c.red("✗ Verifikasi gagal"),
    interrupted: c.yellow("■ Dihentikan"),
  }[result.status];
  const providers = result.providersUsed.length ? ` · provider: ${result.providersUsed.join(", ")}` : "";
  io.out(`${statusText} ${c.dim(`· ${result.steps} langkah${providers}`)}`);
  if (result.changedFiles.length) io.out(c.dim(`  File berubah: ${result.changedFiles.join(", ")}  (batalkan dengan: zentara undo)`));
}

export interface TerminalSessionOptions {
  root: string;
  config: AiConfig;
  io: Output;
  dryRun?: boolean;
  verbose?: boolean;
  rl?: readline.Interface;
}

/** Sesi AI untuk satu perintah di terminal (`zentara "..."`), dengan ringkasan di akhir. */
export function createTerminalSession(options: TerminalSessionOptions): { run(task: string): Promise<AgentResult> } {
  const session = createAiSession({
    root: options.root,
    config: options.config,
    ui: new TerminalUI(options.io, options.verbose),
    prompter: options.rl ? terminalPrompter(options.rl, options.io) : undefined,
    dryRun: options.dryRun,
  });
  return {
    async run(task) {
      const result = await session.run(task);
      printResult(options.io, result);
      return result;
    },
  };
}
