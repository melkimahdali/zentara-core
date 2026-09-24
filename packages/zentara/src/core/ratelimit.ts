import type { ZenContext } from "./context.js";
import { HttpError } from "./errors.js";
import type { Middleware } from "./middleware.js";

export interface RateLimitOptions {
  /** Panjang jendela waktu dalam milidetik. Default 60 detik. */
  windowMs?: number;
  /** Jumlah request maksimum per kunci dalam satu jendela. Default 60. */
  max?: number;
  /** Kunci pengelompokan. Default: alamat IP klien. */
  key?: (ctx: ZenContext) => string;
  /** Percayai header X-Forwarded-For (hanya bila server berada di belakang reverse proxy tepercaya). */
  trustProxy?: boolean;
  message?: string;
}

export function clientIp(ctx: ZenContext, trustProxy = false): string {
  if (trustProxy) {
    const forwarded = ctx.req.headers["x-forwarded-for"];
    const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(",")[0]?.trim();
    if (first) return first;
  }
  return ctx.req.socket.remoteAddress ?? "unknown";
}

/**
 * Batasi jumlah request per klien (jendela waktu tetap, disimpan di memori proses).
 * Cocok untuk melindungi login/register dari brute-force. Untuk banyak instance server, pakai penyimpanan bersama.
 */
export function rateLimit(options: RateLimitOptions = {}): Middleware {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 60;
  if (!(windowMs > 0) || !Number.isInteger(max) || max < 1) throw new Error("rateLimit(): windowMs dan max harus positif");
  const hits = new Map<string, { count: number; resetAt: number }>();
  let lastSweep = Date.now();

  return (ctx, next) => {
    const now = Date.now();
    if (now - lastSweep > windowMs) {
      for (const [k, v] of hits) if (v.resetAt <= now) hits.delete(k);
      lastSweep = now;
    }
    const key = options.key ? options.key(ctx) : clientIp(ctx, options.trustProxy);
    let entry = hits.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }
    entry.count++;
    const remaining = Math.max(0, max - entry.count);
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000);
    ctx.res.setHeader("RateLimit-Limit", String(max));
    ctx.res.setHeader("RateLimit-Remaining", String(remaining));
    ctx.res.setHeader("RateLimit-Reset", String(resetSeconds));
    if (entry.count > max) {
      throw new HttpError(429, options.message ?? "Terlalu banyak percobaan, coba lagi nanti", {
        headers: { "Retry-After": String(resetSeconds) },
      });
    }
    return next();
  };
}
