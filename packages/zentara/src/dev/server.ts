import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { platformCommand } from "../process.js";

export interface DevServerOptions {
  cwd: string;
  /** Environment proses server (salin sebelum .env dimuat ke proses CLI). */
  env: NodeJS.ProcessEnv;
  /** Perintah pengganti bila proyek tidak punya skrip "dev" (mis. node cli.js dev). */
  fallback: { command: string; args: string[] };
  maxLogLines?: number;
}

export type DevServerState = "stopped" | "starting" | "running" | "crashed";

// Warna ANSI dari output server tidak berguna di log yang disimpan.
const ANSI = /\x1b\[[0-9;]*m/g;
const READY = /Running at (https?:\/\/\S+)/;
const ERROR_LINE = /\[ERROR\]|Boot error|Error:|⚠ Aplikasi gagal/;

/**
 * Server pengembangan (`npm run dev`) yang berjalan di latar belakang CLI interaktif.
 * Output-nya disimpan (bisa dilihat dengan /logs dan dibaca AI), tidak dicetak ke layar.
 *
 * Event: "ready" (url), "problem" (baris log berisi error), "exit" (kode).
 */
export class DevServer extends EventEmitter {
  private child: ChildProcess | undefined;
  private readonly lines: string[] = [];
  private partial = "";
  state: DevServerState = "stopped";
  url: string | undefined;

  constructor(private readonly options: DevServerOptions) {
    super();
  }

  /** Perintah yang dijalankan, untuk ditampilkan ke pengguna. */
  get commandText(): string {
    return this.hasDevScript() ? "npm run dev" : "zentara dev";
  }

  private hasDevScript(): boolean {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(this.options.cwd, "package.json"), "utf8")) as { scripts?: Record<string, string> };
      return Boolean(pkg.scripts?.dev);
    } catch {
      return false;
    }
  }

  start(): void {
    if (this.child) return;
    const { command, args, shell } = this.hasDevScript()
      ? platformCommand("npm", ["run", "dev"])
      : { ...this.options.fallback, shell: false };
    this.state = "starting";
    this.url = undefined;
    this.log(`$ ${this.commandText}`);
    const child = spawn(command, args, {
      cwd: this.options.cwd,
      env: { ...this.options.env, FORCE_COLOR: "0", NO_COLOR: "1" },
      shell,
      stdio: ["ignore", "pipe", "pipe"],
      // Grup proses sendiri agar seluruh pohon (npm → zentara dev → tsx → server) bisa dihentikan.
      detached: process.platform !== "win32",
      windowsHide: true,
    });
    this.child = child;
    child.stdout?.on("data", (chunk: Buffer) => this.onData(chunk));
    child.stderr?.on("data", (chunk: Buffer) => this.onData(chunk));
    child.on("error", (err) => {
      this.log(`Gagal menjalankan server: ${err.message}`);
      this.emit("problem", err.message);
    });
    child.on("exit", (code) => {
      if (this.child !== child) return;
      this.child = undefined;
      this.state = code === 0 || code === null ? "stopped" : "crashed";
      this.log(`(server berhenti, kode ${code ?? "-"})`);
      this.emit("exit", code);
    });
  }

  private onData(chunk: Buffer): void {
    const text = this.partial + chunk.toString().replace(ANSI, "");
    const parts = text.split(/\r?\n/);
    this.partial = parts.pop() ?? "";
    for (const line of parts) {
      this.log(line);
      const ready = READY.exec(line);
      if (ready) {
        this.url = ready[1]!;
        this.state = "running";
        this.emit("ready", this.url);
      } else if (ERROR_LINE.test(line)) {
        this.emit("problem", line);
      }
    }
  }

  private log(line: string): void {
    this.lines.push(line);
    const max = this.options.maxLogLines ?? 500;
    if (this.lines.length > max) this.lines.splice(0, this.lines.length - max);
  }

  logs(count = 60): string[] {
    return this.lines.slice(-count);
  }

  get running(): boolean {
    return Boolean(this.child);
  }

  /** Hentikan seluruh pohon proses server. */
  stop(): Promise<void> {
    const child = this.child;
    if (!child || child.pid === undefined) return Promise.resolve();
    this.child = undefined;
    this.state = "stopped";
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        killTree(child.pid!, "SIGKILL");
        resolve();
      }, 4000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      killTree(child.pid!, "SIGTERM");
    });
  }
}

function killTree(pid: number, signal: NodeJS.Signals): void {
  try {
    if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    else process.kill(-pid, signal);
  } catch {
    // Sudah berhenti.
  }
}

/** Cek apakah sudah ada server yang menjawab di alamat ini (mis. `npm run dev` di terminal lain). */
export async function isServerUp(url: string, timeoutMs = 800): Promise<boolean> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(timeoutMs), method: "HEAD" });
    return true;
  } catch {
    return false;
  }
}

/** Buka URL di browser bawaan sistem. */
export function openBrowser(url: string): void {
  const [command, args] =
    process.platform === "win32" ? ["cmd", ["/c", "start", "", url]] : process.platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  try {
    spawn(command as string, args as string[], { stdio: "ignore", detached: true, windowsHide: true }).unref();
  } catch {
    // Tidak ada browser: pengguna bisa membuka URL-nya sendiri.
  }
}
