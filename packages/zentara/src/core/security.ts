import type { ServerResponse } from "node:http";
import { t } from "../i18n/index.js";
import type { ZenContext } from "./context.js";
import { HttpError } from "./errors.js";
import type { Middleware } from "./middleware.js";
import { ZenResponse } from "./response.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function appendVary(res: ServerResponse, field: string): void {
  const current = res.getHeader("Vary");
  const values = String(current ?? "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
  if (values.includes("*") || values.some((v) => v.toLowerCase() === field.toLowerCase())) return;
  res.setHeader("Vary", [...values, field].join(", "));
}

export interface CorsOptions {
  /** Origin yang diizinkan. Default "*". */
  origin?: "*" | string | readonly string[] | RegExp | ((origin: string, ctx: ZenContext) => boolean);
  methods?: readonly string[];
  /** Default: memantulkan header yang diminta browser di preflight. */
  allowedHeaders?: readonly string[];
  exposedHeaders?: readonly string[];
  /** Izinkan cookie/Authorization lintas origin. Tidak boleh digabung dengan origin "*". */
  credentials?: boolean;
  /** Lama browser menyimpan hasil preflight (detik). */
  maxAge?: number;
}

export function cors(options: CorsOptions = {}): Middleware {
  const origin = options.origin ?? "*";
  if (options.credentials && origin === "*") {
    throw new Error('cors(): credentials: true tidak boleh dipakai dengan origin "*"; sebutkan origin secara eksplisit');
  }
  const methods = (options.methods ?? ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"]).join(", ");

  const isAllowed = (requestOrigin: string, ctx: ZenContext): boolean => {
    if (origin === "*") return true;
    if (typeof origin === "string") return origin === requestOrigin;
    if (origin instanceof RegExp) return origin.test(requestOrigin);
    if (typeof origin === "function") return origin(requestOrigin, ctx);
    return origin.includes(requestOrigin);
  };

  return (ctx, next) => {
    const { res } = ctx;
    const requestOrigin = ctx.req.headers.origin;
    if (origin !== "*") appendVary(res, "Origin");
    if (!requestOrigin) return next();

    const preflight = ctx.method === "OPTIONS" && ctx.req.headers["access-control-request-method"] !== undefined;
    if (!isAllowed(requestOrigin, ctx)) {
      // Tanpa header CORS, browser akan memblokir; request non-preflight tetap diproses seperti biasa.
      return preflight ? new ZenResponse(null, { status: 204 }) : next();
    }

    res.setHeader("Access-Control-Allow-Origin", origin === "*" ? "*" : requestOrigin);
    if (options.credentials) res.setHeader("Access-Control-Allow-Credentials", "true");

    if (preflight) {
      const requested = ctx.req.headers["access-control-request-headers"];
      const headers = options.allowedHeaders?.join(", ") ?? requested;
      if (!options.allowedHeaders && requested) appendVary(res, "Access-Control-Request-Headers");
      const out: Record<string, string> = { "Access-Control-Allow-Methods": methods };
      if (headers) out["Access-Control-Allow-Headers"] = headers;
      if (options.maxAge !== undefined) out["Access-Control-Max-Age"] = String(options.maxAge);
      return new ZenResponse(null, { status: 204, headers: out });
    }

    if (options.exposedHeaders?.length) res.setHeader("Access-Control-Expose-Headers", options.exposedHeaders.join(", "));
    return next();
  };
}

export interface CsrfOptions {
  /** Origin lain yang boleh mengirim request yang mengubah data, mis. "https://admin.contoh.id". */
  trustedOrigins?: readonly string[];
  /** Lewati pengecekan untuk request tertentu (mis. webhook yang diautentikasi dengan signature). */
  skip?: (ctx: ZenContext) => boolean;
}

/**
 * Proteksi CSRF tanpa token: tolak request POST/PUT/PATCH/DELETE yang dikirim browser
 * dari origin lain, berdasarkan header `Sec-Fetch-Site` dan `Origin`.
 * Request tanpa kedua header (curl, server-to-server) tidak dianggap berasal dari browser dan diizinkan.
 */
export function csrf(options: CsrfOptions = {}): Middleware {
  const trusted = new Set(options.trustedOrigins ?? []);
  const reject = () => new HttpError(403, t().core.csrf);

  return (ctx, next) => {
    if (SAFE_METHODS.has(ctx.method) || options.skip?.(ctx)) return next();

    const origin = ctx.req.headers.origin;
    if (origin && trusted.has(origin)) return next();

    const site = ctx.req.headers["sec-fetch-site"];
    if (site !== undefined) {
      if (site === "same-origin" || site === "none") return next();
      throw reject();
    }

    if (!origin) return next();
    let originHost: string | undefined;
    try {
      originHost = new URL(origin).host;
    } catch {
      throw reject();
    }
    if (originHost === ctx.req.headers.host) return next();
    throw reject();
  };
}
