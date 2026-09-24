import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { HttpError } from "./errors.js";
import type { ZenContext } from "./context.js";
import type { ZenLogger } from "./logger.js";
import type { Middleware } from "./middleware.js";

export const HTTP_METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
export type HttpMethod = (typeof HTTP_METHODS)[number];

export type RouteHandler = (ctx: ZenContext) => unknown;

/** Isi file route: export per method (`GET`, `POST`, ...) dan/atau `default` untuk semua method. */
export type RouteModule = Partial<Record<HttpMethod | "default", RouteHandler>>;

type Segment =
  | { kind: "static"; value: string }
  | { kind: "param"; name: string }
  | { kind: "catchAll"; name: string };

export interface Route {
  /** Pola route yang mudah dibaca, mis. `/users/[id]`. */
  pattern: string;
  file: string;
  segments: Segment[];
  module: RouteModule;
  /** Middleware khusus route ini, dari `export const middleware = [...]`. */
  middleware: Middleware[];
}

export interface RouteMatch {
  route: Route;
  params: Record<string, string>;
}

const ROUTE_EXTENSIONS = [".ts", ".mts", ".js", ".mjs"];
const SEGMENT_RANK = { static: 3, param: 2, catchAll: 1 } as const;
const PARAM_NAME = /^[A-Za-z_$][\w$]*$/;

function isRouteFile(name: string): boolean {
  if (name.startsWith("_") || name.startsWith(".")) return false;
  if (/\.d\.[mc]?ts$/.test(name) || /\.(test|spec)\.[mc]?[jt]s$/.test(name)) return false;
  return ROUTE_EXTENSIONS.includes(path.extname(name));
}

function parseSegment(raw: string, file: string): Segment {
  const dynamic = /^\[(\.\.\.)?([^\]]+)\]$/.exec(raw);
  if (!dynamic) {
    if (raw.includes("[") || raw.includes("]")) throw new Error(`Segmen route tidak valid "${raw}" di ${file}`);
    return { kind: "static", value: raw };
  }
  const name = dynamic[2]!;
  if (!PARAM_NAME.test(name)) throw new Error(`Nama parameter tidak valid "${name}" di ${file}`);
  return dynamic[1] ? { kind: "catchAll", name } : { kind: "param", name };
}

/** `users/[id].ts` -> segmen `users`, `[id]`; `index.ts` memetakan ke folder induknya. */
export function segmentsFromFile(relativeFile: string): Segment[] {
  const withoutExt = relativeFile.slice(0, -path.extname(relativeFile).length);
  const parts = withoutExt.split(/[\\/]/).filter(Boolean);
  if (parts.at(-1) === "index") parts.pop();
  const segments = parts.map((p) => parseSegment(p, relativeFile));
  const catchAllIndex = segments.findIndex((s) => s.kind === "catchAll");
  if (catchAllIndex !== -1 && catchAllIndex !== segments.length - 1) {
    throw new Error(`Catch-all harus menjadi segmen terakhir: ${relativeFile}`);
  }
  const names = segments.flatMap((s) => (s.kind === "static" ? [] : [s.name]));
  if (new Set(names).size !== names.length) throw new Error(`Nama parameter duplikat di ${relativeFile}`);
  return segments;
}

function formatPattern(segments: Segment[]): string {
  return (
    "/" +
    segments
      .map((s) => (s.kind === "static" ? s.value : s.kind === "param" ? `[${s.name}]` : `[...${s.name}]`))
      .join("/")
  );
}

/** Kunci untuk mendeteksi dua file yang memetakan ke route yang sama (mis. `a.ts` & `a/index.ts`). */
function shapeKey(segments: Segment[]): string {
  return segments.map((s) => (s.kind === "static" ? `s:${s.value}` : s.kind)).join("/");
}

/** Route yang lebih spesifik dicocokkan lebih dulu: statis > [param] > [...catchAll]. */
export function compareRoutes(a: Route, b: Route): number {
  const len = Math.max(a.segments.length, b.segments.length);
  for (let i = 0; i < len; i++) {
    const sa = a.segments[i];
    const sb = b.segments[i];
    if (!sa || !sb) return sa ? -1 : 1;
    const diff = SEGMENT_RANK[sb.kind] - SEGMENT_RANK[sa.kind];
    if (diff !== 0) return diff;
  }
  return 0;
}

