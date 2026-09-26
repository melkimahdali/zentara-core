import { z } from "zod";
import { HttpError, json, login, rateLimit, validate } from "zusantara";
import { publicUser, registerUser } from "../../../lib/auth.js";

export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];

export const RegisterInput = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.email("Invalid email").trim().toLowerCase(),
  password: z.string().min(8, "Password must be at least 8 characters").max(128),
});

export const POST = validate({ body: RegisterInput }, async (ctx, { body }) => {
  const user = await registerUser(body);
  if (!user) throw new HttpError(409, "Email is already registered");
  login(ctx, { id: user.id, role: user.role });
  return json({ user: publicUser(user) }, { status: 201 });
});
