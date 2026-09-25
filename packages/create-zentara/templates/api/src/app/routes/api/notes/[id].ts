import { and, eq } from "drizzle-orm";
import { HttpError, validate, type ZenContext } from "zentara";
import { db } from "../../../db/index.js";
import { notes, type User } from "../../../db/schema.js";
import { requireUser } from "../../../lib/auth.js";
import { findNote, NoteFields } from "../../../lib/notes.js";

export const middleware = [requireUser];

async function findOr404(ctx: ZenContext) {
  const note = await findNote((ctx.state.user as User).id, ctx.params.id);
  if (!note) throw new HttpError(404, "Catatan tidak ditemukan");
  return note;
}

// GET /api/notes/1
export const GET = (ctx: ZenContext) => findOr404(ctx);

// PUT /api/notes/1 (boleh sebagian field)
export const PUT = validate({ body: NoteFields.partial() }, async (ctx, { body }) => {
  const note = await findOr404(ctx);
  if (Object.keys(body).length === 0) throw new HttpError(400, "Tidak ada field yang diubah");
  const [updated] = await db.update(notes).set(body).where(eq(notes.id, note.id)).returning();
  return updated;
});

// DELETE /api/notes/1
export async function DELETE(ctx: ZenContext) {
  const note = await findOr404(ctx);
  await db.delete(notes).where(and(eq(notes.id, note.id), eq(notes.userId, note.userId)));
}
