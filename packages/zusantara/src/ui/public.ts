import { h, raw, type Child } from "../core/view.js";
import { t } from "../i18n/index.js";
import { Accordion } from "./data.js";
import { Field, Form, FormActions } from "./forms.js";
import { Avatar, Button, money } from "./index.js";
import type { NavLink } from "./nav.js";
import { cx, type WithChildren } from "./types.js";

/**
 * Komponen halaman publik: hero, fitur, kartu media, galeri foto, harga paket, testimoni, FAQ, ajakan
 * bertindak, logo mitra, kartu tim, dan formulir kontak. Semuanya dirender di server dan menyesuaikan
 * diri di ponsel tanpa CSS tambahan.
 */

export interface ImageRef {
  src: string;
  /** Teks pengganti gambar (wajib untuk aksesibilitas; kosongkan "" hanya untuk gambar hiasan). */
  alt: string;
}

/**
 * URL gambar contoh bawaan (/_zusantara/placeholder.svg) berukuran tertentu dengan teks di tengahnya.
 * Untuk purwarupa sebelum foto asli tersedia; tidak butuh internet.
 * @en Built-in sample image URL (/_zusantara/placeholder.svg) of a given size with text in the middle. For prototypes before real photos exist; needs no internet.
 * @group public
 * @example h(MediaCard, { image: { src: placeholder("Kue cokelat", 800, 600), alt: "Kue cokelat" }, title: "Kue cokelat" })
 */
export function placeholder(text = "", width = 800, height = 600): string {
  const q = new URLSearchParams({ w: String(Math.round(width)), h: String(Math.round(height)) });
  if (text) q.set("text", text);
  return `/_zusantara/placeholder.svg?${q.toString()}`;
}

/**
 * Bagian pembuka halaman publik: judul besar, kalimat pendukung, tombol aksi, dan gambar opsional di
 * samping (di bawah pada ponsel). `eyebrow` = label kecil di atas judul.
 * @en Opening section of a public page: a large title, a supporting sentence, action buttons, and an optional image beside it (below on phones). `eyebrow` = small label above the title.
 * @group public
 * @example h(Hero, { eyebrow: "Toko kue rumahan", title: "Kue segar setiap pagi", text: "Dipanggang tanpa pengawet, diantar ke rumah Anda.", actions: [h(Button, { href: "/menu" }, "Lihat menu"), h(Button, { href: "/kontak", variant: "secondary" }, "Hubungi kami")], image: { src: "/img/kue.jpg", alt: "Kue cokelat" } })
 */
export function Hero({
  title,
  text,
  eyebrow,
  actions,
  image,
  align = "start",
}: WithChildren<{ title: string; text?: string; eyebrow?: string; actions?: Child; image?: ImageRef; align?: "start" | "center" }>): Child {
  return h(
    "section",
    { class: cx("zu-hero", image && "media", align === "center" && !image && "center") },
    h(
      "div",
      { class: "zu-hero-text" },
      eyebrow ? h("p", { class: "zu-eyebrow" }, eyebrow) : null,
      h("h1", null, title),
      text ? h("p", { class: "zu-hero-lead" }, text) : null,
      actions ? h("div", { class: "zu-hero-actions" }, actions) : null,
    ),
    image ? h("div", { class: "zu-hero-media" }, h("img", { src: image.src, alt: image.alt, width: 800, height: 600, fetchpriority: "high" })) : null,
  );
}

export interface Feature {
  title: string;
  text?: string;
  /** Ikon kecil (mis. emoji atau `<svg>` lewat raw()). */
  icon?: Child;
}

/**
 * Daftar keunggulan dalam grid (2 sampai 4 kolom, menumpuk di ponsel), dengan judul bagian opsional.
 * @en Grid of features or benefits (2 to 4 columns, stacked on phones), with an optional section title.
 * @group public
 * @example h(FeatureGrid, { title: "Kenapa kami", features: [{ icon: "🌾", title: "Bahan lokal", text: "Tepung dan mentega dari petani sekitar." }, { icon: "🚚", title: "Antar hari ini", text: "Pesan sebelum jam 10." }] })
 */
