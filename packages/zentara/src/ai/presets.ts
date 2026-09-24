import { DEFAULT_CLAUDE_MODEL } from "./providers/anthropic.js";

/** Parameter batas token yang diterima API. OpenAI (model baru) hanya menerima max_completion_tokens. */
export type TokenParam = "max_tokens" | "max_completion_tokens";

export interface ProviderPreset {
  name: string;
  label: string;
  type: "anthropic" | "openai-compatible";
  /** Env berisi API key. Provider cloud hanya dipakai otomatis bila key ini terisi. */
  keyEnv?: string;
  /** Env untuk mengganti model. */
  modelEnv: string;
  /** Model bawaan bila env model kosong (bisa usang; ganti lewat env model). */
  defaultModel?: string;
  baseUrl?: string;
  /** Env untuk mengganti alamat API (server lokal, proxy, atau gateway perusahaan). */
  urlEnv?: string;
  /** Provider lokal (tanpa API key), dicoba otomatis dan dilewati bila tidak berjalan. */
  local?: boolean;
  tokenParam?: TokenParam;
  signupUrl?: string;
}

/** Urutan default rantai fallback. */
export const PRESETS: readonly ProviderPreset[] = [
  {
    name: "claude",
    label: "Claude (Anthropic)",
    type: "anthropic",
    keyEnv: "ANTHROPIC_API_KEY",
    modelEnv: "ZENTARA_CLAUDE_MODEL",
    defaultModel: DEFAULT_CLAUDE_MODEL,
    signupUrl: "https://console.anthropic.com",
  },
  {
    name: "openai",
    label: "OpenAI",
    type: "openai-compatible",
    baseUrl: "https://api.openai.com/v1",
    urlEnv: "OPENAI_BASE_URL",
    keyEnv: "OPENAI_API_KEY",
    modelEnv: "OPENAI_MODEL",
    defaultModel: "gpt-4.1",
    tokenParam: "max_completion_tokens",
    signupUrl: "https://platform.openai.com/api-keys",
  },
  {
    name: "gemini",
    label: "Google Gemini",
    type: "openai-compatible",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    urlEnv: "GEMINI_BASE_URL",
    keyEnv: "GEMINI_API_KEY",
    modelEnv: "GEMINI_MODEL",
    defaultModel: "gemini-2.5-flash",
    signupUrl: "https://aistudio.google.com/apikey",
  },
  {
    name: "groq",
    label: "Groq",
    type: "openai-compatible",
    baseUrl: "https://api.groq.com/openai/v1",
    urlEnv: "GROQ_BASE_URL",
    keyEnv: "GROQ_API_KEY",
    modelEnv: "GROQ_MODEL",
    defaultModel: "llama-3.3-70b-versatile",
    signupUrl: "https://console.groq.com/keys",
  },
  {
    name: "deepseek",
    label: "DeepSeek",
    type: "openai-compatible",
    baseUrl: "https://api.deepseek.com/v1",
    urlEnv: "DEEPSEEK_BASE_URL",
    keyEnv: "DEEPSEEK_API_KEY",
    modelEnv: "DEEPSEEK_MODEL",
    defaultModel: "deepseek-chat",
    signupUrl: "https://platform.deepseek.com/api_keys",
  },
  {
    name: "openrouter",
    label: "OpenRouter (banyak model, satu key)",
    type: "openai-compatible",
    baseUrl: "https://openrouter.ai/api/v1",
    urlEnv: "OPENROUTER_BASE_URL",
    keyEnv: "OPENROUTER_API_KEY",
    modelEnv: "OPENROUTER_MODEL",
    defaultModel: "openai/gpt-4.1",
    signupUrl: "https://openrouter.ai/keys",
  },
  {
    name: "omniroute",
    label: "OmniRoute (gateway lokal, termasuk model gratis)",
    type: "openai-compatible",
    baseUrl: "http://localhost:20128/v1",
    urlEnv: "OMNIROUTE_URL",
    keyEnv: "OMNIROUTE_API_KEY",
    modelEnv: "OMNIROUTE_MODEL",
    local: true,
    signupUrl: "https://github.com/diegosouzapw/OmniRoute",
  },
  {
    name: "ollama",
    label: "Ollama (model lokal, gratis & offline)",
    type: "openai-compatible",
    baseUrl: "http://localhost:11434/v1",
    urlEnv: "OLLAMA_URL",
    modelEnv: "OLLAMA_MODEL",
    local: true,
    signupUrl: "https://ollama.com",
  },
];

export function findPreset(name: string): ProviderPreset | undefined {
  return PRESETS.find((p) => p.name === name);
}

export function presetBaseUrl(preset: ProviderPreset, env: NodeJS.ProcessEnv): string | undefined {
  return (preset.urlEnv && env[preset.urlEnv]) || preset.baseUrl;
}
