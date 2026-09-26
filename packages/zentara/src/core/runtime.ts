import fs from "node:fs";
import { setLocale, setLocaleOverride } from "../i18n/index.js";
import { t } from "../i18n/index.js";
import { sendBuiltinAsset } from "./assets.js";
import { setUiTheme } from "../ui/theme.js";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveConfig, type UserConfig, type ZenConfig } from "./config.js";
import { createContext, parseRequestUrl, type ZenContext } from "./context.js";
import { finishTrace, findTrace, recentTraces, requestOverride, runWithTrace, setTracing, type RequestOverride } from "./devtrace.js";
import { renderErrorPage, renderNotFoundPage } from "./devpage/error.js";
import { statusPage } from "../ui/status.js";
import { appInfo, devtoolsClient, setAppInfo } from "./devpage/info.js";
import { announceAppUrl, injectDevTools, sendDevAsset } from "./devpage/widget.js";
import { SESSION_SLOT, type Session } from "./session.js";
import { setSourceTracking } from "./view.js";
import { timingSafeEqual } from "node:crypto";
import { HttpError } from "./errors.js";
import { ZenLogger } from "./logger.js";
import { compose, type Middleware } from "./middleware.js";
import { ZenPluginManager } from "./plugin.js";
import { ZenResponse } from "./response.js";
import { allowedMethods, resolveHandler, ZenRouter } from "./router.js";
import { resolveStaticFile, sendStaticFile } from "./static.js";
import { jobs, MemoryJobStore, SqliteJobStore } from "../backend/jobs.js";
import { configureMail } from "../backend/mail.js";

/** 404 karena tidak ada route yang cocok (bukan HttpError(404) yang dilempar aplikasi). */
class RouteNotFoundError extends HttpError {
  constructor() {
    super(404);
  }
}

export class ZenRuntime {
  readonly config: ZenConfig;
  readonly logger: ZenLogger;
  readonly router: ZenRouter;
  readonly plugins: ZenPluginManager;
  server: http.Server | undefined;
  private initialized = false;
  private readonly middleware: Middleware[];

  constructor(userConfig: UserConfig = {}) {
    this.config = resolveConfig(userConfig);
    setLocale(this.config.locale);
    setUiTheme(this.config.ui);
    this.logger = new ZenLogger(this.config.logLevel);
    this.router = new ZenRouter(this.logger);
    this.plugins = new ZenPluginManager(this, this.config.plugins);
    this.middleware = [...this.config.middleware];
  }

  /** Tambahkan middleware global. Hanya bisa dipanggil sebelum server berjalan (mis. di `setup()` plugin). */
  use(...middleware: Middleware[]): this {
    if (this.server) throw new Error(t().core.useAfterStart);
    for (const m of middleware) {
      if (typeof m !== "function") throw new Error(t().core.useFunction);
    }
    this.middleware.push(...middleware);
    return this;
  }

  private async loadAppMiddleware(): Promise<void> {
    const base = this.config.middlewareFile;
    if (base === false) return;
    const candidates = path.extname(base) ? [base] : [".ts", ".mts", ".js", ".mjs"].map((ext) => base + ext);
    const file = candidates.find((f) => fs.existsSync(f));
    if (!file) return;

    const mod = (await import(pathToFileURL(file).href)) as { default?: unknown };
    const list = mod.default;
    if (!Array.isArray(list) || !list.every((m) => typeof m === "function")) {
      throw new Error(t().core.middlewareFile(path.basename(file)));
    }
    this.use(...(list as Middleware[]));
    this.logger.debug(t().core.middlewareLoaded(list.length, path.basename(file)));
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.logger.info(`Booting ${this.config.appName} (${this.config.env})...`);
    this.publishAppInfo();
    await this.plugins.load();
    await this.loadAppMiddleware();
    await this.router.loadRoutes(this.config.routesDir);
    await this.loadJobs();
    configureMail({ ...this.config.mail, logger: this.logger });
    this.publishAppInfo();
    this.enableDevTracing();
    this.initialized = true;
  }

  /**
   * Saat `zentara dev` dengan devtools: catat jejak setiap request (toolbar dev, `zentara requests`),
   * tandai elemen HTML dengan file:baris pembuatnya (mode inspeksi), dan izinkan varian bahasa per request.
   * Di produksi tidak ada yang dinyalakan.
   */
  private enableDevTracing(): void {
    const on = Boolean(devtoolsClient());
    setTracing(on);
    setSourceTracking(on ? process.cwd() : undefined);
    setLocaleOverride(on ? () => requestOverride()?.locale : undefined);
  }

