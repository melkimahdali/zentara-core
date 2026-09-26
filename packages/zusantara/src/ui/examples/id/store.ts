/**
 * Toko online dengan keranjang
 * Katalog toko: kategori sebagai tab, kartu produk dengan tombol tambah, ringkasan keranjang di samping,
 * dan nomor halaman. Harga dalam rupiah.
 */
import { h } from "../../../core/view.js";
import { Button, CartSummary, Columns, Container, Footer, Form, Navbar, page, PageHeader, Pagination, placeholder, ProductCard, QuantityInput, Split, Stack, Tabs } from "../../index.js";

// Di aplikasi nyata: produk dari database, keranjang dari session, halaman dari ctx.query.
const products = [
  { id: 1, slug: "kopi-gayo", name: "Kopi Gayo 250 g", price: 85000, original: 95000, rating: 4.9, reviews: 320 },
  { id: 2, slug: "kopi-toraja", name: "Kopi Toraja 250 g", price: 90000, rating: 4.8, reviews: 210 },
  { id: 3, slug: "kopi-kintamani", name: "Kopi Kintamani 250 g", price: 80000, rating: 4.7, reviews: 150, soldOut: true },
  { id: 4, slug: "drip-bag", name: "Drip bag isi 10", price: 45000, rating: 4.6, reviews: 98 },
];
const cart = [
  { name: "Kopi Gayo 250 g", price: 85000, qty: 2, note: "Giling kasar" },
  { name: "Drip bag isi 10", price: 45000, qty: 1 },
];

export function GET() {
  return page(
    { title: "Kopi · Toko Tanah Air" },
    h(Navbar, {
      appName: "Toko Tanah Air",
      links: [
        { href: "/produk", label: "Produk" },
        { href: "/pesanan", label: "Pesanan saya" },
      ],
      active: "/produk",
      actions: h(Button, { href: "/keranjang", small: true, variant: "secondary" }, `Keranjang (${cart.length})`),
    }),
    h(
      Container,
      { pad: true },
      h(
        "main",
        { id: "konten" },
        h(
          Stack,
          { gap: "lg" },
          h(PageHeader, { title: "Kopi", description: "Biji kopi dari petani Nusantara, disangrai setiap Senin.", breadcrumb: [{ label: "Beranda", href: "/" }, { label: "Kopi" }] }),
          h(Tabs, {
            items: [
              { href: "/produk?kategori=kopi", label: "Kopi", count: 12 },
              { href: "/produk?kategori=teh", label: "Teh", count: 8 },
              { href: "/produk?kategori=alat", label: "Alat seduh", count: 5 },
            ],
            active: "/produk?kategori=kopi",
          }),
          h(
            Split,
            null,
            h(
              Stack,
              { gap: "lg" },
              h(
                Columns,
                { cols: 2 },
                products.map((p) =>
                  h(ProductCard, {
                    name: p.name,
                    href: `/produk/${p.slug}`,
                    image: { src: placeholder(p.name, 600, 600), alt: p.name },
                    price: p.price,
                    original: p.original,
                    rating: p.rating,
                    reviews: p.reviews,
                    soldOut: p.soldOut,
                    action: h(
                      Form,
                      { action: `/keranjang/${p.id}` },
                      h(QuantityInput, { name: "qty", value: 1, max: 20, hideLabel: true }),
                      h(Button, { small: true, loading: "Menambah…" }, "Tambah"),
                    ),
                  }),
                ),
              ),
              h(Pagination, { page: 1, pages: 3, href: "/produk?kategori=kopi&halaman={page}" }),
            ),
            h(CartSummary, { items: cart, shipping: 0, discount: 10000, action: h(Button, { href: "/bayar", block: true }, "Lanjut bayar") }),
          ),
        ),
      ),
    ),
    h(Footer, { appName: "Toko Tanah Air" }),
  );
}
