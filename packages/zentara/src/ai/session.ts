import readline from "node:readline/promises";
import { t } from "../i18n/index.js";
import { Agent, type AgentResult, type AgentUI } from "./agent.js";
import { ApprovalPolicy, denyPrompter, type Prompter } from "./approval.js";
import { ProviderChain } from "./chain.js";
import { createProviders, type AiConfig } from "./config.js";
import { Journal } from "./journal.js";
import { projectSnapshot, SYSTEM_PROMPT } from "./prompt.js";
import { c, terminalPrompter, TerminalUI, type Output } from "./terminal.js";
import { agentTools, createDbRunner, createScriptRunner, type AgentTool } from "./tools.js";
import { createCommandRunner } from "./command.js";
import { estimateTokens, loadSession, newSessionId, saveSession } from "./sessions.js";

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
  /** Simpan percakapan ke .zentara/sessions setelah setiap permintaan (untuk /resume). */
  persist?: boolean;
}

export interface AiSession {
  run(task: string, options?: { signal?: AbortSignal }): Promise<AgentResult>;
  /** Mulai percakapan baru (riwayat dilupakan). */
  reset(): void;
  /** Lanjutkan percakapan tersimpan. false bila sesi tidak ditemukan. */
  resume(id: string): boolean;
  /** Ringkas percakapan. Mengembalikan perkiraan token sebelum & sesudah, atau undefined bila terlalu pendek. */
  compact(options?: { signal?: AbortSignal }): Promise<{ before: number; after: number } | undefined>;
  /** ID sesi saat ini (nama file di .zentara/sessions). */
  readonly id: string;
  /** Perkiraan jumlah token percakapan saat ini. */
  readonly tokens: number;
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
    runCommand: createCommandRunner(root),
    allowedCommands: config.allowedCommands,
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
  let id = newSessionId();
  let title = "";
  let createdAt = new Date().toISOString();

  function persist(): void {
    if (!options.persist || agent.history.length === 0) return;
    try {
      saveSession(root, { id, title, createdAt, updatedAt: new Date().toISOString(), messages: agent.history });
    } catch (err) {
      ui.info(t().ai.session.saveFailed((err as Error).message));
    }
  }

  async function compact(signal?: AbortSignal): Promise<{ before: number; after: number } | undefined> {
    const before = estimateTokens(agent.history);
    if (!(await agent.compact({ signal }))) return undefined;
    // Ringkasan tidak memuat gambaran proyek: sertakan lagi di permintaan berikutnya.
    first = true;
    persist();
    return { before, after: estimateTokens(agent.history) };
  }

  return {
    approval,
    chain,
    get id() {
      return id;
    },
    get tokens() {
      return estimateTokens(agent.history);
    },
    async run(task, runOptions = {}) {
      const limit = config.compactAt;
      if (limit > 0 && estimateTokens(agent.history) > limit) {
        ui.info(t().ai.session.compacting(Math.round(estimateTokens(agent.history) / 1000)));
        try {
          await compact(runOptions.signal);
        } catch (err) {
          ui.info(t().ai.session.compactFailed((err as Error).message));
        }
      }
      const text = first ? `<project>\n${projectSnapshot(root)}\n</project>\n\n${task}` : task;
      first = false;
      title ||= task.split("\n")[0]!.slice(0, 100);
      // Satu jurnal per perintah, jadi `zentara undo` membatalkan perintah terakhir saja.
      context.journal = new Journal(root, task);
      try {
        return await agent.run(text, runOptions);
      } finally {
        persist();
      }
    },
    reset() {
      agent.reset();
      first = true;
      id = newSessionId();
      title = "";
      createdAt = new Date().toISOString();
    },
    resume(sessionId) {
      const saved = loadSession(root, sessionId);
      if (!saved) return false;
      agent.load(saved.messages);
      id = saved.id;
      title = saved.title;
      createdAt = saved.createdAt;
      first = saved.messages.length === 0;
      return true;
    },
    compact: (compactOptions = {}) => compact(compactOptions.signal),
  };
}

/** Ringkasan akhir satu perintah AI untuk terminal. */
export function printResult(io: Output, result: AgentResult): void {
  const m = t().ai.session;
  const color = result.status === "done" ? c.green : result.status === "verification_failed" ? c.red : c.yellow;
  io.out(`${color(m.result[result.status])} ${c.dim(m.steps(result.steps, result.providersUsed.join(", ")))}`);
  if (result.changedFiles.length) io.out(c.dim(m.changedFiles(result.changedFiles.join(", "))));
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
