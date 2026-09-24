import type { TokenParam } from "../presets.js";
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
  /** Nama parameter batas token. Default "max_tokens"; OpenAI memakai "max_completion_tokens". */
  tokenParam?: TokenParam;
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

/** Request ditolak server karena isinya (mis. 400), bukan karena provider tidak tersedia. */
class RequestRejectedError extends Error {
  constructor(readonly status: number, readonly detail: string, provider: string) {
    super(`${provider}: request ditolak (${status}) ${detail}`);
  }
}

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
      throw new RequestRejectedError(res.status, detail, this.name);
    }
    try {
      return JSON.parse(body) as unknown;
    } catch (cause) {
      throw new ProviderUnavailableError(this.name, "respons bukan JSON yang valid", { cause });
    }
  }

  /** Daftar ID model yang dilaporkan server (GET /models). */
  async listModels(): Promise<string[]> {
    const list = (await this.request("/models", { method: "GET" })) as { data?: { id?: unknown }[] };
    return (list.data ?? []).map((m) => m.id).filter((id): id is string => typeof id === "string");
  }

  /** Pilih model: dari config, atau model pertama yang dilaporkan server. */
  async model(): Promise<string> {
    if (this.resolvedModel) return this.resolvedModel;
    const id = (await this.listModels())[0];
    if (!id) throw new ProviderUnavailableError(this.name, "server tidak melaporkan model apa pun");
    this.resolvedModel = id;
    return id;
  }

  async check(): Promise<string> {
    if (!this.resolvedModel) return `model ${await this.model()} siap`;
    // Model sudah diatur: pastikan server mengenalnya (bila server mau memberi daftar model).
    const models = await this.listModels().catch((err: unknown) => {
      if (err instanceof ProviderUnavailableError) throw err;
      return undefined;
    });
    if (models && models.length > 0 && !models.includes(this.resolvedModel)) {
      return `terhubung, tapi model "${this.resolvedModel}" tidak ada di daftar model akun ini`;
    }
    return `model ${this.resolvedModel} siap`;
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

  private tokenParam: TokenParam | undefined;

  async complete(request: CompletionRequest): Promise<ModelTurn> {
    const model = await this.model();
    const send = (param: TokenParam) =>
      this.request("/chat/completions", {
        method: "POST",
        body: JSON.stringify({
          model,
          [param]: this.options.maxTokens ?? 16000,
          messages: this.toMessages(request.system, request.messages),
          tools: request.tools.map((t) => ({
            type: "function",
            function: { name: t.name, description: t.description, parameters: t.inputSchema },
          })),
        }),
      }) as Promise<OpenAIResponse>;

    const param = (this.tokenParam ??= this.options.tokenParam ?? "max_tokens");
    let data: OpenAIResponse;
    try {
      data = await send(param);
    } catch (err) {
      // Sebagian model (mis. model reasoning OpenAI) menolak max_tokens dan meminta max_completion_tokens,
      // sebagian server lain sebaliknya: coba sekali dengan parameter yang satunya lalu ingat pilihannya.
      const other: TokenParam = param === "max_tokens" ? "max_completion_tokens" : "max_tokens";
      if (!(err instanceof RequestRejectedError) || err.status !== 400 || !/max_(completion_)?tokens/i.test(err.detail)) throw err;
      data = await send(other);
      this.tokenParam = other;
    }

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
