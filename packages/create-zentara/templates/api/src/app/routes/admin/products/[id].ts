import { eq } from "drizzle-orm";
import { z } from "zod";
import { h, html, HttpError, readInput, redirect, tryParse, type ZenContext } from "zentara";
import { Button, Card, Field, Form, FormActions, FormRow, PostButton } from "zentara/ui";
import { db } from "../../../db/index.js";
import { products, type Product } from "../../../db/schema.js";
import { requireAdminPage } from "../../../lib/auth.js";
import { appPage } from "../../../lib/ui.js";
import { ProductForm } from "./index.js";

export const middleware = [requireAdminPage];

async function findOr404(ctx: ZenContext): Promise<Product> {
  const id = z.coerce.number().int().positive().safeParse(ctx.params.id);
  const product = id.success ? await db.query.products.findFirst({ where: eq(products.id, id.data) }) : undefined;
  if (!product) throw new HttpError(404, "Produk tidak ditemukan");
  return product;
}

function view(ctx: ZenContext, product: Product, form: { values?: Record<string, unknown>; errors?: Record<string, string> } = {}): string {
  const v = form.values ?? product;
  const e = form.errors ?? {};
  const str = (x: unknown) => (typeof x === "string" || typeof x === "number" ? x : undefined);
  return appPage(
    ctx,
    { title: product.name, subtitle: "Ubah nama, harga, atau stok.", active: "/admin/products", actions: h(Button, { href: "/admin/products", variant: "secondary" }, "Kembali ke daftar") },
    h(
      Card,
      null,
      h(
        Form,
        { action: `/admin/products/${product.id}` },
        h(
          FormRow,
          null,
          h(Field, { name: "name", label: "Nama", value: str(v.name), error: e.name, required: true }),
          h(Field, { name: "price", label: "Harga (Rp)", type: "number", inputmode: "numeric", min: 0, step: 1, value: str(v.price), error: e.price, required: true }),
          h(Field, { name: "stock", label: "Stok", type: "number", inputmode: "numeric", min: 0, step: 1, value: str(v.stock), error: e.stock }),
        ),
        h(FormActions, null, h(Button, { loading: "Menyimpan…" }, "Simpan perubahan"), h("a", { class: "zu-link", href: "/admin/products" }, "Batal")),
      ),
    ),
    h(
      Card,
      { title: "Hapus produk" },
      h("div", { class: "zu-row" }, h("p", { class: "zu-muted zu-spacer" }, "Produk hilang dari daftar, dasbor, dan API. Tindakan ini tidak bisa dibatalkan."), h(PostButton, { action: `/admin/products/${product.id}/hapus`, confirm: `Hapus ${product.name}? Tindakan ini tidak bisa dibatalkan.` }, "Hapus produk")),
    ),
  );
}

export async function GET(ctx: ZenContext) {
  return view(ctx, await findOr404(ctx));
}

export async function POST(ctx: ZenContext) {
  const product = await findOr404(ctx);
  const raw = (await readInput(ctx)) as Record<string, unknown>;
  const input = await tryParse(ProductForm, raw);
  if (!input.ok) return html(view(ctx, product, { values: raw, errors: input.errors }), { status: 422 });
  await db.update(products).set(input.data).where(eq(products.id, product.id));
  return redirect("/admin/products?pesan=diubah", 303);
}
