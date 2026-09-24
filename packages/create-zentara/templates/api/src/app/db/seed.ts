import { hashPassword } from "zentara";
import type { db as Database } from "./index.js";
import { products, users } from "./schema.js";

// Isi data awal: `zentara db:seed`. Aman dijalankan berulang (data yang sudah ada tidak diduplikasi).
export default async function seed(db: typeof Database): Promise<string> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@zentara.test";
  let password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") throw new Error("Atur SEED_ADMIN_PASSWORD untuk seed di production");
    password = "admin12345";
  }

  const admin = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) });
  if (!admin) {
    await db.insert(users).values({ email, name: "Admin", role: "admin", passwordHash: await hashPassword(password) });
  }

  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length === 0) {
    await db.insert(products).values([
      { name: "Kopi Gayo 250g", price: 45000, stock: 20 },
      { name: "Teh Tarik Sachet", price: 15000, stock: 100 },
      { name: "Keripik Tempe", price: 12000, stock: 50 },
    ]);
  }
  return admin ? "Data awal sudah ada." : `Admin dibuat: ${email}${process.env.SEED_ADMIN_PASSWORD ? "" : " (password dev: admin12345)"}`;
}
