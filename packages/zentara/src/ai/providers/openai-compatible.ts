import {
  ProviderUnavailableError,
  safeToolId,
  type ChatMessage,
  type CompletionRequest,
  type ModelProvider,
  type ModelTurn,
} from "../types.js";

/**
 * Adapter untuk API berformat OpenAI Chat Completions. Satu adapter ini mencakup
 * OmniRoute (gateway multi-provider), Ollama, LM Studio, OpenRouter, dan sejenisnya.
 */
export interface OpenAICompatibleOptions {
  name: string;
  /** Mis. "http://localhost:20128/v1" (OmniRoute) atau "http://localhost:11434/v1" (Ollama). */
  baseUrl: string;
  /** Kosongkan untuk memakai model pertama dari GET /models. */
  model?: string;
  apiKey?: string;
  maxTokens?: number;
  timeoutMs?: number;
  fetch?: typeof fetch;
}

interface OpenAIToolCall {
  id?: string;
  type?: string;
  function?: { name?: string; arguments?: string };
}

interface OpenAIResponse {
  model?: string;
  choices?: { message?: { content?: string | null; tool_calls?: OpenAIToolCall[] }; finish_reason?: string }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

const UNAVAILABLE_STATUS = new Set([401, 402, 403, 404, 408, 429]);

export class OpenAICompatibleProvider implements ModelProvider {
  readonly name: string;
  private resolvedModel: string | undefined;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly options: OpenAICompatibleOptions) {
    this.name = options.name;
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.resolvedModel = options.model;
    this.fetchImpl = options.fetch ?? fetch;
  }

  describe(): string {
    return `${this.baseUrl} (${this.resolvedModel ?? "model otomatis"})`;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.options.apiKey) h.Authorization = `Bearer ${this.options.apiKey}`;
    return h;
  }

  private async request(path: string, init: RequestInit): Promise<unknown> {
    let res: Response;
    try {
      res = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: this.headers(),
        signal: AbortSignal.timeout(this.options.timeoutMs ?? 5 * 60 * 1000),
      });
    } catch (cause) {
      const timeout = cause instanceof Error && cause.name === "TimeoutError";
      throw new ProviderUnavailableError(this.name, timeout ? "timeout" : `tidak bisa terhubung ke ${this.baseUrl}`, { cause });
    }
    const body = await res.text();
    if (!res.ok) {
      const detail = body.slice(0, 300).replace(/\s+/g, " ");
      if (UNAVAILABLE_STATUS.has(res.status) || res.status >= 500) {
        const label = res.status === 402 ? "kredit habis" : res.status === 429 ? "kuota/rate limit habis" : "tidak tersedia";
        throw new ProviderUnavailableError(this.name, `${label} (${res.status}) ${detail}`.trim());
      }
      throw new Error(`${this.name}: request ditolak (${res.status}) ${detail}`);
    }
    try {
      return JSON.parse(body) as unknown;
    } catch (cause) {
      throw new ProviderUnavailableError(this.name, "respons bukan JSON yang valid", { cause });
    }
  }

  /** Pilih model: dari config, atau model pertama yang dilaporkan server. */
  async model(): Promise<string> {
    if (this.resolvedModel) return this.resolvedModel;
    const list = (await this.request("/models", { method: "GET" })) as { data?: { id?: string }[] };
    const id = list.data?.find((m) => typeof m.id === "string")?.id;
    if (!id) throw new ProviderUnavailableError(this.name, "server tidak melaporkan model apa pun");
    this.resolvedModel = id;
    return id;
  }

  async check(): Promise<string> {
    return `model ${await this.model()} siap`;
  }

  private toMessages(system: string, messages: ChatMessage[]): unknown[] {
    const out: unknown[] = [{ role: "system", content: system }];
    for (const m of messages) {
      if (m.role === "user") out.push({ role: "user", content: m.text });
      else if (m.role === "tool_results") {
        m.results.forEach((r, i) =>
          out.push({ role: "tool", tool_call_id: safeToolId(r.id, i), content: r.isError ? `ERROR: ${r.content}` : r.content }),
        );
      } else {
        const msg: Record<string, unknown> = { role: "assistant", content: m.text || null };
        if (m.toolCalls.length) {
          msg.tool_calls = m.toolCalls.map((c, i) => ({
            id: safeToolId(c.id, i),
            type: "function",
            function: { name: c.name, arguments: JSON.stringify(c.input ?? {}) },
          }));
        }
        out.push(msg);
      }
    }
    return out;
  }

  async complete(request: CompletionRequest): Promise<ModelTurn> {
    const model = await this.model();
    const data = (await this.request("/chat/completions", {
      method: "POST",
      body: JSON.stringify({
        model,
        max_tokens: this.options.maxTokens ?? 16000,
        messages: this.toMessages(request.system, request.messages),
        tools: request.tools.map((t) => ({
          type: "function",
          function: { name: t.name, description: t.description, parameters: t.inputSchema },
        })),
      }),
    })) as OpenAIResponse;

    const choice = data.choices?.[0];
    if (!choice?.message) throw new ProviderUnavailableError(this.name, "respons tidak berisi jawaban");

    const toolCalls: ModelTurn["toolCalls"] = [];
    for (const [i, call] of (choice.message.tool_calls ?? []).entries()) {
      const name = call.function?.name;
      if (!name) continue;
      let input: unknown;
      try {
        input = call.function?.arguments ? (JSON.parse(call.function.arguments) as unknown) : {};
      } catch {
        // Argumen rusak tetap diteruskan agar agen bisa membalas dengan error dan model memperbaikinya.
        input = { __invalid_json__: call.function?.arguments ?? "" };
      }
      toolCalls.push({ id: call.id || `call_${i}`, name, input });
    }

    const finish = choice.finish_reason;
    return {
      text: choice.message.content ?? "",
      toolCalls,
      stop: toolCalls.length ? "tool_use" : finish === "length" ? "max_tokens" : finish === "content_filter" ? "refusal" : "end",
      model: data.model ?? model,
      usage: data.usage
        ? { inputTokens: data.usage.prompt_tokens ?? 0, outputTokens: data.usage.completion_tokens ?? 0 }
        : undefined,
    };
  }
}
