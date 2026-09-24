import type { ProviderChain } from "./chain.js";
import type { AgentTool, CommandResult, ToolContext } from "./tools.js";
import { ToolError } from "./tools.js";
import { AbortedError, type ChatMessage, type ToolCall, type ToolResult } from "./types.js";

export interface AgentUI {
  thinking(provider: string): void;
  /**
   * Potongan jawaban yang sedang dialirkan (streaming). Opsional: tanpa ini jawaban hanya muncul utuh
   * lewat assistant(). assistant() tetap dipanggil di akhir dengan teks lengkap.
   */
  assistantDelta?(delta: string): void;
  assistant(text: string, provider: string): void;
  toolStart(call: ToolCall): void;
  toolEnd(call: ToolCall, result: ToolResult): void;
  info(message: string): void;
}

export interface AgentOptions {
  chain: ProviderChain;
  tools: AgentTool[];
  context: ToolContext;
  system: string;
  ui: AgentUI;
  maxSteps?: number;
  /** Berapa kali agen boleh mencoba memperbaiki kegagalan verifikasi otomatis. */
  maxFixAttempts?: number;
  /** Verifikasi akhir setelah ada perubahan file (default: typecheck lalu test). */
  verify?: () => Promise<CommandResult>;
}

export interface AgentResult {
  status: "done" | "incomplete" | "refused" | "verification_failed" | "interrupted";
  changedFiles: string[];
  steps: number;
  providersUsed: string[];
}

const COMPACT_PROMPT =
  "You summarize a conversation between a developer and Zentara AI (a coding assistant working inside the developer's Zentara Core project) so the conversation can continue with a much shorter history. Reply in the developer's language.";
const COMPACT_REQUEST = `Ringkas seluruh percakapan di atas untuk melanjutkan pekerjaan nanti. Jangan memanggil tool. Tulis dalam poin singkat:
- Tujuan dan permintaan pengguna (termasuk yang belum selesai).
- Keputusan penting, dan hal yang pengguna tolak atau tidak setujui.
- File yang dibuat/diubah beserta isi penting singkatnya (nama route, tabel, fungsi).
- Status terakhir: apa yang sudah berhasil, error yang tersisa, langkah berikutnya.
Jangan sertakan isi rahasia atau kode panjang.`;

const WRITE_TOOLS = new Set(["write_file", "edit_file", "delete_file", "install_package", "database"]);

/** Loop agen: kirim percakapan ke model, jalankan tool yang diminta, ulangi sampai selesai. */
export class Agent {
  /** Lupakan percakapan sebelumnya (mis. perintah /clear). */
  reset(): void {
    this.messages.length = 0;
  }

  /** Salinan riwayat percakapan (untuk disimpan). */
  get history(): ChatMessage[] {
    return structuredClone(this.messages);
  }

  /** Ganti riwayat dengan percakapan tersimpan (perintah /resume). */
  load(messages: readonly ChatMessage[]): void {
    this.messages.splice(0, this.messages.length, ...structuredClone(messages as ChatMessage[]));
  }

  /**
   * Ringkas percakapan menjadi satu catatan agar hemat token (perintah /compact, atau otomatis saat
   * percakapan terlalu panjang). Mengembalikan false bila tidak ada yang bisa diringkas.
   */
  async compact(options: { signal?: AbortSignal } = {}): Promise<boolean> {
    if (this.messages.length < 2) return false;
    const turn = await this.options.chain.complete({
      system: COMPACT_PROMPT,
      messages: [...this.messages, { role: "user", text: COMPACT_REQUEST }],
      tools: [],
      signal: options.signal,
    });
    const summary = turn.text.trim();
    if (!summary) throw new Error("Model tidak mengembalikan ringkasan.");
    this.messages.splice(
      0,
      this.messages.length,
      { role: "user", text: `<ringkasan percakapan sebelumnya>\n${summary}\n</ringkasan percakapan sebelumnya>\n\nLanjutkan dari ringkasan ini bila saya meminta sesuatu yang berkaitan.` },
      { role: "assistant", text: "Baik, saya sudah memahami konteks percakapan sebelumnya.", toolCalls: [] },
    );
    return true;
  }

  private readonly messages: ChatMessage[] = [];
  private readonly toolMap: Map<string, AgentTool>;

  constructor(private readonly options: AgentOptions) {
    this.toolMap = new Map(options.tools.map((t) => [t.spec.name, t]));
  }

