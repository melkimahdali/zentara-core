import { ProviderUnavailableError, type CompletionRequest, type ModelProvider, type ModelTurn } from "./types.js";
import { t } from "../i18n/index.js";

export interface ChainEvents {
  /** Dipanggil saat satu provider gagal dan rantai pindah ke provider berikutnya. */
  onFallback?: (from: ModelProvider, reason: string, to: ModelProvider | undefined) => void;
}

/**
 * Rantai provider dengan fallback: coba provider sesuai urutan; bila satu provider
 * tidak tersedia (kredit habis, kuota, server mati), pindah ke berikutnya dan tetap
 * di sana sampai sesi selesai. Error lain (mis. request salah) langsung diteruskan.
 */
export class ProviderChain {
  private index = 0;
  readonly failures: { provider: string; reason: string }[] = [];

  constructor(private readonly providers: ModelProvider[], private readonly events: ChainEvents = {}) {
    if (providers.length === 0) throw new Error(t().ai.config.noProviders);
  }

  get current(): ModelProvider | undefined {
    return this.providers[this.index];
  }

  async complete(request: CompletionRequest): Promise<ModelTurn & { provider: string }> {
    while (this.index < this.providers.length) {
      const provider = this.providers[this.index]!;
      try {
        const turn = await provider.complete(request);
        return { ...turn, provider: provider.name };
      } catch (err) {
        if (!(err instanceof ProviderUnavailableError)) throw err;
        this.failures.push({ provider: provider.name, reason: err.reason });
        this.index++;
        this.events.onFallback?.(provider, err.reason, this.providers[this.index]);
      }
    }
    const detail = this.failures.map((f) => `  - ${f.provider}: ${f.reason}`).join("\n");
    throw new Error(t().ai.config.allUnavailable(detail));
  }
}
