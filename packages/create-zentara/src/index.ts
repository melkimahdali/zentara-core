#!/usr/bin/env node
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

export const TEMPLATES = {
  api: "API + login + database (SQLite) + CRUD produk",
  minimal: "Minimal: halaman & API sederhana, tanpa database",
} as const;
export type TemplateName = keyof typeof TEMPLATES;

const here = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(here, "..", "templates");
/** File yang tidak ikut ter-publish ke npm bila namanya diawali titik; di template disimpan dengan awalan "_". */
const RENAMES: Record<string, string> = { _gitignore: ".gitignore" };
const PACKAGE_NAME = /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (s: string) => (useColor ? `\x1b[${code}m${s}\x1b[0m` : s);
// Warna brand Zentara Core: Teal #2ED3B7 dan Heritage Gold #C89B52 (fallback 16 warna bila tidak truecolor).
const truecolor = useColor && (process.stdout.getColorDepth?.() ?? 4) >= 24;
const c = {
  bold: paint("1"),
  dim: paint("2"),
  green: paint("32"),
  cyan: paint("36"),
  red: paint("31"),
  teal: paint(truecolor ? "38;2;46;211;183" : "36"),
  gold: paint(truecolor ? "38;2;200;155;82" : "33"),
};

export function ownVersion(): string {
  const pkg = JSON.parse(fs.readFileSync(path.join(here, "..", "package.json"), "utf8")) as { version: string };
  return pkg.version;
}

/** Nama paket npm yang valid dari nama folder, mis. "Toko Saya" -> "toko-saya". */
export function toPackageName(dirName: string): string {
  const name = dirName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-._~]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  return PACKAGE_NAME.test(name) && name.length <= 214 ? name : "zentara-app";
}

export interface ScaffoldOptions {
  targetDir: string;
  template: TemplateName;
  /** Nama paket di package.json. Default dari nama folder. */
  packageName?: string;
  /** Versi/spesifikasi dependency "zentara". Default: ^<versi create-zentara>. */
  zentaraSpec?: string;
}

function isEmptyDir(dir: string): boolean {
  return !fs.existsSync(dir) || fs.readdirSync(dir).filter((f) => f !== ".git").length === 0;
}

function copyDir(from: string, to: string): void {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "data") continue;
    const src = path.join(from, entry.name);
    const dest = path.join(to, RENAMES[entry.name] ?? entry.name);
    if (entry.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

/** Salin template ke folder tujuan dan sesuaikan package.json serta .env. */
export function scaffold(options: ScaffoldOptions): { packageName: string } {
  const template = path.join(TEMPLATES_DIR, options.template);
  if (!fs.existsSync(template)) throw new Error(`Template tidak dikenal: ${options.template}`);
  const target = path.resolve(options.targetDir);
  if (!isEmptyDir(target)) throw new Error(`Folder ${target} sudah berisi file. Pilih nama folder lain atau kosongkan dulu.`);

  copyDir(template, target);

  const packageName = options.packageName ?? toPackageName(path.basename(target));
  if (!PACKAGE_NAME.test(packageName)) throw new Error(`Nama paket tidak valid: ${packageName}`);
  const pkgFile = path.join(target, "package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8")) as { name: string; dependencies: Record<string, string> };
  pkg.name = packageName;
  pkg.dependencies.zentara = options.zentaraSpec ?? `^${ownVersion()}`;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n");

  // .env siap pakai dengan SESSION_SECRET acak (tidak pernah ikut di-commit karena ada di .gitignore).
  const example = path.join(target, ".env.example");
  if (fs.existsSync(example)) {
    let env = fs.readFileSync(example, "utf8");
    const secret = crypto.randomBytes(32).toString("hex");
    env = /^SESSION_SECRET=.*$/m.test(env) ? env.replace(/^SESSION_SECRET=.*$/m, `SESSION_SECRET=${secret}`) : `${env.trimEnd()}\nSESSION_SECRET=${secret}\n`;
    fs.writeFileSync(path.join(target, ".env"), env, { mode: 0o600 });
  }
  return { packageName };
}

export function detectPackageManager(userAgent = process.env.npm_config_user_agent ?? ""): "npm" | "pnpm" | "yarn" | "bun" {
  const name = userAgent.split("/")[0];
  return name === "pnpm" || name === "yarn" || name === "bun" ? name : "npm";
}

/** Kutip satu argumen untuk cmd.exe: aman untuk path berspasi dan tanda kutip. */
export function quoteWindowsArg(arg: string): string {
  if (arg !== "" && /^[\w@+=:,./\\-]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '""')}"`;
}

/**
 * Di Windows, npm/pnpm/yarn adalah file .cmd yang hanya bisa dijalankan lewat shell; argumen dikutip
 * agar path berspasi (mis. "C:\Program Files\nodejs\node.exe") tidak terpotong. Path absolut tanpa shell.
 */
export function platformCommand(command: string, args: readonly string[], platform: NodeJS.Platform = process.platform) {
  if (platform !== "win32" || path.win32.isAbsolute(command) || path.posix.isAbsolute(command)) {
    return { command, args: [...args], shell: false };
  }
  return { command: [command, ...args].map(quoteWindowsArg).join(" "), args: [] as string[], shell: true };
}

