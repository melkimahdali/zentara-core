import { randomBytes } from "node:crypto";
import { t } from "../i18n/index.js";
import fs from "node:fs";
import path from "node:path";
import type { ChatMessage } from "./types.js";

/** Percakapan Zentara AI yang tersimpan di .zentara/sessions (diabaikan git). */
export interface SavedSession {
  id: string;
  /** Permintaan pertama, untuk daftar /resume. */
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface SessionSummary {
  id: string;
  title: string;
  updatedAt: string;
  /** Jumlah permintaan pengguna (bukan hasil tool). */
  turns: number;
}

const DIR = path.join(".zentara", "sessions");
/** Hanya sesi terbaru yang disimpan; yang lebih lama dihapus otomatis. */
const KEEP = 30;
const ID = /^[\w-]{1,80}$/;

export function newSessionId(now = new Date()): string {
  return `${now.toISOString().replace(/[:.]/g, "-")}-${randomBytes(3).toString("hex")}`;
}

function file(root: string, id: string): string {
  if (!ID.test(id)) throw new Error(t().ai.session.invalidId(id));
  return path.join(root, DIR, `${id}.json`);
}

/** Simpan sesi (hanya bisa dibaca pemilik file) lalu hapus sesi lama di luar batas. */
export function saveSession(root: string, session: SavedSession): void {
  const target = file(root, session.id);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const tmp = `${target}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(session), { mode: 0o600 });
  fs.renameSync(tmp, target);
  prune(path.dirname(target));
}

/** Hapus sesi di luar KEEP terbaru (berdasarkan waktu file diubah, tanpa membaca isinya). */
function prune(dir: string): void {
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({ f, t: fs.statSync(path.join(dir, f)).mtimeMs }))
    .sort((a, b) => b.t - a.t);
  for (const { f } of files.slice(KEEP)) fs.rmSync(path.join(dir, f), { force: true });
}

export function loadSession(root: string, id: string): SavedSession | undefined {
  try {
    const data = JSON.parse(fs.readFileSync(file(root, id), "utf8")) as SavedSession;
    return Array.isArray(data.messages) ? data : undefined;
  } catch {
    return undefined;
  }
}

/** Sesi tersimpan, terbaru lebih dulu. File rusak dilewati. */
export function listSessions(root: string): SessionSummary[] {
  const dir = path.join(root, DIR);
  let names: string[];
  try {
    names = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return [];
  }
  const out: SessionSummary[] = [];
  for (const name of names) {
    const id = name.slice(0, -5);
    if (!ID.test(id)) continue;
    const s = loadSession(root, id);
    if (!s) continue;
    out.push({ id, title: s.title, updatedAt: s.updatedAt, turns: s.messages.filter((m) => m.role === "user" && !m.text.startsWith("[")).length });
  }
  return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Perkiraan kasar jumlah token percakapan (±4 karakter per token; gambar dihitung ±1600 token). */
export function estimateTokens(messages: readonly ChatMessage[]): number {
  let images = 0;
  const text = JSON.stringify(messages, (key, value: unknown) => {
    if (key === "images" && Array.isArray(value)) {
      images += value.length;
      return undefined;
    }
    return value;
  });
  return Math.ceil(text.length / 4) + images * 1600;
}
