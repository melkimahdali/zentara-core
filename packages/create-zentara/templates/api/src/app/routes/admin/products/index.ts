import { desc } from "drizzle-orm";
import { z } from "zod";
import { h, html, readInput, redirect, tryParse, type ZenContext } from "zentara";
import { Alert, Badge, Button, Card, Field, Form, FormRow, rupiah, Table } from "zentara/ui";
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

async function view(ctx: ZenContext, form: { values?: Record<string, unknown>; errors?: Record<string, string> } = {}): Promise<string> {
  const rows = await db.select().from(products).orderBy(desc(products.id));
  const message = flash(ctx, MESSAGES);
  const v = form.values ?? {};
  const e = form.errors ?? {};
  const str = (x: unknown) => (typeof x === "string" || typeof x === "number" ? x : undefined);
  return appPage(
    ctx,
    { title: "Produk", subtitle: `${rows.length} produk`, active: "/admin/products" },
    message ? h(Alert, { tone: "success" }, message) : null,
    h(
      Card,
      { title: "Tambah produk" },
      h(
        Form,
        { action: "/admin/products" },
        h(
          FormRow,
          null,
          h(Field, { name: "name", label: "Nama", value: str(v.name), error: e.name, required: true }),
          h(Field, { name: "price", label: "Harga (Rp)", type: "number", min: 0, step: 1, value: str(v.price), error: e.price, required: true }),
          h(Field, { name: "stock", label: "Stok", type: "number", min: 0, step: 1, value: str(v.stock) ?? 0, error: e.stock }),
        ),
        h("div", null, h(Button, null, "Simpan produk")),
      ),
    ),
    h(
      Card,
      { title: "Semua produk", flush: true },
      h(Table, {
        columns: [{ label: "Nama" }, { label: "Harga", align: "num" }, { label: "Stok", align: "num" }, { label: "" }],
        rows: rows.map((p) => [
          p.name,
          rupiah(p.price),
          p.stock > 0 ? String(p.stock) : h(Badge, { tone: "danger" }, "Habis"),
          h(Button, { href: `/admin/products/${p.id}`, variant: "secondary", small: true }, "Ubah"),
        ]),
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
