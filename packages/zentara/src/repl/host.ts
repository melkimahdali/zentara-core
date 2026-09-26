import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { AgentResult } from "../ai/agent.js";
import type { ApprovalAnswer, PendingAction } from "../ai/approval.js";
import { createProviders, type AiConfig } from "../ai/config.js";
import { latestJournal, undoLatest } from "../ai/journal.js";
import { installOmniRoute, nodeSupportsOmniRoute, OMNIROUTE, OMNIROUTE_TIPS, omnirouteEnv, omnirouteInstalled } from "../ai/omniroute.js";
import { createAiSession, type AiSession, type SessionUI } from "../ai/session.js";
import { listSessions, loadSession } from "../ai/sessions.js";
import type { SetupPrompts } from "../ai/setup.js";
import { renderMarkdown, toolResultSummary, toolTitle, type Output } from "../ai/terminal.js";
import { ToolError, type AgentTool } from "../ai/tools.js";
import { ProviderUnavailableError, type ToolCall, type ToolResult } from "../ai/types.js";
import { startDevtools, type AiLock, type Devtools } from "../dev/devtools.js";
import { BackgroundProcess, DevServer, isServerUp, killTree, openBrowser, waitForUrl } from "../dev/server.js";
import { platformCommand } from "../process.js";
import { DOCS_URL } from "../brand/index.js";
import { getLocale, LOCALE_NAMES, parseLocale, setLocale, t, writeSettings, type Locale } from "../i18n/index.js";

/**
 * Inti CLI interaktif tanpa tampilan: sesi AI, server dev, OmniRoute, dan perintah garis miring.
 * Tampilan apa pun (tampilan Ink bawaan di src/tui, atau tampilan lain) cukup mengimplementasikan HostUI.
 * Naikkan HOST_API bila kontrak ini berubah tidak kompatibel.
 */
export const HOST_API = 1;

export type Tone = "info" | "ok" | "warn" | "error" | "dim";

export interface HostChoice<T> {
  label: string;
  value: T;
  hint?: string;
}

export interface HostUI {
  /** AI mulai memanggil model (tampilkan indikator "Berpikir"). */
  thinking(): void;
  /** Potongan jawaban AI yang sedang dialirkan (teks mentah Markdown). */
  delta(text: string): void;
  /** Jawaban AI selesai: teks lengkap (Markdown) dan versi ANSI yang sudah dirender untuk terminal. */
  assistant(text: string, rendered: string): void;
  /** Tool mulai/selesai; `title` & `summary` sudah diformat (mis. "Baca(src/a.ts)", "12 baris"). */
  toolStart(call: ToolCall, title: string): void;
  toolEnd(call: ToolCall, result: ToolResult, summary: string): void;
  /** Pemberitahuan satu baris (hasil perintah, status server, info agen). */
  notice(text: string, tone?: Tone): void;
  /** Minta persetujuan aksi. */
  approve(action: PendingAction, signal?: AbortSignal): Promise<ApprovalAnswer>;
  /** Menu pilihan (↑/↓). `cancel` dipakai bila pengguna menekan Esc. */
  choose<T>(question: string, choices: HostChoice<T>[], cancel: T): Promise<T>;
  /** Input teks bebas; undefined bila dibatalkan. */
  ask(question: string, options?: { secret?: boolean; placeholder?: string }): Promise<string | undefined>;
  /** Label indikator sibuk; undefined = berhenti. */
  busy(label: string | undefined): void;
  /** Status/mode berubah: gambar ulang baris status. */
  changed(): void;
  /** Opsional: kosongkan riwayat di layar (dipakai `/clear` pada tampilan layar penuh). */
  clear?(): void;
  /**
   * Serahkan terminal ke proses lain (mis. `npm create zentara`, `npm install -g omniroute`) lalu kembali.
   * Tampilan harus berhenti membaca keyboard selama fn berjalan.
   */
  suspend<T>(fn: () => Promise<T>): Promise<T>;
}

export interface HostOptions {
  cwd: string;
  version: string;
  checkUpdate?: () => Promise<string | undefined>;
  loadConfig: () => Promise<AiConfig>;
  serverEnv: NodeJS.ProcessEnv;
  fallbackDev: { command: string; args: string[] };
  appPort: number;
  offerDevServer: boolean;
  runSetup: (prompts: SetupPrompts, preset?: string, io?: Output) => Promise<number>;
  dryRun?: boolean;
  continueLast?: boolean;
  /** Bahasa belum pernah dipilih (tanpa ZENTARA_LANG, `locale` di config, atau `zentara lang`): tanyakan saat dibuka. */
  askLanguage?: boolean;
}

