const UNITS: Record<string, number> = { ms: 1, s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000, w: 604_800_000 };

/** Durasi dalam milidetik: angka (ms) atau teks seperti "500ms", "30s", "5m", "2h", "1d", "1w", "1h30m". */
export type Duration = number | string;

export function parseDuration(value: Duration): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value) || value < 0) throw new Error(`Invalid duration: ${value}`);
    return value;
  }
  const text = value.trim().toLowerCase();
  if (/^\d+$/.test(text)) return Number(text);
  const parts = [...text.matchAll(/(\d+(?:\.\d+)?)\s*(ms|s|m|h|d|w)/g)];
  if (!parts.length || parts.map((p) => p[0]).join("").replace(/\s/g, "") !== text.replace(/\s/g, "")) throw new Error(`Invalid duration: ${value}`);
  return Math.round(parts.reduce((total, [, n, unit]) => total + Number(n) * UNITS[unit!]!, 0));
}

/** Ukuran dalam byte: angka atau teks seperti "512kb", "10mb", "1gb". */
export function parseBytes(value: number | string): number {
  if (typeof value === "number") return value;
  const match = /^\s*(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?\s*$/i.exec(value);
  if (!match) throw new Error(`Invalid size: ${value}`);
  const unit = { b: 1, kb: 1024, mb: 1024 ** 2, gb: 1024 ** 3 }[(match[2] ?? "b").toLowerCase() as "b"];
  return Math.round(Number(match[1]) * unit);
}
