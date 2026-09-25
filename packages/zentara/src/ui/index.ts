import { ZENTARA_VERSION } from "../core/devpage/theme.js";
import { escapeHtml, h, raw, renderToString, type Child } from "../core/view.js";

/**
 * Kit UI Zentara: komponen HTML server-side bergaya brand Zentara Core (teal/emas, mode gelap/terang).
 * Semua teks di-escape otomatis. Stylesheet disajikan framework di /_zentara/ui.css.
 *
 *   import { page, AuthCard, Field, Button } from "zentara/ui";
 *   export const GET = () => page({ title: "Masuk" }, h(AuthCard, { title: "Masuk" }, ...));
 */

export interface PageOptions {
  title: string;
  /** Bahasa dokumen (default "id"). */
  lang?: string;
  description?: string;
  /** Elemen tambahan di <head>, mis. stylesheet aplikasi. */
  head?: Child;
}

/** Dokumen HTML lengkap (dengan doctype) yang memuat stylesheet kit UI. */
export function page(options: PageOptions, ...body: Child[]): string {
  const head = [
    h("meta", { charset: "utf-8" }),
    h("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
    h("title", null, options.title),
    options.description ? h("meta", { name: "description", content: options.description }) : null,
    h("link", { rel: "icon", href: "/_zentara/favicon.png" }),
    h("link", { rel: "stylesheet", href: `/_zentara/ui.css?v=${ZENTARA_VERSION}` }),
    options.head,
  ];
  return `<!doctype html>${renderToString(h("html", { lang: options.lang ?? "id" }, h("head", null, head), h("body", { class: "zu" }, body)))}`;
}

type WithChildren<P> = P & { children: Child[] };

/** Logo Zentara + nama aplikasi ("Zentara" biasa, kata terakhir berwarna aksen). */
export function Brand({ name = "Zentara Core", href = "/" }: WithChildren<{ name?: string; href?: string }>): Child {
  const words = name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop()! : undefined;
  return h("a", { class: "zu-brand", href }, h("span", { class: "zu-logo", "aria-hidden": "true" }), h("span", null, words.join(" "), last ? [" ", h("b", null, last)] : null));
}

/** Kartu di tengah layar untuk halaman masuk, daftar, lupa password. */
export function AuthCard({ title, subtitle, footer, appName, children }: WithChildren<{ title: string; subtitle?: string; footer?: Child; appName?: string }>): Child {
  return h(
    "main",
    { class: "zu-auth" },
    h(
      "div",
      { class: "zu-auth-box" },
      h("div", { class: "zu-auth-head" }, h("span", { class: "zu-logo", role: "img", "aria-label": appName ?? "Zentara" }), h("h1", null, title), subtitle ? h("p", { class: "zu-muted" }, subtitle) : null),
      h("div", { class: "zu-card" }, children),
      footer ? h("p", { class: "zu-auth-foot" }, footer) : null,
    ),
  );
}

export interface NavItem {
  href: string;
  label: string;
  /** Judul kelompok yang ditampilkan di atas item ini. */
  section?: string;
}

export interface ShellUser {
  name: string;
  email?: string;
  role?: string;
}

/**
 * Kerangka halaman aplikasi: sidebar (logo, navigasi, user + tombol keluar) dan konten.
 * `active` = href menu yang sedang dibuka. Tombol keluar mengirim POST ke `logoutAction` (default /logout).
 */
export function AppShell({
  appName,
  nav,
  active,
  user,
  title,
  subtitle,
  actions,
  logoutAction = "/logout",
  children,
}: WithChildren<{ appName?: string; nav: NavItem[]; active?: string; user?: ShellUser; title: string; subtitle?: string; actions?: Child; logoutAction?: string }>): Child {
  const links: Child[] = [];
  for (const item of nav) {
    if (item.section) links.push(h("div", { class: "zu-nav-label" }, item.section));
    links.push(h("a", { href: item.href, "aria-current": item.href === active ? "page" : undefined }, item.label));
  }
  return h(
    "div",
    { class: "zu-shell" },
    h(
      "aside",
      { class: "zu-side" },
      h(Brand, { name: appName }),
      h("nav", { class: "zu-nav", "aria-label": "Navigasi utama" }, links),
      user
        ? h(
            "div",
            { class: "zu-side-foot" },
            h("div", { class: "zu-user" }, h(Avatar, { name: user.name }), h("div", { class: "zu-user-text" }, h("b", null, user.name), h("small", null, user.email ?? user.role ?? ""))),
            h("form", { method: "post", action: logoutAction }, h(Button, { variant: "ghost", small: true, block: true }, "Keluar")),
          )
        : null,
    ),
    h(
      "main",
      { class: "zu-main" },
      h(
        "div",
        { class: "zu-main-inner" },
        h("div", { class: "zu-head" }, h("div", null, h("h1", null, title), subtitle ? h("p", null, subtitle) : null), actions ?? null),
        children,
      ),
    ),
  );
}

/** Lingkaran berisi inisial nama. */
export function Avatar({ name }: WithChildren<{ name: string }>): Child {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return h("span", { class: "zu-avatar", "aria-hidden": "true" }, initials || "?");
}

export function Card({ title, actions, flush, children }: WithChildren<{ title?: string; actions?: Child; flush?: boolean }>): Child {
  return h("section", { class: flush ? "zu-card flush" : "zu-card" }, title || actions ? h("div", { class: "zu-card-head" }, h("h2", null, title ?? ""), actions ?? null) : null, children);
}

/** Grid responsif (kartu statistik, dsb.). */
export function Grid({ children }: WithChildren<object>): Child {
  return h("div", { class: "zu-grid" }, children);
}

export function Stat({ label, value, hint }: WithChildren<{ label: string; value: string | number; hint?: string }>): Child {
  return h(Card, null, h("div", { class: "zu-stat" }, h("span", null, label), h("b", null, value), hint ? h("small", null, hint) : null));
}

export interface FieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "password" | "number" | "search" | "tel" | "url" | "date";
  value?: string | number;
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  autocomplete?: string;
  min?: number;
  max?: number;
  step?: number | "any";
  autofocus?: boolean;
}