export function FeatureGrid({ title, text, features, cols = 3 }: WithChildren<{ title?: string; text?: string; features: Feature[]; cols?: 2 | 3 | 4 }>): Child {
  return h(
    "section",
    { class: "zu-block-section" },
    title || text ? h("div", { class: "zu-block-head" }, title ? h("h2", null, title) : null, text ? h("p", null, text) : null) : null,
    h(
      "div",
      { class: `zu-features c${cols}` },
      features.map((f) => h("div", { class: "zu-feature" }, f.icon !== undefined ? h("span", { class: "zu-feature-icon", "aria-hidden": "true" }, f.icon) : null, h("h3", null, f.title), f.text ? h("p", null, f.text) : null)),
    ),
  );
}

/**
 * Kartu dengan gambar di atas: artikel, layanan, portofolio, atau acara. Seluruh kartu bisa diklik bila
 * ada `href`.
 * @en Card with an image on top: an article, service, portfolio item, or event. The whole card is clickable when `href` is set.
 * @group public
 * @example h(MediaCard, { image: { src: post.cover, alt: "" }, title: post.title, text: post.excerpt, meta: formatDate(post.date), href: `/blog/${post.slug}` })
 */
export function MediaCard({ image, title, text, meta, href, actions }: WithChildren<{ image: ImageRef; title: string; text?: string; meta?: string; href?: string; actions?: Child }>): Child {
  return h(
    "article",
    { class: "zu-media-card" },
    h("img", { src: image.src, alt: image.alt, loading: "lazy", width: 800, height: 500 }),
    h(
      "div",
      { class: "zu-media-body" },
      meta ? h("small", null, meta) : null,
      h("h3", null, href ? h("a", { href, class: "zu-stretch" }, title) : title),
      text ? h("p", null, text) : null,
      actions ? h("div", { class: "zu-media-actions" }, actions) : null,
    ),
  );
}

export interface GalleryImage extends ImageRef {
  caption?: string;
  /** Tautan saat foto diklik (default: gambar itu sendiri). `false` = tanpa tautan. */
  href?: string | false;
}

/**
 * Galeri foto berbentuk grid dengan rasio seragam dan keterangan opsional. Foto membuka ukuran penuh
 * saat diklik.
 * @en Photo gallery grid with a uniform ratio and optional captions. Clicking a photo opens it full size.
 * @group public
 * @example h(Gallery, { images: photos.map((p) => ({ src: p.url, alt: p.title, caption: p.title })), ratio: "square" })
 */
export function Gallery({ images, cols = 3, ratio = "landscape" }: WithChildren<{ images: GalleryImage[]; cols?: 2 | 3 | 4; ratio?: "square" | "landscape" | "portrait" }>): Child {
  return h(
    "div",
    { class: `zu-gallery c${cols} ${ratio}` },
    images.map((img) => {
      const pic = h("img", { src: img.src, alt: img.alt, loading: "lazy" });
      const link = img.href === false ? pic : h("a", { href: img.href ?? img.src }, pic);
      return h("figure", null, link, img.caption ? h("figcaption", null, img.caption) : null);
    }),
  );
}

export interface PricingPlan {
  name: string;
  /** Angka diformat dengan money() (rupiah untuk Bahasa Indonesia), teks ditampilkan apa adanya (mis. "Gratis"). */
  price: number | string;
  /** Mis. "/bulan". */
  period?: string;
  description?: string;
  features: string[];
  cta: { label: string; href: string };
  /** Paket yang disorot (label "Paling populer"). */
  featured?: boolean | string;
}

/**
 * Tabel harga paket berdampingan (menumpuk di ponsel). Satu paket bisa disorot dengan `featured`.
 * @en Side-by-side plan prices (stacked on phones). One plan can be highlighted with `featured`.
 * @group public
 * @example h(Pricing, { plans: [{ name: "Dasar", price: 49000, period: "/bulan", features: ["1 toko", "100 produk"], cta: { label: "Mulai", href: "/daftar" } }, { name: "Pro", price: 99000, period: "/bulan", features: ["3 toko", "Produk tanpa batas"], cta: { label: "Coba Pro", href: "/daftar?paket=pro" }, featured: true }] })
 */
