import type { TokenParam } from "../presets.js";
import { t } from "../../i18n/index.js";
import {
  AbortedError,
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

interface StreamChunk {
  model?: string;
  error?: unknown;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  choices?: {
    delta?: { content?: string | null; tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[] };
    finish_reason?: string | null;
  }[];
}

export interface ModelInfo {
  id: string;
  created?: number;
}

/**
 * Lama tunggu (ms) untuk 429 sesaat, dari header retry-after / retry-after-ms atau teks "try again in 1.3s".
 * undefined = jangan coba ulang (kuota/kredit habis, atau server minta menunggu terlalu lama).
 */
export function rateLimitDelay(res: Response, body: string): number | undefined {
  if (/insufficient_quota|billing|credit|quota exceeded|exceeded your current quota/i.test(body)) return undefined;
  const ms = Number(res.headers.get("retry-after-ms"));
  const sec = Number(res.headers.get("retry-after"));
  const text = /try again in (\d+(?:\.\d+)?)\s*(ms|s)\b/i.exec(body);
  const wait = Number.isFinite(ms) && ms > 0 ? ms : Number.isFinite(sec) && sec > 0 ? sec * 1000 : text ? Number(text[1]) * (text[2] === "ms" ? 1 : 1000) : 2000;
  return wait > 30_000 ? undefined : Math.max(250, wait + 250);
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AbortedError());
    const timer = setTimeout(done, ms);
    function done() {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }
    function onAbort() {
      clearTimeout(timer);
      reject(new AbortedError());
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
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
    return `${this.baseUrl} (${this.resolvedModel ?? t().ai.providers.autoModel})`;
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (this.options.apiKey) h.Authorization = `Bearer ${this.options.apiKey}`;
    return h;
  }

  /** Kirim request dengan penanganan 429 sesaat; mengembalikan respons sukses yang body-nya belum dibaca. */
  private async send(path: string, init: RequestInit, signal?: AbortSignal): Promise<Response> {
    let res: Response;
    let body = "";
    for (let attempt = 0; ; attempt++) {
      const timeout = AbortSignal.timeout(this.options.timeoutMs ?? 5 * 60 * 1000);
      try {
        res = await this.fetchImpl(`${this.baseUrl}${path}`, {
          ...init,
          headers: this.headers(),
          signal: signal ? AbortSignal.any([timeout, signal]) : timeout,
        });
      } catch (cause) {
        if (signal?.aborted) throw new AbortedError();
        const timedOut = cause instanceof Error && cause.name === "TimeoutError";
        throw new ProviderUnavailableError(this.name, timedOut ? t().ai.providers.timeout : t().ai.providers.connectFailed(this.baseUrl), { cause });
      }
      if (res.ok) return res;
      body = await res.text();
      // 429 sesaat (batas token/permintaan per menit): tunggu sesuai saran server lalu coba lagi.
      // Kuota/kredit yang benar-benar habis tetap dianggap provider tidak tersedia (pindah ke provider lain).
      const wait = res.status === 429 && attempt < this.maxRateLimitRetries ? rateLimitDelay(res, body) : undefined;
      if (wait === undefined) break;
      await sleep(wait, signal);
    }
    const detail = body.slice(0, 300).replace(/\s+/g, " ");
    if (UNAVAILABLE_STATUS.has(res.status) || res.status >= 500) {
      const m = t().ai.providers;
      const label = res.status === 402 ? m.creditLabel : res.status === 429 ? m.quotaLabel : m.unavailableLabel;
      throw new ProviderUnavailableError(this.name, `${label} (${res.status}) ${detail}`.trim());
    }
    throw new RequestRejectedError(res.status, detail, this.name);
  }

  private async request(path: string, init: RequestInit, signal?: AbortSignal): Promise<unknown> {
    const res = await this.send(path, init, signal);
    const body = await this.readBody(res, signal);
    try {
      return JSON.parse(body) as unknown;
    } catch (cause) {
      throw new ProviderUnavailableError(this.name, "respons bukan JSON yang valid", { cause });
    }
  }

  private async readBody(res: Response, signal?: AbortSignal): Promise<string> {
    try {
      return await res.text();
    } catch (cause) {
      if (signal?.aborted) throw new AbortedError();
      throw new ProviderUnavailableError(this.name, "koneksi terputus saat membaca respons", { cause });
    }
  }

  /** Daftar ID model yang dilaporkan server (GET /models). */
  async listModels(): Promise<string[]> {
    return (await this.listModelInfo()).map((m) => m.id);
  }

  /** Model beserta waktu rilisnya (`created`, detik Unix) bila server melaporkannya. */
  async listModelInfo(): Promise<ModelInfo[]> {
    const list = (await this.request("/models", { method: "GET" })) as { data?: { id?: unknown; created?: unknown }[] };
    return (list.data ?? [])
      .filter((m): m is { id: string; created?: unknown } => typeof m.id === "string")
      .map((m) => ({ id: m.id, created: typeof m.created === "number" ? m.created : undefined }));
  }

  /** Pilih model: dari config, atau model pertama yang dilaporkan server. */
  async model(): Promise<string> {
    if (this.resolvedModel) return this.resolvedModel;
    const id = (await this.listModels())[0];
    if (!id) throw new ProviderUnavailableError(this.name, t().ai.providers.noModels);
    this.resolvedModel = id;
    return id;
  }

  async check(): Promise<string> {
    if (!this.resolvedModel) return t().ai.providers.modelReady(await this.model());
    // Model sudah diatur: pastikan server mengenalnya (bila server mau memberi daftar model).
    const models = await this.listModels().catch((err: unknown) => {
      // Sebagian gateway (mis. OmniRoute) meminta API key untuk daftar model tapi tidak untuk chat:
      // server berjalan dan model yang diatur tetap bisa dipakai.
      if (err instanceof ProviderUnavailableError && !this.options.apiKey && /\(401\)/.test(err.reason)) return undefined;
      if (err instanceof ProviderUnavailableError) throw err;
      return undefined;
    });
    if (models && models.length > 0 && !models.includes(this.resolvedModel)) {
      return t().ai.providers.modelNotListed(this.resolvedModel);
    }
    return t().ai.providers.modelReady(this.resolvedModel);
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
  private reasoningNone = false;
  /** Server menolak streaming: pakai respons biasa untuk permintaan berikutnya. */
  private noStream = false;
  /** Berapa kali 429 sesaat dicoba ulang sebelum pindah provider. */
  protected maxRateLimitRetries = 4;

  /** Baca respons Server-Sent Events (stream: true) dan rakit kembali menjadi satu respons utuh. */
  private async readStream(res: Response, onText: (delta: string) => void, signal?: AbortSignal): Promise<OpenAIResponse> {
    let content = "";
    let finish: string | undefined;
    let model: string | undefined;
    let usage: OpenAIResponse["usage"];
    const calls: { id?: string; name?: string; arguments: string }[] = [];
    const handle = (data: string) => {
      if (data === "[DONE]") return;
      let chunk: StreamChunk;
      try {
        chunk = JSON.parse(data) as StreamChunk;
      } catch {
        return;
      }
      if (chunk.error) throw new ProviderUnavailableError(this.name, t().ai.providers.serverError(JSON.stringify(chunk.error).slice(0, 200)));
      model ??= chunk.model;
      if (chunk.usage) usage = chunk.usage;
      const choice = chunk.choices?.[0];
      if (!choice) return;
      if (choice.finish_reason) finish = choice.finish_reason;
      const delta = choice.delta;
      if (typeof delta?.content === "string" && delta.content) {
        content += delta.content;
        onText(delta.content);
      }
      for (const tc of delta?.tool_calls ?? []) {
        // Tanpa index (sebagian gateway): cocokkan lewat id, atau lanjutkan tool call terakhir.
        let i = typeof tc.index === "number" ? tc.index : tc.id ? calls.findIndex((c) => c?.id === tc.id) : calls.length - 1;
        if (i < 0) i = calls.length;
        const slot = (calls[i] ??= { arguments: "" });
        if (tc.id) slot.id = tc.id;
        if (tc.function?.name) slot.name = (slot.name ?? "") + tc.function.name;
        if (tc.function?.arguments) slot.arguments += tc.function.arguments;
      }
    };

    const decoder = new TextDecoder();
    let buffer = "";
    let event: string[] = [];
    const flushLine = (line: string) => {
      if (line === "") {
        if (event.length) handle(event.join("\n"));
        event = [];
      } else if (line.startsWith("data:")) event.push(line.slice(5).replace(/^ /, ""));
    };
    try {
      for await (const part of res.body as unknown as AsyncIterable<Uint8Array>) {
        buffer += decoder.decode(part, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) !== -1) {
          flushLine(buffer.slice(0, nl).replace(/\r$/, ""));
          buffer = buffer.slice(nl + 1);
        }
      }
    } catch (cause) {
      if (signal?.aborted) throw new AbortedError();
      if (cause instanceof ProviderUnavailableError) throw cause;
      throw new ProviderUnavailableError(this.name, "koneksi terputus saat streaming", { cause });
    }
    flushLine(buffer.replace(/\r$/, ""));
    flushLine("");

    return {
      model,
      usage,
      choices: [
        {
          finish_reason: finish,
          message: {
            content,
            tool_calls: calls.filter(Boolean).map((c) => ({ id: c.id, type: "function", function: { name: c.name, arguments: c.arguments } })),
          },
        },
      ],
    };
  }

  async complete(request: CompletionRequest): Promise<ModelTurn> {
    const model = await this.model();
    const send = async (param: TokenParam): Promise<OpenAIResponse> => {
      const stream = Boolean(request.onText) && !this.noStream;
      const init: RequestInit = {
        method: "POST",
        body: JSON.stringify({
          model,
          [param]: this.options.maxTokens ?? 16000,
          // Model reasoning OpenAI terbaru hanya menerima function tools di chat/completions tanpa reasoning.
          ...(this.reasoningNone ? { reasoning_effort: "none" } : {}),
          ...(stream ? { stream: true } : {}),
          messages: this.toMessages(request.system, request.messages),
          // Sebagian server menolak daftar tools kosong.
          ...(request.tools.length
            ? {
                tools: request.tools.map((t) => ({
                  type: "function",
                  function: { name: t.name, description: t.description, parameters: t.inputSchema },
                })),
              }
            : {}),
        }),
      };
      if (!stream) return (await this.request("/chat/completions", init, request.signal)) as OpenAIResponse;
      const res = await this.send("/chat/completions", init, request.signal);
      // Server yang mengabaikan stream: true tetap menjawab JSON biasa.
      if (!/text\/event-stream/i.test(res.headers.get("content-type") ?? "")) {
        const body = await this.readBody(res, request.signal);
        try {
          return JSON.parse(body) as OpenAIResponse;
        } catch (cause) {
          throw new ProviderUnavailableError(this.name, "respons bukan JSON yang valid", { cause });
        }
      }
      return this.readStream(res, request.onText!, request.signal);
    };

    let data: OpenAIResponse | undefined;
    // Beberapa server menolak parameter tertentu dengan 400 dan menyebut solusinya; sesuaikan sekali per
    // masalah lalu ingat pilihannya untuk permintaan berikutnya.
    for (let attempt = 0; !data; attempt++) {
      const param = (this.tokenParam ??= this.options.tokenParam ?? "max_tokens");
      try {
        data = await send(param);
      } catch (err) {
        if (!(err instanceof RequestRejectedError) || err.status !== 400 || attempt >= 2) throw err;
        if (/max_(completion_)?tokens/i.test(err.detail) && !/reasoning_effort/i.test(err.detail)) {
          this.tokenParam = param === "max_tokens" ? "max_completion_tokens" : "max_tokens";
        } else if (/reasoning_effort/i.test(err.detail) && !this.reasoningNone) {
          this.reasoningNone = true;
        } else if (/\bstream/i.test(err.detail) && request.onText && !this.noStream) {
          this.noStream = true;
        } else throw err;
      }
    }

    const choice = data.choices?.[0];
    if (!choice?.message) throw new ProviderUnavailableError(this.name, t().ai.providers.noAnswer);

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