export interface HostStatus {
  server: { state: "running" | "starting" | "crashed" | "stopped" | "external" | "none"; url?: string };
  mode: "ask" | "auto";
  /** Provider AI yang siap (atau undefined bila belum diatur). */
  provider?: string;
  /** Perkiraan token percakapan. */
  tokens: number;
  busy: boolean;
}

export interface HostInfo {
  version: string;
  cwd: string;
  shortCwd: string;
  isProject: boolean;
  dryRun: boolean;
}

/** Perintah garis miring beserta keterangannya, dalam bahasa aktif. */
export function hostCommands(): [string, string][] {
  return t().host.commands;
}

/** @deprecated Pakai hostCommands() (mengikuti bahasa aktif). */
export const HOST_COMMANDS: [string, string][] = hostCommands();

export interface ReplHost {
  readonly info: HostInfo;
  status(): HostStatus;
  /** Alur pembuka: proyek baru, akses AI, OmniRoute, server dev. Mengembalikan kode keluar bila CLI harus selesai. */
  startup(): Promise<number | undefined>;
  /** Proses satu baris input (perintah garis miring atau tugas AI). "exit" = pengguna ingin keluar. */
  submit(line: string): Promise<"exit" | void>;
  /** Hentikan tugas AI yang sedang berjalan (Esc). */
  interrupt(): void;
  /** Ganti mode persetujuan (Shift+Tab). */
  toggleMode(): void;
  /** Rapikan semua proses latar (server dev, OmniRoute, devtools). */
  close(): Promise<void>;
}

function shortPath(p: string): string {
  const home = os.homedir();
  return p === home || p.startsWith(home + path.sep) ? "~" + p.slice(home.length) : p;
}

function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60_000));
  const m = t().host.ago;
  if (minutes < 1) return m.now;
  if (minutes < 60) return m.minutes(minutes);
  const hours = Math.round(minutes / 60);
  if (hours < 24) return m.hours(hours);
  return m.days(Math.round(hours / 24));
}

