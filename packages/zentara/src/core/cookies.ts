import type { IncomingMessage, ServerResponse } from "node:http";
import { t } from "../i18n/index.js";

export interface CookieOptions {
  /** Umur cookie dalam detik. */
  maxAge?: number;
  expires?: Date;
  /** Default "/". */
  path?: string;
  domain?: string;
  /** Wajib `true` bila `sameSite: "None"` (diatur otomatis). */
  secure?: boolean;
  /** Default `true`: cookie tidak bisa dibaca JavaScript di browser. */
  httpOnly?: boolean;
  /** Default "Lax". */
  sameSite?: "Strict" | "Lax" | "None";
  partitioned?: boolean;
}

const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const ATTR_VALUE = /^[^\u0000-\u001f\u007f;]*$/;

export function parseCookieHeader(header: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header) return cookies;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (!name || cookies.has(name)) continue;
    let value = part.slice(eq + 1).trim();
    if (value.startsWith('"') && value.endsWith('"') && value.length >= 2) value = value.slice(1, -1);
    try {
      cookies.set(name, decodeURIComponent(value));
    } catch {
      cookies.set(name, value);
    }
  }
  return cookies;
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  if (!COOKIE_NAME.test(name)) throw new Error(t().core.cookieName(JSON.stringify(name)));
  const sameSite = options.sameSite ?? "Lax";
  const parts = [`${name}=${encodeURIComponent(value)}`];

  const path = options.path ?? "/";
  if (!ATTR_VALUE.test(path)) throw new Error(t().core.cookiePath(JSON.stringify(path)));
  parts.push(`Path=${path}`);
  if (options.domain !== undefined) {
    if (!ATTR_VALUE.test(options.domain)) throw new Error(t().core.cookieDomain(JSON.stringify(options.domain)));
    parts.push(`Domain=${options.domain}`);
  }
  if (options.maxAge !== undefined) {
    if (!Number.isFinite(options.maxAge)) throw new Error(t().core.cookieMaxAge);
    parts.push(`Max-Age=${Math.floor(options.maxAge)}`);
  }
  if (options.expires) parts.push(`Expires=${options.expires.toUTCString()}`);
  if (options.httpOnly ?? true) parts.push("HttpOnly");
  if (options.secure || sameSite === "None" || options.partitioned) parts.push("Secure");
  parts.push(`SameSite=${sameSite}`);
  if (options.partitioned) parts.push("Partitioned");
  return parts.join("; ");
}

/** Baca cookie request dan tulis `Set-Cookie` ke respons. */
export class Cookies {
  private parsed: Map<string, string> | undefined;
  private readonly pending = new Map<string, string>();

  constructor(private readonly req: IncomingMessage, private readonly res: ServerResponse) {}

  private get incoming(): Map<string, string> {
    this.parsed ??= parseCookieHeader(this.req.headers.cookie);
    return this.parsed;
  }

  get(name: string): string | undefined {
    return this.incoming.get(name);
  }

  getAll(): Record<string, string> {
    return Object.fromEntries(this.incoming);
  }

  set(name: string, value: string, options: CookieOptions = {}): void {
    if (this.res.headersSent) throw new Error(t().core.cookieSent(name));
    // Kunci per name+path+domain agar set berulang dalam satu request tidak menduplikasi header.
    this.pending.set(`${name};${options.path ?? "/"};${options.domain ?? ""}`, serializeCookie(name, value, options));
    this.res.setHeader("Set-Cookie", [...this.pending.values()]);
  }

  delete(name: string, options: Omit<CookieOptions, "maxAge" | "expires"> = {}): void {
    this.set(name, "", { ...options, maxAge: 0, expires: new Date(0) });
  }
}
