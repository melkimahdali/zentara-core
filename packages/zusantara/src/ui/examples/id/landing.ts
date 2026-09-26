/**
 * Landing page toko kue
 * Halaman depan usaha kecil: navigasi, hero dengan foto, keunggulan, produk unggulan, testimoni, FAQ,
 * ajakan pesan, dan kaki halaman. Tanpa CSS sendiri.
 */
import { h } from "../../../core/view.js";
import { Button, Columns, Container, CTA, FAQ, FeatureGrid, Footer, Hero, Navbar, page, placeholder, ProductCard, Section, Stack, Testimonial } from "../../index.js";

// Di aplikasi nyata data ini dari database.
const products = [
  { slug: "bolu-pandan", name: "Bolu pandan", price: 45000, original: 55000, rating: 4.9, reviews: 212 },
  { slug: "brownies-panggang", name: "Brownies panggang", price: 38000, rating: 4.8, reviews: 180 },
  { slug: "kue-lapis-legit", name: "Kue lapis legit", price: 120000, rating: 5, reviews: 64 },
];

export function GET() {
  return page(
    { title: "Dapur Senja · Kue rumahan di Bandung", description: "Kue segar tanpa pengawet, dipanggang setiap pagi dan diantar ke rumah Anda." },
    h(Navbar, {
      appName: "Dapur Senja",
      links: [
        { href: "/", label: "Beranda" },
        { href: "/menu", label: "Menu" },
        { href: "/tentang", label: "Tentang" },
      ],
      active: "/",
      actions: h(Button, { href: "/pesan", small: true }, "Pesan"),
    }),
    h(
      "main",
      { id: "konten" },
      h(
        Container,
        null,
        h(
          Stack,
          { gap: "xl" },
          h(Hero, {
            eyebrow: "Kue rumahan di Bandung",
            title: "Kue segar, dipanggang setiap pagi",
            text: "Tanpa pengawet dan pewarna buatan. Pesan sebelum jam 10, kue sampai di rumah Anda sore ini.",
            actions: [h(Button, { href: "/menu" }, "Lihat menu"), h(Button, { href: "https://wa.me/6281234567890", variant: "secondary" }, "Tanya lewat WhatsApp")],
            image: { src: placeholder("Kue cokelat", 800, 600), alt: "Kue cokelat dengan taburan kacang di atas meja kayu" },
          }),
          h(FeatureGrid, {
            title: "Kenapa Dapur Senja",
            features: [
              { icon: "🌾", title: "Bahan lokal", text: "Tepung, telur, dan mentega dari peternak di sekitar Lembang." },
              { icon: "🚚", title: "Antar hari ini", text: "Gratis ongkir se-Bandung untuk pesanan di atas Rp150.000." },
              { icon: "🎂", title: "Bisa pesan khusus", text: "Tulisan dan hiasan sesuai acara ulang tahun atau arisan." },
            ],
          }),
          h(
            Section,
            { title: "Paling dicari minggu ini", actions: h(Button, { href: "/menu", variant: "secondary", small: true }, "Semua menu") },
            h(
              Columns,
              { cols: 3 },
              products.map((p) =>
                h(ProductCard, {
                  name: p.name,
                  href: `/menu/${p.slug}`,
                  image: { src: placeholder(p.name, 600, 600), alt: p.name },
                  price: p.price,
                  original: p.original,
                  rating: p.rating,
                  reviews: p.reviews,
                }),
              ),
            ),
          ),
          h(
            Section,
            { title: "Kata pelanggan" },
            h(
              Columns,
              { cols: 2 },
              h(Testimonial, { quote: "Bolunya lembut dan wangi pandan asli. Anak-anak minta pesan lagi.", name: "Rina Wulandari", role: "Pelanggan sejak 2024", rating: 5 }),
              h(Testimonial, { quote: "Pesan jam 9, jam 3 sore sudah sampai. Kemasannya rapi untuk hantaran.", name: "Budi Santoso", role: "Pemesan arisan kantor", rating: 5 }),
            ),
          ),
          h(FAQ, {
            title: "Pertanyaan umum",
            items: [
              { question: "Berapa lama kue tahan?", answer: "Tiga hari di suhu ruang, satu minggu di kulkas." },
              { question: "Bisa kirim ke luar Bandung?", answer: "Untuk kue kering bisa lewat ekspedisi. Kue basah hanya se-Bandung Raya." },
              { question: "Bagaimana cara bayar?", answer: "Transfer bank, QRIS, atau bayar di tempat untuk wilayah Bandung." },
            ],
          }),
          h(CTA, {
            title: "Ada acara minggu ini?",
            text: "Pesan kue untuk 20 orang atau lebih dan dapatkan potongan 10%.",
            actions: h(Button, { href: "/pesan" }, "Pesan sekarang"),
          }),
        ),
      ),
    ),
    h(Footer, {
      appName: "Dapur Senja",
      columns: [
        {
          title: "Toko",
          links: [
            { href: "/menu", label: "Menu" },
            { href: "/pesan", label: "Cara pesan" },
          ],
        },
        {
          title: "Tentang",
          links: [
            { href: "/tentang", label: "Cerita kami" },
            { href: "/kontak", label: "Kontak" },
          ],
        },
      ],
    }),
  );
}
