import { z } from "zod";
import { HttpError, login, rateLimit, validate } from "zentara";
import { authenticate, publicUser } from "../../../lib/auth.js";

export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];

const Body = z.object({
  email: z.string().trim().toLowerCase(),
  password: z.string().max(1024),
});

export const POST = validate({ body: Body }, async (ctx, { body }) => {
  const user = await authenticate(body.email, body.password);
  if (!user) throw new HttpError(401, "Email atau password salah");
  login(ctx, { id: user.id, role: user.role });
  return { user: publicUser(user) };
});
