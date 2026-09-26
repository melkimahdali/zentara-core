import { flash, h, html, readInput, redirect, takeFlash, tryParse, type ZenContext } from "zusantara";
import { Button, Card, Disclosure, EmptyState, Field, Form, FormActions, Search, Table, Toast } from "zusantara/ui";
import { db } from "../../db/index.js";
import { notes, type User } from "../../db/schema.js";
import { requireUserPage } from "../../lib/auth.js";
import { listNotes, NoteInput } from "../../lib/notes.js";
import { appPage, excerpt, relativeDate } from "../../lib/ui.js";

export const middleware = [requireUserPage];

type FormState = { values?: Record<string, unknown>; errors?: Record<string, string> };

async function view(ctx: ZenContext, form: FormState = {}): Promise<string> {
  const user = ctx.state.user as User;
  const q = typeof ctx.query.q === "string" ? ctx.query.q.trim().slice(0, 100) : "";
  const rows = await listNotes(user.id, { q });
  const v = form.values ?? {};
  const e = form.errors ?? {};
  const str = (x: unknown) => (typeof x === "string" ? x : undefined);
  const openForm = Boolean(form.errors) || ctx.query.new === "1";

  return appPage(
    ctx,
    { title: "Catatan", subtitle: q ? `${rows.length} hasil untuk “${q}”` : `${rows.length} catatan, hanya terlihat oleh Anda`, active: "/notes" },
    h(Toast, { flash: takeFlash(ctx) }),
    h(
      Disclosure,
      { summary: "Tulis catatan", open: openForm },
      h(
        Form,
        { action: "/notes" },
        h(Field, { name: "title", label: "Judul", value: str(v.title), error: e.title, maxlength: 200, placeholder: "Rapat mingguan", required: true, autofocus: openForm }),
        h(Field, { name: "body", label: "Isi", type: "textarea", rows: 5, value: str(v.body), error: e.body, placeholder: "Tulis apa saja…" }),
        h(FormActions, null, h(Button, { loading: "Menyimpan…" }, "Simpan catatan")),
      ),
    ),
    h(
      Card,
      { title: "Semua catatan", flush: true, actions: h(Search, { action: "/notes", value: q || undefined, label: "Cari catatan", placeholder: "Cari judul atau isi…" }) },
      h(Table, {
        columns: [{ label: "Judul" }, { label: "Cuplikan" }, { label: "Diubah", align: "end" }],
        rows: rows.map((n) => [
          h("a", { href: `/notes/${n.id}` }, n.title),
          h("span", { class: "zu-muted" }, excerpt(n.body) || "Tanpa isi"),
          relativeDate(n.updatedAt),
        ]),
        empty: q
          ? h(EmptyState, { title: `Tidak ada catatan yang cocok dengan “${q}”`, text: "Coba kata lain, atau lihat semua catatan.", action: h("a", { class: "zu-link", href: "/notes" }, "Lihat semua catatan") })
          : h(EmptyState, { title: "Belum ada catatan", text: "Tulis catatan pertama lewat formulir di atas. Catatan juga tersedia lewat API /api/notes." }),
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
  flash(ctx, "Catatan disimpan.");
  return redirect("/notes", 303);
}
