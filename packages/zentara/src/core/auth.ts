import crypto from "node:crypto";
import { promisify } from "node:util";
import type { ZenContext } from "./context.js";
import { HttpError } from "./errors.js";
import { redirect } from "./response.js";
import type { Middleware } from "./middleware.js";

const scrypt = promisify(crypto.scrypt) as (
  password: crypto.BinaryLike,
  salt: crypto.BinaryLike,
  keylen: number,
  options: crypto.ScryptOptions,
) => Promise<Buffer>;

/** Parameter scrypt sesuai rekomendasi OWASP (N=2^15, r=8, p=3; ±32 MB per hash). */
const DEFAULT_PARAMS = { N: 2 ** 15, r: 8, p: 3 };
const KEY_LENGTH = 64;
const MAX_PASSWORD_LENGTH = 1024;

function scryptOptions(N: number, r: number, p: number): crypto.ScryptOptions {
  return { N, r, p, maxmem: 128 * N * r * 2 };
}

/** Hash password dengan scrypt. Format: `scrypt$N$r$p$salt$hash` (base64url), parameter ikut tersimpan agar bisa dinaikkan. */
export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length === 0) throw new Error("Password tidak boleh kosong");
  if (password.length > MAX_PASSWORD_LENGTH) throw new Error(`Password maksimal ${MAX_PASSWORD_LENGTH} karakter`);
  const { N, r, p } = DEFAULT_PARAMS;
  const salt = crypto.randomBytes(16);
  const hash = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, scryptOptions(N, r, p));
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

function parseHash(stored: string): { N: number; r: number; p: number; salt: Buffer; hash: Buffer } | undefined {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return undefined;
  const [N, r, p] = parts.slice(1, 4).map(Number) as [number, number, number];
  if (![N, r, p].every((n) => Number.isInteger(n) && n > 0) || N > 2 ** 20 || r > 32 || p > 16) return undefined;
  return { N, r, p, salt: Buffer.from(parts[4]!, "base64url"), hash: Buffer.from(parts[5]!, "base64url") };
}

/** Cocokkan password dengan hash tersimpan (perbandingan waktu-konstan). Hash rusak dianggap tidak cocok. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parsed = typeof stored === "string" ? parseHash(stored) : undefined;
  if (!parsed || typeof password !== "string" || password.length > MAX_PASSWORD_LENGTH) return false;
  const actual = await scrypt(password.normalize("NFKC"), parsed.salt, parsed.hash.length, scryptOptions(parsed.N, parsed.r, parsed.p));
  return actual.length === parsed.hash.length && crypto.timingSafeEqual(actual, parsed.hash);
}

/** true bila hash dibuat dengan parameter lama dan sebaiknya dibuat ulang saat login berikutnya. */
export function needsRehash(stored: string): boolean {
  const parsed = parseHash(stored);
  return !parsed || parsed.N < DEFAULT_PARAMS.N || parsed.r < DEFAULT_PARAMS.r || parsed.p < DEFAULT_PARAMS.p;
}

let dummyHash: Promise<string> | undefined;

/**
 * Jalankan verifikasi palsu dengan biaya yang sama. Panggil saat email tidak ditemukan
 * agar penyerang tidak bisa menebak email terdaftar dari lamanya respons.
 */
export async function fakeVerify(password: string): Promise<false> {
  dummyHash ??= hashPassword(crypto.randomBytes(16).toString("hex"));
  await verifyPassword(password, await dummyHash);
  return false;
}

export interface AuthUser {
  id: string | number;
  role?: string;
}

const AUTH_KEY = "auth";

/** Tandai request ini (dan request berikutnya lewat session) sebagai milik user tersebut. Butuh middleware session(). */
export function login(ctx: ZenContext, user: AuthUser): void {
  ctx.session.set(AUTH_KEY, { id: user.id, role: user.role ?? "user", at: Date.now() });
}

export function logout(ctx: ZenContext): void {
  ctx.session.destroy();
}

/** User yang sedang login menurut session, atau `undefined`. */
export function currentUser(ctx: ZenContext): (AuthUser & { role: string }) | undefined {
  const auth = ctx.session.get<{ id?: unknown; role?: unknown }>(AUTH_KEY);
  if (!auth || (typeof auth.id !== "string" && typeof auth.id !== "number")) return undefined;
  return { id: auth.id, role: typeof auth.role === "string" ? auth.role : "user" };
}

export interface RequireAuthOptions<U> {
  /** Hanya role ini yang boleh lewat (403 untuk role lain). */
  roles?: readonly string[];
  /**
   * Muat data user terbaru dari database. Bila mengembalikan `undefined` (user dihapus/dinonaktifkan),
   * session diakhiri dan request ditolak. Hasilnya tersedia di `ctx.state.user`.
   */
  loadUser?: (id: string | number, ctx: ZenContext) => U | undefined | Promise<U | undefined>;
  /** Ambil role dari user yang dimuat (default: `user.role`). Dipakai agar perubahan role langsung berlaku. */
  roleOf?: (user: U) => string | undefined;
  /**
   * Untuk halaman HTML: alih-alih 401, arahkan ke halaman login ini dengan `?next=<path asal>`
   * (mis. "/login"). Role yang tidak sesuai tetap mendapat 403.
   */
  redirectTo?: string;
}

/** Middleware: tolak request yang belum login (401) atau role-nya tidak sesuai (403). */
export function requireAuth<U = unknown>(options: RequireAuthOptions<U> = {}): Middleware {
  return async (ctx, next) => {
    const toLogin = () => {
      const target = ctx.method === "GET" ? `${ctx.path}${ctx.url.search}` : ctx.path;
      return redirect(`${options.redirectTo}?next=${encodeURIComponent(target)}`, 303);
    };
    const auth = currentUser(ctx);
    if (!auth) {
      if (options.redirectTo) return toLogin();
      throw new HttpError(401, "Silakan login terlebih dahulu");
    }

    let role = auth.role;
    if (options.loadUser) {
      const user = await options.loadUser(auth.id, ctx);
      if (user === undefined || user === null) {
        logout(ctx);
        if (options.redirectTo) return toLogin();
        throw new HttpError(401, "Sesi tidak berlaku lagi, silakan login ulang");
      }
      ctx.state.user = user;
      const fresh = options.roleOf ? options.roleOf(user) : (user as { role?: unknown }).role;
      if (typeof fresh === "string") role = fresh;
    } else {
      ctx.state.user = auth;
    }

    if (options.roles && !options.roles.includes(role)) throw new HttpError(403, "Anda tidak punya akses ke fitur ini");
    return next();
  };
}
