import { ZENTARA_VERSION } from "../core/devpage/theme.js";
import { escapeHtml, h, raw, renderToString, type Child } from "../core/view.js";
import { getLocale, intlLocale, parseLocale, t } from "../i18n/index.js";

/**
 * Kit UI Zentara: komponen HTML server-side bergaya brand Zentara Core (Zentara Teal, mode gelap/terang,
 * font Plus Jakarta Sans). Semua teks di-escape otomatis. Stylesheet dan font disajikan framework di
 * /_zentara/*, tanpa build step dan tanpa layanan pihak ketiga.
 *
 *   import { page, AuthCard, Field, Button } from "zentara/ui";
 *   export const GET = () => page({ title: "Masuk" }, h(AuthCard, { title: "Masuk" }, ...));
 */

export interface PageOptions {
  title: string;
  /** Bahasa dokumen (default: bahasa aktif Zentara, lihat `locale` di zentara.config.mjs). */
  lang?: string;
  description?: string;
  /** Elemen tambahan di <head>, mis. stylesheet aplikasi. */
  head?: Child;
  /**
   * Skrip kecil kit UI (default true): tombol kirim berubah jadi "Menyimpan…" dan terkunci selama
   * formulir dikirim (mencegah kirim ganda). Halaman tetap berfungsi penuh tanpa JavaScript.
   */
  script?: boolean;
}

/** Tombol kirim terkunci selama formulir dikirim; dipulihkan bila halaman dikembalikan dari cache (tombol Back). */
const FORM_SCRIPT = `document.addEventListener("submit",function(e){var b=e.submitter||e.target.querySelector("button[type=submit]");if(!b||b.getAttribute("aria-busy")==="true"||e.defaultPrevented)return;b.setAttribute("aria-busy","true");if(b.dataset.loading){b.dataset.label=b.textContent;b.textContent=b.dataset.loading}setTimeout(function(){b.disabled=true})});addEventListener("pageshow",function(e){if(!e.persisted)return;document.querySelectorAll("button[aria-busy=true]").forEach(function(b){b.disabled=false;b.removeAttribute("aria-busy");if(b.dataset.label)b.textContent=b.dataset.label})});`;

