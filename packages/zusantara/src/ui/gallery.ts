import { h, type Child } from "../core/view.js";
import { getLocale, t } from "../i18n/index.js";
import { CATALOG_GROUPS, entryText, UI_CATALOG, UI_EXAMPLES } from "./catalog.js";
import { Checkbox, CheckboxGroup, Field, Fieldset, FileInput, Form, FormActions, FormRow, RadioGroup, Select, Switch } from "./forms.js";
import {
  Alert,
  Avatar,
  Badge,
  Brand,
  Button,
  Card,
  Disclosure,
  EmptyState,
  formatDate,
  formatNumber,
  Grid,
  List,
  money,
  page,
  PostButton,
  rupiah,
  Search,
  Split,
  Stat,
  StatGroup,
  Table,
} from "./index.js";
import { Cluster, Columns, Container, Divider, PageHeader, Row, Section, Stack } from "./layout.js";
import { BottomNav, Breadcrumb, DropdownMenu, Footer, Navbar, Pagination, Steps, Tabs } from "./nav.js";
import { ConfirmDialog, Dialog, Drawer, Popover, Sheet, Tooltip } from "./overlay.js";
import { Progress, Skeleton, Spinner, Toast } from "./feedback.js";
import { Accordion, AvatarGroup, Calendar, CodeBlock, DescriptionList, Rating, Tag, Timeline } from "./data.js";
import { StatusPage } from "./status.js";
import { ContactForm, CTA, FAQ, FeatureGrid, Gallery, Hero, LogoCloud, MediaCard, placeholder, Pricing, TeamCard, Testimonial } from "./public.js";
import { CartSummary, PriceTag, ProductCard, QuantityInput } from "./commerce.js";
import { activeTheme } from "./theme.js";

/**
 * Galeri kit UI di /_zusantara/ui (hanya saat pengembangan): setiap komponen katalog dengan contoh hidup,
 * memakai tema aplikasi. e2e memeriksa halaman ini dengan view_page di desktop dan ponsel, jadi setiap
 * komponen baru otomatis ikut diperiksa tata letak dan kontrasnya.
 */

/** Teks contoh dalam bahasa aktif. */
const L = (id: string, en: string) => (getLocale() === "en" ? en : id);

/** Komponen yang membentuk seluruh halaman, jadi tidak ditampilkan di dalam galeri. */
export const WHOLE_PAGE = new Set(["page", "statusPage", "AuthCard", "AppShell"]);

const muted = (text: string) => h("p", { class: "zu-muted" }, text);

