import { eq } from "drizzle-orm";
import { flash, HttpError, redirect, type ZenContext } from "zentara";
import { db } from "../../../db/index.js";
import { notes, type User } from "../../../db/schema.js";
import { requireUserPage } from "../../../lib/auth.js";
import { findNote } from "../../../lib/notes.js";

export const middleware = [requireUserPage];

// POST /notes/1/delete (tombol "Hapus catatan" di halaman ubah)
export async function POST(ctx: ZenContext) {
  const note = await findNote((ctx.state.user as User).id, ctx.params.id);
  if (!note) throw new HttpError(404, "Catatan tidak ditemukan");
  await db.delete(notes).where(eq(notes.id, note.id));
  flash(ctx, "Catatan dihapus.");
  return redirect("/notes", 303);
}
