import fs from "node:fs";
import path from "node:path";

interface JournalEntry {
  path: string;
  /** Isi file sebelum diubah; `null` berarti file belum ada (dibuat oleh AI). */
  before: string | null;
}

interface JournalFile {
  task: string;
  createdAt: string;
  entries: JournalEntry[];
}

const HISTORY_DIR = path.join(".zentara", "history");

/** Catat isi file sebelum diubah AI, supaya `zentara undo` bisa mengembalikannya. */
export class Journal {
  private readonly data: JournalFile;
  private readonly file: string;
  private readonly seen = new Set<string>();

  constructor(private readonly root: string, task: string, now = new Date()) {
    this.data = { task, createdAt: now.toISOString(), entries: [] };
    const stamp = now.toISOString().replace(/[:.]/g, "-");
    this.file = path.join(root, HISTORY_DIR, `${stamp}-${process.pid}.json`);
  }

  /** Panggil sebelum mengubah/menghapus file. Hanya keadaan pertama per file yang disimpan. */
  record(relativePath: string): void {
    if (this.seen.has(relativePath)) return;
    this.seen.add(relativePath);
    const abs = path.join(this.root, relativePath);
    const before = fs.existsSync(abs) ? fs.readFileSync(abs, "utf8") : null;
    this.data.entries.push({ path: relativePath, before });
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }

  /**
   * Catat file yang diubah proses lain (mis. drizzle-kit) dengan isi sebelumnya yang sudah difoto
   * lebih dulu; `null` berarti file itu baru dibuat.
   */
  recordExternal(relativePath: string, before: string | null): void {
    if (this.seen.has(relativePath)) return;
    this.seen.add(relativePath);
    this.data.entries.push({ path: relativePath, before });
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.data, null, 2));
  }

  get changedFiles(): string[] {
    return this.data.entries.map((e) => e.path);
  }
}

export interface UndoPreview {
  file: string;
  task: string;
  createdAt: string;
  entries: { path: string; action: "restore" | "delete" }[];
}

export function latestJournal(root: string): UndoPreview | undefined {
  const dir = path.join(root, HISTORY_DIR);
  if (!fs.existsSync(dir)) return undefined;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  const last = files.at(-1);
  if (!last) return undefined;
  const file = path.join(dir, last);
  const data = JSON.parse(fs.readFileSync(file, "utf8")) as JournalFile;
  return {
    file,
    task: data.task,
    createdAt: data.createdAt,
    entries: data.entries.map((e) => ({ path: e.path, action: e.before === null ? "delete" : "restore" })),
  };
}

/** Kembalikan semua file dari jurnal terakhir, lalu hapus jurnalnya. */
export function undoLatest(root: string): UndoPreview | undefined {
  const preview = latestJournal(root);
  if (!preview) return undefined;
  const data = JSON.parse(fs.readFileSync(preview.file, "utf8")) as JournalFile;
  const rootAbs = path.resolve(root);
  for (const entry of [...data.entries].reverse()) {
    const abs = path.resolve(rootAbs, entry.path);
    if (!abs.startsWith(rootAbs + path.sep)) continue; // jurnal dimodifikasi manual: jangan keluar dari proyek
    if (entry.before === null) fs.rmSync(abs, { force: true });
    else {
      fs.mkdirSync(path.dirname(abs), { recursive: true });
      fs.writeFileSync(abs, entry.before);
    }
  }
  fs.rmSync(preview.file);
  return preview;
}
