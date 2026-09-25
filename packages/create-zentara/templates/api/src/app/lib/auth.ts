import { eq } from "drizzle-orm";
import { fakeVerify, hashPassword, needsRehash, requireAuth, verifyPassword } from "zentara";
import { db } from "../db/index.js";
import { users, type User } from "../db/schema.js";

/** Data user yang aman dikirim ke klien (tanpa hash password). */
export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt };
}

async function loadUser(id: string | number): Promise<User | undefined> {
  return db.query.users.findFirst({ where: eq(users.id, Number(id)) });
}

/** API: wajib login (401). User terbaru dari database tersedia di ctx.state.user. */
export const requireUser = requireAuth<User>({ loadUser });

/** API: wajib login sebagai admin (role dicek dari database, jadi perubahan role langsung berlaku). */
export const requireAdmin = requireAuth<User>({ loadUser, roles: ["admin"] });

/** Halaman: belum login diarahkan ke /login?next=..., lalu kembali ke halaman asal setelah masuk. */
export const requireUserPage = requireAuth<User>({ loadUser, redirectTo: "/login" });

/** Halaman khusus admin (user biasa mendapat 403). */
export const requireAdminPage = requireAuth<User>({ loadUser, roles: ["admin"], redirectTo: "/login" });

/**
 * Cek email & password. Pesan dan waktu respons sama untuk email tidak terdaftar maupun password salah,
 * dan hash lama diperbarui otomatis.
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

/** Buat akun baru. `undefined` bila email sudah terdaftar. */
export async function registerUser(input: { name: string; email: string; password: string }): Promise<User | undefined> {
  const exists = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (exists) return undefined;
  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email, passwordHash: await hashPassword(input.password) })
    .returning();
  return user;
}

/** Tujuan setelah login: hanya path lokal (mencegah open redirect ke situs lain). */
export function safeNext(next: unknown, fallback = "/dashboard"): string {
  const value = Array.isArray(next) ? next[0] : next;
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return fallback;
  return value;
}
