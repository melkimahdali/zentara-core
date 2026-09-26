import { and, desc, eq, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/index.js";
import { notes, type Note } from "../db/schema.js";

/** Note fields. Used by the JSON API and HTML forms, so the messages are user-friendly. */
export const NoteFields = z.object({
  title: z.string().trim().min(1, "Title is required").max(200, "Title must be at most 200 characters"),
  body: z.string().trim().max(10_000, "Body must be at most 10,000 characters"),
});

/** For creating a note: the body may be empty. */
export const NoteInput = NoteFields.extend({ body: NoteFields.shape.body.default("") });

/** A user's notes, newest first. `q` searches the title and body. */
export function listNotes(userId: number, options: { q?: string; limit?: number } = {}): Promise<Note[]> {
  const filters: SQL[] = [eq(notes.userId, userId)];
  if (options.q) {
    // Escape LIKE wildcards so input such as "%" is searched literally.
    const pattern = `%${options.q.replace(/[%_\\]/g, "\\$&")}%`;
    filters.push(sql`(${notes.title} LIKE ${pattern} ESCAPE '\\' OR ${notes.body} LIKE ${pattern} ESCAPE '\\')`);
  }
  const query = db.select().from(notes).where(and(...filters)).orderBy(desc(notes.updatedAt), desc(notes.id));
  return options.limit ? query.limit(options.limit) : query;
}

/**
 * One note owned by the user. Other people's notes are treated as missing (`undefined`),
 * so their existence does not leak.
 */
export async function findNote(userId: number, id: unknown): Promise<Note | undefined> {
  const parsed = z.coerce.number().int().positive().safeParse(id);
  if (!parsed.success) return undefined;
  return db.query.notes.findFirst({ where: and(eq(notes.id, parsed.data), eq(notes.userId, userId)) });
}