function validateMiddleware(value: unknown, file: string): Middleware[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || !value.every((m) => typeof m === "function")) {
    throw new Error(`Export "middleware" di ${file} harus berupa array function`);
  }
  return value as Middleware[];
}

function validateModule(mod: Record<string, unknown>, file: string): RouteModule {
  const out: RouteModule = {};
  for (const key of [...HTTP_METHODS, "default"] as const) {
    const value = mod[key];
    if (value === undefined) continue;
    if (typeof value !== "function") throw new Error(`Export "${key}" di ${file} harus berupa function`);
    out[key] = value as RouteHandler;
  }
  if (Object.keys(out).length === 0) {
    throw new Error(`File route ${file} tidak meng-export handler (default, GET, POST, ...)`);
  }
  return out;
}

export function allowedMethods(mod: RouteModule): HttpMethod[] {
  if (mod.default) return [...HTTP_METHODS];
  const methods = new Set(HTTP_METHODS.filter((m) => mod[m]));
  if (methods.has("GET")) methods.add("HEAD");
  methods.add("OPTIONS");
  return HTTP_METHODS.filter((m) => methods.has(m));
}

/** Pilih handler untuk method; HEAD memakai GET bila tidak didefinisikan. */
export function resolveHandler(mod: RouteModule, method: string): RouteHandler | undefined {
  const specific = mod[method as HttpMethod];
  if (specific) return specific;
  if (method === "HEAD" && mod.GET) return mod.GET;
  return mod.default;
}

export class ZenRouter {
  private routes: Route[] = [];

  constructor(private readonly logger: ZenLogger) {}

  get list(): readonly Route[] {
    return this.routes;
  }

  async loadRoutes(routesDir: string): Promise<void> {
    if (!fs.existsSync(routesDir)) {
      this.logger.warn(`Folder route tidak ditemukan: ${routesDir}`);
      this.routes = [];
      return;
    }

    const files: string[] = [];
    const scan = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) scan(full);
        else if (entry.isFile() && isRouteFile(entry.name)) files.push(full);
      }
    };
    scan(routesDir);

    const routes: Route[] = [];
    const seen = new Map<string, string>();
    for (const file of files.sort()) {
      const relative = path.relative(routesDir, file);
      const segments = segmentsFromFile(relative);
      const key = shapeKey(segments);
      const clash = seen.get(key);
      if (clash) throw new Error(`Route bentrok: ${clash} dan ${relative} memetakan ke ${formatPattern(segments)}`);
      seen.set(key, relative);

      const exports = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
      routes.push({
        pattern: formatPattern(segments),
        file,
        segments,
        module: validateModule(exports, relative),
        middleware: validateMiddleware(exports.middleware, relative),
      });
    }

    this.routes = routes.sort(compareRoutes);
    this.logger.info(`Loaded ${routes.length} routes`);
    for (const r of this.routes) this.logger.debug(`  ${r.pattern} -> ${path.relative(routesDir, r.file)}`);
  }

  /** Cocokkan pathname (masih ter-encode). Melempar 400 bila encoding persen tidak valid. */
  match(pathname: string): RouteMatch | undefined {
    const parts = pathname.split("/").filter(Boolean);
    let decoded: string[];
    try {
      decoded = parts.map((p) => decodeURIComponent(p));
    } catch (cause) {
      throw new HttpError(400, "Malformed URL encoding", { cause });
    }

    for (const route of this.routes) {
      const params = matchSegments(route.segments, decoded);
      if (params) return { route, params };
    }
    return undefined;
  }
}

function matchSegments(segments: Segment[], parts: string[]): Record<string, string> | undefined {
  const params: Record<string, string> = {};
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (seg.kind === "catchAll") {
      if (i >= parts.length) return undefined;
      params[seg.name] = parts.slice(i).join("/");
      return params;
    }
    const part = parts[i];
    if (part === undefined) return undefined;
    if (seg.kind === "static" ? seg.value !== part : false) return undefined;
    if (seg.kind === "param") params[seg.name] = part;
  }
  return parts.length === segments.length ? params : undefined;
}
