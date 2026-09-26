import { parseDuration, type Duration } from "./duration.js";

export interface CacheOptions {
  /** Jumlah entri maksimum; entri yang paling lama tidak dipakai dibuang lebih dulu (LRU). Default 1000. */
  max?: number;
  /** Masa berlaku bawaan, mis. "5m". Default: tanpa batas waktu. */
  ttl?: Duration;
}

interface Entry {
  value: unknown;
  expires: number;
}

/**
 * Cache di memori proses dengan masa berlaku (TTL) dan batas jumlah entri (LRU).
 *
 *   const stats = await cache.remember("dashboard:stats", "1m", () => hitungStatistik());
 *
 * Isi cache hilang saat server dimulai ulang dan tidak dibagi antarproses. Untuk beberapa server,
 * simpan data bersama di database.
 */
export class MemoryCache {
  private readonly entries = new Map<string, Entry>();
  private readonly pending = new Map<string, Promise<unknown>>();
  private readonly max: number;
  private readonly ttl: number;

  constructor(options: CacheOptions = {}) {
    this.max = options.max ?? 1000;
    if (!Number.isInteger(this.max) || this.max < 1) throw new Error(`Invalid cache max: ${options.max}`);
    this.ttl = options.ttl === undefined ? Infinity : parseDuration(options.ttl);
  }

  get size(): number {
    this.prune();
    return this.entries.size;
  }

  get<T = unknown>(key: string): T | undefined {
    const entry = this.entries.get(key);
    if (!entry) return undefined;
    if (entry.expires <= Date.now()) {
      this.entries.delete(key);
      return undefined;
    }
    // Dipakai lagi: pindah ke posisi paling baru (LRU).
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.value as T;
  }

  has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  set<T>(key: string, value: T, ttl?: Duration): T {
    const ms = ttl === undefined ? this.ttl : parseDuration(ttl);
    this.entries.delete(key);
    this.entries.set(key, { value, expires: ms === Infinity ? Infinity : Date.now() + ms });
    while (this.entries.size > this.max) this.entries.delete(this.entries.keys().next().value!);
    return value;
  }

  delete(key: string): boolean {
    return this.entries.delete(key);
  }

  /** Hapus semua entri, atau hanya yang kuncinya diawali `prefix` (mis. "user:42:"). */
  clear(prefix?: string): void {
    if (prefix === undefined) {
      this.entries.clear();
      return;
    }
    for (const key of [...this.entries.keys()]) if (key.startsWith(prefix)) this.entries.delete(key);
  }

  /**
   * Ambil dari cache, atau hitung dengan `fn` lalu simpan. Permintaan yang datang bersamaan untuk kunci
   * yang sama menunggu satu perhitungan saja. Hasil `undefined` dan error tidak disimpan.
   */
  async remember<T>(key: string, ttl: Duration | undefined, fn: () => T | Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const running = this.pending.get(key);
    if (running) return running as Promise<T>;
    const promise = (async () => {
      try {
        const value = await fn();
        if (value !== undefined) this.set(key, value, ttl);
        return value;
      } finally {
        this.pending.delete(key);
      }
    })();
    this.pending.set(key, promise);
    return promise;
  }

  private prune(): void {
    const now = Date.now();
    for (const [key, entry] of this.entries) if (entry.expires <= now) this.entries.delete(key);
  }
}

/** Cache bersama untuk seluruh aplikasi. */
export const cache = new MemoryCache();
