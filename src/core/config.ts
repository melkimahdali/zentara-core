import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { isLogLevel, type LogLevel } from "./logger.js";
import type { ZenPlugin } from "./plugin.js";

export interface ZenConfig {
  appName: string;
  env: string;
  host: string;
  port: number;
  /** Folder route (absolut). Default: `app/routes` di samping folder core (src/ saat dev, dist/ saat produksi). */
  routesDir: string;
  /** Folder file statis (absolut), atau `false` untuk mematikan. */
  publicDir: string | false;
  /** Batas ukuran body request dalam byte. */
  bodyLimit: number;
  logLevel: LogLevel;
  plugins: ZenPlugin[];
}

export type UserConfig = Partial<ZenConfig>;

export function defineConfig(config: UserConfig): UserConfig {
  return config;
}

const DEFAULT_ROUTES_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "app", "routes");
const CONFIG_FILES = ["zentara.config.mjs", "zentara.config.js"];

function parsePort(value: unknown): number {
  const port = typeof value === "string" && value.trim() !== "" ? Number(value) : value;
  if (typeof port !== "number" || !Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error(`Invalid port: ${String(value)} (harus bilangan bulat 0-65535)`);
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

  const publicDir = user.publicDir === false ? false : path.resolve(cwd, user.publicDir ?? "public");

  return {
    appName: user.appName ?? "Zentara App",
    env: envName,
    host: env.HOST || user.host || "0.0.0.0",
    port: parsePort(env.PORT ?? user.port ?? 3000),
    routesDir: user.routesDir ? path.resolve(cwd, user.routesDir) : DEFAULT_ROUTES_DIR,
    publicDir,
    bodyLimit,
    logLevel,
    plugins: user.plugins ?? [],
  };
}

/** Muat `zentara.config.mjs` / `.js` dari folder proyek bila ada. */
export async function loadConfigFile(cwd = process.cwd()): Promise<UserConfig> {
  for (const name of CONFIG_FILES) {
    const file = path.join(cwd, name);
    if (!fs.existsSync(file)) continue;
    const mod = (await import(pathToFileURL(file).href)) as { default?: unknown };
    if (mod.default === undefined || typeof mod.default !== "object" || mod.default === null) {
      throw new Error(`${name} harus meng-export default sebuah object config`);
    }
    return mod.default as UserConfig;
  }
  return {};
}
