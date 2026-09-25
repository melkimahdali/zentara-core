#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import readline from "node:readline/promises";
import { resolveAiConfig, createProviders, type AiUserConfig } from "./ai/config.js";
import { presetLabel, PRESETS } from "./ai/presets.js";
import { interactiveSetup } from "./ai/setup.js";
import { latestJournal, undoLatest } from "./ai/journal.js";
import { createTerminalSession } from "./ai/session.js";
import { c } from "./ai/terminal.js";
import { startDevtools, type Devtools } from "./dev/devtools.js";
import { startRepl } from "./repl/repl.js";
import type { HostOptions } from "./repl/host.js";
import { menuPrompts } from "./repl/prompts.js";
import { banner, colorDepth } from "./brand/index.js";
import { checkForUpdate } from "./update.js";
import { ProviderUnavailableError } from "./ai/types.js";
import { defaultAppDir, loadConfigFile, resolveConfig, type UserConfig } from "./core/config.js";
import type { DbCommandResult } from "./db/commands.js";
import { ZenLogger } from "./core/logger.js";
import { allowedMethods, HTTP_METHODS, segmentsFromFile, ZenRouter } from "./core/router.js";
import { JobQueue, loadJobs, MemoryJobStore, SqliteJobStore } from "./backend/jobs.js";
import { configureMail } from "./backend/mail.js";
import { parseCron } from "./backend/cron.js";
import { getLocale, intlLocale, LOCALE_NAMES, parseLocale, readSettings, resolveLocale, setLocale, t, writeSettings } from "./i18n/index.js";

export interface CliIO {
  cwd: string;
  out: (line: string) => void;
  err: (line: string) => void;
  /** Terminal interaktif (bisa bertanya ya/tidak). Default false. */
  interactive?: boolean;
}


interface ParsedArgs {
  positional: string[];
  flags: Record<string, string | true>;
}

export function parseArgs(argv: readonly string[]): ParsedArgs {
  const positional: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (!arg.startsWith("--")) {
      positional.push(arg);
      continue;
    }
    const [key, inline] = arg.slice(2).split("=", 2) as [string, string | undefined];
    const next = argv[i + 1];
    if (inline !== undefined) flags[key] = inline;
    else if (next !== undefined && !next.startsWith("--") && ["methods", "dir", "name", "data", "schedule"].includes(key)) {
      flags[key] = next;
      i++;
    } else flags[key] = true;
  }
  return { positional, flags };
}

function appDir(io: CliIO, flags: ParsedArgs["flags"]): string {
  return path.resolve(io.cwd, typeof flags.dir === "string" ? flags.dir : path.join("src", "app"));
}

/** File yang dibuat CLI meng-import API framework dari paket "zentara". */
function coreImport(_fromFile: string, _io: CliIO): string {
  return "zentara";
}

