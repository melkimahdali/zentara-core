import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { DatabaseSync } from "node:sqlite";
import { ZenLogger } from "../core/logger.js";
import { t } from "../i18n/index.js";
import { parseCron, type CronSchedule } from "./cron.js";
import { parseDuration, type Duration } from "./duration.js";

/**
 * Job latar belakang dan jadwal.
 *
 * Setiap file di `src/app/jobs/` adalah satu job (nama = path file tanpa ekstensi, mis. "kirim-laporan"):
 *
 *   // src/app/jobs/kirim-laporan.ts
 *   export default async function (data: { userId: number }, job: JobContext) { ... }
 *   export const retries = 3;             // opsional, default 3
 *   export const schedule = "0 7 * * *";  // opsional: jalan otomatis sesuai cron
 *
 * Masukkan ke antrean dari route: `await enqueue("kirim-laporan", { userId: 1 })`. Antrean disimpan di
 * SQLite (data/jobs.db), jadi job tidak hilang saat server dimulai ulang. Job yang gagal dicoba lagi
 * dengan jeda yang makin panjang.
 */

export interface JobContext {
  id: string;
  name: string;
  /** Percobaan ke berapa (mulai 1). */
  attempt: number;
  maxAttempts: number;
  logger: ZenLogger;
}

export type JobHandler<T = unknown> = (data: T, job: JobContext) => unknown;

export interface JobDefinition {
  name: string;
  handler: JobHandler;
  /** Percobaan ulang setelah gagal (total percobaan = retries + 1). */
  retries: number;
  schedule?: CronSchedule;
  file?: string;
}

export interface EnqueueOptions {
  /** Tunda, mis. "10m". */
  delay?: Duration;
  /** Jalankan pada waktu tertentu. */
  runAt?: Date;
  /** Ganti jumlah percobaan ulang untuk job ini saja. */
  retries?: number;
}

export type JobStatus = "queued" | "running" | "done" | "failed";

export interface JobRecord {
  id: string;
  name: string;
  data: string;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  runAt: number;
  lockedUntil: number;
  lastError: string | null;
  createdAt: number;
  finishedAt: number | null;
}

export interface JobStore {
  add(record: JobRecord): void;
  /** Ambil satu job yang sudah waktunya (atau yang kuncinya kedaluwarsa) dan tandai sedang berjalan. */
  claim(now: number, lockMs: number): JobRecord | undefined;
  complete(id: string, now: number): void;
  retry(id: string, runAt: number, error: string): void;
  fail(id: string, error: string, now: number): void;
  /** true bila proses ini yang berhak menjalankan jadwal `name` untuk menit `slot` (aman untuk banyak proses). */
  claimSchedule(name: string, slot: number): boolean;
  counts(): Record<JobStatus, number>;
  list(options?: { status?: JobStatus; limit?: number }): JobRecord[];
  /** Hapus job yang sudah selesai sebelum `before`. */
  prune(before: number): number;
  close(): void;
}

// ── Penyimpanan ─────────────────────────────────────────────────────────────

export class MemoryJobStore implements JobStore {
  private readonly jobs = new Map<string, JobRecord>();
  private readonly slots = new Map<string, number>();

  add(record: JobRecord): void {
    this.jobs.set(record.id, { ...record });
  }

  claim(now: number, lockMs: number): JobRecord | undefined {
    const due = [...this.jobs.values()]
      .filter((j) => (j.status === "queued" && j.runAt <= now) || (j.status === "running" && j.lockedUntil <= now))
      .sort((a, b) => a.runAt - b.runAt)[0];
    if (!due) return undefined;
    Object.assign(due, { status: "running", lockedUntil: now + lockMs, attempts: due.attempts + 1 });
    return { ...due };
  }

  complete(id: string, now: number): void {
    const job = this.jobs.get(id);
    if (job) Object.assign(job, { status: "done", finishedAt: now, lockedUntil: 0 });
  }

  retry(id: string, runAt: number, error: string): void {
    const job = this.jobs.get(id);
    if (job) Object.assign(job, { status: "queued", runAt, lastError: error, lockedUntil: 0 });
  }

