import { MarkdownLines, type ApprovalAnswer, type HostChoice, type HostUI, type PendingAction, type Tone } from "../repl/host.js";

/** Satu baris/blok di riwayat layar (tidak berubah lagi setelah dicetak). */
export type Item =
  | { id: number; kind: "header" }
  | { id: number; kind: "user"; text: string }
  | { id: number; kind: "assistant"; lines: string[]; first: boolean }
  | { id: number; kind: "tool"; title: string }
  | { id: number; kind: "toolEnd"; summary: string; error: boolean }
  | { id: number; kind: "notice"; text: string; tone: Tone };

/** Item tanpa id (Omit yang tetap membedakan tiap jenis item). */
export type NewItem = Item extends infer I ? (I extends Item ? Omit<I, "id"> : never) : never;

export type Dialog =
  | { kind: "choose"; question: string; choices: HostChoice<unknown>[]; cancel: unknown; resolve: (v: unknown) => void }
  | { kind: "approve"; action: PendingAction; resolve: (v: ApprovalAnswer) => void }
  | { kind: "ask"; question: string; secret: boolean; placeholder?: string; resolve: (v: string | undefined) => void };

export interface State {
  items: Item[];
  /** Baris jawaban AI yang belum lengkap (masih dialirkan). */
  live: string;
  busy?: { label: string; since: number };
  dialog?: Dialog;
  /** Naik setiap kali status host berubah (memicu gambar ulang baris status). */
  version: number;
  /** CLI sedang ditutup: hanya riwayat yang digambar (tanpa kotak input). */
  closing?: boolean;
}

/**
 * Jembatan antara host (di luar React) dan komponen Ink. Host memanggil metode HostUI; komponen
 * berlangganan lewat useSyncExternalStore.
 */
export class Store {
  /**
   * Tampilan layar penuh: log dirender sebagai jendela yang bisa digulir, sehingga boleh dikosongkan.
   * Pada tampilan biasa, riwayat dicetak lewat <Static> yang tidak bisa ditarik kembali.
   */
  constructor(readonly options: { fullscreen?: boolean } = {}) {}

  private state: State = { items: [{ id: 0, kind: "header" }], live: "", version: 0 };
  private readonly listeners = new Set<() => void>();
  private nextId = 1;
  private readonly queue: Dialog[] = [];
  /** Diisi komponen App setelah dipasang (useApp().suspendTerminal). */
  suspendTerminal?: (fn: () => Promise<void>) => Promise<void>;
  private stream: { md: MarkdownLines; pending: string; started: boolean } | undefined;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  get = (): State => this.state;

  private set(patch: Partial<State>): void {
    this.state = { ...this.state, ...patch };
    for (const l of this.listeners) l();
  }

  push(...items: NewItem[]): void {
    const withIds = items.map((item) => ({ ...item, id: this.nextId++ }) as Item);
    this.set({ items: [...this.state.items, ...withIds] });
  }

  private openDialog(dialog: Dialog): void {
    if (this.state.dialog) this.queue.push(dialog);
    else this.set({ dialog });
  }

  /** Tutup dialog aktif dan tampilkan yang mengantre. */
  closeDialog(): void {
    this.set({ dialog: this.queue.shift() });
  }

  /** Kosongkan log di layar (header tetap). Riwayat sebelumnya tetap ada di sesi tersimpan. */
  reset(): void {
    this.stream = undefined;
    this.set({ items: [{ id: this.nextId++, kind: "header" }], live: "" });
  }

  /** Sembunyikan bagian dinamis (input, status) sebelum keluar. */
  close(): void {
    this.set({ closing: true, busy: undefined, live: "", dialog: undefined });
  }

  changed(): void {
    this.set({ version: this.state.version + 1 });
  }

  private flushStreamLine(raw: string): void {
    const s = this.stream!;
    if (!s.started && raw.trim() === "") return;
    const line = s.md.render(raw);
    if (line === undefined) return;
    this.push({ kind: "assistant", lines: [line], first: !s.started });
    s.started = true;
  }

  /** Implementasi HostUI yang diteruskan ke createReplHost. */
  readonly ui: HostUI = {
    thinking: () => {
      this.stream = undefined;
      this.set({ live: "", busy: { label: "Berpikir", since: this.state.busy?.since ?? Date.now() } });
    },
    delta: (text) => {
      const s = (this.stream ??= { md: new MarkdownLines(), pending: "", started: false });
      s.pending += text;
      let nl: number;
      while ((nl = s.pending.indexOf("\n")) !== -1) {
        this.flushStreamLine(s.pending.slice(0, nl));
        s.pending = s.pending.slice(nl + 1);
      }
      this.set({ live: s.pending, busy: { label: "Menulis", since: this.state.busy?.since ?? Date.now() } });
    },
    assistant: (_text, rendered) => {
      const s = this.stream;
      this.stream = undefined;
      if (s) {
        this.stream = s;
        if (s.pending.trim()) this.flushStreamLine(s.pending);
        this.stream = undefined;
      } else {
        this.push({ kind: "assistant", lines: rendered.split("\n"), first: true });
      }
      this.set({ live: "" });
    },
    toolStart: (_call, title) => {
      this.push({ kind: "tool", title });
      this.set({ busy: { label: "Bekerja", since: this.state.busy?.since ?? Date.now() } });
    },
    toolEnd: (_call, result, summary) => this.push({ kind: "toolEnd", summary, error: Boolean(result.isError) }),
    notice: (text, tone = "info") => {
      this.stream = undefined;
      this.push({ kind: "notice", text, tone });
    },
    approve: (action, signal) =>
      new Promise<ApprovalAnswer>((resolve) => {
        if (signal?.aborted) return resolve("no");
        let done = false;
        const finish = (v: ApprovalAnswer) => {
          if (done) return;
          done = true;
          signal?.removeEventListener("abort", onAbort);
          resolve(v);
        };
        const onAbort = () => {
          if (this.state.dialog?.kind === "approve" && this.state.dialog.action === action) this.closeDialog();
          finish("no");
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        this.openDialog({ kind: "approve", action, resolve: finish });
      }),
    choose: <T>(question: string, choices: HostChoice<T>[], cancel: T) =>
      new Promise<T>((resolve) => this.openDialog({ kind: "choose", question, choices, cancel, resolve: resolve as (v: unknown) => void })),
    ask: (question, options = {}) =>
      new Promise<string | undefined>((resolve) => this.openDialog({ kind: "ask", question, secret: Boolean(options.secret), placeholder: options.placeholder, resolve })),
    busy: (label) => this.set({ busy: label ? { label, since: this.state.busy?.since ?? Date.now() } : undefined }),
    changed: () => this.changed(),
    clear: () => {
      if (this.options.fullscreen) this.reset();
    },
    suspend: async <T>(fn: () => Promise<T>): Promise<T> => {
      if (!this.suspendTerminal) return fn();
      let result!: T;
      await this.suspendTerminal(async () => {
        result = await fn();
      });
      return result;
    },
  };
}
