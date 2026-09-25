import fs from "node:fs";
import path from "node:path";

export interface PlatformCommand {
  command: string;
  args: string[];
  shell: boolean;
}

/** Kutip satu argumen untuk cmd.exe: aman untuk path berspasi dan tanda kutip. */
export function quoteWindowsArg(arg: string): string {
  if (arg !== "" && /^[\w@+=:,./\\-]+$/.test(arg)) return arg;
  return `"${arg.replace(/"/g, '""')}"`;
}

/**
 * Siapkan perintah agar bisa dijalankan di semua OS.
 * Di Windows, npm/pnpm/yarn adalah file .cmd yang hanya bisa dijalankan lewat shell (Node menolak
 * menjalankannya langsung), jadi seluruh perintah digabung dengan argumen yang dikutip.
 * Program dengan path absolut (mis. process.execPath) selalu dijalankan tanpa shell.
 */
export function platformCommand(command: string, args: readonly string[], platform: NodeJS.Platform = process.platform): PlatformCommand {
  if (platform !== "win32" || path.win32.isAbsolute(command) || path.posix.isAbsolute(command)) {
    return { command, args: [...args], shell: false };
  }
  return { command: [command, ...args].map(quoteWindowsArg).join(" "), args: [], shell: true };
}

/**
 * CLI zentara milik proyek (`<proyek>/node_modules/zentara/dist/cli.js`), bila proyek terdekat dari
 * `root` (folder dengan package.json) memakai zentara dan CLI itu berbeda dari yang sedang berjalan
 * (`self`). Perintah yang butuh dependency proyek, seperti `db:*` yang memakai drizzle-orm, dijalankan
 * lewat CLI ini: CLI global (`npm install -g zentara`) tidak punya dependency proyek.
 */
export function findLocalCli(root: string, self?: string): string | undefined {
  let dir = path.resolve(root);
  while (!fs.existsSync(path.join(dir, "package.json"))) {
    const parent = path.dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, "package.json"), "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    if (!pkg.dependencies?.zentara && !pkg.devDependencies?.zentara) return undefined;
  } catch {
    return undefined;
  }
  const candidate = path.join(dir, "node_modules", "zentara", "dist", "cli.js");
  const real = safeRealpath(candidate);
  if (!real) return undefined;
  return self && real === safeRealpath(self) ? undefined : candidate;
}

function safeRealpath(file: string): string | undefined {
  try {
    return fs.realpathSync(file);
  } catch {
    return undefined;
  }
}
