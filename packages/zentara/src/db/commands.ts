import { spawn } from "node:child_process";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfigFile, resolveConfig } from "../core/config.js";
import { closeDatabase, migrateDatabase } from "./index.js";

export interface DbCommandResult {
  ok: boolean;
  output: string;
}

const MIGRATIONS_DIR = "drizzle";

/** Cari modul aplikasi (mis. db/index) di samping folder route: src/app saat dev, dist/app saat produksi. */
async function findAppModule(root: string, name: string): Promise<string | undefined> {
  const config = resolveConfig(await loadConfigFile(root), process.env, root);
  const base = path.join(config.appDir, name);
  return [".ts", ".mts", ".js", ".mjs"].map((ext) => base + ext).find((f) => fs.existsSync(f));
}

async function importAppDb(root: string): Promise<unknown> {
  const file = await findAppModule(root, path.join("db", "index"));
  if (!file) throw new Error("Modul database tidak ditemukan (buat app/db/index.ts yang meng-export `db`)");
  const mod = (await import(pathToFileURL(file).href)) as { db?: unknown };
  if (!mod.db) throw new Error(`${path.relative(root, file)} harus meng-export \`db\``);
  return mod.db;
}

/** Buat file migrasi SQL dari perubahan schema (memakai drizzle-kit). */
export function dbGenerate(root: string, name?: string): Promise<DbCommandResult> {
  let bin: string;
  try {
    // drizzle-kit tidak meng-export package.json-nya; cari dari entry utama ke atas.
    let dir = path.dirname(createRequire(path.join(root, "package.json")).resolve("drizzle-kit"));
    while (!fs.existsSync(path.join(dir, "package.json")) && path.dirname(dir) !== dir) dir = path.dirname(dir);
    const pkgFile = path.join(dir, "package.json");
    const pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8")) as { bin?: string | Record<string, string> };
    const rel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin?.["drizzle-kit"];
    if (!rel) throw new Error("bin drizzle-kit tidak ditemukan");
    bin = path.join(path.dirname(pkgFile), rel);
  } catch {
    return Promise.resolve({ ok: false, output: "drizzle-kit belum dipasang. Jalankan: npm install -D drizzle-kit" });
  }
  const args = [bin, "generate", ...(name ? ["--name", name] : [])];
  return new Promise((resolve) => {
    const child = spawn(process.execPath, args, { cwd: root, env: { ...process.env, FORCE_COLOR: "0" } });
    let output = "";
    child.stdout.on("data", (c: Buffer) => (output += c.toString()));
    child.stderr.on("data", (c: Buffer) => (output += c.toString()));
    child.on("error", (err) => resolve({ ok: false, output: `${output}\n${err.message}` }));
    child.on("close", (code) => resolve({ ok: code === 0, output: output.trim() }));
  });
}

/** Terapkan migrasi yang belum dijalankan ke database aplikasi. */
export async function dbMigrate(root: string): Promise<DbCommandResult> {
  const folder = path.join(root, MIGRATIONS_DIR);
  if (!fs.existsSync(path.join(folder, "meta", "_journal.json"))) {
    return { ok: false, output: `Belum ada migrasi di ${MIGRATIONS_DIR}/. Jalankan dulu: zentara db:generate` };
  }
  const db = await importAppDb(root);
  try {
    await migrateDatabase(db, folder);
    return { ok: true, output: "Migrasi selesai." };
  } finally {
    await closeDatabase(db);
  }
}

/** Jalankan app/db/seed (default export: async (db) => string | void). */
export async function dbSeed(root: string): Promise<DbCommandResult> {
  const file = await findAppModule(root, path.join("db", "seed"));
  if (!file) return { ok: false, output: "File seed tidak ditemukan (buat app/db/seed.ts)" };
  const db = await importAppDb(root);
  try {
    const mod = (await import(pathToFileURL(file).href)) as { default?: (db: unknown) => unknown };
    if (typeof mod.default !== "function") return { ok: false, output: `${path.relative(root, file)} harus meng-export default function` };
    const message = await mod.default(db);
    return { ok: true, output: typeof message === "string" ? message : "Seed selesai." };
  } finally {
    await closeDatabase(db);
  }
}