function writeNewFile(file: string, content: string, force: boolean, io: CliIO): boolean {
  if (fs.existsSync(file) && !force) {
    io.err(t().cli.fileExists(path.relative(io.cwd, file)));
    return false;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  io.out(t().cli.created(path.relative(io.cwd, file)));
  return true;
}

function makeRoute(args: ParsedArgs, io: CliIO): number {
  const raw = args.positional[1];
  if (!raw) {
    io.err(t().cli.makeRouteUsage);
    return 1;
  }
  const routePath = raw.replace(/^\/+|\/+$/g, "").replace(/\.(ts|js)$/, "") || "index";
  if (routePath.split("/").some((p) => p === ".." || p === ".")) {
    io.err(t().cli.invalidRoutePath(raw));
    return 1;
  }
  const relFile = routePath + ".ts";
  let segments;
  try {
    segments = segmentsFromFile(relFile);
  } catch (err) {
    io.err((err as Error).message);
    return 1;
  }

  const methodsFlag = typeof args.flags.methods === "string" ? args.flags.methods : "GET";
  const methods = methodsFlag.split(",").map((m) => m.trim().toUpperCase()).filter(Boolean);
  const invalid = methods.filter((m) => !(HTTP_METHODS as readonly string[]).includes(m));
  if (invalid.length || methods.length === 0) {
    io.err(t().cli.invalidMethods(invalid.join(", "), HTTP_METHODS.join(", ")));
    return 1;
  }

  const file = path.join(appDir(io, args.flags), "routes", relFile);
  const pattern = "/" + routePath.replace(/(^|\/)index$/, "");
  const hasParams = segments.some((s) => s.kind !== "static");
  const bodyMethods = new Set(["POST", "PUT", "PATCH"]);

  const handlers = methods.map((m) => {
    const needsBody = bodyMethods.has(m);
    const lines = needsBody
      ? [`export async function ${m}(ctx: ZenContext) {`, "  const body = await ctx.json();", `  return { method: "${m}"${hasParams ? ", params: ctx.params" : ""}, body };`, "}"]
      : [`export function ${m}(ctx: ZenContext) {`, `  return { route: "${pattern}"${hasParams ? ", params: ctx.params" : ""}, method: ctx.method };`, "}"];
    return lines.join("\n");
  });
  const content = `import type { ZenContext } from "${coreImport(file, io)}";\n\n// ${pattern}\n${handlers.join("\n\n")}\n`;
  return writeNewFile(file, content, args.flags.force === true, io) ? 0 : 1;
}

function makeMiddleware(args: ParsedArgs, io: CliIO): number {
  const name = args.positional[1];
  if (!name || !/^[A-Za-z][\w-]*$/.test(name)) {
    io.err(t().cli.makeMiddlewareUsage);
    return 1;
  }
  const file = path.join(appDir(io, args.flags), "middleware", `${name}.ts`);
  const fnName = name.replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase());
  const note = t().cli.middlewareTemplate;
  const content = `import { defineMiddleware } from "${coreImport(file, io)}";

export const ${fnName} = defineMiddleware(async (ctx, next) => {
  // ${note.before}
  const result = await next();
  // ${note.after}
  return result;
});
`;
  if (!writeNewFile(file, content, args.flags.force === true, io)) return 1;
  io.out(t().cli.registerMiddleware(fnName));
  return 0;
}

function makeJob(args: ParsedArgs, io: CliIO): number {
  const m = t().backend.cli;
  const name = args.positional[1]?.replace(/\.(ts|js)$/, "");
  if (!name || !/^[a-z0-9][a-z0-9-]*(\/[a-z0-9][a-z0-9-]*)*$/i.test(name)) {
    io.err(m.makeUsage);
    return 1;
  }
  const schedule = typeof args.flags.schedule === "string" ? args.flags.schedule : undefined;
  if (schedule) {
    try {
      parseCron(schedule);
    } catch (err) {
      io.err((err as Error).message);
      return 1;
    }
  }
  const file = path.join(appDir(io, args.flags), "jobs", `${name}.ts`);
  const lines = [
    `import type { JobContext } from "${coreImport(file, io)}";`,
    "",
    `// ${m.template.retries}`,
    "export const retries = 3;",
    ...(schedule ? ["", `// ${m.template.schedule}`, `export const schedule = ${JSON.stringify(schedule)};`] : []),
    "",
    "export default async function (data: unknown, job: JobContext) {",
    `  // ${m.template.handler}`,
    "  job.logger.info(`${job.name} #${job.attempt}`, data);",
    "}",
    "",
  ];
  if (!writeNewFile(file, lines.join("\n"), args.flags.force === true, io)) return 1;
  if (!schedule) io.out(m.enqueueHint(name));
  return 0;
}

function jobsDir(config: { routesDir: string }): string {
  return path.join(path.dirname(config.routesDir), "jobs");
}

/** `zentara jobs`: daftar job, jadwal berikutnya, dan isi antrean. */
async function listJobs(args: ParsedArgs, io: CliIO): Promise<number> {
  loadDotEnv(io.cwd);
  const m = t().backend.cli;
  const config = resolveConfig(await loadConfigFile(io.cwd), process.env, io.cwd);
  const dir = jobsDir(config);
  const defs = await loadJobs(dir);
  let counts: Record<string, number> | undefined;
  if (config.jobs.store === "sqlite" && fs.existsSync(config.jobs.path)) {
    const store = new SqliteJobStore(config.jobs.path);
    counts = store.counts();
    store.close();
  }
  const rows = defs.map((d) => ({ name: d.name, retries: d.retries, schedule: d.schedule?.source ?? null, next: d.schedule ? d.schedule.next().toISOString() : null }));
  if (args.flags.json) {
    io.out(JSON.stringify({ jobs: rows, queue: counts ?? null }, null, 2));
    return 0;
  }
  if (!rows.length) {
    io.out(m.noJobs(path.relative(io.cwd, dir) || "."));
    return 0;
  }
  const width = Math.max(m.header.length, ...rows.map((r) => r.name.length));
  const cronWidth = Math.max(m.schedule.length, ...rows.map((r) => (r.schedule ?? "-").length));
  io.out(`${m.header.padEnd(width)}  ${m.retries.padEnd(7)}  ${m.schedule.padEnd(cronWidth)}  ${m.next}`);
  const fmt = new Intl.DateTimeFormat(intlLocale(), { dateStyle: "medium", timeStyle: "short" });
  for (const r of rows) io.out(`${r.name.padEnd(width)}  ${String(r.retries).padEnd(7)}  ${(r.schedule ?? "-").padEnd(cronWidth)}  ${r.next ? fmt.format(new Date(r.next)) : "-"}`);
  if (counts) io.out(c.dim(`\n${m.queue(counts.queued ?? 0, counts.running ?? 0, counts.failed ?? 0, counts.done ?? 0)}`));
  return 0;
}

