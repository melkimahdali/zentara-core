import type { IncomingMessage, ServerResponse } from "node:http";
import { HttpError } from "./errors.js";

export type Query = Record<string, string | string[]>;

export interface ZenContext {
  req: IncomingMessage;
  res: ServerResponse;
  method: string;
  /** Pathname URL (masih ter-encode, tanpa query string). */
  path: string;
  url: URL;
  query: Query;
  /** Parameter route dinamis, mis. `{ id: "5" }` untuk `users/[id].ts`. Catch-all digabung dengan "/". */
  params: Record<string, string>;
  /** Tempat bebas untuk plugin/handler berbagi data selama satu request. */
  state: Record<string, unknown>;
  /** Body mentah. Dibaca sekali lalu di-cache; melempar 413 bila melebihi `bodyLimit`. */
  body(): Promise<Buffer>;
  text(): Promise<string>;
  /** Body sebagai JSON. `undefined` bila body kosong; melempar 400 bila JSON tidak valid. */
  json<T = unknown>(): Promise<T | undefined>;
}

export interface ContextOptions {
  bodyLimit: number;
}

export function parseRequestUrl(rawUrl: string | undefined): URL {
  const target = rawUrl && rawUrl.length > 0 ? rawUrl : "/";
  // Prefix manual agar "//host/x" tidak ditafsirkan sebagai URL protocol-relative.
  try {
    return new URL(`http://localhost${target.startsWith("/") ? "" : "/"}${target}`);
  } catch (cause) {
    throw new HttpError(400, "Malformed request URL", { cause });
  }
}

function toQuery(params: URLSearchParams): Query {
  const query: Query = {};
  for (const [key, value] of params) {
    const existing = query[key];
    if (existing === undefined) query[key] = value;
    else if (Array.isArray(existing)) existing.push(value);
    else query[key] = [existing, value];
  }
  return query;
}

function readBody(req: IncomingMessage, res: ServerResponse, limit: number): Promise<Buffer> {
  const declared = Number(req.headers["content-length"]);
  if (Number.isFinite(declared) && declared > limit) {
    res.setHeader("Connection", "close");
    return Promise.reject(new HttpError(413));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const cleanup = () => {
      req.off("data", onData);
      req.off("end", onEnd);
      req.off("error", onError);
    };
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > limit) {
        cleanup();
        req.pause();
        res.setHeader("Connection", "close");
        reject(new HttpError(413));
        return;
      }
      chunks.push(chunk);
    };
    const onEnd = () => {
      cleanup();
      resolve(Buffer.concat(chunks));
    };
    const onError = (err: Error) => {
      cleanup();
      reject(new HttpError(400, "Failed to read request body", { cause: err }));
    };
    req.on("data", onData);
    req.on("end", onEnd);
    req.on("error", onError);
  });
}

export function createContext(
  req: IncomingMessage,
  res: ServerResponse,
  options: ContextOptions,
  url: URL = parseRequestUrl(req.url),
): ZenContext {
  let bodyPromise: Promise<Buffer> | undefined;
  const ctx: ZenContext = {
    req,
    res,
    method: (req.method ?? "GET").toUpperCase(),
    path: url.pathname,
    url,
    query: toQuery(url.searchParams),
    params: {},
    state: {},
    body() {
      bodyPromise ??= readBody(req, res, options.bodyLimit);
      return bodyPromise;
    },
    async text() {
      return (await ctx.body()).toString("utf8");
    },
    async json<T = unknown>() {
      const raw = await ctx.text();
      if (raw.trim() === "") return undefined;
      try {
        return JSON.parse(raw) as T;
      } catch (cause) {
        throw new HttpError(400, "Invalid JSON body", { cause });
      }
    },
  };
  return ctx;
}
