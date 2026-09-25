import { desc } from "drizzle-orm";
import { h, type ZenContext } from "zentara";
import { Avatar, Badge, Card, Table } from "zentara/ui";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { requireAdminPage } from "../../lib/auth.js";
import { appPage } from "../../lib/ui.js";

export const middleware = [requireAdminPage];

export async function GET(ctx: ZenContext) {
  const rows = await db.select().from(users).orderBy(desc(users.id));
  const admins = rows.filter((u) => u.role === "admin").length;
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
  return appPage(
    ctx,
    { title: "Pengguna", subtitle: `${rows.length} akun, ${admins} admin`, active: "/admin/users" },
    h(
      Card,
      { flush: true },
      h(Table, {
        columns: [{ label: "Nama" }, { label: "Email" }, { label: "Peran" }, { label: "Bergabung", align: "num" }],
        rows: rows.map((u) => [
          h("span", { class: "zu-cell-user" }, h(Avatar, { name: u.name }), u.name),
          u.email,
          u.role === "admin" ? h(Badge, { tone: "accent" }, "Admin") : h(Badge, null, "Pengguna"),
          date.format(u.createdAt),
        ]),
      }),
    ),
  );
}
