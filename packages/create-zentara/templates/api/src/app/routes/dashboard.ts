import { count, desc, sum } from "drizzle-orm";
import { h, type ZenContext } from "zentara";
import { Badge, Button, Card, Grid, rupiah, Stat, Table } from "zentara/ui";
import { db } from "../db/index.js";
import { products, users, type User } from "../db/schema.js";
import { requireUserPage } from "../lib/auth.js";
import { appPage } from "../lib/ui.js";

export const middleware = [requireUserPage];

export async function GET(ctx: ZenContext) {
  const user = ctx.state.user as User;
  const isAdmin = user.role === "admin";
  const [[totals], [people], latest] = await Promise.all([
    db.select({ items: count(), stock: sum(products.stock) }).from(products),
    db.select({ total: count() }).from(users),
    db.select().from(products).orderBy(desc(products.id)).limit(5),
  ]);

  return appPage(
    ctx,
    {
      title: `Halo, ${user.name.split(" ")[0]}`,
      subtitle: "Ringkasan aplikasi Anda hari ini.",
      active: "/dashboard",
      actions: isAdmin ? h(Button, { href: "/admin/products", variant: "secondary" }, "Kelola produk") : null,
    },
    h(
      Grid,
      null,
      h(Stat, { label: "Produk", value: totals?.items ?? 0, hint: "jumlah jenis produk" }),
      h(Stat, { label: "Total stok", value: Number(totals?.stock ?? 0).toLocaleString("id-ID"), hint: "unit di semua produk" }),
      isAdmin ? h(Stat, { label: "Pengguna", value: people?.total ?? 0, hint: "akun terdaftar" }) : h(Stat, { label: "Peran Anda", value: user.role === "admin" ? "Admin" : "Pengguna" }),
    ),
    h(
      Card,
      { title: "Produk terbaru", flush: true, actions: isAdmin ? h("a", { href: "/admin/products" }, "Lihat semua") : null },
      h(Table, {
        columns: [{ label: "Nama" }, { label: "Harga", align: "num" }, { label: "Stok", align: "num" }],
        rows: latest.map((p) => [p.name, rupiah(p.price), p.stock > 0 ? String(p.stock) : h(Badge, { tone: "danger" }, "Habis")]),
      }),
    ),
  );
}