  fail(id: string, error: string, now: number): void {
    const job = this.jobs.get(id);
    if (job) Object.assign(job, { status: "failed", lastError: error, finishedAt: now, lockedUntil: 0 });
  }

  claimSchedule(name: string, slot: number): boolean {
    if ((this.slots.get(name) ?? -1) >= slot) return false;
    this.slots.set(name, slot);
    return true;
  }

  counts(): Record<JobStatus, number> {
    const counts: Record<JobStatus, number> = { queued: 0, running: 0, done: 0, failed: 0 };
    for (const job of this.jobs.values()) counts[job.status]++;
    return counts;
  }

  list(options: { status?: JobStatus; limit?: number } = {}): JobRecord[] {
    return [...this.jobs.values()]
      .filter((j) => !options.status || j.status === options.status)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, options.limit ?? 50)
      .map((j) => ({ ...j }));
  }

  prune(before: number): number {
    let removed = 0;
    for (const [id, job] of this.jobs) {
      if (job.status === "done" && (job.finishedAt ?? 0) < before) {
        this.jobs.delete(id);
        removed++;
      }
    }
    return removed;
  }

  close(): void {}
}

/** Antrean di SQLite (`node:sqlite`, tanpa driver tambahan). Aman dipakai beberapa proses di satu mesin. */
export class SqliteJobStore implements JobStore {
  private readonly db: DatabaseSync;

  constructor(file: string) {
    if (file !== ":memory:") fs.mkdirSync(path.dirname(file), { recursive: true });
    const { DatabaseSync: Database } = loadSqlite();
    this.db = new Database(file);
    this.db.exec(`
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS zentara_jobs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        data TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        max_attempts INTEGER NOT NULL,
        run_at INTEGER NOT NULL,
        locked_until INTEGER NOT NULL DEFAULT 0,
        last_error TEXT,
        created_at INTEGER NOT NULL,
        finished_at INTEGER
      );
      CREATE INDEX IF NOT EXISTS zentara_jobs_due ON zentara_jobs (status, run_at);
      CREATE TABLE IF NOT EXISTS zentara_schedules (name TEXT PRIMARY KEY, last_slot INTEGER NOT NULL);
    `);
    if (file !== ":memory:") this.db.exec("PRAGMA journal_mode = WAL;");
  }

  private static row(r: Record<string, unknown>): JobRecord {
    return {
      id: String(r.id),
      name: String(r.name),
      data: String(r.data),
      status: r.status as JobStatus,
      attempts: Number(r.attempts),
      maxAttempts: Number(r.max_attempts),
      runAt: Number(r.run_at),
      lockedUntil: Number(r.locked_until),
      lastError: r.last_error === null || r.last_error === undefined ? null : String(r.last_error),
      createdAt: Number(r.created_at),
      finishedAt: r.finished_at === null || r.finished_at === undefined ? null : Number(r.finished_at),
    };
  }

  add(j: JobRecord): void {
    this.db
      .prepare("INSERT INTO zentara_jobs (id, name, data, status, attempts, max_attempts, run_at, locked_until, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)")
      .run(j.id, j.name, j.data, j.status, j.attempts, j.maxAttempts, j.runAt, j.createdAt);
  }

  claim(now: number, lockMs: number): JobRecord | undefined {
    // Satu pernyataan UPDATE ... RETURNING: tidak ada dua proses yang mengambil job yang sama.
    const row = this.db
      .prepare(
        `UPDATE zentara_jobs SET status = 'running', locked_until = ?, attempts = attempts + 1
         WHERE id = (SELECT id FROM zentara_jobs
                     WHERE (status = 'queued' AND run_at <= ?) OR (status = 'running' AND locked_until <= ?)
                     ORDER BY run_at LIMIT 1)
         RETURNING *`,
      )
      .get(now + lockMs, now, now) as Record<string, unknown> | undefined;
    return row ? SqliteJobStore.row(row) : undefined;
  }

  complete(id: string, now: number): void {
    this.db.prepare("UPDATE zentara_jobs SET status = 'done', finished_at = ?, locked_until = 0 WHERE id = ?").run(now, id);
  }

