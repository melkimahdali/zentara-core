import { h, type Child } from "../core/view.js";
import { t } from "../i18n/index.js";
import { Brand } from "./index.js";
import { cx, type WithChildren } from "./types.js";

/**
 * Navigasi kit UI: bilah atas halaman publik, breadcrumb, tab, halaman, langkah, menu tarik-turun,
 * navigasi bawah ponsel, dan footer. Semuanya berupa tautan atau formulir biasa sehingga berfungsi
 * tanpa JavaScript; menu ponsel dan menu tarik-turun memakai `<details>`.
 */

export interface NavLink {
  href: string;
  label: string;
}

export interface Crumb {
  label: string;
  /** Kosongkan untuk halaman saat ini (item terakhir). */
  href?: string;
}

/**
 * Bilah navigasi atas untuk halaman publik: logo, tautan, dan tombol aksi. Di ponsel tautan dan aksi
 * pindah ke menu yang dibuka lewat tombol Menu (tanpa JavaScript). Untuk aplikasi dengan login, pakai AppShell.
 * @en Top navigation bar for public pages: logo, links, and action buttons. On phones the links and actions move into a menu opened with the Menu button (no JavaScript). For signed-in apps use AppShell.
 * @group nav
 * @example h(Navbar, { appName: "Toko Senja", links: [{ href: "/", label: "Beranda" }, { href: "/menu", label: "Menu" }], active: "/menu", actions: h(Button, { href: "/pesan", small: true }, "Pesan") })
 */
export function Navbar({
  appName,
  href = "/",
  links = [],
  active,
  actions,
}: WithChildren<{ appName?: string; href?: string; links?: NavLink[]; active?: string; actions?: Child }>): Child {
  const m = t().ui;
  const items = (cls: string) => h("nav", { class: cls, "aria-label": m.mainNav }, links.map((l) => h("a", { href: l.href, "aria-current": l.href === active ? "page" : undefined }, l.label)));
  return h(
    "header",
    { class: "zu-navbar" },
    h(
      "div",
      { class: "zu-navbar-in" },
      h(Brand, { name: appName, href }),
      items("zu-navbar-links"),
      actions ? h("div", { class: "zu-navbar-actions" }, actions) : null,
      links.length || actions
        ? h(
            "details",
            { class: "zu-navbar-menu" },
            h("summary", { "aria-label": m.menu }, h("span", { class: "zu-burger", "aria-hidden": "true" }), m.menu),
            h("div", { class: "zu-navbar-panel" }, items("zu-navbar-mobile"), actions ? h("div", { class: "zu-navbar-panel-actions" }, actions) : null),
          )
        : null,
    ),
  );
}

/**
 * Jejak lokasi halaman (Beranda / Produk / Kopi). Item terakhir adalah halaman saat ini.
 * @en Page location trail (Home / Products / Coffee). The last item is the current page.
 * @group nav
 * @example h(Breadcrumb, { items: [{ label: "Beranda", href: "/" }, { label: "Produk", href: "/produk" }, { label: "Kopi" }] })
 */
export function Breadcrumb({ items }: WithChildren<{ items: Crumb[] }>): Child {
  if (!items.length) return null;
  return h(
    "nav",
    { class: "zu-crumbs", "aria-label": t().ui.breadcrumb },
    h(
      "ol",
      null,
      items.map((c, i) => {
        const last = i === items.length - 1;
        return h("li", null, c.href && !last ? h("a", { href: c.href }, c.label) : h("span", { "aria-current": last ? "page" : undefined }, c.label));
      }),
    ),
  );
}

export interface TabItem {
  href: string;
  label: string;
  /** Angka kecil di samping label, mis. jumlah pesanan baru. */
  count?: number;
}

/**
 * Tab berupa tautan (mis. `?tab=aktif`), jadi setiap tab punya URL sendiri dan berfungsi tanpa
 * JavaScript. `active` = href tab yang sedang dibuka. Bergulir mendatar di layar sempit.
 * @en Tabs made of links (e.g. `?tab=active`), so each tab has its own URL and works without JavaScript. `active` = href of the open tab. Scrolls sideways on narrow screens.
 * @group nav
 * @example h(Tabs, { items: [{ href: "?tab=baru", label: "Baru", count: 3 }, { href: "?tab=selesai", label: "Selesai" }], active: `?tab=${tab}` })
 */
