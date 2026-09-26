import readline from "node:readline";
import { accent, c } from "../ai/terminal.js";
import { t } from "../i18n/index.js";

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
    const text = `${glyph} ${t().tui.spinner(this.label, seconds)}`.slice(0, Math.max(10, width - 1));
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
 * Menu pilihan gaya ZCode/Claude Code: label di kiri, keterangan di kolom kanan. ↑/↓ lalu Enter,
 * angka untuk memilih langsung, ketik huruf untuk mencari, Esc memilih `cancel`. Setelah memilih,
 * menu diringkas menjadi satu baris jawaban.
 */
export function select<T>(keys: Keys, question: string, choices: Choice<T>[], cancel: T, output: NodeJS.WriteStream = process.stdout): Promise<T> {
  return new Promise((resolve) => {
    let index = 0;
    let drawn = 0;
    let filter = "";
    const labelWidth = Math.max(...choices.map((c) => c.label.length)) + 3;
    const visible = () => (filter ? choices.filter((c) => `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(filter.toLowerCase())) : choices);
    const draw = () => {
      if (drawn) output.write(`\x1b[${drawn}A\r\x1b[J`);
      const list = visible();
      if (index >= list.length) index = Math.max(0, list.length - 1);
      const width = (output.columns ?? 100) - 4;
      const lines = [c.bold(question)];
      if (filter) lines.push(c.dim(t().tui.search(filter)));
      if (list.length === 0) lines.push(c.dim(` ${t().tui.noMatch}`));
      list.forEach((choice, i) => {
        const active = i === index;
        const label = choice.label.padEnd(labelWidth);
        const hint = choice.hint ? choice.hint.slice(0, Math.max(0, width - labelWidth - 2)) : "";
        lines.push(`${active ? accent("→") : " "} ${active ? accent(label) : label}${hint ? (active ? hint : c.dim(hint)) : ""}`);
      });
      lines.push("", c.dim(t().tui.menuHelpSkip));
      output.write(lines.map((l) => (l ? `  ${l}` : l)).join("\n") + "\n");
      drawn = lines.length;
    };
    const finish = (value: T, label: string) => {
      release();
      if (drawn) output.write(`\x1b[${drawn}A\r\x1b[J`);
      output.write(`  ${c.bold(question)} ${c.dim(label)}\n`);
      resolve(value);
    };
    const release = keys.push((str, key) => {
      const list = visible();
      if (key.name === "up") index = (index - 1 + Math.max(1, list.length)) % Math.max(1, list.length);
      else if (key.name === "down" || key.name === "tab") index = (index + 1) % Math.max(1, list.length);
      else if (key.name === "return" || key.name === "enter") {
        const choice = list[index];
        if (choice) return finish(choice.value, choice.label);
        return;
      } else if (key.name === "escape" || (key.ctrl && key.name === "c")) return finish(cancel, t().tui.skipped);
      else if (key.name === "backspace") filter = filter.slice(0, -1);
      else if (!filter && str && /^[1-9]$/.test(str) && Number(str) <= list.length) {
        const choice = list[Number(str) - 1]!;
        return finish(choice.value, choice.label);
      } else if (str && !key.ctrl && !key.meta && /^[\p{L}\p{N} ]$/u.test(str)) {
        filter += str;
        index = 0;
      } else return;
      draw();
    });
    draw();
  });
}

/** Kotak header gaya ZCode: judul di garis atas, keterangan di garis bawah. */
export function box(title: string, lines: string[], footer: string, columns = process.stdout.columns ?? 80): string[] {
  const width = Math.max(40, Math.min(columns - 2, 78));
  const inner = width - 4;
  const vis = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "").length;
  const fit = (s: string) => {
    if (vis(s) <= inner) return s + " ".repeat(inner - vis(s));
    // Potong teks polos yang terlalu panjang (baris berwarna dijaga pendek oleh pemanggil).
    const plain = s.replace(/\x1b\[[0-9;]*m/g, "");
    return plain.slice(0, inner - 1) + "…";
  };
  const top = `${c.gray("╭─")} ${title} ${c.gray("─".repeat(Math.max(0, width - vis(title) - 5)) + "╮")}`;
  const bottom = `${c.gray("╰─")} ${c.dim(footer)} ${c.gray("─".repeat(Math.max(0, width - vis(footer) - 5)) + "╯")}`;
  return [top, ...lines.map((l) => `${c.gray("│")} ${fit(l)} ${c.gray("│")}`), bottom];
}

/**
 * Baris kursor saat ini (1 = paling atas) lewat permintaan posisi kursor ANSI (DSR).
 * Dipakai untuk menaruh kolom input di bagian bawah jendela seperti Claude Code.
 */
export function cursorRow(input: NodeJS.ReadStream = process.stdin, output: NodeJS.WriteStream = process.stdout, timeoutMs = 300): Promise<number | undefined> {
  if (!input.isTTY || !output.isTTY) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    const wasRaw = input.isRaw;
    let buffer = "";
    const done = (row: number | undefined) => {
      clearTimeout(timer);
      input.off("data", onData);
      input.setRawMode(wasRaw);
      input.pause();
      resolve(row);
    };
    const onData = (chunk: Buffer) => {
      buffer += chunk.toString();
      const m = /\x1b\[(\d+);(\d+)R/.exec(buffer);
      if (m) done(Number(m[1]));
    };
    const timer = setTimeout(() => done(undefined), timeoutMs);
    input.setRawMode(true);
    input.on("data", onData);
    input.resume();
    output.write("\x1b[6n");
  });
}
