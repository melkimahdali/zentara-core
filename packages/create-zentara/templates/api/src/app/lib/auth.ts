import { eq } from "drizzle-orm";
import { requireAuth } from "zentara";
import { db } from "../db/index.js";
import { users, type User } from "../db/schema.js";

/** Data user yang aman dikirim ke klien (tanpa hash password). */
export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
}

async function loadUser(id: string | number): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, Number(id)) });
}

/** Wajib login. User terbaru dari database tersedia di ctx.state.user. */
export const requireUser = requireAuth<User>({ loadUser });

/** Wajib login sebagai admin (role dicek dari database, jadi perubahan role langsung berlaku). */
export const requireAdmin = requireAuth<User>({ loadUser, roles: ["admin"] });
