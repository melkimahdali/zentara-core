import { spawn } from "node:child_process";
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
import { BackgroundProcess, DevServer, isServerUp, openBrowser, waitForUrl } from "../dev/server.js";
import { platformCommand } from "../process.js";
import { DOCS_URL } from "../brand/index.js";

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

export const HOST_COMMANDS: [string, string][] = [
  ["/help", "Tampilkan bantuan"],
  ["/mode", "Ganti mode persetujuan: /mode ask atau /mode auto"],
  ["/dev", "Server dev: /dev (status), /dev start, /dev stop, /dev restart"],
  ["/logs", "Lihat log server dev terakhir"],
  ["/open", "Buka aplikasi di browser"],
  ["/undo", "Batalkan perubahan AI terakhir"],
  ["/resume", "Lanjutkan percakapan sebelumnya"],
  ["/compact", "Ringkas percakapan agar hemat token"],
  ["/omniroute", "OmniRoute (AI gratis): /omniroute (status), install, start, stop"],
  ["/status", "Cek provider AI"],
  ["/setup", "Atur akses AI: provider, API key, model"],
  ["/clear", "Mulai percakapan baru"],
  ["/exit", "Keluar"],
];

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
  if (minutes < 1) return "baru saja";
  if (minutes < 60) return `${minutes} menit lalu`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.round(hours / 24)} hari lalu`;
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
      ui.notice(`● Server dev berjalan di ${url}${devtools ? "  ·  chat Zentara AI juga ada di halaman itu" : ""}`, "ok");
    }
    ui.changed();
  });
  devServer.on("problem", (line: string) => {
    if (Date.now() - serverNoticeAt < 4000) return;
    serverNoticeAt = Date.now();
    ui.notice(`⚠ Server: ${line.trim().slice(0, 140)}  (/logs)`, "warn");
  });
  devServer.on("exit", (code: number | null) => {
    announcedReady = false;
    if (code) ui.notice(`● Server dev berhenti (kode ${code}). Lihat /logs, jalankan lagi dengan /dev start.`, "error");
    ui.changed();
  });

  async function waitForServer(timeoutMs = 25_000): Promise<string> {
    if (devServer.state === "running" && devServer.url) return `Server berjalan di ${devServer.url}`;
    return new Promise((resolve) => {
      const done = (text: string) => {
        clearTimeout(timer);
        devServer.off("ready", onReady);
        devServer.off("exit", onExit);
        resolve(text);
      };
      const onReady = (url: string) => done(`Server berjalan di ${url}`);
      const onExit = () => done(`Server berhenti. Log terakhir:\n${devServer.logs(30).join("\n")}`);
      const timer = setTimeout(() => done(`Server belum siap setelah ${timeoutMs / 1000} detik. Log:\n${devServer.logs(30).join("\n")}`), timeoutMs);
      devServer.on("ready", onReady);
      devServer.on("exit", onExit);
    });
  }

  const devServerTool: AgentTool = {
    spec: {
      name: "dev_server",
      description:
        "Server pengembangan (npm run dev) yang berjalan di latar belakang CLI ini. status = cek apakah jalan & URL-nya; logs = baca log server terakhir (untuk melihat error runtime); start/restart = nyalakan atau mulai ulang (selalu minta persetujuan pengguna). Server otomatis dimuat ulang saat file berubah, jadi biasanya tidak perlu restart.",
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
        if (externalServer) return `Server sudah dijalankan di terminal lain: ${externalServer} (log tidak tersedia di sini).`;
        return `state: ${devServer.state}${devServer.url ? `\nurl: ${devServer.url}` : ""}`;
      }
      if (action === "logs") return externalServer ? "Server berjalan di terminal lain; log tidak tersedia." : devServer.logs(80).join("\n") || "(log kosong)";
      if (action !== "start" && action !== "restart") throw new ToolError("action harus status, logs, start, atau restart");
      if (externalServer) throw new ToolError(`Server sudah berjalan di terminal lain (${externalServer}).`);
      const approved = await ctx.approval.approve(
        {
          tool: "dev_server",
          risk: "critical",
          reason: `menjalankan ${devServer.commandText} di latar belakang`,
          summary: action === "start" ? `Jalankan ${devServer.commandText} di latar belakang` : "Mulai ulang server dev",
        },
        ctx.signal,
      );
      if (!approved) throw new ToolError("Pengguna tidak menyetujui. Jangan ulangi; beri tahu cara menjalankannya sendiri (/dev start).");
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
    fallback: (from, reason, to) => ui.notice(`✗ ${from} tidak tersedia: ${reason}${to ? ` → pindah ke ${to}` : ""}`, "warn"),
  };
  const newSession = (cfg: AiConfig): AiSession =>
    createAiSession({ root: cwd, config: cfg, ui: sessionUI, prompter: (a, s) => ui.approve(a, s), dryRun: options.dryRun, extraTools: [devServerTool], persist: true });
  let session = newSession(config);

  /** Output wizard ai:setup diteruskan sebagai pemberitahuan. */
  const setupIo: Output = {
    out: (l) => {
      const text = l.replace(/\x1b\[[0-9;]*m/g, "");
      if (text.trim()) ui.notice(text, /✓/.test(text) ? "ok" : /✗|gagal/i.test(text) ? "error" : "info");
    },
    err: (l) => ui.notice(l.replace(/\x1b\[[0-9;]*m/g, ""), "error"),
  };
  const setupPrompts: SetupPrompts = {
    choose: (question, choices, fallback) => ui.choose(question, choices, fallback),
    ask: async (question) => ((await ui.ask(question)) ?? "").trim(),
    secret: async (question) => ((await ui.ask(question, { secret: true })) ?? "").trim(),
    confirm: (question, defaultYes = true) =>
      ui.choose(question, defaultYes ? [{ label: "Ya", value: true }, { label: "Tidak", value: false }] : [{ label: "Tidak", value: false }, { label: "Ya", value: true }], false),
  };

  async function runSetupWizard(preset?: string): Promise<void> {
    await options.runSetup(setupPrompts, preset, setupIo);
    try {
      config = await options.loadConfig();
      session = newSession(config);
      readyProvider = await readiness(config);
      ui.notice(`Provider: ${config.providers.map((p) => p.name ?? "claude").join(" → ")} (percakapan baru dimulai)`, "dim");
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
    ui.busy("Menyalakan OmniRoute");
    const ok = await waitForUrl(omniUrl, 90_000, () => omniroute!.running);
    ui.busy(undefined);
    if (ok) {
      ui.notice(`● OmniRoute (AI gratis) berjalan · dashboard ${OMNIROUTE.dashboard}`, "ok");
      for (const tip of OMNIROUTE_TIPS) ui.notice(`  ${tip}`, "dim");
    } else {
      ui.notice("⚠ OmniRoute belum siap; sementara memakai provider lain yang tersedia. Log terakhir:", "warn");
      for (const line of omniroute.logs(8)) ui.notice(`  │ ${line}`, "dim");
    }
    readyProvider = await readiness(config);
    ui.changed();
    return ok;
  }

  async function installOmni(): Promise<boolean> {
    if (!nodeSupportsOmniRoute()) {
      ui.notice(`⚠ OmniRoute butuh Node.js 22.22+ atau 24+ (Anda memakai ${process.version}). Perbarui Node.js lalu jalankan: npm install -g omniroute`, "warn");
      return false;
    }
    ui.notice("$ npm install -g omniroute   (±1–3 menit, sekali saja)", "dim");
    const ok = await ui.suspend(() => installOmniRoute());
    if (!ok || !omnirouteInstalled()) {
      ui.notice("⚠ Pemasangan OmniRoute gagal. Coba jalankan sendiri: npm install -g omniroute (di Windows mungkin perlu terminal Administrator).", "warn");
      return false;
    }
    ui.notice("✓ OmniRoute terpasang.", "ok");
    return true;
  }

  async function createProject(): Promise<number> {
    const name = ((await ui.ask("Nama folder proyek", { placeholder: "zentara-app" })) ?? "").trim() || "zentara-app";
    const target = path.resolve(cwd, name);
    return ui.suspend(async () => {
      const cmd = platformCommand("npm", ["create", "zentara@latest", name]);
      const code = await new Promise<number>((resolve) => {
        const child = spawn(cmd.command, cmd.args, { cwd, stdio: "inherit", shell: cmd.shell });
        child.on("error", () => resolve(1));
        child.on("close", (c2) => resolve(c2 ?? 1));
      });
      if (code !== 0 || !fs.existsSync(path.join(target, "src", "app"))) {
        process.stdout.write("  Proyek belum berhasil dibuat.\n");
        return 1;
      }
      process.stdout.write(`\n  ✓ Proyek siap. Membuka Zentara di ${shortPath(target)}...\n    (Lain kali: cd ${name} lalu ketik zentara)\n\n`);
      await devtools?.close();
      return new Promise<number>((resolve) => {
        const child = spawn(process.execPath, [...process.execArgv, process.argv[1]!], { cwd: target, stdio: "inherit" });
        child.on("close", (c2) => resolve(c2 ?? 0));
        child.on("error", () => resolve(1));
      });
    });
  }

  function resumeSession(id: string): void {
    const saved = loadSession(cwd, id);
    if (!saved || !session.resume(id)) {
      ui.notice("Percakapan tidak ditemukan.", "warn");
      return;
    }
    ui.notice(`↺ Melanjutkan: ${saved.title.slice(0, 80)} (${ago(saved.updatedAt)})`, "ok");
    const clip = (t: string) => t.replace(/<project>[\s\S]*?<\/project>\s*/, "").replace(/\s+/g, " ").trim().slice(0, 160);
    const lastUser = [...saved.messages].reverse().find((m) => m.role === "user" && !m.text.startsWith("["));
    const lastAi = [...saved.messages].reverse().find((m) => m.role === "assistant" && m.text.trim());
    if (lastUser?.role === "user") ui.notice(`  ❯ ${clip(lastUser.text)}`, "dim");
    if (lastAi?.role === "assistant") ui.notice(`  ⏺ ${clip(lastAi.text)}`, "dim");
    ui.changed();
  }

  const confirm = (question: string) => ui.choose(question, [{ label: "Ya", value: true }, { label: "Tidak", value: false }], false);

  async function runTask(task: string): Promise<void> {
    if (lock.owner) {
      ui.notice(`Zentara AI sedang mengerjakan tugas dari ${lock.owner}. Tunggu sampai selesai.`, "warn");
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
    const label = {
      done: "✓ Selesai",
      incomplete: "… Belum selesai (batas langkah)",
      refused: "✗ Ditolak model",
      verification_failed: "✗ Verifikasi gagal",
      interrupted: "■ Dihentikan",
    }[result.status];
    const tone: Tone = result.status === "done" ? "ok" : result.status === "verification_failed" ? "error" : "warn";
    const files = result.changedFiles.length ? ` · ${result.changedFiles.length} file berubah (/undo untuk membatalkan)` : "";
    ui.notice(`${label} · ${result.steps} langkah${result.providersUsed.length ? ` · ${result.providersUsed.join(", ")}` : ""}${files}`, tone);
    if (result.changedFiles.length && devServer.url) ui.notice(`  Lihat hasilnya: ${devServer.url}`, "dim");
  }

  function serverLine(): string {
    const s = host.status().server;
    if (s.state === "external" || s.state === "running") return `● ${s.url}`;
    if (s.state === "starting") return "● server dev dimulai...";
    if (s.state === "crashed") return "● server dev berhenti (/logs)";
    if (s.state === "stopped") return "○ server dev mati (/dev start)";
    return "○ di luar proyek Zentara";
  }

  async function command(line: string): Promise<"exit" | void> {
    const [cmd, ...rest] = line.slice(1).trim().split(/\s+/);
    const arg = rest.join(" ");
    switch (cmd) {
      case "help":
      case "?":
        for (const [name, desc] of HOST_COMMANDS) ui.notice(`${name.padEnd(11)} ${desc}`);
        ui.notice('Selain itu, tulis saja permintaan Anda, mis. "buatkan halaman portofolio dengan daftar proyek".', "dim");
        return;
      case "exit":
      case "quit":
      case "keluar":
        return "exit";
      case "clear":
        session.reset();
        ui.notice("Percakapan baru dimulai.", "dim");
        ui.changed();
        return;
      case "mode": {
        const mode = arg === "auto" || arg === "otomatis" ? "auto" : arg === "ask" || arg === "tanya" ? "ask" : session.approval.mode === "auto" ? "ask" : "auto";
        session.approval.setMode(mode);
        ui.notice(`Mode: ${mode === "auto" ? "otomatis (perubahan biasa langsung dikerjakan; aksi krusial tetap ditanyakan)" : "minta persetujuan untuk setiap perubahan"}`);
        ui.changed();
        return;
      }
      case "dev": {
        if (externalServer) return ui.notice(`Server sudah berjalan di terminal lain: ${externalServer}`);
        if (arg === "stop") {
          await devServer.stop();
          ui.notice("Server dev dihentikan.");
        } else if (arg === "start" || arg === "restart") {
          if (!isProject) return ui.notice("Folder src/app tidak ada: ini bukan proyek Zentara.", "warn");
          if (arg === "restart") await devServer.stop();
          if (!devServer.running) {
            devServer.start();
            ui.changed();
            ui.busy("Menyalakan server");
            const text = await waitForServer();
            ui.busy(undefined);
            ui.notice(text.split("\n")[0]!);
          } else ui.notice(`Server dev sudah berjalan${devServer.url ? ` di ${devServer.url}` : ""}.`);
        } else ui.notice(serverLine());
        ui.changed();
        return;
      }
      case "logs": {
        const lines = externalServer ? ["(server berjalan di terminal lain)"] : devServer.logs(Number(arg) || 40);
        if (!lines.length) ui.notice("(belum ada log)", "dim");
        for (const l of lines) ui.notice(`│ ${l}`, "dim");
        return;
      }
      case "open": {
        const url = externalServer ?? devServer.url;
        if (!url) return ui.notice("Server dev belum berjalan. Jalankan dengan /dev start.", "warn");
        openBrowser(url + (arg ? `/${arg.replace(/^\/+/, "")}` : ""));
        ui.notice(`Membuka ${url}...`, "dim");
        return;
      }
      case "undo": {
        const preview = latestJournal(cwd);
        if (!preview) return ui.notice("Tidak ada perubahan AI yang bisa dibatalkan.");
        ui.notice(`Perubahan terakhir: ${preview.task.split("\n")[0]!.slice(0, 80)}`);
        for (const e of preview.entries) ui.notice(`  ${e.action === "delete" ? "hapus   " : "pulihkan"} ${e.path}`, "dim");
        if (await confirm("Batalkan perubahan ini?")) {
          undoLatest(cwd);
          ui.notice("✓ Perubahan dibatalkan.", "ok");
        }
        return;
      }
      case "resume": {
        const sessions = listSessions(cwd).filter((s) => s.id !== session.id);
        if (sessions.length === 0) return ui.notice("Belum ada percakapan tersimpan.");
        const choice = await ui.choose(
          "Lanjutkan percakapan",
          sessions.slice(0, 15).map((s) => ({ label: s.title.slice(0, 60) || "(tanpa judul)", value: s.id, hint: `${ago(s.updatedAt)} · ${s.turns} permintaan` })),
          "",
        );
        if (choice) resumeSession(choice);
        return;
      }
      case "compact": {
        controller = new AbortController();
        ui.busy("Meringkas percakapan");
        try {
          const res = await session.compact({ signal: controller.signal });
          ui.busy(undefined);
          ui.notice(res ? `✓ Percakapan diringkas (~${res.before} → ~${res.after} token)` : "Percakapan masih pendek, tidak perlu diringkas.", res ? "ok" : "info");
        } catch (err) {
          ui.busy(undefined);
          ui.notice(controller.signal.aborted ? "Dibatalkan." : `✗ Gagal meringkas: ${(err as Error).message}`, controller.signal.aborted ? "warn" : "error");
        } finally {
          controller = undefined;
          ui.changed();
        }
        return;
      }
      case "omniroute": {
        const url = omniUrl ?? `${OMNIROUTE.api}/models`;
        if (arg === "install") {
          if (omnirouteInstalled()) ui.notice("OmniRoute sudah terpasang.");
          else if ((await confirm("Pasang OmniRoute sekarang (npm install -g omniroute)?")) && (await installOmni())) {
            omniUrl ??= url;
            await startOmniRoute();
          }
        } else if (arg === "start") {
          if (!omnirouteInstalled()) ui.notice("OmniRoute belum terpasang. Jalankan: /omniroute install", "warn");
          else {
            omniUrl ??= url;
            await startOmniRoute();
          }
        } else if (arg === "stop") {
          if (omniroute?.running) {
            await omniroute.stop();
            ui.notice("OmniRoute dihentikan.");
          } else ui.notice("OmniRoute tidak dijalankan dari sesi ini.");
        } else {
          const up = await isServerUp(url);
          ui.notice(`OmniRoute: ${up ? "berjalan" : omnirouteInstalled() ? "terpasang, belum berjalan (/omniroute start)" : "belum terpasang (/omniroute install)"}`, up ? "ok" : "warn");
          ui.notice(`Dashboard: ${OMNIROUTE.dashboard} · API: ${OMNIROUTE.api} · ${OMNIROUTE.repo}`, "dim");
        }
        if (arg === "install" || arg === "start") session = newSession(config);
        ui.changed();
        return;
      }
      case "status": {
        ui.busy("Mengecek provider");
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
      default:
        ui.notice(`Perintah tidak dikenal: /${cmd}. Ketik /help.`, "warn");
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
      return { server, mode: session.approval.mode, provider: readyProvider, tokens: session.tokens, busy: Boolean(controller) };
    },
    async startup() {
      const newer = await Promise.race([options.checkUpdate?.() ?? Promise.resolve(undefined), new Promise<undefined>((r) => setTimeout(() => r(undefined), 1500).unref())]);
      if (newer) {
        ui.notice(`★ Versi baru v${newer} tersedia (Anda memakai v${options.version}). Perbarui: npm install -g zentara@latest`, "warn");
      }
      if (options.dryRun) ui.notice("Mode dry-run: tidak ada file yang diubah.", "warn");

      if (!isProject) {
        ui.notice("Folder ini belum berisi proyek Zentara.", "dim");
        const choice = await ui.choose("Mau mulai dari mana?", [
          { label: "Buat proyek baru", value: "create", hint: "npm create zentara: template api (login + dasbor + database) atau minimal" },
          { label: "Chat di folder ini", value: "chat", hint: "Zentara AI bekerja di folder saat ini" },
          { label: "Buka dokumentasi", value: "docs", hint: "situs dokumentasi Zentara Core" },
          { label: "Keluar", value: "exit", hint: "" },
        ], "chat");
        if (choice === "exit") return 0;
        if (choice === "docs") {
          openBrowser(DOCS_URL);
          ui.notice("Membuka dokumentasi di browser...", "dim");
        }
        if (choice === "create") return createProject();
      }

      if (!readyProvider) {
        ui.notice("Selamat datang di Zentara Core. Pilih cara Zentara AI mengakses model (bisa diubah kapan saja dengan /setup).");
        const choice = await ui.choose("Atur akses AI", [
          { label: "OmniRoute (gratis)", value: "omniroute", hint: omnirouteInstalled() ? "direkomendasikan · jalankan di latar belakang, tanpa API key" : "direkomendasikan · pasang & jalankan otomatis, tanpa API key" },
          { label: "Masukkan API key", value: "key", hint: "OpenAI, Claude, Gemini, Groq, DeepSeek, OpenRouter" },
          { label: "Provider kustom", value: "custom", hint: "Ollama atau server OpenAI-compatible lain" },
          { label: "Lewati dulu", value: "skip", hint: "mulai tanpa AI; atur nanti dengan /setup" },
        ], "skip");
        if (choice === "omniroute") {
          omniUrl ??= `${OMNIROUTE.api}/models`;
          if (omnirouteInstalled() || (await installOmni())) await startOmniRoute();
        } else if (choice === "key" || choice === "custom") {
          await runSetupWizard(choice === "custom" ? "ollama" : undefined);
        }
        readyProvider = await readiness(config);
      } else if (isLocalOmni && !(await isServerUp(omniUrl!)) && omnirouteInstalled()) {
        const start = await ui.choose("OmniRoute (AI gratis) belum berjalan. Jalankan di latar belakang?", [
          { label: "Ya", value: true, hint: "dimatikan lagi saat Anda keluar" },
          { label: "Tidak", value: false, hint: `pakai ${readyProvider}` },
        ], false);
        if (start) await startOmniRoute();
      }

      if (isProject && options.offerDevServer) {
        const url = `http://localhost:${options.appPort}`;
        if (await isServerUp(url)) {
          externalServer = url;
          ui.notice(`● Server dev sudah berjalan di ${url} (dari terminal lain)`, "ok");
        } else {
          const start = await ui.choose(`Jalankan server dev (${devServer.commandText}) di latar belakang?`, [
            { label: "Ya", value: true, hint: "tidak perlu buka terminal baru" },
            { label: "Tidak", value: false, hint: "bisa nanti dengan /dev start" },
          ], false);
          if (start) {
            devServer.start();
            ui.notice("Menyalakan server... (hasilnya muncul di baris status)", "dim");
          }
        }
      }

      if (options.continueLast) {
        const latest = listSessions(cwd)[0];
        if (latest) resumeSession(latest.id);
        else ui.notice("Belum ada percakapan tersimpan; memulai percakapan baru.", "dim");
      }
      ui.changed();
      return undefined;
    },
    async submit(line) {
      const text = line.trim();
      if (!text) return undefined;
      if (["keluar", "exit", "quit"].includes(text.toLowerCase())) return "exit";
      if (text.startsWith("/")) return command(text);
      await runTask(text);
      return undefined;
    },
    interrupt() {
      if (controller && !controller.signal.aborted) {
        controller.abort();
        ui.busy("Menghentikan");
      }
    },
    toggleMode() {
      session.approval.setMode(session.approval.mode === "auto" ? "ask" : "auto");
      ui.changed();
    },
    async close() {
      controller?.abort();
      if (devServer.running) {
        ui.notice("Menghentikan server dev...", "dim");
        await devServer.stop();
      }
      if (omniroute?.running) {
        ui.notice("Menghentikan OmniRoute...", "dim");
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
export { BRAND, colorDepth, terminalLogo, terminalLogoFrame, visibleWidth, TAGLINE, type ColorDepth } from "../brand/index.js";
export { formatPreview, MarkdownLines, renderMarkdown } from "../ai/terminal.js";
