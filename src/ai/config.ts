import { AnthropicProvider, type AnthropicProviderOptions } from "./providers/anthropic.js";
import { OpenAICompatibleProvider } from "./providers/openai-compatible.js";
import type { ModelProvider } from "./types.js";

export type ProviderConfig =
  | ({ type: "anthropic" } & Omit<AnthropicProviderOptions, "baseURL" | "maxRetries" | "timeoutMs">)
  | {
      type: "openai-compatible";
      name: string;
      baseUrl: string;
      model?: string;
      apiKey?: string;
      maxTokens?: number;
    };

export type ApprovalMode = "ask" | "auto";

export interface AiUserConfig {
  /** Urutan provider; yang pertama dicoba lebih dulu. */
  providers?: ProviderConfig[];
  /** "ask" (default): setiap perubahan file minta persetujuan. "auto": hanya aksi krusial yang ditanyakan. */
  mode?: ApprovalMode;
  /** Batas langkah (panggilan model) per perintah. Default 40. */
  maxSteps?: number;
}

export interface AiConfig {
  providers: ProviderConfig[];
  mode: ApprovalMode;
  maxSteps: number;
}

/**
 * Rantai default: Claude → OmniRoute lokal → Ollama lokal. Provider lokal yang tidak
 * terpasang otomatis dilewati (koneksi ditolak = tidak tersedia).
 */
export function defaultProviders(env: NodeJS.ProcessEnv = process.env): ProviderConfig[] {
  return [
    { type: "anthropic", name: "claude", model: env.ZENTARA_CLAUDE_MODEL },
    {
      type: "openai-compatible",
      name: "omniroute",
      baseUrl: env.OMNIROUTE_URL ?? "http://localhost:20128/v1",
      apiKey: env.OMNIROUTE_API_KEY,
      model: env.OMNIROUTE_MODEL,
    },
    {
      type: "openai-compatible",
      name: "ollama",
      baseUrl: env.OLLAMA_URL ?? "http://localhost:11434/v1",
      model: env.OLLAMA_MODEL,
    },
  ];
}

export function resolveAiConfig(user: AiUserConfig | undefined, env: NodeJS.ProcessEnv = process.env): AiConfig {
  const mode = (env.ZENTARA_AI_MODE as ApprovalMode | undefined) ?? user?.mode ?? "ask";
  if (mode !== "ask" && mode !== "auto") throw new Error(`ai.mode tidak valid: ${String(mode)} (pilih "ask" atau "auto")`);
  const maxSteps = user?.maxSteps ?? 40;
  if (!Number.isInteger(maxSteps) || maxSteps < 1) throw new Error(`ai.maxSteps tidak valid: ${maxSteps}`);

  const providers = user?.providers ?? defaultProviders(env);
  const names = new Set<string>();
  for (const p of providers) {
    const name = p.name ?? "claude";
    if (names.has(name)) throw new Error(`Nama provider AI duplikat: ${name}`);
    names.add(name);
    if (p.type === "openai-compatible" && !/^https?:\/\//.test(p.baseUrl)) {
      throw new Error(`Provider ${name}: baseUrl harus diawali http:// atau https://`);
    }
    if (p.type !== "anthropic" && p.type !== "openai-compatible") {
      throw new Error(`Provider ${name}: type tidak dikenal "${(p as { type: string }).type}"`);
    }
  }
  return { providers, mode, maxSteps };
}

export function createProviders(configs: ProviderConfig[]): ModelProvider[] {
  return configs.map((c) =>
    c.type === "anthropic"
      ? new AnthropicProvider({ ...c })
      : new OpenAICompatibleProvider({ name: c.name, baseUrl: c.baseUrl, model: c.model, apiKey: c.apiKey, maxTokens: c.maxTokens }),
  );
}
