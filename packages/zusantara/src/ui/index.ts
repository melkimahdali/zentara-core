import { requestOverride } from "../core/devtrace.js";
import { ZUSANTARA_VERSION } from "../core/devpage/theme.js";
import { escapeHtml, h, raw, renderToString, type Child } from "../core/view.js";
import { getLocale, intlLocale, parseLocale, t } from "../i18n/index.js";
import { activeTheme } from "./theme.js";
import type { WithChildren } from "./types.js";

/**
 * Kit UI Zusantara: komponen HTML server-side bergaya brand Zusantara Core (Zusantara Teal, mode gelap/terang,
 * font Plus Jakarta Sans). Semua teks di-escape otomatis. Stylesheet dan font disajikan framework di
 * /_zusantara/*, tanpa build step dan tanpa layanan pihak ketiga.
 *
 *   import { page, AuthCard, Field, Button } from "zusantara/ui";
 *   export const GET = () => page({ title: "Masuk" }, h(AuthCard, { title: "Masuk" }, ...));
 */

export interface PageOptions {
  title: string;
  /** Bahasa dokumen (default: bahasa aktif Zusantara, lihat `locale` di zusantara.config.mjs). */
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

/**
 * Skrip kecil bawaan page(): tombol kirim terkunci selama formulir dikirim (dipulihkan bila halaman
 * dikembalikan dari cache lewat tombol Back), tombol Tampilkan pada password, pratinjau gambar yang
 * baru dipilih di FileInput, dialog `open`, tooltip untuk pembaca layar, toast yang hilang sendiri,
 * tombol Salin di CodeBlock, dan menutup menu tarik-turun dengan klik di luar atau Esc. Semuanya
 * hanya menambah kenyamanan; halaman berfungsi tanpanya.
 */
const FORM_SCRIPT = `document.addEventListener("submit",function(e){var b=e.submitter||e.target.querySelector("button[type=submit]");if(!b||b.getAttribute("aria-busy")==="true"||e.defaultPrevented)return;b.setAttribute("aria-busy","true");if(b.dataset.loading){b.dataset.label=b.textContent;b.textContent=b.dataset.loading}setTimeout(function(){b.disabled=true})});addEventListener("pageshow",function(e){if(!e.persisted)return;document.querySelectorAll("button[aria-busy=true]").forEach(function(b){b.disabled=false;b.removeAttribute("aria-busy");if(b.dataset.label)b.textContent=b.dataset.label})});document.querySelectorAll("[data-zu-reveal]").forEach(function(b){var i=document.getElementById(b.getAttribute("data-zu-reveal"));if(!i)return;b.hidden=false;b.addEventListener("click",function(){var s=i.type==="password";i.type=s?"text":"password";b.setAttribute("aria-pressed",String(s));b.textContent=s?b.dataset.hide:b.dataset.show})});document.addEventListener("change",function(e){var i=e.target;if(!i.matches||!i.matches("input[type=file][data-zu-preview]"))return;var img=document.getElementById(i.getAttribute("data-zu-preview")),f=i.files&&i.files[0];if(img&&f&&/^image\\//.test(f.type)){img.src=URL.createObjectURL(f);img.hidden=false}});document.querySelectorAll("[data-zu-open]").forEach(function(d){try{d.showPopover()}catch(e){}});document.querySelectorAll("[data-zu-tip]").forEach(function(w){var f=w.querySelector("a,button,input,select,textarea,[tabindex]");if(!f){f=w;w.tabIndex=0}f.setAttribute("aria-describedby",w.getAttribute("data-zu-tip"))});document.querySelectorAll(".zu-toast").forEach(function(t){var b=t.querySelector("[data-zu-dismiss]");function hide(){t.classList.add("hide");setTimeout(function(){var r=t.parentNode;t.remove();if(r&&!r.children.length)r.remove()},220)}if(b){b.hidden=false;b.addEventListener("click",hide)}var s=Number(t.getAttribute("data-zu-timeout"));if(s>0)setTimeout(hide,s*1000)});document.querySelectorAll("[data-zu-copy]").forEach(function(b){if(!navigator.clipboard)return;b.hidden=false;var l=b.textContent;b.addEventListener("click",function(){var c=b.closest("figure").querySelector("code");navigator.clipboard.writeText(c.textContent).then(function(){b.textContent=b.dataset.done;setTimeout(function(){b.textContent=l},1500)})})});document.querySelectorAll("[data-zu-step]").forEach(function(b){var i=document.getElementById(b.getAttribute("aria-controls"));if(!i)return;b.hidden=false;b.addEventListener("click",function(){var d=Number(b.getAttribute("data-zu-step")),v=(Number(i.value)||0)+d,lo=i.min===""?-Infinity:Number(i.min),hi=i.max===""?Infinity:Number(i.max);i.value=String(Math.min(hi,Math.max(lo,v)));i.dispatchEvent(new Event("change",{bubbles:true}))})});function zuShut(t){document.querySelectorAll("details.zu-dropdown[open],details.zu-navbar-menu[open]").forEach(function(d){if(!t||!d.contains(t))d.open=false})}document.addEventListener("click",function(e){zuShut(e.target)});document.addEventListener("keydown",function(e){if(e.key==="Escape")zuShut(null)});`;

/**
 * Dokumen HTML lengkap (dengan doctype) yang memuat stylesheet, font, dan tema kit UI. Semua halaman
 * yang memakai kit UI dimulai dari sini.
 * @en Full HTML document (with doctype) that loads the UI kit stylesheet, font, and theme. Every page that uses the UI kit starts here.
 * @group page
 * @example page({ title: "Produk" }, h(Container, { pad: true }, h(PageHeader, { title: "Produk" }), ...))
 */
export function page(options: PageOptions, ...body: Child[]): string {
  const { theme, css, hash } = activeTheme();
  // Varian gelap/terang dari view_page saat pengembangan menang atas tema.
  const forced = requestOverride()?.mode ?? (theme.mode === "auto" ? undefined : theme.mode);
  const head = [
    h("meta", { charset: "utf-8" }),
    h("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
    h("title", null, options.title),
    options.description ? h("meta", { name: "description", content: options.description }) : null,
    h("meta", { name: "color-scheme", content: forced ?? "light dark" }),
    forced !== "dark" ? h("meta", { name: "theme-color", content: "#f3f5f3", media: forced ? undefined : "(prefers-color-scheme: light)" }) : null,
    forced !== "light" ? h("meta", { name: "theme-color", content: "#0d1719", media: forced ? undefined : "(prefers-color-scheme: dark)" }) : null,
    h("link", { rel: "icon", href: "/_zusantara/favicon.png" }),
    theme.font === "jakarta" ? h("link", { rel: "preload", href: "/_zusantara/fonts/plus-jakarta-sans-latin.woff2", as: "font", type: "font/woff2", crossorigin: "anonymous" }) : null,
    h("link", { rel: "stylesheet", href: `/_zusantara/ui.css?v=${ZUSANTARA_VERSION}` }),
    css ? h("link", { rel: "stylesheet", href: `/_zusantara/theme.css?v=${hash}` }) : null,
    options.head,
  ];
  const skip = h("a", { class: "zu-skip", href: "#konten" }, t(parseLocale(options.lang) ?? getLocale()).ui.skip);
  const script = options.script === false ? null : h("script", null, raw(FORM_SCRIPT));
  return `<!doctype html>${renderToString(h("html", { lang: options.lang ?? getLocale(), "data-zu-mode": forced }, h("head", null, head), h("body", { class: "zu" }, skip, body, script)))}`;
}


/**
 * Logo + nama aplikasi (kata terakhir berwarna aksen, mis. "Studio <b>Senja</b>").
 * @en Logo + app name (the last word in the accent color, e.g. "Studio <b>Senja</b>").
 * @group page
 * @example h(Brand, { name: "Toko Senja", href: "/" })
 */
export function Brand({ name = "Zusantara Core", href = "/" }: WithChildren<{ name?: string; href?: string }>): Child {
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
 * @en Sign-in/sign-up page: a brand panel on the left (wide screens) and the form on the right. On narrow screens only the form, with the logo above it.
 * @group page
 * @example h(AuthCard, { title: "Masuk", subtitle: "Selamat datang kembali", aside: { title: "Semua pesanan di satu tempat" } }, h(Form, { action: "/login" }, ...))
 */
export function AuthCard({
  title,
  subtitle,
  footer,
  appName,
  aside,
  children,
}: WithChildren<{ title: string; subtitle?: string; footer?: Child; appName?: string; aside?: AuthAside }>): Child {
  const name = appName ?? "Zusantara Core";
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
 * @en App page frame: top navigation bar (logo, menu, user + sign-out button) and content. `active` = href of the open menu item. Sign-out POSTs to `logoutAction` (default /logout).
 * @group page
 * @example h(AppShell, { appName: "Toko Senja", nav: [{ href: "/dashboard", label: "Dasbor" }], active: "/dashboard", user, title: "Dasbor", actions: h(Button, { href: "/produk/baru" }, "Tambah") }, ...)
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

/**
 * Inisial nama dalam kotak bersudut lembut.
 * @en Name initials in a softly rounded box.
 * @group data
 * @example h(Avatar, { name: "Sari Dewi" })
 */
export function Avatar({ name }: WithChildren<{ name: string }>): Child {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
  return h("span", { class: "zu-avatar", "aria-hidden": "true" }, initials || "?");
}

/**
 * Panel berjudul. Pakai hanya bila isinya memang satu kelompok (tabel, formulir); selebihnya cukup jarak.
 * `flush` menghapus jarak dalam (untuk tabel).
 * @en Titled panel. Use it only when the content really is one group (a table, a form); otherwise spacing is enough. `flush` removes the inner padding (for tables).
 * @group layout
 * @example h(Card, { title: "Pesanan terbaru", flush: true, actions: h(Button, { href: "/pesanan", variant: "secondary", small: true }, "Semua") }, h(Table, ...))
 */
export function Card({ title, actions, flush, children }: WithChildren<{ title?: string; actions?: Child; flush?: boolean }>): Child {
  return h("section", { class: flush ? "zu-card flush" : "zu-card" }, title || actions ? h("div", { class: "zu-card-head" }, h("h2", null, title ?? ""), actions ?? null) : null, children);
}

/**
 * Grid responsif untuk kartu yang setara; jumlah kolom menyesuaikan lebar layar (minimal 220px per kartu).
 * @en Responsive grid for equal cards; the number of columns follows the screen width (at least 220px per card).
 * @group layout
 * @example h(Grid, null, items.map((p) => h(Card, { title: p.name }, money(p.price))))
 */
export function Grid({ children }: WithChildren<object>): Child {
  return h("div", { class: "zu-grid" }, children);
}

/**
 * Dua kolom tidak simetris (2:1): isi utama dan panel samping, menumpuk di layar sempit. Isi dengan dua anak.
 * @en Two uneven columns (2:1): main content and a side panel, stacked on narrow screens. Give it two children.
 * @group layout
 * @example h(Split, null, h(Card, { title: "Catatan" }, ...), h(Card, { title: "Info akun" }, ...))
 */
export function Split({ children }: WithChildren<object>): Child {
  return h("div", { class: "zu-split" }, children);
}

/**
 * Satu angka ringkasan. Kumpulkan beberapa di dalam StatGroup agar tampil sebagai satu strip bersekat.
 * `trend` + `change` menampilkan perubahan naik/turun berwarna (hijau bila baik); `good: "down"` untuk
 * angka yang lebih baik bila turun (mis. keluhan).
 * @en One summary number. Put several inside a StatGroup to show them as one divided strip. `trend` + `change` show a colored up/down change (green when good); `good: "down"` for numbers that are better when they go down (e.g. complaints).
 * @group data
 * @example h(Stat, { label: "Pendapatan", value: rupiah(12500000), trend: "up", change: "12%", hint: "dari bulan lalu" })
 */
export function Stat({
  label,
  value,
  hint,
  trend,
  change,
  good = "up",
}: WithChildren<{ label: string; value: string | number; hint?: string; trend?: "up" | "down" | "flat"; change?: string; good?: "up" | "down" }>): Child {
  const m = t().ui;
  const tone = !trend || trend === "flat" ? "flat" : trend === good ? "good" : "bad";
  const arrow = trend === "up" ? "↑" : trend === "down" ? "↓" : "→";
  const delta = trend ? h("span", { class: `zu-trend ${tone}` }, h("span", { role: "img", "aria-label": m.trend[trend] }, arrow), change ? [" ", change] : null) : null;
  return h("div", { class: "zu-stat" }, h("span", null, label), h("b", null, value), delta || hint ? h("small", null, delta, delta && hint ? " " : null, hint ?? null) : null);
}

/**
 * Strip angka ringkasan dengan pemisah tipis, pengganti deretan kartu kembar.
 * @en Strip of summary numbers with thin dividers, instead of a row of identical cards.
 * @group data
 * @example h(StatGroup, null, h(Stat, { label: "Produk", value: 12 }), h(Stat, { label: "Pesanan", value: 40 }))
 */
export function StatGroup({ children }: WithChildren<object>): Child {
  return h("section", { class: "zu-stats", "aria-label": t().ui.summary }, children);
}

/**
 * Tombol atau tautan bergaya tombol (`href`). `variant`: primary (default), secondary, ghost, danger.
 * `loading` mengganti teks selama formulir dikirim. `opens`/`closes` membuka atau menutup Dialog, Drawer, atau Popover.
 * @en Button, or a link styled as a button (`href`). `variant`: primary (default), secondary, ghost, danger. `loading` replaces the label while the form is being sent. `opens`/`closes` open or close a Dialog, Drawer, or Popover.
 * @group form
 * @example h(Button, { loading: "Menyimpan…" }, "Simpan")
 */
export function Button({
  variant = "primary",
  type = "submit",
  href,
  small,
  block,
  name,
  value,
  loading,
  opens,
  closes,
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
  /** id Dialog, Drawer, atau Popover yang dibuka tombol ini (tanpa JavaScript). */
  opens?: string;
  /** id Dialog, Drawer, atau Popover yang ditutup tombol ini. */
  closes?: string;
}>): Child {
  const cls = ["zu-btn", variant, small ? "small" : "", block ? "block" : ""].filter(Boolean).join(" ");
  if (href) return h("a", { class: cls, href }, children);
  const target = opens ?? closes;
  return h(
    "button",
    { class: cls, type: target ? "button" : type, name, value, "data-loading": loading, popovertarget: target, popovertargetaction: opens ? "show" : closes ? "hide" : undefined },
    children,
  );
}

/**
 * Tombol yang mengirim POST ke `action` (mis. hapus data), dengan konfirmasi browser opsional.
 * Tidak memakai JavaScript kecuali untuk konfirmasi.
 * @en Button that POSTs to `action` (e.g. delete a record), with an optional browser confirmation. No JavaScript except for the confirmation.
 * @group form
 * @example h(PostButton, { action: `/produk/${p.id}/hapus`, confirm: `Hapus ${p.name}?` }, "Hapus")
 */
export function PostButton({ action, confirm, variant = "danger", children }: WithChildren<{ action: string; confirm?: string; variant?: "primary" | "secondary" | "ghost" | "danger" }>): Child {
  return h(
    "form",
    { class: "zu-inline", method: "post", action },
    confirm ? raw(`<button class="zu-btn ${variant} small" type="submit" onclick="return confirm(${escapeHtml(JSON.stringify(confirm))})">${renderToString(children)}</button>`) : h(Button, { variant, small: true }, children),
  );
}

/**
 * Pesan untuk pengguna: `tone` info (default), success, error, atau warn.
 * @en Message for the user: `tone` info (default), success, error, or warn.
 * @group feedback
 * @example h(Alert, { tone: "success" }, "Produk tersimpan.")
 */
export function Alert({ tone = "info", children }: WithChildren<{ tone?: "info" | "success" | "error" | "warn" }>): Child {
  return h("div", { class: `zu-alert ${tone}`, role: tone === "error" ? "alert" : "status" }, children);
}

/**
 * Label kecil bersudut untuk status atau kategori: `tone` accent, gold, ok, warn, danger, atau netral.
 * @en Small rounded label for a status or category: `tone` accent, gold, ok, warn, danger, or neutral.
 * @group data
 * @example h(Badge, { tone: "ok" }, "Lunas")
 */
export function Badge({ tone, children }: WithChildren<{ tone?: "accent" | "gold" | "danger" | "ok" | "warn" }>): Child {
  return h("span", { class: tone ? `zu-badge ${tone}` : "zu-badge" }, children);
}

export interface Column {
  label: string;
  /** "num" = rata kanan dengan angka tabular; "end" = kolom aksi rapat di kanan. */
  align?: "num" | "end";
}

/**
 * Tabel data. `align: "num"` untuk kolom angka, `"end"` untuk kolom aksi. Tanpa baris, menampilkan
 * `empty` (atau teks default). Bergulir mendatar sendiri di layar sempit.
 * @en Data table. `align: "num"` for number columns, `"end"` for an actions column. With no rows it shows `empty` (or a default text). Scrolls sideways on its own on narrow screens.
 * @group data
 * @example h(Table, { columns: [{ label: "Produk" }, { label: "Harga", align: "num" }], rows: products.map((p) => [p.name, money(p.price)]), empty: h(EmptyState, { title: "Belum ada produk" }) })
 */
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

/**
 * Daftar ringkas: setiap item satu baris (label di kiri, nilai/aksi di kanan).
 * @en Compact list: one line per item (label on the left, value/action on the right).
 * @group data
 * @example h(List, { items: [["Email", user.email], ["Peran", "Admin"]] })
 */
export function List({ items }: WithChildren<{ items: Child[][] }>): Child {
  return h("ul", { class: "zu-list" }, items.map((cells) => h("li", null, cells)));
}

/**
 * Keadaan kosong yang memberi tahu cara mengisinya.
 * @en Empty state that tells the user how to fill it.
 * @group feedback
 * @example h(EmptyState, { title: "Belum ada produk", text: "Tambahkan produk pertama Anda.", action: h(Button, { href: "/produk/baru" }, "Tambah produk") })
 */
export function EmptyState({ title, text, action }: WithChildren<{ title: string; text?: string; action?: Child }>): Child {
  return h("div", { class: "zu-empty" }, h("b", null, title), text ? h("p", null, text) : null, action ?? null);
}

/**
 * Kotak pencarian (GET, `?q=`). Menampilkan tautan "Hapus" bila ada kata kunci.
 * @en Search box (GET, `?q=`). Shows a "Clear" link when there is a query.
 * @group form
 * @example h(Search, { action: "/produk", value: ctx.query.q })
 */
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

/**
 * Isi yang bisa dibuka-tutup tanpa JavaScript (mis. formulir tambah data).
 * @en Content that opens and closes without JavaScript (e.g. an add form).
 * @group layout
 * @example h(Disclosure, { summary: "Tambah produk", open: errors !== undefined }, h(Form, ...))
 */
export function Disclosure({ summary, open, children }: WithChildren<{ summary: string; open?: boolean }>): Child {
  return h("details", { class: "zu-disclosure", open }, h("summary", null, summary), h("div", null, children));
}

/**
 * Format rupiah, mis. 45000 -> "Rp45.000", apa pun bahasa aktifnya.
 * @en Rupiah format, e.g. 45000 -> "Rp45.000", whatever the active language.
 * @group format
 * @example rupiah(45000)
 */
export function rupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value).replace(/\s/g, "");
}

export { UI_CSS } from "./styles.js";
export * from "./layout.js";
export * from "./forms.js";
export * from "./nav.js";
export * from "./overlay.js";
export * from "./feedback.js";
export * from "./data.js";
export * from "./public.js";
export * from "./commerce.js";
export { StatusPage, statusPage } from "./status.js";
export { flash, takeFlash, type Flash } from "../core/flash.js";
export type { Align, Gap, Justify } from "./types.js";
export { ACCENT_PRESETS, DEFAULT_THEME, resolveUiTheme, type ThemeFont, type ThemeMode, type ThemeRadius, type UiTheme, type UiThemeConfig } from "./theme.js";

/**
 * Format mata uang sesuai bahasa aktif (default IDR untuk id, USD untuk en).
 * @en Currency in the active language's format (IDR by default for id, USD for en).
 * @group format
 * @example money(12.5, "USD")
 */
export function money(value: number, currency = getLocale() === "en" ? "USD" : "IDR"): string {
  const fraction = currency === "IDR" ? 0 : undefined;
  return new Intl.NumberFormat(intlLocale(), { style: "currency", currency, maximumFractionDigits: fraction }).format(value).replace(/\s/g, "");
}

/**
 * Angka dengan pemisah ribuan sesuai bahasa aktif, mis. 12500 -> "12.500" (id) atau "12,500" (en).
 * @en Number with thousands separators for the active language, e.g. 12500 -> "12.500" (id) or "12,500" (en).
 * @group format
 * @example formatNumber(12500)
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(intlLocale()).format(value);
}

/**
 * Tanggal sesuai bahasa aktif, mis. "25 Sep 2026" (id) atau "Sep 25, 2026" (en).
 * @en Date in the active language, e.g. "25 Sep 2026" (id) or "Sep 25, 2026" (en).
 * @group format
 * @example formatDate(note.createdAt, "long")
 */
export function formatDate(value: Date | string | number, style: "short" | "medium" | "long" | "full" = "medium"): string {
  return new Intl.DateTimeFormat(intlLocale(), { dateStyle: style }).format(new Date(value));
}
