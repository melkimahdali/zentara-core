import { eq } from "drizzle-orm";
import { fakeVerify, hashPassword, needsRehash, requireAuth, verifyPassword } from "zentara";
import { db } from "../db/index.js";
import { users, type User } from "../db/schema.js";

/** User data that is safe to send to the client (without the password hash). */
export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
}

async function loadUser(id: string | number): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, Number(id)) });
}

/** API: sign-in required (401). The latest user from the database is in ctx.state.user. */
export const requireUser = requireAuth<User>({ loadUser });

/** API: admin sign-in required (the role is checked in the database, so role changes apply immediately). */
export const requireAdmin = requireAuth<User>({ loadUser, roles: ["admin"] });

/** Pages: guests are sent to /login?next=..., then back to the original page after signing in. */
export const requireUserPage = requireAuth<User>({ loadUser, redirectTo: "/login" });

/** Admin-only pages (regular users get 403). */
export const requireAdminPage = requireAuth<User>({ loadUser, roles: ["admin"], redirectTo: "/login" });

/**
 * Check an email & password. The message and response time are the same for unknown emails and wrong
 * passwords, and old hashes are upgraded automatically.
 */
export async function authenticate(email: string, password: string): Promise<User | undefined> {
  const user = await db.query.users.findFirst({ where: eq(users.email, email) });
  const ok = user ? await verifyPassword(password, user.passwordHash) : await fakeVerify(password);
  if (!user || !ok) return undefined;
  if (needsRehash(user.passwordHash)) {
    await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, user.id));
  }
  return user;
}

/** Create an account. `undefined` when the email is already registered. */
export async function registerUser(input: { name: string; email: string; password: string }): Promise<User | undefined> {
  const exists = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (exists) return undefined;
  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password) })
    .returning();
  return user;
}

/** Where to go after signing in: local paths only (prevents open redirects to other sites). */
export function safeNext(next: unknown, fallback = "/dashboard"): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
