import { render } from "ink";
import { t } from "../i18n/index.js";
import { createReplHost, type HostOptions } from "../repl/host.js";
import { App, Recap, type Layout } from "./app.js";
import { ENTER_ALT_SCREEN, LEAVE_ALT_SCREEN, MIN_FULLSCREEN_ROWS, PUSH_TITLE, RESTORE_TITLE, setTitle } from "./layout.js";
import { Store } from "./store.js";

/**
 * CLI interaktif `zusantara` dengan tampilan Ink (gaya Claude Code). Dimuat hanya saat CLI interaktif
 * dibuka, jadi perintah lain (dev, build, start, db:*) tidak ikut memuat React.
 */
export interface InkOptions {
  /** Animasi logo pembuka (default true). */
  animation?: boolean;
  /** Layar penuh seperti ruang chat (default: otomatis, lihat {@link fullscreenEnabled}). */
  fullscreen?: boolean;
  /**
   * Akhiri proses dengan `process.exit(kode)` setelah CLI ditutup rapi. Memastikan tidak ada timer,
   * koneksi, atau proses anak yang menahan terminal. Default false (pemanggil yang memutuskan).
   */
  exitProcess?: boolean;
}

/** Sinyal yang menutup CLI dengan rapi (terminal ditutup, `kill`, sesi cloud terputus). */
const EXIT_SIGNALS = ["SIGTERM", "SIGHUP"] as const;

/**
 * Layar penuh dipakai bila terminal interaktif dan cukup tinggi. Matikan dengan
 * `ZUSANTARA_FULLSCREEN=off` atau `cli: { fullscreen: false }` di zusantara.config.mjs.
 */
export function fullscreenEnabled(configured: boolean | undefined, stdout: Pick<NodeJS.WriteStream, "isTTY" | "rows"> = process.stdout, env: NodeJS.ProcessEnv = process.env): boolean {
  const flag = env.ZUSANTARA_FULLSCREEN?.trim().toLowerCase();
  if (flag && ["0", "off", "false", "no", "tidak"].includes(flag)) return false;
  if (!stdout.isTTY || (stdout.rows ?? 0) < MIN_FULLSCREEN_ROWS) return false;
  if (flag && ["1", "on", "true", "yes", "ya"].includes(flag)) return true;
  return configured !== false;
}

export async function startInkRepl(options: HostOptions, ink: InkOptions = {}): Promise<number> {
  const fullscreen = ink.fullscreen ?? fullscreenEnabled(undefined);
  const layout: Layout = fullscreen ? "fullscreen" : "inline";
  const store = new Store({ fullscreen });
  const host = await createReplHost(options, store.ui);
  let resolveExit!: (code: number) => void;
  const exited = new Promise<number>((resolve) => (resolveExit = resolve));

  const out = process.stdout;
  // Judul tab terminal menjadi "zusantara"; judul semula dikembalikan saat keluar.
  if (out.isTTY) out.write(PUSH_TITLE + setTitle("zusantara"));
  // Layar penuh memakai layar alternatif: output sebelumnya (npm install, dll.) tidak terlihat dan
  // tidak bisa digulir. Bila proses berakhir tiba-tiba, layar biasa tetap dikembalikan.
  let inAltScreen = false;
  const leaveAltScreen = () => {
    if (!inAltScreen) return;
    inAltScreen = false;
    out.write(LEAVE_ALT_SCREEN);
  };
  if (fullscreen) {
    out.write(ENTER_ALT_SCREEN);
    inAltScreen = true;
    process.once("exit", leaveAltScreen);
  }
  const instance = render(<App store={store} host={host} intro={ink.animation ?? true} layout={layout} onExit={(code) => resolveExit(code)} />, {
    exitOnCtrlC: false,
    patchConsole: false,
    // Hanya baris yang berubah yang ditulis ulang: spinner & teks mengalir tidak membuat layar berkedip.
    incrementalRendering: true,
    maxFps: 30,
  });

  const onSignal = () => {
    void host
      .close()
      .catch(() => undefined)
      .finally(() => resolveExit(0));
  };
  for (const signal of EXIT_SIGNALS) process.once(signal, onSignal);

  let exitCode = 0;
  try {
    const code = await host.startup().catch((err: unknown) => {
      store.ui.notice(`✗ ${err instanceof Error ? err.message : String(err)}`, "error");
      return undefined;
    });
    if (code !== undefined) {
      await host.close().catch(() => undefined);
      resolveExit(code);
    }
    exitCode = await exited;
  } finally {
    for (const signal of EXIT_SIGNALS) process.off(signal, onSignal);
    store.ui.notice(t().tui.goodbye, "dim");
    store.close();
    await instance.waitUntilRenderFlush();
    instance.unmount();
    await instance.waitUntilExit().catch(() => undefined);
    if (fullscreen) {
      // Kembali ke layar biasa, lalu cetak seluruh percakapan ke scrollback agar tidak ada yang hilang.
      leaveAltScreen();
      process.off("exit", leaveAltScreen);
      const recap = render(<Recap items={store.get().items} host={host} />, { exitOnCtrlC: false, patchConsole: false });
      await recap.waitUntilRenderFlush();
      recap.unmount();
      await recap.waitUntilExit().catch(() => undefined);
    }
    if (out.isTTY) out.write(RESTORE_TITLE);
  }

  if (ink.exitProcess) {
    // Tunggu semua output terkirim ke terminal, lalu akhiri proses dengan kode yang benar.
    await new Promise<void>((resolve) => process.stdout.write("", () => resolve()));
    process.exit(exitCode);
  }
  return exitCode;
}
