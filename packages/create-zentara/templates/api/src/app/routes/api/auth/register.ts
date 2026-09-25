import { z } from "zod";
import { HttpError, json, login, rateLimit, validate } from "zentara";
import { publicUser, registerUser } from "../../../lib/auth.js";

export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];

export const RegisterInput = z.object({
  name: z.string().trim().min(2, "Nama minimal 2 karakter").max(100),
  email: z.email("Email tidak valid").trim().toLowerCase(),
  password: z.string().min(8, "Password minimal 8 karakter").max(128),
});

export const POST = validate({ body: RegisterInput }, async (ctx, { body }) => {
  const user = await registerUser(body);
  if (!user) throw new HttpError(409, "Email sudah terdaftar");
  login(ctx, { id: user.id, role: user.role });
  return json({ user: publicUser(user) }, { status: 201 });
});
