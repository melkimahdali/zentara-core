import { h, type Child } from "../core/view.js";
import { t } from "../i18n/index.js";
import { Badge, formatNumber, money } from "./index.js";
import type { ImageRef } from "./public.js";
import { cx, type WithChildren } from "./types.js";

/**
 * Pola usaha: harga dengan coret diskon, kartu produk, input jumlah, dan ringkasan keranjang. Angka
 * diformat dengan money() (rupiah tanpa desimal untuk Bahasa Indonesia).
 */

/**
 * Harga dengan harga coret opsional (`original`) dan periode (mis. "/bulan"). Angka diformat sesuai
 * bahasa aktif; rupiah tanpa desimal.
 * @en Price with an optional struck-through original price (`original`) and period (e.g. "/month"). Numbers follow the active language; rupiah without decimals.
 * @group commerce
 * @example h(PriceTag, { amount: 45000, original: 60000 })
 */
export function PriceTag({ amount, original, currency, period, large }: WithChildren<{ amount: number; original?: number; currency?: string; period?: string; large?: boolean }>): Child {
  const m = t().ui.shop;
  const cut = original !== undefined && original > amount;
  return h(
    "span",
    { class: cx("zu-price", large && "large") },
    h("b", null, money(amount, currency)),
    period ? h("span", null, period) : null,
    cut ? h("del", { "aria-label": m.was(money(original, currency)) }, money(original, currency)) : null,
  );
}

/** Persen potongan harga, dibulatkan (60000 -> 45000 = 25). */
function discountPercent(amount: number, original?: number): number {
  return original && original > amount ? Math.round(((original - amount) / original) * 100) : 0;
}

/**
 * Kartu produk untuk katalog toko: foto, nama, harga (dengan coret dan label diskon otomatis), rating,
 * label stok habis, dan tombol aksi (mis. formulir "Tambah ke keranjang").
 * @en Product card for a shop catalog: photo, name, price (with an automatic strike-through and discount label), rating, sold-out label, and an action (e.g. an "Add to cart" form).
 * @group commerce
 * @example h(ProductCard, { name: p.name, href: `/produk/${p.slug}`, image: { src: p.photo, alt: p.name }, price: p.price, original: p.oldPrice, rating: 4.8, reviews: 120, action: h(PostButton, { action: `/keranjang/${p.id}`, variant: "primary" }, "Tambah") })
 */
export function ProductCard({
  name,
  price,
  original,
  image,
  href,
  rating,
  reviews,
  badge,
  soldOut,
  currency,
  action,
}: WithChildren<{
  name: string;
  price: number;
  original?: number;
  image: ImageRef;
  href?: string;
  rating?: number;
  reviews?: number;
  /** Label di atas nama produk, mis. "Baru". Default: persen diskon bila ada `original`. */
  badge?: string;
  soldOut?: boolean;
  currency?: string;
  action?: Child;
}>): Child {
  const m = t().ui.shop;
  const off = discountPercent(price, original);
  const label = soldOut ? m.soldOut : badge ?? (off ? m.off(off) : undefined);
  return h(
    "article",
    { class: cx("zu-product", soldOut && "sold-out") },
    h("img", { class: "zu-product-photo", src: image.src, alt: image.alt, loading: "lazy", width: 600, height: 600 }),
    h(
      "div",
      { class: "zu-product-body" },
      label ? h(Badge, { tone: soldOut ? undefined : off && !badge ? "danger" : "accent" }, label) : null,
      h("h3", null, href ? h("a", { href, class: "zu-stretch" }, name) : name),
      h(PriceTag, { amount: price, original, currency }),
      rating !== undefined
        ? h(
            "span",
            { class: "zu-product-rating", role: "img", "aria-label": t().ui.ratingOf(formatNumber(rating), 5) },
            h("span", { "aria-hidden": "true" }, "★ "),
            h("span", { "aria-hidden": "true" }, formatNumber(rating)),
            reviews !== undefined ? h("small", { "aria-hidden": "true" }, ` (${formatNumber(reviews)})`) : null,
          )
        : null,
      action && !soldOut ? h("div", { class: "zu-product-action" }, action) : null,
    ),
  );
}

let qtyCount = 0;

