import { hashPassword } from "zusantara";
import type { db as Database } from "./index.js";
import { notes, users } from "./schema.js";

// Isi data awal: `zusantara db:seed`. Aman dijalankan berulang (data yang sudah ada tidak diduplikasi).
export default async function seed(db: typeof Database): Promise<string> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@zusantara.test";
  let password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") throw new Error("Atur SEED_ADMIN_PASSWORD untuk seed di production");
    password = "admin12345";
  }

  const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) });
  if (existing) return "Data awal sudah ada.";

  const [admin] = await db.insert(users).values({ email, name: "Admin", role: "admin", passwordHash: await hashPassword(password) }).returning();
  await db.insert(notes).values([
    {
      userId: admin!.id,
      title: "Selamat datang di aplikasi Anda",
      body: "Catatan ini contoh data milik user. Ubah, hapus, atau ganti seluruh fitur Catatan dengan apa pun yang ingin Anda bangun.",
    },
    {
      userId: admin!.id,
      title: "Ide berikutnya",
      body: 'Coba minta Zusantara AI: npx zusantara "buatkan halaman jadwal booking untuk user yang login".',
    },
  ]);
  return `Admin dibuat: ${email}${process.env.SEED_ADMIN_PASSWORD ? "" : " (password dev: admin12345)"}`;
}
