import { loadConfigFile } from "./core/config.js";
import { ZenRuntime } from "./core/runtime.js";

async function bootstrap(): Promise<void> {
  const runtime = new ZenRuntime(await loadConfigFile());
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
}

bootstrap().catch((err) => {
  console.error("Boot error:", err);
  process.exitCode = 1;
});
