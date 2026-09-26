import { AsyncLocalStorage } from "node:async_hooks";
import { recordQuery, tracingEnabled } from "../core/devtrace.js";
import { t } from "../i18n/index.js";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { drizzle as drizzleSqliteProxy, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import { migrate as migrateSqliteProxy } from "drizzle-orm/sqlite-proxy/migrator";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

export type DbDialect = "sqlite" | "postgres";
type Schema = Record<string, unknown>;

interface DbHandle {
  dialect: DbDialect;
  migrate(folder: string): Promise<void>;
  close(): Promise<void>;
}

const HANDLE = Symbol.for("zentara.db");

function attach<T extends object>(db: T, handle: DbHandle): T {
  Object.defineProperty(db, HANDLE, { value: handle, enumerable: false });
  return db;
}

function handleOf(db: unknown): DbHandle {
  const handle = (db as Record<symbol, DbHandle | undefined>)[HANDLE];
  if (!handle) throw new Error(t().dev.db.notDatabase);
  return handle;
}

export function databaseDialect(db: unknown): DbDialect {
  return handleOf(db).dialect;
}

/** Jalankan semua migrasi SQL (hasil `zentara db:generate`) yang belum diterapkan. */
export function migrateDatabase(db: unknown, migrationsFolder: string): Promise<void> {
  return handleOf(db).migrate(path.resolve(migrationsFolder));
}

export function closeDatabase(db: unknown): Promise<void> {
  return handleOf(db).close();
}

export function dialectFromUrl(url: string): DbDialect {
  return /^postgres(ql)?:\/\//i.test(url) ? "postgres" : "sqlite";
}

/** "file:./data/app.db", "sqlite:./app.db", "./app.db" -> path file; ":memory:" tetap. */
export function sqlitePathFromUrl(url: string, cwd = process.cwd()): string {
  const raw = url.replace(/^(file|sqlite):(\/\/)?/i, "");
  if (raw === ":memory:" || raw === "") return ":memory:";
  return path.resolve(cwd, raw);
}

/**
 * Muat `node:sqlite` tanpa menampilkan ExperimentalWarning-nya di setiap start
 * (hanya peringatan SQLite itu yang diredam; peringatan lain tetap tampil).
 */
function loadNodeSqlite(): typeof import("node:sqlite") {
  const original = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const text = typeof warning === "string" ? warning : warning.message;
    const type = typeof rest[0] === "string" ? rest[0] : (rest[0] as { type?: string } | undefined)?.type;
    if ((type === "ExperimentalWarning" || (warning as Error).name === "ExperimentalWarning") && /SQLite/i.test(text)) return;
    return (original as (...args: unknown[]) => void).call(process, warning, ...rest);
  }) as typeof process.emitWarning;
  try {
    return process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
  } finally {
    process.emitWarning = original;
  }
}

export interface SqliteOptions {
  cwd?: string;
}

/**
 * Buka database SQLite memakai `node:sqlite` bawaan Node (tanpa driver native).
 * Transaksi diserialkan agar query dari request lain tidak ikut masuk ke transaksi yang sedang berjalan.
 */
export function createSqlite<S extends Schema>(url: string, schema: S, options: SqliteOptions = {}): SqliteRemoteDatabase<S> {
  const file = sqlitePathFromUrl(url, options.cwd);
  if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
  const { DatabaseSync: Database } = loadNodeSqlite();
  const sqlite: DatabaseSync = new Database(file);
  sqlite.exec("PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;");
  if (file !== ":memory:") sqlite.exec("PRAGMA journal_mode = WAL;");

  const owner = new AsyncLocalStorage<object>();
  let active: { owner: object; done: Promise<void> } | undefined;
  const waitTurn = async () => {
    while (active && owner.getStore() !== active.owner) await active.done;
  };

  const db = drizzleSqliteProxy(
    async (query, params, method) => {
      await waitTurn();
      const started = tracingEnabled() ? performance.now() : 0;
      try {
        const stmt = sqlite.prepare(query);
        const args = params as never[];
        if (method === "run") {
          stmt.run(...args);
          return { rows: [] };
        }
        stmt.setReturnArrays(true);
        if (method === "get") return { rows: (stmt.get(...args) ?? undefined) as never };
        return { rows: stmt.all(...args) as never };
      } finally {
        // Toolbar dev: catat query dan lamanya di jejak request yang sedang berjalan.
        if (started) recordQuery(query, performance.now() - started);
      }
    },
    { schema },
  );

  const transaction = db.transaction.bind(db);
  db.transaction = (async (fn: Parameters<typeof transaction>[0], config?: Parameters<typeof transaction>[1]) => {
    if (active && owner.getStore() === active.owner) return transaction(fn, config);
    while (active) await active.done;
    const me = {};
    let release!: () => void;
    active = { owner: me, done: new Promise<void>((r) => (release = r)) };
    try {
      return await owner.run(me, () => transaction(fn, config));
    } finally {
      active = undefined;
      release();
    }
  }) as typeof db.transaction;

  return attach(db, {
    dialect: "sqlite",
    migrate: (folder) =>
      migrateSqliteProxy(
        db,
        async (queries) => {
          sqlite.exec("BEGIN");
          try {
            for (const q of queries) sqlite.exec(q);
            sqlite.exec("COMMIT");
          } catch (err) {
            sqlite.exec("ROLLBACK");
            throw err;
          }
        },
        { migrationsFolder: folder },
      ),
    close: async () => sqlite.close(),
  });
}

export interface PostgresOptions {
  /** Jumlah koneksi maksimum di pool. Default 10. */
  max?: number;
}

/** Hubungkan ke PostgreSQL. Butuh paket `postgres` (npm install postgres). */
export async function createPostgres<S extends Schema>(
  url: string,
  schema: S,
  options: PostgresOptions = {},
): Promise<PostgresJsDatabase<S>> {
  let postgres: typeof import("postgres");
  try {
    postgres = (await import("postgres")).default as unknown as typeof import("postgres");
  } catch (cause) {
    throw new Error(t().dev.db.noPostgres, { cause });
  }
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const client = postgres(url, { max: options.max ?? 10, onnotice: () => {} });
  // Toolbar dev: query dicatat di jejak request (driver ini tidak memberi lama eksekusi per query).
  const db = drizzle(client, { schema, logger: { logQuery: (query: string) => recordQuery(query) } });
  return attach(db, {
    dialect: "postgres",
    migrate: async (folder) => {
      const { migrate } = await import("drizzle-orm/postgres-js/migrator");
      await migrate(db, { migrationsFolder: folder });
    },
    close: () => client.end({ timeout: 5 }),
  });
}

/** Pilih driver dari URL: postgres:// -> PostgreSQL, selain itu SQLite. */
export async function createDatabase<S extends Schema>(url: string, schema: S) {
  return dialectFromUrl(url) === "postgres" ? createPostgres(url, schema) : createSqlite(url, schema);
}
