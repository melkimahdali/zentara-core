import { h, html, readInput, redirect, tryParse, type ZenContext } from "zentara";
import { Alert, Button, Card, Disclosure, EmptyState, Field, Form, FormActions, Search, Table } from "zentara/ui";
import { db } from "../../db/index.js";
import { notes, type User } from "../../db/schema.js";
import { requireUserPage } from "../../lib/auth.js";
import { listNotes, NoteInput } from "../../lib/notes.js";
import { appPage, excerpt, flash, relativeDate } from "../../lib/ui.js";

export const middleware = [requireUserPage];

const MESSAGES: Record<string, string> = { created: "Note saved.", updated: "Changes saved.", deleted: "Note deleted." };

type FormState = { values?: Record<string, unknown>; errors?: Record<string, string> };

async function view(ctx: ZenContext, form: FormState = {}): Promise<string> {
  const user = ctx.state.user as User;
  const q = typeof ctx.query.q === "string" ? ctx.query.q.trim().slice(0, 100) : "";
  const rows = await listNotes(user.id, { q });
  const message = flash(ctx, MESSAGES);
  const v = form.values ?? {};
  const e = form.errors ?? {};
  const str = (x: unknown) => (typeof x === "string" ? x : undefined);
  const openForm = Boolean(form.errors) || ctx.query.new === "1";

  return appPage(
    ctx,
    { title: "Notes", subtitle: q ? `Found ${rows.length} for “${q}”` : `Notes: ${rows.length} · visible only to you`, active: "/notes" },
    message ? h(Alert, { tone: "success" }, message) : null,
    h(
      Disclosure,
      { summary: "Write a note", open: openForm },
      h(
        Form,
        { action: "/notes" },
        h(Field, { name: "title", label: "Title", value: str(v.title), error: e.title, maxlength: 200, placeholder: "Weekly meeting", required: true, autofocus: openForm }),
        h(Field, { name: "body", label: "Body", type: "textarea", rows: 5, value: str(v.body), error: e.body, placeholder: "Write anything…" }),
        h(FormActions, null, h(Button, { loading: "Saving…" }, "Save note")),
      ),
    ),
    h(
      Card,
      { title: "All notes", flush: true, actions: h(Search, { action: "/notes", value: q || undefined, label: "Search notes", placeholder: "Search titles or bodies…" }) },
      h(Table, {
        columns: [{ label: "Title" }, { label: "Excerpt" }, { label: "Updated", align: "end" }],
        rows: rows.map((n) => [
          h("a", { href: `/notes/${n.id}` }, n.title),
          h("span", { class: "zu-muted" }, excerpt(n.body) || "No body"),
          relativeDate(n.updatedAt),
        ]),
        empty: q
          ? h(EmptyState, { title: `No notes match “${q}”`, text: "Try another word, or see all notes.", action: h("a", { class: "zu-link", href: "/notes" }, "See all notes") })
          : h(EmptyState, { title: "No notes yet", text: "Write your first note with the form above. Notes are also available through the /api/notes API." }),
      }),
    ),
  );
}

export const GET = (ctx: ZenContext) => view(ctx);

export async function POST(ctx: ZenContext) {
  const raw = (await readInput(ctx)) as Record<string, unknown>;
  const input = await tryParse(NoteInput, raw);
  if (!input.ok) return html(await view(ctx, { values: raw, errors: input.errors }), { status: 422 });
  await db.insert(notes).values({ ...input.data, userId: (ctx.state.user as User).id });
  return redirect("/notes?msg=created", 303);
}