  retry(id: string, runAt: number, error: string): void {
    this.db.prepare("UPDATE zentara_jobs SET status = 'queued', run_at = ?, last_error = ?, locked_until = 0 WHERE id = ?").run(runAt, error, id);
  }

  fail(id: string, error: string, now: number): void {
    this.db.prepare("UPDATE zentara_jobs SET status = 'failed', last_error = ?, finished_at = ?, locked_until = 0 WHERE id = ?").run(error, now, id);
  }

  claimSchedule(name: string, slot: number): boolean {
    const result = this.db
      .prepare("INSERT INTO zentara_schedules (name, last_slot) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET last_slot = excluded.last_slot WHERE last_slot < excluded.last_slot")
      .run(name, slot);
    return Number(result.changes) === 1;
  }

  counts(): Record<JobStatus, number> {
    const counts: Record<JobStatus, number> = { queued: 0, running: 0, done: 0, failed: 0 };
    for (const r of this.db.prepare("SELECT status, COUNT(*) AS n FROM zentara_jobs GROUP BY status").all() as { status: JobStatus; n: number }[]) {
      counts[r.status] = Number(r.n);
    }
    return counts;
  }

  list(options: { status?: JobStatus; limit?: number } = {}): JobRecord[] {
    const limit = options.limit ?? 50;
    const rows = options.status
      ? this.db.prepare("SELECT * FROM zentara_jobs WHERE status = ? ORDER BY created_at DESC LIMIT ?").all(options.status, limit)
      : this.db.prepare("SELECT * FROM zentara_jobs ORDER BY created_at DESC LIMIT ?").all(limit);
    return (rows as Record<string, unknown>[]).map((r) => SqliteJobStore.row(r));
  }

  prune(before: number): number {
    return Number(this.db.prepare("DELETE FROM zentara_jobs WHERE status = 'done' AND finished_at < ?").run(before).changes);
  }

  close(): void {
    this.db.close();
  }
}

/** Muat `node:sqlite` tanpa menampilkan ExperimentalWarning-nya. */
function loadSqlite(): typeof import("node:sqlite") {
  const original = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const text = typeof warning === "string" ? warning : warning.message;
    if (/SQLite/i.test(text)) return;
    return (original as (...args: unknown[]) => void).call(process, warning, ...rest);
  }) as typeof process.emitWarning;
  try {
    return process.getBuiltinModule("node:sqlite") as typeof import("node:sqlite");
  } finally {
    process.emitWarning = original;
  }
}

// ── Memuat file job ─────────────────────────────────────────────────────────

const JOB_FILE = /\.(ts|mts|js|mjs)$/;

function jobFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    if (e.name.startsWith("_") || e.name.startsWith(".")) return [];
    const full = path.join(dir, e.name);
    if (e.isDirectory()) return jobFiles(full);
    if (!JOB_FILE.test(e.name) || /\.d\.ts$|\.(test|spec)\./.test(e.name)) return [];
    return [full];
  });
}

/** Baca semua job di folder `dir` (mis. src/app/jobs). */
export async function loadJobs(dir: string): Promise<JobDefinition[]> {
  const defs: JobDefinition[] = [];
  for (const file of jobFiles(dir).sort()) {
    const name = path.relative(dir, file).replace(JOB_FILE, "").split(path.sep).join("/");
    const mod = (await import(pathToFileURL(file).href)) as { default?: unknown; retries?: unknown; schedule?: unknown };
    if (typeof mod.default !== "function") throw new Error(t().backend.jobNoHandler(path.relative(process.cwd(), file)));
    const retries = mod.retries === undefined ? 3 : Number(mod.retries);
    if (!Number.isInteger(retries) || retries < 0) throw new Error(t().backend.jobBadRetries(name));
    let schedule: CronSchedule | undefined;
    if (mod.schedule !== undefined) {
      if (typeof mod.schedule !== "string") throw new Error(t().backend.jobBadSchedule(name));
      schedule = parseCron(mod.schedule);
    }
    defs.push({ name, handler: mod.default as JobHandler, retries, schedule, file });
  }
  return defs;
}

// ── Antrean & pekerja ───────────────────────────────────────────────────────

