#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath, pathToFileURL } from "node:url";
import readline from "node:readline/promises";
import { resolveAiConfig, createProviders, type AiUserConfig } from "./ai/config.js";
import { PRESETS } from "./ai/presets.js";
import { interactiveSetup } from "./ai/setup.js";
import { latestJournal, undoLatest } from "./ai/journal.js";
import { createTerminalSession } from "./ai/session.js";
import { c } from "./ai/terminal.js";
import { startDevtools, type Devtools } from "./dev/devtools.js";
import { startRepl } from "./repl/repl.js";
import { banner, colorDepth } from "./brand/index.js";
import { checkForUpdate } from "./update.js";
import { ProviderUnavailableError } from "./ai/types.js";
import { defaultAppDir, loadConfigFile, resolveConfig } from "./core/config.js";
import type { DbCommandResult } from "./db/commands.js";
import { ZenLogger } from "./core/logger.js";
import { allowedMethods, HTTP_METHODS, segmentsFromFile, ZenRouter } from "./core/router.js";

export interface CliIO {
  cwd: string;
  out: (line: string) => void;
  err: (line: string) => void;
  /** Terminal interaktif (bisa bertanya ya/tidak). Default false. */
  interactive?: boolean;
}

const HELP = `Zentara Core CLI

Menjalankan aplikasi:
  zentara dev [--no-ai]                            Server pengembangan dengan auto-reload (src/app),
                                                   halaman error lengkap & chat Zentara AI di browser
  zentara build                                    Kompilasi TypeScript ke dist/
  zentara start                                    Jalankan hasil build (produksi, dist/app)

Bicara dengan AI (bahasa sehari-hari):
  zentara                                          CLI interaktif: chat dengan AI, server dev di latar
                                                   belakang (ditanya dulu; --no-dev untuk melewati)
  zentara "buatkan API produk dengan nama dan harga"
  zentara ai "<perintah>" [--auto] [--dry-run]
  zentara ai:status                                Cek provider AI yang tersedia
  zentara ai:setup [provider]                      Atur provider AI (Claude, OpenAI, Gemini, Groq, DeepSeek,
                                                   OpenRouter, OmniRoute, Ollama): API key, model, tes koneksi
  zentara undo [--yes]                             Batalkan perubahan AI terakhir

  --auto      Perubahan biasa langsung dikerjakan; hanya aksi krusial yang ditanyakan
  --dry-run   Tampilkan apa yang akan dilakukan tanpa mengubah file

Perintah manual:
  zentara routes [--json]                          Tampilkan semua route
  zentara db:generate [--name <nama>]              Buat file migrasi dari perubahan schema
  zentara db:migrate                               Terapkan migrasi ke database
  zentara db:seed                                  Isi data awal (app/db/seed.ts)
  zentara make:route <path> [--methods GET,POST]   Buat file route baru, mis. api/products/[id]
  zentara make:middleware <nama>                   Buat file middleware baru
  zentara help                                     Tampilkan bantuan ini
  zentara --version

Opsi:
  --force        Timpa file yang sudah ada
  --dir <path>   Folder aplikasi (default: src/app)
`;

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
    else if (next !== undefined && !next.startsWith("--") && ["methods", "dir", "name"].includes(key)) {
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
    io.err(`File sudah ada: ${path.relative(io.cwd, file)} (pakai --force untuk menimpa)`);
    return false;
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
  io.out(`Dibuat: ${path.relative(io.cwd, file)}`);
  return true;
}

