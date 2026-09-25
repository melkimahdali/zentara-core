import fs from "node:fs";
import { readSettings, resolveLocale, t, type Locale } from "../i18n/index.js";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { isLogLevel, type LogLevel } from "./logger.js";
import type { Middleware } from "./middleware.js";
import type { ZenPlugin } from "./plugin.js";

export interface ZenConfig {
  appName: string;
  env: string;
  /**
   * Tampilkan halaman error lengkap (stack trace, potongan kode, detail request) di browser.
   * Default: true hanya bila NODE_ENV=development (atau `env: "development"` di config) diisi eksplisit;
   * `zentara dev` selalu mengisinya. Env ZENTARA_DEBUG=true/false menang.
   * Jangan aktifkan di produksi: halaman error membuka kode sumber.
   */
  debug: boolean;
  host: string;
  port: number;
  /**
   * Folder aplikasi (absolut) berisi routes/, middleware, db/, dll.
   * Default: env ZENTARA_APP_DIR, lalu `src/app` bila ada (dev), selain itu `dist/app` (hasil build).
   */
  appDir: string;
  /** Folder route (absolut). Default: `<appDir>/routes`. */
  routesDir: string;
  /** Folder file statis (absolut), atau `false` untuk mematikan. */
  publicDir: string | false;
  /** Batas ukuran body request dalam byte. */
  bodyLimit: number;
  logLevel: LogLevel;
  plugins: ZenPlugin[];
  /** Middleware global, dijalankan sebelum middleware plugin dan file middleware aplikasi. */
  middleware: Middleware[];
  /**
   * File yang meng-export default array middleware aplikasi (tanpa ekstensi atau dengan).
   * Default: `app/middleware` di samping folder route. `false` untuk mematikan.
   */
  middlewareFile: string | false;
  /**
   * Bahasa Zentara untuk proyek ini: halaman bawaan, pesan error, kit UI, dan CLI ("id" atau "en").
   * Env ZENTARA_LANG menang. Tanpa ini: preferensi global (`zentara lang`, hanya di luar produksi),
   * lalu Bahasa Indonesia.
   */
  locale: Locale;
}

/** Pengaturan CLI interaktif `zentara`. */
export interface CliConfig {
  /** Animasi logo saat CLI dibuka (default true; env ZENTARA_ANIMATION=off mematikan). */
  animation?: boolean;
  /**
   * Layar penuh seperti ruang chat: header terkunci di atas, log bisa digulir, input di bawah
   * (default true bila terminal interaktif; env ZENTARA_FULLSCREEN=off mematikan).
   */
  fullscreen?: boolean;
}

export type UserConfig = Partial<ZenConfig> & { cli?: CliConfig };

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

/** Folder aplikasi default: sumber TypeScript saat pengembangan, hasil build bila sumbernya tidak ada. */
export function defaultAppDir(cwd = process.cwd(), env: NodeJS.ProcessEnv = process.env): string {
  if (env.ZENTARA_APP_DIR) return path.resolve(cwd, env.ZENTARA_APP_DIR);
  const src = path.join(cwd, "src", "app");
  return fs.existsSync(src) ? src : path.join(cwd, "dist", "app");
}
const CONFIG_FILES = ["zentara.config.mjs", "zentara.config.js"];

function parsePort(value: unknown): number {
  const port = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof port !== "number" || !Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(t().core.invalidPort(String(value)));
  }
  return port;
}

/** Gabungkan config pengguna, variabel lingkungan, dan default. Env (PORT, HOST, NODE_ENV, LOG_LEVEL) menang. */
export function resolveConfig(user: UserConfig = {}, env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): ZenConfig {
  const envName = env.NODE_ENV || user.env || "development";
  const logLevel = env.LOG_LEVEL ?? user.logLevel ?? (envName === "test" ? "warn" : "info");
  if (!isLogLevel(logLevel)) throw new Error(`Invalid logLevel: ${logLevel}`);

  const bodyLimit = user.bodyLimit ?? 1024 * 1024;
  if (!Number.isInteger(bodyLimit) || bodyLimit < 0) throw new Error(`Invalid bodyLimit: ${bodyLimit}`);

  const appDir = user.appDir ? path.resolve(cwd, user.appDir) : defaultAppDir(cwd, env);
  const routesDir = user.routesDir ? path.resolve(cwd, user.routesDir) : path.join(appDir, "routes");
  const publicDir = user.publicDir === false ? false : path.resolve(cwd, user.publicDir ?? "public");

  const debugEnv = env.ZENTARA_DEBUG?.trim().toLowerCase();
  // Tanpa NODE_ENV/env yang diisi eksplisit, anggap bukan pengembangan: halaman error lengkap tidak boleh
  // muncul di server produksi yang lupa mengatur NODE_ENV. `zentara dev` selalu mengisi NODE_ENV=development.
  const explicitDev = env.NODE_ENV ? env.NODE_ENV === "development" : user.env === "development";
  const debug = debugEnv ? ["1", "true", "yes", "on"].includes(debugEnv) : (user.debug ?? explicitDev);

  // Server produksi tidak bergantung pada preferensi di folder home developer.
  const locale = resolveLocale({ env, config: user.locale, settings: envName === "production" ? {} : readSettings(env) });
  return {
    locale,
    appName: user.appName ?? "Zentara App",
    env: envName,
    debug,
    host: env.HOST || user.host || "0.0.0.0",
    port: parsePort(env.PORT ?? user.port ?? 3000),
    appDir,
    routesDir,
    publicDir,
    bodyLimit,
    logLevel,
    plugins: user.plugins ?? [],
    middleware: user.middleware ?? [],
    middlewareFile:
      user.middlewareFile === false
        ? false
        : user.middlewareFile
          ? path.resolve(cwd, user.middlewareFile)
          : path.join(path.dirname(routesDir), "middleware"),
  };
}

/** Muat `zentara.config.mjs` / `.js` dari folder proyek bila ada. */
export async function loadConfigFile(cwd = process.cwd()): Promise<UserConfig> {
  for (const name of CONFIG_FILES) {
    const file = path.join(cwd, name);
    if (!fs.existsSync(file)) continue;
    const mod = (await import(pathToFileURL(file).href)) as { default?: unknown };
    if (mod.default === undefined || typeof mod.default !== "object" || mod.default === null) {
      throw new Error(t().core.configExport(name));
    }
    return mod.default as UserConfig;
  }
  return {};
}
