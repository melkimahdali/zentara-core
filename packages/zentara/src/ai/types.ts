import { t } from "../i18n/index.js";

/**
 * Format percakapan netral yang dipakai agen Zentara. Setiap provider menerjemahkannya
 * ke format API-nya sendiri, sehingga percakapan bisa berpindah provider di tengah tugas.
 */

export interface ToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface ToolResult {
  id: string;
  content: string;
  isError?: boolean;
}

export type ChatMessage =
  | { role: "user"; text: string }
  | {
      role: "assistant";
      text: string;
      toolCalls: ToolCall[];
      /** Konten asli dari provider (mis. blok thinking Claude) untuk dikirim ulang apa adanya ke provider yang sama. */
      native?: { provider: string; content: unknown };
    }
  | { role: "tool_results"; results: ToolResult[] };

export interface ToolSpec {
  name: string;
  description: string;
  /** JSON Schema object untuk input tool. */
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
}

export type StopReason = "end" | "tool_use" | "max_tokens" | "refusal";

export interface ModelTurn {
  text: string;
  toolCalls: ToolCall[];
  stop: StopReason;
  native?: { provider: string; content: unknown };
  /** Model yang benar-benar menjawab (bisa berbeda karena fallback). */
  model?: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface CompletionRequest {
  system: string;
  messages: ChatMessage[];
  tools: ToolSpec[];
  /** Dihentikan pengguna (Esc/Ctrl+C di terminal, tombol Berhenti di browser). */
  signal?: AbortSignal;
  /**
   * Bila diisi, provider mengalirkan (streaming) jawaban dan memanggil fungsi ini untuk setiap potongan
   * teks yang baru diterima. Hasil akhir tetap dikembalikan utuh oleh complete().
   */
  onText?: (delta: string) => void;
}

export interface ModelProvider {
  /** Nama unik provider di config, mis. "claude" atau "omniroute". */
  readonly name: string;
  describe(): string;
  complete(request: CompletionRequest): Promise<ModelTurn>;
  /** Cek ketersediaan tanpa memakai token. Melempar ProviderUnavailableError bila tidak siap. */
  check(): Promise<string>;
}

/**
 * Provider tidak bisa dipakai saat ini (kredit/kuota habis, server mati, kredensial tidak ada).
 * Rantai provider akan pindah ke provider berikutnya. Error lain dianggap bug dan tidak memicu fallback.
 */
export class ProviderUnavailableError extends Error {
  constructor(
    readonly provider: string,
    readonly reason: string,
    options: { cause?: unknown } = {},
  ) {
    super(`${provider}: ${reason}`, options);
    this.name = "ProviderUnavailableError";
  }
}

/** Pekerjaan AI dihentikan oleh pengguna. Tidak memicu fallback ke provider lain. */
export class AbortedError extends Error {
  constructor() {
    super(t().ai.agent.interrupted);
    this.name = "AbortedError";
  }
}

/** ID tool call yang aman untuk semua provider (Claude hanya menerima [A-Za-z0-9_-]). */
export function safeToolId(id: string, index: number): string {
  const cleaned = id.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
  return cleaned || `call_${index}`;
}