/** `zentara jobs:run <nama>`: jalankan satu job sekarang di proses ini (tanpa antrean). */
async function runJob(args: ParsedArgs, io: CliIO): Promise<number> {
  loadDotEnv(io.cwd);
  const m = t().backend.cli;
  const name = args.positional[1];
  if (!name) {
    io.err(m.runUsage);
    return 1;
  }
  let data: unknown = null;
  if (typeof args.flags.data === "string") {
    try {
      data = JSON.parse(args.flags.data);
    } catch {
      io.err(m.badData);
      return 1;
    }
  }
  const config = resolveConfig(await loadConfigFile(io.cwd), process.env, io.cwd);
  const logger = new ZenLogger(config.logLevel);
  configureMail({ ...config.mail, logger });
  const queue = new JobQueue().configure({ logger, store: new MemoryJobStore() });
  await queue.load(jobsDir(config));
  try {
    await queue.runNow(name, data);
    io.out(c.green(m.ran(name)));
    return 0;
  } catch (err) {
    io.err(c.red((err as Error).message));
    return 1;
  }
}

async function listRoutes(args: ParsedArgs, io: CliIO): Promise<number> {
  const config = resolveConfig(await loadConfigFile(io.cwd), process.env, io.cwd);
  const router = new ZenRouter(new ZenLogger("silent"));
  await router.loadRoutes(config.routesDir);

  const rows = router.list.map((r) => ({
    pattern: r.pattern,
    methods: allowedMethods(r.module).filter((m) => m !== "HEAD" && m !== "OPTIONS"),
    middleware: r.middleware.length,
    file: path.relative(io.cwd, r.file),
  }));

  if (args.flags.json) {
    io.out(JSON.stringify(rows, null, 2));
    return 0;
  }
  if (rows.length === 0) {
    io.out(t().cli.noRoutes(path.relative(io.cwd, config.routesDir) || "."));
    return 0;
  }
  const methodText = (m: string[]) => (m.length === HTTP_METHODS.length - 2 ? "ANY" : m.join("|"));
  const table = rows.map((r) => [methodText(r.methods), r.pattern, r.file + (r.middleware ? `  (+${r.middleware} middleware)` : "")]);
  const widths = [0, 1].map((i) => Math.max(...table.map((t) => t[i]!.length), i === 0 ? 6 : 5));
  io.out(`${"METHOD".padEnd(widths[0]!)}  ${"ROUTE".padEnd(widths[1]!)}  FILE`);
  for (const t of table) io.out(`${t[0]!.padEnd(widths[0]!)}  ${t[1]!.padEnd(widths[1]!)}  ${t[2]}`);
  return 0;
}

const KNOWN_COMMANDS = new Set([
  "help", "dev", "build", "start", "routes", "make:route", "make:middleware", "make:job", "ai", "ai:status", "ai:setup", "undo", "db:generate", "db:migrate", "db:seed", "lang", "jobs", "jobs:run",
]);

/** Bahasa CLI: env ZENTARA_LANG, lalu `locale` di zentara.config.mjs, lalu preferensi global, lalu Indonesia. */
async function applyLocale(io: CliIO): Promise<{ source: "env" | "config" | "settings" | "default" }> {
  let configured: unknown;
  try {
    configured = (await loadConfigFile(io.cwd)).locale;
  } catch {
    configured = undefined; // config rusak: pesan error-nya muncul di perintah yang memakainya
  }
  const settings = readSettings();
  setLocale(resolveLocale({ config: configured, settings }));
  const source = parseLocale(process.env.ZENTARA_LANG) ? "env" : parseLocale(configured) ? "config" : settings.locale ? "settings" : "default";
  return { source };
}

