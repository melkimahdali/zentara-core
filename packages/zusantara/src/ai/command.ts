import { spawn } from "node:child_process";
import { t } from "../i18n/index.js";
import fs from "node:fs";
import path from "node:path";
import { platformCommand } from "../process.js";
import type { Risk } from "./approval.js";
import type { CommandResult } from "./tools.js";

/** Perintah shell yang ditolak karena tidak bisa dijalankan dengan aman tanpa shell. */
export class CommandRejected extends Error {}

/**
 * Karakter yang punya arti khusus di shell (sh maupun cmd.exe): pipa, rangkaian perintah, pengalihan,
 * substitusi, dan ekspansi variabel. Ditolak di mana pun letaknya, termasuk di dalam tanda kutip,
 * karena cmd.exe tetap mengekspansi %VAR% dan ^ di dalam kutip.
 */
const SHELL_META = /[|&;<>`$(){}%^!\r\n]/;

/** Pecah satu baris perintah menjadi argv. Mendukung kutip tunggal dan ganda; operator shell ditolak. */
export function parseCommand(line: string): string[] {
  const text = line.trim();
  if (!text) throw new CommandRejected(t().ai.command.empty);
  if (SHELL_META.test(text)) {
    throw new CommandRejected(
      t().ai.command.operators,
    );
  }
  const argv: string[] = [];
  let current = "";
  let quote: '"' | "'" | undefined;
  let has = false;
  for (const ch of text) {
    if (quote) {
      if (ch === quote) quote = undefined;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      has = true;
    } else if (/\s/.test(ch)) {
      if (has || current) argv.push(current);
      current = "";
      has = false;
    } else {
      current += ch;
      has = true;
    }
  }
  if (quote) throw new CommandRejected(t().ai.command.unclosedQuote);
  if (has || current) argv.push(current);
  return argv;
}

/** Program yang tidak pernah boleh dijalankan AI (hak akses admin, disk, sistem). */
const DENIED_PROGRAMS = new Set([
  "sudo", "su", "doas", "runas", "pkexec", "chroot",
  "shutdown", "reboot", "halt", "poweroff", "systemctl", "launchctl", "sc", "reg", "regedit",
  "mkfs", "dd", "fdisk", "diskpart", "format", "mount", "umount",
  "chown", "passwd", "useradd", "userdel", "crontab", "schtasks", "setx",
  "powershell", "pwsh", "cmd", "bash", "sh", "zsh", "fish", "wsl", "eval", "exec", "env",
  "printenv", "set", "export", "declare",
]);

/** Subperintah yang menyentuh kredensial atau menerbitkan sesuatu ke luar atas nama pengguna. */
const DENIED_SUBCOMMANDS: { program: string; sub: string[]; reason: "npmAccount" | "pkgAccount" | "gitAccount" | "ghAccount" }[] = [
  { program: "npm", sub: ["publish", "unpublish", "login", "logout", "adduser", "token", "owner", "access", "deprecate", "stage", "trust", "config", "set"], reason: "npmAccount" },
  { program: "pnpm", sub: ["publish", "login", "logout", "config"], reason: "pkgAccount" },
  { program: "yarn", sub: ["publish", "login", "logout", "npm", "config"], reason: "pkgAccount" },
  { program: "git", sub: ["config", "credential", "push", "remote", "filter-branch", "filter-repo"], reason: "gitAccount" },
  { program: "gh", sub: ["auth", "secret", "release", "repo"], reason: "ghAccount" },
];

/** Perintah yang terus berjalan: pakai dev_server, bukan run_command. */
const LONG_RUNNING = [/^npm (run )?(dev|start|serve|watch)$/, /^npx zusantara (dev|serve|start)$/, /^zusantara (dev|serve|start)$/, /--watch\b/, /^npx (vite|nodemon|tsx watch)\b/];

/**
 * Perintah baca-saja yang langsung jalan tanpa persetujuan. Dicocokkan per awalan argv.
 * Argumen yang bisa menulis file (--output, -o untuk git) membuat perintah tidak lagi dianggap aman.
 */
const SAFE_PREFIXES: string[][] = [
  ["git", "status"], ["git", "diff"], ["git", "log"], ["git", "show"], ["git", "blame"],
  ["ls"], ["dir"], ["pwd"],
  ["node", "--version"], ["node", "-v"], ["npm", "--version"], ["npm", "-v"],
  ["npm", "ls"], ["npm", "list"], ["npm", "outdated"], ["npm", "view"], ["npm", "explain"], ["npm", "why"],
  ["npx", "tsc", "--noEmit"], ["tsc", "--noEmit"],
];
const WRITES_OUTPUT = /^(--output(=|$)|-o$|--ext-diff$|--textconv$)/;

function startsWith(argv: string[], prefix: string[]): boolean {
  return prefix.length <= argv.length && prefix.every((p, i) => argv[i] === p);
}

/** Nama program tanpa folder & ekstensi Windows (npm.cmd -> npm). */
function programName(arg: string): string {
  return path.basename(arg).toLowerCase().replace(/\.(exe|cmd|bat|ps1|com)$/, "");
}

const SECRET_ARG = /(^|[\\/:])\.env(\.(?!example$)[^\\/]*)?$|\.(db|sqlite3?)(-wal|-shm|-journal)?$/i;

export interface CommandCheck {
  risk: Risk;
  reason?: string;
}

/**
 * Nilai risiko perintah:
 * - ditolak (CommandRejected): hak admin, disk/sistem, shell bersarang, kredensial, file rahasia, path di luar proyek;
 * - "read": perintah baca-saja yang dikenal (git status/diff/log, ls, npm ls, tsc --noEmit);
 * - "write": cocok dengan ai.allowedCommands di zusantara.config (ditanyakan di mode ask, otomatis di mode auto);
 * - "critical": semua perintah lain, selalu ditanyakan.
 */
export function classifyCommand(argv: string[], allowed: string[] = []): CommandCheck {
  if (argv.length === 0) throw new CommandRejected(t().ai.command.empty);
  const program = programName(argv[0]!);
  const normalized = [program, ...argv.slice(1)];
  if (DENIED_PROGRAMS.has(program) || /^mkfs\./.test(program)) {
    throw new CommandRejected(t().ai.command.forbidden(program));
  }
  if (program !== argv[0] && /[\\/]/.test(argv[0]!)) {
    throw new CommandRejected(t().ai.command.byName);
  }
  for (const d of DENIED_SUBCOMMANDS) {
    if (program === d.program && d.sub.includes(argv[1] ?? "")) throw new CommandRejected(t().ai.command.denied(`${program} ${argv[1]}`, t().ai.command[d.reason]));
  }
  for (const arg of argv.slice(1)) {
    for (const part of arg.split("=")) {
      if (SECRET_ARG.test(part)) throw new CommandRejected(t().ai.command.secretArg(arg));
      if (/^(\/|~|[A-Za-z]:[\\/]|\\\\)/.test(part) || part.split(/[\\/]/).includes("..")) {
        throw new CommandRejected(t().ai.command.outsideArg(arg));
      }
    }
  }
  const joined = normalized.join(" ");
  if (LONG_RUNNING.some((re) => re.test(joined))) {
    throw new CommandRejected(t().ai.command.longRunning);
  }

  if (SAFE_PREFIXES.some((p) => startsWith(normalized, p)) && !normalized.slice(1).some((a) => WRITES_OUTPUT.test(a))) {
    return { risk: "read" };
  }
  for (const entry of allowed) {
    let prefix: string[];
    try {
      prefix = parseCommand(entry);
    } catch {
      continue;
    }
    prefix[0] = programName(prefix[0] ?? "");
    if (prefix.length && startsWith(normalized, prefix)) return { risk: "write", reason: t().ai.command.allowedBy(entry) };
  }
  return { risk: "critical", reason: t().ai.command.criticalReason };
}

const MAX_CAPTURE = 256 * 1024;

/** Jalankan argv di folder proyek tanpa shell (kecuali .cmd di Windows, dengan argumen dikutip). */
export function createCommandRunner(root: string) {
  return (argv: string[], options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<CommandResult> =>
    new Promise((resolve) => {
      const cmd = platformCommand(argv[0]!, argv.slice(1));
      let output = "";
      let child;
      try {
        child = spawn(cmd.command, cmd.args, {
          cwd: root,
          env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1", GIT_PAGER: "cat", PAGER: "cat", GIT_TERMINAL_PROMPT: "0" },
          timeout: options.timeoutMs ?? 120_000,
          shell: cmd.shell,
          signal: options.signal,
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true,
        });
      } catch (err) {
        return resolve({ ok: false, output: (err as Error).message });
      }
      const collect = (c: Buffer) => {
        if (output.length < MAX_CAPTURE) output += c.toString();
      };
      child.stdout!.on("data", collect);
      child.stderr!.on("data", collect);
      child.on("error", (err) => resolve({ ok: false, output: `${output}\n${err.name === "AbortError" ? t().ai.tools.stoppedByUser : err.message}` }));
      child.on("close", (code, killSignal) =>
        resolve({ ok: code === 0, output: killSignal ? `${output}\n${t().ai.command.timedOut(killSignal)}` : `${output}${code ? `\n${t().ai.command.exitCode(code)}` : ""}` }),
      );
    });
}

/** Nama variabel yang nilainya dianggap rahasia. */
const SECRET_NAME = /(KEY|SECRET|TOKEN|PASSWORD|PASSWD|PASS|PRIVATE|CREDENTIAL|AUTH|COOKIE|SALT|DSN|DATABASE_URL|CONNECTION_STRING)/i;

/** Nilai rahasia dari environment proses dan file .env proyek (dibaca di sini saja, tidak dikirim ke AI). */
export function secretValues(root: string, env: NodeJS.ProcessEnv = process.env): string[] {
  const values = new Set<string>();
  for (const [name, value] of Object.entries(env)) {
    if (value && value.length >= 6 && SECRET_NAME.test(name)) values.add(value);
  }
  let files: string[] = [];
  try {
    files = fs.readdirSync(root).filter((f) => /^\.env(\..+)?$/.test(f) && f !== ".env.example");
  } catch {
    files = [];
  }
  for (const file of files) {
    let text = "";
    try {
      text = fs.readFileSync(path.join(root, file), "utf8");
    } catch {
      continue;
    }
    for (const line of text.split(/\r?\n/)) {
      const m = /^\s*(?:export\s+)?([\w.-]+)\s*=\s*(.*)$/.exec(line);
      if (!m || !SECRET_NAME.test(m[1]!)) continue;
      const value = m[2]!.trim().replace(/^(['"])(.*)\1$/, "$2");
      if (value.length >= 6) values.add(value);
    }
  }
  return [...values].sort((a, b) => b.length - a.length);
}

/** Ganti nilai rahasia di output perintah sebelum dikirim ke provider AI. */
export function redactSecrets(text: string, secrets: string[]): string {
  let out = text;
  for (const s of secrets) out = out.split(s).join("[disembunyikan]");
  return out;
}