function makeRoute(args: ParsedArgs, io: CliIO): number {
  const raw = args.positional[1];
  if (!raw) {
    io.err("Pemakaian: zentara make:route <path> [--methods GET,POST]");
    return 1;
  }
  const routePath = raw.replace(/^\/+|\/+$/g, "").replace(/\.(ts|js)$/, "") || "index";
  if (routePath.split("/").some((p) => p === ".." || p === ".")) {
    io.err(`Path route tidak valid: ${raw}`);
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
    io.err(`Method tidak valid: ${invalid.join(", ") || "(kosong)"}. Pilihan: ${HTTP_METHODS.join(", ")}`);
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
    io.err("Pemakaian: zentara make:middleware <nama> (huruf, angka, - atau _)");
    return 1;
  }
  const file = path.join(appDir(io, args.flags), "middleware", `${name}.ts`);
  const fnName = name.replace(/[-_](\w)/g, (_, c: string) => c.toUpperCase());
  const content = `import { defineMiddleware } from "${coreImport(file, io)}";

export const ${fnName} = defineMiddleware(async (ctx, next) => {
  // Sebelum handler: cek/ubah request, atau kembalikan respons untuk menghentikan rantai.
  const result = await next();
  // Sesudah handler: mis. tambahkan header.
  return result;
});
`;
  if (!writeNewFile(file, content, args.flags.force === true, io)) return 1;
  io.out(`Daftarkan di src/app/middleware.ts atau di \`export const middleware = [${fnName}]\` pada file route.`);
  return 0;
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
    io.out(`Belum ada route di ${path.relative(io.cwd, config.routesDir) || "."}`);
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
  "help", "dev", "build", "start", "routes", "make:route", "make:middleware", "ai", "ai:status", "ai:setup", "undo", "db:generate", "db:migrate", "db:seed",
]);

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
  const modeText = config.mode === "auto" ? "otomatis (hanya aksi krusial ditanyakan)" : "minta persetujuan";
  io.out(c.dim(`Zentara AI · mode: ${modeText}${args.flags["dry-run"] ? " · dry-run" : ""}`));
  if (!rl) io.out(c.dim("Terminal non-interaktif: aksi yang butuh persetujuan akan ditolak (pakai --auto untuk perubahan biasa)."));

  try {
    if (task) {
      const result = await session.run(task);
      return result.status === "done" ? 0 : 1;
    }
    if (!rl) {
      io.err('Tulis perintahnya, mis. zentara ai "buat endpoint /api/produk"');
      return 1;
    }
    io.out(c.dim('Mode obrolan. Ketik permintaan dalam bahasa biasa; "keluar" untuk selesai.'));
    for (;;) {
      let line: string;
      try {
        line = (await rl.question(c.cyan("zentara> "))).trim();
      } catch {
        break; // Ctrl+D / Ctrl+C
      }
      if (!line) continue;
      if (["keluar", "exit", "quit"].includes(line.toLowerCase())) break;
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
  try {
    appPort = resolveConfig(await loadConfigFile(io.cwd), serverEnv, io.cwd).port;
  } catch {
    // Config rusak: AI tetap bisa dipakai untuk memperbaikinya.
  }
  return startRepl({
    cwd: io.cwd,
    io,
    version: version(),
    checkUpdate: () => checkForUpdate({ current: version() }),
    loadConfig: () => loadAiConfig(io, args.flags),
    serverEnv,
    fallbackDev: { command: process.execPath, args: [fileURLToPath(import.meta.url), "dev"] },
    appPort,
    offerDevServer: args.flags["no-dev"] !== true,
    dryRun: args.flags["dry-run"] === true,
    runSetup: async (rl, preset) => {
      const user = (await loadConfigFile(io.cwd)) as { ai?: AiUserConfig };
      return interactiveSetup({ root: io.cwd, rl, io, preset, configProviders: user.ai?.providers });
    },
  });
}

async function aiStatus(args: ParsedArgs, io: CliIO): Promise<number> {
  const config = await loadAiConfig(io, args.flags);
  io.out(`Mode persetujuan: ${config.mode}`);
  io.out("Urutan provider (yang pertama dicoba lebih dulu):");
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
  if (ready === 0) io.out(c.yellow("\nBelum ada provider yang siap. Jalankan: zentara ai:setup"));
  return ready > 0 ? 0 : 1;
}

async function aiSetup(args: ParsedArgs, io: CliIO): Promise<number> {
  loadDotEnv(io.cwd);
  const user = (await loadConfigFile(io.cwd)) as { ai?: AiUserConfig };
  if (io.interactive) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    try {
      return await interactiveSetup({ root: io.cwd, rl, io, preset: args.positional[1], configProviders: user.ai?.providers });
    } finally {
      rl.close();
    }
  }

  // Tanpa terminal interaktif: tampilkan panduan.
  const env = process.env;
  const rows = PRESETS.map((p) => {
    const how = p.local ? `jalankan servernya (${p.urlEnv}, ${p.modelEnv})` : `isi ${p.keyEnv} (model: ${p.modelEnv}${p.defaultModel ? `, default ${p.defaultModel}` : ""})`;
    const state = p.local ? "" : p.keyEnv && env[p.keyEnv] ? c.green(" ✓") : "";
    return `  ${p.name.padEnd(11)} ${p.label}${state}
              ${c.dim(how)}`;
  });
  io.out(`Zentara AI memakai rantai provider: bila satu habis kredit/kuota atau mati, otomatis pindah ke berikutnya.

Cara termudah (di terminal interaktif):  npx zentara ai:setup   atau   npx zentara ai:setup openai

Atau isi langsung di .env. Provider dengan API key terisi otomatis dipakai:
${rows.join("\n")}

Urutan: ZENTARA_AI_ORDER=openai,claude,ollama (provider lain menyusul). Cek: npx zentara ai:status`);
  return 0;
}