/** `zentara lang` menampilkan bahasa aktif; `zentara lang en` menyimpan preferensi global. */
async function lang(args: ParsedArgs, io: CliIO, source: "env" | "config" | "settings" | "default"): Promise<number> {
  const value = args.positional[1];
  if (!value) {
    const m = t().cli.lang;
    const from = { env: m.sourceEnv, config: m.sourceConfig, settings: m.sourceSettings, default: m.sourceDefault }[source];
    io.out(m.current(LOCALE_NAMES[getLocale()], from));
    io.out(c.dim(m.howTo));
    return 0;
  }
  const locale = parseLocale(value);
  if (!locale) {
    io.err(t().cli.lang.invalid(value));
    return 1;
  }
  const file = writeSettings({ locale });
  // Pesan konfirmasi memakai bahasa yang baru dipilih.
  setLocale(locale);
  io.out(c.green(t(locale).cli.lang.saved(LOCALE_NAMES[locale], file)));
  if (source === "env" || source === "config") io.out(c.dim(t(locale).cli.lang.overridden(LOCALE_NAMES[getLocale()])));
  return 0;
}

async function dbCommand(fn: () => Promise<DbCommandResult>, io: CliIO): Promise<number> {
  loadDotEnv(io.cwd);
  try {
    const result = await fn();
    (result.ok ? io.out : io.err)(result.output);
    return result.ok ? 0 : 1;
  } catch (err) {
    io.err((err as Error).message);
    return 1;
  }
}

/** Argumen yang bukan perintah dan berisi spasi dianggap kalimat untuk AI. */
export function isNaturalLanguage(positional: readonly string[]): boolean {
  const first = positional[0];
  if (!first || KNOWN_COMMANDS.has(first)) return false;
  return positional.join(" ").trim().includes(" ");
}

function loadDotEnv(cwd: string): void {
  const file = path.join(cwd, ".env");
  if (fs.existsSync(file)) process.loadEnvFile(file);
}

async function loadAiConfig(io: CliIO, flags: ParsedArgs["flags"]) {
  loadDotEnv(io.cwd);
  const user = (await loadConfigFile(io.cwd)) as { ai?: AiUserConfig };
  const config = resolveAiConfig(user.ai);
  if (flags.auto) config.mode = "auto";
  return config;
}

async function runAi(task: string | undefined, args: ParsedArgs, io: CliIO): Promise<number> {
  const config = await loadAiConfig(io, args.flags);
  const rl = io.interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : undefined;
  const session = createTerminalSession({
    root: io.cwd,
    config,
    io,
    rl,
    dryRun: args.flags["dry-run"] === true,
    verbose: args.flags.verbose === true,
  });
  io.out(c.dim(t().cli.aiMode(config.mode === "auto", args.flags["dry-run"] === true)));
  if (!rl) io.out(c.dim(t().cli.nonInteractive));

  try {
    if (task) {
      const result = await session.run(task);
      return result.status === "done" ? 0 : 1;
    }
    if (!rl) {
      io.err(t().cli.aiNeedsTask);
      return 1;
    }
    io.out(c.dim(t().cli.chatMode));
    for (;;) {
      let line: string;
      try {
        line = (await rl.question(c.cyan("zentara> "))).trim();
      } catch {
        break; // Ctrl+D / Ctrl+C
      }
      if (!line) continue;
      if (t().cli.exitWords.includes(line.toLowerCase())) break;
      try {
        await session.run(line);
      } catch (err) {
        io.err(c.red((err as Error).message));
      }
    }
    return 0;
  } catch (err) {
    io.err(c.red((err as Error).message));
    return 1;
  } finally {
    rl?.close();
  }
}

