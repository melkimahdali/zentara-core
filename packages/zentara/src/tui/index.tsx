import { render } from "ink";
import { createReplHost, type HostOptions } from "../repl/host.js";
import { App } from "./app.js";
import { Store } from "./store.js";

/**
 * CLI interaktif `zentara` dengan tampilan Ink (gaya Claude Code). Dimuat hanya saat CLI interaktif
 * dibuka, jadi perintah lain (dev, build, start, db:*) tidak ikut memuat React.
 */
export async function startInkRepl(options: HostOptions): Promise<number> {
  const store = new Store();
  const host = await createReplHost(options, store.ui);
  let resolveExit!: (code: number) => void;
  const exited = new Promise<number>((resolve) => (resolveExit = resolve));
  const instance = render(<App store={store} host={host} onExit={(code) => resolveExit(code)} />, { exitOnCtrlC: false, patchConsole: false });

  const code = await host.startup().catch((err: unknown) => {
    store.ui.notice(`✗ ${(err as Error).message}`, "error");
    return undefined;
  });
  if (code !== undefined) {
    await host.close();
    resolveExit(code);
  }

  const exitCode = await exited;
  store.ui.notice("Sampai jumpa!", "dim");
  store.close();
  await instance.waitUntilRenderFlush();
  instance.unmount();
  return exitCode;
}
