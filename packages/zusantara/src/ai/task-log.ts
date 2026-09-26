import fs from "node:fs";
import path from "node:path";
import { ZUSANTARA_VERSION } from "../core/devpage/theme.js";
import type { AgentResult } from "./agent.js";

/**
 * Journal hasil tugas Zusantara AI: satu baris JSON per tugas di `.zusantara/ai-tasks.jsonl`.
 *
 * Berisi ringkasan saja (status, jumlah langkah, token, hasil typecheck, test, dan `view_page`), bukan isi
 * file atau percakapan, dan tidak pernah dikirim keluar dari komputer. Dipakai `zusantara ai:log` dan eval AI
 * (Tahap 15) untuk melihat seberapa sering tugas berhasil.
 */
export interface TaskLogEntry {
  at: string;
  zusantara: string;
  /** Baris pertama permintaan, maksimal 200 karakter. */
  task: string;
  dryRun: boolean;
  status: AgentResult["status"] | "error";
  ok: boolean;
  steps: number;
  durationMs: number;
  fixAttempts: number;
  changedFiles: number;
  toolCalls: number;
  denied: number;
  usage?: AgentResult["usage"];
  models?: string[];
  checks: {
    typecheck?: boolean;
    test?: boolean;
    views: { path: string; viewport: string; mode?: string; ok?: boolean; issues?: number; unreachable?: boolean }[];
    viewAttempts: number;
  };
  error?: string;
}

const FILE = path.join(".zusantara", "ai-tasks.jsonl");
/** Batas ukuran: bila lewat, hanya separuh entri terbaru yang disimpan. */
const MAX_BYTES = 1_000_000;

export function taskLogPath(root: string): string {
  return path.join(root, FILE);
}

function firstLine(task: string): string {
  const line = task.split("\n").find((l) => l.trim()) ?? "";
  return line.trim().slice(0, 200);
}

/** Ubah hasil agen menjadi entri journal (tanpa isi file atau percakapan). */
export function taskLogEntry(task: string, result: AgentResult | { error: string }, options: { dryRun?: boolean; now?: Date } = {}): TaskLogEntry {
  const base = { at: (options.now ?? new Date()).toISOString(), zusantara: ZUSANTARA_VERSION, task: firstLine(task), dryRun: options.dryRun ?? false };
  if ("error" in result) {
    return { ...base, status: "error", ok: false, steps: 0, durationMs: 0, fixAttempts: 0, changedFiles: 0, toolCalls: 0, denied: 0, checks: { views: [], viewAttempts: 0 }, error: result.error.slice(0, 300) };
  }
  const step = (name: string) => result.checks.verify.find((s) => s.name === name)?.ok;
  return {
    ...base,
    status: result.status,
    ok: result.status === "done",
    steps: result.steps,
    durationMs: result.durationMs,
    fixAttempts: result.fixAttempts,
    changedFiles: result.changedFiles.length,
    toolCalls: result.toolCalls.length,
    denied: result.denied.length,
    usage: result.usage,
    models: result.models,
    checks: {
      typecheck: step("typecheck"),
      test: step("test"),
      views: result.checks.views.map((v) =>
        v.unreachable ? { path: v.path, viewport: v.viewport, unreachable: true } : { path: v.path, viewport: v.viewport, mode: v.mode, ok: v.ok, issues: v.issues },
      ),
      viewAttempts: result.checks.viewAttempts,
    },
  };
}

/** Tambahkan satu entri. Gagal menulis (mis. folder read-only) tidak menggagalkan tugas. */
export function appendTaskLog(root: string, entry: TaskLogEntry): void {
  const file = taskLogPath(root);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.appendFileSync(file, JSON.stringify(entry) + "\n");
    if (fs.statSync(file).size > MAX_BYTES) {
      const lines = fs.readFileSync(file, "utf8").split("\n").filter(Boolean);
      fs.writeFileSync(file, lines.slice(Math.floor(lines.length / 2)).join("\n") + "\n");
    }
  } catch {
    // Journal hanya pelengkap.
  }
}

/** Baca entri terbaru (paling akhir = paling baru). Baris rusak dilewati. */
export function readTaskLog(root: string, limit = 50): TaskLogEntry[] {
  let text: string;
  try {
    text = fs.readFileSync(taskLogPath(root), "utf8");
  } catch {
    return [];
  }
  const entries: TaskLogEntry[] = [];
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    try {
      const data = JSON.parse(line) as TaskLogEntry;
      if (data && typeof data.status === "string" && typeof data.at === "string") entries.push(data);
    } catch {
      // Lewati baris rusak.
    }
  }
  return entries.slice(-Math.max(1, limit));
}
