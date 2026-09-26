import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { t } from "../i18n/index.js";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findLocalCli, platformCommand } from "../process.js";
import type { ApprovalPolicy, PendingAction, Risk } from "./approval.js";
import type { Journal } from "./journal.js";
import { layoutWarning } from "./layout.js";
import type { ToolSpec } from "./types.js";
import { unifiedDiff } from "./diff.js";
import { classifyCommand, CommandRejected, parseCommand, redactSecrets, secretValues } from "./command.js";
import { parseViewport, viewPage, ViewUnreachableError, type PageViewer, type ViewExpect, type ViewSummary } from "../dev/view.js";
import { DEV_ONLY_ENV } from "../core/devpage/info.js";

/** Hasil tool ditambah catatan bila route yang ditulis membuat layout HTML/CSS sendiri. */
function withLayoutWarning(result: string, root: string, rel: string, content: string): string {
  const note = layoutWarning(root, rel, content);
  return note ? `${result}\n${note}` : result;
}

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
  /** Tab browser yang memuat widget chat (lewat devtools). Tanpa ini `view_page` memakai versi teks. */
  viewer?: PageViewer;
  /** Hasil setiap `view_page` (diisi tool, dibaca agen untuk pemeriksaan wajib dan journal tugas). */
  views?: ViewRecord[];
}

/** Satu kali `view_page`. `unreachable` = server aplikasi tidak bisa dihubungi (tidak ada yang dilihat). */
export type ViewRecord = (ViewSummary & { unreachable?: false }) | { path: string; viewport: "desktop" | "mobile"; unreachable: true };

export type DbAction = "generate" | "migrate" | "seed";

