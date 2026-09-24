import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { resolveConfig, type UserConfig, type ZenConfig } from "./config.js";
import { createContext, parseRequestUrl } from "./context.js";
import { HttpError } from "./errors.js";
import { ZenLogger } from "./logger.js";
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

  constructor(userConfig: UserConfig = {}) {
    this.config = resolveConfig(userConfig);
    this.logger = new ZenLogger(this.config.logLevel);
    this.router = new ZenRouter(this.logger);
    this.plugins = new ZenPluginManager(this, this.config.plugins);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    this.logger.info(`Booting ${this.config.appName} (${this.config.env})...`);
    await this.plugins.load();
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
    const method = (req.method ?? "GET").toUpperCase();
    const match = this.router.match(url.pathname);

    if (!match) {
      if ((method === "GET" || method === "HEAD") && this.config.publicDir) {
        const file = await resolveStaticFile(this.config.publicDir, url.pathname);
        if (file) return sendStaticFile(req, res, file);
      }
      throw new HttpError(404);
    }

    const { route, params } = match;
    const handler = resolveHandler(route.module, method);
    if (!handler) {
      const allow = allowedMethods(route.module).join(", ");
      if (method === "OPTIONS") {
        res.writeHead(204, { Allow: allow }).end();
        return;
      }
      throw new HttpError(405, undefined, { headers: { Allow: allow } });
    }

    const ctx = createContext(req, res, { bodyLimit: this.config.bodyLimit }, url);
    ctx.params = params;
    const result = await handler(ctx);
    this.send(req, res, result);
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
    const wantsJson = accept.includes("application/json") && !accept.includes("text/html");
    const body = wantsJson ? JSON.stringify({ error: { status, message } }) : message;

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