export function Pricing({ plans, currency }: WithChildren<{ plans: PricingPlan[]; currency?: string }>): Child {
  const m = t().ui;
  return h(
    "div",
    { class: cx("zu-pricing", `n${Math.min(plans.length, 4)}`) },
    plans.map((plan) =>
      h(
        "section",
        { class: cx("zu-plan", plan.featured && "featured") },
        plan.featured ? h("span", { class: "zu-plan-badge" }, typeof plan.featured === "string" ? plan.featured : m.popular) : null,
        h("h3", null, plan.name),
        plan.description ? h("p", { class: "zu-plan-desc" }, plan.description) : null,
        h("p", { class: "zu-plan-price" }, h("b", null, typeof plan.price === "number" ? money(plan.price, currency) : plan.price), plan.period ? h("span", null, plan.period) : null),
        h("ul", null, plan.features.map((f) => h("li", null, f))),
        h(Button, { href: plan.cta.href, variant: plan.featured ? "primary" : "secondary", block: true }, plan.cta.label),
      ),
    ),
  );
}

/**
 * Kutipan pelanggan dengan nama, peran, foto atau inisial, dan rating opsional.
 * @en Customer quote with name, role, photo or initials, and an optional rating.
 * @group public
 * @example h(Testimonial, { quote: "Kuenya lembut dan tidak terlalu manis.", name: "Rina", role: "Pelanggan sejak 2024", rating: 5 })
 */
export function Testimonial({ quote, name, role, photo, rating }: WithChildren<{ quote: string; name: string; role?: string; photo?: string; rating?: number }>): Child {
  const stars = rating !== undefined ? Math.round(Math.min(Math.max(rating, 0), 5)) : undefined;
  return h(
    "figure",
    { class: "zu-testimonial" },
    stars !== undefined ? h("span", { class: "zu-stars", role: "img", "aria-label": t().ui.ratingOf(String(stars), 5) }, h("span", { class: "on", "aria-hidden": "true" }, "★".repeat(stars)), h("span", { "aria-hidden": "true" }, "★".repeat(5 - stars))) : null,
    h("blockquote", null, h("p", null, quote)),
    h(
      "figcaption",
      null,
      photo ? h("img", { class: "zu-photo", src: photo, alt: "", width: 40, height: 40, loading: "lazy" }) : h(Avatar, { name }),
      h("span", null, h("b", null, name), role ? h("small", null, role) : null),
    ),
  );
}

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Pertanyaan yang sering diajukan: daftar buka-tutup, plus data terstruktur FAQPage (schema.org) agar
 * mesin pencari bisa menampilkannya (`schema: false` untuk mematikan).
 * @en Frequently asked questions: an open/close list, plus FAQPage structured data (schema.org) so search engines can show it (`schema: false` turns it off).
 * @group public
 * @example h(FAQ, { title: "Pertanyaan umum", items: [{ question: "Berapa lama pengiriman?", answer: "1 sampai 3 hari kerja." }] })
 */
export function FAQ({ items, title, schema = true }: WithChildren<{ items: FaqItem[]; title?: string; schema?: boolean }>): Child {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((i) => ({ "@type": "Question", name: i.question, acceptedAnswer: { "@type": "Answer", text: i.answer } })),
  };
  // JSON di dalam <script>: "<" di-escape agar teks seperti "</script>" tidak menutup elemennya.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return h(
    "section",
    { class: "zu-block-section" },
    title ? h("div", { class: "zu-block-head" }, h("h2", null, title)) : null,
    h(Accordion, { items: items.map((i) => ({ title: i.question, content: i.answer })) }),
    schema && items.length ? h("script", { type: "application/ld+json" }, raw(json)) : null,
  );
}

/**
 * Pita ajakan bertindak di akhir halaman: judul, kalimat pendek, dan tombol.
 * @en Call-to-action band near the end of a page: a title, a short sentence, and buttons.
 * @group public
 * @example h(CTA, { title: "Siap pesan untuk acara Anda?", text: "Gratis ongkir di Bandung untuk pesanan pertama.", actions: h(Button, { href: "/pesan" }, "Pesan sekarang") })
 */
export function CTA({ title, text, actions }: WithChildren<{ title: string; text?: string; actions?: Child }>): Child {
  return h("section", { class: "zu-cta" }, h("div", null, h("h2", null, title), text ? h("p", null, text) : null), actions ? h("div", { class: "zu-cta-actions" }, actions) : null);
}

