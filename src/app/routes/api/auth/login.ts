import { eq } from "drizzle-orm";
import { z } from "zod";
import { fakeVerify, hashPassword, HttpError, login, needsRehash, rateLimit, validate, verifyPassword } from "../../../../core/index.js";
import { db } from "../../../db/index.js";
import { users } from "../../../db/schema.js";
import { publicUser } from "../../../lib/auth.js";

export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];

const Body = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().max(1024),
});

export const POST = validate({ body: Body }, async (ctx, { body }) => {
  const user = await db.query.users.findFirst({ where: eq(users.email, body.email) });
  // Pesan dan waktu respons sama untuk email tidak terdaftar maupun password salah.
  const ok = user ? await verifyPassword(body.password, user.passwordHash) : await fakeVerify(body.password);
  if (!user || !ok) throw new HttpError(401, "Email atau password salah");

  if (needsRehash(user.passwordHash)) {
    await db.update(users).set({ passwordHash: await hashPassword(body.password) }).where(eq(users.id, user.id));
  }
  login(ctx, { id: user.id, role: user.role });
  return { user: publicUser(user) };
});
