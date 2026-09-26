/** Informasi aplikasi yang sedang berjalan, untuk halaman sambutan dan halaman error bawaan. */
export interface RouteInfo {
  pattern: string;
  methods: string[];
  file: string;
}

export interface AppInfo {
  appName: string;
  env: string;
  debug: boolean;
  root: string;
  routes: RouteInfo[];
}

let current: AppInfo = { appName: "Zentara App", env: "development", debug: false, root: process.cwd(), routes: [] };

export function setAppInfo(info: AppInfo): void {
  current = info;
}

export function appInfo(): AppInfo {
  return current;
}

export interface DevtoolsClientConfig {
  /** Alamat server devtools (hanya 127.0.0.1) milik `zentara dev`/CLI interaktif. */
  port: number;
  token: string;
}

/**
 * Konfigurasi chat Zentara AI untuk browser. Hanya ada bila semua syarat ini terpenuhi:
 * - mode debug aktif;
 * - aplikasi dijalankan oleh server pengembangan (`zentara dev` atau CLI interaktif), yang mengisi
 *   ZENTARA_DEV=1, ZENTARA_DEVTOOLS_PORT, dan ZENTARA_DEVTOOLS_TOKEN;
 * - bukan NODE_ENV=production.
 * `zentara start` juga menghapus variabel itu, jadi env yang terbawa tidak memunculkan chat di produksi.
 */
export function devtoolsClient(env: NodeJS.ProcessEnv = process.env): DevtoolsClientConfig | undefined {
  if (!current.debug || env.ZENTARA_DEV !== "1" || env.NODE_ENV === "production") return undefined;
  const port = Number(env.ZENTARA_DEVTOOLS_PORT);
  const token = env.ZENTARA_DEVTOOLS_TOKEN;
  if (!Number.isInteger(port) || port <= 0 || port > 65535 || !token) return undefined;
  return { port, token };
}

/** Variabel lingkungan yang hanya boleh ada di server pengembangan (dihapus oleh `zentara start`). */
export const DEV_ONLY_ENV = ["ZENTARA_DEV", "ZENTARA_DEVTOOLS_PORT", "ZENTARA_DEVTOOLS_TOKEN"] as const;
