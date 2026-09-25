import { desc } from "drizzle-orm";
import { h, type ZenContext } from "zentara";
import { Badge, Card, Table } from "zentara/ui";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { requireAdminPage } from "../../lib/auth.js";
import { appPage } from "../../lib/ui.js";

export const middleware = [requireAdminPage];

export async function GET(ctx: ZenContext) {
  const rows = await db.select().from(users).orderBy(desc(users.id));
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" });
  return appPage(
    ctx,
    { title: "Pengguna", subtitle: `${rows.length} akun terdaftar`, active: "/admin/users" },
    h(
      Card,
      { flush: true },
      h(Table, {
        columns: [{ label: "Nama" }, { label: "Email" }, { label: "Peran" }, { label: "Bergabung" }],
        rows: rows.map((u) => [u.name, u.email, h(Badge, { tone: u.role === "admin" ? "gold" : undefined }, u.role === "admin" ? "Admin" : "Pengguna"), date.format(u.createdAt)]),
      }),
    ),
  );
}
