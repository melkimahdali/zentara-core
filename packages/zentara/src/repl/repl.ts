import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import readlinePromises from "node:readline/promises";
import type { AgentResult } from "../ai/agent.js";
import type { ApprovalAnswer, PendingAction, Prompter } from "../ai/approval.js";
import { createProviders, type AiConfig } from "../ai/config.js";
import { latestJournal, undoLatest } from "../ai/journal.js";
import { createAiSession, type AiSession } from "../ai/session.js";
import { accent, c, gold, printApprovalHeader, TerminalUI, type Output } from "../ai/terminal.js";
import { ToolError, type AgentTool } from "../ai/tools.js";
import { ProviderUnavailableError, type ToolCall, type ToolResult } from "../ai/types.js";
import { startDevtools, type AiLock, type Devtools } from "../dev/devtools.js";
import { BackgroundProcess, DevServer, isServerUp, openBrowser, waitForUrl } from "../dev/server.js";
import { installOmniRoute, nodeSupportsOmniRoute, OMNIROUTE, OMNIROUTE_TIPS, omnirouteEnv, omnirouteInstalled } from "../ai/omniroute.js";
import { colorDepth, terminalLogo, visibleWidth } from "../brand/index.js";
import { spawn } from "node:child_process";
import { platformCommand } from "../process.js";
import { box, Keys, select, Spinner, type Choice } from "./widgets.js";

export interface ReplOptions {
  cwd: string;
  io: Output;
  version: string;
  /** Cek versi baru (default: registry npm). Hasilnya ditampilkan di bawah banner. */
  checkUpdate?: () => Promise<string | undefined>;
  loadConfig: () => Promise<AiConfig>;
  /** Environment untuk server dev, disalin sebelum .env dimuat ke proses ini. */
  serverEnv: NodeJS.ProcessEnv;
  /** Perintah server dev bila proyek tidak punya skrip "dev". */
  fallbackDev: { command: string; args: string[] };
  /** Port aplikasi dari zentara.config (untuk mendeteksi server yang sudah berjalan). */
  appPort: number;
  /** false = jangan tawarkan menjalankan server dev (flag --no-dev). */
  offerDevServer: boolean;
  /** Wizard `ai:setup` (dipanggil dari /setup). */
  runSetup: (rl: readlinePromises.Interface, preset?: string) => Promise<number>;
  dryRun?: boolean;
}

const COMMANDS: [string, string][] = [
  ["/help", "Tampilkan bantuan"],
  ["/mode", "Ganti mode persetujuan: /mode ask atau /mode auto"],
  ["/dev", "Server dev: /dev (status), /dev start, /dev stop, /dev restart"],
  ["/logs", "Lihat log server dev terakhir"],
  ["/open", "Buka aplikasi di browser"],
  ["/undo", "Batalkan perubahan AI terakhir"],
  ["/omniroute", "OmniRoute (AI gratis): /omniroute (status), /omniroute install, start, stop"],
  ["/status", "Cek provider AI"],
  ["/setup", "Atur akses AI: provider, API key, model (/setup openai, /setup omniroute, ...)"],
  ["/clear", "Mulai percakapan baru"],
  ["/exit", "Keluar"],
];

function shortPath(p: string): string {
  const home = os.homedir();
  return p === home || p.startsWith(home + path.sep) ? "~" + p.slice(home.length) : p;
}

function width(): number {
  return Math.max(40, Math.min(process.stdout.columns ?? 80, 120));
}

/**
 * Mode obrolan interaktif `zentara` (tanpa argumen), gaya Claude Code:
 * percakapan berlanjut, AI bisa dihentikan dengan Esc, persetujuan lewat menu panah,
 * perintah garis miring, dan server dev (npm run dev) di latar belakang setelah dikonfirmasi.
 */
