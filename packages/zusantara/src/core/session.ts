import crypto from "node:crypto";
import { t } from "../i18n/index.js";
import type { ZenContext } from "./context.js";
import type { CookieOptions } from "./cookies.js";
import type { Middleware } from "./middleware.js";

export const SESSION_SLOT = Symbol("zusantara.session");

export interface SessionOptions {
  /**
   * Rahasia minimal 32 karakter. Array untuk rotasi kunci: elemen pertama dipakai
   * mengenkripsi, semua elemen dicoba saat membaca. Default: env `SESSION_SECRET`.
   */
  secret?: string | readonly string[];
  /** Default "zen_session". */
  cookieName?: string;
  /** Umur session dalam detik. Default 7 hari. */
  maxAge?: number;
  /** Perpanjang umur cookie di setiap request, bukan hanya saat data berubah. Default false. */
  rolling?: boolean;
  cookie?: Pick<CookieOptions, "domain" | "path" | "sameSite" | "secure">;
}

const VERSION = "v1";
const MAX_COOKIE_BYTES = 4000;
const MIN_SECRET_LENGTH = 32;

/** Data session. Disimpan terenkripsi (AES-256-GCM) di dalam cookie, jadi tidak butuh database. */
export class Session {
  private data: Record<string, unknown>;
  private dirty = false;
  private isDestroyed = false;

  constructor(data: Record<string, unknown> | undefined, readonly isNew: boolean) {
    this.data = { ...data };
  }

  get<T = unknown>(key: string): T | undefined {
    return this.data[key] as T | undefined;
  }

  has(key: string): boolean {
    return Object.hasOwn(this.data, key);
  }

  /** Nilai harus bisa di-serialize ke JSON. */
  set(key: string, value: unknown): void {
    this.data[key] = value;
    this.dirty = true;
    this.isDestroyed = false;
  }

  delete(key: string): void {
    if (!this.has(key)) return;
    delete this.data[key];
    this.dirty = true;
  }

  /** Hapus semua data dan cookie session (mis. saat logout). */
  destroy(): void {
    this.data = {};
    this.dirty = true;
    this.isDestroyed = true;
  }

  get changed(): boolean {
    return this.dirty;
  }

  get destroyed(): boolean {
    return this.isDestroyed;
  }

  toJSON(): Record<string, unknown> {
    return { ...this.data };
  }
}

function deriveKey(secret: string): Buffer {
  return Buffer.from(crypto.hkdfSync("sha256", secret, "zusantara-session", "session-encryption-v1", 32));
}

export function sealSession(data: Record<string, unknown>, expiresAt: number, key: Buffer, cookieName: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(cookieName));
  const plaintext = Buffer.from(JSON.stringify({ d: data, e: expiresAt }));
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return `${VERSION}.${Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64url")}`;
}

/** Kembalikan data session, atau `undefined` bila cookie rusak, dipalsukan, atau kedaluwarsa. */
export function unsealSession(
  sealed: string,
  keys: readonly Buffer[],
  cookieName: string,
  now = Date.now(),
): Record<string, unknown> | undefined {
  if (!sealed.startsWith(`${VERSION}.`)) return undefined;
  const raw = Buffer.from(sealed.slice(VERSION.length + 1), "base64url");
  if (raw.length < 12 + 16 + 1) return undefined;
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);

  for (const key of keys) {
    try {
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAAD(Buffer.from(cookieName));
      decipher.setAuthTag(tag);
      const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
      const payload = JSON.parse(plaintext) as { d?: unknown; e?: unknown };
      if (typeof payload.e !== "number" || payload.e <= now) return undefined;
      if (typeof payload.d !== "object" || payload.d === null || Array.isArray(payload.d)) return undefined;
      return payload.d as Record<string, unknown>;
    } catch {
      // Kunci ini tidak cocok; coba kunci berikutnya.
    }
  }
  return undefined;
}

function resolveSecrets(option: SessionOptions["secret"]): { secrets: string[]; generated: boolean } {
  const configured = option ?? process.env.SESSION_SECRET;
  const secrets = configured === undefined ? [] : typeof configured === "string" ? [configured] : [...configured];
  if (secrets.length === 0) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(t().core.sessionSecretRequired);
    }
    return { secrets: [crypto.randomBytes(32).toString("hex")], generated: true };
  }
  for (const s of secrets) {
    if (typeof s !== "string" || s.length < MIN_SECRET_LENGTH) {
      throw new Error(t().core.sessionSecretShort(MIN_SECRET_LENGTH));
    }
  }
  return { secrets, generated: false };
}

/**
 * Middleware session berbasis cookie terenkripsi. Setelah dipasang, pakai `ctx.session`:
 *   ctx.session.set("userId", 1); ctx.session.get("userId"); ctx.session.destroy();
 */
export function session(options: SessionOptions = {}): Middleware {
  const { secrets, generated } = resolveSecrets(options.secret);
  const keys = secrets.map(deriveKey);
  const cookieName = options.cookieName ?? "zen_session";
  const maxAge = options.maxAge ?? 60 * 60 * 24 * 7;
  const cookieOptions: CookieOptions = {
    path: options.cookie?.path ?? "/",
    domain: options.cookie?.domain,
    sameSite: options.cookie?.sameSite ?? "Lax",
    secure: options.cookie?.secure ?? process.env.NODE_ENV === "production",
    httpOnly: true,
  };
  let warned = false;

  return async (ctx: ZenContext, next) => {
    if (generated && !warned) {
      warned = true;
      ctx.logger.warn(t().core.sessionRandomSecret);
    }

    const existing = ctx.cookies.get(cookieName);
    const data = existing ? unsealSession(existing, keys, cookieName) : undefined;
    const current = new Session(data, data === undefined);
    (ctx as unknown as Record<symbol, unknown>)[SESSION_SLOT] = current;

    let result: unknown;
    try {
      result = await next();
    } catch (err) {
      // Perubahan biasa tidak disimpan bila handler gagal, tapi destroy() (logout/sesi dicabut) tetap berlaku.
      if (current.destroyed && existing && !ctx.res.headersSent) ctx.cookies.delete(cookieName, cookieOptions);
      throw err;
    }

    if (ctx.res.headersSent) {
      if (current.changed) ctx.logger.warn(t().core.sessionNotSaved(ctx.path));
      return result;
    }
    if (current.destroyed) {
      if (existing) ctx.cookies.delete(cookieName, cookieOptions);
    } else if (current.changed || (options.rolling && !current.isNew)) {
      const sealed = sealSession(current.toJSON(), Date.now() + maxAge * 1000, keys[0]!, cookieName);
      if (sealed.length > MAX_COOKIE_BYTES) {
        throw new Error(t().core.sessionTooLarge(sealed.length, MAX_COOKIE_BYTES));
      }
      ctx.cookies.set(cookieName, sealed, { ...cookieOptions, maxAge });
    } else if (existing && data === undefined) {
      // Cookie rusak/kedaluwarsa: bersihkan dari browser.
      ctx.cookies.delete(cookieName, cookieOptions);
    }
    return result;
  };
}