export async function createReplHost(options: HostOptions, ui: HostUI): Promise<ReplHost> {
  const { cwd } = options;
  let config = await options.loadConfig();
  const isProject = fs.existsSync(path.join(cwd, "src", "app"));
  let externalServer: string | undefined;
  let controller: AbortController | undefined;
  let serverNoticeAt = 0;

  const lock: AiLock = { owner: undefined };
  let devtools: Devtools | undefined;
  try {
    devtools = await startDevtools({ root: cwd, loadConfig: options.loadConfig, lock, log: (l) => ui.notice(l.replace(/\x1b\[[0-9;]*m/g, "").trim(), "dim") });
  } catch {
    devtools = undefined;
  }

  const devServer = new DevServer({ cwd, env: { ...options.serverEnv, ...devtools?.env }, fallback: options.fallbackDev });
  let announcedReady = false;
  devServer.on("ready", (url: string) => {
    if (!announcedReady) {
      announcedReady = true;
      ui.notice(t().host.serverRunning(url, Boolean(devtools)), "ok");
    }
    ui.changed();
  });
  devServer.on("problem", (line: string) => {
    if (Date.now() - serverNoticeAt < 4000) return;
    serverNoticeAt = Date.now();
    ui.notice(t().host.serverProblem(line.trim().slice(0, 140)), "warn");
  });
  devServer.on("exit", (code: number | null) => {
    announcedReady = false;
    if (code) ui.notice(t().host.serverStopped(code), "error");
    ui.changed();
  });

  async function waitForServer(timeoutMs = 25_000): Promise<string> {
    if (devServer.state === "running" && devServer.url) return `Server running at ${devServer.url}`;
    return new Promise((resolve) => {
      const done = (text: string) => {
        clearTimeout(timer);
        devServer.off("ready", onReady);
        devServer.off("exit", onExit);
        resolve(text);
      };
      const onReady = (url: string) => done(`Server running at ${url}`);
      const onExit = () => done(`Server stopped. Latest logs:\n${devServer.logs(30).join("\n")}`);
      const timer = setTimeout(() => done(`Server not ready after ${timeoutMs / 1000} seconds. Logs:\n${devServer.logs(30).join("\n")}`), timeoutMs);
      devServer.on("ready", onReady);
      devServer.on("exit", onExit);
    });
  }

  const devServerTool: AgentTool = {
    spec: {
      name: "dev_server",
      description:
        "The development server (npm run dev) running in the background of this CLI. status = check whether it runs and its URL; logs = read the latest server logs (to see runtime errors); start/restart = start or restart it (always asks the developer). The server reloads automatically when files change, so a restart is rarely needed.",
      inputSchema: {
        type: "object",
        properties: { action: { type: "string", enum: ["status", "logs", "start", "restart"] } },
        required: ["action"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const action = input.action;
      if (action === "status") {
        if (externalServer) return `The server already runs in another terminal: ${externalServer} (logs are not available here).`;
        return `state: ${devServer.state}${devServer.url ? `\nurl: ${devServer.url}` : ""}`;
      }
      if (action === "logs") return externalServer ? "The server runs in another terminal; logs are not available." : devServer.logs(80).join("\n") || "(empty log)";
      if (action !== "start" && action !== "restart") throw new ToolError("action must be status, logs, start, or restart");
      if (externalServer) throw new ToolError(`The server already runs in another terminal (${externalServer}).`);
      const approved = await ctx.approval.approve(
        {
          tool: "dev_server",
          risk: "critical",
          reason: t().ai.approval.devServerReason(devServer.commandText),
          summary: action === "start" ? t().ai.approval.devServerStart(devServer.commandText) : t().ai.approval.devServerRestart,
        },
        ctx.signal,
      );
      if (!approved) throw new ToolError("The developer declined. Do not retry; tell them how to start it themselves (/dev start).");
      if (action === "restart") await devServer.stop();
      devServer.start();
      ui.changed();
      return waitForServer();
    },
  };

  const sessionUI: SessionUI = {
    thinking: () => ui.thinking(),
    assistantDelta: (d) => ui.delta(d),
    assistant: (text) => ui.assistant(text, renderMarkdown(text)),
    toolStart: (call) => ui.toolStart(call, toolTitle(call).replace(/\x1b\[[0-9;]*m/g, "")),
    toolEnd: (call, result) => ui.toolEnd(call, result, toolResultSummary(call, result)),
    info: (m) => ui.notice(m, "dim"),
    fallback: (from, reason, to) => ui.notice(t().host.fallback(from, reason, to), "warn"),
  };
  const newSession = (cfg: AiConfig): AiSession =>
    createAiSession({ root: cwd, config: cfg, ui: sessionUI, prompter: (a, s) => ui.approve(a, s), dryRun: options.dryRun, extraTools: [devServerTool], persist: true });
  let session = newSession(config);

  /** Output wizard ai:setup diteruskan sebagai pemberitahuan. */
  const setupIo: Output = {
    out: (l) => {
      const text = l.replace(/\x1b\[[0-9;]*m/g, "");
      if (text.trim()) ui.notice(text, /✓/.test(text) ? "ok" : /✗|gagal|failed/i.test(text) ? "error" : "info");
    },
    err: (l) => ui.notice(l.replace(/\x1b\[[0-9;]*m/g, ""), "error"),
  };
  const setupPrompts: SetupPrompts = {
    choose: (question, choices, fallback) => ui.choose(question, choices, fallback),
    ask: async (question) => ((await ui.ask(question)) ?? "").trim(),
    secret: async (question) => ((await ui.ask(question, { secret: true })) ?? "").trim(),
    confirm: (question, defaultYes = true) =>
      ui.choose(question, defaultYes ? [{ label: t().host.yes, value: true }, { label: t().host.no, value: false }] : [{ label: t().host.no, value: false }, { label: t().host.yes, value: true }], false),
  };

  async function runSetupWizard(preset?: string): Promise<void> {
    await options.runSetup(setupPrompts, preset, setupIo);
    try {
      config = await options.loadConfig();
      session = newSession(config);
      readyProvider = await readiness(config);
      ui.notice(t().host.providersNow(config.providers.map((p) => p.name ?? "claude").join(" → ")), "dim");
    } catch (err) {
      ui.notice((err as Error).message, "error");
    }
    ui.changed();
  }

  async function readiness(cfg: AiConfig): Promise<string | undefined> {
    const checks = await Promise.all(
      cfg.providers.map(async (p) => {
        if (p.type === "anthropic") return p.apiKey || process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN ? p.name ?? "claude" : undefined;
        if (/^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(p.baseUrl)) return (await isServerUp(`${p.baseUrl.replace(/\/+$/, "")}/models`)) ? p.name : undefined;
        return p.apiKey ? p.name : undefined;
      }),
    );
    return checks.find(Boolean);
  }
  let readyProvider = await readiness(config);

  // ── OmniRoute ───────────────────────────────────────────────────────────
  let omniroute: BackgroundProcess | undefined;
  let omniUrl: string | undefined;
  const first = config.providers[0];
  const isLocalOmni = first?.type === "openai-compatible" && first.name === "omniroute" && /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(first.baseUrl);
  if (isLocalOmni) omniUrl = `${first.baseUrl.replace(/\/+$/, "")}/models`;

  async function startOmniRoute(): Promise<boolean> {
    if (!omniUrl) return false;
    if (await isServerUp(omniUrl)) return true;
    omniroute = new BackgroundProcess(OMNIROUTE.command, [], { cwd, env: omnirouteEnv(options.serverEnv) });
    omniroute.start();
    ui.busy(t().host.busyOmniroute);
    const ok = await waitForUrl(omniUrl, 90_000, () => omniroute!.running);
    ui.busy(undefined);
    if (ok) {
      ui.notice(t().host.omnirouteRunning(OMNIROUTE.dashboard), "ok");
      for (const tip of OMNIROUTE_TIPS()) ui.notice(`  ${tip}`, "dim");
    } else {
      ui.notice(t().host.omnirouteNotReady, "warn");
      for (const line of omniroute.logs(8)) ui.notice(`  │ ${line}`, "dim");
    }
    readyProvider = await readiness(config);
    ui.changed();
    return ok;
  }

  async function installOmni(): Promise<boolean> {
    if (!nodeSupportsOmniRoute()) {
      ui.notice(t().host.omnirouteNeedsNode(process.version), "warn");
      return false;
    }
    ui.notice(t().host.omnirouteInstalling, "dim");
    const ok = await ui.suspend(() => installOmniRoute());
    if (!ok || !omnirouteInstalled()) {
      ui.notice(t().host.omnirouteInstallFailed, "warn");
      return false;
    }
    ui.notice(t().host.omnirouteInstalled, "ok");
    return true;
  }

  /**
   * Buat proyek baru tanpa keluar dari tampilan Zentara: nama folder dan template ditanyakan di sini,
   * lalu create-zentara berjalan di latar belakang (tanpa pertanyaan) dengan progres di spinner.
   * Setelah selesai, Zentara dibuka di folder proyek baru. undefined = batal, lanjut di folder ini.
   */
  /** Pilih bahasa (dua bahasa sekaligus di pertanyaannya) dan simpan sebagai preferensi global. */
  async function chooseLanguage(): Promise<Locale> {
    const chosen = await ui.choose<Locale>("Bahasa / Language", [
      { label: "Bahasa Indonesia", value: "id", hint: "id" },
      { label: "English", value: "en", hint: "en" },
    ], getLocale());
    setLocale(chosen);
    try {
      writeSettings({ locale: chosen });
    } catch {
      // Folder pengaturan tidak bisa ditulis: bahasa tetap dipakai untuk sesi ini.
    }
    return chosen;
  }

  /** Proses create-zentara yang sedang berjalan (Esc membatalkannya). */
  let creation: { child: ChildProcess | undefined; cancelled: boolean } | undefined;

  async function createProject(): Promise<number | undefined> {
    // Bahasa yang sedang dipakai ditaruh paling atas (pilihan yang disorot).
    const langs: { label: string; value: Locale; hint: string }[] = [
      { label: "Bahasa Indonesia", value: "id", hint: t().host.projectLanguageHint },
      { label: "English", value: "en", hint: t().host.projectLanguageHint },
    ];
    const lang = await ui.choose<Locale>(t().host.projectLanguage, [...langs.filter((l) => l.value === getLocale()), ...langs.filter((l) => l.value !== getLocale())], getLocale());
    const m = t().host;
    const answer = await ui.ask(m.projectFolder, { placeholder: "zentara-app" });
    if (answer === undefined) return undefined;
    const name = projectSlug(answer) || "zentara-app";
    if (name !== answer.trim()) ui.notice(m.projectSlug(name), "dim");
    const target = path.resolve(cwd, name);
    if (fs.existsSync(target) && fs.readdirSync(target).length > 0) {
      ui.notice(m.projectExists(name), "warn");
      return undefined;
    }
    const template = await ui.choose(m.projectTemplate, [
      { label: "api", value: "api", hint: m.templateApi },
      { label: "minimal", value: "minimal", hint: m.templateMinimal },
    ], "api");

    const label = m.creatingProject(name);
    ui.busy(label);
    const tail: string[] = [];
    creation = { child: undefined, cancelled: false };
    const code = await new Promise<number>((resolve) => {
      // npx --yes: tanpa pertanyaan "Ok to proceed?"; create-zentara --yes: tanpa pertanyaan lanjutan.
      // ZENTARA_CREATE_PACKAGE / ZENTARA_CREATE_ARGS: untuk uji e2e (tarball lokal, --zentara-spec file:...).
      const pkg = process.env.ZENTARA_CREATE_PACKAGE || "create-zentara@latest";
      const extra = (process.env.ZENTARA_CREATE_ARGS ?? "").split(/\s+/).filter(Boolean);
      const cmd = platformCommand("npx", ["--yes", `--package=${pkg}`, "--", "create-zentara", name, "--template", template, "--lang", lang, "--yes", ...extra]);
      // detached (selain Windows): Esc menghentikan seluruh grup proses (npx, npm install, ...).
      const child = spawn(cmd.command, cmd.args, { cwd, stdio: ["ignore", "pipe", "pipe"], shell: cmd.shell, detached: process.platform !== "win32", env: { ...process.env, FORCE_COLOR: "0" } });
      creation!.child = child;
      const onData = (chunk: Buffer) => {
        for (const raw of chunk.toString("utf8").split(/\r?\n/)) {
          const line = raw.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "").trim();
          if (!line) continue;
          tail.push(line);
          if (tail.length > 12) tail.shift();
          ui.busy(`${label} · ${line.length > 60 ? `${line.slice(0, 59)}…` : line}`);
        }
      };
      child.stdout?.on("data", onData);
      child.stderr?.on("data", onData);
      child.on("error", () => resolve(1));
      child.on("close", (c2) => resolve(c2 ?? 1));
    });
    ui.busy(undefined);
    const cancelled = creation.cancelled;
    creation = undefined;
    ui.changed();
    if (cancelled) {
      // Folder tujuan tadinya kosong atau belum ada: hapus sisa proyek yang setengah jadi.
      fs.rmSync(target, { recursive: true, force: true });
      ui.notice(m.projectCancelled, "warn");
      return undefined;
    }
    if (code !== 0 || !fs.existsSync(path.join(target, "src", "app"))) {
      ui.notice(m.projectCreateFailed(tail.map((l) => `  ${l}`).join("\n")), "error");
      return undefined;
    }
    ui.notice(m.projectReady(shortPath(target), name).trim(), "ok");
    await devtools?.close();
    // Zentara di folder proyek baru mengambil alih terminal; saat ditutup, CLI ini ikut selesai.
    return ui.suspend(
      () =>
        new Promise<number>((resolve) => {
          const child = spawn(process.execPath, [...process.execArgv, process.argv[1]!], { cwd: target, stdio: "inherit" });
          child.on("close", (c2) => resolve(c2 ?? 0));
          child.on("error", () => resolve(1));
        }),
    );
  }

  function resumeSession(id: string): void {
    const saved = loadSession(cwd, id);
    if (!saved || !session.resume(id)) {
      ui.notice(t().host.sessionNotFound, "warn");
      return;
    }
    ui.notice(t().host.resuming(saved.title.slice(0, 80), ago(saved.updatedAt)), "ok");
    const clip = (t: string) => t.replace(/<project>[\s\S]*?<\/project>\s*/, "").replace(/\s+/g, " ").trim().slice(0, 160);
    const lastUser = [...saved.messages].reverse().find((m) => m.role === "user" && !m.text.startsWith("["));
    const lastAi = [...saved.messages].reverse().find((m) => m.role === "assistant" && m.text.trim());
    if (lastUser?.role === "user") ui.notice(`  ❯ ${clip(lastUser.text)}`, "dim");
    if (lastAi?.role === "assistant") ui.notice(`  ⏺ ${clip(lastAi.text)}`, "dim");
    ui.changed();
  }

  const confirm = (question: string) => ui.choose(question, [{ label: t().host.yes, value: true }, { label: t().host.no, value: false }], false);

  async function runTask(task: string): Promise<void> {
    if (lock.owner) {
      ui.notice(t().host.aiBusy(lock.owner === "terminal" ? t().host.terminal : lock.owner), "warn");
      return;
    }
    lock.owner = "terminal";
    controller = new AbortController();
    ui.changed();
    let result: AgentResult | undefined;
    try {
      result = await session.run(task, { signal: controller.signal });
    } catch (err) {
      ui.notice(`✗ ${(err as Error).message}`, "error");
    } finally {
      ui.busy(undefined);
      controller = undefined;
      lock.owner = undefined;
      ui.changed();
    }
    if (!result) return;
    const label = t().host.result[result.status];
    const tone: Tone = result.status === "done" ? "ok" : result.status === "verification_failed" ? "error" : "warn";
    const files = result.changedFiles.length ? t().host.filesChanged(result.changedFiles.length) : "";
    ui.notice(t().host.steps(label, result.steps, result.providersUsed.join(", "), files), tone);
    if (result.changedFiles.length && devServer.url) ui.notice(t().host.seeResult(devServer.url), "dim");
  }

  function serverLine(): string {
    const s = host.status().server;
    if (s.state === "external" || s.state === "running") return `● ${s.url}`;
    if (s.state === "starting") return t().host.server.starting;
    if (s.state === "crashed") return t().host.server.crashed;
    if (s.state === "stopped") return t().host.server.stopped;
    return t().host.server.none;
  }

  async function command(line: string): Promise<"exit" | void> {
    const [cmd, ...rest] = line.slice(1).trim().split(/\s+/);
    const arg = rest.join(" ");
    switch (cmd) {
      case "help":
      case "?":
        for (const [name, desc] of hostCommands()) ui.notice(`${name.padEnd(11)} ${desc}`);
        ui.notice(t().host.helpFooter, "dim");
        return;
      case "exit":
      case "quit":
      case "keluar":
        return "exit";
      case "clear":
        session.reset();
        ui.clear?.();
        ui.notice(t().host.newConversation, "dim");
        ui.changed();
        return;
      case "mode": {
        const m = t().host;
        const mode = m.modeAutoWords.includes(arg) ? "auto" : m.modeAskWords.includes(arg) ? "ask" : session.approval.mode === "auto" ? "ask" : "auto";
        session.approval.setMode(mode);
        ui.notice(m.modeNow(mode === "auto"));
        ui.changed();
        return;
      }
      case "dev": {
        if (externalServer) return ui.notice(t().host.serverElsewhere(externalServer));
        if (arg === "stop") {
          await devServer.stop();
          ui.notice(t().host.serverStoppedManual);
        } else if (arg === "start" || arg === "restart") {
          if (!isProject) return ui.notice(t().host.notProject, "warn");
          if (arg === "restart") await devServer.stop();
          if (!devServer.running) {
            devServer.start();
            ui.changed();
            ui.busy(t().host.busyServer);
            const text = await waitForServer();
            ui.busy(undefined);
            ui.notice(text.split("\n")[0]!);
          } else ui.notice(t().host.serverAlready(devServer.url));
        } else ui.notice(serverLine());
        ui.changed();
        return;
      }
      case "logs": {
        const lines = externalServer ? [t().host.logsElsewhere] : devServer.logs(Number(arg) || 40);
        if (!lines.length) ui.notice(t().host.noLogs, "dim");
        for (const l of lines) ui.notice(`│ ${l}`, "dim");
        return;
      }
      case "open": {
        const url = externalServer ?? devServer.url;
        if (!url) return ui.notice(t().host.serverNotRunning, "warn");
        openBrowser(url + (arg ? `/${arg.replace(/^\/+/, "")}` : ""));
        ui.notice(t().host.opening(url), "dim");
        return;
      }
      case "undo": {
        const preview = latestJournal(cwd);
        if (!preview) return ui.notice(t().host.nothingToUndo);
        ui.notice(t().host.lastChange(preview.task.split("\n")[0]!.slice(0, 80)));
        for (const e of preview.entries) ui.notice(`  ${e.action === "delete" ? t().host.undoDelete : t().host.undoRestore} ${e.path}`, "dim");
        if (await confirm(t().host.confirmUndo)) {
          undoLatest(cwd);
          ui.notice(t().host.undone, "ok");
        }
        return;
      }
      case "resume": {
        const sessions = listSessions(cwd).filter((s) => s.id !== session.id);
        if (sessions.length === 0) return ui.notice(t().host.noSessions);
        const choice = await ui.choose(
          t().host.resumeTitle,
          sessions.slice(0, 15).map((s) => ({ label: s.title.slice(0, 60) || t().host.untitled, value: s.id, hint: t().host.sessionHint(ago(s.updatedAt), s.turns) })),
          "",
        );
        if (choice) resumeSession(choice);
        return;
      }
      case "compact": {
        controller = new AbortController();
        ui.busy(t().host.busyCompact);
        try {
          const res = await session.compact({ signal: controller.signal });
          ui.busy(undefined);
          ui.notice(res ? t().host.compacted(res.before, res.after) : t().host.compactNotNeeded, res ? "ok" : "info");
        } catch (err) {
          ui.busy(undefined);
          ui.notice(controller.signal.aborted ? t().host.cancelled : t().host.compactFailed((err as Error).message), controller.signal.aborted ? "warn" : "error");
        } finally {
          controller = undefined;
          ui.changed();
        }
        return;
      }
      case "omniroute": {
        const url = omniUrl ?? `${OMNIROUTE.api}/models`;
        if (arg === "install") {
          if (omnirouteInstalled()) ui.notice(t().host.omnirouteAlready);
          else if ((await confirm(t().host.confirmOmnirouteInstall)) && (await installOmni())) {
            omniUrl ??= url;
            await startOmniRoute();
          }
        } else if (arg === "start") {
          if (!omnirouteInstalled()) ui.notice(t().host.omnirouteNotInstalled, "warn");
          else {
            omniUrl ??= url;
            await startOmniRoute();
          }
        } else if (arg === "stop") {
          if (omniroute?.running) {
            await omniroute.stop();
            ui.notice(t().host.omnirouteStopped);
          } else ui.notice(t().host.omnirouteNotOurs);
        } else {
          const up = await isServerUp(url);
          ui.notice(t().host.omnirouteState(up ? "running" : omnirouteInstalled() ? "installed" : "missing"), up ? "ok" : "warn");
          ui.notice(`Dashboard: ${OMNIROUTE.dashboard} · API: ${OMNIROUTE.api} · ${OMNIROUTE.repo}`, "dim");
        }
        if (arg === "install" || arg === "start") session = newSession(config);
        ui.changed();
        return;
      }
      case "status": {
        ui.busy(t().host.busyStatus);
        const rows: [string, Tone][] = [];
        for (const provider of createProviders(config.providers)) {
          try {
            rows.push([`✓ ${provider.name.padEnd(10)} ${await provider.check()}`, "ok"]);
          } catch (err) {
            rows.push([`✗ ${provider.name.padEnd(10)} ${err instanceof ProviderUnavailableError ? err.reason : (err as Error).message}`, "error"]);
          }
        }
        ui.busy(undefined);
        for (const [text, tone] of rows) ui.notice(text, tone);
        return;
      }
      case "setup":
      case "login":
        await runSetupWizard(arg || undefined);
        return;
      case "lang":
      case "bahasa":
      case "language": {
        if (!arg) return ui.notice(t().host.langNow(LOCALE_NAMES[getLocale()]));
        const locale = parseLocale(arg);
        if (!locale) return ui.notice(t().host.langInvalid(arg), "warn");
        setLocale(locale);
        try {
          writeSettings({ locale });
        } catch {
          // tidak bisa menulis ~/.zentara: bahasa tetap berlaku untuk sesi ini
        }
        ui.notice(t().host.langSaved(LOCALE_NAMES[getLocale()]), "ok");
        ui.changed();
        return;
      }
      default:
        ui.notice(t().host.unknownCommand(cmd ?? ""), "warn");
        return;
    }
  }

  const host: ReplHost = {
    info: { version: options.version, cwd, shortCwd: shortPath(cwd), isProject, dryRun: options.dryRun ?? false },
    status() {
      const server: HostStatus["server"] = externalServer
        ? { state: "external", url: externalServer }
        : devServer.state === "running" && devServer.url
          ? { state: "running", url: devServer.url }
          : devServer.state === "starting" || devServer.state === "crashed"
            ? { state: devServer.state }
            : isProject
              ? { state: "stopped" }
              : { state: "none" };
      return { server, mode: session.approval.mode, provider: readyProvider, tokens: session.tokens, busy: Boolean(controller || creation) };
    },
    async startup() {
      const newer = await Promise.race([options.checkUpdate?.() ?? Promise.resolve(undefined), new Promise<undefined>((r) => setTimeout(() => r(undefined), 1500).unref())]);
      if (newer) {
        ui.notice(t().host.newVersion(newer, options.version), "warn");
      }
      if (options.dryRun) ui.notice(t().host.dryRun, "warn");
      // Pertama kali dibuka: pilih bahasa lebih dulu, lalu simpan sebagai preferensi global.
      if (options.askLanguage) {
        await chooseLanguage();
        ui.changed();
      }

      if (!isProject) {
        const m = t().host.start;
        ui.notice(t().host.noProjectHere, "dim");
        const choice = await ui.choose(t().host.startWhere, [
          { label: m.create, value: "create", hint: m.createHint },
          { label: m.chat, value: "chat", hint: m.chatHint },
          { label: m.docs, value: "docs", hint: m.docsHint },
          { label: m.exit, value: "exit", hint: "" },
        ], "chat");
        if (choice === "exit") return 0;
        if (choice === "docs") {
          openBrowser(DOCS_URL);
          ui.notice(t().host.openingDocs, "dim");
        }
        if (choice === "create") {
          const code = await createProject();
          if (code !== undefined) return code;
        }
      }

      if (!readyProvider) {
        const m = t().host.setup;
        ui.notice(t().host.welcome);
        const choice = await ui.choose(t().host.setupTitle, [
          { label: m.omniroute, value: "omniroute", hint: omnirouteInstalled() ? m.omnirouteHintInstalled : m.omnirouteHintMissing },
          { label: m.key, value: "key", hint: "OpenAI, Claude, Gemini, Groq, DeepSeek, OpenRouter" },
          { label: m.custom, value: "custom", hint: m.customHint },
          { label: m.skip, value: "skip", hint: m.skipHint },
        ], "skip");
        if (choice === "omniroute") {
          omniUrl ??= `${OMNIROUTE.api}/models`;
          if (omnirouteInstalled() || (await installOmni())) await startOmniRoute();
        } else if (choice === "key" || choice === "custom") {
          await runSetupWizard(choice === "custom" ? "ollama" : undefined);
        }
        readyProvider = await readiness(config);
      } else if (isLocalOmni && !(await isServerUp(omniUrl!)) && omnirouteInstalled()) {
        const start = await ui.choose(t().host.omnirouteAsk, [
          { label: t().host.yes, value: true, hint: t().host.omnirouteAskYesHint },
          { label: t().host.no, value: false, hint: t().host.useProvider(readyProvider) },
        ], false);
        if (start) await startOmniRoute();
      }

      if (isProject && options.offerDevServer) {
        const url = `http://localhost:${options.appPort}`;
        if (await isServerUp(url)) {
          externalServer = url;
          ui.notice(t().host.serverExternal(url), "ok");
        } else {
          const start = await ui.choose(t().host.askDevServer(devServer.commandText), [
            { label: t().host.yes, value: true, hint: t().host.devYesHint },
            { label: t().host.no, value: false, hint: t().host.devNoHint },
          ], false);
          if (start) {
            devServer.start();
            ui.notice(t().host.startingServer, "dim");
          }
        }
      }

      if (options.continueLast) {
        const latest = listSessions(cwd)[0];
        if (latest) resumeSession(latest.id);
        else ui.notice(t().host.noSavedSessions, "dim");
      }
      ui.changed();
      return undefined;
    },
    async submit(line) {
      const text = line.trim();
      if (!text) return undefined;
      if (t().host.exitWords.includes(text.toLowerCase())) return "exit";
      if (text.startsWith("/")) return command(text);
      await runTask(text);
      return undefined;
    },
    interrupt() {
      if (creation?.child?.pid && !creation.cancelled) {
        creation.cancelled = true;
        killTree(creation.child.pid, "SIGTERM");
        ui.busy(t().host.busyStopping);
        return;
      }
      if (controller && !controller.signal.aborted) {
        controller.abort();
        ui.busy(t().host.busyStopping);
      }
    },
    toggleMode() {
      session.approval.setMode(session.approval.mode === "auto" ? "ask" : "auto");
      ui.changed();
    },
    async close() {
      controller?.abort();
      if (devServer.running) {
        ui.notice(t().host.stoppingServer, "dim");
        await devServer.stop();
      }
      if (omniroute?.running) {
        ui.notice(t().host.stoppingOmniroute, "dim");
        await omniroute.stop();
      }
      await devtools?.close();
    },
  };
  return host;
}

// Bahan untuk tampilan: tipe kejadian agen, logo & warna brand, pratinjau persetujuan berwarna.
export type { ApprovalAnswer, PendingAction } from "../ai/approval.js";
export type { ToolCall, ToolResult } from "../ai/types.js";
/** Nama folder proyek yang aman: huruf kecil, spasi & karakter lain menjadi "-" (mis. "Hub Tiket" -> "hub-tiket"). */
export function projectSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
}

export { BRAND, colorDepth, terminalLogo, terminalLogoFrame, terminalLogoMini, visibleWidth, TAGLINE, type ColorDepth } from "../brand/index.js";
export { formatPreview, MarkdownLines, renderMarkdown } from "../ai/terminal.js";
