import { render } from "ink";
import { createReplHost, type HostOptions } from "zentara/host";
import { App } from "./app.js";
import { Store } from "./store.js";

/**
 * Versi kontrak host yang dipakai paket ini (lihat HOST_API di zentara/host). Perintah `zentara`
 * hanya memakai tampilan Ink bila angkanya sama; bila tidak, CLI bawaan dipakai.
 */
export const HOST_API = 1;

export { App } from "./app.js";
export { Store } from "./store.js";

/** Jalankan CLI interaktif dengan tampilan Ink. Mengembalikan kode keluar. */
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
  await instance.waitUntilRenderFlush();
  instance.unmount();
  return exitCode;
}