/** Dokumen HTML lengkap (dengan doctype) yang memuat stylesheet dan font kit UI. */
export function page(options: PageOptions, ...body: Child[]): string {
  const head = [
    h("meta", { charset: "utf-8" }),
    h("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
    h("title", null, options.title),
    options.description ? h("meta", { name: "description", content: options.description }) : null,
    h("meta", { name: "color-scheme", content: "light dark" }),
    h("meta", { name: "theme-color", content: "#f3f5f3", media: "(prefers-color-scheme: light)" }),
    h("meta", { name: "theme-color", content: "#0d1719", media: "(prefers-color-scheme: dark)" }),
    h("link", { rel: "icon", href: "/_zentara/favicon.png" }),
    h("link", { rel: "preload", href: "/_zentara/fonts/plus-jakarta-sans-latin.woff2", as: "font", type: "font/woff2", crossorigin: "anonymous" }),
    h("link", { rel: "stylesheet", href: `/_zentara/ui.css?v=${ZENTARA_VERSION}` }),
    options.head,
  ];
  const skip = h("a", { class: "zu-skip", href: "#konten" }, t(parseLocale(options.lang) ?? getLocale()).ui.skip);
  const script = options.script === false ? null : h("script", null, raw(FORM_SCRIPT));
  return `<!doctype html>${renderToString(h("html", { lang: options.lang ?? getLocale() }, h("head", null, head), h("body", { class: "zu" }, skip, body, script)))}`;
}

type WithChildren<P> = P & { children: Child[] };

/** Logo Zentara + nama aplikasi (kata terakhir berwarna aksen, mis. "Studio <b>Senja</b>"). */
export function Brand({ name = "Zentara Core", href = "/" }: WithChildren<{ name?: string; href?: string }>): Child {
  const words = name.trim().split(/\s+/);
  const last = words.length > 1 ? words.pop()! : undefined;
  return h("a", { class: "zu-brand", href }, h("span", { class: "zu-logo", "aria-hidden": "true" }), h("span", null, words.join(" "), last ? [" ", h("b", null, last)] : null));
}

export interface AuthAside {
  /** Kalimat utama di panel brand (layar lebar), mis. "Semua pekerjaan tim, di satu tempat". */
  title: string;
  text?: string;
}

/**
 * Halaman masuk/daftar: panel brand di kiri (layar lebar) dan formulir di kanan. Di layar sempit hanya
 * formulir dengan logo di atasnya.
 */
export function AuthCard({
  title,
  subtitle,
  footer,
  appName,
  aside,
  children,
}: WithChildren<{ title: string; subtitle?: string; footer?: Child; appName?: string; aside?: AuthAside }>): Child {
  const name = appName ?? "Zentara Core";
  const panel = aside ?? { title: name, text: t().ui.builtWith };
  return h(
    "div",
    { class: "zu-auth" },
    h("aside", { class: "zu-auth-aside" }, h(Brand, { name }), h("div", null, h("h2", null, panel.title), panel.text ? h("p", null, panel.text) : null)),
    h(
      "main",
      { class: "zu-auth-main", id: "konten" },
      h(
        "div",
        { class: "zu-auth-box" },
        h("div", { class: "zu-auth-head" }, h("span", { class: "zu-logo", role: "img", "aria-label": name }), h("h1", null, title), subtitle ? h("p", null, subtitle) : null),
        children,
        footer ? h("p", { class: "zu-auth-foot" }, footer) : null,
      ),
    ),
  );
}

export interface NavItem {
  href: string;
  label: string;
  /** Awal kelompok menu baru (ditandai garis pemisah tipis sebelum item ini). */
  section?: string;
}

export interface ShellUser {
  name: string;
  email?: string;
  role?: string;
}

/**
 * Kerangka halaman aplikasi: bilah navigasi atas (logo, menu, user + tombol keluar) dan konten.
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
  nav.forEach((item, i) => {
    if (item.section && i > 0) links.push(h("span", { class: "zu-nav-sep", role: "presentation", title: item.section }));
    links.push(h("a", { href: item.href, "aria-current": item.href === active ? "page" : undefined }, item.label));
  });
  return [
    h(
      "header",
      { class: "zu-top" },
      h(
        "div",
        { class: "zu-top-in" },
        h(Brand, { name: appName, href: nav[0]?.href ?? "/" }),
        h("nav", { class: "zu-nav", "aria-label": t().ui.mainNav }, links),
        user
          ? h(
              "div",
              { class: "zu-user" },
              h("div", { class: "zu-user-text" }, h("b", null, user.name), h("small", null, user.email ?? user.role ?? "")),
              h(Avatar, { name: user.name }),
              h("form", { method: "post", action: logoutAction }, h(Button, { variant: "ghost", small: true }, t().ui.logout)),
            )
          : null,
      ),
    ),
    h(
      "main",
      { class: "zu-main", id: "konten" },
      h("div", { class: "zu-head" }, h("div", null, h("h1", null, title), subtitle ? h("p", null, subtitle) : null), actions ?? null),
      children,
    ),
  ];
}

/** Inisial nama dalam kotak bersudut lembut. */
export function Avatar({ name }: WithChildren<{ name: string }>): Child {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return h("span", { class: "zu-avatar", "aria-hidden": "true" }, initials || "?");
}

/** Panel berjudul. Pakai hanya bila isinya memang satu kelompok (tabel, formulir); selebihnya cukup jarak. */
export function Card({ title, actions, flush, children }: WithChildren<{ title?: string; actions?: Child; flush?: boolean }>): Child {
  return h("section", { class: flush ? "zu-card flush" : "zu-card" }, title || actions ? h("div", { class: "zu-card-head" }, h("h2", null, title ?? ""), actions ?? null) : null, children);
}

/** Grid responsif untuk kartu yang setara. */
export function Grid({ children }: WithChildren<object>): Child {
  return h("div", { class: "zu-grid" }, children);
}

/** Dua kolom tidak simetris (2:1), menumpuk di layar sempit. Isi dengan dua anak. */
export function Split({ children }: WithChildren<object>): Child {
  return h("div", { class: "zu-split" }, children);
}

/** Satu angka ringkasan. Kumpulkan beberapa di dalam StatGroup agar tampil sebagai satu strip bersekat. */
export function Stat({ label, value, hint }: WithChildren<{ label: string; value: string | number; hint?: string }>): Child {
  return h("div", { class: "zu-stat" }, h("span", null, label), h("b", null, value), hint ? h("small", null, hint) : null);
}

/** Strip angka ringkasan dengan pemisah tipis, pengganti deretan kartu kembar. */
export function StatGroup({ children }: WithChildren<object>): Child {
  return h("section", { class: "zu-stats", "aria-label": t().ui.summary }, children);
}

export interface FieldProps {
  name: string;
  label: string;
  /** `"textarea"` untuk teks panjang beberapa baris. */
  type?: "text" | "email" | "password" | "number" | "search" | "tel" | "url" | "date" | "textarea";
  value?: string | number;
  /** Tinggi awal textarea (baris). */
  rows?: number;
  maxlength?: number;
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  autocomplete?: string;
  min?: number;
  max?: number;
  step?: number | "any";
  autofocus?: boolean;
  inputmode?: "numeric" | "decimal" | "email" | "tel" | "url" | "search" | "text";
}

/** Label + input + pesan error/petunjuk, dengan atribut aksesibilitas yang benar. */
export function Field(props: WithChildren<FieldProps>): Child {
  const id = `f-${props.name}`;
  const describedBy = props.error ? `${id}-error` : props.hint ? `${id}-hint` : undefined;
  return h(
    "div",
    { class: "zu-field" },
    h("label", { for: id }, props.label),
    props.type === "textarea"
      ? h(
          "textarea",
          {
            class: "zu-input zu-textarea",
            id,
            name: props.name,
            rows: props.rows ?? 4,
            maxlength: props.maxlength,
            placeholder: props.placeholder,
            required: props.required,
            autofocus: props.autofocus,
            "aria-invalid": props.error ? "true" : undefined,
            "aria-describedby": describedBy,
          },
          props.value === undefined ? "" : String(props.value),
        )
      : h("input", {
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
          maxlength: props.maxlength,
          inputmode: props.inputmode,
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

/** Baris tombol di akhir formulir. */
export function FormActions({ children }: WithChildren<object>): Child {
  return h("div", { class: "zu-form-actions" }, children);
}

export function Button({
  variant = "primary",
  type = "submit",
  href,
  small,
  block,
  name,
  value,
  loading,
  children,
}: WithChildren<{
  variant?: "primary" | "secondary" | "ghost" | "danger";
  type?: "submit" | "button";
  href?: string;
  small?: boolean;
  block?: boolean;
  name?: string;
  value?: string;
  /** Label selama formulir dikirim, mis. "Menyimpan…" (butuh skrip bawaan page()). */
  loading?: string;
}>): Child {
  const cls = ["zu-btn", variant, small ? "small" : "", block ? "block" : ""].filter(Boolean).join(" ");
  return href ? h("a", { class: cls, href }, children) : h("button", { class: cls, type, name, value, "data-loading": loading }, children);
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

export function Badge({ tone, children }: WithChildren<{ tone?: "accent" | "gold" | "danger" | "ok" | "warn" }>): Child {
  return h("span", { class: tone ? `zu-badge ${tone}` : "zu-badge" }, children);
}

export interface Column {
  label: string;
  /** "num" = rata kanan dengan angka tabular; "end" = kolom aksi rapat di kanan. */
  align?: "num" | "end";
}

/** Tabel data. Tanpa baris, menampilkan `empty` (atau teks default). */
export function Table({ columns, rows, empty }: WithChildren<{ columns: Column[]; rows: Child[][]; empty?: Child }>): Child {
  if (rows.length === 0) return empty ?? h(EmptyState, { title: t().ui.noData });
  return h(
    "div",
    { class: "zu-table-wrap" },
    h(
      "table",
      { class: "zu-table" },
      h("thead", null, h("tr", null, columns.map((c) => h("th", { class: c.align, scope: "col" }, c.label)))),
      h("tbody", null, rows.map((row) => h("tr", null, row.map((cell, i) => h("td", { class: columns[i]?.align }, cell))))),
    ),
  );
}

/** Daftar ringkas: setiap item satu baris (label di kiri, nilai/aksi di kanan). */
export function List({ items }: WithChildren<{ items: Child[][] }>): Child {
  return h("ul", { class: "zu-list" }, items.map((cells) => h("li", null, cells)));
}

/** Keadaan kosong yang memberi tahu cara mengisinya. */
export function EmptyState({ title, text, action }: WithChildren<{ title: string; text?: string; action?: Child }>): Child {
  return h("div", { class: "zu-empty" }, h("b", null, title), text ? h("p", null, text) : null, action ?? null);
}

/** Kotak pencarian (GET). Menampilkan tautan "Hapus pencarian" bila ada kata kunci. */
export function Search({
  action,
  name = "q",
  value,
  label = t().ui.search,
  placeholder = t().ui.searchPlaceholder,
}: WithChildren<{ action: string; name?: string; value?: string; label?: string; placeholder?: string }>): Child {
  return h(
    "form",
    { class: "zu-search", method: "get", action, role: "search" },
    h("input", { class: "zu-input", type: "search", name, value, placeholder, "aria-label": label }),
    value ? h("a", { class: "zu-link", href: action }, t().ui.clearSearch) : null,
  );
}

/** Isi yang bisa dibuka-tutup tanpa JavaScript (mis. formulir tambah data). */
export function Disclosure({ summary, open, children }: WithChildren<{ summary: string; open?: boolean }>): Child {
  return h("details", { class: "zu-disclosure", open }, h("summary", null, summary), h("div", null, children));
}

/** Format rupiah, mis. 45000 -> "Rp45.000". */
export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value).replace(/\s/g, "");
}

export { UI_CSS } from "./styles.js";

/** Format mata uang sesuai bahasa aktif, mis. money(12.5, "USD") -> "$12.50" (en) atau "US$12,50" (id). */
export function money(value: number, currency = getLocale() === "en" ? "USD" : "IDR"): string {
  const fraction = currency === "IDR" ? 0 : undefined;
  return new Intl.NumberFormat(intlLocale(), { style: "currency", currency, maximumFractionDigits: fraction }).format(value).replace(/\s/g, "");
}

/** Angka dengan pemisah ribuan sesuai bahasa aktif, mis. 12500 -> "12.500" (id) atau "12,500" (en). */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(intlLocale()).format(value);
}

/** Tanggal sesuai bahasa aktif, mis. "25 Sep 2026" (id) atau "Sep 25, 2026" (en). */
export function formatDate(value: Date | string | number, style: "short" | "medium" | "long" | "full" = "medium"): string {
  return new Intl.DateTimeFormat(intlLocale(), { dateStyle: style }).format(new Date(value));
}
