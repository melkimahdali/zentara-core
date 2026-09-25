import fs from "node:fs";
import { t } from "./i18n/index.js";
import http from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfigFile, resolveConfig, type UserConfig } from "./core/config.js";
import { renderErrorPage } from "./core/devpage/error.js";
import { setAppInfo } from "./core/devpage/info.js";
import { ZenRuntime } from "./core/runtime.js";

export interface ServeOptions {
  cwd?: string;
  /** Folder aplikasi, mis. "src/app" (dev) atau "dist/app" (produksi). */
  appDir?: string;
}

/**
 * Saat pengembangan, aplikasi yang gagal boot (mis. salah ketik di file route) tetap menjawab di port-nya
 * dengan halaman error lengkap, supaya error bisa dilihat dan diperbaiki (juga dengan Zentara AI) dari browser.
 * Server dev akan memulai ulang otomatis begitu file diperbaiki.
 */
async function serveBootError(err: unknown, user: UserConfig, cwd: string): Promise<boolean> {
  let config;
  try {
    config = resolveConfig(user, process.env, cwd);
  } catch {
    config = resolveConfig({}, process.env, cwd);
  }
  if (!config.debug) return false;
  setAppInfo({ appName: config.appName, env: config.env, debug: true, root: cwd, routes: [] });
  const server = http.createServer((req, res) => {
    const body = renderErrorPage(err, req, 500);
    res.writeHead(500, { "Content-Type": "text/html; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
    res.end(req.method === "HEAD" ? undefined : body);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.port, config.host, () => resolve());
  });
  const shownHost = config.host === "0.0.0.0" || config.host === "::" ? "localhost" : config.host;
  console.error("Boot error:", err);
  console.error(t().dev.server.bootFailed(`http://${shownHost}:${config.port}`));
  return true;
}

/** Jalankan server aplikasi di folder proyek; dipakai oleh `zentara dev` dan `zentara start`. */
export async function serve(options: ServeOptions = {}): Promise<ZenRuntime | undefined> {
  const cwd = options.cwd ?? process.cwd();
  // Muat .env bila ada; variabel yang sudah diatur di environment tetap didahulukan.
  const envFile = path.join(cwd, ".env");
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  if (options.appDir) process.env.ZENTARA_APP_DIR = path.resolve(cwd, options.appDir);

  let user: UserConfig = {};
  let runtime: ZenRuntime;
  try {
    user = await loadConfigFile(cwd);
    runtime = new ZenRuntime(user);
    await runtime.start();
  } catch (err) {
    if (await serveBootError(err, user, cwd)) return undefined;
    throw err;
  }

  const shutdown = (signal: string) => {
    runtime.logger.info(t().dev.server.signal(signal));
    runtime.stop().then(
      () => process.exit(0),
      (err) => {
        runtime.logger.error(t().dev.server.stopFailed, err);
        process.exit(1);
      },
    );
  };
  process.once("SIGINT", () => shutdown("SIGINT"));
  process.once("SIGTERM", () => shutdown("SIGTERM"));
  return runtime;
}

// Dijalankan langsung (mis. oleh `zentara dev` lewat tsx watch): baca folder aplikasi dari env.
const invokedDirectly = process.argv[1] !== undefined && import.meta.url === pathToFileURL(fs.realpathSync(process.argv[1])).href;
if (invokedDirectly) {
  serve().catch((err) => {
    console.error("Boot error:", err);
    process.exitCode = 1;
  });
}
