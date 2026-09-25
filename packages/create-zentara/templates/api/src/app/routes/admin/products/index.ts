import { desc, sql } from "drizzle-orm";
import { z } from "zod";
import { h, html, readInput, redirect, tryParse, type ZenContext } from "zentara";
import { Alert, Badge, Button, Card, Disclosure, EmptyState, Field, Form, FormActions, FormRow, rupiah, Search, Table } from "zentara/ui";
import { db } from "../../../db/index.js";
import { products } from "../../../db/schema.js";
import { requireAdminPage } from "../../../lib/auth.js";
import { appPage, flash } from "../../../lib/ui.js";

export const middleware = [requireAdminPage];

/** Input formulir produk (nilai dari form HTML selalu string, jadi angka di-coerce). */
export const ProductForm = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(200),
  price: z.coerce.number({ error: "Harga harus angka" }).int("Harga harus bilangan bulat").nonnegative("Harga tidak boleh negatif"),
  stock: z.coerce.number({ error: "Stok harus angka" }).int("Stok harus bilangan bulat").nonnegative("Stok tidak boleh negatif"),
});

const MESSAGES: Record<string, string> = { dibuat: "Produk ditambahkan.", diubah: "Perubahan disimpan.", dihapus: "Produk dihapus." };

/** Label stok: habis, menipis (10 atau kurang), atau jumlahnya. */
export function stockCell(stock: number) {
  if (stock === 0) return h(Badge, { tone: "danger" }, "Habis");
  if (stock <= 10) return h(Badge, { tone: "warn" }, `${stock} tersisa`);
  return stock.toLocaleString("id-ID");
}

async function view(ctx: ZenContext, form: { values?: Record<string, unknown>; errors?: Record<string, string> } = {}): Promise<string> {
  const q = typeof ctx.query.q === "string" ? ctx.query.q.trim().slice(0, 100) : "";
  // Escape wildcard LIKE agar input seperti "%" dicari apa adanya.
  const pattern = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
  const rows = await db
    .select()
    .from(products)
    .where(q ? sql`${products.name} LIKE ${pattern} ESCAPE '\\'` : undefined)
    .orderBy(desc(products.id));
  const message = flash(ctx, MESSAGES);
  const v = form.values ?? {};
  const e = form.errors ?? {};
  const str = (x: unknown) => (typeof x === "string" || typeof x === "number" ? x : undefined);
  const openForm = Boolean(form.errors) || ctx.query.tambah === "1";

  return appPage(
    ctx,
    { title: "Produk", subtitle: q ? `${rows.length} hasil untuk “${q}”` : `${rows.length} produk`, active: "/admin/products" },
    message ? h(Alert, { tone: "success" }, message) : null,
    h(
      Disclosure,
      { summary: "Tambah produk", open: openForm },
      h(
        Form,
        { action: "/admin/products" },
        h(
          FormRow,
          null,
          h(Field, { name: "name", label: "Nama", value: str(v.name), error: e.name, placeholder: "Kopi Toraja 250g", required: true, autofocus: openForm }),
          h(Field, { name: "price", label: "Harga (Rp)", type: "number", inputmode: "numeric", min: 0, step: 1, value: str(v.price), error: e.price, placeholder: "48000", required: true }),
          h(Field, { name: "stock", label: "Stok", type: "number", inputmode: "numeric", min: 0, step: 1, value: str(v.stock) ?? 0, error: e.stock }),
        ),
        h(FormActions, null, h(Button, { loading: "Menyimpan…" }, "Simpan produk")),
      ),
    ),
    h(
      Card,
      { title: "Semua produk", flush: true, actions: h(Search, { action: "/admin/products", value: q || undefined, label: "Cari produk", placeholder: "Cari nama produk…" }) },
      h(Table, {
        columns: [{ label: "Nama" }, { label: "Harga", align: "num" }, { label: "Stok", align: "num" }, { label: "Aksi", align: "end" }],
        rows: rows.map((p) => [
          h("a", { href: `/admin/products/${p.id}` }, p.name),
          rupiah(p.price),
          stockCell(p.stock),
          h("a", { class: "zu-link", href: `/admin/products/${p.id}`, "aria-label": `Ubah ${p.name}` }, "Ubah"),
        ]),
        empty: q
          ? h(EmptyState, { title: `Tidak ada produk yang cocok dengan “${q}”`, text: "Coba kata lain, atau lihat semua produk.", action: h("a", { class: "zu-link", href: "/admin/products" }, "Lihat semua produk") })
          : h(EmptyState, { title: "Belum ada produk", text: "Tambahkan produk pertama lewat formulir di atas. Produk langsung muncul di dasbor dan API /api/products." }),
      }),
    ),
  );
}

export const GET = (ctx: ZenContext) => view(ctx);

export async function POST(ctx: ZenContext) {
  const raw = (await readInput(ctx)) as Record<string, unknown>;
  const input = await tryParse(ProductForm, raw);
  if (!input.ok) return html(await view(ctx, { values: raw, errors: input.errors }), { status: 422 });
  await db.insert(products).values(input.data);
  return redirect("/admin/products?pesan=dibuat", 303);
}
