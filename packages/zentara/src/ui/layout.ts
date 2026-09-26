import { h, type Child } from "../core/view.js";
import { t } from "../i18n/index.js";
import { cx, type Align, type Gap, type Justify, type WithChildren } from "./types.js";

/**
 * Pembungkus konten dengan lebar maksimum dan jarak tepi, di tengah layar. Untuk halaman publik yang
 * tidak memakai AppShell.
 * @en Centers content with a maximum width and side padding. For public pages that don't use AppShell.
 * @group layout
 * @example h(Container, { size: "md", pad: true }, h(PageHeader, { title: "Tentang kami" }), ...)
 */
export function Container({
  size = "lg",
  pad,
  children,
}: WithChildren<{
  /** sm 640px, md 880px, lg 1180px (default), full tanpa batas. */
  size?: "sm" | "md" | "lg" | "full";
  /** Tambah jarak atas dan bawah (untuk halaman tanpa AppShell). */
  pad?: boolean;
}>): Child {
  return h("div", { class: cx("zu-container", size !== "lg" && size, pad && "pad") }, children);
}

/**
 * Tumpukan vertikal dengan jarak seragam antar anak.
 * @en Vertical stack with even spacing between children.
 * @group layout
 * @example h(Stack, { gap: "lg" }, h(Card, { title: "Profil" }, ...), h(Card, { title: "Keamanan" }, ...))
 */
export function Stack({ gap = "md", align, children }: WithChildren<{ gap?: Gap; align?: Align }>): Child {
  return h("div", { class: cx("zu-stack", `zu-gap-${gap}`, align && `zu-align-${align}`) }, children);
}

/**
 * Baris mendatar (tombol, label, teks dengan aksi). Membungkus ke baris baru di layar sempit kecuali
 * `wrap: false`.
 * @en Horizontal row (buttons, labels, text with actions). Wraps on narrow screens unless `wrap: false`.
 * @group layout
 * @example h(Row, { justify: "between" }, h("b", null, "Total"), h(Button, { href: "/bayar" }, "Bayar"))
 */
export function Row({
  gap = "md",
  align = "center",
  justify,
  wrap = true,
  children,
}: WithChildren<{ gap?: Gap; align?: Align; justify?: Justify; wrap?: boolean }>): Child {
  return h("div", { class: cx("zu-row", `zu-gap-${gap}`, align !== "center" && `zu-align-${align}`, justify && `zu-justify-${justify}`, !wrap && "nowrap") }, children);
}

/**
 * Kumpulan item kecil yang membungkus rapat (label, badge, tombol kecil). Sama dengan Row dengan jarak
 * lebih rapat.
 * @en A tight, wrapping group of small items (tags, badges, small buttons). Row with a smaller gap.
 * @group layout
 * @example h(Cluster, null, h(Badge, null, "Kopi"), h(Badge, null, "Teh"), h(Badge, null, "Susu"))
 */
export function Cluster({ gap = "sm", align = "center", justify, children }: WithChildren<{ gap?: Gap; align?: Align; justify?: Justify }>): Child {
  return h(Row, { gap, align, justify }, children);
}

/**
 * Kolom sama lebar yang menumpuk di layar sempit (3 dan 4 kolom menjadi 2 di tablet, semua menjadi 1
 * di ponsel).
 * @en Equal-width columns that stack on narrow screens (3 and 4 become 2 on tablets, all become 1 on phones).
 * @group layout
 * @example h(Columns, { cols: 3 }, h(Card, { title: "Dasar" }, ...), h(Card, { title: "Pro" }, ...), h(Card, { title: "Tim" }, ...))
 */
export function Columns({ cols = 2, gap = "md", align, children }: WithChildren<{ cols?: 2 | 3 | 4; gap?: Gap; align?: Align }>): Child {
  return h("div", { class: cx("zu-cols", `c${cols}`, gap !== "md" && `zu-gap-${gap}`, align && `zu-align-${align}`) }, children);
}

/**
 * Bagian halaman dengan judul, deskripsi, dan aksi opsional, tanpa kotak kartu.
 * @en A page section with an optional title, description, and actions, without a card box.
 * @group layout
 * @example h(Section, { title: "Pesanan terbaru", actions: h(Button, { href: "/pesanan", variant: "secondary", small: true }, "Semua") }, h(Table, ...))
 */
export function Section({ title, description, actions, id, children }: WithChildren<{ title?: string; description?: string; actions?: Child; id?: string }>): Child {
  const head = title || description || actions ? h("div", { class: "zu-section-head" }, h("div", null, title ? h("h2", null, title) : null, description ? h("p", null, description) : null), actions ?? null) : null;
  return h("section", { class: "zu-section", id }, head, children);
}

/**
 * Garis pemisah tipis, opsional dengan teks di tengah (mis. "atau").
 * @en A thin separator line, optionally with centered text (e.g. "or").
 * @group layout
 * @example h(Divider, { label: "atau" })
 */
export function Divider({ label }: WithChildren<{ label?: string }>): Child {
  return label ? h("div", { class: "zu-divider-label", role: "separator" }, label) : h("hr", { class: "zu-divider" });
}

export interface Crumb {
  label: string;
  /** Kosongkan untuk halaman saat ini (item terakhir). */
  href?: string;
}

/**
 * Kepala halaman: breadcrumb, judul (h1), deskripsi, dan tombol aksi. Untuk halaman tanpa AppShell
 * atau bagian utama halaman publik.
 * @en Page header: breadcrumb, title (h1), description, and action buttons. For pages without AppShell.
 * @group layout
 * @example h(PageHeader, { title: "Produk", description: "Kelola katalog toko", breadcrumb: [{ label: "Beranda", href: "/" }, { label: "Produk" }], actions: h(Button, { href: "/produk/baru" }, "Tambah") })
 */
export function PageHeader({ title, description, breadcrumb, actions }: WithChildren<{ title: string; description?: string; breadcrumb?: Crumb[]; actions?: Child }>): Child {
  const crumbs = breadcrumb?.length
    ? h(
        "nav",
        { class: "zu-crumbs", "aria-label": t().ui.breadcrumb },
        h(
          "ol",
          null,
          breadcrumb.map((c, i) => h("li", null, c.href && i < breadcrumb.length - 1 ? h("a", { href: c.href }, c.label) : h("span", { "aria-current": i === breadcrumb.length - 1 ? "page" : undefined }, c.label))),
        ),
      )
    : null;
  return h("header", { class: "zu-page-head" }, h("div", null, crumbs, h("h1", null, title), description ? h("p", null, description) : null), actions ?? null);
}