export interface LogoItem extends ImageRef {
  href?: string;
}

/**
 * Deretan logo mitra atau klien, abu-abu dan seragam tingginya.
 * @en Row of partner or client logos, grey and the same height.
 * @group public
 * @example h(LogoCloud, { title: "Dipercaya oleh", logos: [{ src: "/logo/bank.svg", alt: "Bank Sejahtera" }, { src: "/logo/kopi.svg", alt: "Kopi Nusantara" }] })
 */
export function LogoCloud({ title, logos }: WithChildren<{ title?: string; logos: LogoItem[] }>): Child {
  return h(
    "section",
    { class: "zu-logos" },
    title ? h("p", null, title) : null,
    h("ul", null, logos.map((l) => h("li", null, l.href ? h("a", { href: l.href }, h("img", { src: l.src, alt: l.alt, loading: "lazy" })) : h("img", { src: l.src, alt: l.alt, loading: "lazy" })))),
  );
}

/**
 * Kartu anggota tim: foto (atau inisial), nama, peran, keterangan singkat, dan tautan.
 * @en Team member card: photo (or initials), name, role, a short bio, and links.
 * @group public
 * @example h(TeamCard, { name: "Sari Dewi", role: "Kepala dapur", photo: "/tim/sari.jpg", bio: "12 tahun di dapur hotel.", links: [{ href: "https://instagram.com/sari", label: "Instagram" }] })
 */
export function TeamCard({ name, role, photo, bio, links = [] }: WithChildren<{ name: string; role?: string; photo?: string; bio?: string; links?: NavLink[] }>): Child {
  return h(
    "article",
    { class: "zu-team" },
    photo ? h("img", { class: "zu-team-photo", src: photo, alt: name, loading: "lazy", width: 400, height: 400 }) : h("div", { class: "zu-team-photo initials", "aria-hidden": "true" }, h(Avatar, { name })),
    h("h3", null, name),
    role ? h("p", { class: "zu-team-role" }, role) : null,
    bio ? h("p", null, bio) : null,
    links.length ? h("p", { class: "zu-team-links" }, links.map((l) => h("a", { href: l.href }, l.label))) : null,
  );
}

/** Nomor WhatsApp Indonesia ke format wa.me (08xx / +62 / 62 menjadi 62xx). */
function waNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("0") ? `62${digits.slice(1)}` : digits;
}

/**
 * Formulir kontak siap pakai (nama, email, pesan) dengan `values` dan `errors` untuk ditampilkan ulang
 * setelah validasi, plus tautan WhatsApp opsional (`whatsapp: "0812…"`).
 * @en Ready-made contact form (name, email, message) with `values` and `errors` to re-render after validation, plus an optional WhatsApp link (`whatsapp: "0812…"`).
 * @group public
 * @example h(ContactForm, { action: "/kontak", values, errors, whatsapp: "081234567890" })
 */
export function ContactForm({
  action,
  values = {},
  errors = {},
  whatsapp,
  submit,
}: WithChildren<{ action: string; values?: Record<string, unknown>; errors?: Record<string, string>; whatsapp?: string; submit?: string }>): Child {
  const m = t().ui;
  const str = (v: unknown) => (typeof v === "string" ? v : undefined);
  return h(
    Form,
    { action },
    h(Field, { name: "name", label: m.contact.name, value: str(values.name), error: errors.name, autocomplete: "name", required: true, maxlength: 100 }),
    h(Field, { name: "email", label: m.contact.email, type: "email", value: str(values.email), error: errors.email, autocomplete: "email", required: true, maxlength: 200 }),
    h(Field, { name: "message", label: m.contact.message, type: "textarea", rows: 5, value: str(values.message), error: errors.message, required: true, maxlength: 5000 }),
    h(
      FormActions,
      null,
      h(Button, { loading: m.contact.sending }, submit ?? m.contact.send),
      whatsapp ? h("a", { class: "zu-btn secondary", href: `https://wa.me/${waNumber(whatsapp)}`, rel: "noopener" }, m.contact.whatsapp) : null,
    ),
  );
}
