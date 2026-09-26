import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { t } from "../i18n/index.js";

/**
 * Tangkapan layar halaman (PNG) dengan Chrome/Chromium/Edge headless yang sudah terpasang di komputer.
 * Dipakai `view_page` (screenshot: true) supaya model yang bisa melihat gambar ikut menilai tampilan,
 * dan `zusantara view --screenshot`. Tidak mengunduh browser apa pun; bila tidak ditemukan, pesan
 * menjelaskan cara mengisi CHROME_PATH.
 *
 * Halaman dibuka tanpa cookie (tidak login), sama seperti versi teks `view_page`.
 */

const CANDIDATES: Record<string, string[]> = {
  linux: ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "microsoft-edge", "/opt/pw-browsers/chromium", "/snap/bin/chromium"],
  darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"],
  win32: [
    path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env.LOCALAPPDATA ?? "", "Google", "Chrome", "Application", "chrome.exe"),
    path.join(process.env["PROGRAMFILES(X86)"] ?? "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"),
    path.join(process.env.PROGRAMFILES ?? "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe"),
  ],
};

function onPath(name: string): string | undefined {
  for (const dir of (process.env.PATH ?? "").split(path.delimiter)) {
    if (!dir) continue;
    const file = path.join(dir, name);
    try {
      if (fs.statSync(file).isFile()) return file;
    } catch {
      // Tidak ada di folder ini.
    }
  }
  return undefined;
}

/** Lokasi browser untuk tangkapan layar: CHROME_PATH, lalu lokasi umum per sistem operasi. */
export function findChrome(env: NodeJS.ProcessEnv = process.env): string | undefined {
  if (env.CHROME_PATH) return fs.existsSync(env.CHROME_PATH) ? env.CHROME_PATH : undefined;
  for (const candidate of CANDIDATES[process.platform] ?? CANDIDATES.linux!) {
    if (path.isAbsolute(candidate)) {
      if (fs.existsSync(candidate)) return candidate;
    } else {
      const found = onPath(candidate);
      if (found) return found;
    }
  }
  return undefined;
}

export interface Screenshot {
  /** Path relatif terhadap proyek, mis. .zusantara/screenshots/produk-mobile.png */
  file: string;
  /** Isi PNG dalam base64 (untuk dikirim ke model). */
  base64: string;
  width: number;
  height: number;
}

/** Nama file dari path halaman, mis. "/produk/1?x=2" -> "produk-1". */
function slug(pagePath: string): string {
  const name = pagePath
    .split(/[?#]/)[0]!
    .replace(/^\/+|\/+$/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .slice(0, 60);
  return name || "index";
}

/**
 * Ambil tangkapan layar `url` seukuran `size`, simpan di `.zusantara/screenshots/`. Melempar Error berisi
 * pesan yang bisa ditampilkan bila browser tidak ada atau gagal.
 */
export async function captureScreenshot(url: string, options: { root: string; size: { w: number; h: number }; name: string; signal?: AbortSignal; timeoutMs?: number }): Promise<Screenshot> {
  const chrome = findChrome();
  if (!chrome) throw new Error(t().dev.view.shot.noBrowser);
  const dir = path.join(options.root, ".zusantara", "screenshots");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `${slug(options.name)}.png`);
  fs.rmSync(file, { force: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-shot-"));
  const args = [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    `--user-data-dir=${profile}`,
    `--window-size=${options.size.w},${options.size.h}`,
    "--virtual-time-budget=3000",
    `--screenshot=${file}`,
    url,
  ];
  // Chrome menolak berjalan sebagai root tanpa --no-sandbox (mis. di container).
  if (process.getuid?.() === 0) args.unshift("--no-sandbox");
  try {
    await new Promise<void>((resolve, reject) => {
      execFile(chrome, args, { timeout: options.timeoutMs ?? 30_000, signal: options.signal, windowsHide: true }, (err, _stdout, stderr) => {
        if (fs.existsSync(file)) resolve();
        else reject(new Error(t().dev.view.shot.failed((err?.message ?? String(stderr)).split("\n")[0]!.slice(0, 200))));
      });
    });
  } finally {
    fs.rmSync(profile, { recursive: true, force: true });
  }
  const png = fs.readFileSync(file);
  return { file: path.relative(options.root, file).split(path.sep).join("/"), base64: png.toString("base64"), width: options.size.w, height: options.size.h };
}
