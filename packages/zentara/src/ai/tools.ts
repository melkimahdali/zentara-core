import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadConfigFile, resolveConfig } from "../core/config.js";
import { ZenLogger } from "../core/logger.js";
import { allowedMethods, ZenRouter } from "../core/router.js";
import type { ApprovalPolicy, PendingAction, Risk } from "./approval.js";
import type { Journal } from "./journal.js";
import type { ToolSpec } from "./types.js";

export interface ToolContext {
  root: string;
  approval: ApprovalPolicy;
  journal: Journal;
  /** Bila true, aksi yang mengubah sesuatu tidak dieksekusi (hanya dilaporkan). */
  dryRun: boolean;
  runScript: (script: string, args?: string[]) => Promise<CommandResult>;
  /** Jalankan perintah database Zentara (db:generate/db:migrate/db:seed) di proses terpisah. */
  runDb: (action: DbAction) => Promise<CommandResult>;
}

export type DbAction = "generate" | "migrate" | "seed";

export interface CommandResult {
  ok: boolean;
  output: string;
}

export interface AgentTool {
  spec: ToolSpec;
  run(input: Record<string, unknown>, ctx: ToolContext): Promise<string>;
}

/** Error yang pesannya aman dan berguna untuk dikembalikan ke model sebagai tool_result. */
export class ToolError extends Error {}

