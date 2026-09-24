import { eq } from "drizzle-orm";
import { z } from "zod";
import { HttpError, validate, withMiddleware } from "zentara";
import { db } from "../../../db/index.js";
import { products } from "../../../db/schema.js";
import { requireAdmin } from "../../../lib/auth.js";
import { ProductFields } from "./index.js";

const Params = z.object({ id: z.coerce.number().int().positive() });

async function findOr404(id: number) {
  const product = await db.query.products.findFirst({ where: eq(products.id, id) });
  if (!product) throw new HttpError(404, "Produk tidak ditemukan");
  return product;
}

// GET /api/products/1 (publik)
export const GET = validate({ params: Params }, (_ctx, { params }) => findOr404(params.id));

// PUT /api/products/1 (khusus admin, boleh sebagian field)
export const PUT = withMiddleware(
  [requireAdmin],
  validate({ params: Params, body: ProductFields.partial() }, async (_ctx, { params, body }) => {
    await findOr404(params.id);
    if (Object.keys(body).length === 0) throw new HttpError(400, "Tidak ada field yang diubah");
    const [updated] = await db.update(products).set(body).where(eq(products.id, params.id)).returning();
    return updated;
  }),
);

// DELETE /api/products/1 (khusus admin)
export const DELETE = withMiddleware(
  [requireAdmin],
  validate({ params: Params }, async (_ctx, { params }) => {
    await findOr404(params.id);
    await db.delete(products).where(eq(products.id, params.id));
  }),
);