export async function startRepl(options: ReplOptions): Promise<number> {
  const { io, cwd } = options;
  const out = process.stdout;
  let config: AiConfig;
  try {
    config = await options.loadConfig();
  } catch (err) {
    io.err(c.red((err as Error).message));
    return 1;
  }

  const keys = new Keys();
  const spinner = new Spinner();
  let spinnerLabel = "Berpikir";
  let promptActive = false;
  let status = "";
  const history: string[] = [];
  let lastCtrlC = 0;
  let serverNoticeAt = 0;
  let externalServer: string | undefined;
  let runningTask = false;

  /** Cetak pemberitahuan tanpa merusak spinner atau kotak input. */
  function notify(line: string): void {
    if (promptActive) {
      setStatus(line.trim());
      return;
    }
    spinner.clear();
    io.out(line);
    if (spinnerLabel && runningTask) spinner.start(spinnerLabel);
  }

  let activeRl: readline.Interface | undefined;
  function setStatus(line: string): void {
    status = line;
    // Baris status ada di atas garis input: tulis ulang di tempat tanpa mengganggu ketikan.
    if (promptActive && activeRl) {
      const up = 2 + activeRl.getCursorPos().rows;
      const cols = Math.max(20, (process.stdout.columns ?? 80) - 1);
      out.write(`\x1b7\x1b[${up}A\r\x1b[2K${" ".repeat(Math.max(2, cols - visibleWidth(line)))}${line}\x1b8`);
    }
  }

  function statusLine(): string {
    const server = externalServer
      ? `${c.green("●")} ${externalServer}`
      : devServer.state === "running" && devServer.url
        ? `${c.green("●")} ${devServer.url}`
        : devServer.state === "starting"
          ? `${c.yellow("●")} server dev dimulai...`
          : devServer.state === "crashed"
            ? `${c.red("●")} server dev berhenti (/logs)`
            : fs.existsSync(path.join(cwd, "src", "app"))
              ? c.dim("○ server dev mati (/dev start)")
              : c.dim("○ di luar proyek Zentara");
    return server;
  }

  // Server devtools: chat Zentara AI di browser memakai kunci yang sama dengan terminal.
  const lock: AiLock = { owner: undefined };
  let devtools: Devtools | undefined;
  try {
    devtools = await startDevtools({ root: cwd, loadConfig: options.loadConfig, lock, log: (l) => notify(l) });
  } catch {
    devtools = undefined;
  }

  const devServer = new DevServer({ cwd, env: { ...options.serverEnv, ...devtools?.env }, fallback: options.fallbackDev });
  let announcedReady = false;
  devServer.on("ready", (url: string) => {
    if (!announcedReady) {
      announcedReady = true;
      notify(`  ${c.green("●")} Server dev berjalan di ${c.bold(url)}${devtools ? c.dim("  ·  chat Zentara AI juga ada di halaman itu") : ""}`);
    } else if (promptActive) setStatus(statusLine());
  });
  devServer.on("problem", (line: string) => {
    if (Date.now() - serverNoticeAt < 4000) return;
    serverNoticeAt = Date.now();
    notify(c.yellow(`  ⚠ Server: ${line.trim().slice(0, 140)}  ${c.dim("(/logs)")}`));
  });
  devServer.on("exit", (code: number | null) => {
    announcedReady = false;
    if (code) notify(c.red(`  ● Server dev berhenti (kode ${code}). Lihat /logs, jalankan lagi dengan /dev start.`));
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

  // Tool tambahan: AI bisa melihat status/log server dev, dan menyalakannya setelah dikonfirmasi.
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
      return waitForServer();
    },
  };

  class ReplUI extends TerminalUI {
    constructor() {
      super(io, false, () => spinner.clear());
    }
    override thinking(): void {
      spinnerLabel = "Berpikir";
      spinner.start(spinnerLabel);
    }
    override toolStart(call: ToolCall): void {
      super.toolStart(call);
      spinnerLabel = call.name === "run_check" ? "Mengecek" : call.name === "database" ? "Menjalankan database" : "Bekerja";
      spinner.start(spinnerLabel);
    }
    override toolEnd(call: ToolCall, result: ToolResult): void {
      super.toolEnd(call, result);
      spinner.start(spinnerLabel);
    }
    override info(message: string): void {
      super.info(message);
      if (/^Memverifikasi/.test(message)) spinnerLabel = "Memverifikasi";
      spinner.start(spinnerLabel);
    }
  }

  const prompter: Prompter = async (action: PendingAction, signal?: AbortSignal): Promise<ApprovalAnswer> => {
    if (signal?.aborted) return "no";
    spinner.clear();
    printApprovalHeader(io, action);
    const choices: Choice<ApprovalAnswer>[] = [{ label: "Ya", value: "yes" }];
    if (action.risk !== "critical") choices.push({ label: "Ya, dan setujui semua perubahan biasa di sesi ini", value: "all" });
    choices.push({ label: "Tidak", value: "no" });
    const answer = await select(keys, action.risk === "critical" ? "Izinkan aksi krusial ini?" : "Lanjutkan?", choices, "no");
    if (!signal?.aborted) spinner.start(spinnerLabel);
    return answer;
  };

  const newSession = (cfg: AiConfig): AiSession =>
    createAiSession({ root: cwd, config: cfg, ui: new ReplUI(), prompter, dryRun: options.dryRun, extraTools: [devServerTool] });
  let session = newSession(config);

  /** Wizard ai:setup di dalam CLI, lalu muat ulang config & mulai percakapan baru. */
  async function runSetupWizard(preset?: string): Promise<void> {
    const rl = readlinePromises.createInterface({ input: process.stdin, output: out, terminal: true });
    try {
      await options.runSetup(rl, preset);
    } finally {
      rl.close();
    }
    try {
      config = await options.loadConfig();
      session = newSession(config);
      io.out(c.dim(`  Provider: ${config.providers.map((p) => p.name ?? "claude").join(" → ")} (percakapan baru dimulai)`));
    } catch (err) {
      io.out(c.red(`  ${(err as Error).message}`));
    }
  }

  /** Buat proyek baru dengan create-zentara, lalu buka Zentara di folder proyek itu. */
  async function createProject(): Promise<number> {
    const rl = readlinePromises.createInterface({ input: process.stdin, output: out, terminal: true });
    let name: string;
    try {
      name = (await rl.question(`  Nama folder proyek ${c.dim("(zentara-app)")}: `)).trim() || "zentara-app";
    } finally {
      rl.close();
    }
    const cmd = platformCommand("npm", ["create", "zentara@latest", name]);
    const code = await new Promise<number>((resolve) => {
      const child = spawn(cmd.command, cmd.args, { cwd, stdio: "inherit", shell: cmd.shell });
      child.on("error", () => resolve(1));
      child.on("close", (c2) => resolve(c2 ?? 1));
    });
    const target = path.resolve(cwd, name);
    if (code !== 0 || !fs.existsSync(path.join(target, "src", "app"))) {
      io.out(c.red("  Proyek belum berhasil dibuat."));
      return 1;
    }
    io.out(c.green(`\n  ✓ Proyek siap. Membuka Zentara di ${shortPath(target)}...`));
    io.out(c.dim(`    (Lain kali: cd ${name} lalu ketik zentara)\n`));
    await devtools?.close();
    return new Promise<number>((resolve) => {
      const child = spawn(process.execPath, [...process.execArgv, process.argv[1]!], { cwd: target, stdio: "inherit" });
      child.on("close", (c2) => resolve(c2 ?? 0));
      child.on("error", () => resolve(1));
    });
  }

  // ── Kesiapan AI (cek cepat, hanya localhost & API key) ─────────────────
  const isProject = fs.existsSync(path.join(cwd, "src", "app"));
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

  // ── Header gaya Claude Code: logo mini + tiga baris info ────────────────
  const depth = colorDepth(process.stdout);
  const aiLine = readyProvider
    ? `${readyProvider === "omniroute" ? "OmniRoute (gratis)" : readyProvider} ${c.dim("·")} ${config.mode === "auto" ? "mode otomatis" : "minta persetujuan"}`
    : c.yellow("AI belum diatur · /setup");
  const info = [
    `${c.bold("Zentara")} ${c.bold(accent("Core"))} ${c.dim(`v${options.version}`)}`,
    readyProvider ? c.dim(aiLine) : aiLine,
    c.dim(shortPath(cwd)),
  ];
  const columns = process.stdout.columns ?? 80;
  // Logo Zentara Core lengkap (motif asli); di terminal sempit logo di atas info.
  const mark = columns >= 56 ? terminalLogo(depth) : [];
  const markWidth = mark.length ? Math.max(...mark.map(visibleWidth)) : 0;
  io.out("");
  if (mark.length && columns >= markWidth + 4 + 44) {
    const top = Math.floor((mark.length - info.length) / 2);
    mark.forEach((line, i) => io.out(` ${line}${" ".repeat(markWidth - visibleWidth(line))}   ${info[i - top] ?? ""}`.replace(/ +$/, "")));
  } else {
    for (const line of mark) io.out(` ${line}`);
    if (mark.length) io.out("");
    for (const line of info) io.out(`  ${line}`);
  }
  if (!isProject) io.out(`\n  ${c.dim("Folder ini belum berisi proyek Zentara.")}`);
  const newer = await Promise.race([options.checkUpdate?.() ?? Promise.resolve(undefined), new Promise<undefined>((r) => setTimeout(() => r(undefined), 1500).unref())]);
  if (newer) {
    io.out(`  ${gold("★")} Versi baru ${c.bold(`v${newer}`)} tersedia (Anda memakai v${options.version}). Perbarui: ${accent("npm install zentara@latest")}`);
    io.out(c.dim("    Bila npm bilang versi tidak ditemukan, cache npm Anda tertinggal: npm cache clean --force lalu ulangi."));
  }
  if (options.dryRun) io.out(c.yellow("  Mode dry-run: tidak ada file yang diubah."));

  // ── Di luar proyek: buat proyek baru? ──────────────────────────────────
  if (!isProject) {
    io.out("");
    const choice = await select(keys, "Mau mulai dari mana?", [
      { label: "Buat proyek baru", value: "create", hint: "npm create zentara: template api (login + database) atau minimal" },
      { label: "Chat di folder ini", value: "chat", hint: "Zentara AI bekerja di folder saat ini" },
      { label: "Buka dokumentasi", value: "docs", hint: "panduan Zentara Core di GitHub" },
      { label: "Keluar", value: "exit", hint: "" },
    ], "chat");
    if (choice === "exit") return 0;
    if (choice === "docs") {
      openBrowser("https://github.com/melkimahdali/zentara-core/blob/main/packages/zentara/README.md");
      io.out(c.dim("  Membuka dokumentasi di browser..."));
    }
    if (choice === "create") return createProject();
  }

  // ── OmniRoute (AI gratis, provider default) ────────────────────────────
  let omniroute: BackgroundProcess | undefined;
  let omniUrl: string | undefined;
  const first = config.providers[0];
  const isLocalOmni = first?.type === "openai-compatible" && first.name === "omniroute" && /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(first.baseUrl);
  if (isLocalOmni) omniUrl = `${first.baseUrl.replace(/\/+$/, "")}/models`;

  /** Nyalakan OmniRoute di latar belakang dan tunggu sampai siap. */
  async function startOmniRoute(): Promise<boolean> {
    if (!omniUrl) return false;
    if (await isServerUp(omniUrl)) return true;
    omniroute = new BackgroundProcess(OMNIROUTE.command, [], { cwd, env: omnirouteEnv(options.serverEnv) });
    omniroute.start();
    spinnerLabel = "Menyalakan OmniRoute";
    spinner.start(spinnerLabel);
    const ok = await waitForUrl(omniUrl, 90_000, () => omniroute!.running);
    spinner.stop();
    if (ok) {
      io.out(`  ${c.green("●")} OmniRoute (AI gratis) berjalan · dashboard ${c.bold(OMNIROUTE.dashboard)}`);
      for (const tip of OMNIROUTE_TIPS) io.out(c.dim(`    ${tip}`));
    } else {
      io.out(c.yellow("  ⚠ OmniRoute belum siap; sementara memakai provider lain yang tersedia. Log terakhir:"));
      for (const line of omniroute.logs(8)) io.out(c.dim(`    │ ${line}`));
    }
    return ok;
  }

  /** Pasang OmniRoute (npm install -g omniroute) setelah dikonfirmasi. */
  async function installOmni(): Promise<boolean> {
    if (!nodeSupportsOmniRoute()) {
      io.out(c.yellow(`  ⚠ OmniRoute butuh Node.js 22.22+ atau 24+ (Anda memakai ${process.version}). Perbarui Node.js lalu jalankan: npm install -g omniroute`));
      return false;
    }
    io.out(c.dim("  $ npm install -g omniroute   (±1–3 menit, sekali saja)"));
    const ok = await installOmniRoute();
    if (!ok || !omnirouteInstalled()) {
      io.out(c.yellow("  ⚠ Pemasangan OmniRoute gagal. Coba jalankan sendiri: npm install -g omniroute (di Windows mungkin perlu terminal Administrator)."));
      return false;
    }
    io.out(c.green("  ✓ OmniRoute terpasang."));
    return true;
  }

  if (!readyProvider) {
    // Belum ada AI yang siap: layar sambutan untuk memilih cara mengakses model.
    io.out("");
    io.out(c.bold("  Selamat datang di Zentara Core"));
    io.out(c.dim("  Pilih cara Zentara AI mengakses model. Bisa diubah kapan saja dengan /setup."));
    io.out("");
    const choice = await select(keys, "Atur akses AI", [
      { label: "OmniRoute (gratis)", value: "omniroute", hint: omnirouteInstalled() ? "direkomendasikan · jalankan di latar belakang, tanpa API key" : "direkomendasikan · pasang & jalankan otomatis, tanpa API key" },
      { label: "Masukkan API key", value: "key", hint: "OpenAI, Claude, Gemini, Groq, DeepSeek, OpenRouter" },
      { label: "Provider kustom", value: "custom", hint: "Ollama atau server OpenAI-compatible lain (alamat sendiri)" },
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
    // OmniRoute provider utama tapi belum berjalan (provider lain sudah siap sebagai cadangan).
    io.out("");
    const start = await select(keys, "OmniRoute (AI gratis) belum berjalan. Jalankan di latar belakang?", [
      { label: "Ya", value: true, hint: "dimatikan lagi saat Anda keluar" },
      { label: "Tidak", value: false, hint: `pakai ${readyProvider}` },
    ], false);
    if (start) await startOmniRoute();
  }

  // ── Tawarkan server dev ────────────────────────────────────────────────
  if (isProject && options.offerDevServer) {
    const url = `http://localhost:${options.appPort}`;
    if (await isServerUp(url)) {
      externalServer = url;
      io.out(`\n  ${c.green("●")} Server dev sudah berjalan di ${c.bold(url)} ${c.dim("(dari terminal lain)")}`);
    } else {
      io.out("");
      const start = await select(keys, `Jalankan server dev (${devServer.commandText}) di latar belakang?`, [
        { label: "Ya", value: true, hint: "tidak perlu buka terminal baru" },
        { label: "Tidak", value: false, hint: "bisa nanti dengan /dev start" },
      ], false);
      if (start) {
        devServer.start();
        io.out(c.dim(`  Menyalakan server... (hasilnya muncul di baris status)`));
      }
    }
  }

  // ── Input ──────────────────────────────────────────────────────────────
  const completer = (line: string): [string[], string] => {
    if (!line.startsWith("/")) return [[], line];
    const hits = COMMANDS.map(([cmd]) => cmd).filter((cmd) => cmd.startsWith(line));
    return [hits, line];
  };

  /** Baris mode di bawah input (gaya Claude Code). */
  function modeLine(): string {
    return session.approval.mode === "auto"
      ? `  ${gold("▸▸ mode otomatis")} ${c.dim("(shift+tab untuk ganti) · aksi krusial tetap ditanyakan · /help")}`
      : `  ${c.dim("▸ minta persetujuan (shift+tab untuk ganti) · Esc hentikan AI · /help")}`;
  }

  /**
   * Input gaya Claude Code: status di kanan atas, input di antara dua garis, baris mode di bawah.
   * readline menghapus layar di bawah kursor setiap kali menggambar ulang, jadi garis bawah dan
   * baris mode digambar ulang setelah setiap tombol.
   */
  function readInput(): Promise<string | null> {
    const cols = Math.max(20, (process.stdout.columns ?? 80) - 1);
    const rule = c.gray("─".repeat(cols));
    const right = status || statusLine();
    const pad = Math.max(2, cols - visibleWidth(right));
    // Sediakan baris untuk garis bawah & baris mode, lalu kembali ke baris input.
    out.write(`\n${" ".repeat(pad)}${right}\n${rule}\n\n${rule}\n${modeLine()}\x1b[2A\r`);
    status = "";
    const rl = readline.createInterface({ input: process.stdin, output: out, terminal: true, history: [...history], historySize: 200, completer, removeHistoryDuplicates: true });
    activeRl = rl;
    promptActive = true;
    const promptText = `${accent("❯")} `;
    const drawFooter = () => {
      if (!promptActive) return;
      const pos = rl.getCursorPos();
      const total = Math.floor((visibleWidth(promptText) + rl.line.length) / (cols + 1)) + 1;
      const down = total - pos.rows;
      out.write(`\x1b7\x1b[${down}B\r\x1b[2K${rule}\x1b[1B\r\x1b[2K${modeLine()}\x1b8`);
    };
    const onKey = (_str: string | undefined, key: { name?: string; shift?: boolean } | undefined) => {
      if (key?.name === "tab" && key.shift) {
        session.approval.setMode(session.approval.mode === "auto" ? "ask" : "auto");
      }
      setImmediate(drawFooter);
    };
    process.stdin.on("keypress", onKey);
    return new Promise((resolve) => {
      let settled = false;
      const finish = (value: string | null) => {
        if (settled) return;
        settled = true;
        promptActive = false;
        activeRl = undefined;
        process.stdin.off("keypress", onKey);
        history.splice(0, history.length, ...((rl as unknown as { history?: string[] }).history ?? history));
        rl.close();
        // Hapus garis bawah & baris mode; input yang sudah diketik tetap tercatat.
        out.write("\r\x1b[J");
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
        setStatus(c.yellow("Tekan Ctrl+C sekali lagi untuk keluar"));
      });
      rl.on("close", () => finish(null));
      rl.question(promptText, (answer) => finish(answer));
      setImmediate(drawFooter);
    });
  }

  async function runTask(task: string): Promise<void> {
    if (lock.owner) {
      io.out(c.yellow(`  Zentara AI sedang mengerjakan tugas dari ${lock.owner}. Tunggu sampai selesai.`));
      return;
    }
    lock.owner = "terminal";
    runningTask = true;
    status = "";
    const controller = new AbortController();
    const release = keys.push((_str, key) => {
      if (key.name === "escape" || (key.ctrl && key.name === "c")) {
        if (!controller.signal.aborted) {
          controller.abort();
          spinnerLabel = "Menghentikan";
          spinner.start(spinnerLabel);
        }
      }
    });
    spinnerLabel = "Berpikir";
    spinner.start(spinnerLabel);
    let result: AgentResult | undefined;
    try {
      result = await session.run(task, { signal: controller.signal });
    } catch (err) {
      spinner.stop();
      io.out(c.red(`  ✗ ${(err as Error).message}`));
    } finally {
      spinner.stop();
      release();
      runningTask = false;
      lock.owner = undefined;
    }
    if (!result) return;
    const label = {
      done: c.green("✓ Selesai"),
      incomplete: c.yellow("… Belum selesai (batas langkah)"),
      refused: c.yellow("✗ Ditolak model"),
      verification_failed: c.red("✗ Verifikasi gagal"),
      interrupted: c.yellow("■ Dihentikan"),
    }[result.status];
    const files = result.changedFiles.length ? ` · ${result.changedFiles.length} file berubah ${c.dim("(/undo untuk membatalkan)")}` : "";
    io.out(`\n${label}${c.dim(` · ${result.steps} langkah${result.providersUsed.length ? ` · ${result.providersUsed.join(", ")}` : ""}`)}${files}`);
    if (result.changedFiles.length && devServer.url) io.out(c.dim(`  Lihat hasilnya: ${devServer.url}`));
  }

  async function confirm(question: string): Promise<boolean> {
    return select(keys, question, [{ label: "Ya", value: true }, { label: "Tidak", value: false }], false);
  }

  async function command(line: string): Promise<boolean> {
    const [cmd, ...rest] = line.slice(1).trim().split(/\s+/);
    const arg = rest.join(" ");
    switch (cmd) {
      case "help":
      case "?":
        io.out("");
        for (const [name, desc] of COMMANDS) io.out(`  ${accent(name.padEnd(9))} ${desc}`);
        io.out(c.dim("\n  Selain itu, tulis saja permintaan Anda, mis. \"buatkan API produk dengan nama dan harga\"."));
        return true;
      case "exit":
      case "quit":
      case "keluar":
        return false;
      case "clear":
        session.reset();
        out.write("\x1b[2J\x1b[H");
        io.out(c.dim("  Percakapan baru dimulai."));
        return true;
      case "mode": {
        const mode = arg === "auto" || arg === "otomatis" ? "auto" : arg === "ask" || arg === "tanya" ? "ask" : session.approval.mode === "auto" ? "ask" : "auto";
        session.approval.setMode(mode);
        io.out(`  Mode: ${mode === "auto" ? "otomatis (perubahan biasa langsung dikerjakan; aksi krusial tetap ditanyakan)" : "minta persetujuan untuk setiap perubahan"}`);
        return true;
      }
      case "dev": {
        if (externalServer) {
          io.out(`  Server sudah berjalan di terminal lain: ${externalServer}`);
          return true;
        }
        if (arg === "stop") {
          await devServer.stop();
          io.out("  Server dev dihentikan.");
        } else if (arg === "start" || arg === "restart") {
          if (!fs.existsSync(path.join(cwd, "src", "app"))) {
            io.out(c.yellow("  Folder src/app tidak ada: ini bukan proyek Zentara."));
            return true;
          }
          if (arg === "restart") await devServer.stop();
          if (!devServer.running) {
            devServer.start();
            spinnerLabel = "Menyalakan server";
            spinner.start(spinnerLabel);
            const text = await waitForServer();
            spinner.stop();
            io.out(`  ${text.split("\n")[0]}`);
          } else io.out(`  Server dev sudah berjalan${devServer.url ? ` di ${devServer.url}` : ""}.`);
        } else io.out(`  ${statusLine()}`);
        return true;
      }
      case "logs": {
        const lines = externalServer ? ["(server berjalan di terminal lain)"] : devServer.logs(Number(arg) || 40);
        io.out(lines.length ? lines.map((l) => c.dim("  │ ") + l).join("\n") : c.dim("  (belum ada log)"));
        return true;
      }
      case "open": {
        const url = externalServer ?? devServer.url;
        if (!url) io.out(c.yellow("  Server dev belum berjalan. Jalankan dengan /dev start."));
        else {
          openBrowser(url + (arg ? `/${arg.replace(/^\/+/, "")}` : ""));
          io.out(c.dim(`  Membuka ${url}...`));
        }
        return true;
      }
      case "undo": {
        const preview = latestJournal(cwd);
        if (!preview) {
          io.out("  Tidak ada perubahan AI yang bisa dibatalkan.");
          return true;
        }
        io.out(`  Perubahan terakhir: ${c.bold(preview.task.split("\n")[0]!.slice(0, 80))}`);
        for (const e of preview.entries) io.out(c.dim(`    ${e.action === "delete" ? "hapus   " : "pulihkan"} ${e.path}`));
        if (await confirm("Batalkan perubahan ini?")) {
          undoLatest(cwd);
          io.out(c.green("  ✓ Perubahan dibatalkan."));
        }
        return true;
      }
      case "omniroute": {
        const url = omniUrl ?? `${OMNIROUTE.api}/models`;
        if (arg === "install") {
          if (omnirouteInstalled()) io.out("  OmniRoute sudah terpasang.");
          else if ((await confirm("Pasang OmniRoute sekarang (npm install -g omniroute)?")) && (await installOmni())) {
            omniUrl ??= url;
            await startOmniRoute();
          }
        } else if (arg === "start") {
          if (!omnirouteInstalled()) io.out(c.yellow("  OmniRoute belum terpasang. Jalankan: /omniroute install"));
          else {
            omniUrl ??= url;
            await startOmniRoute();
          }
        } else if (arg === "stop") {
          if (omniroute?.running) {
            await omniroute.stop();
            io.out("  OmniRoute dihentikan.");
          } else io.out("  OmniRoute tidak dijalankan dari sesi ini.");
        } else {
          const up = await isServerUp(url);
          io.out(`  OmniRoute: ${up ? c.green("berjalan") : omnirouteInstalled() ? c.yellow("terpasang, belum berjalan (/omniroute start)") : c.yellow("belum terpasang (/omniroute install)")}`);
          io.out(c.dim(`  Dashboard: ${OMNIROUTE.dashboard} · API: ${OMNIROUTE.api} · ${OMNIROUTE.repo}`));
        }
        if (arg === "install" || arg === "start") {
          // Provider yang sempat gagal dicoba ulang dengan percakapan baru.
          session = newSession(config);
        }
        return true;
      }
      case "status": {
        spinnerLabel = "Mengecek provider";
        spinner.start(spinnerLabel);
        const rows: string[] = [];
        for (const provider of createProviders(config.providers)) {
          try {
            rows.push(`  ${c.green("✓")} ${provider.name.padEnd(10)} ${c.dim(await provider.check())}`);
          } catch (err) {
            rows.push(`  ${c.red("✗")} ${provider.name.padEnd(10)} ${c.dim(err instanceof ProviderUnavailableError ? err.reason : (err as Error).message)}`);
          }
        }
        spinner.stop();
        for (const r of rows) io.out(r);
        return true;
      }
      case "setup":
      case "login":
        await runSetupWizard(arg || undefined);
        return true;
      default:
        io.out(c.yellow(`  Perintah tidak dikenal: /${cmd}. Ketik /help.`));
        return true;
    }
  }

  // ── Loop utama ─────────────────────────────────────────────────────────
  try {
    for (;;) {
      const line = await readInput();
      if (line === null) break;
      const text = line.trim();
      if (!text) continue;
      if (["keluar", "exit", "quit"].includes(text.toLowerCase())) break;
      if (text.startsWith("/")) {
        if (!(await command(text))) break;
        continue;
      }
      await runTask(text);
    }
  } finally {
    spinner.stop();
    if (devServer.running) {
      io.out(c.dim("  Menghentikan server dev..."));
      await devServer.stop();
    }
    if (omniroute?.running) {
      io.out(c.dim("  Menghentikan OmniRoute..."));
      await omniroute.stop();
    }
    await devtools?.close();
    io.out(c.dim("  Sampai jumpa!"));
  }
  return 0;
}
