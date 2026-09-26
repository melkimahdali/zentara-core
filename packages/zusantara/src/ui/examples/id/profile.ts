/**
 * Profil usaha dan tim
 * Halaman profil perusahaan: hero rata tengah, angka ringkas, tim dengan foto, galeri kantor, logo
 * klien, dan formulir kontak.
 */
import { h } from "../../../core/view.js";
import { Columns, ContactForm, Container, DescriptionList, Footer, Gallery, Hero, LogoCloud, Navbar, page, placeholder, Section, Stack, Split, Stat, StatGroup, TeamCard } from "../../index.js";

const team = [
  { name: "Sari Dewi", role: "Pendiri dan arsitek", bio: "15 tahun merancang rumah tropis hemat energi.", photo: placeholder("SD", 400, 400) },
  { name: "Andi Pratama", role: "Kepala proyek", bio: "Memastikan setiap proyek selesai tepat waktu.", photo: placeholder("AP", 400, 400) },
  { name: "Maya Lestari", role: "Desainer interior", bio: "Menyukai kayu lokal dan cahaya alami.", photo: placeholder("ML", 400, 400) },
];

export function GET() {
  return page(
    { title: "Studio Ruang · Arsitek rumah tropis", description: "Studio arsitektur di Yogyakarta untuk rumah dan kantor tropis hemat energi." },
    h(Navbar, {
      appName: "Studio Ruang",
      links: [
        { href: "/", label: "Beranda" },
        { href: "/proyek", label: "Proyek" },
        { href: "/tentang", label: "Tentang" },
        { href: "#kontak", label: "Kontak" },
      ],
      active: "/tentang",
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
            eyebrow: "Tentang kami",
            title: "Rumah yang sejuk tanpa AC seharian",
            text: "Sejak 2012 kami merancang rumah dan kantor tropis di Yogyakarta: ventilasi silang, atap lebar, dan bahan lokal.",
            align: "center",
          }),
          h(StatGroup, null, h(Stat, { label: "Proyek selesai", value: "140+" }), h(Stat, { label: "Kota", value: 12 }), h(Stat, { label: "Tahun berdiri", value: 2012 })),
          h(
            Section,
            { title: "Tim kami", description: "Orang-orang yang akan menemani proyek Anda dari sketsa pertama sampai serah terima." },
            h(
              Columns,
              { cols: 3 },
              team.map((p) => h(TeamCard, p)),
            ),
          ),
          h(
            Section,
            { title: "Studio kami" },
            h(Gallery, {
              images: [
                { src: placeholder("Ruang kerja", 800, 600), alt: "Ruang kerja studio dengan meja kayu panjang", caption: "Ruang kerja" },
                { src: placeholder("Maket", 800, 600), alt: "Maket rumah dari karton", caption: "Maket proyek" },
                { src: placeholder("Taman", 800, 600), alt: "Taman kecil di tengah studio", caption: "Taman dalam" },
              ],
            }),
          ),
          h(LogoCloud, {
            title: "Dipercaya oleh",
            logos: ["Kopi Nusantara", "Hotel Senja", "Sekolah Alam"].map((name) => ({ src: placeholder(name, 200, 50), alt: name })),
          }),
          h(
            Section,
            { title: "Hubungi kami", id: "kontak", description: "Ceritakan rencana Anda. Kami membalas dalam satu hari kerja." },
            h(
              Split,
              null,
              h(ContactForm, { action: "/kontak", whatsapp: "081234567890" }),
              h(DescriptionList, {
                items: [
                  { label: "Alamat", value: "Jl. Kaliurang km 5, Yogyakarta" },
                  { label: "Jam kerja", value: "Senin sampai Jumat, 09.00 sampai 17.00" },
                  { label: "Email", value: h("a", { href: "mailto:halo@studioruang.id" }, "halo@studioruang.id") },
                ],
              }),
            ),
          ),
        ),
      ),
    ),
    h(Footer, {
      appName: "Studio Ruang",
      links: [
        { href: "/proyek", label: "Proyek" },
        { href: "#kontak", label: "Kontak" },
      ],
    }),
  );
}
