import { spawn } from "node:child_process";
import { t } from "../i18n/index.js";
import { commandExists } from "../dev/server.js";
import { platformCommand } from "../process.js";

/**
 * OmniRoute: gateway AI lokal yang gratis (https://github.com/diegosouzapw/OmniRoute).
 * Provider default Zentara. Dipasang global dengan npm dan dijalankan dengan perintah `omniroute`.
 */
export const OMNIROUTE = {
  command: "omniroute",
  installArgs: ["install", "-g", "omniroute"],
  dashboard: "http://localhost:20128",
  api: "http://localhost:20128/v1",
  repo: "https://github.com/diegosouzapw/OmniRoute",
} as const;

/**
 * Environment untuk OmniRoute yang dijalankan Zentara: hanya mendengar di 127.0.0.1.
 * Bawaan OmniRoute mendengar di 0.0.0.0 tanpa API key, sehingga perangkat lain di jaringan yang sama
 * bisa memakai (dan menghabiskan kuota) provider Anda.
 */
export function omnirouteEnv(base: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  return { ...base, OMNIROUTE_SERVER_HOST: base.OMNIROUTE_SERVER_HOST ?? "127.0.0.1" };
}

export function omnirouteInstalled(): boolean {
  return commandExists(OMNIROUTE.command);
}

/** OmniRoute butuh Node >=22.22.2 <23 atau >=24 <27 (lihat engines paket omniroute). */
export function nodeSupportsOmniRoute(version: string = process.versions.node): boolean {
  const [major = 0, minor = 0, patch = 0] = version.split(".").map(Number);
  if (major === 22) return minor > 22 || (minor === 22 && patch >= 2);
  return major >= 24 && major < 27;
}

/** Jalankan `npm install -g omniroute` dengan output npm ditampilkan apa adanya. */
export function installOmniRoute(): Promise<boolean> {
  return new Promise((resolve) => {
    const cmd = platformCommand("npm", [...OMNIROUTE.installArgs]);
    const child = spawn(cmd.command, cmd.args, { stdio: "inherit", shell: cmd.shell });
    child.on("error", () => resolve(false));
    child.on("close", (code) => resolve(code === 0));
  });
}

/** Petunjuk singkat setelah OmniRoute berjalan. */
export function OMNIROUTE_TIPS(): string[] {
  return t().ai.omnirouteTips(OMNIROUTE.dashboard);
}
