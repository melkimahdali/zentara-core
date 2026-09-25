import { asc, count, desc, lte, sum } from "drizzle-orm";
import { h, type ZenContext } from "zentara";
import { Badge, Button, Card, EmptyState, List, rupiah, Split, Stat, StatGroup, Table } from "zentara/ui";
import { db } from "../db/index.js";
import { products, users, type User } from "../db/schema.js";
import { requireUserPage } from "../lib/auth.js";
import { appPage, today } from "../lib/ui.js";

export const middleware = [requireUserPage];

/** Batas stok yang dianggap menipis. */
const LOW_STOCK = 10;

export async function GET(ctx: ZenContext) {
  const user = ctx.state.user as User;
  const isAdmin = user.role === "admin";
  const [[totals], [people], latest, low] = await Promise.all([
    db.select({ items: count(), stock: sum(products.stock) }).from(products),
    db.select({ total: count() }).from(users),
    db.select().from(products).orderBy(desc(products.id)).limit(6),
    db.select().from(products).where(lte(products.stock, LOW_STOCK)).orderBy(asc(products.stock)).limit(5),
  ]);
  const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" });

  const side = isAdmin
    ? h(
        Card,
        { title: "Stok menipis", actions: low.length ? h(Badge, { tone: "warn" }, String(low.length)) : null },
        low.length
          ? h(List, {
              items: low.map((p) => [
                h("a", { href: `/admin/products/${p.id}` }, p.name),
                h(Badge, { tone: p.stock === 0 ? "danger" : "warn" }, p.stock === 0 ? "Habis" : `${p.stock} tersisa`),
              ]),
            })
          : h(EmptyState, { title: "Stok aman", text: `Semua produk punya lebih dari ${LOW_STOCK} unit.` }),
      )
    : h(
        Card,
        { title: "Akun Anda" },
        h(List, {
          items: [
            [h("span", { class: "zu-muted" }, "Email"), user.email],
            [h("span", { class: "zu-muted" }, "Peran"), user.role === "admin" ? "Admin" : "Pengguna"],
            [h("span", { class: "zu-muted" }, "Bergabung"), date.format(user.createdAt)],
          ],
        }),
      );

  return appPage(
    ctx,
    {
      title: "Dasbor",
      subtitle: `Halo, ${user.name.split(" ")[0]}. Hari ini ${today()}.`,
      active: "/dashboard",
      actions: isAdmin ? h(Button, { href: "/admin/products?tambah=1", variant: "secondary" }, "Tambah produk") : null,
    },
    h(
      StatGroup,
      null,
      h(Stat, { label: "Produk", value: totals?.items ?? 0, hint: "jenis produk dijual" }),
      h(Stat, { label: "Total stok", value: Number(totals?.stock ?? 0).toLocaleString("id-ID"), hint: "unit di semua produk" }),
      h(Stat, { label: "Stok menipis", value: low.length, hint: `produk dengan ${LOW_STOCK} unit atau kurang` }),
      isAdmin ? h(Stat, { label: "Pengguna", value: people?.total ?? 0, hint: "akun terdaftar" }) : null,
    ),
    h(
      Split,
      null,
      h(
        Card,
        { title: "Produk terbaru", flush: true, actions: isAdmin ? h("a", { class: "zu-link", href: "/admin/products" }, "Semua produk") : null },
        h(Table, {
          columns: [{ label: "Nama" }, { label: "Harga", align: "num" }, { label: "Stok", align: "num" }],
          rows: latest.map((p) => [p.name, rupiah(p.price), p.stock > 0 ? p.stock.toLocaleString("id-ID") : h(Badge, { tone: "danger" }, "Habis")]),
          empty: h(EmptyState, {
            title: "Belum ada produk",
            text: isAdmin ? "Produk yang Anda tambahkan akan muncul di sini." : "Admin belum menambahkan produk.",
            action: isAdmin ? h(Button, { href: "/admin/products?tambah=1", small: true }, "Tambah produk") : null,
          }),
        }),
      ),
      side,
    ),
  );
}
