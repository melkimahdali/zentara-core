import { eq } from "drizzle-orm";
import { z } from "zod";
import { HttpError, redirect, type ZenContext } from "zentara";
import { db } from "../../../../db/index.js";
import { products } from "../../../../db/schema.js";
import { requireAdminPage } from "../../../../lib/auth.js";

export const middleware = [requireAdminPage];

// POST /admin/products/1/hapus (tombol "Hapus" di halaman ubah produk)
export async function POST(ctx: ZenContext) {
  const id = z.coerce.number().int().positive().safeParse(ctx.params.id);
  if (!id.success) throw new HttpError(404, "Produk tidak ditemukan");
  const deleted = await db.delete(products).where(eq(products.id, id.data)).returning({ id: products.id });
  if (deleted.length === 0) throw new HttpError(404, "Produk tidak ditemukan");
  return redirect("/admin/products?pesan=dihapus", 303);
}
