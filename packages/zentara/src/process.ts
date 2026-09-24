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