const MAX_READ_BYTES = 200_000;
const MAX_OUTPUT_CHARS = 6000;
const IGNORED_DIRS = new Set(["node_modules", ".git", "dist", ".zentara", "coverage"]);
/** Tidak boleh ditulis sama sekali oleh AI. */
const WRITE_DENIED = [/^\.git(\/|$)/, /^node_modules(\/|$)/, /^\.zentara(\/|$)/, /^dist(\/|$)/, /\.(db|sqlite3?)(-wal|-shm|-journal)?$/];
/** Bisa diubah, tapi selalu minta persetujuan (juga di mode otomatis). */
const CRITICAL_PATHS: { pattern: RegExp; reason: string }[] = [
  { pattern: /^package(-lock)?\.json$/, reason: "mengubah dependency/skrip proyek" },
  { pattern: /^zentara\.config\.[cm]?[jt]s$/, reason: "mengubah konfigurasi Zentara" },
  { pattern: /^tsconfig[^/]*\.json$/, reason: "mengubah konfigurasi TypeScript" },
  { pattern: /^\.github\//, reason: "mengubah CI/workflow GitHub" },
  { pattern: /^\.gitignore$/, reason: "mengubah daftar file yang diabaikan git" },
  { pattern: /^\.env/, reason: "mengubah file environment" },
  { pattern: /^drizzle\//, reason: "mengubah file migrasi database secara manual" },
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
  if (typeof input !== "string" || input.trim() === "") throw new ToolError("path wajib berupa string");
  if (input.includes("\0")) throw new ToolError("path tidak valid");
  const rootAbs = fs.realpathSync(root);
  const abs = path.resolve(rootAbs, input);
  const rel = path.relative(rootAbs, abs);
  if (rel === ".." || rel.startsWith(".." + path.sep) || path.isAbsolute(rel)) {
    throw new ToolError(`path di luar folder proyek ditolak: ${input}`);
  }
  // Cegah lolos lewat symlink: periksa leluhur terdekat yang sudah ada.
  let probe = abs;
  while (!fs.existsSync(probe)) probe = path.dirname(probe);
  const real = fs.realpathSync(probe);
  if (real !== rootAbs && !real.startsWith(rootAbs + path.sep)) {
    throw new ToolError(`path mengarah ke luar proyek lewat symlink: ${input}`);
  }
  return { abs, rel: toPosix(rel) || "." };
}

function writeRisk(rel: string): { risk: Risk; reason?: string } {
  if (WRITE_DENIED.some((p) => p.test(rel))) throw new ToolError(`AI tidak diizinkan menulis ke ${rel}`);
  const critical = CRITICAL_PATHS.find((c) => c.pattern.test(rel));
  return critical ? { risk: "critical", reason: critical.reason } : { risk: "write" };
}

function str(input: Record<string, unknown>, key: string, optional = false): string | undefined {
  const value = input[key];
  if (value === undefined && optional) return undefined;
  if (typeof value !== "string") throw new ToolError(`field "${key}" wajib berupa string`);
  return value;
}

function truncate(text: string, max = MAX_OUTPUT_CHARS): string {
  return text.length <= max ? text : `…(dipotong ${text.length - max} karakter)\n` + text.slice(-max);
}

function preview(content: string, lines = 40): string {
  const all = content.split("\n");
  return all.slice(0, lines).join("\n") + (all.length > lines ? `\n… (+${all.length - lines} baris)` : "");
}

async function gate(ctx: ToolContext, action: PendingAction): Promise<void> {
  if (!(await ctx.approval.approve(action))) {
    throw new ToolError("Pengguna tidak menyetujui aksi ini. Jangan ulangi; tanyakan atau pilih pendekatan lain.");
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
      description: "Daftar file di proyek (rekursif, tanpa node_modules/.git/dist). Pakai untuk memahami struktur proyek.",
      inputSchema: { type: "object", properties: { path: { type: "string", description: "Folder awal, default root proyek" } }, additionalProperties: false },
    },
    async run(input, ctx) {
      const { abs } = resolveProjectPath(ctx.root, str(input, "path", true) ?? ".");
      if (!fs.existsSync(abs) || !fs.statSync(abs).isDirectory()) throw new ToolError("folder tidak ditemukan");
      const files = listFiles(fs.realpathSync(ctx.root), abs, 400);
      return files.length ? files.join("\n") + (files.length >= 400 ? "\n… (dibatasi 400 file)" : "") : "(kosong)";
    },
  },
  {
    spec: {
      name: "read_file",
      description: "Baca isi file teks di proyek. File .env tidak bisa dibaca demi keamanan.",
      inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
    },
    async run(input, ctx) {
      const { abs, rel } = resolveProjectPath(ctx.root, str(input, "path"));
      if (isSecretFile(rel)) throw new ToolError(`${rel} berisi rahasia dan tidak boleh dibaca AI`);
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new ToolError(`file tidak ditemukan: ${rel}`);
      const size = fs.statSync(abs).size;
      if (size > MAX_READ_BYTES) throw new ToolError(`file terlalu besar (${size} byte)`);
      return fs.readFileSync(abs, "utf8");
    },
  },
  {
    spec: {
      name: "search",
      description: "Cari teks (case-insensitive) di file proyek. Mengembalikan baris yang cocok beserta lokasinya.",
      inputSchema: {
        type: "object",
        properties: { query: { type: "string" }, path: { type: "string", description: "Folder, default root" } },
        required: ["query"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const query = str(input, "query")!.toLowerCase();
      if (!query) throw new ToolError("query tidak boleh kosong");
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
      return hits.length ? hits.join("\n") : "Tidak ada hasil.";
    },
  },
  {
    spec: {
      name: "list_routes",
      description: "Daftar route aplikasi Zentara beserta method HTTP dan file-nya.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    async run(_input, ctx) {
      const config = resolveConfig(await loadConfigFile(ctx.root), process.env, ctx.root);
      const router = new ZenRouter(new ZenLogger("silent"));
      try {
        await router.loadRoutes(config.routesDir);
      } catch (err) {
        throw new ToolError(`gagal memuat route: ${(err as Error).message}`);
      }
      const rows = router.list.map((r) => `${allowedMethods(r.module).join("|")} ${r.pattern} -> ${toPosix(path.relative(ctx.root, r.file))}`);
      return rows.join("\n") || "(belum ada route)";
    },
  },
  {
    spec: {
      name: "write_file",
      description: "Buat file baru atau timpa seluruh isi file. Untuk perubahan kecil pada file yang ada, pakai edit_file.",
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
      if (exists && !fs.statSync(abs).isFile()) throw new ToolError(`${rel} adalah folder`);
      const { risk, reason } = writeRisk(rel);
      const lines = content.split("\n").length;
      await gate(ctx, {
        tool: "write_file",
        risk,
        reason,
        summary: `${exists ? "Timpa" : "Buat"} ${rel} (${lines} baris)`,
        preview: preview(content),
      });
      if (ctx.dryRun) return `[dry-run] ${rel} tidak ditulis`;
      ctx.journal.record(rel);
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, content);
      return `${exists ? "Ditimpa" : "Dibuat"}: ${rel}`;
    },
  },
  {
    spec: {
      name: "edit_file",
      description: "Ganti satu potongan teks yang persis dan unik di sebuah file. old_text harus muncul tepat satu kali.",
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
      if (!fs.existsSync(abs)) throw new ToolError(`file tidak ditemukan: ${rel}`);
      if (isSecretFile(rel)) throw new ToolError(`${rel} berisi rahasia dan tidak boleh diubah AI`);
      if (!oldText) throw new ToolError("old_text tidak boleh kosong");
      const current = fs.readFileSync(abs, "utf8");
      const count = current.split(oldText).length - 1;
      if (count === 0) throw new ToolError("old_text tidak ditemukan; baca ulang file dan salin teksnya persis");
      if (count > 1) throw new ToolError(`old_text muncul ${count} kali; tambahkan konteks agar unik`);
      const { risk, reason } = writeRisk(rel);
      const diff = [...oldText.split("\n").map((l) => `- ${l}`), ...newText.split("\n").map((l) => `+ ${l}`)].join("\n");
      await gate(ctx, { tool: "edit_file", risk, reason, summary: `Ubah ${rel}`, preview: preview(diff, 60) });
      if (ctx.dryRun) return `[dry-run] ${rel} tidak diubah`;
      ctx.journal.record(rel);
      fs.writeFileSync(abs, current.replace(oldText, () => newText));
      return `Diubah: ${rel}`;
    },
  },
  {
    spec: {
      name: "delete_file",
      description: "Hapus sebuah file. Selalu meminta persetujuan pengguna.",
      inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"], additionalProperties: false },
    },
    async run(input, ctx) {
      const { abs, rel } = resolveProjectPath(ctx.root, str(input, "path"));
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) throw new ToolError(`file tidak ditemukan: ${rel}`);
      writeRisk(rel); // tolak path terlarang
      await gate(ctx, { tool: "delete_file", risk: "critical", reason: "menghapus file", summary: `Hapus ${rel}` });
      if (ctx.dryRun) return `[dry-run] ${rel} tidak dihapus`;
      ctx.journal.record(rel);
      fs.rmSync(abs);
      return `Dihapus: ${rel}`;
    },
  },
  {
    spec: {
      name: "run_check",
      description: "Jalankan pemeriksaan proyek: typecheck, test, atau build. Pakai setelah mengubah kode.",
      inputSchema: {
        type: "object",
        properties: { check: { type: "string", enum: ["typecheck", "test", "build"] } },
        required: ["check"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const check = str(input, "check")!;
      if (!["typecheck", "test", "build"].includes(check)) throw new ToolError("check harus typecheck, test, atau build");
      const result = await ctx.runScript(check);
      return `${result.ok ? "BERHASIL" : "GAGAL"}: npm run ${check}\n${truncate(result.output)}`;
    },
  },
  {
    spec: {
      name: "database",
      description:
        "Kelola database: generate = buat file migrasi dari perubahan src/app/db/schema.ts; migrate = terapkan migrasi ke database; seed = isi data awal. Jangan menulis SQL migrasi secara manual.",
      inputSchema: {
        type: "object",
        properties: { action: { type: "string", enum: ["generate", "migrate", "seed"] } },
        required: ["action"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const action = str(input, "action") as DbAction;
      if (!["generate", "migrate", "seed"].includes(action)) throw new ToolError("action harus generate, migrate, atau seed");
      const critical = action !== "generate";
      await gate(ctx, {
        tool: "database",
        risk: critical ? "critical" : "write",
        reason: critical ? `${action === "migrate" ? "mengubah struktur" : "menambah data ke"} database (tidak bisa dibatalkan dengan undo)` : undefined,
        summary: { generate: "Buat file migrasi database", migrate: "Terapkan migrasi ke database", seed: "Isi data awal database" }[action],
      });
      if (ctx.dryRun) return `[dry-run] database ${action} tidak dijalankan`;

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
      return `${result.ok ? "BERHASIL" : "GAGAL"}: db:${action}\n${truncate(result.output, 3000)}`;
    },
  },
  {
    spec: {
      name: "install_package",
      description: "Pasang paket npm. Selalu meminta persetujuan pengguna.",
      inputSchema: {
        type: "object",
        properties: { name: { type: "string" }, dev: { type: "boolean", description: "true untuk devDependency" } },
        required: ["name"],
        additionalProperties: false,
      },
    },
    async run(input, ctx) {
      const name = str(input, "name")!;
      if (!/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(@[\w.^~<>=*-]+)?$/i.test(name)) throw new ToolError(`nama paket tidak valid: ${name}`);
      const dev = input.dev === true;
      await gate(ctx, {
        tool: "install_package",
        risk: "critical",
        reason: "mengunduh dan memasang kode pihak ketiga",
        summary: `npm install ${dev ? "-D " : ""}${name}`,
      });
      if (ctx.dryRun) return `[dry-run] ${name} tidak dipasang`;
      ctx.journal.record("package.json");
      ctx.journal.record("package-lock.json");
      const result = await ctx.runScript("__install__", [...(dev ? ["-D"] : []), name]);
      return `${result.ok ? "BERHASIL" : "GAGAL"}: npm install ${name}\n${truncate(result.output, 2000)}`;
    },
  },
];

/** Jalankan skrip npm di proyek (tanpa shell), dengan batas waktu. */
export function createScriptRunner(root: string, timeoutMs = 5 * 60 * 1000) {
  return (script: string, args: string[] = []): Promise<CommandResult> => {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const argv = script === "__install__" ? ["install", ...args] : ["run", script, "--silent"];
    if (script !== "__install__") {
      const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")) as { scripts?: Record<string, string> };
      if (!pkg.scripts?.[script]) return Promise.resolve({ ok: true, output: `(skrip "${script}" tidak ada, dilewati)` });
    }
    return new Promise((resolve) => {
      const child = spawn(npm, argv, { cwd: root, env: { ...process.env, FORCE_COLOR: "0" }, timeout: timeoutMs });
      let output = "";
      child.stdout.on("data", (c: Buffer) => (output += c.toString()));
      child.stderr.on("data", (c: Buffer) => (output += c.toString()));
      child.on("error", (err) => resolve({ ok: false, output: `${output}\n${err.message}` }));
      child.on("close", (code, signal) =>
        resolve({ ok: code === 0, output: signal ? `${output}\n(dihentikan: ${signal})` : output }),
      );
    });
  };
}

/** Jalankan `zentara db:<action>` di proses Node terpisah (modul database aplikasi dimuat segar setiap kali). */
export function createDbRunner(root: string, timeoutMs = 5 * 60 * 1000) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const cli = [path.join(here, "..", "cli.js"), path.join(here, "..", "cli.ts")].find((f) => fs.existsSync(f));
  return (action: DbAction): Promise<CommandResult> => {
    if (!cli) return Promise.resolve({ ok: false, output: "CLI Zentara tidak ditemukan" });
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