export function Tabs({ items, active, label }: WithChildren<{ items: TabItem[]; active?: string; label?: string }>): Child {
  return h(
    "nav",
    { class: "zu-tabs", "aria-label": label },
    items.map((item) =>
      h("a", { href: item.href, "aria-current": item.href === active ? "page" : undefined }, item.label, item.count !== undefined ? h("span", { class: "zu-tab-count" }, String(item.count)) : null),
    ),
  );
}

/** Nomor halaman yang ditampilkan: pertama, terakhir, dan tetangga halaman aktif; 0 = celah (…). */
function pageWindow(current: number, pages: number, around = 1): number[] {
  const out: number[] = [];
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - current) <= around) out.push(p);
    else if (out[out.length - 1] !== 0) out.push(0);
  }
  // Celah satu nomor lebih baik ditulis nomornya saja.
  return out.map((p, i) => (p === 0 && out[i - 1]! + 2 === out[i + 1] ? out[i - 1]! + 1 : p));
}

/**
 * Nomor halaman untuk daftar panjang, berupa tautan biasa. `href` memakai `{page}` sebagai tempat
 * nomor halaman (default `?page={page}`). Di ponsel hanya Sebelumnya, "Halaman 2 dari 9", dan Berikutnya.
 * @en Page numbers for long lists, as plain links. `href` uses `{page}` as the page-number placeholder (default `?page={page}`). On phones only Previous, "Page 2 of 9", and Next.
 * @group nav
 * @example h(Pagination, { page: Number(ctx.query.page ?? 1), pages: Math.ceil(total / 20), href: "/produk?page={page}" })
 */
export function Pagination({ page, pages, href = "?page={page}" }: WithChildren<{ page: number; pages: number; href?: string }>): Child {
  if (pages <= 1) return null;
  const m = t().ui;
  const current = Math.min(Math.max(1, Math.floor(page) || 1), pages);
  const url = (p: number) => href.replaceAll("{page}", String(p));
  const edge = (p: number, label: string, rel: string, cls: string) =>
    p >= 1 && p <= pages ? h("a", { class: `zu-page ${cls}`, href: url(p), rel }, label) : h("span", { class: `zu-page ${cls}`, "aria-disabled": "true" }, label);
  return h(
    "nav",
    { class: "zu-pagination", "aria-label": m.pagination },
    edge(current - 1, m.previous, "prev", "edge"),
    h(
      "ol",
      null,
      pageWindow(current, pages).map((p) =>
        h("li", null, p === 0 ? h("span", { class: "zu-page gap" }, "…") : p === current ? h("span", { class: "zu-page", "aria-current": "page" }, String(p)) : h("a", { class: "zu-page", href: url(p), "aria-label": m.pageOf(p, pages) }, String(p))),
      ),
    ),
    h("span", { class: "zu-page-label" }, m.pageOf(current, pages)),
    edge(current + 1, m.next, "next", "edge"),
  );
}

export interface StepItem {
  label: string;
  description?: string;
}

/**
 * Langkah proses (mis. checkout: Keranjang, Alamat, Bayar). `current` = nomor langkah aktif, mulai
 * dari 1; langkah sebelumnya ditandai selesai. Menumpuk vertikal di ponsel.
 * @en Process steps (e.g. checkout: Cart, Address, Pay). `current` = the active step number, starting at 1; earlier steps are marked done. Stacks vertically on phones.
 * @group nav
 * @example h(Steps, { steps: ["Keranjang", "Alamat", "Pembayaran"], current: 2 })
 */
export function Steps({ steps, current }: WithChildren<{ steps: (string | StepItem)[]; current: number }>): Child {
  const m = t().ui;
  return h(
    "ol",
    { class: "zu-steps", "aria-label": m.steps },
    steps.map((s, i) => {
      const item = typeof s === "string" ? { label: s } : s;
      const n = i + 1;
      const state = n < current ? "done" : n === current ? "current" : "todo";
      return h(
        "li",
        { class: state, "aria-current": state === "current" ? "step" : undefined },
        h("span", { class: "zu-step-dot", "aria-hidden": state === "done" ? undefined : "true", title: state === "done" ? m.stepDone : undefined }, state === "done" ? "✓" : String(n)),
        h("span", { class: "zu-step-text" }, h("b", null, item.label), item.description ? h("small", null, item.description) : null),
      );
    }),
  );
}