/** Mode obrolan interaktif (gaya Claude Code). */
async function repl(args: ParsedArgs, io: CliIO, serverEnv: NodeJS.ProcessEnv): Promise<number> {
  await ensureTypeScriptLoader(io.cwd);
  let appPort = 3000;
  let userConfig: UserConfig = {};
  try {
    userConfig = await loadConfigFile(io.cwd);
    appPort = resolveConfig(userConfig, serverEnv, io.cwd).port;
  } catch {
    // Config rusak: AI tetap bisa dipakai untuk memperbaikinya.
  }
  const options: HostOptions = {
    cwd: io.cwd,
    version: version(),
    checkUpdate: () => checkForUpdate({ current: version() }),
    loadConfig: () => loadAiConfig(io, args.flags),
    serverEnv,
    fallbackDev: { command: process.execPath, args: [fileURLToPath(import.meta.url), "dev"] },
    appPort,
    offerDevServer: args.flags["no-dev"] !== true,
    dryRun: args.flags["dry-run"] === true,
    continueLast: args.flags.continue === true,
    runSetup: async (prompts, preset, setupIo) => {
      const user = (await loadConfigFile(io.cwd)) as { ai?: AiUserConfig };
      return interactiveSetup({ root: io.cwd, prompts, io: setupIo ?? io, preset, configProviders: user.ai?.providers });
    },
  };
  // Tampilan Ink (gaya Claude Code) adalah default; --classic atau ZENTARA_UI=classic memakai CLI lama.
  if (args.flags.classic !== true && process.env.ZENTARA_UI !== "classic") {
    let ink: typeof import("./tui/index.js") | undefined;
    try {
      // Dimuat hanya di sini agar perintah lain tidak ikut memuat React.
      ink = await import("./tui/index.js");
    } catch (err) {
      io.err(c.yellow(t().cli.inkFailed((err as Error).message)));
    }
    if (ink) {
      return ink.startInkRepl(options, {
        animation: animationEnabled(userConfig.cli?.animation),
        fullscreen: ink.fullscreenEnabled(userConfig.cli?.fullscreen),
        // Tutup proses setelah CLI selesai rapi, agar timer atau proses anak tidak menahan terminal.
        exitProcess: true,
      });
    }
  }
  return startRepl({ ...options, io });
}

/** Animasi logo pembuka: mati bila ZENTARA_ANIMATION=off/0/false, di CI, atau `cli.animation: false`. */
export function animationEnabled(configured: boolean | undefined, env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.ZENTARA_ANIMATION?.trim().toLowerCase();
  if (flag && ["0", "off", "false", "no", "tidak"].includes(flag)) return false;
  if (flag && ["1", "on", "true", "yes", "ya"].includes(flag)) return true;
  if (env.CI && env.CI !== "false" && env.CI !== "0") return false;
  return configured !== false;
}

async function aiStatus(args: ParsedArgs, io: CliIO): Promise<number> {
  const config = await loadAiConfig(io, args.flags);
  io.out(t().cli.approvalMode(config.mode));
  io.out(t().cli.providerOrder);
  let ready = 0;
  for (const provider of createProviders(config.providers)) {
    try {
      const detail = await provider.check();
      ready++;
      io.out(`  ${c.green("✓")} ${provider.name.padEnd(10)} ${provider.describe()} · ${detail}`);
    } catch (err) {
      const reason = err instanceof ProviderUnavailableError ? err.reason : (err as Error).message;
      io.out(`  ${c.red("✗")} ${provider.name.padEnd(10)} ${provider.describe()} · ${reason}`);
    }
  }
  if (ready === 0) io.out(c.yellow(t().cli.noProviderReady));
  return ready > 0 ? 0 : 1;
}

async function aiSetup(args: ParsedArgs, io: CliIO): Promise<number> {
  loadDotEnv(io.cwd);
  const user = (await loadConfigFile(io.cwd)) as { ai?: AiUserConfig };
  if (io.interactive) {
    return interactiveSetup({ root: io.cwd, prompts: menuPrompts(), io, preset: args.positional[1], configProviders: user.ai?.providers });
  }

  // Tanpa terminal interaktif: tampilkan panduan.
  const env = process.env;
  const rows = PRESETS.map((p) => {
    const how = p.local ? t().cli.setupRunServer(p.urlEnv ?? "", p.modelEnv) : t().cli.setupFillKey(p.keyEnv ?? "", p.modelEnv, p.defaultModel);
    const state = p.local ? "" : p.keyEnv && env[p.keyEnv] ? c.green(" ✓") : "";
    return `  ${p.name.padEnd(11)} ${presetLabel(p)}${state}
              ${c.dim(how)}`;
  });
  io.out(t().cli.setupGuide(rows.join("\n")));
  return 0;
}

