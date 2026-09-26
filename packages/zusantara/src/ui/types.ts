import type { Child } from "../core/view.js";

export type WithChildren<P> = P & { children: Child[] };

/** Skala jarak kit UI: none 0, xs 4px, sm 8px, md 16px, lg 24px, xl 40px. */
export type Gap = "none" | "xs" | "sm" | "md" | "lg" | "xl";
export type Align = "start" | "center" | "end" | "baseline" | "stretch";
export type Justify = "start" | "center" | "end" | "between";

/** Gabungkan nama kelas, melewati nilai kosong. */
export function cx(...names: (string | false | null | undefined)[]): string {
  return names.filter(Boolean).join(" ");
}
