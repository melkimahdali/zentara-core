import { and, count, eq, gte } from "drizzle-orm";
import { h, type ZenContext } from "zentara";
import { Button, Card, EmptyState, List, Split, Stat, StatGroup } from "zentara/ui";
import { db } from "../db/index.js";
import { notes, users, type User } from "../db/schema.js";
import { requireUserPage } from "../lib/auth.js";
import { listNotes } from "../lib/notes.js";
import { appPage, excerpt, relativeDate, today } from "../lib/ui.js";

export const middleware = [requireUserPage];

/** Contoh permintaan untuk Zentara AI: aplikasi ini boleh menjadi apa saja. */
const IDEAS = [
  "buatkan halaman jadwal booking untuk user yang login",
  "tambahkan blog dengan artikel, kategori, dan halaman publik",
  "buatkan API inventori barang dengan validasi",
];

export async function GET(ctx: ZenContext) {
  const user = ctx.state.user as User;
  const isAdmin = user.role === "admin";
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [[mine], [thisWeek], [people], latest] = await Promise.all([
    db.select({ total: count() }).from(notes).where(eq(notes.userId, user.id)),
    db.select({ total: count() }).from(notes).where(and(eq(notes.userId, user.id), gte(notes.updatedAt, weekAgo))),
    db.select({ total: count() }).from(users),
    listNotes(user.id, { limit: 5 }),
  ]);
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" });

  return appPage(
    ctx,
    {
      title: "Dasbor",
      subtitle: `Halo, ${user.name.split(" ")[0]}. Hari ini ${today()}.`,
      active: "/dashboard",
      actions: h(Button, { href: "/notes?new=1", variant: "secondary" }, "Tulis catatan"),
    },
    h(
      StatGroup,
      null,
      h(Stat, { label: "Catatan", value: mine?.total ?? 0, hint: "milik Anda" }),
      h(Stat, { label: "Minggu ini", value: thisWeek?.total ?? 0, hint: "catatan dibuat atau diubah" }),
      isAdmin ? h(Stat, { label: "Pengguna", value: people?.total ?? 0, hint: "akun terdaftar" }) : null,
    ),
    h(
      Split,
      null,
      h(
        Card,
        { title: "Catatan terbaru", actions: h("a", { class: "zu-link", href: "/notes" }, "Semua catatan") },
        latest.length
          ? h(List, {
              items: latest.map((n) => [
                h("span", null, h("a", { href: `/notes/${n.id}` }, n.title), n.body ? h("small", { class: "zu-muted zu-block" }, excerpt(n.body, 70)) : null),
                h("span", { class: "zu-muted" }, relativeDate(n.updatedAt)),
              ]),
            })
          : h(EmptyState, { title: "Belum ada catatan", text: "Catatan yang Anda tulis akan muncul di sini.", action: h(Button, { href: "/notes?new=1", small: true }, "Tulis catatan") }),
      ),
      h(
        "div",
        { class: "zu-stack" },
        h(
          Card,
          { title: "Akun Anda" },
          h(List, {
            items: [
              [h("span", { class: "zu-muted" }, "Email"), user.email],
              [h("span", { class: "zu-muted" }, "Peran"), isAdmin ? "Admin" : "Pengguna"],
              [h("span", { class: "zu-muted" }, "Bergabung"), date.format(user.createdAt)],
            ],
          }),
        ),
        isAdmin
          ? h(
              Card,
              { title: "Bangun apa saja" },
              h("p", { class: "zu-muted" }, "Aplikasi ini titik awal, bukan batas. Jalankan ", h("code", null, "npx zentara"), " di terminal, lalu minta misalnya:"),
              h("ul", { class: "zu-bullets" }, IDEAS.map((idea) => h("li", null, `“${idea}”`))),
            )
          : null,
      ),
    ),
  );
}
