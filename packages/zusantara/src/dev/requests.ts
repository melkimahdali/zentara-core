import type { RequestTrace } from "../core/devtrace.js";
import { t } from "../i18n/index.js";

/**
 * Jejak request saat pengembangan (`zusantara requests`, tool `request_log`, dan bagian "Request" di hasil
 * `view_page`): waktu proses, query database beserta waktunya, query berulang (N+1), session, dan log.
 * Jejaknya dicatat server aplikasi (lihat core/devtrace.ts) dan dibaca lewat /_zusantara/dev/requests
 * dengan token devtools.
 */

/** Ambil jejak dari server aplikasi. `id` kosong = 50 request terakhir. */
export async function fetchTraces(appUrl: string, token: string, id?: string, signal?: AbortSignal): Promise<RequestTrace[]> {
  const url = new URL(`/_zusantara/dev/requests${id ? `/${encodeURIComponent(id)}` : ""}`, appUrl);
  const res = await fetch(url, { headers: { "X-Zusantara-Token": token, Accept: "application/json" }, signal: AbortSignal.any([AbortSignal.timeout(5000), ...(signal ? [signal] : [])]) });
  if (res.status === 404 && id) return [];
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = (await res.json()) as RequestTrace | { requests?: RequestTrace[] };
  return id ? [data as RequestTrace] : ((data as { requests?: RequestTrace[] }).requests ?? []);
}

function ms(n: number | undefined): string {
  return n === undefined ? "?" : n >= 100 ? `${Math.round(n)} ms` : `${n} ms`;
}

/** Satu baris per request, terbaru di atas. */
export function formatTraceList(traces: RequestTrace[]): string {
  const m = t().dev.requests;
  if (!traces.length) return m.empty;
  return [
    m.recent(traces.length),
    ...traces.map((tr) => {
      const flags = [m.queries(tr.queries.length), tr.repeated.length ? m.nPlusOne : "", tr.logs.some((l) => l.level === "error") ? m.hasErrors : ""].filter(Boolean).join(" · ");
      return `- ${tr.id}  ${tr.method} ${tr.path} -> ${tr.status ?? "?"} · ${ms(tr.ms)} · ${flags}`;
    }),
    m.detailHint,
  ].join("\n");
}

/** Rincian satu request: query (dengan waktu), N+1, session, dan log. */
export function formatTrace(tr: RequestTrace, options: { maxQueries?: number } = {}): string {
  const m = t().dev.requests;
  const max = options.maxQueries ?? 30;
  const dbMs = tr.queries.reduce((n, q) => n + (q.ms ?? 0), 0);
  const lines = [`${m.request} ${tr.id}: ${tr.method} ${tr.path} -> ${tr.status ?? "?"} · ${ms(tr.ms)}${tr.route ? ` · ${tr.route}` : ""}`];
  lines.push(`${m.queries(tr.queries.length + (tr.droppedQueries ?? 0))}${tr.queries.some((q) => q.ms !== undefined) ? ` · ${m.dbTime(ms(Math.round(dbMs * 10) / 10))}` : ""}`);
  for (const q of tr.queries.slice(0, max)) lines.push(`- ${q.ms !== undefined ? `[${ms(q.ms)}] ` : ""}${q.sql}`);
  if (tr.queries.length > max) lines.push(`- ${m.more(tr.queries.length - max)}`);
  if (tr.repeated.length) {
    lines.push(m.repeated);
    for (const r of tr.repeated) lines.push(`- ${r.count}x ${r.sql}`);
  }
  if (tr.session) {
    const entries = Object.entries(tr.session);
    lines.push(entries.length ? m.session : `${m.session} ${m.none}`);
    for (const [k, v] of entries) lines.push(`- ${k}: ${v}`);
  }
  lines.push(tr.logs.length ? m.logs(tr.logs.length) : `${m.logs(0)} ${m.none}`);
  for (const l of tr.logs) lines.push(`- [${l.level}] ${l.message}`);
  return lines.join("\n");
}
