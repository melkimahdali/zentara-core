import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadConfigFile } from "./core/config.js";
import { ZenRuntime } from "./core/runtime.js";

export interface ServeOptions {
  cwd?: string;
  /** Folder aplikasi, mis. "src/app" (dev) atau "dist/app" (produksi). */
  appDir?: string;
}

/** Jalankan server aplikasi di folder proyek; dipakai oleh `zentara dev` dan `zentara start`. */
export async function serve(options: ServeOptions = {}): Promise<ZenRuntime> {
  const cwd = options.cwd ?? process.cwd();
  // Muat .env bila ada; variabel yang sudah diatur di environment tetap didahulukan.
  const envFile = path.join(cwd, ".env");
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  if (options.appDir) process.env.ZENTARA_APP_DIR = path.resolve(cwd, options.appDir);

  const runtime = new ZenRuntime(await loadConfigFile(cwd));
  await runtime.start();

  const shutdown = (signal: string) => {
    runtime.logger.info(`${signal} diterima, mematikan server...`);
    runtime.stop().then(
      () => process.exit(0),
      (err) => {
        runtime.logger.error("Gagal mematikan server", err);
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
