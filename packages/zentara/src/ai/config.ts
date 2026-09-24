import { AnthropicProvider, type AnthropicProviderOptions } from "./providers/anthropic.js";
import { findPreset, PRESETS, presetBaseUrl, type TokenParam } from "./presets.js";
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
      /** Default "max_tokens"; OpenAI memakai "max_completion_tokens". */
      tokenParam?: TokenParam;
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
 * Rantai default dari env (tanpa perlu mengedit zentara.config.mjs):
 * - OmniRoute (gratis) dicoba paling awal;
 * - Claude selalu ada (dilewati otomatis bila ANTHROPIC_API_KEY kosong);
 * - provider cloud lain (OpenAI, Gemini, Groq, DeepSeek, OpenRouter) ikut bila API key-nya terisi;
 * - OmniRoute & Ollama lokal selalu dicoba dan dilewati bila tidak berjalan.
 * Urutan bisa diatur dengan ZENTARA_AI_ORDER, mis. "openai,claude,ollama"; provider lain menyusul.
 */
export function defaultProviders(env: NodeJS.ProcessEnv = process.env): ProviderConfig[] {
  const enabled = PRESETS.filter((p) => p.name === "claude" || p.local || (p.keyEnv && env[p.keyEnv]));
  const order = (env.ZENTARA_AI_ORDER ?? "")
    .split(",")
    .map((n) => n.trim().toLowerCase())
    .filter(Boolean);
  for (const name of order) {
    const preset = findPreset(name);
    if (!preset) throw new Error(`ZENTARA_AI_ORDER: provider tidak dikenal "${name}". Pilihan: ${PRESETS.map((p) => p.name).join(", ")}`);
    if (!enabled.includes(preset)) enabled.push(preset);
  }
  const rank = (name: string) => {
    const i = order.indexOf(name);
    return i === -1 ? order.length + PRESETS.findIndex((p) => p.name === name) : i;
  };
  enabled.sort((a, b) => rank(a.name) - rank(b.name));

  return enabled.map((p): ProviderConfig => {
    const model = env[p.modelEnv] || p.defaultModel;
    const apiKey = p.keyEnv ? env[p.keyEnv] || undefined : undefined;
    if (p.type === "anthropic") return { type: "anthropic", name: p.name, model, apiKey };
    return { type: "openai-compatible", name: p.name, baseUrl: presetBaseUrl(p, env)!, model, apiKey, tokenParam: p.tokenParam };
  });
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
      : new OpenAICompatibleProvider({
          name: c.name,
          baseUrl: c.baseUrl,
          model: c.model,
          apiKey: c.apiKey,
          maxTokens: c.maxTokens,
          // OpenAI resmi hanya menerima max_completion_tokens untuk model-model baru.
          tokenParam: c.tokenParam ?? (/^https:\/\/api\.openai\.com\//.test(c.baseUrl) ? "max_completion_tokens" : undefined),
        }),
  );
}