async function undo(args: ParsedArgs, io: CliIO): Promise<number> {
  const preview = latestJournal(io.cwd);
  if (!preview) {
    io.out("Tidak ada perubahan AI yang bisa dibatalkan.");
    return 0;
  }
  io.out(`Perubahan terakhir (${preview.createdAt}): ${preview.task.slice(0, 80)}`);
  for (const e of preview.entries) io.out(`  ${e.action === "delete" ? "hapus  " : "pulihkan"} ${e.path}`);
  if (args.flags.yes !== true) {
    if (!io.interactive) {
      io.out("Jalankan ulang dengan --yes untuk membatalkan.");
      return 1;
    }
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = (await rl.question("Batalkan perubahan ini? [y/n] > ")).trim().toLowerCase();
    rl.close();
    if (!["y", "ya", "yes"].includes(answer)) return 1;
  }
  undoLatest(io.cwd);
  io.out(c.green("✓ Perubahan dibatalkan."));
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
    io.err("Folder src/app tidak ditemukan. Jalankan perintah ini di folder proyek Zentara.");
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
      io.err(c.yellow(`Chat Zentara AI di browser tidak aktif: ${(err as Error).message}`));
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
    io.err("TypeScript belum dipasang di proyek ini. Jalankan: npm install -D typescript");
    return 1;
  }
  const project = fs.existsSync(path.join(io.cwd, "tsconfig.build.json")) ? "tsconfig.build.json" : "tsconfig.json";
  io.out(c.dim(`tsc -p ${project}`));
  const code = await runChild(process.execPath, [tsc, "-p", project], io.cwd, process.env);
  if (code === 0) io.out(c.green("✓ Build selesai. Jalankan dengan: zentara start"));
  return code;
}

async function start(io: CliIO): Promise<number> {
  const appDir = path.join(io.cwd, "dist", "app");
  if (!fs.existsSync(appDir)) {
    io.err("dist/app tidak ditemukan. Jalankan dulu: zentara build");
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
  if (args.flags.version) {
    io.out(version());
    return 0;
  }
  const needsProjectCode = !["help", "dev", "build", "start", "make:route", "make:middleware", "db:generate", undefined].includes(command);
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
      io.out(HELP);
      return 0;
    case "help":
      if (io.interactive) {
        for (const line of banner({ version: version(), columns: process.stdout.columns ?? 80, depth: colorDepth(process.stdout) })) io.out(line);
        io.out("");
      }
      io.out(HELP);
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
    default:
      io.err(`Perintah tidak dikenal: ${command}\n`);
      io.err(HELP);
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