export const GALLERY_DEMOS: Record<string, () => Child> = {
  Brand: () => h(Brand, { name: "Toko Senja", href: "#" }),
  Container: () => h(Container, { size: "sm" }, h(Alert, null, L("Isi dibatasi 640px dan berada di tengah.", "Content is limited to 640px and centered."))),
  Stack: () => h(Stack, { gap: "sm" }, h(Alert, { tone: "success" }, L("Pertama", "First")), h(Alert, null, L("Kedua", "Second"))),
  Row: () => h(Row, { justify: "between" }, h("b", null, L("Total Rp120.000", "Total $120.00")), h(Button, { href: "#", small: true }, L("Bayar", "Pay"))),
  Cluster: () => h(Cluster, null, h(Badge, null, L("Kopi", "Coffee")), h(Badge, null, L("Teh", "Tea")), h(Badge, { tone: "accent" }, L("Susu", "Milk")), h(Badge, null, L("Cokelat", "Chocolate"))),
  Columns: () => h(Columns, { cols: 3 }, h(Card, { title: L("Dasar", "Basic") }, rupiah(49000)), h(Card, { title: "Pro" }, rupiah(99000)), h(Card, { title: L("Tim", "Team") }, rupiah(199000))),
  Section: () => h(Section, { title: L("Pesanan terbaru", "Latest orders"), description: L("Lima pesanan terakhir", "The last five orders"), actions: h(Button, { href: "#", variant: "secondary", small: true }, L("Semua", "All")) }, muted(L("Isi bagian.", "Section content."))),
  Divider: () => h(Stack, { gap: "sm" }, muted(L("Masuk dengan email", "Sign in with email")), h(Divider, { label: L("atau", "or") }), muted(L("Masuk dengan tautan", "Sign in with a link"))),
  PageHeader: () =>
    h(PageHeader, { title: L("Produk", "Products"), description: L("Kelola katalog toko", "Manage the store catalog"), breadcrumb: [{ label: L("Beranda", "Home"), href: "#" }, { label: L("Produk", "Products") }], actions: h(Button, { href: "#", small: true }, L("Tambah", "Add")) }),
  Navbar: () => h(Navbar, { appName: "Toko Senja", href: "#", links: [{ href: "#", label: L("Beranda", "Home") }, { href: "#menu", label: "Menu" }, { href: "#kontak", label: L("Kontak", "Contact") }], active: "#menu", actions: h(Button, { href: "#", small: true }, L("Pesan", "Order")) }),
  Breadcrumb: () => h(Breadcrumb, { items: [{ label: L("Beranda", "Home"), href: "#" }, { label: L("Produk", "Products"), href: "#" }, { label: L("Kopi susu", "Iced latte") }] }),
  Tabs: () => h(Tabs, { items: [{ href: "#baru", label: L("Baru", "New"), count: 3 }, { href: "#proses", label: L("Diproses", "In progress") }, { href: "#selesai", label: L("Selesai", "Done") }], active: "#baru" }),
  Pagination: () => h(Pagination, { page: 4, pages: 12, href: "#hal-{page}" }),
  Steps: () => h(Steps, { steps: [L("Keranjang", "Cart"), { label: L("Alamat", "Address"), description: L("Ke mana dikirim", "Where to deliver") }, L("Pembayaran", "Payment")], current: 2 }),
  DropdownMenu: () => h(DropdownMenu, { label: L("Aksi", "Actions"), items: [{ label: L("Ubah", "Edit"), href: "#" }, { label: L("Duplikat", "Duplicate"), href: "#" }, { label: L("Hapus", "Delete"), action: "#", danger: true }] }),
  BottomNav: () => h(BottomNav, { items: [{ href: "#", label: L("Beranda", "Home"), icon: "⌂" }, { href: "#pesanan", label: L("Pesanan", "Orders"), icon: "☰" }, { href: "#akun", label: L("Akun", "Account"), icon: "◉" }], active: "#pesanan" }),
  Footer: () => h(Footer, { appName: "Toko Senja", columns: [{ title: L("Toko", "Store"), links: [{ href: "#", label: "Menu" }, { href: "#", label: L("Lokasi", "Locations") }] }, { title: L("Bantuan", "Help"), links: [{ href: "#", label: "FAQ" }, { href: "#", label: L("Kontak", "Contact") }] }], links: [{ href: "#", label: L("Privasi", "Privacy") }] }),
  Dialog: () => h(Dialog, { id: "g-dialog", title: L("Tambah produk", "Add product"), trigger: L("Buka dialog", "Open dialog") }, h(Field, { name: "g-dialog-nama", label: L("Nama", "Name") })),
  ConfirmDialog: () => h(ConfirmDialog, { id: "g-confirm", trigger: L("Hapus", "Delete"), title: L("Hapus Latte?", "Delete Latte?"), text: L("Produk yang dihapus tidak bisa dikembalikan.", "Deleted products cannot be restored."), action: "#", confirm: L("Hapus", "Delete") }),
  Drawer: () => h(Drawer, { id: "g-drawer", title: "Filter", trigger: "Filter", actions: h(Button, { type: "button" }, L("Terapkan", "Apply")) }, h(CheckboxGroup, { name: "g-drawer-kat", label: L("Kategori", "Category"), options: [L("Kopi", "Coffee"), L("Teh", "Tea")] })),
  Sheet: () => h(Sheet, { id: "g-sheet", title: L("Bagikan", "Share"), trigger: L("Bagikan", "Share") }, h(List, { items: [[h("a", { href: "#" }, "WhatsApp")], [h("a", { href: "#" }, "Email")]] })),
  Popover: () => h(Popover, { id: "g-popover", trigger: L("Info ongkir", "Shipping info") }, h("p", null, L("Gratis ongkir untuk pesanan di atas Rp100.000.", "Free shipping for orders over $50."))),
  Tooltip: () => h(Tooltip, { text: L("Termasuk PPN 11%", "Includes 11% VAT") }, h(Button, { variant: "secondary", small: true, type: "button" }, L("Harga", "Price"))),
  Toast: () => h(Toast, { tone: "success", timeout: 0 }, L("Produk tersimpan.", "Product saved.")),
  Progress: () => h(Stack, { gap: "sm" }, h(Progress, { label: L("Kuota penyimpanan", "Storage quota"), value: 7.2, max: 10, text: L("7,2 dari 10 GB", "7.2 of 10 GB") }), h(Progress, { label: L("Mengunggah…", "Uploading…") })),
  Spinner: () => h(Cluster, { gap: "lg" }, h(Spinner, { text: L("Memuat pesanan…", "Loading orders…") }), h(Spinner, { size: "sm" })),
  Skeleton: () => h(Skeleton, { lines: 3, avatar: true }),
  DescriptionList: () => h(DescriptionList, { columns: 2, items: [{ label: L("Pelanggan", "Customer"), value: "Sari Dewi" }, { label: "Total", value: rupiah(56000) }, { label: "Status", value: h(Badge, { tone: "ok" }, L("Lunas", "Paid")) }, { label: L("Tanggal", "Date"), value: formatDate("2026-09-25") }] }),
  Accordion: () => h(Accordion, { single: true, items: [{ title: L("Berapa lama pengiriman?", "How long is delivery?"), content: L("1 sampai 3 hari kerja.", "1 to 3 business days."), open: true }, { title: L("Bisa bayar di tempat?", "Can I pay on delivery?"), content: L("Bisa, untuk wilayah Bandung.", "Yes, within Bandung.") }] }),
  Timeline: () => h(Timeline, { items: [{ title: L("Pesanan dibuat", "Order placed"), time: "09.12" }, { title: L("Dibayar", "Paid"), time: "09.15", tone: "ok" }, { title: L("Dikirim", "Shipped"), time: "13.40", text: "JNE 0123456789", tone: "accent" }] }),
  Tag: () => h(Cluster, null, h(Tag, { href: "#", active: true }, L("Semua", "All")), h(Tag, { href: "#" }, L("Kopi", "Coffee")), h(Tag, { href: "#" }, L("Teh", "Tea")), h(Tag, null, L("Baru", "New"))),
  AvatarGroup: () => h(AvatarGroup, { names: ["Sari Dewi", "Budi Santoso", "Rina", "Agus", "Wulan", "Dimas"], max: 4 }),
  Rating: () => h(Stack, { gap: "sm" }, h(Rating, { value: 4.5, count: 128 }), h(Rating, { name: "g-rating", label: L("Nilai pesanan Anda", "Rate your order"), value: 4 })),
  CodeBlock: () => h(CodeBlock, { title: "Terminal", code: "npx zusantara dev" }),
  Calendar: () =>
    h(Calendar, {
      month: "2026-09",
      today: "2026-09-25",
      href: "#bulan-{month}",
      events: [
        { date: "2026-09-08", time: "10.00", title: L("Kelas latte art", "Latte art class"), href: "#" },
        { date: "2026-09-25", time: "19.00", title: L("Live musik", "Live music"), tone: "ok" },
        { date: "2026-09-25", time: "20.30", title: L("Penuh", "Full"), tone: "warn" },
      ],
    }),
  StatusPage: () => h(StatusPage, { status: 404, appName: "Toko Senja", action: h(Button, { href: "#", variant: "secondary", small: true }, L("Lihat produk lain", "See other products")) }),
  Card: () => h(Card, { title: L("Info akun", "Account"), actions: h(Button, { href: "#", variant: "ghost", small: true }, L("Ubah", "Edit")) }, muted("sari@contoh.id")),
  Grid: () => h(Grid, null, h(Card, { title: "Latte" }, rupiah(28000)), h(Card, { title: "Americano" }, rupiah(22000)), h(Card, { title: L("Teh tarik", "Pulled tea") }, rupiah(18000))),
  Split: () => h(Split, null, h(Card, { title: L("Catatan", "Notes") }, muted(L("Isi utama", "Main content"))), h(Card, { title: L("Samping", "Side") }, muted(L("Panel samping", "Side panel")))),
  Disclosure: () => h(Disclosure, { summary: L("Tambah produk", "Add product") }, muted(L("Formulir tambah ada di sini.", "The add form goes here."))),
  Form: () =>
    h(
      Form,
      { action: "#" },
      h(Field, { name: "g-form-nama", label: L("Nama", "Name"), required: true }),
      h(FormActions, null, h(Button, { type: "button" }, L("Simpan", "Save")), h(Button, { variant: "ghost", href: "#" }, L("Batal", "Cancel"))),
    ),
  FormRow: () => h(FormRow, null, h(Field, { name: "g-kota", label: L("Kota", "City"), value: "Bandung" }), h(Field, { name: "g-kodepos", label: L("Kode pos", "Postal code"), value: "40115", inputmode: "numeric" })),
  FormActions: () => h(FormActions, null, h(Button, { type: "button" }, L("Simpan", "Save")), h(Button, { variant: "secondary", type: "button" }, L("Pratinjau", "Preview"))),
  Field: () =>
    h(
      Stack,
      null,
      h(Field, { name: "g-email", label: "Email", type: "email", hint: L("Kami tidak membagikan email Anda.", "We never share your email.") }),
      h(Field, { name: "g-judul", label: L("Judul", "Title"), error: L("Judul wajib diisi", "Title is required") }),
      h(FormRow, null, h(Field, { name: "g-harga", label: L("Harga", "Price"), type: "number", prefix: "Rp", value: 45000 }), h(Field, { name: "g-berat", label: L("Berat", "Weight"), type: "number", suffix: "kg", value: 1.5, step: "any" })),
      h(Field, { name: "g-password", label: L("Kata sandi", "Password"), type: "password", autocomplete: "new-password" }),
      h(FormRow, null, h(Field, { name: "g-tanggal", label: L("Tanggal", "Date"), type: "date" }), h(Field, { name: "g-jam", label: L("Jam", "Time"), type: "time" })),
      h(FormRow, null, h(Field, { name: "g-warna", label: L("Warna", "Color"), type: "color", value: "#097e6b" }), h(Field, { name: "g-jumlah", label: L("Jumlah", "Amount"), type: "range", min: 0, max: 10, value: 4 })),
      h(Field, { name: "g-catatan", label: L("Catatan", "Notes"), type: "textarea", rows: 3 }),
    ),
  Select: () =>
    h(Select, {
      name: "g-kategori",
      label: L("Kategori", "Category"),
      placeholder: L("Pilih kategori", "Choose a category"),
      options: [{ group: L("Minuman", "Drinks"), options: [{ value: "kopi", label: L("Kopi", "Coffee") }, { value: "teh", label: L("Teh", "Tea") }] }, { value: "kue", label: L("Kue", "Cake") }],
    }),
  Checkbox: () => h(Checkbox, { name: "g-ingat", label: L("Ingat saya", "Remember me"), checked: true }),
  CheckboxGroup: () => h(CheckboxGroup, { name: "g-hari", label: L("Hari buka", "Open days"), inline: true, options: L("Senin,Selasa,Rabu,Kamis,Jumat", "Mon,Tue,Wed,Thu,Fri").split(","), values: [L("Senin", "Mon")] }),
  RadioGroup: () =>
    h(RadioGroup, {
      name: "g-kirim",
      label: L("Pengiriman", "Delivery"),
      value: "ambil",
      options: [
        { value: "ambil", label: L("Ambil sendiri", "Pick up") },
        { value: "kurir", label: L("Kurir", "Courier"), hint: rupiah(10000) },
      ],
    }),
  Switch: () => h(Switch, { name: "g-notif", label: L("Kirim notifikasi email", "Send email notifications"), hint: L("Saat ada pesanan baru", "When a new order arrives"), checked: true }),
  FileInput: () => h(FileInput, { name: "g-foto", label: L("Foto produk", "Product photo"), types: ["image/png", "image/jpeg"], maxBytes: "5mb" }),
  Fieldset: () => h(Fieldset, { legend: L("Alamat pengiriman", "Shipping address"), box: true }, h(Field, { name: "g-alamat", label: L("Alamat", "Address") }), h(FormRow, null, h(Field, { name: "g-kota2", label: L("Kota", "City") }), h(Field, { name: "g-telp", label: L("Telepon", "Phone"), type: "tel" }))),
  Button: () =>
    h(Cluster, null, h(Button, { type: "button" }, L("Simpan", "Save")), h(Button, { variant: "secondary", type: "button" }, L("Pratinjau", "Preview")), h(Button, { variant: "ghost", type: "button" }, L("Batal", "Cancel")), h(Button, { variant: "danger", type: "button" }, L("Hapus", "Delete")), h(Button, { small: true, type: "button" }, L("Kecil", "Small"))),
  PostButton: () => h(PostButton, { action: "#", confirm: L("Hapus data contoh?", "Delete the sample record?") }, L("Hapus", "Delete")),
  Search: () => h(Search, { action: "#", value: L("kopi", "coffee") }),
  Avatar: () => h(Cluster, null, h(Avatar, { name: "Sari Dewi" }), h(Avatar, { name: "Budi" })),
  Stat: () => h(StatGroup, null, h(Stat, { label: L("Pesanan hari ini", "Orders today"), value: formatNumber(42), hint: L("+8 dari kemarin", "+8 from yesterday") }), h(Stat, { label: L("Pendapatan", "Revenue"), value: rupiah(12500000), trend: "up", change: "12%", hint: L("dari bulan lalu", "vs last month") }), h(Stat, { label: L("Keluhan", "Complaints"), value: 3, trend: "down", change: "2", good: "down" })),
  StatGroup: () => h(StatGroup, null, h(Stat, { label: L("Produk", "Products"), value: 12 }), h(Stat, { label: L("Pesanan", "Orders"), value: 40 }), h(Stat, { label: L("Pelanggan", "Customers"), value: 31 })),
  Badge: () => h(Cluster, null, h(Badge, null, L("Netral", "Neutral")), h(Badge, { tone: "accent" }, "Accent"), h(Badge, { tone: "ok" }, L("Lunas", "Paid")), h(Badge, { tone: "warn" }, L("Menunggu", "Pending")), h(Badge, { tone: "danger" }, L("Batal", "Cancelled")), h(Badge, { tone: "gold" }, "Gold")),
  Table: () =>
    h(Table, {
      columns: [{ label: L("Produk", "Product") }, { label: L("Stok", "Stock"), align: "num" }, { label: L("Harga", "Price"), align: "num" }],
      rows: [
        ["Latte", "12", rupiah(28000)],
        ["Americano", "8", rupiah(22000)],
      ],
    }),
  List: () => h(List, { items: [[h("span", { class: "zu-muted" }, "Email"), "sari@contoh.id"], [h("span", { class: "zu-muted" }, L("Peran", "Role")), "Admin"]] }),
  Alert: () => h(Stack, { gap: "sm" }, h(Alert, null, L("Info untuk pengguna.", "Information for the user.")), h(Alert, { tone: "success" }, L("Produk tersimpan.", "Product saved.")), h(Alert, { tone: "warn" }, L("Stok hampir habis.", "Stock is running low.")), h(Alert, { tone: "error" }, L("Gagal menyimpan.", "Could not save."))),
  EmptyState: () => h(EmptyState, { title: L("Belum ada produk", "No products yet"), text: L("Tambahkan produk pertama Anda.", "Add your first product."), action: h(Button, { href: "#", small: true }, L("Tambah produk", "Add product")) }),
  flash: () => h("code", null, L('flash(ctx, "Produk tersimpan") → redirect', 'flash(ctx, "Product saved") → redirect')),
  takeFlash: () => h(Toast, { flash: { message: L("Pesan dari takeFlash(ctx)", "Message from takeFlash(ctx)"), tone: "info" }, timeout: 0 }),
  placeholder: () => h("img", { src: placeholder(L("Foto produk", "Product photo"), 480, 240), alt: L("Gambar contoh", "Sample image"), width: 480, height: 240, class: "zu-demo-img" }),
  Hero: () =>
    h(Hero, {
      eyebrow: L("Toko kue rumahan", "Home bakery"),
      title: L("Kue segar setiap pagi", "Fresh cakes every morning"),
      text: L("Dipanggang tanpa pengawet, diantar ke rumah Anda.", "Baked without preservatives, delivered to your door."),
      actions: [h(Button, { href: "#" }, L("Lihat menu", "See the menu")), h(Button, { href: "#", variant: "secondary" }, L("Hubungi kami", "Contact us"))],
      image: { src: placeholder(L("Kue cokelat", "Chocolate cake"), 800, 600), alt: L("Kue cokelat", "Chocolate cake") },
    }),
  FeatureGrid: () =>
    h(FeatureGrid, {
      title: L("Kenapa kami", "Why us"),
      features: [
        { icon: "🌾", title: L("Bahan lokal", "Local ingredients"), text: L("Tepung dan mentega dari petani sekitar.", "Flour and butter from nearby farms.") },
        { icon: "🚚", title: L("Antar hari ini", "Same-day delivery"), text: L("Pesan sebelum jam 10.", "Order before 10 am.") },
        { icon: "🎂", title: L("Bisa pesan khusus", "Custom orders"), text: L("Tulisan dan hiasan sesuai acara.", "Lettering and decoration for your event.") },
      ],
    }),
  MediaCard: () =>
    h(Columns, { cols: 2 }, h(MediaCard, { image: { src: placeholder("Resep", 800, 500), alt: "" }, title: L("Resep bolu pandan", "Pandan sponge cake recipe"), text: L("Lembut tanpa pewarna buatan.", "Soft, with no artificial colouring."), meta: formatDate("2026-09-20"), href: "#" }), h(MediaCard, { image: { src: placeholder(L("Kelas", "Class"), 800, 500), alt: "" }, title: L("Kelas menghias kue", "Cake decorating class"), text: L("Setiap Sabtu pagi.", "Every Saturday morning."), actions: h(Button, { href: "#", small: true, variant: "secondary" }, L("Daftar", "Sign up")) })),
  Gallery: () => h(Gallery, { images: [1, 2, 3].map((n) => ({ src: placeholder(`${L("Foto", "Photo")} ${n}`, 600, 450), alt: `${L("Foto", "Photo")} ${n}`, caption: n === 1 ? L("Etalase toko", "Shop window") : undefined, href: false as const })) }),
  Pricing: () =>
    h(Pricing, {
      plans: [
        { name: L("Dasar", "Basic"), price: getLocale() === "en" ? 5 : 49000, period: L("/bulan", "/month"), features: [L("1 toko", "1 shop"), L("100 produk", "100 products")], cta: { label: L("Mulai", "Start"), href: "#" } },
        { name: "Pro", price: getLocale() === "en" ? 10 : 99000, period: L("/bulan", "/month"), description: L("Untuk toko yang berkembang", "For growing shops"), features: [L("3 toko", "3 shops"), L("Produk tanpa batas", "Unlimited products"), L("Laporan harian", "Daily reports")], cta: { label: L("Coba Pro", "Try Pro"), href: "#" }, featured: true },
        { name: L("Tim", "Team"), price: L("Hubungi kami", "Contact us"), features: [L("Toko tanpa batas", "Unlimited shops"), L("Dukungan prioritas", "Priority support")], cta: { label: L("Hubungi", "Contact"), href: "#" } },
      ],
    }),
  Testimonial: () => h(Columns, { cols: 2 }, h(Testimonial, { quote: L("Kuenya lembut dan tidak terlalu manis.", "Soft cake, not too sweet."), name: "Rina Wulandari", role: L("Pelanggan sejak 2024", "Customer since 2024"), rating: 5 }), h(Testimonial, { quote: L("Pengirimannya cepat dan rapi.", "Fast, tidy delivery."), name: "Budi", photo: placeholder("B", 80, 80) })),
  FAQ: () => h(FAQ, { items: [{ question: L("Berapa lama pengiriman?", "How long is delivery?"), answer: L("1 sampai 3 hari kerja.", "1 to 3 working days.") }, { question: L("Bisa bayar di tempat?", "Can I pay on delivery?"), answer: L("Bisa, untuk wilayah Bandung.", "Yes, within the city.") }] }),
  CTA: () => h(CTA, { title: L("Siap pesan untuk acara Anda?", "Ready to order for your event?"), text: L("Gratis ongkir untuk pesanan pertama.", "Free delivery on your first order."), actions: h(Button, { href: "#" }, L("Pesan sekarang", "Order now")) }),
  LogoCloud: () => h(LogoCloud, { title: L("Dipercaya oleh", "Trusted by"), logos: ["Kopi Nusantara", "Bank Sejahtera", "Hotel Senja"].map((n) => ({ src: placeholder(n, 200, 50), alt: n })) }),
  TeamCard: () => h(Columns, { cols: 2 }, h(TeamCard, { name: "Sari Dewi", role: L("Kepala dapur", "Head baker"), photo: placeholder("SD", 400, 400), bio: L("12 tahun di dapur hotel.", "12 years in hotel kitchens."), links: [{ href: "#", label: "Instagram" }] }), h(TeamCard, { name: "Andi Pratama", role: L("Pengantaran", "Delivery") })),
  ContactForm: () => h(ContactForm, { action: "#", values: { name: "Sari" }, errors: { email: L("Email wajib diisi.", "Email is required.") }, whatsapp: "081234567890" }),
  PriceTag: () => h(Cluster, null, h(PriceTag, { amount: getLocale() === "en" ? 12 : 45000, original: getLocale() === "en" ? 16 : 60000 }), h(PriceTag, { amount: getLocale() === "en" ? 10 : 99000, period: L("/bulan", "/month"), large: true })),
  ProductCard: () =>
    h(
      Columns,
      { cols: 3 },
      h(ProductCard, { name: L("Bolu pandan", "Pandan sponge cake"), href: "#", image: { src: placeholder(L("Bolu pandan", "Pandan cake"), 600, 600), alt: L("Bolu pandan", "Pandan sponge cake") }, price: getLocale() === "en" ? 12 : 45000, original: getLocale() === "en" ? 16 : 60000, rating: 4.8, reviews: 120, action: h(Button, { type: "button", small: true }, L("Tambah", "Add")) }),
      h(ProductCard, { name: L("Brownies", "Brownies"), href: "#", image: { src: placeholder("Brownies", 600, 600), alt: "Brownies" }, price: getLocale() === "en" ? 9 : 38000, badge: L("Baru", "New"), action: h(Button, { type: "button", small: true }, L("Tambah", "Add")) }),
      h(ProductCard, { name: L("Kue lapis", "Layer cake"), image: { src: placeholder(L("Kue lapis", "Layer cake"), 600, 600), alt: L("Kue lapis", "Layer cake") }, price: getLocale() === "en" ? 14 : 52000, soldOut: true }),
    ),
  QuantityInput: () => h(QuantityInput, { name: "g-qty", value: 2, max: 10 }),
  CartSummary: () =>
    h(CartSummary, {
      items: [
        { name: L("Bolu pandan", "Pandan sponge cake"), price: getLocale() === "en" ? 12 : 45000, qty: 2, note: L("Ukuran 20 cm", "20 cm"), image: { src: placeholder("", 120, 120), alt: "" } },
        { name: "Brownies", price: getLocale() === "en" ? 9 : 38000, qty: 1, image: { src: placeholder("", 120, 120), alt: "" } },
      ],
      shipping: 0,
      discount: getLocale() === "en" ? 2 : 10000,
      action: h(Button, { href: "#", block: true }, L("Lanjut bayar", "Checkout")),
    }),
  rupiah: () => h("code", null, `rupiah(45000) → ${rupiah(45000)}`),
  money: () => h("code", null, `money(12.5, "USD") → ${money(12.5, "USD")}`),
  formatNumber: () => h("code", null, `formatNumber(12500) → ${formatNumber(12500)}`),
  formatDate: () => h("code", null, `formatDate("2026-09-25") → ${formatDate("2026-09-25")}`),
};

