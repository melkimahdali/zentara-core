import { h, type Child } from "../core/view.js";
import type { Flash } from "../core/flash.js";
import { t } from "../i18n/index.js";
import { cx, type WithChildren } from "./types.js";

/**
 * Umpan balik kit UI: toast (termasuk pesan flash setelah redirect), progres, spinner, dan skeleton.
 */

/**
 * Pesan singkat yang melayang di pojok bawah layar dan hilang sendiri (default 6 detik; `timeout: 0`
 * = tetap tampil). Untuk pesan setelah redirect, pakai `flash: takeFlash(ctx)`: tidak ada pesan = tidak
 * dirender apa-apa. Tanpa JavaScript toast tetap tampil sampai halaman berganti.
 * @en Short message that floats in the bottom corner and disappears by itself (6 seconds by default; `timeout: 0` = stays). For a message after a redirect, pass `flash: takeFlash(ctx)`: no message = nothing is rendered. Without JavaScript the toast stays until the page changes.
 * @group feedback
 * @example h(Toast, { flash: takeFlash(ctx) })
 */
export function Toast({
  tone = "success",
  flash,
  timeout = 6,
  children,
}: WithChildren<{ tone?: "success" | "info" | "warn" | "error"; flash?: Flash; timeout?: number }>): Child {
  const message: Child = flash ? flash.message : children;
  if (flash === undefined && !children.length) return null;
  const kind = flash?.tone ?? tone;
  return h(
    "div",
    { class: "zu-toasts" },
    h(
      "div",
      { class: `zu-toast ${kind}`, role: kind === "error" ? "alert" : "status", "data-zu-timeout": timeout > 0 ? String(timeout) : undefined },
      h("span", null, message),
      h("button", { class: "zu-close", type: "button", "data-zu-dismiss": "", "aria-label": t().ui.close, hidden: true }, "×"),
    ),
  );
}

/**
 * Bilah kemajuan (unggah, kuota, langkah). Tanpa `value` menjadi animasi "sedang berjalan".
 * @en Progress bar (upload, quota, steps). Without `value` it becomes an indeterminate "in progress" animation.
 * @group feedback
 * @example h(Progress, { label: "Kuota penyimpanan", value: 7.2, max: 10, text: "7,2 dari 10 GB" })
 */
export function Progress({ label, value, max = 100, text }: WithChildren<{ label: string; value?: number; max?: number; text?: string }>): Child {
  const shown = text ?? (value !== undefined ? `${Math.round((Math.min(Math.max(value, 0), max) / max) * 100)}%` : undefined);
  return h(
    "div",
    { class: "zu-progress" },
    h("div", { class: "zu-progress-head" }, h("span", null, label), shown ? h("small", null, shown) : null),
    h("progress", { value, max, "aria-label": label }),
  );
}

/**
 * Indikator memuat yang berputar, dengan teks opsional di sampingnya.
 * @en Spinning loading indicator, with optional text beside it.
 * @group feedback
 * @example h(Spinner, { text: "Memuat pesanan…" })
 */
export function Spinner({ text, size = "md" }: WithChildren<{ text?: string; size?: "sm" | "md" | "lg" }>): Child {
  return h("span", { class: cx("zu-spinner", size !== "md" && size), role: "status", "aria-label": text ? undefined : t().ui.loading }, h("span", { class: "zu-spinner-ring", "aria-hidden": "true" }), text ? h("span", null, text) : null);
}

/**
 * Kerangka abu-abu berdenyut sebagai tempat isi yang sedang dimuat (mis. di dalam Card).
 * @en Pulsing grey placeholder for content that is still loading (e.g. inside a Card).
 * @group feedback
 * @example h(Skeleton, { lines: 3, avatar: true })
 */
export function Skeleton({ lines = 3, avatar, block }: WithChildren<{ lines?: number; avatar?: boolean; block?: boolean }>): Child {
  const bars = Array.from({ length: Math.max(1, lines) }, (_, i) => h("span", { class: "zu-skel-line" + (i === lines - 1 && lines > 1 ? " short" : "") }));
  return h(
    "div",
    { class: "zu-skeleton", "aria-hidden": "true" },
    block ? h("span", { class: "zu-skel-block" }) : null,
    avatar ? h("span", { class: "zu-skel-avatar" }) : null,
    h("div", { class: "zu-skel-lines" }, bars),
  );
}