export interface JobQueueOptions {
  store?: JobStore;
  logger?: ZenLogger;
  /** Seberapa sering antrean dicek. Default 1 detik. */
  pollMs?: number;
  /** Job yang dijalankan bersamaan. Default 2. */
  concurrency?: number;
  /** Batas waktu satu job sebelum boleh diambil ulang oleh proses lain (bila proses ini mati). Default 15 menit. */
  lockMs?: number;
}

/** Jeda sebelum percobaan ulang: 10 detik, 20 detik, 40 detik, ... paling lama 1 jam. */
export function retryDelay(attempt: number): number {
  return Math.min(3_600_000, 10_000 * 2 ** Math.max(0, attempt - 1));
}

export class JobQueue {
  private store: JobStore | undefined;
  private logger = new ZenLogger("warn");
  private readonly defs = new Map<string, JobDefinition>();
  private loaded = false;
  private pollMs = 1000;
  private concurrency = 2;
  private lockMs = 15 * 60_000;
  private timer: NodeJS.Timeout | undefined;
  private scheduleTimer: NodeJS.Timeout | undefined;
  private readonly running = new Set<Promise<void>>();
  private ticking = false;

  /** Atur penyimpanan dan opsi. Dipanggil otomatis oleh ZenRuntime. */
  configure(options: JobQueueOptions): this {
    if (options.store) {
      this.store?.close();
      this.store = options.store;
    }
    if (options.logger) this.logger = options.logger;
    this.pollMs = options.pollMs ?? this.pollMs;
    this.concurrency = options.concurrency ?? this.concurrency;
    this.lockMs = options.lockMs ?? this.lockMs;
    return this;
  }

  /** Daftarkan job secara manual (selain dari folder jobs), mis. di test atau plugin. */
  define<T>(name: string, handler: JobHandler<T>, options: { retries?: number; schedule?: string } = {}): this {
    this.defs.set(name, { name, handler: handler as JobHandler, retries: options.retries ?? 3, schedule: options.schedule ? parseCron(options.schedule) : undefined });
    this.loaded = true;
    return this;
  }

  async load(dir: string): Promise<JobDefinition[]> {
    const defs = await loadJobs(dir);
    for (const def of defs) this.defs.set(def.name, def);
    this.loaded = true;
    return defs;
  }

  get definitions(): JobDefinition[] {
    return [...this.defs.values()];
  }

  private storeOrDefault(): JobStore {
    this.store ??= process.env.NODE_ENV === "test" ? new MemoryJobStore() : new SqliteJobStore(path.resolve("data", "jobs.db"));
    return this.store;
  }

  /** Masukkan job ke antrean. Mengembalikan id job. */
  async enqueue<T = unknown>(name: string, data?: T, options: EnqueueOptions = {}): Promise<string> {
    const def = this.defs.get(name);
    if (this.loaded && !def) throw new Error(t().backend.jobUnknown(name, [...this.defs.keys()].join(", ") || "-"));
    const serialized = JSON.stringify(data ?? null);
    const now = Date.now();
    const runAt = options.runAt ? options.runAt.getTime() : now + (options.delay === undefined ? 0 : parseDuration(options.delay));
    const retries = options.retries ?? def?.retries ?? 3;
    const id = randomUUID();
    this.storeOrDefault().add({ id, name, data: serialized, status: "queued", attempts: 0, maxAttempts: retries + 1, runAt, lockedUntil: 0, lastError: null, createdAt: now, finishedAt: null });
    // Job tanpa jeda langsung dicoba bila pekerja berjalan di proses ini.
    if (this.timer && runAt <= now) setImmediate(() => void this.tick());
    return id;
  }

  /** Jalankan job langsung di proses ini tanpa antrean (dipakai `zentara jobs:run`). */
  async runNow<T = unknown>(name: string, data?: T): Promise<unknown> {
    const def = this.defs.get(name);
    if (!def) throw new Error(t().backend.jobUnknown(name, [...this.defs.keys()].join(", ") || "-"));
    return def.handler(data ?? null, { id: "manual", name, attempt: 1, maxAttempts: 1, logger: this.logger });
  }

