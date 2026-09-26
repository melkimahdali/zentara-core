import { eq } from "drizzle-orm";
import { flash, h, html, HttpError, readInput, redirect, tryParse, type ZenContext } from "zusantara";
import { Button, Card, Field, Form, FormActions, PostButton } from "zusantara/ui";
import { db } from "../../db/index.js";
import { notes, type Note, type User } from "../../db/schema.js";
import { requireUserPage } from "../../lib/auth.js";
import { findNote, NoteInput } from "../../lib/notes.js";
import { appPage, relativeDate } from "../../lib/ui.js";

export const middleware = [requireUserPage];

async function findOr404(ctx: ZenContext): Promise<Note> {
  const note = await findNote((ctx.state.user as User).id, ctx.params.id);
  if (!note) throw new HttpError(404, "Catatan tidak ditemukan");
  return note;
}

function view(ctx: ZenContext, note: Note, form: { values?: Record<string, unknown>; errors?: Record<string, string> } = {}): string {
  const v = form.values ?? note;
  const e = form.errors ?? {};
  const str = (x: unknown) => (typeof x === "string" ? x : undefined);
  return appPage(
    ctx,
    { title: note.title, subtitle: `Diubah ${relativeDate(note.updatedAt)}.`, active: "/notes", actions: h(Button, { href: "/notes", variant: "secondary" }, "Kembali ke daftar") },
    h(
      Card,
      null,
      h(
        Form,
        { action: `/notes/${note.id}` },
        h(Field, { name: "title", label: "Judul", value: str(v.title), error: e.title, maxlength: 200, required: true }),
        h(Field, { name: "body", label: "Isi", type: "textarea", rows: 10, value: str(v.body), error: e.body }),
        h(FormActions, null, h(Button, { loading: "Menyimpan…" }, "Simpan perubahan"), h("a", { class: "zu-link", href: "/notes" }, "Batal")),
      ),
    ),
    h(
      Card,
      { title: "Hapus catatan" },
      h("div", { class: "zu-row" }, h("p", { class: "zu-muted zu-spacer" }, "Catatan hilang dari daftar dan API. Tindakan ini tidak bisa dibatalkan."), h(PostButton, { action: `/notes/${note.id}/delete`, confirm: `Hapus “${note.title}”? Tindakan ini tidak bisa dibatalkan.` }, "Hapus catatan")),
    ),
  );
}

export async function GET(ctx: ZenContext) {
  return view(ctx, await findOr404(ctx));
}

export async function POST(ctx: ZenContext) {
  const note = await findOr404(ctx);
  const raw = (await readInput(ctx)) as Record<string, unknown>;
  const input = await tryParse(NoteInput, raw);
  if (!input.ok) return html(view(ctx, note, { values: raw, errors: input.errors }), { status: 422 });
  await db.update(notes).set(input.data).where(eq(notes.id, note.id));
  flash(ctx, "Perubahan disimpan.");
  return redirect("/notes", 303);
}
