import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { notes, type Note } from "../db/schema.js";

/** Field catatan. Dipakai API JSON dan formulir HTML, jadi pesannya ramah pengguna. */
export const NoteFields = z.object({
  title: z.string().trim().min(1, "Judul wajib diisi").max(200, "Judul maksimal 200 karakter"),
  body: z.string().trim().max(10_000, "Isi maksimal 10.000 karakter"),
});

/** Untuk membuat catatan: isi boleh kosong. */
export const NoteInput = NoteFields.extend({ body: NoteFields.shape.body.default("") });

/** Catatan milik user, terbaru lebih dulu. `q` mencari di judul dan isi. */
export function listNotes(userId: number, options: { q?: string; limit?: number } = {}): Promise<Note[]> {
  const filters: SQL[] = [eq(notes.userId, userId)];
  if (options.q) {
    // Escape wildcard LIKE agar input seperti "%" dicari apa adanya.
    const pattern = `%${options.q.replace(/[%_\\]/g, "\\$&")}%`;
    filters.push(sql`(${notes.title} LIKE ${pattern} ESCAPE '\\' OR ${notes.body} LIKE ${pattern} ESCAPE '\\')`);
  }
  const query = db.select().from(notes).where(and(...filters)).orderBy(desc(notes.updatedAt), desc(notes.id));
  return options.limit ? query.limit(options.limit) : query;
}

/**
 * Satu catatan milik user. Catatan orang lain diperlakukan sama dengan yang tidak ada (`undefined`),
 * sehingga keberadaannya tidak bocor.
 */
export async function findNote(userId: number, id: unknown): Promise<Note | undefined> {
  const parsed = z.coerce.number().int().positive().safeParse(id);
  if (!parsed.success) return undefined;
  return db.query.notes.findFirst({ where: and(eq(notes.id, parsed.data), eq(notes.userId, userId)) });
}