  /** Nyalakan pekerja (antrean) dan penjadwal (cron). */
  start(): void {
    if (this.timer) return;
    this.storeOrDefault();
    this.timer = setInterval(() => void this.tick(), this.pollMs);
    this.timer.unref();
    if (this.definitions.some((d) => d.schedule)) {
      this.scheduleTimer = setInterval(() => void this.runSchedules(), 10_000);
      this.scheduleTimer.unref();
      void this.runSchedules();
    }
    void this.tick();
  }

  /** Hentikan pekerja dan tunggu job yang sedang berjalan selesai. */
  async stop(): Promise<void> {
    clearInterval(this.timer);
    clearInterval(this.scheduleTimer);
    this.timer = undefined;
    this.scheduleTimer = undefined;
    await Promise.allSettled([...this.running]);
  }

  /** Tutup penyimpanan (mis. saat proses berakhir). */
  async close(): Promise<void> {
    await this.stop();
    this.store?.close();
    this.store = undefined;
  }

  /** Jalankan semua job yang sudah waktunya sampai antrean kosong. Berguna di test. */
  async drain(): Promise<void> {
    for (;;) {
      const job = this.storeOrDefault().claim(Date.now(), this.lockMs);
      if (!job) break;
      await this.execute(job);
    }
    await Promise.allSettled([...this.running]);
  }

  counts(): Record<JobStatus, number> {
    return this.storeOrDefault().counts();
  }

  list(options?: { status?: JobStatus; limit?: number }): JobRecord[] {
    return this.storeOrDefault().list(options);
  }

  /** Jadwal cron: setiap menit yang cocok, satu proses saja yang memasukkan job ke antrean. */
  private async runSchedules(now = new Date()): Promise<void> {
    const slot = Math.floor(now.getTime() / 60_000);
    const minute = new Date(slot * 60_000);
    for (const def of this.definitions) {
      if (!def.schedule?.matches(minute)) continue;
      try {
        if (this.storeOrDefault().claimSchedule(def.name, slot)) await this.enqueue(def.name, null);
      } catch (err) {
        this.logger.error(t().backend.scheduleFailed(def.name), err);
      }
    }
  }

  private async tick(): Promise<void> {
    if (this.ticking) return;
    this.ticking = true;
    try {
      while (this.running.size < this.concurrency) {
        const job = this.storeOrDefault().claim(Date.now(), this.lockMs);
        if (!job) break;
        const run = this.execute(job).finally(() => this.running.delete(run));
        this.running.add(run);
      }
    } catch (err) {
      this.logger.error(t().backend.queueError, err);
    } finally {
      this.ticking = false;
    }
  }

  private async execute(job: JobRecord): Promise<void> {
    const store = this.storeOrDefault();
    const def = this.defs.get(job.name);
    const started = Date.now();
    try {
      if (!def) throw new Error(t().backend.jobUnknown(job.name, [...this.defs.keys()].join(", ") || "-"));
      await def.handler(JSON.parse(job.data), { id: job.id, name: job.name, attempt: job.attempts, maxAttempts: job.maxAttempts, logger: this.logger });
      store.complete(job.id, Date.now());
      this.logger.debug(t().backend.jobDone(job.name, Date.now() - started));
    } catch (err) {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      if (job.attempts < job.maxAttempts) {
        const delay = retryDelay(job.attempts);
        store.retry(job.id, Date.now() + delay, message);
        this.logger.warn(t().backend.jobRetry(job.name, job.attempts, job.maxAttempts, Math.round(delay / 1000), message));
      } else {
        store.fail(job.id, message, Date.now());
        this.logger.error(t().backend.jobFailed(job.name, job.attempts), err);
      }
    }
  }
}

/** Antrean bersama untuk seluruh aplikasi. */
export const jobs = new JobQueue();

/**
 * Masukkan job ke antrean dari mana saja (route, job lain, skrip):
 *
 *   await enqueue("kirim-email-sambutan", { userId: user.id });
 *   await enqueue("pengingat", { id }, { delay: "1h" });
 */
export function enqueue<T = unknown>(name: string, data?: T, options?: EnqueueOptions): Promise<string> {
  return jobs.enqueue(name, data, options);
}
