import { spawn } from "node:child_process";
import { t } from "../i18n/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfigFile, resolveConfig } from "../core/config.js";
import { ZenLogger } from "../core/logger.js";
import { allowedMethods, ZenRouter } from "../core/router.js";
import { platformCommand } from "../process.js";
import type { ApprovalPolicy, PendingAction, Risk } from "./approval.js";
import type { Journal } from "./journal.js";
import type { ToolSpec } from "./types.js";
import { unifiedDiff } from "./diff.js";
import { classifyCommand, CommandRejected, parseCommand, redactSecrets, secretValues } from "./command.js";

export interface ToolContext {
  root: string;
  approval: ApprovalPolicy;
  journal: Journal;
  /** Bila true, aksi yang mengubah sesuatu tidak dieksekusi (hanya dilaporkan). */
  dryRun: boolean;
  runScript: (script: string, args?: string[], signal?: AbortSignal) => Promise<CommandResult>;
  /** Jalankan perintah database Zentara (db:generate/db:migrate/db:seed) di proses terpisah. */
  runDb: (action: DbAction) => Promise<CommandResult>;
  /** Sinyal berhenti untuk tugas yang sedang berjalan (diisi oleh agen). */
  signal?: AbortSignal;
  /** Jalankan perintah terminal (argv, tanpa shell). Tanpa ini tool run_command tidak tersedia. */
  runCommand?: (argv: string[], options?: { timeoutMs?: number; signal?: AbortSignal }) => Promise<CommandResult>;
  /** Awalan perintah yang diizinkan pengguna (ai.allowedCommands). */
  allowedCommands?: string[];
}

export type DbAction = "generate" | "migrate" | "seed";

export interface CommandResult {
  ok: boolean;
  output: string;
}

export interface AgentTool {
  spec: ToolSpec;
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
  /** true bila pemanggilan ini bisa mengubah proyek (memicu verifikasi typecheck & test di akhir). */
  mutates?: (input: Record<string, unknown>, ctx: ToolContext) => boolean;
}

/** Error yang pesannya aman dan berguna untuk dikembalikan ke model sebagai tool_result. */
export class ToolError extends Error {}

