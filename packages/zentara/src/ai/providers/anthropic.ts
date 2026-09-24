import Anthropic from "@anthropic-ai/sdk";
import {
  AbortedError,
  ProviderUnavailableError,
  safeToolId,
  type ChatMessage,
  type CompletionRequest,
  type ModelProvider,
  type ModelTurn,
  type StopReason,
} from "../types.js";

export interface AnthropicProviderOptions {
  name?: string;
  /** Default: env ANTHROPIC_API_KEY (atau kredensial lain yang dikenali SDK). */
  apiKey?: string;
  model?: string;
  effort?: "low" | "medium" | "high" | "xhigh" | "max";
  maxTokens?: number;
  baseURL?: string;
  maxRetries?: number;
  timeoutMs?: number;
}

export const DEFAULT_CLAUDE_MODEL = "claude-opus-5";
const FALLBACK_BETA = "server-side-fallback-2026-07-01";

function hasCredentialEnv(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN || process.env.ANTHROPIC_PROFILE);
}

/** Status yang berarti "provider ini sedang tidak bisa dipakai" sehingga agen pindah ke provider berikutnya. */
function unavailableReason(err: unknown, hasExplicitKey = false): string | undefined {
  if (err instanceof Anthropic.APIConnectionError) return "tidak bisa terhubung ke API Claude";
  if (err instanceof Anthropic.AuthenticationError) return "API key tidak ada atau tidak valid (401)";
  if (err instanceof Anthropic.PermissionDeniedError) return "akses ditolak (403)";
  if (err instanceof Anthropic.NotFoundError) return "model tidak tersedia untuk akun ini (404)";
  if (err instanceof Anthropic.RateLimitError) return "batas kuota/rate limit tercapai (429)";
  if (err instanceof Anthropic.InternalServerError) return `server Claude bermasalah (${err.status})`;
  if (err instanceof Anthropic.APIError) {
    if (err.status === 402 || err.type === "billing_error") return "kredit habis (402)";
    return undefined;
  }
  // Error di sisi client sebelum request terkirim (SDK tidak menemukan kredensial apa pun).
  if (err instanceof Error && !hasExplicitKey && !hasCredentialEnv()) return "API key belum diatur (isi ANTHROPIC_API_KEY di .env)";
  if (err instanceof Anthropic.AnthropicError) return err.message;
  return undefined;
}

function mapStop(reason: string | null): StopReason {
  switch (reason) {
    case "tool_use":
      return "tool_use";
    case "max_tokens":
      return "max_tokens";
    case "refusal":
      return "refusal";
    default:
      return "end";
  }
}

export class AnthropicProvider implements ModelProvider {
  readonly name: string;
  private readonly model: string;
  private client: Anthropic | undefined;

  constructor(private readonly options: AnthropicProviderOptions = {}) {
    this.name = options.name ?? "claude";
    this.model = options.model ?? DEFAULT_CLAUDE_MODEL;
  }

  describe(): string {
    return `Claude API (${this.model})`;
  }

  private getClient(): Anthropic {
    this.client ??= new Anthropic({
      apiKey: this.options.apiKey ?? process.env.ANTHROPIC_API_KEY ?? null,
      baseURL: this.options.baseURL,
      maxRetries: this.options.maxRetries ?? 2,
      timeout: this.options.timeoutMs ?? 10 * 60 * 1000,
    });
    return this.client;
  }

  private toMessages(messages: ChatMessage[]): Anthropic.Beta.BetaMessageParam[] {
    const out: Anthropic.Beta.BetaMessageParam[] = [];
    for (const m of messages) {
      if (m.role === "user") {
        out.push({ role: "user", content: m.text });
      } else if (m.role === "tool_results") {
        out.push({
          role: "user",
          content: m.results.map((r, i) => ({
            type: "tool_result" as const,
            tool_use_id: safeToolId(r.id, i),
            content: r.content,
            is_error: r.isError ?? false,
          })),
        });
      } else if (m.native?.provider === this.name) {
        // Kirim ulang konten asli (termasuk blok thinking) tanpa diubah.
        out.push({ role: "assistant", content: m.native.content as Anthropic.Beta.BetaContentBlockParam[] });
      } else {
        const content: Anthropic.Beta.BetaContentBlockParam[] = [];
        if (m.text.trim()) content.push({ type: "text", text: m.text });
        m.toolCalls.forEach((c, i) =>
          content.push({ type: "tool_use", id: safeToolId(c.id, i), name: c.name, input: c.input ?? {} }),
        );
        if (content.length === 0) content.push({ type: "text", text: "(kosong)" });
        out.push({ role: "assistant", content });
      }
    }
    return out;
  }

  async check(): Promise<string> {
    try {
      const model = await this.getClient().models.retrieve(this.model);
      return `${model.display_name} siap`;
    } catch (err) {
      const reason = unavailableReason(err, Boolean(this.options.apiKey));
      if (reason) throw new ProviderUnavailableError(this.name, reason, { cause: err });
      throw err;
    }
  }

  async complete(request: CompletionRequest): Promise<ModelTurn> {
    let response: Anthropic.Beta.BetaMessage;
    const params = {
      model: this.model,
      max_tokens: this.options.maxTokens ?? 16000,
      system: request.system,
      ...(request.tools.length ? { tools: request.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema })) } : {}),
      messages: this.toMessages(request.messages),
      output_config: { effort: this.options.effort ?? "high" },
      // Riwayat percakapan dikirim ulang di setiap langkah; cache membuat langkah berikutnya jauh lebih murah.
      cache_control: { type: "ephemeral" },
      // Bila model utama menolak karena kebijakan keamanan, API mengulang otomatis di model cadangan.
      betas: [FALLBACK_BETA],
      fallbacks: "default",
    } satisfies Anthropic.Beta.MessageCreateParamsNonStreaming;
    try {
      if (request.onText) {
        const onText = request.onText;
        const stream = this.getClient().beta.messages.stream(params, { signal: request.signal });
        stream.on("text", (delta) => onText(delta));
        response = await stream.finalMessage();
      } else {
        response = await this.getClient().beta.messages.create(params, { signal: request.signal });
      }
    } catch (err) {
      if (request.signal?.aborted) throw new AbortedError();
      const reason = unavailableReason(err, Boolean(this.options.apiKey));
      if (reason) throw new ProviderUnavailableError(this.name, reason, { cause: err });
      throw err;
    }

    let text = "";
    const toolCalls: ModelTurn["toolCalls"] = [];
    for (const block of response.content) {
      if (block.type === "text") text += block.text;
      else if (block.type === "tool_use") toolCalls.push({ id: block.id, name: block.name, input: block.input });
    }
    return {
      text,
      toolCalls,
      stop: mapStop(response.stop_reason),
      native: { provider: this.name, content: response.content },
      model: response.model,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  }
}