export interface CommandResult {
  ok: boolean;
  output: string;
  /** Hasil per langkah (mis. typecheck, test), bila ada. */
  steps?: { name: string; ok: boolean }[];
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
      // Proses baru (`zentara routes --json`): route & schema yang baru diubah AI ikut terbaca, bukan
      // versi lama dari cache modul proses ini.
      const result = await runZentaraCli(ctx.root, ["routes", "--json"], 60_000);
      let rows: { pattern: string; methods: string[]; file: string }[];
      try {
        if (!result.ok) throw new Error(result.output);
        rows = JSON.parse(result.output.slice(result.output.indexOf("["))) as typeof rows;
      } catch (err) {
        throw new ToolError(t().ai.tools.routesFailed(((err as Error).message || result.output).split("\n").slice(0, 8).join("\n")));
      }
      return rows.map((r) => `${r.methods.join("|")} ${r.pattern} -> ${toPosix(r.file)}`).join("\n") || t().ai.tools.noRoutes;
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
      return withLayoutWarning(t().ai.tools.written(exists, rel), ctx.root, rel, content);
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
      return withLayoutWarning(t().ai.tools.edited(rel), ctx.root, rel, updated);
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
      name: "zentara",
      description:
        "Run a Zentara CLI command in the project, using the project's own zentara install: routes (list routes), jobs (list background jobs, schedules, and queue), jobs:run <name> [--data <json>] (run one job now), make:route <path> [--methods GET,POST], make:middleware <name>, make:job <name> [--schedule \"<cron>\"], build. Use the database tool for db:*; the dev server is controlled by the developer.",
      inputSchema: {
        type: "object",
        properties: {
          command: { type: "string", enum: ["routes", "jobs", "jobs:run", "make:route", "make:middleware", "make:job", "build"] },
          args: { type: "array", items: { type: "string" }, description: "Extra arguments, e.g. [\"reports/daily\", \"--schedule\", \"0 7 * * *\"]" },
        },
        required: ["command"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const command = str(input, "command")!;
      const risks: Record<string, Risk> = { routes: "read", jobs: "read", "jobs:run": "critical", "make:route": "write", "make:middleware": "write", "make:job": "write", build: "write" };
      const risk = risks[command];
      if (!risk) throw new ToolError(t().ai.tools.zentaraArgInvalid(command));
      const args = Array.isArray(input.args) ? input.args.map(String) : [];
      for (const arg of args) {
        // Argumen diteruskan apa adanya (tanpa shell); tolak karakter kontrol, file rahasia, dan path di luar proyek.
        if (/[\u0000-\u001f]/.test(arg) || /(^|[\\/])\.env/.test(arg) || /^(\/|~|[A-Za-z]:[\\/])/.test(arg) || arg.split(/[\\/]/).includes("..")) {
          throw new ToolError(t().ai.tools.zentaraArgInvalid(arg));
        }
      }
      const line = [command, ...args].join(" ");
      if (risk !== "read") {
        await gate(ctx, { tool: "zentara", risk, reason: command === "jobs:run" ? t().ai.tools.jobRunReason : undefined, summary: t().ai.tools.zentaraSummary(line) });
        if (ctx.dryRun) return t().ai.tools.dryRunNotRun(`zentara ${line}`);
      }
      // make:* membuat file di src/: foto dulu isinya agar `zentara undo` bisa mengembalikannya.
      const src = path.join(ctx.root, "src");
      const snapshot = new Map<string, string>();
      if (command.startsWith("make:")) for (const f of listFiles(ctx.root, src, 5_000, true)) snapshot.set(f, fs.readFileSync(path.join(ctx.root, f), "utf8"));
      const result = await runZentaraCli(ctx.root, [command, ...args]);
      if (command.startsWith("make:")) {
        for (const f of listFiles(ctx.root, src, 5_000, true)) {
          const before = snapshot.get(f);
          if (before === undefined) ctx.journal.recordExternal(f, null);
          else if (before !== fs.readFileSync(path.join(ctx.root, f), "utf8")) ctx.journal.recordExternal(f, before);
        }
      }
      return `${result.ok ? t().ai.tools.ok : t().ai.tools.failed}: zentara ${line}\n${truncate(redactSecrets(result.output, secretValues(ctx.root)), 3000)}`;
    },
  },
  {
    spec: {
      name: "view_page",
      description:
        "Look at a page of the running app the way the developer sees it, and run layout checks. When a browser tab with the Zentara AI chat widget is open, the page is loaded there (logged in) and you get the visible elements with their position and size, console errors, failed requests, and layout findings: elements past the screen edge or causing sideways scrolling, overlapping elements, cut-off text, broken images, low text contrast, and custom CSS or HTML outside the UI kit. Otherwise you get a text version from the dev server (no JavaScript, not logged in) with the checks that can be read from HTML. Use viewport \"mobile\" (390px) to check the phone layout. Read-only, local app only.",
      inputSchema: {
        type: "object",
        properties: {
          url: { type: "string", description: 'Page path, e.g. "/notes" or "/notes/3?tab=edit" (a full http://localhost URL is also accepted)' },
          viewport: { type: "string", enum: ["desktop", "mobile"], description: 'Screen size: "desktop" (default, 1280px) or "mobile" (390px)' },
          expect: {
            type: "object",
            description: "Optional checks, reported as PASS/FAIL",
            properties: {
              text: { type: "array", items: { type: "string" }, description: "Texts that must appear on the page" },
              selector: { type: "array", items: { type: "string" }, description: 'CSS selectors that must match at least one element, e.g. "table" (browser view only)' },
              noConsoleErrors: { type: "boolean", description: "true = no console errors, failed requests, or HTTP error status" },
              noLayoutIssues: { type: "boolean", description: "true = no layout check findings" },
            },
            additionalProperties: false,
          },
        },
        required: ["url"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      // `path` dan `noErrors` adalah nama lama (0.12.5 awal); tetap diterima.
      const target = str(input, "url", true) ?? str(input, "path", true);
      if (!target) throw new ToolError(t().ai.tools.urlRequired);
      const viewport = parseViewport(input.viewport);
      const raw = (input.expect && typeof input.expect === "object" ? input.expect : {}) as Record<string, unknown>;
      const strings = (v: unknown) =>
        typeof v === "string" ? [v] : Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 20) : undefined;
      const expect: ViewExpect = {
        text: strings(raw.text),
        selector: strings(raw.selector),
        noConsoleErrors: raw.noConsoleErrors === true || raw.noErrors === true,
        noLayoutIssues: raw.noLayoutIssues === true,
      };
      try {
        const result = await viewPage({ path: target, viewport, expect }, ctx.viewer, {
          fallbackBase: `http://localhost:${process.env.PORT ?? 3000}`,
          signal: ctx.signal,
          changedAt: latestChange(ctx.root),
        });
        ctx.views?.push(result.summary);
        // Awal hasil (status, error, temuan tampilan) paling penting: potong bagian akhirnya.
        return result.text.length > 12_000 ? `${result.text.slice(0, 12_000)}\n...(truncated)` : result.text;
      } catch (err) {
        if (err instanceof ViewUnreachableError) ctx.views?.push({ path: target, viewport, unreachable: true });
        throw new ToolError((err as Error).message);
      }
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

/**
 * Env untuk skrip proyek (typecheck, test). PORT dan variabel server pengembangan tidak diteruskan: proses
 * CLI memuat .env (PORT=3000), dan PORT mengalahkan `port: 0` di test, sehingga test bentrok dengan server
 * dev yang sedang berjalan (EADDRINUSE) dan verifikasi AI selalu gagal selama server dev hidup.
 */
function scriptEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: "0" };
  for (const key of ["PORT", ...DEV_ONLY_ENV]) delete env[key];
  return env;
}

/** Waktu perubahan terakhir file di src/ (ms epoch), untuk menunggu server dev dimulai ulang sebelum melihat halaman. */
function latestChange(root: string): number {
  let latest = 0;
  for (const rel of listFiles(root, path.join(root, "src"), 5_000, true)) {
    try {
      latest = Math.max(latest, fs.statSync(path.join(root, rel)).mtimeMs);
    } catch {
      // File terhapus di tengah jalan.
    }
  }
  return latest;
}

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
      const child = spawn(cmd.command, cmd.args, { cwd: root, env: scriptEnv(), timeout: timeoutMs, shell: cmd.shell, signal });
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

/**
 * Jalankan CLI zentara (`zentara <args>`) di proses terpisah untuk proyek `root`. Memakai CLI milik
 * proyek bila ada (dependency proyek seperti drizzle-orm tersedia), dan proses baru berarti kode
 * proyek selalu dimuat ulang (tanpa cache modul lama dari proses yang sudah lama berjalan).
 */
export function runZentaraCli(root: string, args: string[], timeoutMs = 5 * 60 * 1000): Promise<CommandResult> {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const own = [path.join(here, "..", "cli.js"), path.join(here, "..", "cli.ts")].find((f) => fs.existsSync(f));
  const cli = findLocalCli(root, own) ?? own;
  if (!cli) return Promise.resolve({ ok: false, output: t().ai.tools.cliMissing });
  // CLI proyek adalah JavaScript hasil build: loader (tsx) milik proses ini hanya dibutuhkan untuk cli.ts.
  const dev = cli.endsWith(".ts");
  const execArgv = dev ? absoluteLoaders(process.execArgv) : [];
  const env: NodeJS.ProcessEnv = { ...process.env, FORCE_COLOR: "0", NODE_NO_WARNINGS: "1" };
  // Loader juga bisa datang lewat NODE_OPTIONS (mis. test runner Node 24): ubah juga ke path absolut.
  if (dev && env.NODE_OPTIONS) env.NODE_OPTIONS = absoluteLoaders(env.NODE_OPTIONS.split(/\s+/).filter(Boolean)).join(" ");
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [...execArgv, cli, ...args], {
      cwd: root,
      env,
      timeout: timeoutMs,
    });
    let output = "";
    child.stdout.on("data", (c: Buffer) => (output += c.toString()));
    child.stderr.on("data", (c: Buffer) => (output += c.toString()));
    child.on("error", (err) => resolve({ ok: false, output: `${output}\n${err.message}` }));
    child.on("close", (code) => resolve({ ok: code === 0, output: output.trim() }));
  });
}

