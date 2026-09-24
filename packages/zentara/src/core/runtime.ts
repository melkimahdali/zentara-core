import fs from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveConfig, type UserConfig, type ZenConfig } from "./config.js";
import { createContext, parseRequestUrl, type ZenContext } from "./context.js";
import { HttpError } from "./errors.js";
import { ZenLogger } from "./logger.js";
import { compose, type Middleware } from "./middleware.js";
import { ZenPluginManager } from "./plugin.js";
import { ZenResponse } from "./response.js";
import { allowedMethods, resolveHandler, ZenRouter } from "./router.js";
import { resolveStaticFile, sendStaticFile } from "./static.js";

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
    this.logger = new ZenLogger(this.config.logLevel);
    this.router = new ZenRouter(this.logger);
    this.plugins = new ZenPluginManager(this, this.config.plugins);
    this.middleware = [...this.config.middleware];
  }

  /** Tambahkan middleware global. Hanya bisa dipanggil sebelum server berjalan (mis. di `setup()` plugin). */
  use(...middleware: Middleware[]): this {
    if (this.server) throw new Error("runtime.use() harus dipanggil sebelum start()");
    for (const m of middleware) {
      if (typeof m !== "function") throw new Error("runtime.use() hanya menerima function middleware");
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
      throw new Error(`${path.basename(file)} harus meng-export default array middleware`);
    }
    this.use(...(list as Middleware[]));
    this.logger.debug(`Loaded ${list.length} middleware dari ${path.basename(file)}`);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.logger.info(`Booting ${this.config.appName} (${this.config.env})...`);
    await this.plugins.load();
    await this.loadAppMiddleware();
    await this.router.loadRoutes(this.config.routesDir);
    this.initialized = true;
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
    const url = parseRequestUrl(req.url);
    const ctx = createContext(req, res, { bodyLimit: this.config.bodyLimit, logger: this.logger }, url);
    const result = await compose(this.middleware, (c) => this.route(c))(ctx);
    this.send(req, res, result);
  }

  /** Ujung rantai middleware global: cocokkan route, jalankan middleware route, lalu handler. */
  private async route(ctx: ZenContext): Promise<unknown> {
    const match = this.router.match(ctx.path);

    if (!match) {
      if ((ctx.method === "GET" || ctx.method === "HEAD") && this.config.publicDir) {
        const file = await resolveStaticFile(this.config.publicDir, ctx.path);
        if (file) {
          await sendStaticFile(ctx.req, ctx.res, file);
          return undefined;
        }
      }
      throw new HttpError(404);
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

    res.statusCode = response.status;
    for (const [key, value] of Object.entries(response.headers)) res.setHeader(key, value);
    const noBody = response.status === 204 || response.status === 304;
    if (response.body !== null && !noBody) res.setHeader("Content-Length", Buffer.byteLength(response.body));
    res.end(req.method === "HEAD" || noBody ? undefined : response.body ?? undefined);
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
    const wantsJson = !accept.includes("text/html") && (accept.includes("application/json") || details !== undefined);
    const body = wantsJson ? JSON.stringify({ error: { status, message, details } }) : message;

    res.statusCode = status;
    for (const [key, value] of Object.entries(httpError?.headers ?? {})) res.setHeader(key, value);
    res.setHeader("Content-Type", wantsJson ? "application/json; charset=utf-8" : "text/plain; charset=utf-8");
    res.setHeader("Content-Length", Buffer.byteLength(body));
    res.end(req.method === "HEAD" ? undefined : body);
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
    return address;
  }

  async stop(): Promise<void> {
    const server = this.server;
    if (!server) return;
    this.server = undefined;
    await new Promise<void>((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
      server.closeIdleConnections();
    });
  }
}