async function undo(args: ParsedArgs, io: CliIO): Promise<number> {
  const preview = latestJournal(io.cwd);
  if (!preview) {
    io.out(t().cli.nothingToUndo);
    return 0;
  }
  io.out(t().cli.lastChange(preview.createdAt, preview.task.slice(0, 80)));
  for (const e of preview.entries) io.out(`  ${e.action === "delete" ? t().cli.undoDelete : t().cli.undoRestore} ${e.path}`);
  if (args.flags.yes !== true) {
    if (!io.interactive) {
      io.out(t().cli.rerunWithYes);
      return 1;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question(t().cli.confirmUndo)).trim().toLowerCase();
    rl.close();
    if (!t().cli.yesWords.includes(answer)) return 1;
  }
  undoLatest(io.cwd);
  io.out(c.green(t().cli.undone));
  return 0;
}

const here = path.dirname(fileURLToPath(import.meta.url));
const localRequire = createRequire(import.meta.url);

/** Jalankan proses anak dengan stdio diteruskan, dan teruskan sinyal Ctrl+C/SIGTERM kepadanya. */
function runChild(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd, env, stdio: "inherit" });
    const forward = (signal: NodeJS.Signals) => child.kill(signal);
    process.on("SIGINT", forward);
    process.on("SIGTERM", forward);
    child.on("error", (err) => {
      console.error(err.message);
      resolve(1);
    });
    child.on("exit", (code, signal) => {
      process.off("SIGINT", forward);
      process.off("SIGTERM", forward);
      resolve(code ?? (signal ? 0 : 1));
    });
  });
}

function serveEntry(): string {
  const js = path.join(here, "serve.js");
  return fs.existsSync(js) ? js : path.join(here, "serve.ts");
}

/** Argumen tsx watch: pantau juga seluruh folder aplikasi (file route baru) dan .env. */
export function devWatchArgs(cwd: string, appDir: string, entry: string): string[] {
  return ["watch", "--clear-screen=false", "--include", appDir, "--include", path.join(cwd, ".env"), "--include", path.join(cwd, "zentara.config.mjs"), entry];
}

async function devServer(args: ParsedArgs, io: CliIO): Promise<number> {
  const appDir = path.join(io.cwd, "src", "app");
  if (!fs.existsSync(appDir)) {
    io.err(t().cli.noAppDir);
    return 1;
  }
  const tsxPkg = localRequire.resolve("tsx/package.json");
  const tsxCli = path.join(path.dirname(tsxPkg), (JSON.parse(fs.readFileSync(tsxPkg, "utf8")) as { bin: string }).bin);

  // Salin env sebelum config AI memuat .env ke proses ini: perubahan .env harus tetap terbaca saat server dimulai ulang.
  const childEnv = { ...process.env };
  // Chat Zentara AI dari browser. Dilewati bila sudah disediakan proses induk (CLI interaktif).
  let devtools: Devtools | undefined;
  if (!process.env.ZENTARA_DEVTOOLS_PORT && args.flags["no-ai"] !== true) {
    try {
      await ensureTypeScriptLoader(io.cwd);
      devtools = await startDevtools({ root: io.cwd, loadConfig: () => loadAiConfig(io, {}), log: io.out });
    } catch (err) {
      io.err(c.yellow(t().cli.devtoolsOff((err as Error).message)));
    }
  }
  try {
    return await runChild(process.execPath, [tsxCli, ...devWatchArgs(io.cwd, appDir, serveEntry())], io.cwd, {
      ...childEnv,
      ...devtools?.env,
      NODE_ENV: childEnv.NODE_ENV ?? "development",
      ZENTARA_APP_DIR: appDir,
    });
  } finally {
    await devtools?.close();
  }
}

async function build(io: CliIO): Promise<number> {
  let tsc: string;
  try {
    tsc = createRequire(path.join(io.cwd, "package.json")).resolve("typescript/bin/tsc");
  } catch {
    io.err(t().cli.noTypescript);
    return 1;
  }
  const project = fs.existsSync(path.join(io.cwd, "tsconfig.build.json")) ? "tsconfig.build.json" : "tsconfig.json";
  io.out(c.dim(`tsc -p ${project}`));
  const code = await runChild(process.execPath, [tsc, "-p", project], io.cwd, process.env);
  if (code === 0) io.out(c.green(t().cli.buildDone));
  return code;
}

