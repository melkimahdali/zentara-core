#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadConfigFile, resolveConfig } from "./core/config.js";
import { ZenLogger } from "./core/logger.js";
import { allowedMethods, HTTP_METHODS, segmentsFromFile, ZenRouter } from "./core/router.js";

export interface CliIO {
  cwd: string;
  out: (line: string) => void;
  err: (line: string) => void;
}

const HELP = `Zentara CLI

Pemakaian:
  zentara routes [--json]                          Tampilkan semua route
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
    else if (next !== undefined && !next.startsWith("--") && ["methods", "dir"].includes(key)) {
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
  switch (command) {
    case undefined:
    case "help":
      io.out(HELP);
      return 0;
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
  run(process.argv.slice(2), { cwd: process.cwd(), out: (l) => console.log(l), err: (l) => console.error(l) }).then(
    (code) => {
      process.exitCode = code;
    },
    (err: unknown) => {
      console.error(err instanceof Error ? err.message : err);
      process.exitCode = 1;
    },
  );
}