  /** Percakapan dipertahankan antar pemanggilan, jadi permintaan lanjutan bisa merujuk tugas sebelumnya. */
  async run(task: string, options: { signal?: AbortSignal } = {}): Promise<AgentResult> {
    const { chain, ui, context } = this.options;
    const { signal } = options;
    context.signal = signal;
    const maxSteps = this.options.maxSteps ?? 40;
    const maxFix = this.options.maxFixAttempts ?? 2;
    const verify = this.options.verify ?? (() => defaultVerify(context));
    const providersUsed = new Set<string>();
    const changedBefore = new Set(context.journal.changedFiles);
    let dirty = false;
    let fixAttempts = 0;

    this.messages.push({ role: "user", text: task });

    for (let step = 1; step <= maxSteps; step++) {
      const result = (status: AgentResult["status"]): AgentResult => ({
        status,
        steps: step,
        providersUsed: [...providersUsed],
        changedFiles: context.journal.changedFiles.filter((f) => !changedBefore.has(f)),
      });
      const interrupted = () => {
        // Model harus tahu tugas sebelumnya berhenti di tengah jalan saat pengguna menulis lagi.
        this.messages.push({ role: "user", text: "[Pengguna menghentikan pekerjaan ini. Tunggu permintaan berikutnya.]" });
        this.messages.push({ role: "assistant", text: "Baik, saya berhenti.", toolCalls: [] });
        return result("interrupted");
      };
      if (signal?.aborted) return interrupted();

      ui.thinking(chain.current?.name ?? "?");
      let turn;
      try {
        turn = await chain.complete({
          system: this.options.system,
          messages: this.messages,
          tools: this.options.tools.map((t) => t.spec),
          signal,
          onText: ui.assistantDelta ? (delta) => ui.assistantDelta!(delta) : undefined,
        });
      } catch (err) {
        if (err instanceof AbortedError || signal?.aborted) return interrupted();
        throw err;
      }
      providersUsed.add(turn.provider);
      this.messages.push({ role: "assistant", text: turn.text, toolCalls: turn.toolCalls, native: turn.native });
      if (turn.text.trim()) ui.assistant(turn.text.trim(), turn.provider);

      if (turn.stop === "refusal") {
        ui.info("Model menolak permintaan ini.");
        return result("refused");
      }

      if (turn.toolCalls.length === 0) {
        if (turn.stop === "max_tokens") {
          this.messages.push({ role: "user", text: "Jawabanmu terpotong. Lanjutkan dari bagian terakhir." });
          continue;
        }
        if (!dirty || context.dryRun) return result("done");

        ui.info("Memverifikasi perubahan (typecheck & test)...");
        const check = await verify();
        if (signal?.aborted) return interrupted();
        if (check.ok) {
          ui.info("Verifikasi berhasil.");
          return result("done");
        }
        if (fixAttempts >= maxFix) {
          ui.info("Verifikasi masih gagal setelah beberapa percobaan perbaikan.");
          return result("verification_failed");
        }
        fixAttempts++;
        ui.info(`Verifikasi gagal, meminta AI memperbaiki (percobaan ${fixAttempts}/${maxFix})...`);
        this.messages.push({
          role: "user",
          text: `Verifikasi otomatis gagal. Perbaiki penyebabnya:\n\n${check.output.slice(-5000)}`,
        });
        continue;
      }

      const results: ToolResult[] = [];
      for (const call of turn.toolCalls) {
        ui.toolStart(call);
        let res: ToolResult;
        if (signal?.aborted) {
          res = { id: call.id, isError: true, content: "Dibatalkan: pengguna menghentikan pekerjaan." };
        } else if (turn.stop === "max_tokens") {
          res = { id: call.id, isError: true, content: "Input tool terpotong (max_tokens). Pecah menjadi langkah/file yang lebih kecil." };
        } else {
          res = await this.execute(call);
          if (!res.isError && !context.dryRun && this.mutates(call)) dirty = true;
        }
        ui.toolEnd(call, res);
        results.push(res);
      }
      this.messages.push({ role: "tool_results", results });
      if (signal?.aborted) return interrupted();
    }

    ui.info(`Batas ${maxSteps} langkah tercapai.`);
    return {
      status: "incomplete",
      steps: maxSteps,
      providersUsed: [...providersUsed],
      changedFiles: context.journal.changedFiles.filter((f) => !changedBefore.has(f)),
    };
  }

  private mutates(call: ToolCall): boolean {
    if (WRITE_TOOLS.has(call.name)) return true;
    const tool = this.toolMap.get(call.name);
    const input = call.input;
    if (!tool?.mutates || typeof input !== "object" || input === null || Array.isArray(input)) return false;
    return tool.mutates(input as Record<string, unknown>, this.options.context);
  }

  private async execute(call: ToolCall): Promise<ToolResult> {
    const tool = this.toolMap.get(call.name);
    if (!tool) return { id: call.id, isError: true, content: `Tool tidak dikenal: ${call.name}` };
    const input = call.input;
    if (typeof input !== "object" || input === null || Array.isArray(input) || "__invalid_json__" in input) {
      return { id: call.id, isError: true, content: "Input tool harus berupa object JSON yang valid." };
    }
    try {
      return { id: call.id, content: await tool.run(input as Record<string, unknown>, this.options.context) };
    } catch (err) {
      if (err instanceof ToolError) return { id: call.id, isError: true, content: err.message };
      return { id: call.id, isError: true, content: `Error internal: ${(err as Error).message}` };
    }
  }
}

async function defaultVerify(context: ToolContext): Promise<CommandResult> {
  const outputs: string[] = [];
  for (const script of ["typecheck", "test"]) {
    const r = await context.runScript(script, [], context.signal);
    outputs.push(`$ npm run ${script}\n${r.output}`);
    if (!r.ok) return { ok: false, output: outputs.join("\n\n") };
  }
  return { ok: true, output: outputs.join("\n\n") };
}