/** Label + input + pesan error/petunjuk, dengan atribut aksesibilitas yang benar. */
export function Field(props: WithChildren<FieldProps>): Child {
  const id = `f-${props.name}`;
  const describedBy = props.error ? `${id}-error` : props.hint ? `${id}-hint` : undefined;
  return h(
    "div",
    { class: "zu-field" },
    h("label", { for: id }, props.label),
    h("input", {
      class: "zu-input",
      id,
      name: props.name,
      type: props.type ?? "text",
      value: props.type === "password" ? undefined : props.value,
      placeholder: props.placeholder,
      required: props.required,
      autocomplete: props.autocomplete,
      min: props.min,
      max: props.max,
      step: props.step,
      autofocus: props.autofocus,
      "aria-invalid": props.error ? "true" : undefined,
      "aria-describedby": describedBy,
    }),
    props.error ? h("span", { class: "zu-error", id: `${id}-error` }, props.error) : props.hint ? h("small", { id: `${id}-hint` }, props.hint) : null,
  );
}

/** Formulir POST (CSRF ditangani middleware csrf() lewat header browser, tanpa token). */
export function Form({ action, method = "post", children }: WithChildren<{ action?: string; method?: "post" | "get" }>): Child {
  return h("form", { class: "zu-form", method, action }, children);
}

/** Baris beberapa field berdampingan (menumpuk di layar sempit). */
export function FormRow({ children }: WithChildren<object>): Child {
  return h("div", { class: "zu-form-row" }, children);
}

export function Button({
  variant = "primary",
  type = "submit",
  href,
  small,
  block,
  name,
  value,
  children,
}: WithChildren<{ variant?: "primary" | "secondary" | "ghost" | "danger"; type?: "submit" | "button"; href?: string; small?: boolean; block?: boolean; name?: string; value?: string }>): Child {
  const cls = ["zu-btn", variant, small ? "small" : "", block ? "block" : ""].filter(Boolean).join(" ");
  return href ? h("a", { class: cls, href }, children) : h("button", { class: cls, type, name, value }, children);
}

/**
 * Tombol yang mengirim POST ke `action` (mis. hapus data), dengan konfirmasi browser opsional.
 * Tidak memakai JavaScript kecuali untuk konfirmasi.
 */
export function PostButton({ action, confirm, variant = "danger", children }: WithChildren<{ action: string; confirm?: string; variant?: "primary" | "secondary" | "ghost" | "danger" }>): Child {
  return h(
    "form",
    { class: "zu-inline", method: "post", action },
    confirm ? raw(`<button class="zu-btn ${variant} small" type="submit" onclick="return confirm(${escapeHtml(JSON.stringify(confirm))})">${renderToString(children)}</button>`) : h(Button, { variant, small: true }, children),
  );
}

export function Alert({ tone = "info", children }: WithChildren<{ tone?: "info" | "success" | "error" | "warn" }>): Child {
  return h("div", { class: `zu-alert ${tone}`, role: tone === "error" ? "alert" : "status" }, children);
}

export function Badge({ tone, children }: WithChildren<{ tone?: "accent" | "gold" | "danger" | "ok" }>): Child {
  return h("span", { class: tone ? `zu-badge ${tone}` : "zu-badge" }, children);
}

export interface Column {
  label: string;
  /** "num" = rata kanan dengan angka tabular. */
  align?: "num";
}

/** Tabel data. Tanpa baris, menampilkan `empty` (atau teks default). */
export function Table({ columns, rows, empty }: WithChildren<{ columns: Column[]; rows: Child[][]; empty?: Child }>): Child {
  if (rows.length === 0) return empty ?? h(EmptyState, { title: "Belum ada data" });
  return h(
    "div",
    { class: "zu-table-wrap" },
    h(
      "table",
      { class: "zu-table" },
      h("thead", null, h("tr", null, columns.map((c) => h("th", { class: c.align }, c.label)))),
      h("tbody", null, rows.map((row) => h("tr", null, row.map((cell, i) => h("td", { class: columns[i]?.align }, cell))))),
    ),
  );
}

export function EmptyState({ title, text, action }: WithChildren<{ title: string; text?: string; action?: Child }>): Child {
  return h("div", { class: "zu-empty" }, h("b", null, title), text ? h("p", null, text) : null, action ?? null);
}

/** Format rupiah, mis. 45000 -> "Rp45.000". */
export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value).replace(/\s/g, "");
}

export { UI_CSS } from "./styles.js";
