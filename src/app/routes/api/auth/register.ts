import { z } from "zod";
import { hashPassword, HttpError, json, login, rateLimit, validate } from "../../../../core/index.js";
import { db } from "../../../db/index.js";
import { users } from "../../../db/schema.js";
import { publicUser } from "../../../lib/auth.js";

export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];

const Body = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.email().trim().toLowerCase(),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
});

export const POST = validate({ body: Body }, async (ctx, { body }) => {
  const exists = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, body.email) });
  if (exists) throw new HttpError(409, "Email sudah terdaftar");

  const [user] = await db
    .insert(users)
    .values({ name: body.name, email: body.email, passwordHash: await hashPassword(body.password) })
    .returning();
  login(ctx, { id: user!.id, role: user!.role });
  return json({ user: publicUser(user!) }, { status: 201 });
});
