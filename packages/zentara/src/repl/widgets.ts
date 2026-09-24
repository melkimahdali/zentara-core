import readline from "node:readline";
import { accent, c } from "../ai/terminal.js";

export interface Key {
  name?: string;
  ctrl?: boolean;
  meta?: boolean;
  shift?: boolean;
  sequence?: string;
}
type KeyHandler = (str: string | undefined, key: Key) => void;

/**
 * Pembaca tombol mentah (raw mode) untuk saat AI bekerja: Esc/Ctrl+C menghentikan,
 * dan menu pilihan dengan panah. Tidak aktif saat readline sedang meminta input.
 */
export class Keys {
  private readonly handlers: KeyHandler[] = [];
  private active = false;

  constructor(private readonly input: NodeJS.ReadStream = process.stdin) {}

  push(handler: KeyHandler): () => void {
    this.handlers.push(handler);
    this.ensure();
    return () => {
      const i = this.handlers.lastIndexOf(handler);
      if (i !== -1) this.handlers.splice(i, 1);
      if (this.handlers.length === 0) this.release();
    };
  }

  private readonly onKey = (str: string | undefined, key: Key | undefined) => {
    this.handlers.at(-1)?.(str, key ?? { sequence: str });
  };

  private ensure(): void {
    if (this.active) return;
    readline.emitKeypressEvents(this.input);
    if (this.input.isTTY) this.input.setRawMode(true);
    this.input.on("keypress", this.onKey);
    this.input.resume();
    this.active = true;
  }

  private release(): void {
    if (!this.active) return;
    this.input.off("keypress", this.onKey);
    if (this.input.isTTY) this.input.setRawMode(false);
    this.input.pause();
    this.active = false;
  }
}

const FRAMES = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];

/** Indikator "sedang bekerja" satu baris, gaya Claude Code: ✻ Berpikir… (5s · esc untuk berhenti). */
export class Spinner {
  private timer: NodeJS.Timeout | undefined;
  private frame = 0;
  private started = 0;
  private label = "";
  private visible = false;

  constructor(private readonly output: NodeJS.WriteStream = process.stdout) {}

  start(label: string): void {
    this.label = label;
    if (!this.started) this.started = Date.now();
    if (!this.output.isTTY) return;
    if (!this.timer) this.timer = setInterval(() => this.render(), 120);
    this.render();
  }

  /** Hapus baris spinner (sebelum mencetak teks lain). Spinner bisa dilanjutkan dengan start(). */
  clear(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
    if (this.visible) {
      this.output.write("\r\x1b[2K");
      this.visible = false;
    }
  }

  stop(): void {
    this.clear();
    this.started = 0;
  }

  private render(): void {
    const seconds = Math.floor((Date.now() - this.started) / 1000);
    const glyph = FRAMES[this.frame++ % FRAMES.length]!;
    const width = this.output.columns ?? 80;
    const text = `${glyph} ${this.label}… (${seconds}s · esc untuk berhenti)`.slice(0, Math.max(10, width - 1));
    this.output.write(`\r\x1b[2K${accent(text.slice(0, 1))}${c.dim(text.slice(1))}`);
    this.visible = true;
  }
}

export interface Choice<T> {
  label: string;
  value: T;
  hint?: string;
}

/**
 * Menu pilihan dengan panah/angka/Enter; Esc memilih `cancel`. Setelah memilih, menu
 * diringkas menjadi satu baris jawaban.
 */
export function select<T>(keys: Keys, question: string, choices: Choice<T>[], cancel: T, output: NodeJS.WriteStream = process.stdout): Promise<T> {
  return new Promise((resolve) => {
    let index = 0;
    let drawn = 0;
    const draw = () => {
      if (drawn) output.write(`\x1b[${drawn}A\r\x1b[J`);
      const lines = [c.bold(question)];
      choices.forEach((choice, i) => {
        const active = i === index;
        const label = `${i + 1}. ${choice.label}`;
        lines.push(`${active ? accent("❯") : " "} ${active ? accent(label) : label}${choice.hint ? c.dim(`  ${choice.hint}`) : ""}`);
      });
      lines.push(c.dim("  ↑/↓ pilih · Enter setuju · Esc batal"));
      output.write(lines.map((l) => `  ${l}`).join("\n") + "\n");
      drawn = lines.length;
    };
    const finish = (value: T, label: string) => {
      release();
      if (drawn) output.write(`\x1b[${drawn}A\r\x1b[J`);
      output.write(`  ${c.bold(question)} ${c.dim(label)}\n`);
      resolve(value);
    };
    const release = keys.push((str, key) => {
      if (key.name === "up" || key.name === "k") index = (index - 1 + choices.length) % choices.length;
      else if (key.name === "down" || key.name === "j" || key.name === "tab") index = (index + 1) % choices.length;
      else if (key.name === "return" || key.name === "enter") return finish(choices[index]!.value, choices[index]!.label);
      else if (key.name === "escape" || (key.ctrl && key.name === "c")) return finish(cancel, "dibatalkan");
      else if (str && /^[1-9]$/.test(str) && Number(str) <= choices.length) {
        const choice = choices[Number(str) - 1]!;
        return finish(choice.value, choice.label);
      } else return;
      draw();
    });
    draw();
  });
}
