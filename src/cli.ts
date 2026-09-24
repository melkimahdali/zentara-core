#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import readline from "node:readline/promises";
import { resolveAiConfig, createProviders, type AiUserConfig } from "./ai/config.js";
import { latestJournal, undoLatest } from "./ai/journal.js";
import { createAiSession } from "./ai/session.js";
import { c } from "./ai/terminal.js";
import { ProviderUnavailableError } from "./ai/types.js";
import { loadConfigFile, resolveConfig } from "./core/config.js";
import { dbGenerate, dbMigrate, dbSeed, type DbCommandResult } from "./db/commands.js";
import { ZenLogger } from "./core/logger.js";
import { allowedMethods, HTTP_METHODS, segmentsFromFile, ZenRouter } from "./core/router.js";

export interface CliIO {
  cwd: string;
  out: (line: string) => void;
  err: (line: string) => void;
  /** Terminal interaktif (bisa bertanya ya/tidak). Default false. */
  interactive?: boolean;
}

const HELP = `Zentara CLI

Bicara dengan AI (bahasa sehari-hari):
  zentara "buatkan API produk dengan nama dan harga"
  zentara                                          Mode obrolan (di terminal interaktif)
  zentara ai "<perintah>" [--auto] [--dry-run]
  zentara ai:status                                Cek provider AI yang tersedia
  zentara ai:setup                                 Panduan memasang provider (Claude, OmniRoute, Ollama)
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

/** Path import ke core dari file yang dibuat: relatif bila core ada di proyek, selain itu nama paket. */
function coreImport(fromFile: string, io: CliIO): string {
  const core = path.join(io.cwd, "src", "core", "index.ts");
  if (!fs.existsSync(core)) return "zentara-core";
  let rel = path.relative(path.dirname(fromFile), core).split(path.sep).join("/");
  if (!rel.startsWith(".")) rel = "./" + rel;
  return rel.replace(/\.ts$/, ".js");
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
  "help", "routes", "make:route", "make:middleware", "ai", "ai:status", "ai:setup", "undo", "db:generate", "db:migrate", "db:seed",
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
  const session = createAiSession({
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
  const config = await loadAiConfig(io, args.flags);
  const status = new Map<string, boolean>();
  for (const provider of createProviders(config.providers)) {
    status.set(provider.name, await provider.check().then(() => true, () => false));
  }
  const mark = (name: string) => (status.get(name) ? c.green("✓ siap") : c.yellow("belum siap"));
  io.out(`Zentara AI memakai rantai provider: jika satu habis kredit/kuota atau mati, otomatis pindah ke berikutnya.

1. Claude (Anthropic) ${mark("claude")}
   Isi ANTHROPIC_API_KEY di file .env (buat kunci di https://console.anthropic.com).

2. OmniRoute (opsional, gateway ke banyak provider termasuk yang gratis) ${mark("omniroute")}
   Pasang dan jalankan sesuai petunjuk di https://github.com/diegosouzapw/OmniRoute
   Zentara otomatis memakai http://localhost:20128/v1 (ubah dengan OMNIROUTE_URL,
   pilih model dengan OMNIROUTE_MODEL, kunci dengan OMNIROUTE_API_KEY bila diperlukan).

3. Ollama (opsional, model lokal & offline) ${mark("ollama")}
   Pasang dari https://ollama.com lalu unduh model yang mendukung tool calling.
   Zentara otomatis memakai http://localhost:11434/v1 (pilih model dengan OLLAMA_MODEL).

Provider yang tidak dipasang otomatis dilewati. Untuk urutan/provider kustom, tambahkan di zentara.config.mjs:

  ai: {
    mode: "ask",            // atau "auto"
    providers: [
      { type: "anthropic", name: "claude" },
      { type: "openai-compatible", name: "omniroute", baseUrl: "http://localhost:20128/v1" },
      { type: "openai-compatible", name: "ollama", baseUrl: "http://localhost:11434/v1", model: "qwen3-coder" },
    ],
  },

Cek kapan saja dengan: zentara ai:status`);
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

function version(): string {
  const pkgPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json");
  try {
    return (JSON.parse(fs.readFileSync(pkgPath, "utf8")) as { version?: string }).version ?? "unknown";
  } catch {
    return "unknown";
  }
}

export async function run(argv: readonly string[], io: CliIO): Promise<number> {
  const args = parseArgs(argv);
  const command = args.positional[0];
  if (args.flags.version) {
    io.out(version());
    return 0;
  }
  if (isNaturalLanguage(args.positional)) return runAi(args.positional.join(" "), args, io);
  switch (command) {
    case undefined:
      if (io.interactive) return runAi(undefined, args, io);
      io.out(HELP);
      return 0;
    case "help":
      io.out(HELP);
      return 0;
    case "ai":
      return runAi(args.positional.slice(1).join(" ") || undefined, args, io);
    case "ai:status":
      return aiStatus(args, io);
    case "ai:setup":
      return aiSetup(args, io);
    case "undo":
      return undo(args, io);
    case "db:generate":
      return dbCommand(() => dbGenerate(io.cwd, typeof args.flags.name === "string" ? args.flags.name : undefined), io);
    case "db:migrate":
      return dbCommand(() => dbMigrate(io.cwd), io);
    case "db:seed":
      return dbCommand(() => dbSeed(io.cwd), io);
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
