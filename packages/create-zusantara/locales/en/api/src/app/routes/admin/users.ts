import { desc } from "drizzle-orm";
import { h, type ZenContext } from "zusantara";
import { Avatar, Badge, Card, Table } from "zusantara/ui";
import { db } from "../../db/index.js";
import { users } from "../../db/schema.js";
import { requireAdminPage } from "../../lib/auth.js";
import { appPage } from "../../lib/ui.js";

export const middleware = [requireAdminPage];

export async function GET(ctx: ZenContext) {
  const rows = await db.select().from(users).orderBy(desc(users.id));
  const admins = rows.filter((u) => u.role === "admin").length;
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "medium" });
  return appPage(
    ctx,
    { title: "Users", subtitle: `Accounts: ${rows.length} · admins: ${admins}`, active: "/admin/users" },
    h(
      Card,
      { flush: true },
      h(Table, {
        columns: [{ label: "Name" }, { label: "Email" }, { label: "Role" }, { label: "Joined", align: "num" }],
        rows: rows.map((u) => [
          h("span", { class: "zu-cell-user" }, h(Avatar, { name: u.name }), u.name),
          u.email,
          u.role === "admin" ? h(Badge, { tone: "accent" }, "Admin") : h(Badge, null, "User"),
          date.format(u.createdAt),
        ]),
      }),
    ),
  );
}