const LOADER_FLAGS = ["--import", "--loader", "--experimental-loader"];

/**
 * `--import tsx` / `--import=./x.mjs` diubah ke URL absolut agar tetap ditemukan dari cwd proyek lain.
 * Hanya dipakai saat CLI berupa cli.ts (pengembangan & test); CLI rilis (cli.js) tidak butuh loader.
 */
function absoluteLoaders(args: readonly string[]): string[] {
  return args.map((arg, i) => {
    const eq = arg.indexOf("=");
    if (eq > 0 && LOADER_FLAGS.includes(arg.slice(0, eq))) return `${arg.slice(0, eq)}=${absoluteSpecifier(arg.slice(eq + 1))}`;
    return LOADER_FLAGS.includes(args[i - 1] ?? "") ? absoluteSpecifier(arg) : arg;
  });
}

function absoluteSpecifier(spec: string): string {
  if (/^[a-z]+:/i.test(spec)) return spec;
  if (spec.startsWith(".") || path.isAbsolute(spec)) return pathToFileURL(path.resolve(spec)).href;
  try {
    // Dicari dari cwd proses ini (tempat loader terpasang), bukan dari folder proyek tujuan.
    return pathToFileURL(createRequire(path.join(process.cwd(), "noop.js")).resolve(spec)).href;
  } catch {
    return spec;
  }
}

export function createDbRunner(root: string, timeoutMs = 5 * 60 * 1000) {
  return (action: DbAction): Promise<CommandResult> => runZentaraCli(root, [`db:${action}`], timeoutMs);
}