/** Halaman galeri lengkap. */
export function renderGallery(): string {
  const m = t().ui;
  const { theme } = activeTheme();
  const sections = CATALOG_GROUPS.map((group) => {
    const entries = UI_CATALOG.filter((e) => e.group === group);
    return h(
      Section,
      { title: m.groups[group] ?? group, id: group },
      entries.map((e) =>
        h(
          Card,
          { title: e.name },
          h(
            Stack,
            { gap: "sm" },
            muted(entryText(e)),
            WHOLE_PAGE.has(e.name) ? h(Alert, null, m.gallery.wholePage) : h("div", { class: "zu-gallery-demo" }, GALLERY_DEMOS[e.name]?.() ?? null),
            h("p", null, h("small", { class: "zu-muted" }, `${m.gallery.example}: `), h("code", null, e.example)),
          ),
        ),
      ),
    );
  });
  const locale = getLocale();
  const examples = h(
    Section,
    { title: m.gallery.examples, description: m.gallery.examplesLead, id: "examples" },
    h(
      Columns,
      { cols: 3 },
      UI_EXAMPLES.map((e) => h(Card, { title: e.title[locale] }, h(Stack, { gap: "sm" }, muted(e.text[locale]), h(Cluster, null, h(Button, { href: `/_zusantara/ui/examples/${e.name}`, variant: "secondary", small: true }, m.gallery.open), h("code", null, `zusantara ui --example ${e.name}`))))),
    ),
  );
  return page(
    { title: `${m.gallery.title} · Zusantara` },
    h(
      Container,
      { pad: true },
      h("main", { id: "konten" }, h(PageHeader, { title: m.gallery.title, description: m.gallery.lead }), h(Stack, { gap: "lg" }, h(Alert, null, m.gallery.theme(theme.accent, theme.radius, theme.font, theme.mode), " ", m.gallery.changeTheme), h(Cluster, null, CATALOG_GROUPS.map((g) => h(Button, { href: `#${g}`, variant: "secondary", small: true }, m.groups[g] ?? g)), h(Button, { href: "#examples", variant: "secondary", small: true }, m.gallery.examples)), sections, examples)),
    ),
  );
}
