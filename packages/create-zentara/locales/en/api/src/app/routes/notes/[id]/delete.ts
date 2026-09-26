import { eq } from "drizzle-orm";
import { flash, HttpError, redirect, type ZenContext } from "zentara";
import { db } from "../../../db/index.js";
import { notes, type User } from "../../../db/schema.js";
import { requireUserPage } from "../../../lib/auth.js";
import { findNote } from "../../../lib/notes.js";

export const middleware = [requireUserPage];

// POST /notes/1/delete (the "Delete note" button on the edit page)
export async function POST(ctx: ZenContext) {
  const note = await findNote((ctx.state.user as User).id, ctx.params.id);
  if (!note) throw new HttpError(404, "Note not found");
  await db.delete(notes).where(eq(notes.id, note.id));
  flash(ctx, "Note deleted.");
  return redirect("/notes", 303);
}