/**
 * Input jumlah barang dengan tombol − dan + (tampil bila JavaScript aktif; tanpa JavaScript tetap
 * berupa input angka biasa). Dipakai di dalam Form.
 * @en Quantity input with − and + buttons (shown when JavaScript runs; without JavaScript it is a plain number input). Use it inside a Form.
 * @group commerce
 * @example h(QuantityInput, { name: "qty", value: 1, max: product.stock })
 */
export function QuantityInput({ name, value = 1, min = 1, max, label, hideLabel }: WithChildren<{ name: string; value?: number; min?: number; max?: number; label?: string; hideLabel?: boolean }>): Child {
  const m = t().ui.shop;
  const id = `zu-qty-${(qtyCount = (qtyCount + 1) % 1_000_000)}`;
  const text = label ?? m.quantity;
  return h(
    "div",
    { class: "zu-qty-field" },
    hideLabel ? null : h("label", { for: id }, text),
    h(
      "div",
      { class: "zu-qty" },
      h("button", { type: "button", hidden: true, "data-zu-step": "-1", "aria-label": m.decrease, "aria-controls": id }, "−"),
      h("input", { class: "zu-input", id, name, type: "number", inputmode: "numeric", value, min, max, step: 1, required: true, "aria-label": hideLabel ? text : undefined }),
      h("button", { type: "button", hidden: true, "data-zu-step": "1", "aria-label": m.increase, "aria-controls": id }, "+"),
    ),
  );
}

export interface CartLine {
  name: string;
  price: number;
  qty: number;
  image?: ImageRef;
  href?: string;
  /** Keterangan varian, mis. "Ukuran 20 cm". */
  note?: string;
  /** Kontrol per baris, mis. QuantityInput atau PostButton hapus. */
  actions?: Child;
}

/**
 * Ringkasan keranjang atau pesanan: daftar barang (jumlah × harga), subtotal, ongkir, potongan, dan
 * total, plus tombol lanjut (mis. "Bayar"). Ongkir 0 tertulis "Gratis"; keranjang kosong menampilkan `empty`.
 * @en Cart or order summary: items (quantity × price), subtotal, shipping, discount, and total, plus a next-step button (e.g. "Pay"). Zero shipping reads "Free"; an empty cart shows `empty`.
 * @group commerce
 * @example h(CartSummary, { items: cart.map((c) => ({ name: c.name, price: c.price, qty: c.qty })), shipping: 15000, action: h(Button, { href: "/bayar", block: true }, "Lanjut bayar") })
 */
export function CartSummary({
  items,
  shipping,
  discount,
  currency,
  title,
  action,
  empty,
}: WithChildren<{ items: CartLine[]; shipping?: number; discount?: number; currency?: string; title?: string; action?: Child; empty?: Child }>): Child {
  const m = t().ui.shop;
  const fmt = (n: number) => money(n, currency);
  if (!items.length) return h("section", { class: "zu-cart" }, h("h2", null, title ?? m.cart), h("div", { class: "zu-cart-empty" }, empty ?? m.cartEmpty));
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const total = Math.max(0, subtotal + (shipping ?? 0) - (discount ?? 0));
  const row = (label: string, value: string, cls?: string) => h("div", { class: cls }, h("dt", null, label), h("dd", null, value));
  return h(
    "section",
    { class: "zu-cart" },
    h("h2", null, title ?? m.cart),
    h(
      "ul",
      { class: "zu-cart-items" },
      items.map((i) =>
        h(
          "li",
          null,
          i.image ? h("img", { src: i.image.src, alt: i.image.alt, width: 64, height: 64, loading: "lazy" }) : null,
          h("div", { class: "zu-cart-name" }, i.href ? h("a", { href: i.href }, i.name) : h("b", null, i.name), i.note ? h("small", null, i.note) : null, h("small", null, m.each(i.qty, fmt(i.price)))),
          h("b", { class: "zu-cart-line" }, fmt(i.price * i.qty)),
          i.actions ? h("div", { class: "zu-cart-actions" }, i.actions) : null,
        ),
      ),
    ),
    h(
      "dl",
      { class: "zu-cart-totals" },
      row(m.subtotal, fmt(subtotal)),
      shipping !== undefined ? row(m.shipping, shipping === 0 ? m.free : fmt(shipping)) : null,
      discount ? row(m.discount, `−${fmt(discount)}`, "good") : null,
      row(m.total, fmt(total), "total"),
    ),
    action ? h("div", { class: "zu-cart-action" }, action) : null,
  );
}