const MAX_READ_BYTES = 200_000;
const MAX_OUTPUT_CHARS = 6000;
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", ".zentara", "coverage"]);
/** Tidak boleh ditulis sama sekali oleh AI. */
const WRITE_DENIED = [/^\.git(\/|$)/, /^node_modules(\/|$)/, /^\.zentara(\/|$)/, /^dist(\/|$)/, /\.(db|sqlite3?)(-wal|-shm|-journal)?$/];
/** Bisa diubah, tapi selalu minta persetujuan (juga di mode otomatis). */
const CRITICAL_PATHS: { pattern: RegExp; reason: keyof ReturnType<typeof t>["ai"]["tools"]["critical"] }[] = [
  { pattern: /^package(-lock)?\.json$/, reason: "package" },
  { pattern: /^zentara\.config\.[cm]?[jt]s$/, reason: "config" },
  { pattern: /^tsconfig[^/]*\.json$/, reason: "tsconfig" },
  { pattern: /^\.github\//, reason: "github" },
  { pattern: /^\.gitignore$/, reason: "gitignore" },
  { pattern: /^\.env/, reason: "env" },
  { pattern: /^drizzle\//, reason: "migration" },
];

/** File rahasia/data yang isinya tidak boleh dikirim ke provider AI (.env, file database). */
export function isSecretFile(rel: string): boolean {
  const base = rel.split("/").pop() ?? "";
  if (/\.(db|sqlite3?)(-wal|-shm|-journal)?$/.test(base)) return true;
  return /^\.env(\..+)?$/.test(base) && base !== ".env.example";
}

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

/** Ubah path dari model menjadi path relatif yang dijamin berada di dalam proyek. */
export function resolveProjectPath(root: string, input: unknown): { abs: string; rel: string } {
  if (typeof input !== "string" || input.trim() === "") throw new ToolError(t().ai.tools.pathRequired);
  if (input.includes("\0")) throw new ToolError(t().ai.tools.pathInvalid);
  const rootAbs = fs.realpathSync(root);
  const abs = path.resolve(rootAbs, input);
  const rel = path.relative(rootAbs, abs);
  if (rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)) {
    throw new ToolError(t().ai.tools.pathOutside(input));
  }
  // Cegah lolos lewat symlink: periksa leluhur terdekat yang sudah ada.
  let probe = abs;
  while (!fs.existsSync(probe)) probe = path.dirname(probe);
  const real = fs.realpathSync(probe);
  if (real !== rootAbs && !real.startsWith(rootAbs + path.sep)) {
    throw new ToolError(t().ai.tools.pathSymlink(input));
  }
  return { abs, rel: toPosix(rel) || "." };
}

function writeRisk(rel: string): { risk: Risk; reason?: string } {
  if (WRITE_DENIED.some((p) => p.test(rel))) throw new ToolError(t().ai.tools.writeDenied(rel));
  const critical = CRITICAL_PATHS.find((c) => c.pattern.test(rel));
  return critical ? { risk: "critical", reason: t().ai.tools.critical[critical.reason] } : { risk: "write" };
}

function str(input: Record<string, unknown>, key: string, optional = false): string | undefined {
  const value = input[key];
  if (value === undefined && optional) return undefined;
  if (typeof value !== "string") throw new ToolError(t().ai.tools.fieldString(key));
  return value;
}

function truncate(text: string, max = MAX_OUTPUT_CHARS): string {
  return text.length <= max ? text : t().ai.tools.truncated(text.length - max) + text.slice(-max);
}

function preview(content: string, lines = 40): string {
  const all = content.split("\n");
  return all.slice(0, lines).join("\n") + (all.length > lines ? `\n${t().ai.summary.moreLines(all.length - lines)}` : "");
}

async function gate(ctx: ToolContext, action: PendingAction): Promise<void> {
  const approved = await ctx.approval.approve(action, ctx.signal);
  if (ctx.signal?.aborted) throw new ToolError(t().ai.tools.aborted);
  if (!approved) {
    throw new ToolError(t().ai.tools.declined);
  }
}

function listFiles(root: string, start: string, limit: number, allowMissing = false): string[] {
  const out: string[] = [];
  if (allowMissing && !fs.existsSync(start)) return out;
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (out.length >= limit) return;
      if (entry.isDirectory() && IGNORED_DIRS.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      const rel = toPosix(path.relative(root, full));
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) out.push(rel);
    }
  };
  walk(start);
  return out;
}

