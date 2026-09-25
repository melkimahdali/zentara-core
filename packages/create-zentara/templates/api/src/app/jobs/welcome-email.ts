import { eq } from "drizzle-orm";
import { sendMail, type JobContext } from "zentara";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { APP_NAME } from "../lib/ui.js";

// Email sambutan untuk akun baru. Dimasukkan ke antrean saat mendaftar (lihat registerUser di lib/auth.ts).
// Dicoba ulang sampai 3 kali bila server email sedang bermasalah.
export const retries = 3;

export default async function (data: { userId: number }, job: JobContext) {
  const user = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
  if (!user) return; // akun sudah dihapus sebelum email dikirim
  await sendMail({
    to: user.email,
    subject: `Selamat datang di ${APP_NAME}`,
    text: `Halo ${user.name},\n\nAkun Anda di ${APP_NAME} sudah aktif. Selamat mencoba!`,
  });
  job.logger.info(`Email sambutan terkirim ke ${user.email}`);
}