async function start(io: CliIO): Promise<number> {
  const appDir = path.join(io.cwd, "dist", "app");
  if (!fs.existsSync(appDir)) {
    io.err(t().cli.noDist);
    return 1;
  }
  process.env.NODE_ENV ??= "production";
  const { serve } = (await import(pathToFileURL(serveEntry()).href)) as typeof import("./serve.js");
  await serve({ cwd: io.cwd, appDir });
  return new Promise<number>(() => {}); // server berjalan sampai dihentikan
}

let tsxRegistered = false;

/** Pasang loader TypeScript agar CLI bisa memuat route/db/seed .ts milik proyek (tidak perlu untuk dist/). */
async function ensureTypeScriptLoader(cwd: string): Promise<void> {
  if (tsxRegistered) return;
  tsxRegistered = true;
  if (defaultAppDir(cwd).startsWith(path.join(cwd, "dist"))) return;
  const { register } = (await import("tsx/esm/api")) as { register: () => unknown };
  register();
}

function version(): string {
  const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  try {
    return (JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version?: string }).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function run(argv: readonly string[], io: CliIO): Promise<number> {
  // Salinan env sebelum .env dimuat ke proses ini: dipakai untuk server dev yang dijalankan CLI.
  const serverEnv = { ...process.env };
  const args = parseArgs(argv);
  const command = args.positional[0];
  const { source } = await applyLocale(io);
  if (args.flags.version) {
    io.out(version());
    return 0;
  }
  const needsProjectCode = !["help", "dev", "build", "start", "make:route", "make:middleware", "make:job", "db:generate", "lang", undefined].includes(command);
  if (needsProjectCode || isNaturalLanguage(args.positional)) await ensureTypeScriptLoader(io.cwd);
  if (isNaturalLanguage(args.positional)) return runAi(args.positional.join(" "), args, io);
  switch (command) {
    case "dev":
      return devServer(args, io);
    case "build":
      return build(io);
    case "start":
      return start(io);
    case undefined:
      if (io.interactive) return repl(args, io, serverEnv);
      io.out(t().cli.help);
      return 0;
    case "help":
      if (io.interactive) {
        for (const line of banner({ version: version(), columns: process.stdout.columns ?? 80, depth: colorDepth(process.stdout) })) io.out(line);
        io.out("");
      }
      io.out(t().cli.help);
      return 0;
    case "ai": {
      const task = args.positional.slice(1).join(" ") || undefined;
      if (!task && io.interactive) return repl(args, io, serverEnv);
      return runAi(task, args, io);
    }
    case "ai:status":
      return aiStatus(args, io);
    case "ai:setup":
      return aiSetup(args, io);
    case "undo":
      return undo(args, io);
    case "db:generate":
    case "db:migrate":
    case "db:seed": {
      // Dimuat saat dipakai saja: proyek tanpa database tidak perlu memasang drizzle-orm.
      const db = await import("./db/commands.js");
      const name = typeof args.flags.name === "string" ? args.flags.name : undefined;
      const fn = command === "db:generate" ? () => db.dbGenerate(io.cwd, name) : command === "db:migrate" ? () => db.dbMigrate(io.cwd) : () => db.dbSeed(io.cwd);
      return dbCommand(fn, io);
    }
    case "routes":
      return listRoutes(args, io);
    case "make:route":
      return makeRoute(args, io);
    case "make:middleware":
      return makeMiddleware(args, io);
    case "make:job":
      return makeJob(args, io);
    case "jobs":
      return listJobs(args, io);
    case "jobs:run":
      return runJob(args, io);
    case "lang":
      return lang(args, io, source);
    default:
      io.err(t().cli.unknownCommand(String(command)));
      io.err(t().cli.help);
      return 1;
  }
}

function invokedDirectly(): boolean {
  const script = process.argv[1];
  if (!script) return false;
  try {
    return import.meta.url === pathToFileURL(fs.realpathSync(script)).href;
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  // Output dipotong (mis. `zentara routes | head`): keluar dengan tenang, bukan crash.
  process.stdout.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EPIPE") process.exit(0);
    throw err;
  });
  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);
  run(process.argv.slice(2), { cwd: process.cwd(), out: (l) => console.log(l), err: (l) => console.error(l), interactive }).then(
    (code) => {
      process.exitCode = code;
    },
    (err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    },
  );
}
