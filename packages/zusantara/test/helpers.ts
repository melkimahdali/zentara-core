import path from "node:path";
import { fileURLToPath } from "node:url";
import { ZenRuntime, type UserConfig } from "../src/core/index.js";

export const FIXTURES = path.join(path.dirname(fileURLToPath(import.meta.url)), "fixtures");

export async function startServer(overrides: UserConfig = {}) {
  const previousPort = process.env.PORT;
  delete process.env.PORT;
  const runtime = new ZenRuntime({
    port: 0,
    host: "127.0.0.1",
    logLevel: "silent",
    routesDir: path.join(FIXTURES, "routes"),
    publicDir: path.join(FIXTURES, "public"),
    ...overrides,
  });
  if (previousPort !== undefined) process.env.PORT = previousPort;
  const { port } = await runtime.start();
  const base = `http://127.0.0.1:${port}`;
  return { runtime, base, port, close: () => runtime.stop() };
}
