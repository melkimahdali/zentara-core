import { eq } from "drizzle-orm";
import { h, html, HttpError, readInput, redirect, tryParse, type ZenContext } from "zentara";
import { Button, Card, Field, Form, FormActions, PostButton } from "zentara/ui";
import { db } from "../../db/index.js";
import { notes, type Note, type User } from "../../db/schema.js";
import { requireUserPage } from "../../lib/auth.js";
import { findNote, NoteInput } from "../../lib/notes.js";
import { appPage, relativeDate } from "../../lib/ui.js";

export const middleware = [requireUserPage];

async function findOr404(ctx: ZenContext): Promise<Note> {
  const note = await findNote((ctx.state.user as User).id, ctx.params.id);
  if (!note) throw new HttpError(404, "Note not found");
  return note;
}

function view(ctx: ZenContext, note: Note, form: { values?: Record<string, unknown>; errors?: Record<string, string> } = {}): string {
  const v = form.values ?? note;
  const e = form.errors ?? {};
  const str = (x: unknown) => (typeof x === "string" ? x : undefined);
  return appPage(
    ctx,
    { title: note.title, subtitle: `Updated ${relativeDate(note.updatedAt)}.`, active: "/notes", actions: h(Button, { href: "/notes", variant: "secondary" }, "Back to the list") },
    h(
      Card,
      null,
      h(
        Form,
        { action: `/notes/${note.id}` },
        h(Field, { name: "title", label: "Title", value: str(v.title), error: e.title, maxlength: 200, required: true }),
        h(Field, { name: "body", label: "Body", type: "textarea", rows: 10, value: str(v.body), error: e.body }),
        h(FormActions, null, h(Button, { loading: "Saving…" }, "Save changes"), h("a", { class: "zu-link", href: "/notes" }, "Cancel")),
      ),
    ),
    h(
      Card,
      { title: "Delete note" },
      h("div", { class: "zu-row" }, h("p", { class: "zu-muted zu-spacer" }, "The note disappears from the list and the API. This cannot be undone."), h(PostButton, { action: `/notes/${note.id}/delete`, confirm: `Delete “${note.title}”? This cannot be undone.` }, "Delete note")),
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
  return redirect("/notes?msg=updated", 303);
}
