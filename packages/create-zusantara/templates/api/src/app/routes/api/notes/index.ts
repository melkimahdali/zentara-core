import { z } from "zod";
import { json, validate, type ZenContext } from "zusantara";
import { db } from "../../../db/index.js";
import { notes, type User } from "../../../db/schema.js";
import { requireUser } from "../../../lib/auth.js";
import { listNotes, NoteInput } from "../../../lib/notes.js";

// Semua endpoint catatan butuh login; setiap user hanya melihat catatannya sendiri.
export const middleware = [requireUser];

const userOf = (ctx: ZenContext) => ctx.state.user as User;

// GET /api/notes?q=kata
export const GET = validate({ query: z.object({ q: z.string().trim().max(100).optional() }) }, (ctx, { query }) =>
  listNotes(userOf(ctx).id, { q: query.q }),
);

// POST /api/notes  { "title": "...", "body": "..." }
export const POST = validate({ body: NoteInput }, async (ctx, { body }) => {
  const [created] = await db
    .insert(notes)
    .values({ ...body, userId: userOf(ctx).id })
    .returning();
  return json(created, { status: 201 });
});
