import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import type { ZenContext } from "../core/context.js";
import { HttpError } from "../core/errors.js";
import { t } from "../i18n/index.js";
import { parseBytes } from "./duration.js";

/**
 * Unggah file dari formulir `multipart/form-data`:
 *
 *   export async function POST(ctx: ZenContext) {
 *     const form = await readForm(ctx, { maxBytes: "10mb" });
 *     const photo = form.get("photo");
 *     if (!(photo instanceof File)) throw new HttpError(422, "Pilih foto");
 *     const saved = await saveUpload(photo, { types: ["image/*"], maxBytes: "5mb" });
 *     return { url: saved.url };
 *   }
 *
 * Formulir HTML: `<form method="post" enctype="multipart/form-data">` dengan `<input type="file" name="photo">`.
 */

export interface ReadFormOptions {
  /** Batas ukuran seluruh body, mis. "10mb". Default: `bodyLimit` di config (1 MB). */
  maxBytes?: number | string;
}

/** Baca body formulir (multipart/form-data, urlencoded, atau JSON) sebagai FormData standar Web. */
export async function readForm(ctx: ZenContext, options: ReadFormOptions = {}): Promise<FormData> {
  const type = String(ctx.req.headers["content-type"] ?? "");
  const body = await ctx.body(options.maxBytes === undefined ? undefined : { limit: parseBytes(options.maxBytes) });
  if (/^application\/json/i.test(type)) {
    const form = new FormData();
    const data = body.length ? (JSON.parse(body.toString("utf8")) as Record<string, unknown>) : {};
    for (const [k, v] of Object.entries(data ?? {})) if (v !== undefined && v !== null) form.append(k, typeof v === "string" ? v : JSON.stringify(v));
    return form;
  }
  try {
    return await new Request("http://zusantara.local/", { method: "POST", headers: { "content-type": type }, body: new Uint8Array(body) }).formData();
  } catch (cause) {
    throw new HttpError(400, t().backend.uploadBadForm, { cause });
  }
}

/** Ekstensi yang tidak pernah disimpan: bisa dijalankan browser/server (XSS, eksekusi kode). */
const BLOCKED_EXTENSIONS = new Set(["html", "htm", "xhtml", "shtml", "svg", "svgz", "xml", "js", "mjs", "cjs", "php", "phtml", "asp", "aspx", "jsp", "cgi", "pl", "py", "rb", "sh", "bat", "cmd", "exe", "dll", "msi", "com", "scr", "jar", "hta", "swf"]);

/** Tanda awal file (magic bytes) untuk tipe umum: tipe yang diakui file harus cocok dengan isinya. */
const SIGNATURES: Record<string, (b: Uint8Array) => boolean> = {
  "image/png": (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/gif": (b) => b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  "image/webp": (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  "application/pdf": (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46,
  "application/zip": (b) => b[0] === 0x50 && b[1] === 0x4b,
};

const EXTENSION_TYPES: Record<string, string> = {
  png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp", avif: "image/avif",
  pdf: "application/pdf", txt: "text/plain", csv: "text/csv", json: "application/json", zip: "application/zip",
  mp3: "audio/mpeg", mp4: "video/mp4", webm: "video/webm", doc: "application/msword", xls: "application/vnd.ms-excel",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export interface SaveUploadOptions {
  /** Folder tujuan (relatif ke folder proyek). Default "public/uploads": bisa diakses di /uploads/<nama>. */
  dir?: string;
  /** Batas ukuran file, mis. "5mb". Default 10 MB. */
  maxBytes?: number | string;
  /**
   * Tipe yang diizinkan: MIME ("image/png", "image/*") atau ekstensi (".pdf"). Default: gambar umum,
   * PDF, teks, dan dokumen Office.
   */
  types?: string[];
}

export interface SavedUpload {
  /** Nama file yang disimpan (acak, tidak memakai nama asli). */
  name: string;
  /** Nama asli dari pengguna (hanya untuk ditampilkan; jangan dipakai sebagai path). */
  originalName: string;
  path: string;
  size: number;
  type: string;
  /** URL publik bila disimpan di bawah public/, mis. "/uploads/abc.png". */
  url?: string;
}

const DEFAULT_TYPES = ["image/png", "image/jpeg", "image/gif", "image/webp", "image/avif", "application/pdf", "text/plain", "text/csv", ".docx", ".xlsx", ".doc", ".xls"];

function allowed(types: string[], mime: string, ext: string): boolean {
  return types.some((rule) => {
    const r = rule.toLowerCase();
    if (r.startsWith(".")) return r.slice(1) === ext;
    if (r.endsWith("/*")) return mime.startsWith(r.slice(0, -1));
    return r === mime;
  });
}

/** Simpan file unggahan dengan nama acak setelah memeriksa ukuran, ekstensi, tipe, dan isi file. */
export async function saveUpload(file: File, options: SaveUploadOptions = {}): Promise<SavedUpload> {
  const m = t().backend;
  const maxBytes = parseBytes(options.maxBytes ?? "10mb");
  if (file.size === 0) throw new HttpError(422, m.uploadEmpty);
  if (file.size > maxBytes) throw new HttpError(413, m.uploadTooLarge(Math.round(maxBytes / 1024 / 1024 * 10) / 10));

  const originalName = path.basename(file.name || "file").slice(0, 200);
  const ext = (/\.([A-Za-z0-9]{1,10})$/.exec(originalName)?.[1] ?? "").toLowerCase();
  if (!ext || BLOCKED_EXTENSIONS.has(ext)) throw new HttpError(422, m.uploadTypeNotAllowed(ext || "?"));
  // Tipe diambil dari ekstensi (bukan dari klaim browser), lalu isinya diperiksa bila tanda filenya dikenal.
  const type = EXTENSION_TYPES[ext] ?? (file.type && !/html|xml|javascript|svg/i.test(file.type) ? file.type.toLowerCase() : "application/octet-stream");
  if (!allowed(options.types ?? DEFAULT_TYPES, type, ext)) throw new HttpError(422, m.uploadTypeNotAllowed(ext));
  const bytes = new Uint8Array(await file.arrayBuffer());
  const signature = SIGNATURES[type];
  if (signature && !signature(bytes)) throw new HttpError(422, m.uploadContentMismatch(ext));

  const dir = path.resolve(options.dir ?? path.join("public", "uploads"));
  await fs.mkdir(dir, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  const target = path.join(dir, name);
  await fs.writeFile(target, bytes, { flag: "wx" });

  const publicDir = path.resolve("public");
  const url = dir === publicDir || dir.startsWith(publicDir + path.sep) ? "/" + path.relative(publicDir, target).split(path.sep).join("/") : undefined;
  return { name, originalName, path: target, size: bytes.length, type, url };
}