export interface MenuItem {
  label: string;
  /** Tautan biasa. */
  href?: string;
  /** Kirim POST ke URL ini (mis. hapus atau keluar), bukan tautan. */
  action?: string;
  /** Warna bahaya untuk aksi yang menghapus. */
  danger?: boolean;
}

/**
 * Tombol yang membuka daftar aksi (tautan atau POST), tanpa JavaScript. `align: "end"` membuka menu
 * rata kanan (untuk tombol di sisi kanan).
 * @en Button that opens a list of actions (links or POSTs), without JavaScript. `align: "end"` opens the menu right-aligned (for a button on the right side).
 * @group nav
 * @example h(DropdownMenu, { label: "Aksi", align: "end", items: [{ label: "Ubah", href: `/produk/${p.id}` }, { label: "Hapus", action: `/produk/${p.id}/hapus`, danger: true }] })
 */
export function DropdownMenu({ label, items, align = "start" }: WithChildren<{ label: string; items: MenuItem[]; align?: "start" | "end" }>): Child {
  return h(
    "details",
    { class: cx("zu-dropdown", align === "end" && "end") },
    h("summary", { class: "zu-btn secondary small" }, label, h("span", { class: "zu-caret", "aria-hidden": "true" })),
    h(
      "div",
      { class: "zu-menu" },
      items.map((item) =>
        item.action
          ? h("form", { method: "post", action: item.action }, h("button", { type: "submit", class: cx("zu-menu-item", item.danger && "danger") }, item.label))
          : h("a", { class: cx("zu-menu-item", item.danger && "danger"), href: item.href ?? "#" }, item.label),
      ),
    ),
  );
}

export interface BottomNavItem {
  href: string;
  label: string;
  /** Ikon kecil di atas label (mis. emoji atau `<svg>` lewat raw()). */
  icon?: Child;
}

/**
 * Navigasi bawah untuk ponsel (3 sampai 5 tujuan utama), menempel di bawah layar. Hanya tampil di
 * layar sempit; di layar lebar pakai Navbar atau AppShell.
 * @en Bottom navigation for phones (3 to 5 main destinations), fixed to the bottom of the screen. Only shown on narrow screens; on wide screens use Navbar or AppShell.
 * @group nav
 * @example h(BottomNav, { items: [{ href: "/", label: "Beranda", icon: "⌂" }, { href: "/pesanan", label: "Pesanan", icon: "☰" }], active: "/pesanan" })
 */
export function BottomNav({ items, active }: WithChildren<{ items: BottomNavItem[]; active?: string }>): Child {
  return h(
    "nav",
    { class: "zu-bottomnav", "aria-label": t().ui.mainNav },
    items.map((item) => h("a", { href: item.href, "aria-current": item.href === active ? "page" : undefined }, item.icon !== undefined ? h("span", { class: "zu-bottomnav-icon", "aria-hidden": "true" }, item.icon) : null, h("span", null, item.label))),
  );
}

export interface FooterColumn {
  title: string;
  links: NavLink[];
}

/**
 * Kaki halaman publik: nama aplikasi, kolom tautan, dan catatan (default "© tahun nama").
 * @en Public page footer: app name, link columns, and a note (default "© year name").
 * @group nav
 * @example h(Footer, { appName: "Toko Senja", columns: [{ title: "Toko", links: [{ href: "/menu", label: "Menu" }, { href: "/kontak", label: "Kontak" }] }] })
 */
export function Footer({ appName = "Zusantara Core", columns = [], links = [], note }: WithChildren<{ appName?: string; columns?: FooterColumn[]; links?: NavLink[]; note?: Child }>): Child {
  return h(
    "footer",
    { class: "zu-footer" },
    h(
      "div",
      { class: "zu-footer-in" },
      columns.length
        ? h(
            "div",
            { class: "zu-footer-cols" },
            h("div", null, h(Brand, { name: appName })),
            columns.map((c) => h("div", null, h("h2", null, c.title), h("ul", null, c.links.map((l) => h("li", null, h("a", { href: l.href }, l.label)))))),
          )
        : null,
      h(
        "div",
        { class: "zu-footer-base" },
        h("p", null, note ?? t().ui.copyright(new Date().getFullYear(), appName)),
        links.length ? h("nav", { "aria-label": t().ui.footerNav }, links.map((l) => h("a", { href: l.href }, l.label))) : null,
      ),
    ),
  );
}
