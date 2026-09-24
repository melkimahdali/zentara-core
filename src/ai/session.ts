import readline from "node:readline/promises";
import { Agent, type AgentResult } from "./agent.js";
import { ApprovalPolicy, denyPrompter } from "./approval.js";
import { ProviderChain } from "./chain.js";
import { createProviders, type AiConfig } from "./config.js";
import { Journal } from "./journal.js";
import { projectSnapshot, SYSTEM_PROMPT } from "./prompt.js";
import { c, terminalPrompter, TerminalUI, type Output } from "./terminal.js";
import { agentTools, createDbRunner, createScriptRunner } from "./tools.js";

export interface SessionOptions {
  root: string;
  config: AiConfig;
  io: Output;
  dryRun?: boolean;
  verbose?: boolean;
  /** Readline untuk pertanyaan persetujuan; tanpa ini semua aksi yang butuh persetujuan ditolak. */
  rl?: readline.Interface;
}

export interface AiSession {
  run(task: string): Promise<AgentResult>;
}

export function createAiSession(options: SessionOptions): AiSession {
  const { root, config, io } = options;
  const ui = new TerminalUI(io, options.verbose);
  const chain = new ProviderChain(createProviders(config.providers), {
    onFallback: (from, reason, to) => ui.fallback(from.name, reason, to?.name),
  });
  const prompter = options.rl ? terminalPrompter(options.rl, io) : denyPrompter;
  const approval = new ApprovalPolicy(config.mode, prompter);
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
    tools: agentTools,
    system: SYSTEM_PROMPT,
    ui,
    maxSteps: config.maxSteps,
    context,
  });

  let first = true;
  return {
    async run(task: string) {
      const text = first ? `<project>\n${projectSnapshot(root)}\n</project>\n\n${task}` : task;
      first = false;
      // Satu jurnal per perintah, jadi `zentara undo` membatalkan perintah terakhir saja.
      context.journal = new Journal(root, task);
      const result = await agent.run(text);
      const files = result.changedFiles;
      const statusText = {
        done: c.green("✓ Selesai"),
        incomplete: c.yellow("… Belum selesai (batas langkah)"),
        refused: c.yellow("✗ Ditolak model"),
        verification_failed: c.red("✗ Verifikasi gagal"),
      }[result.status];
      io.out(`${statusText} ${c.dim(`· ${result.steps} langkah · provider: ${result.providersUsed.join(", ")}`)}`);
      if (files.length) io.out(c.dim(`  File berubah: ${files.join(", ")}  (batalkan dengan: zentara undo)`));
      return result;
    },
  };
}