function run(command: string, args: string[], cwd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = platformCommand(command, args);
    const child = spawn(cmd.command, cmd.args, { cwd, stdio: "inherit", shell: cmd.shell });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

interface CliArgs {
  dir?: string;
  template?: string;
  install: boolean;
  yes: boolean;
  zentaraSpec?: string;
  help: boolean;
}

export function parseArgs(argv: readonly string[]): CliArgs {
  const args: CliArgs = { install: true, yes: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const next = () => argv[++i];
    if (a === "--template" || a === "-t") args.template = next();
    else if (a.startsWith("--template=")) args.template = a.slice(11);
    else if (a === "--no-install") args.install = false;
    else if (a === "--yes" || a === "-y") args.yes = true;
    else if (a === "--help" || a === "-h") args.help = true;
    else if (a === "--zentara-spec") args.zentaraSpec = next();
    else if (!a.startsWith("-") && !args.dir) args.dir = a;
  }
  return args;
}

const HELP = `Buat proyek Zentara baru

  npm create zentara@latest [folder] [-- --template api|minimal] [--no-install] [--yes]

Template:
${Object.entries(TEMPLATES).map(([k, v]) => `  ${k.padEnd(8)} ${v}`).join("\n")}
`;

export async function main(argv = process.argv.slice(2)): Promise<number> {
  const args = parseArgs(argv);
  if (args.help) {
    console.log(HELP);
    return 0;
  }
  console.log(`\n${c.teal("Z>")} ${c.bold("Zentara")} ${c.bold(c.teal("Core"))} ${c.dim(`v${ownVersion()}`)}`);
  console.log(`   ${c.dim("AI-driven TypeScript web framework from Indonesia")}`);
  console.log(`   ${c.gold("Rooted here. Built for what's next.")}\n`);

  const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY) && !args.yes;
  const rl = interactive ? readline.createInterface({ input: process.stdin, output: process.stdout }) : undefined;
  try {
    let dir = args.dir;
    if (!dir) dir = rl ? (await rl.question(`Nama folder proyek ${c.dim("(zentara-app)")}: `)).trim() || "zentara-app" : "zentara-app";

    let template = args.template as TemplateName | undefined;
    if (template && !(template in TEMPLATES)) {
      console.error(c.red(`Template tidak dikenal: ${template}. Pilihan: ${Object.keys(TEMPLATES).join(", ")}`));
      return 1;
    }
    if (!template) {
      if (rl) {
        const names = Object.keys(TEMPLATES) as TemplateName[];
        console.log("Pilih template:");
        names.forEach((n, i) => console.log(`  ${i + 1}. ${c.bold(n.padEnd(8))} ${TEMPLATES[n]}`));
        const answer = (await rl.question(`Nomor ${c.dim("(1)")}: `)).trim();
        template = names[Number(answer || "1") - 1] ?? "api";
      } else template = "api";
    }

    let install = args.install;
    if (rl && install) {
      const answer = (await rl.question(`Pasang dependency sekarang? ${c.dim("(Y/n)")}: `)).trim().toLowerCase();
      install = answer === "" || answer.startsWith("y");
    }
    rl?.close();

    const target = path.resolve(dir);
    const { packageName } = scaffold({ targetDir: target, template, zentaraSpec: args.zentaraSpec });
    const rel = path.relative(process.cwd(), target) || ".";
    console.log(`\n${c.green("✓")} Proyek ${c.bold(packageName)} dibuat di ${rel} (template ${template})`);

    const pm = detectPackageManager();
    let ready = false;
    if (install) {
      console.log(c.dim(`\n${pm} install...`));
      ready = await run(pm, ["install"], target);
      if (!ready) console.error(c.red(`Gagal memasang dependency. Coba jalankan manual: cd ${rel} && ${pm} install`));
      if (ready && template === "api") {
        const cli = path.join(target, "node_modules", "zentara", "dist", "cli.js");
        ready = (await run(process.execPath, [cli, "db:migrate"], target)) && (await run(process.execPath, [cli, "db:seed"], target));
      }
    }

    const runCmd = pm === "npm" ? "npm run" : pm;
    console.log(`\nLangkah berikutnya:\n`);
    if (rel !== ".") console.log(`  cd ${rel}`);
    if (!ready) {
      console.log(`  ${pm} install`);
      if (template === "api") console.log(`  npx zentara db:migrate && npx zentara db:seed`);
    }
    console.log(`  npx zentara ai:setup          ${c.dim("# atur provider AI (sekali saja)")}`);
    console.log(`  npx zentara                   ${c.dim("# chat dengan Zentara AI + server dev di latar belakang")}`);
    console.log(`\nAtau jalankan server saja: ${runCmd} dev ${c.dim("(http://localhost:3000)")}\n`);
    return 0;
  } catch (err) {
    rl?.close();
    console.error(c.red((err as Error).message));
    return 1;
  }
}

const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
if (invokedDirectly) {
  main().then((code) => {
    process.exitCode = code;
  });
}
