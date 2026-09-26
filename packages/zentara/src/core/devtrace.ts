import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { format } from "node:util";

/**
 * Jejak per request saat pengembangan (toolbar dev, `zentara requests`, tool `request_log` Zentara AI):
 * waktu proses, query database beserta waktunya, query yang berulang (N+1), isi session, dan log.
 *
 * Hanya aktif bila runtime menyalakannya (`zentara dev` dengan devtools, bukan produksi). Tanpa itu
 * `currentTrace()` selalu undefined dan tidak ada yang dicatat.
 */

export interface TraceQuery {
  sql: string;
  /** Lama eksekusi (ms), bila driver bisa mengukurnya. */
  ms?: number;
}

export interface TraceLog {
  level: "debug" | "info" | "warn" | "error" | "log";
  message: string;
}

export interface RepeatedQuery {
  sql: string;
  count: number;
}

export interface RequestTrace {
  id: string;
  method: string;
  path: string;
  /** Waktu mulai (ms epoch). */
  at: number;
  status?: number;
  /** Lama proses sampai respons selesai dikirim. */
  ms?: number;
  route?: string;
  queries: TraceQuery[];
  /** Query identik yang dijalankan berkali-kali dalam satu request (tanda N+1). */
  repeated: RepeatedQuery[];
  logs: TraceLog[];
  /** Isi session (nilai rahasia disembunyikan), bila middleware session() terpasang. */
  session?: Record<string, string>;
  /** Jumlah query yang tidak dicatat karena melewati batas. */
  droppedQueries?: number;
}

/** Override tampilan per request (dipakai varian `view_page`): bahasa dan mode gelap/terang. */
export interface RequestOverride {
  locale?: "id" | "en";
  mode?: "light" | "dark";
  /** Tangkapan layar: halaman tanpa widget pengembangan. */
  shot?: boolean;
}

interface Store {
  trace?: RequestTrace;
  override?: RequestOverride;
}

const storage = new AsyncLocalStorage<Store>();
const MAX_TRACES = 50;
const MAX_QUERIES = 200;
const MAX_LOGS = 100;
/** Query identik sebanyak ini dalam satu request dianggap N+1. */
export const REPEAT_THRESHOLD = 3;
const recent: RequestTrace[] = [];
let enabled = false;
let consolePatched = false;

export function setTracing(on: boolean): void {
  enabled = on;
  if (on) patchConsole();
}

export function tracingEnabled(): boolean {
  return enabled;
}

/** Jalankan fn dengan jejak request baru (bila tracing aktif) dan override tampilan. */
export function runWithTrace<T>(init: { method: string; path: string; override?: RequestOverride }, fn: (trace: RequestTrace | undefined) => T): T {
  const trace: RequestTrace | undefined = enabled
    ? { id: randomBytes(6).toString("base64url"), method: init.method, path: init.path.slice(0, 500), at: Date.now(), queries: [], repeated: [], logs: [] }
    : undefined;
  if (!trace && !init.override) return fn(undefined);
  return storage.run({ trace, override: init.override }, () => fn(trace));
}

export function currentTrace(): RequestTrace | undefined {
  return storage.getStore()?.trace;
}

export function requestOverride(): RequestOverride | undefined {
  return storage.getStore()?.override;
}

/** Dipanggil driver database untuk setiap query. */
export function recordQuery(sql: string, ms?: number): void {
  const trace = currentTrace();
  if (!trace) return;
  if (trace.queries.length >= MAX_QUERIES) {
    trace.droppedQueries = (trace.droppedQueries ?? 0) + 1;
    return;
  }
  trace.queries.push({ sql: sql.replace(/\s+/g, " ").trim().slice(0, 2000), ...(ms !== undefined ? { ms: Math.round(ms * 100) / 100 } : {}) });
}

export function recordLog(level: TraceLog["level"], args: unknown[]): void {
  const trace = currentTrace();
  if (!trace || trace.logs.length >= MAX_LOGS) return;
  let message: string;
  try {
    message = format(...args);
  } catch {
    message = String(args[0]);
  }
  trace.logs.push({ level, message: message.slice(0, 1000) });
}

const SECRET_KEY = /pass|token|secret|csrf|key|hash|otp|pin/i;

/** Ringkas isi session untuk ditampilkan: nilai rahasia disembunyikan, nilai panjang dipotong. */
export function sessionPreview(data: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(data).slice(0, 30)) {
    if (SECRET_KEY.test(key)) out[key] = "•••";
    else {
      let text: string;
      try {
        text = typeof value === "string" ? value : JSON.stringify(value);
      } catch {
        text = String(value);
      }
      out[key] = (text ?? String(value)).slice(0, 200);
    }
  }
  return out;
}

/** Query yang sama persis (teks SQL dengan parameter) dijalankan >= REPEAT_THRESHOLD kali. */
export function repeatedQueries(queries: TraceQuery[]): RepeatedQuery[] {
  const counts = new Map<string, number>();
  for (const q of queries) counts.set(q.sql, (counts.get(q.sql) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([sql, n]) => n >= REPEAT_THRESHOLD && /^\s*select\b/i.test(sql))
    .map(([sql, count]) => ({ sql, count }))
    .sort((a, b) => b.count - a.count);
}

/** Tutup jejak setelah respons selesai, lalu simpan di antara 50 jejak terakhir. */
export function finishTrace(trace: RequestTrace, info: { status: number; route?: string; session?: Record<string, unknown> }): void {
  trace.status = info.status;
  trace.ms = Math.round((Date.now() - trace.at) * 10) / 10;
  if (info.route) trace.route = info.route;
  if (info.session) trace.session = sessionPreview(info.session);
  trace.repeated = repeatedQueries(trace.queries);
  // Aset bawaan dan kanal devtools tidak menarik untuk dilihat.
  if (trace.path.startsWith("/_zentara/")) return;
  recent.unshift(trace);
  if (recent.length > MAX_TRACES) recent.length = MAX_TRACES;
}

export function recentTraces(): RequestTrace[] {
  return recent.slice();
}

export function findTrace(id: string): RequestTrace | undefined {
  return recent.find((t) => t.id === id);
}

export function clearTraces(): void {
  recent.length = 0;
}

/** console.log/info/warn/error di dalam request ikut tercatat di jejaknya (tetap tampil di terminal). */
function patchConsole(): void {
  if (consolePatched) return;
  consolePatched = true;
  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    const original = console[level].bind(console);
    console[level] = (...args: unknown[]) => {
      recordLog(level, args);
      original(...args);
    };
  }
}
