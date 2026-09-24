import { and, desc, lte, sql, type SQL } from "drizzle-orm";
import { z } from "zod";
import { json, validate, withMiddleware } from "../../../../core/index.js";
import { db } from "../../../db/index.js";
import { products } from "../../../db/schema.js";
import { requireAdmin } from "../../../lib/auth.js";

// GET /api/products?q=kopi&maxHarga=50000 (publik)
export const GET = validate(
  {
    query: z.object({
      q: z.string().trim().max(100).optional(),
      maxHarga: z.coerce.number().int().nonnegative().optional(),
    }),
  },
  async (_ctx, { query }) => {
    const filters: SQL[] = [];
    if (query.q) {
      // Escape wildcard LIKE agar input seperti "%" dicari apa adanya.
      const pattern = `%${query.q.replace(/[%_\\]/g, "\\$&")}%`;
      filters.push(sql`${products.name} LIKE ${pattern} ESCAPE '\\'`);
    }
    if (query.maxHarga !== undefined) filters.push(lte(products.price, query.maxHarga));
    return db.select().from(products).where(and(...filters)).orderBy(desc(products.id));
  },
);

/** Field produk tanpa nilai default: dipakai untuk update sebagian (PUT). */
export const ProductFields = z.object({
  name: z.string().trim().min(2).max(200),
  price: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
});

/** Untuk membuat produk baru: stok boleh dikosongkan (default 0). */
export const ProductInput = ProductFields.extend({ stock: ProductFields.shape.stock.default(0) });

// POST /api/products (khusus admin)
export const POST = withMiddleware(
  [requireAdmin],
  validate({ body: ProductInput }, async (_ctx, { body }) => {
    const [created] = await db.insert(products).values(body).returning();
    return json(created, { status: 201 });
  }),
);
