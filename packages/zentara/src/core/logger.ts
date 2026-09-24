export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const LEVELS: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };

export function isLogLevel(value: unknown): value is LogLevel {
  return typeof value === "string" && value in LEVELS;
}

export class ZenLogger {
  constructor(readonly level: LogLevel = "info") {}

  private enabled(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[this.level];
  }

  debug(message: string, ...extra: unknown[]): void {
    if (this.enabled("debug")) console.debug(`[DEBUG] ${message}`, ...extra);
  }
  info(message: string, ...extra: unknown[]): void {
    if (this.enabled("info")) console.log(`[INFO] ${message}`, ...extra);
  }
  warn(message: string, ...extra: unknown[]): void {
    if (this.enabled("warn")) console.warn(`[WARN] ${message}`, ...extra);
  }
  error(message: string, ...extra: unknown[]): void {
    if (this.enabled("error")) console.error(`[ERROR] ${message}`, ...extra);
  }
}