  /** Job dari folder `jobs/` di samping `routes/` (mis. src/app/jobs). */
  private async loadJobs(): Promise<void> {
    const dir = path.join(path.dirname(this.config.routesDir), "jobs");
    if (!fs.existsSync(dir)) return;
    const { store, path: file, concurrency, pollMs } = this.config.jobs;
    jobs.configure({ store: store === "memory" ? new MemoryJobStore() : new SqliteJobStore(file), logger: this.logger, concurrency, pollMs });
    const defs = await jobs.load(dir);
    this.logger.debug(`Loaded ${defs.length} jobs`);
  }

  /** Informasi untuk halaman sambutan & halaman error bawaan. */
  private publishAppInfo(): void {
    const root = process.cwd();
    setAppInfo({
      appName: this.config.appName,
      env: this.config.env,
      debug: this.config.debug,
      root,
      routes: this.router.list.map((r) => ({
        pattern: r.pattern,
        methods: allowedMethods(r.module).filter((m) => m !== "HEAD" && m !== "OPTIONS"),
        file: path.relative(root, r.file).split(path.sep).join("/"),
      })),
    });
  }

  /** Handler Node `http` yang tidak pernah melempar; semua error diubah menjadi respons HTTP. */
  readonly handle = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    try {
      await this.dispatch(req, res);
    } catch (err) {
      this.sendError(req, res, err);
    }
  };

  private async dispatch(req: IncomingMessage, res: ServerResponse): Promise<void> {
    if (!devtoolsClient()) return this.dispatchRequest(req, res);
    const override = takeViewOverride(req);
    const pathname = parseRequestUrl(req.url).pathname;
    return runWithTrace({ method: req.method ?? "GET", path: req.url ?? "/", override }, (trace) => {
      if (!trace) return this.dispatchRequest(req, res);
      res.setHeader("X-Zentara-Request", trace.id);
      const file = this.router.match(pathname)?.route.file;
      res.once("finish", () => {
        const session = (res as unknown as Record<symbol, Session | undefined>)[SESSION_SLOT];
        finishTrace(trace, { status: res.statusCode, route: file ? path.relative(process.cwd(), file).split(path.sep).join("/") : undefined, session: session?.toJSON() });
      });
      return this.dispatchRequest(req, res);
    });
  }

  private async dispatchRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const url = parseRequestUrl(req.url);
    const ctx = createContext(req, res, { bodyLimit: this.config.bodyLimit, logger: this.logger }, url);
    // Untuk jejak request saat pengembangan: session dibaca setelah respons selesai.
    if (devtoolsClient()) {
      Object.defineProperty(res, SESSION_SLOT, { get: () => (ctx as unknown as Record<symbol, Session | undefined>)[SESSION_SLOT], configurable: true });
    }
    const result = await compose(this.middleware, (c) => this.route(c))(ctx);
    this.send(req, res, result);
  }

  /** Ujung rantai middleware global: cocokkan route, jalankan middleware route, lalu handler. */
  private async route(ctx: ZenContext): Promise<unknown> {
    const match = this.router.match(ctx.path);

    if (!match) {
      // Script widget chat pengembangan: hanya ada saat devtools aktif, selain itu 404.
      if (ctx.path.startsWith("/_zentara/dev/")) {
        if (ctx.method === "GET" && devtoolsClient() && (ctx.path === "/_zentara/dev/requests" || ctx.path.startsWith("/_zentara/dev/requests/"))) return requestTraces(ctx);
        if ((ctx.method === "GET" || ctx.method === "HEAD") && sendDevAsset(ctx.req, ctx.res, ctx.path)) return undefined;
        throw new RouteNotFoundError();
      }
      if ((ctx.method === "GET" || ctx.method === "HEAD") && ctx.path.startsWith("/_zentara/") && sendBuiltinAsset(ctx.req, ctx.res, ctx.path)) {
        return undefined;
      }
      // Galeri kit UI: hanya saat debug (pengembangan), dimuat saat pertama diminta.
      if ((ctx.method === "GET" || ctx.method === "HEAD") && ctx.path === "/_zentara/ui" && this.config.debug) {
        const { renderGallery } = await import("../ui/gallery.js");
        return renderGallery();
      }
      // Contoh halaman utuh dari katalog, juga hanya saat debug.
      if ((ctx.method === "GET" || ctx.method === "HEAD") && ctx.path.startsWith("/_zentara/ui/examples/") && this.config.debug) {
        const { renderExample } = await import("../ui/examples/index.js");
        const html = renderExample(ctx.path.slice("/_zentara/ui/examples/".length));
        if (html) return html;
      }
      if ((ctx.method === "GET" || ctx.method === "HEAD") && this.config.publicDir) {
        const file = await resolveStaticFile(this.config.publicDir, ctx.path);
        if (file) {
          await sendStaticFile(ctx.req, ctx.res, file);
          return undefined;
        }
      }
      throw new RouteNotFoundError();
    }

    const { route, params } = match;
    ctx.params = params;
    const handler = resolveHandler(route.module, ctx.method);
    if (!handler) {
      const allow = allowedMethods(route.module).join(", ");
      if (ctx.method === "OPTIONS") return new ZenResponse(null, { status: 204, headers: { Allow: allow } });
      throw new HttpError(405, undefined, { headers: { Allow: allow } });
    }

    return compose(route.middleware, handler)(ctx);
  }

  private send(req: IncomingMessage, res: ServerResponse, result: unknown): void {
    // Handler sudah menulis respons sendiri lewat ctx.res.
    if (res.headersSent || res.writableEnded) return;

    let response: ZenResponse;
    if (result instanceof ZenResponse) response = result;
    else if (result === undefined || result === null) response = new ZenResponse(null, { status: 204 });
    else if (typeof result === "string") {
      response = new ZenResponse(result, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    } else if (result instanceof Uint8Array) {
      response = new ZenResponse(result, { headers: { "Content-Type": "application/octet-stream" } });
    } else {
      response = new ZenResponse(JSON.stringify(result), { headers: { "Content-Type": "application/json; charset=utf-8" } });
    }

    let body = response.body;
    if (typeof body === "string" && isHtml(response.headers)) body = this.withDevTools(req, res, body);

    res.statusCode = response.status;
    for (const [key, value] of Object.entries(response.headers)) res.setHeader(key, value);
    const noBody = response.status === 204 || response.status === 304;
    if (body !== null && !noBody) res.setHeader("Content-Length", Buffer.byteLength(body));
    res.end(req.method === "HEAD" || noBody ? undefined : body ?? undefined);
  }

  /** Saat pengembangan: sisipkan widget chat Zentara AI ke halaman HTML. Di produksi tidak mengubah apa pun. */
  private withDevTools(req: IncomingMessage, res: ServerResponse, html: string): string {
    if (!devtoolsClient() || requestOverride()?.shot) return html;
    const file = this.router.match(parseRequestUrl(req.url).pathname)?.route.file;
    const route = file ? path.relative(process.cwd(), file).split(path.sep).join("/") : undefined;
    const request = res.getHeader("X-Zentara-Request");
    return injectDevTools(html, { route, headers: req.headers, request: typeof request === "string" ? request : undefined });
  }

  private sendError(req: IncomingMessage, res: ServerResponse, err: unknown): void {
    const httpError = err instanceof HttpError ? err : undefined;
    const status = httpError?.status ?? 500;
    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} -> ${status}`, err);
    } else {
      this.logger.debug(`${req.method} ${req.url} -> ${status}: ${httpError?.message}`);
    }

    if (res.headersSent) {
      res.destroy(err instanceof Error ? err : undefined);
      return;
    }

    const message = httpError?.expose ? httpError.message : status >= 500 ? "Internal Server Error" : "Error";
    const accept = String(req.headers.accept ?? "");
    const details = httpError?.expose ? httpError.details : undefined;
    const wantsHtml = accept.includes("text/html");
    const wantsJson = !wantsHtml && (accept.includes("application/json") || details !== undefined);
    let body: string;
    let type: string;
    if (wantsJson) {
      body = JSON.stringify({ error: { status, message, details } });
      type = "application/json; charset=utf-8";
    } else if (wantsHtml) {
      // Browser: halaman error yang rapi. Detail (stack trace, kode) hanya saat debug.
      body = this.withDevTools(req, res, this.errorHtml(req, err, status, httpError));
      type = "text/html; charset=utf-8";
    } else {
      body = message;
      type = "text/plain; charset=utf-8";
    }

    res.statusCode = status;
    for (const [key, value] of Object.entries(httpError?.headers ?? {})) res.setHeader(key, value);
    res.setHeader("Content-Type", type);
    res.setHeader("Content-Length", Buffer.byteLength(body));
    res.end(req.method === "HEAD" ? undefined : body);
  }

  private errorHtml(req: IncomingMessage, err: unknown, status: number, httpError: HttpError | undefined): string {
    try {
      if (this.config.debug && err instanceof RouteNotFoundError) return renderNotFoundPage(req, appInfo().routes);
      if (this.config.debug && status >= 500) return renderErrorPage(err, req, status);
      return statusPage(status, { message: httpError?.expose ? httpError.message : undefined, appName: this.config.appName });
    } catch (renderErr) {
      this.logger.error(t().core.errorPageFailed, renderErr);
      return `<!doctype html><title>${status}</title><h1>${status}</h1>`;
    }
  }

  async start(): Promise<AddressInfo> {
    await this.init();
    const server = http.createServer(this.handle);
    server.on("clientError", (_err, socket) => {
      if (socket.writable) socket.end("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      else socket.destroy();
    });
    this.server = server;

    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(this.config.port, this.config.host, () => {
        server.off("error", reject);
        resolve();
      });
    });

    const address = server.address() as AddressInfo;
    const shownHost = this.config.host === "0.0.0.0" || this.config.host === "::" ? "localhost" : this.config.host;
    this.logger.info(`🚀 Running at http://${shownHost}:${address.port}`);
    announceAppUrl(`http://${shownHost}:${address.port}`);
    if (this.config.jobs.worker && jobs.definitions.length) jobs.start();
    return address;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = undefined;
    await jobs.stop();
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
      server.closeIdleConnections();
    });
  }
}

