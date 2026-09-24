import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export interface UpdateCheckOptions {
  current: string;
  /** Default ~/.zentara/update-check.json */
  cacheFile?: string;
  now?: number;
  fetchImpl?: typeof fetch;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
}

const DAY = 24 * 60 * 60 * 1000;

/** Bandingkan versi x.y.z (prarilis dianggap lebih lama dari rilis yang sama). */
export function isNewer(latest: string, current: string): boolean {
  const parse = (v: string) => {
    const [main = "", pre] = v.split("-", 2);
    return { nums: main.split(".").map((n) => Number(n) || 0), pre };
  };
  const a = parse(latest);
  const b = parse(current);
  for (let i = 0; i < 3; i++) {
    if ((a.nums[i] ?? 0) !== (b.nums[i] ?? 0)) return (a.nums[i] ?? 0) > (b.nums[i] ?? 0);
  }
  return Boolean(b.pre) && !a.pre;
}

/**
 * Cek versi terbaru `zentara` langsung ke registry npm (tanpa cache npm lokal yang bisa tertinggal),
 * paling sering sekali sehari. Mengembalikan versi baru bila ada. Tidak pernah melempar error.
 * Matikan dengan ZENTARA_NO_UPDATE_CHECK=1 (otomatis mati di CI).
 */
export async function checkForUpdate(options: UpdateCheckOptions): Promise<string | undefined> {
  const env = options.env ?? process.env;
  if (env.ZENTARA_NO_UPDATE_CHECK || env.CI || env.NO_UPDATE_NOTIFIER) return undefined;
  const cacheFile = options.cacheFile ?? path.join(os.homedir(), ".zentara", "update-check.json");
  const now = options.now ?? Date.now();
  try {
    const cached = JSON.parse(fs.readFileSync(cacheFile, "utf8")) as { checkedAt?: number; latest?: string };
    if (cached.checkedAt && now - cached.checkedAt < DAY && cached.latest) {
      return isNewer(cached.latest, options.current) ? cached.latest : undefined;
    }
  } catch {
    // Belum pernah dicek.
  }
  try {
    const res = await (options.fetchImpl ?? fetch)("https://registry.npmjs.org/zentara/latest", {
      headers: { Accept: "application/json", "Cache-Control": "no-cache" },
      signal: AbortSignal.timeout(options.timeoutMs ?? 1500),
    });
    if (!res.ok) return undefined;
    const latest = ((await res.json()) as { version?: unknown }).version;
    if (typeof latest !== "string") return undefined;
    try {
      fs.mkdirSync(path.dirname(cacheFile), { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify({ checkedAt: now, latest }));
    } catch {
      // Folder home tidak bisa ditulis: tidak apa-apa.
    }
    return isNewer(latest, options.current) ? latest : undefined;
  } catch {
    return undefined;
  }
}