export const agentTools: AgentTool[] = [
  {
    spec: {
      name: "list_files",
      description: "List files in the project (recursive, without node_modules/.git/dist). Use it to understand the project structure.",
      inputSchema: { type: "object", properties: { path: { type: "string", description: "Starting folder, defaults to the project root" } }, additionalProperties: false },
    },
    async run(input, ctx) {
      const { abs } = resolveProjectPath(ctx.root, str(input, "path", true) ?? ".");
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new ToolError(t().ai.tools.folderNotFound);
      const files = listFiles(fs.realpathSync(ctx.root), abs, 400);
      return files.length ? files.join("\n") + (files.length >= 400 ? t().ai.tools.limitedFiles : "") : t().ai.tools.empty;
    },
  },
  {
    spec: {
      name: "read_file",
      description: "Read a text file in the project. .env files cannot be read for security reasons.",
      inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
    },
    async run(input, ctx) {
      const { abs, rel } = resolveProjectPath(ctx.root, str(input, "path"));
      if (isSecretFile(rel)) throw new ToolError(t().ai.tools.secretRead(rel));
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new ToolError(t().ai.tools.fileNotFound(rel));
      const size = fs.statSync(abs).size;
      if (size > MAX_READ_BYTES) throw new ToolError(t().ai.tools.fileTooBig(size));
      return fs.readFileSync(abs, "utf8");
    },
  },
  {
    spec: {
      name: "search",
      description: "Search for text (case-insensitive) in project files. Returns the matching lines with their location.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" }, path: { type: "string", description: "Folder, defaults to the root" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const query = str(input, "query")!.toLowerCase();
      if (!query) throw new ToolError(t().ai.tools.emptyQuery);
      const root = fs.realpathSync(ctx.root);
      const { abs } = resolveProjectPath(ctx.root, str(input, "path", true) ?? ".");
      const hits: string[] = [];
      for (const rel of listFiles(root, abs, 2000)) {
        if (isSecretFile(rel) || hits.length >= 100) continue;
        const full = path.join(root, rel);
        if (fs.statSync(full).size > MAX_READ_BYTES) continue;
        const lines = fs.readFileSync(full, "utf8").split("\n");
        lines.forEach((line, i) => {
          if (hits.length < 100 && line.toLowerCase().includes(query)) hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 200)}`);
        });
      }
      return hits.length ? hits.join("\n") : t().ai.tools.noResults;
    },
  },
  {
    spec: {
      name: "list_routes",
      description: "List the Zentara app routes with their HTTP methods and files.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    async run(_input, ctx) {
      const config = resolveConfig(await loadConfigFile(ctx.root), process.env, ctx.root);
      const router = new ZenRouter(new ZenLogger("silent"));
      try {
        await router.loadRoutes(config.routesDir);
      } catch (err) {
        throw new ToolError(t().ai.tools.routesFailed((err as Error).message));
      }
      const rows = router.list.map((r) => `${allowedMethods(r.module).join("|")} ${r.pattern} -> ${toPosix(path.relative(ctx.root, r.file))}`);
      return rows.join("\n") || t().ai.tools.noRoutes;
    },
  },
  {
    spec: {
      name: "write_file",
      description: "Create a new file or overwrite a whole file. For small changes to an existing file, use edit_file.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" }, content: { type: "string" } },
        required: ["path", "content"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const { abs, rel } = resolveProjectPath(ctx.root, str(input, "path"));
      const content = str(input, "content")!;
      const exists = fs.existsSync(abs);
      if (exists && !fs.statSync(abs).isFile()) throw new ToolError(t().ai.tools.isFolder(rel));
      const { risk, reason } = writeRisk(rel);
      const lines = content.split("\n").length;
      if (exists && isSecretFile(rel)) throw new ToolError(t().ai.tools.secretOverwrite(rel));
      const old = exists ? fs.readFileSync(abs, "utf8") : undefined;
      if (old === content) return t().ai.tools.unchanged(rel);
      await gate(ctx, {
        tool: "write_file",
        risk,
        reason,
        summary: t().ai.tools.writeSummary(exists, rel, lines),
        ...(old === undefined ? { preview: preview(content), previewKind: "file" as const } : { preview: preview(unifiedDiff(old, content), 80), previewKind: "diff" as const }),
      });
      if (ctx.dryRun) return t().ai.tools.dryRunNotWritten(rel);
      ctx.journal.record(rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
      return t().ai.tools.written(exists, rel);
    },
  },
  {
    spec: {
      name: "edit_file",
      description: "Replace one exact, unique piece of text in a file. old_text must appear exactly once.",
      inputSchema: {
        type: "object",
        properties: { path: { type: "string" }, old_text: { type: "string" }, new_text: { type: "string" } },
        required: ["path", "old_text", "new_text"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const { abs, rel } = resolveProjectPath(ctx.root, str(input, "path"));
      const oldText = str(input, "old_text")!;
      const newText = str(input, "new_text")!;
      if (!fs.existsSync(abs)) throw new ToolError(t().ai.tools.fileNotFound(rel));
      if (isSecretFile(rel)) throw new ToolError(t().ai.tools.secretEdit(rel));
      if (!oldText) throw new ToolError(t().ai.tools.oldTextEmpty);
      const current = fs.readFileSync(abs, "utf8");
      const count = current.split(oldText).length - 1;
      if (count === 0) throw new ToolError(t().ai.tools.oldTextMissing);
      if (count > 1) throw new ToolError(t().ai.tools.oldTextMany(count));
      const { risk, reason } = writeRisk(rel);
      const updated = current.replace(oldText, () => newText);
      await gate(ctx, { tool: "edit_file", risk, reason, summary: t().ai.tools.editSummary(rel), preview: preview(unifiedDiff(current, updated), 80), previewKind: "diff" });
      if (ctx.dryRun) return t().ai.tools.dryRunNotEdited(rel);
      ctx.journal.record(rel);
      fs.writeFileSync(abs, updated);
      return t().ai.tools.edited(rel);
    },
  },
  {
    spec: {
      name: "delete_file",
      description: "Delete a file. Always asks the developer for approval.",
      inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
    },
    async run(input, ctx) {
      const { abs, rel } = resolveProjectPath(ctx.root, str(input, "path"));
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new ToolError(t().ai.tools.fileNotFound(rel));
      writeRisk(rel); // tolak path terlarang
      await gate(ctx, { tool: "delete_file", risk: "critical", reason: t().ai.tools.deleteReason, summary: t().ai.tools.deleteSummary(rel) });
      if (ctx.dryRun) return t().ai.tools.dryRunNotDeleted(rel);
      ctx.journal.record(rel);
      fs.rmSync(abs);
      return t().ai.tools.deleted(rel);
    },
  },
  {
    spec: {
      name: "run_check",
      description: "Run a project check: typecheck, test, or build. Use it after changing code.",
      inputSchema: {
        type: "object",
        properties: { check: { type: "string", enum: ["typecheck", "test", "build"] } },
        required: ["check"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const check = str(input, "check")!;
      if (!["typecheck", "test", "build"].includes(check)) throw new ToolError(t().ai.tools.checkInvalid);
      const result = await ctx.runScript(check, [], ctx.signal);
      return `${result.ok ? t().ai.tools.ok : t().ai.tools.failed}: npm run ${check}\n${truncate(redactSecrets(result.output, secretValues(ctx.root)))}`;
    },
  },
  {
    spec: {
      name: "run_command",
      description:
        "Run ONE terminal command in the project folder, without shell operators (|, &&, ;, >, <, $, %). Read-only commands (git status/diff/log/show, ls, npm ls/outdated/view, npx tsc --noEmit) run immediately; other commands ask the developer for approval. For typecheck/test/build use run_check, to install packages use install_package, for the database use database, for the dev server use dev_server. Long-running commands (servers, --watch) are not supported.",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string", description: 'E.g. "git diff --stat" or "npx eslint src"' },
          timeout_seconds: { type: "number", description: "Time limit, default 120, maximum 600" },
        },
        required: ["command"],
        additionalProperties: false,
      },
    },
    mutates(input, ctx) {
      try {
        return classifyCommand(parseCommand(String(input.command ?? "")), ctx.allowedCommands).risk !== "read";
      } catch {
        return false;
      }
    },
    async run(input, ctx) {
      if (!ctx.runCommand) throw new ToolError(t().ai.tools.commandUnavailable);
      const line = str(input, "command")!;
      const seconds = typeof input.timeout_seconds === "number" && input.timeout_seconds > 0 ? Math.min(600, input.timeout_seconds) : 120;
      let argv: string[];
      let check;
      try {
        argv = parseCommand(line);
        check = classifyCommand(argv, ctx.allowedCommands);
      } catch (err) {
        if (err instanceof CommandRejected) throw new ToolError(t().ai.tools.commandRejected(err.message));
        throw err;
      }
      await gate(ctx, {
        tool: "run_command",
        risk: check.risk,
        reason: check.reason,
        summary: t().ai.tools.commandSummary(line.trim()),
        preview: `$ ${line.trim()}`,
        previewKind: "command",
      });
      if (ctx.dryRun && check.risk !== "read") return t().ai.tools.dryRunNotRun(line.trim());
      const result = await ctx.runCommand(argv, { timeoutMs: seconds * 1000, signal: ctx.signal });
      const output = redactSecrets(result.output.trim(), secretValues(ctx.root));
      return `${result.ok ? t().ai.tools.ok : t().ai.tools.failed}: ${line.trim()}\n${truncate(output) || t().ai.tools.noOutput}`;
    },
  },
  {
    spec: {
      name: "database",
      description:
        "Manage the database: generate = create a migration from changes in src/app/db/schema.ts; migrate = apply migrations to the database; seed = insert initial data. Never write migration SQL by hand.",
      inputSchema: {
        type: "object",
        properties: { action: { type: "string", enum: ["generate", "migrate", "seed"] } },
        required: ["action"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const action = str(input, "action") as DbAction;
      if (!["generate", "migrate", "seed"].includes(action)) throw new ToolError(t().ai.tools.dbActionInvalid);
      const critical = action !== "generate";
      await gate(ctx, {
        tool: "database",
        risk: critical ? "critical" : "write",
        reason: critical ? t().ai.tools.dbReason(action === "migrate") : undefined,
        summary: t().ai.tools.dbSummary[action] ?? action,
      });
      if (ctx.dryRun) return t().ai.tools.dryRunNotRun(`database ${action}`);

      // generate menulis/mengubah file di drizzle/ (termasuk meta/_journal.json): foto dulu isinya agar undo tuntas.
      const migrations = path.join(ctx.root, "drizzle");
      const snapshot = new Map<string, string>();
      if (action === "generate") {
        for (const f of listFiles(ctx.root, migrations, 10_000, true)) snapshot.set(f, fs.readFileSync(path.join(ctx.root, f), "utf8"));
      }
      const result = await ctx.runDb(action);
      if (action === "generate") {
        for (const f of listFiles(ctx.root, migrations, 10_000, true)) {
          const before = snapshot.get(f);
          if (before === undefined) ctx.journal.recordExternal(f, null);
          else if (before !== fs.readFileSync(path.join(ctx.root, f), "utf8")) ctx.journal.recordExternal(f, before);
        }
      }
      return `${result.ok ? t().ai.tools.ok : t().ai.tools.failed}: db:${action}\n${truncate(redactSecrets(result.output, secretValues(ctx.root)), 3000)}`;
    },
  },
  {
    spec: {
      name: "install_package",
      description: "Install an npm package. Always asks the developer for approval.",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string" }, dev: { type: "boolean", description: "true for a devDependency" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const name = str(input, "name")!;
      if (!/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(@[\w.^~<>=*-]+)?$/i.test(name)) throw new ToolError(t().ai.tools.packageInvalid(name));
      const dev = input.dev === true;
      await gate(ctx, {
        tool: "install_package",
        risk: "critical",
        reason: t().ai.tools.packageReason,
        summary: `npm install ${dev ? "-D " : ""}${name}`,
      });
      if (ctx.dryRun) return t().ai.tools.dryRunNotInstalled(name);
      ctx.journal.record("package.json");
      ctx.journal.record("package-lock.json");
      const result = await ctx.runScript("__install__", [...(dev ? ["-D"] : []), name]);
      return `${result.ok ? t().ai.tools.ok : t().ai.tools.failed}: npm install ${name}\n${truncate(result.output, 2000)}`;
    },
  },
];

/** Jalankan skrip npm di proyek (tanpa shell), dengan batas waktu. */
export function createScriptRunner(root: string, timeoutMs = 5 * 60 * 1000) {
  return (script: string, args: string[] = [], signal?: AbortSignal): Promise<CommandResult> => {
    const argv = script === "__install__" ? ["install", ...args] : ["run", script, "--silent"];
    if (script !== "__install__") {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };
      if (!pkg.scripts?.[script]) return Promise.resolve({ ok: true, output: t().ai.tools.scriptMissing(script) });
    }
    return new Promise((resolve) => {
      const cmd = platformCommand("npm", argv);
      const child = spawn(cmd.command, cmd.args, { cwd: root, env: { ...process.env, FORCE_COLOR: "0" }, timeout: timeoutMs, shell: cmd.shell, signal });
      let output = "";
      child.stdout.on("data", (c: Buffer) => (output += c.toString()));
      child.stderr.on("data", (c: Buffer) => (output += c.toString()));
      child.on("error", (err) => resolve({ ok: false, output: `${output}\n${err.name === "AbortError" ? t().ai.tools.stoppedByUser : err.message}` }));
      child.on("close", (code, killSignal) =>
        resolve({ ok: code === 0, output: killSignal ? `${output}\n${t().ai.tools.stoppedSignal(killSignal)}` : output }),
      );
    });
  };
}

/** Jalankan `zentara db:<action>` di proses Node terpisah (modul database aplikasi dimuat segar setiap kali). */
export function createDbRunner(root: string, timeoutMs = 5 * 60 * 1000) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cli = [path.join(here, "..", "cli.js"), path.join(here, "..", "cli.ts")].find((f) => fs.existsSync(f));
  return (action: DbAction): Promise<CommandResult> => {
    if (!cli) return Promise.resolve({ ok: false, output: t().ai.tools.cliMissing });
    return new Promise((resolve) => {
      const child = spawn(process.execPath, [...process.execArgv, cli, `db:${action}`], {
        cwd: root,
        env: { ...process.env, FORCE_COLOR: "0", NODE_NO_WARNINGS: "1" },
        timeout: timeoutMs,
      });
      let output = "";
      child.stdout.on("data", (c: Buffer) => (output += c.toString()));
      child.stderr.on("data", (c: Buffer) => (output += c.toString()));
      child.on("error", (err) => resolve({ ok: false, output: `${output}\n${err.message}` }));
      child.on("close", (code) => resolve({ ok: code === 0, output: output.trim() }));
    });
  };
}