function isHtml(headers: Record<string, unknown>): boolean {
  const key = Object.keys(headers).find((k) => k.toLowerCase() === "content-type");
  return key !== undefined && String(headers[key]).toLowerCase().startsWith("text/html");
}

/**
 * Varian tampilan dari `view_page` (`?__zentara_lang=en`, `?__zentara_mode=dark`): dibuang dari URL
 * sebelum routing supaya aplikasi tidak melihatnya, lalu berlaku untuk request ini saja.
 */
function takeViewOverride(req: IncomingMessage): RequestOverride | undefined {
  const raw = req.url ?? "/";
  if (!raw.includes("__zentara_")) return undefined;
  const q = raw.indexOf("?");
  if (q < 0) return undefined;
  const params = new URLSearchParams(raw.slice(q + 1));
  const lang = params.get("__zentara_lang");
  const mode = params.get("__zentara_mode");
  const shot = params.get("__zentara_shot");
  params.delete("__zentara_lang");
  params.delete("__zentara_mode");
  params.delete("__zentara_shot");
  const rest = params.toString();
  req.url = raw.slice(0, q) + (rest ? `?${rest}` : "");
  const override: RequestOverride = {};
  if (lang === "id" || lang === "en") override.locale = lang;
  if (mode === "light" || mode === "dark") override.mode = mode;
  if (shot === "1") override.shot = true;
  return override.locale || override.mode || override.shot ? override : undefined;
}

/** `GET /_zentara/dev/requests[/<id>]`: jejak request terbaru, hanya dengan token devtools. */
function requestTraces(ctx: ZenContext): ZenResponse {
  const devtools = devtoolsClient();
  const given = ctx.req.headers["x-zentara-token"];
  const a = Buffer.from(typeof given === "string" ? given : "");
  const b = Buffer.from(devtools?.token ?? "");
  if (!devtools || a.length !== b.length || !timingSafeEqual(a, b)) throw new HttpError(401);
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" };
  const id = ctx.path.slice("/_zentara/dev/requests/".length);
  if (ctx.path.length > "/_zentara/dev/requests/".length) {
    const trace = findTrace(decodeURIComponent(id));
    if (!trace) throw new HttpError(404);
    return new ZenResponse(JSON.stringify(trace), { headers });
  }
  return new ZenResponse(JSON.stringify({ requests: recentTraces() }), { headers });
}
