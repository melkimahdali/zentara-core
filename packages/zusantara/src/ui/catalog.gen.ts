// Dibuat otomatis oleh scripts/ui-catalog.mjs dari JSDoc di src/ui. Jangan diubah manual:
// ubah JSDoc komponennya, lalu jalankan `node scripts/ui-catalog.mjs` di packages/zusantara.
import type { CatalogEntry, PageExample } from "./catalog.js";

export const UI_CATALOG: CatalogEntry[] = [
  {
    "name": "page",
    "group": "page",
    "kind": "function",
    "id": "Dokumen HTML lengkap (dengan doctype) yang memuat stylesheet, font, dan tema kit UI. Semua halaman yang memakai kit UI dimulai dari sini.",
    "en": "Full HTML document (with doctype) that loads the UI kit stylesheet, font, and theme. Every page that uses the UI kit starts here.",
    "example": "page({ title: \"Produk\" }, h(Container, { pad: true }, h(PageHeader, { title: \"Produk\" }), ...))",
    "props": [],
    "signature": "page(options: PageOptions, ...body: Child[]): string"
  },
  {
    "name": "Brand",
    "group": "page",
    "kind": "component",
    "id": "Logo + nama aplikasi (kata terakhir berwarna aksen, mis. \"Studio <b>Senja</b>\").",
    "en": "Logo + app name (the last word in the accent color, e.g. \"Studio <b>Senja</b>\").",
    "example": "h(Brand, { name: \"Toko Senja\", href: \"/\" })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": false
      },
      {
        "name": "href",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "AuthCard",
    "group": "page",
    "kind": "component",
    "id": "Halaman masuk/daftar: panel brand di kiri (layar lebar) dan formulir di kanan. Di layar sempit hanya formulir dengan logo di atasnya.",
    "en": "Sign-in/sign-up page: a brand panel on the left (wide screens) and the form on the right. On narrow screens only the form, with the logo above it.",
    "example": "h(AuthCard, { title: \"Masuk\", subtitle: \"Selamat datang kembali\", aside: { title: \"Semua pesanan di satu tempat\" } }, h(Form, { action: \"/login\" }, ...))",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "subtitle",
        "type": "string",
        "required": false
      },
      {
        "name": "footer",
        "type": "Child",
        "required": false
      },
      {
        "name": "appName",
        "type": "string",
        "required": false
      },
      {
        "name": "aside",
        "type": "AuthAside",
        "required": false
      }
    ]
  },
  {
    "name": "AppShell",
    "group": "page",
    "kind": "component",
    "id": "Kerangka halaman aplikasi: bilah navigasi atas (logo, menu, user + tombol keluar) dan konten. `active` = href menu yang sedang dibuka. Tombol keluar mengirim POST ke `logoutAction` (default /logout).",
    "en": "App page frame: top navigation bar (logo, menu, user + sign-out button) and content. `active` = href of the open menu item. Sign-out POSTs to `logoutAction` (default /logout).",
    "example": "h(AppShell, { appName: \"Toko Senja\", nav: [{ href: \"/dashboard\", label: \"Dasbor\" }], active: \"/dashboard\", user, title: \"Dasbor\", actions: h(Button, { href: \"/produk/baru\" }, \"Tambah\") }, ...)",
    "props": [
      {
        "name": "appName",
        "type": "string",
        "required": false
      },
      {
        "name": "nav",
        "type": "NavItem[]",
        "required": true
      },
      {
        "name": "active",
        "type": "string",
        "required": false
      },
      {
        "name": "user",
        "type": "ShellUser",
        "required": false
      },
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "subtitle",
        "type": "string",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      },
      {
        "name": "logoutAction",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "StatusPage",
    "group": "page",
    "kind": "component",
    "id": "Isi halaman status: kode besar, judul, penjelasan, dan tombol kembali. Judul dan teks bawaan mengikuti status (403, 404, 500, …) dalam bahasa aktif.",
    "en": "Status page content: a large code, title, explanation, and a back button. The default title and text follow the status (403, 404, 500, …) in the active language.",
    "example": "h(StatusPage, { status: 404, text: \"Produk ini sudah tidak dijual.\", action: h(Button, { href: \"/produk\" }, \"Lihat produk lain\") })",
    "props": [
      {
        "name": "status",
        "type": "number",
        "required": true
      },
      {
        "name": "title",
        "type": "string",
        "required": false
      },
      {
        "name": "text",
        "type": "string",
        "required": false
      },
      {
        "name": "appName",
        "type": "string",
        "required": false
      },
      {
        "name": "action",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "statusPage",
    "group": "page",
    "kind": "function",
    "id": "Dokumen HTML lengkap halaman status dengan tema aplikasi. Framework memakainya sendiri untuk error di produksi (mis. `throw new HttpError(403)`); panggil langsung bila perlu halaman status dari handler.",
    "en": "Full HTML status page document in the app theme. The framework uses it for errors in production (e.g. `throw new HttpError(403)`); call it directly when a handler needs a status page.",
    "example": "statusPage(403, { message: \"Hanya admin yang bisa membuka halaman ini.\", appName: \"Toko Senja\" })",
    "props": [],
    "signature": "statusPage(status: number, options?: { message?: string; appName?: string; }): string"
  },
  {
    "name": "Container",
    "group": "layout",
    "kind": "component",
    "id": "Pembungkus konten dengan lebar maksimum dan jarak tepi, di tengah layar. Untuk halaman publik yang tidak memakai AppShell.",
    "en": "Centers content with a maximum width and side padding. For public pages that don't use AppShell.",
    "example": "h(Container, { size: \"md\", pad: true }, h(PageHeader, { title: \"Tentang kami\" }), ...)",
    "props": [
      {
        "name": "size",
        "type": "\"sm\" | \"md\" | \"lg\" | \"full\"",
        "required": false,
        "doc": "sm 640px, md 880px, lg 1180px (default), full tanpa batas."
      },
      {
        "name": "pad",
        "type": "boolean",
        "required": false,
        "doc": "Tambah jarak atas dan bawah (untuk halaman tanpa AppShell)."
      }
    ]
  },
  {
    "name": "Stack",
    "group": "layout",
    "kind": "component",
    "id": "Tumpukan vertikal dengan jarak seragam antar anak.",
    "en": "Vertical stack with even spacing between children.",
    "example": "h(Stack, { gap: \"lg\" }, h(Card, { title: \"Profil\" }, ...), h(Card, { title: \"Keamanan\" }, ...))",
    "props": [
      {
        "name": "gap",
        "type": "\"none\" | \"xs\" | \"sm\" | \"md\" | \"lg\" | \"xl\"",
        "required": false
      },
      {
        "name": "align",
        "type": "\"start\" | \"center\" | \"end\" | \"baseline\" | \"stretch\"",
        "required": false
      }
    ]
  },
  {
    "name": "Row",
    "group": "layout",
    "kind": "component",
    "id": "Baris mendatar (tombol, label, teks dengan aksi). Membungkus ke baris baru di layar sempit kecuali `wrap: false`.",
    "en": "Horizontal row (buttons, labels, text with actions). Wraps on narrow screens unless `wrap: false`.",
    "example": "h(Row, { justify: \"between\" }, h(\"b\", null, \"Total\"), h(Button, { href: \"/bayar\" }, \"Bayar\"))",
    "props": [
      {
        "name": "gap",
        "type": "\"none\" | \"xs\" | \"sm\" | \"md\" | \"lg\" | \"xl\"",
        "required": false
      },
      {
        "name": "align",
        "type": "\"start\" | \"center\" | \"end\" | \"baseline\" | \"stretch\"",
        "required": false
      },
      {
        "name": "justify",
        "type": "\"start\" | \"center\" | \"end\" | \"between\"",
        "required": false
      },
      {
        "name": "wrap",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "Cluster",
    "group": "layout",
    "kind": "component",
    "id": "Kumpulan item kecil yang membungkus rapat (label, badge, tombol kecil). Sama dengan Row dengan jarak lebih rapat.",
    "en": "A tight, wrapping group of small items (tags, badges, small buttons). Row with a smaller gap.",
    "example": "h(Cluster, null, h(Badge, null, \"Kopi\"), h(Badge, null, \"Teh\"), h(Badge, null, \"Susu\"))",
    "props": [
      {
        "name": "gap",
        "type": "\"none\" | \"xs\" | \"sm\" | \"md\" | \"lg\" | \"xl\"",
        "required": false
      },
      {
        "name": "align",
        "type": "\"start\" | \"center\" | \"end\" | \"baseline\" | \"stretch\"",
        "required": false
      },
      {
        "name": "justify",
        "type": "\"start\" | \"center\" | \"end\" | \"between\"",
        "required": false
      }
    ]
  },
  {
    "name": "Columns",
    "group": "layout",
    "kind": "component",
    "id": "Kolom sama lebar yang menumpuk di layar sempit (3 dan 4 kolom menjadi 2 di tablet, semua menjadi 1 di ponsel).",
    "en": "Equal-width columns that stack on narrow screens (3 and 4 become 2 on tablets, all become 1 on phones).",
    "example": "h(Columns, { cols: 3 }, h(Card, { title: \"Dasar\" }, ...), h(Card, { title: \"Pro\" }, ...), h(Card, { title: \"Tim\" }, ...))",
    "props": [
      {
        "name": "cols",
        "type": "2 | 3 | 4",
        "required": false
      },
      {
        "name": "gap",
        "type": "\"none\" | \"xs\" | \"sm\" | \"md\" | \"lg\" | \"xl\"",
        "required": false
      },
      {
        "name": "align",
        "type": "\"start\" | \"center\" | \"end\" | \"baseline\" | \"stretch\"",
        "required": false
      }
    ]
  },
  {
    "name": "Section",
    "group": "layout",
    "kind": "component",
    "id": "Bagian halaman dengan judul, deskripsi, dan aksi opsional, tanpa kotak kartu.",
    "en": "A page section with an optional title, description, and actions, without a card box.",
    "example": "h(Section, { title: \"Pesanan terbaru\", actions: h(Button, { href: \"/pesanan\", variant: \"secondary\", small: true }, \"Semua\") }, h(Table, ...))",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": false
      },
      {
        "name": "description",
        "type": "string",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      },
      {
        "name": "id",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "Divider",
    "group": "layout",
    "kind": "component",
    "id": "Garis pemisah tipis, opsional dengan teks di tengah (mis. \"atau\").",
    "en": "A thin separator line, optionally with centered text (e.g. \"or\").",
    "example": "h(Divider, { label: \"atau\" })",
    "props": [
      {
        "name": "label",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "PageHeader",
    "group": "layout",
    "kind": "component",
    "id": "Kepala halaman: breadcrumb, judul (h1), deskripsi, dan tombol aksi. Untuk halaman tanpa AppShell atau bagian utama halaman publik.",
    "en": "Page header: breadcrumb, title (h1), description, and action buttons. For pages without AppShell.",
    "example": "h(PageHeader, { title: \"Produk\", description: \"Kelola katalog toko\", breadcrumb: [{ label: \"Beranda\", href: \"/\" }, { label: \"Produk\" }], actions: h(Button, { href: \"/produk/baru\" }, \"Tambah\") })",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "description",
        "type": "string",
        "required": false
      },
      {
        "name": "breadcrumb",
        "type": "Crumb[]",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "Card",
    "group": "layout",
    "kind": "component",
    "id": "Panel berjudul. Pakai hanya bila isinya memang satu kelompok (tabel, formulir); selebihnya cukup jarak. `flush` menghapus jarak dalam (untuk tabel).",
    "en": "Titled panel. Use it only when the content really is one group (a table, a form); otherwise spacing is enough. `flush` removes the inner padding (for tables).",
    "example": "h(Card, { title: \"Pesanan terbaru\", flush: true, actions: h(Button, { href: \"/pesanan\", variant: \"secondary\", small: true }, \"Semua\") }, h(Table, ...))",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      },
      {
        "name": "flush",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "Grid",
    "group": "layout",
    "kind": "component",
    "id": "Grid responsif untuk kartu yang setara; jumlah kolom menyesuaikan lebar layar (minimal 220px per kartu).",
    "en": "Responsive grid for equal cards; the number of columns follows the screen width (at least 220px per card).",
    "example": "h(Grid, null, items.map((p) => h(Card, { title: p.name }, money(p.price))))",
    "props": []
  },
  {
    "name": "Split",
    "group": "layout",
    "kind": "component",
    "id": "Dua kolom tidak simetris (2:1): isi utama dan panel samping, menumpuk di layar sempit. Isi dengan dua anak.",
    "en": "Two uneven columns (2:1): main content and a side panel, stacked on narrow screens. Give it two children.",
    "example": "h(Split, null, h(Card, { title: \"Catatan\" }, ...), h(Card, { title: \"Info akun\" }, ...))",
    "props": []
  },
  {
    "name": "Disclosure",
    "group": "layout",
    "kind": "component",
    "id": "Isi yang bisa dibuka-tutup tanpa JavaScript (mis. formulir tambah data).",
    "en": "Content that opens and closes without JavaScript (e.g. an add form).",
    "example": "h(Disclosure, { summary: \"Tambah produk\", open: errors !== undefined }, h(Form, ...))",
    "props": [
      {
        "name": "summary",
        "type": "string",
        "required": true
      },
      {
        "name": "open",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "Navbar",
    "group": "nav",
    "kind": "component",
    "id": "Bilah navigasi atas untuk halaman publik: logo, tautan, dan tombol aksi. Di ponsel tautan dan aksi pindah ke menu yang dibuka lewat tombol Menu (tanpa JavaScript). Untuk aplikasi dengan login, pakai AppShell.",
    "en": "Top navigation bar for public pages: logo, links, and action buttons. On phones the links and actions move into a menu opened with the Menu button (no JavaScript). For signed-in apps use AppShell.",
    "example": "h(Navbar, { appName: \"Toko Senja\", links: [{ href: \"/\", label: \"Beranda\" }, { href: \"/menu\", label: \"Menu\" }], active: \"/menu\", actions: h(Button, { href: \"/pesan\", small: true }, \"Pesan\") })",
    "props": [
      {
        "name": "appName",
        "type": "string",
        "required": false
      },
      {
        "name": "href",
        "type": "string",
        "required": false
      },
      {
        "name": "links",
        "type": "NavLink[]",
        "required": false
      },
      {
        "name": "active",
        "type": "string",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "Breadcrumb",
    "group": "nav",
    "kind": "component",
    "id": "Jejak lokasi halaman (Beranda / Produk / Kopi). Item terakhir adalah halaman saat ini.",
    "en": "Page location trail (Home / Products / Coffee). The last item is the current page.",
    "example": "h(Breadcrumb, { items: [{ label: \"Beranda\", href: \"/\" }, { label: \"Produk\", href: \"/produk\" }, { label: \"Kopi\" }] })",
    "props": [
      {
        "name": "items",
        "type": "Crumb[]",
        "required": true
      }
    ]
  },
  {
    "name": "Tabs",
    "group": "nav",
    "kind": "component",
    "id": "Tab berupa tautan (mis. `?tab=aktif`), jadi setiap tab punya URL sendiri dan berfungsi tanpa JavaScript. `active` = href tab yang sedang dibuka. Bergulir mendatar di layar sempit.",
    "en": "Tabs made of links (e.g. `?tab=active`), so each tab has its own URL and works without JavaScript. `active` = href of the open tab. Scrolls sideways on narrow screens.",
    "example": "h(Tabs, { items: [{ href: \"?tab=baru\", label: \"Baru\", count: 3 }, { href: \"?tab=selesai\", label: \"Selesai\" }], active: `?tab=${tab}` })",
    "props": [
      {
        "name": "items",
        "type": "TabItem[]",
        "required": true
      },
      {
        "name": "active",
        "type": "string",
        "required": false
      },
      {
        "name": "label",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "Pagination",
    "group": "nav",
    "kind": "component",
    "id": "Nomor halaman untuk daftar panjang, berupa tautan biasa. `href` memakai `{page}` sebagai tempat nomor halaman (default `?page={page}`). Di ponsel hanya Sebelumnya, \"Halaman 2 dari 9\", dan Berikutnya.",
    "en": "Page numbers for long lists, as plain links. `href` uses `{page}` as the page-number placeholder (default `?page={page}`). On phones only Previous, \"Page 2 of 9\", and Next.",
    "example": "h(Pagination, { page: Number(ctx.query.page ?? 1), pages: Math.ceil(total / 20), href: \"/produk?page={page}\" })",
    "props": [
      {
        "name": "page",
        "type": "number",
        "required": true
      },
      {
        "name": "pages",
        "type": "number",
        "required": true
      },
      {
        "name": "href",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "Steps",
    "group": "nav",
    "kind": "component",
    "id": "Langkah proses (mis. checkout: Keranjang, Alamat, Bayar). `current` = nomor langkah aktif, mulai dari 1; langkah sebelumnya ditandai selesai. Menumpuk vertikal di ponsel.",
    "en": "Process steps (e.g. checkout: Cart, Address, Pay). `current` = the active step number, starting at 1; earlier steps are marked done. Stacks vertically on phones.",
    "example": "h(Steps, { steps: [\"Keranjang\", \"Alamat\", \"Pembayaran\"], current: 2 })",
    "props": [
      {
        "name": "steps",
        "type": "(string | StepItem)[]",
        "required": true
      },
      {
        "name": "current",
        "type": "number",
        "required": true
      }
    ]
  },
  {
    "name": "DropdownMenu",
    "group": "nav",
    "kind": "component",
    "id": "Tombol yang membuka daftar aksi (tautan atau POST), tanpa JavaScript. `align: \"end\"` membuka menu rata kanan (untuk tombol di sisi kanan).",
    "en": "Button that opens a list of actions (links or POSTs), without JavaScript. `align: \"end\"` opens the menu right-aligned (for a button on the right side).",
    "example": "h(DropdownMenu, { label: \"Aksi\", align: \"end\", items: [{ label: \"Ubah\", href: `/produk/${p.id}` }, { label: \"Hapus\", action: `/produk/${p.id}/hapus`, danger: true }] })",
    "props": [
      {
        "name": "label",
        "type": "string",
        "required": true
      },
      {
        "name": "items",
        "type": "MenuItem[]",
        "required": true
      },
      {
        "name": "align",
        "type": "\"start\" | \"end\"",
        "required": false
      }
    ]
  },
  {
    "name": "BottomNav",
    "group": "nav",
    "kind": "component",
    "id": "Navigasi bawah untuk ponsel (3 sampai 5 tujuan utama), menempel di bawah layar. Hanya tampil di layar sempit; di layar lebar pakai Navbar atau AppShell.",
    "en": "Bottom navigation for phones (3 to 5 main destinations), fixed to the bottom of the screen. Only shown on narrow screens; on wide screens use Navbar or AppShell.",
    "example": "h(BottomNav, { items: [{ href: \"/\", label: \"Beranda\", icon: \"⌂\" }, { href: \"/pesanan\", label: \"Pesanan\", icon: \"☰\" }], active: \"/pesanan\" })",
    "props": [
      {
        "name": "items",
        "type": "BottomNavItem[]",
        "required": true
      },
      {
        "name": "active",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "Footer",
    "group": "nav",
    "kind": "component",
    "id": "Kaki halaman publik: nama aplikasi, kolom tautan, dan catatan (default \"© tahun nama\").",
    "en": "Public page footer: app name, link columns, and a note (default \"© year name\").",
    "example": "h(Footer, { appName: \"Toko Senja\", columns: [{ title: \"Toko\", links: [{ href: \"/menu\", label: \"Menu\" }, { href: \"/kontak\", label: \"Kontak\" }] }] })",
    "props": [
      {
        "name": "appName",
        "type": "string",
        "required": false
      },
      {
        "name": "columns",
        "type": "FooterColumn[]",
        "required": false
      },
      {
        "name": "links",
        "type": "NavLink[]",
        "required": false
      },
      {
        "name": "note",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "Form",
    "group": "form",
    "kind": "component",
    "id": "Formulir POST (CSRF ditangani middleware csrf() lewat header browser, tanpa token). `upload: true` untuk formulir dengan FileInput.",
    "en": "POST form (CSRF is handled by the csrf() middleware through browser headers, no token). Set `upload: true` for forms with a FileInput.",
    "example": "h(Form, { action: \"/produk\" }, h(Field, { name: \"nama\", label: \"Nama\" }), h(FormActions, null, h(Button, null, \"Simpan\")))",
    "props": [
      {
        "name": "action",
        "type": "string",
        "required": false
      },
      {
        "name": "method",
        "type": "\"post\" | \"get\"",
        "required": false
      },
      {
        "name": "upload",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "FormRow",
    "group": "form",
    "kind": "component",
    "id": "Baris beberapa field berdampingan (menumpuk di layar sempit).",
    "en": "Several fields side by side (stacked on narrow screens).",
    "example": "h(FormRow, null, h(Field, { name: \"kota\", label: \"Kota\" }), h(Field, { name: \"kodePos\", label: \"Kode pos\" }))",
    "props": []
  },
  {
    "name": "FormActions",
    "group": "form",
    "kind": "component",
    "id": "Baris tombol di akhir formulir.",
    "en": "Row of buttons at the end of a form.",
    "example": "h(FormActions, null, h(Button, { loading: \"Menyimpan…\" }, \"Simpan\"), h(Button, { variant: \"ghost\", href: \"/produk\" }, \"Batal\"))",
    "props": []
  },
  {
    "name": "Field",
    "group": "form",
    "kind": "component",
    "id": "Label + input + pesan error/petunjuk. Mendukung awalan/akhiran (mis. \"Rp\"), tombol tampilkan password, dan tipe date, time, datetime-local, month, range, color. Password tidak pernah diisi ulang.",
    "en": "Label + input + error/hint message. Supports a prefix/suffix (e.g. \"Rp\"), a show-password button, and date, time, datetime-local, month, range, color types. Passwords are never refilled.",
    "example": "h(Field, { name: \"harga\", label: \"Harga\", type: \"number\", prefix: \"Rp\", value: values.harga, error: errors.harga })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "label",
        "type": "string",
        "required": true
      },
      {
        "name": "type",
        "type": "\"text\" | \"email\" | \"password\" | \"number\" | \"search\" | \"tel\" | \"url\" | \"date\" | \"time\" | \"datetime-local\" | \"month\" | \"range\" | \"color\" | \"textarea\"",
        "required": false,
        "doc": "`\"textarea\"` untuk teks panjang beberapa baris."
      },
      {
        "name": "value",
        "type": "string | number",
        "required": false
      },
      {
        "name": "rows",
        "type": "number",
        "required": false,
        "doc": "Tinggi awal textarea (baris)."
      },
      {
        "name": "maxlength",
        "type": "number",
        "required": false
      },
      {
        "name": "error",
        "type": "string",
        "required": false
      },
      {
        "name": "hint",
        "type": "string",
        "required": false
      },
      {
        "name": "placeholder",
        "type": "string",
        "required": false
      },
      {
        "name": "required",
        "type": "boolean",
        "required": false
      },
      {
        "name": "disabled",
        "type": "boolean",
        "required": false
      },
      {
        "name": "autocomplete",
        "type": "string",
        "required": false
      },
      {
        "name": "min",
        "type": "number | string",
        "required": false
      },
      {
        "name": "max",
        "type": "number | string",
        "required": false
      },
      {
        "name": "step",
        "type": "number | \"any\"",
        "required": false
      },
      {
        "name": "autofocus",
        "type": "boolean",
        "required": false
      },
      {
        "name": "inputmode",
        "type": "\"numeric\" | \"decimal\" | \"email\" | \"tel\" | \"url\" | \"search\" | \"text\"",
        "required": false
      },
      {
        "name": "prefix",
        "type": "string",
        "required": false,
        "doc": "Teks di depan input, mis. \"Rp\" atau \"https://\"."
      },
      {
        "name": "suffix",
        "type": "string",
        "required": false,
        "doc": "Teks di belakang input, mis. \"kg\" atau \"%\"."
      },
      {
        "name": "reveal",
        "type": "boolean",
        "required": false,
        "doc": "Tombol Tampilkan/Sembunyikan untuk password (default true; butuh skrip bawaan page())."
      }
    ]
  },
  {
    "name": "Select",
    "group": "form",
    "kind": "component",
    "id": "Daftar pilihan (`<select>`). `options` berisi teks, `{ value, label }`, atau kelompok `{ group, options }`. `placeholder` menambah pilihan kosong di atas.",
    "en": "Dropdown (`<select>`). `options` holds strings, `{ value, label }`, or groups `{ group, options }`. `placeholder` adds an empty first option.",
    "example": "h(Select, { name: \"kategori\", label: \"Kategori\", placeholder: \"Pilih kategori\", options: [{ value: \"kopi\", label: \"Kopi\" }, { value: \"teh\", label: \"Teh\" }], value: values.kategori, error: errors.kategori })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "label",
        "type": "string",
        "required": true
      },
      {
        "name": "options",
        "type": "(Option | OptionGroup)[]",
        "required": true
      },
      {
        "name": "value",
        "type": "string | number | (string | number)[]",
        "required": false,
        "doc": "Nilai terpilih; array untuk `multiple`."
      },
      {
        "name": "placeholder",
        "type": "string",
        "required": false
      },
      {
        "name": "error",
        "type": "string",
        "required": false
      },
      {
        "name": "hint",
        "type": "string",
        "required": false
      },
      {
        "name": "required",
        "type": "boolean",
        "required": false
      },
      {
        "name": "disabled",
        "type": "boolean",
        "required": false
      },
      {
        "name": "multiple",
        "type": "boolean",
        "required": false
      },
      {
        "name": "autofocus",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "Checkbox",
    "group": "form",
    "kind": "component",
    "id": "Satu kotak centang dengan label di sampingnya (mis. \"Ingat saya\", \"Setuju dengan syarat\"). Bila tidak dicentang, browser tidak mengirim field ini sama sekali.",
    "en": "A single checkbox with its label (e.g. \"Remember me\", \"I agree to the terms\"). When unchecked, the browser does not send the field at all.",
    "example": "h(Checkbox, { name: \"ingat\", label: \"Ingat saya\", checked: true })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "label",
        "type": "string",
        "required": true
      },
      {
        "name": "value",
        "type": "string",
        "required": false
      },
      {
        "name": "checked",
        "type": "boolean",
        "required": false
      },
      {
        "name": "hint",
        "type": "string",
        "required": false
      },
      {
        "name": "error",
        "type": "string",
        "required": false
      },
      {
        "name": "required",
        "type": "boolean",
        "required": false
      },
      {
        "name": "disabled",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "CheckboxGroup",
    "group": "form",
    "kind": "component",
    "id": "Beberapa kotak centang dengan nama yang sama. Di handler, baca semua nilainya dengan `form.getAll(name)` (readForm) atau skema array.",
    "en": "Several checkboxes sharing one name. In the handler read every value with `form.getAll(name)` (readForm) or an array schema.",
    "example": "h(CheckboxGroup, { name: \"hari\", label: \"Hari buka\", inline: true, options: [\"Senin\", \"Selasa\", \"Rabu\"], values: [\"Senin\"] })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "label",
        "type": "string",
        "required": true,
        "doc": "Judul kelompok (legend)."
      },
      {
        "name": "options",
        "type": "Option[]",
        "required": true
      },
      {
        "name": "error",
        "type": "string",
        "required": false
      },
      {
        "name": "hint",
        "type": "string",
        "required": false
      },
      {
        "name": "inline",
        "type": "boolean",
        "required": false,
        "doc": "Pilihan berjajar mendatar, bukan menurun."
      },
      {
        "name": "disabled",
        "type": "boolean",
        "required": false
      },
      {
        "name": "values",
        "type": "(string | number)[]",
        "required": false
      }
    ]
  },
  {
    "name": "RadioGroup",
    "group": "form",
    "kind": "component",
    "id": "Pilih satu dari beberapa pilihan yang semuanya terlihat (untuk 2 sampai 5 pilihan; lebih dari itu pakai Select).",
    "en": "Pick one of a few options that are all visible (for 2 to 5 options; use Select for more).",
    "example": "h(RadioGroup, { name: \"kirim\", label: \"Pengiriman\", options: [{ value: \"ambil\", label: \"Ambil sendiri\" }, { value: \"kurir\", label: \"Kurir\", hint: \"Rp10.000\" }], value: \"ambil\" })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "label",
        "type": "string",
        "required": true,
        "doc": "Judul kelompok (legend)."
      },
      {
        "name": "options",
        "type": "Option[]",
        "required": true
      },
      {
        "name": "error",
        "type": "string",
        "required": false
      },
      {
        "name": "hint",
        "type": "string",
        "required": false
      },
      {
        "name": "inline",
        "type": "boolean",
        "required": false,
        "doc": "Pilihan berjajar mendatar, bukan menurun."
      },
      {
        "name": "disabled",
        "type": "boolean",
        "required": false
      },
      {
        "name": "value",
        "type": "string | number",
        "required": false
      },
      {
        "name": "required",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "Switch",
    "group": "form",
    "kind": "component",
    "id": "Sakelar nyala/mati untuk pengaturan (checkbox dengan role=\"switch\"). Bila mati, field tidak dikirim.",
    "en": "On/off switch for settings (a checkbox with role=\"switch\"). When off, the field is not sent.",
    "example": "h(Switch, { name: \"notifikasi\", label: \"Kirim notifikasi email\", hint: \"Saat ada pesanan baru\", checked: settings.notify })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "label",
        "type": "string",
        "required": true
      },
      {
        "name": "value",
        "type": "string",
        "required": false
      },
      {
        "name": "checked",
        "type": "boolean",
        "required": false
      },
      {
        "name": "hint",
        "type": "string",
        "required": false
      },
      {
        "name": "disabled",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "FileInput",
    "group": "form",
    "kind": "component",
    "id": "Unggah file. Berikan `types` dan `maxBytes` yang sama dengan `saveUpload()` di handler supaya browser menyaring file dan petunjuknya ditulis otomatis. `preview` menampilkan gambar yang sudah tersimpan; gambar yang baru dipilih langsung dipratinjau (butuh skrip bawaan page()). Pakai di `Form` dengan `upload: true`.",
    "en": "File upload. Pass the same `types` and `maxBytes` as `saveUpload()` in the handler so the browser filters files and the hint is written for you. `preview` shows the image already saved; a newly chosen image is previewed right away (needs page()'s built-in script). Use inside a `Form` with `upload: true`.",
    "example": "h(FileInput, { name: \"foto\", label: \"Foto produk\", types: [\"image/*\"], maxBytes: \"5mb\", preview: product.photoUrl, error: errors.foto })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "label",
        "type": "string",
        "required": true
      },
      {
        "name": "types",
        "type": "string[]",
        "required": false,
        "doc": "Tipe MIME yang diterima, sama dengan opsi `types` di saveUpload, mis. [\"image/*\", \"application/pdf\"]."
      },
      {
        "name": "maxBytes",
        "type": "string | number",
        "required": false,
        "doc": "Batas ukuran untuk petunjuk, sama dengan opsi `maxBytes` di saveUpload, mis. \"5mb\"."
      },
      {
        "name": "preview",
        "type": "string",
        "required": false,
        "doc": "URL gambar yang sudah tersimpan."
      },
      {
        "name": "multiple",
        "type": "boolean",
        "required": false
      },
      {
        "name": "required",
        "type": "boolean",
        "required": false
      },
      {
        "name": "disabled",
        "type": "boolean",
        "required": false
      },
      {
        "name": "error",
        "type": "string",
        "required": false
      },
      {
        "name": "hint",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "Fieldset",
    "group": "form",
    "kind": "component",
    "id": "Kelompok field dengan judul (legend), mis. \"Alamat pengiriman\". `box: true` memberi bingkai tipis.",
    "en": "A titled group of fields (legend), e.g. \"Shipping address\". `box: true` adds a thin frame.",
    "example": "h(Fieldset, { legend: \"Alamat pengiriman\", box: true }, h(Field, { name: \"alamat\", label: \"Alamat\" }), h(FormRow, null, ...))",
    "props": [
      {
        "name": "legend",
        "type": "string",
        "required": true
      },
      {
        "name": "hint",
        "type": "string",
        "required": false
      },
      {
        "name": "box",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "Button",
    "group": "form",
    "kind": "component",
    "id": "Tombol atau tautan bergaya tombol (`href`). `variant`: primary (default), secondary, ghost, danger. `loading` mengganti teks selama formulir dikirim. `opens`/`closes` membuka atau menutup Dialog, Drawer, atau Popover.",
    "en": "Button, or a link styled as a button (`href`). `variant`: primary (default), secondary, ghost, danger. `loading` replaces the label while the form is being sent. `opens`/`closes` open or close a Dialog, Drawer, or Popover.",
    "example": "h(Button, { loading: \"Menyimpan…\" }, \"Simpan\")",
    "props": [
      {
        "name": "variant",
        "type": "\"primary\" | \"secondary\" | \"ghost\" | \"danger\"",
        "required": false
      },
      {
        "name": "type",
        "type": "\"submit\" | \"button\"",
        "required": false
      },
      {
        "name": "href",
        "type": "string",
        "required": false
      },
      {
        "name": "small",
        "type": "boolean",
        "required": false
      },
      {
        "name": "block",
        "type": "boolean",
        "required": false
      },
      {
        "name": "name",
        "type": "string",
        "required": false
      },
      {
        "name": "value",
        "type": "string",
        "required": false
      },
      {
        "name": "loading",
        "type": "string",
        "required": false,
        "doc": "Label selama formulir dikirim, mis. \"Menyimpan…\" (butuh skrip bawaan page())."
      },
      {
        "name": "opens",
        "type": "string",
        "required": false,
        "doc": "id Dialog, Drawer, atau Popover yang dibuka tombol ini (tanpa JavaScript)."
      },
      {
        "name": "closes",
        "type": "string",
        "required": false,
        "doc": "id Dialog, Drawer, atau Popover yang ditutup tombol ini."
      }
    ]
  },
  {
    "name": "PostButton",
    "group": "form",
    "kind": "component",
    "id": "Tombol yang mengirim POST ke `action` (mis. hapus data), dengan konfirmasi browser opsional. Tidak memakai JavaScript kecuali untuk konfirmasi.",
    "en": "Button that POSTs to `action` (e.g. delete a record), with an optional browser confirmation. No JavaScript except for the confirmation.",
    "example": "h(PostButton, { action: `/produk/${p.id}/hapus`, confirm: `Hapus ${p.name}?` }, \"Hapus\")",
    "props": [
      {
        "name": "action",
        "type": "string",
        "required": true
      },
      {
        "name": "confirm",
        "type": "string",
        "required": false
      },
      {
        "name": "variant",
        "type": "\"primary\" | \"secondary\" | \"ghost\" | \"danger\"",
        "required": false
      }
    ]
  },
  {
    "name": "Search",
    "group": "form",
    "kind": "component",
    "id": "Kotak pencarian (GET, `?q=`). Menampilkan tautan \"Hapus\" bila ada kata kunci.",
    "en": "Search box (GET, `?q=`). Shows a \"Clear\" link when there is a query.",
    "example": "h(Search, { action: \"/produk\", value: ctx.query.q })",
    "props": [
      {
        "name": "action",
        "type": "string",
        "required": true
      },
      {
        "name": "name",
        "type": "string",
        "required": false
      },
      {
        "name": "value",
        "type": "string",
        "required": false
      },
      {
        "name": "label",
        "type": "string",
        "required": false
      },
      {
        "name": "placeholder",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "Dialog",
    "group": "overlay",
    "kind": "component",
    "id": "Dialog di tengah layar untuk isi singkat atau formulir kecil. Dibuka tombol dengan `opens: id`, atau isi `trigger` untuk sekaligus membuat tombolnya. `open: true` membukanya saat halaman dimuat (mis. formulir di dalamnya punya error).",
    "en": "Centered dialog for short content or a small form. Opened by a button with `opens: id`, or set `trigger` to render that button too. `open: true` opens it when the page loads (e.g. the form inside has errors).",
    "example": "h(Dialog, { id: \"tambah-produk\", title: \"Tambah produk\", trigger: \"Tambah\" }, h(Form, { action: \"/produk\" }, h(Field, { name: \"nama\", label: \"Nama\" }), h(FormActions, null, h(Button, null, \"Simpan\"))))",
    "props": [
      {
        "name": "id",
        "type": "string",
        "required": true
      },
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "trigger",
        "type": "string",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      },
      {
        "name": "open",
        "type": "boolean",
        "required": false
      },
      {
        "name": "size",
        "type": "\"sm\" | \"md\" | \"lg\"",
        "required": false
      }
    ]
  },
  {
    "name": "ConfirmDialog",
    "group": "overlay",
    "kind": "component",
    "id": "Dialog konfirmasi sebelum aksi penting (mis. hapus): judul, penjelasan, tombol Batal, dan tombol yang mengirim POST ke `action`. Pengganti PostButton dengan `confirm` bila butuh penjelasan lebih.",
    "en": "Confirmation dialog before an important action (e.g. delete): title, explanation, a Cancel button, and a button that POSTs to `action`. Use it instead of PostButton with `confirm` when more explanation is needed.",
    "example": "h(ConfirmDialog, { id: `hapus-${p.id}`, trigger: \"Hapus\", title: `Hapus ${p.name}?`, text: \"Produk yang dihapus tidak bisa dikembalikan.\", action: `/produk/${p.id}/hapus`, confirm: \"Hapus\" })",
    "props": [
      {
        "name": "id",
        "type": "string",
        "required": true
      },
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "text",
        "type": "string",
        "required": false
      },
      {
        "name": "action",
        "type": "string",
        "required": true
      },
      {
        "name": "confirm",
        "type": "string",
        "required": true
      },
      {
        "name": "cancel",
        "type": "string",
        "required": false
      },
      {
        "name": "trigger",
        "type": "string",
        "required": false
      },
      {
        "name": "tone",
        "type": "\"danger\" | \"primary\"",
        "required": false
      }
    ]
  },
  {
    "name": "Drawer",
    "group": "overlay",
    "kind": "component",
    "id": "Laci yang meluncur dari sisi layar (kanan, kiri, atau bawah) untuk filter, detail, atau menu panjang. Dibuka dengan `opens: id` atau `trigger`.",
    "en": "Drawer that slides in from a side of the screen (right, left, or bottom) for filters, details, or a long menu. Opened with `opens: id` or `trigger`.",
    "example": "h(Drawer, { id: \"filter\", title: \"Filter\", trigger: \"Filter\", actions: h(Button, null, \"Terapkan\") }, h(CheckboxGroup, { name: \"kategori\", label: \"Kategori\", options: [\"Kopi\", \"Teh\"] }))",
    "props": [
      {
        "name": "id",
        "type": "string",
        "required": true
      },
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "side",
        "type": "\"right\" | \"left\" | \"bottom\"",
        "required": false
      },
      {
        "name": "trigger",
        "type": "string",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "Sheet",
    "group": "overlay",
    "kind": "component",
    "id": "Lembar dari bawah layar, cocok untuk pilihan cepat di ponsel. Sama dengan Drawer `side: \"bottom\"`.",
    "en": "Sheet from the bottom of the screen, good for quick choices on phones. Same as Drawer with `side: \"bottom\"`.",
    "example": "h(Sheet, { id: \"bagikan\", title: \"Bagikan\", trigger: \"Bagikan\" }, h(List, { items: [[h(\"a\", { href: waLink }, \"WhatsApp\")]] }))",
    "props": [
      {
        "name": "id",
        "type": "string",
        "required": true
      },
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "trigger",
        "type": "string",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "Popover",
    "group": "overlay",
    "kind": "component",
    "id": "Kotak kecil yang muncul di bawah tombolnya (info tambahan, pilihan singkat). Klik di luar atau Esc menutupnya.",
    "en": "Small box that appears below its button (extra info, short choices). Clicking outside or pressing Esc closes it.",
    "example": "h(Popover, { id: \"info-ongkir\", trigger: \"Info ongkir\" }, h(\"p\", null, \"Gratis ongkir untuk pesanan di atas Rp100.000.\"))",
    "props": [
      {
        "name": "id",
        "type": "string",
        "required": true
      },
      {
        "name": "trigger",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "name": "Tooltip",
    "group": "overlay",
    "kind": "component",
    "id": "Keterangan singkat yang muncul saat elemen disentuh kursor atau difokus keyboard. Hanya untuk penjelasan tambahan; informasi penting tulis langsung di halaman.",
    "en": "Short hint that appears when the element is hovered or focused with the keyboard. Only for extra explanation; write important information directly on the page.",
    "example": "h(Tooltip, { text: \"Termasuk PPN 11%\" }, h(Button, { variant: \"ghost\", small: true, type: \"button\" }, \"Harga\"))",
    "props": [
      {
        "name": "text",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "name": "Avatar",
    "group": "data",
    "kind": "component",
    "id": "Inisial nama dalam kotak bersudut lembut.",
    "en": "Name initials in a softly rounded box.",
    "example": "h(Avatar, { name: \"Sari Dewi\" })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "name": "Stat",
    "group": "data",
    "kind": "component",
    "id": "Satu angka ringkasan. Kumpulkan beberapa di dalam StatGroup agar tampil sebagai satu strip bersekat. `trend` + `change` menampilkan perubahan naik/turun berwarna (hijau bila baik); `good: \"down\"` untuk angka yang lebih baik bila turun (mis. keluhan).",
    "en": "One summary number. Put several inside a StatGroup to show them as one divided strip. `trend` + `change` show a colored up/down change (green when good); `good: \"down\"` for numbers that are better when they go down (e.g. complaints).",
    "example": "h(Stat, { label: \"Pendapatan\", value: rupiah(12500000), trend: \"up\", change: \"12%\", hint: \"dari bulan lalu\" })",
    "props": [
      {
        "name": "label",
        "type": "string",
        "required": true
      },
      {
        "name": "value",
        "type": "string | number",
        "required": true
      },
      {
        "name": "hint",
        "type": "string",
        "required": false
      },
      {
        "name": "trend",
        "type": "\"up\" | \"down\" | \"flat\"",
        "required": false
      },
      {
        "name": "change",
        "type": "string",
        "required": false
      },
      {
        "name": "good",
        "type": "\"up\" | \"down\"",
        "required": false
      }
    ]
  },
  {
    "name": "StatGroup",
    "group": "data",
    "kind": "component",
    "id": "Strip angka ringkasan dengan pemisah tipis, pengganti deretan kartu kembar.",
    "en": "Strip of summary numbers with thin dividers, instead of a row of identical cards.",
    "example": "h(StatGroup, null, h(Stat, { label: \"Produk\", value: 12 }), h(Stat, { label: \"Pesanan\", value: 40 }))",
    "props": []
  },
  {
    "name": "Badge",
    "group": "data",
    "kind": "component",
    "id": "Label kecil bersudut untuk status atau kategori: `tone` accent, gold, ok, warn, danger, atau netral.",
    "en": "Small rounded label for a status or category: `tone` accent, gold, ok, warn, danger, or neutral.",
    "example": "h(Badge, { tone: \"ok\" }, \"Lunas\")",
    "props": [
      {
        "name": "tone",
        "type": "\"accent\" | \"gold\" | \"danger\" | \"ok\" | \"warn\"",
        "required": false
      }
    ]
  },
  {
    "name": "Table",
    "group": "data",
    "kind": "component",
    "id": "Tabel data. `align: \"num\"` untuk kolom angka, `\"end\"` untuk kolom aksi. Tanpa baris, menampilkan `empty` (atau teks default). Bergulir mendatar sendiri di layar sempit.",
    "en": "Data table. `align: \"num\"` for number columns, `\"end\"` for an actions column. With no rows it shows `empty` (or a default text). Scrolls sideways on its own on narrow screens.",
    "example": "h(Table, { columns: [{ label: \"Produk\" }, { label: \"Harga\", align: \"num\" }], rows: products.map((p) => [p.name, money(p.price)]), empty: h(EmptyState, { title: \"Belum ada produk\" }) })",
    "props": [
      {
        "name": "columns",
        "type": "Column[]",
        "required": true
      },
      {
        "name": "rows",
        "type": "Child[][]",
        "required": true
      },
      {
        "name": "empty",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "List",
    "group": "data",
    "kind": "component",
    "id": "Daftar ringkas: setiap item satu baris (label di kiri, nilai/aksi di kanan).",
    "en": "Compact list: one line per item (label on the left, value/action on the right).",
    "example": "h(List, { items: [[\"Email\", user.email], [\"Peran\", \"Admin\"]] })",
    "props": [
      {
        "name": "items",
        "type": "Child[][]",
        "required": true
      }
    ]
  },
  {
    "name": "DescriptionList",
    "group": "data",
    "kind": "component",
    "id": "Detail satu data sebagai pasangan label dan nilai (mis. halaman detail pesanan). `columns: 2` untuk dua kolom di layar lebar.",
    "en": "Details of one record as label and value pairs (e.g. an order detail page). `columns: 2` for two columns on wide screens.",
    "example": "h(DescriptionList, { items: [{ label: \"Pelanggan\", value: order.customer }, { label: \"Total\", value: rupiah(order.total) }, { label: \"Status\", value: h(Badge, { tone: \"ok\" }, \"Lunas\") }] })",
    "props": [
      {
        "name": "items",
        "type": "DescriptionItem[]",
        "required": true
      },
      {
        "name": "columns",
        "type": "1 | 2",
        "required": false
      }
    ]
  },
  {
    "name": "Accordion",
    "group": "data",
    "kind": "component",
    "id": "Daftar bagian yang bisa dibuka-tutup (mis. FAQ), tanpa JavaScript. `single: true` = membuka satu bagian menutup yang lain.",
    "en": "List of sections that open and close (e.g. an FAQ), without JavaScript. `single: true` = opening one section closes the others.",
    "example": "h(Accordion, { single: true, items: [{ title: \"Berapa lama pengiriman?\", content: \"1 sampai 3 hari kerja.\" }, { title: \"Bisa bayar di tempat?\", content: \"Bisa, untuk wilayah Bandung.\" }] })",
    "props": [
      {
        "name": "items",
        "type": "AccordionItem[]",
        "required": true
      },
      {
        "name": "single",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "Timeline",
    "group": "data",
    "kind": "component",
    "id": "Urutan kejadian dari atas ke bawah (riwayat pesanan, log aktivitas).",
    "en": "Sequence of events from top to bottom (order history, activity log).",
    "example": "h(Timeline, { items: [{ title: \"Pesanan dibuat\", time: \"09.12\" }, { title: \"Dibayar\", time: \"09.15\", tone: \"ok\" }, { title: \"Dikirim\", time: \"13.40\", text: \"JNE 0123456789\" }] })",
    "props": [
      {
        "name": "items",
        "type": "TimelineItem[]",
        "required": true
      }
    ]
  },
  {
    "name": "Tag",
    "group": "data",
    "kind": "component",
    "id": "Label kategori berbentuk pil, bisa berupa tautan (mis. filter kategori). Untuk status pakai Badge.",
    "en": "Pill-shaped category label, optionally a link (e.g. a category filter). For a status use Badge.",
    "example": "h(Tag, { href: \"/produk?kategori=kopi\" }, \"Kopi\")",
    "props": [
      {
        "name": "href",
        "type": "string",
        "required": false
      },
      {
        "name": "active",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "AvatarGroup",
    "group": "data",
    "kind": "component",
    "id": "Deretan avatar yang sedikit bertumpuk, dengan \"+N\" bila lebih dari `max`.",
    "en": "Row of slightly overlapping avatars, with \"+N\" when there are more than `max`.",
    "example": "h(AvatarGroup, { names: team.map((m) => m.name), max: 4 })",
    "props": [
      {
        "name": "names",
        "type": "string[]",
        "required": true
      },
      {
        "name": "max",
        "type": "number",
        "required": false
      }
    ]
  },
  {
    "name": "Rating",
    "group": "data",
    "kind": "component",
    "id": "Rating bintang. Tanpa `name` hanya menampilkan nilai; dengan `name` menjadi input pilihan bintang dalam formulir (tanpa JavaScript).",
    "en": "Star rating. Without `name` it only shows the value; with `name` it becomes a star input in a form (no JavaScript).",
    "example": "h(Rating, { value: 4.5, count: 128 })",
    "props": [
      {
        "name": "value",
        "type": "number",
        "required": false
      },
      {
        "name": "max",
        "type": "number",
        "required": false
      },
      {
        "name": "count",
        "type": "number",
        "required": false
      },
      {
        "name": "name",
        "type": "string",
        "required": false
      },
      {
        "name": "label",
        "type": "string",
        "required": false
      },
      {
        "name": "required",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "CodeBlock",
    "group": "data",
    "kind": "component",
    "id": "Blok kode dengan tombol Salin (tombolnya muncul bila JavaScript aktif). `title` untuk nama file.",
    "en": "Code block with a Copy button (the button appears when JavaScript is on). `title` for a file name.",
    "example": "h(CodeBlock, { title: \"Terminal\", code: \"npx zusantara dev\" })",
    "props": [
      {
        "name": "code",
        "type": "string",
        "required": true
      },
      {
        "name": "title",
        "type": "string",
        "required": false
      },
      {
        "name": "lang",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "Calendar",
    "group": "data",
    "kind": "component",
    "id": "Kalender satu bulan dengan acara (booking, jadwal kelas, agenda). `month` = \"YYYY-MM\". `href` memakai `{month}` untuk tautan bulan sebelumnya/berikutnya (mis. \"/jadwal?bulan={month}\"). Di ponsel (atau `view: \"list\"`) tampil sebagai daftar acara.",
    "en": "One-month calendar with events (bookings, class schedules, agendas). `month` = \"YYYY-MM\". `href` uses `{month}` for the previous/next month links (e.g. \"/schedule?month={month}\"). On phones (or with `view: \"list\"`) it shows as a list of events.",
    "example": "h(Calendar, { month: ctx.query.bulan, href: \"/jadwal?bulan={month}\", events: bookings.map((b) => ({ date: b.date, time: b.time, title: b.name, href: `/booking/${b.id}` })) })",
    "props": [
      {
        "name": "month",
        "type": "string",
        "required": false
      },
      {
        "name": "events",
        "type": "CalendarEvent[]",
        "required": false
      },
      {
        "name": "href",
        "type": "string",
        "required": false
      },
      {
        "name": "view",
        "type": "\"month\" | \"list\"",
        "required": false
      },
      {
        "name": "today",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "placeholder",
    "group": "public",
    "kind": "function",
    "id": "URL gambar contoh bawaan (/_zusantara/placeholder.svg) berukuran tertentu dengan teks di tengahnya. Untuk purwarupa sebelum foto asli tersedia; tidak butuh internet.",
    "en": "Built-in sample image URL (/_zusantara/placeholder.svg) of a given size with text in the middle. For prototypes before real photos exist; needs no internet.",
    "example": "h(MediaCard, { image: { src: placeholder(\"Kue cokelat\", 800, 600), alt: \"Kue cokelat\" }, title: \"Kue cokelat\" })",
    "props": [],
    "signature": "placeholder(text?: string, width?: number, height?: number): string"
  },
  {
    "name": "Hero",
    "group": "public",
    "kind": "component",
    "id": "Bagian pembuka halaman publik: judul besar, kalimat pendukung, tombol aksi, dan gambar opsional di samping (di bawah pada ponsel). `eyebrow` = label kecil di atas judul.",
    "en": "Opening section of a public page: a large title, a supporting sentence, action buttons, and an optional image beside it (below on phones). `eyebrow` = small label above the title.",
    "example": "h(Hero, { eyebrow: \"Toko kue rumahan\", title: \"Kue segar setiap pagi\", text: \"Dipanggang tanpa pengawet, diantar ke rumah Anda.\", actions: [h(Button, { href: \"/menu\" }, \"Lihat menu\"), h(Button, { href: \"/kontak\", variant: \"secondary\" }, \"Hubungi kami\")], image: { src: \"/img/kue.jpg\", alt: \"Kue cokelat\" } })",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "text",
        "type": "string",
        "required": false
      },
      {
        "name": "eyebrow",
        "type": "string",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      },
      {
        "name": "image",
        "type": "ImageRef",
        "required": false
      },
      {
        "name": "align",
        "type": "\"start\" | \"center\"",
        "required": false
      }
    ]
  },
  {
    "name": "FeatureGrid",
    "group": "public",
    "kind": "component",
    "id": "Daftar keunggulan dalam grid (2 sampai 4 kolom, menumpuk di ponsel), dengan judul bagian opsional.",
    "en": "Grid of features or benefits (2 to 4 columns, stacked on phones), with an optional section title.",
    "example": "h(FeatureGrid, { title: \"Kenapa kami\", features: [{ icon: \"🌾\", title: \"Bahan lokal\", text: \"Tepung dan mentega dari petani sekitar.\" }, { icon: \"🚚\", title: \"Antar hari ini\", text: \"Pesan sebelum jam 10.\" }] })",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": false
      },
      {
        "name": "text",
        "type": "string",
        "required": false
      },
      {
        "name": "features",
        "type": "Feature[]",
        "required": true
      },
      {
        "name": "cols",
        "type": "2 | 3 | 4",
        "required": false
      }
    ]
  },
  {
    "name": "MediaCard",
    "group": "public",
    "kind": "component",
    "id": "Kartu dengan gambar di atas: artikel, layanan, portofolio, atau acara. Seluruh kartu bisa diklik bila ada `href`.",
    "en": "Card with an image on top: an article, service, portfolio item, or event. The whole card is clickable when `href` is set.",
    "example": "h(MediaCard, { image: { src: post.cover, alt: \"\" }, title: post.title, text: post.excerpt, meta: formatDate(post.date), href: `/blog/${post.slug}` })",
    "props": [
      {
        "name": "image",
        "type": "ImageRef",
        "required": true
      },
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "text",
        "type": "string",
        "required": false
      },
      {
        "name": "meta",
        "type": "string",
        "required": false
      },
      {
        "name": "href",
        "type": "string",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "Gallery",
    "group": "public",
    "kind": "component",
    "id": "Galeri foto berbentuk grid dengan rasio seragam dan keterangan opsional. Foto membuka ukuran penuh saat diklik.",
    "en": "Photo gallery grid with a uniform ratio and optional captions. Clicking a photo opens it full size.",
    "example": "h(Gallery, { images: photos.map((p) => ({ src: p.url, alt: p.title, caption: p.title })), ratio: \"square\" })",
    "props": [
      {
        "name": "images",
        "type": "GalleryImage[]",
        "required": true
      },
      {
        "name": "cols",
        "type": "2 | 3 | 4",
        "required": false
      },
      {
        "name": "ratio",
        "type": "\"square\" | \"landscape\" | \"portrait\"",
        "required": false
      }
    ]
  },
  {
    "name": "Pricing",
    "group": "public",
    "kind": "component",
    "id": "Tabel harga paket berdampingan (menumpuk di ponsel). Satu paket bisa disorot dengan `featured`.",
    "en": "Side-by-side plan prices (stacked on phones). One plan can be highlighted with `featured`.",
    "example": "h(Pricing, { plans: [{ name: \"Dasar\", price: 49000, period: \"/bulan\", features: [\"1 toko\", \"100 produk\"], cta: { label: \"Mulai\", href: \"/daftar\" } }, { name: \"Pro\", price: 99000, period: \"/bulan\", features: [\"3 toko\", \"Produk tanpa batas\"], cta: { label: \"Coba Pro\", href: \"/daftar?paket=pro\" }, featured: true }] })",
    "props": [
      {
        "name": "plans",
        "type": "PricingPlan[]",
        "required": true
      },
      {
        "name": "currency",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "Testimonial",
    "group": "public",
    "kind": "component",
    "id": "Kutipan pelanggan dengan nama, peran, foto atau inisial, dan rating opsional.",
    "en": "Customer quote with name, role, photo or initials, and an optional rating.",
    "example": "h(Testimonial, { quote: \"Kuenya lembut dan tidak terlalu manis.\", name: \"Rina\", role: \"Pelanggan sejak 2024\", rating: 5 })",
    "props": [
      {
        "name": "quote",
        "type": "string",
        "required": true
      },
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "role",
        "type": "string",
        "required": false
      },
      {
        "name": "photo",
        "type": "string",
        "required": false
      },
      {
        "name": "rating",
        "type": "number",
        "required": false
      }
    ]
  },
  {
    "name": "FAQ",
    "group": "public",
    "kind": "component",
    "id": "Pertanyaan yang sering diajukan: daftar buka-tutup, plus data terstruktur FAQPage (schema.org) agar mesin pencari bisa menampilkannya (`schema: false` untuk mematikan).",
    "en": "Frequently asked questions: an open/close list, plus FAQPage structured data (schema.org) so search engines can show it (`schema: false` turns it off).",
    "example": "h(FAQ, { title: \"Pertanyaan umum\", items: [{ question: \"Berapa lama pengiriman?\", answer: \"1 sampai 3 hari kerja.\" }] })",
    "props": [
      {
        "name": "items",
        "type": "FaqItem[]",
        "required": true
      },
      {
        "name": "title",
        "type": "string",
        "required": false
      },
      {
        "name": "schema",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "CTA",
    "group": "public",
    "kind": "component",
    "id": "Pita ajakan bertindak di akhir halaman: judul, kalimat pendek, dan tombol.",
    "en": "Call-to-action band near the end of a page: a title, a short sentence, and buttons.",
    "example": "h(CTA, { title: \"Siap pesan untuk acara Anda?\", text: \"Gratis ongkir di Bandung untuk pesanan pertama.\", actions: h(Button, { href: \"/pesan\" }, \"Pesan sekarang\") })",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "text",
        "type": "string",
        "required": false
      },
      {
        "name": "actions",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "LogoCloud",
    "group": "public",
    "kind": "component",
    "id": "Deretan logo mitra atau klien, abu-abu dan seragam tingginya.",
    "en": "Row of partner or client logos, grey and the same height.",
    "example": "h(LogoCloud, { title: \"Dipercaya oleh\", logos: [{ src: \"/logo/bank.svg\", alt: \"Bank Sejahtera\" }, { src: \"/logo/kopi.svg\", alt: \"Kopi Nusantara\" }] })",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": false
      },
      {
        "name": "logos",
        "type": "LogoItem[]",
        "required": true
      }
    ]
  },
  {
    "name": "TeamCard",
    "group": "public",
    "kind": "component",
    "id": "Kartu anggota tim: foto (atau inisial), nama, peran, keterangan singkat, dan tautan.",
    "en": "Team member card: photo (or initials), name, role, a short bio, and links.",
    "example": "h(TeamCard, { name: \"Sari Dewi\", role: \"Kepala dapur\", photo: \"/tim/sari.jpg\", bio: \"12 tahun di dapur hotel.\", links: [{ href: \"https://instagram.com/sari\", label: \"Instagram\" }] })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "role",
        "type": "string",
        "required": false
      },
      {
        "name": "photo",
        "type": "string",
        "required": false
      },
      {
        "name": "bio",
        "type": "string",
        "required": false
      },
      {
        "name": "links",
        "type": "NavLink[]",
        "required": false
      }
    ]
  },
  {
    "name": "ContactForm",
    "group": "public",
    "kind": "component",
    "id": "Formulir kontak siap pakai (nama, email, pesan) dengan `values` dan `errors` untuk ditampilkan ulang setelah validasi, plus tautan WhatsApp opsional (`whatsapp: \"0812…\"`).",
    "en": "Ready-made contact form (name, email, message) with `values` and `errors` to re-render after validation, plus an optional WhatsApp link (`whatsapp: \"0812…\"`).",
    "example": "h(ContactForm, { action: \"/kontak\", values, errors, whatsapp: \"081234567890\" })",
    "props": [
      {
        "name": "action",
        "type": "string",
        "required": true
      },
      {
        "name": "values",
        "type": "Record<string, unknown>",
        "required": false
      },
      {
        "name": "errors",
        "type": "Record<string, string>",
        "required": false
      },
      {
        "name": "whatsapp",
        "type": "string",
        "required": false
      },
      {
        "name": "submit",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "PriceTag",
    "group": "commerce",
    "kind": "component",
    "id": "Harga dengan harga coret opsional (`original`) dan periode (mis. \"/bulan\"). Angka diformat sesuai bahasa aktif; rupiah tanpa desimal.",
    "en": "Price with an optional struck-through original price (`original`) and period (e.g. \"/month\"). Numbers follow the active language; rupiah without decimals.",
    "example": "h(PriceTag, { amount: 45000, original: 60000 })",
    "props": [
      {
        "name": "amount",
        "type": "number",
        "required": true
      },
      {
        "name": "original",
        "type": "number",
        "required": false
      },
      {
        "name": "currency",
        "type": "string",
        "required": false
      },
      {
        "name": "period",
        "type": "string",
        "required": false
      },
      {
        "name": "large",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "ProductCard",
    "group": "commerce",
    "kind": "component",
    "id": "Kartu produk untuk katalog toko: foto, nama, harga (dengan coret dan label diskon otomatis), rating, label stok habis, dan tombol aksi (mis. formulir \"Tambah ke keranjang\").",
    "en": "Product card for a shop catalog: photo, name, price (with an automatic strike-through and discount label), rating, sold-out label, and an action (e.g. an \"Add to cart\" form).",
    "example": "h(ProductCard, { name: p.name, href: `/produk/${p.slug}`, image: { src: p.photo, alt: p.name }, price: p.price, original: p.oldPrice, rating: 4.8, reviews: 120, action: h(PostButton, { action: `/keranjang/${p.id}`, variant: \"primary\" }, \"Tambah\") })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "price",
        "type": "number",
        "required": true
      },
      {
        "name": "original",
        "type": "number",
        "required": false
      },
      {
        "name": "image",
        "type": "ImageRef",
        "required": true
      },
      {
        "name": "href",
        "type": "string",
        "required": false
      },
      {
        "name": "rating",
        "type": "number",
        "required": false
      },
      {
        "name": "reviews",
        "type": "number",
        "required": false
      },
      {
        "name": "badge",
        "type": "string",
        "required": false,
        "doc": "Label di atas nama produk, mis. \"Baru\". Default: persen diskon bila ada `original`."
      },
      {
        "name": "soldOut",
        "type": "boolean",
        "required": false
      },
      {
        "name": "currency",
        "type": "string",
        "required": false
      },
      {
        "name": "action",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "QuantityInput",
    "group": "commerce",
    "kind": "component",
    "id": "Input jumlah barang dengan tombol − dan + (tampil bila JavaScript aktif; tanpa JavaScript tetap berupa input angka biasa). Dipakai di dalam Form.",
    "en": "Quantity input with − and + buttons (shown when JavaScript runs; without JavaScript it is a plain number input). Use it inside a Form.",
    "example": "h(QuantityInput, { name: \"qty\", value: 1, max: product.stock })",
    "props": [
      {
        "name": "name",
        "type": "string",
        "required": true
      },
      {
        "name": "value",
        "type": "number",
        "required": false
      },
      {
        "name": "min",
        "type": "number",
        "required": false
      },
      {
        "name": "max",
        "type": "number",
        "required": false
      },
      {
        "name": "label",
        "type": "string",
        "required": false
      },
      {
        "name": "hideLabel",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "CartSummary",
    "group": "commerce",
    "kind": "component",
    "id": "Ringkasan keranjang atau pesanan: daftar barang (jumlah × harga), subtotal, ongkir, potongan, dan total, plus tombol lanjut (mis. \"Bayar\"). Ongkir 0 tertulis \"Gratis\"; keranjang kosong menampilkan `empty`.",
    "en": "Cart or order summary: items (quantity × price), subtotal, shipping, discount, and total, plus a next-step button (e.g. \"Pay\"). Zero shipping reads \"Free\"; an empty cart shows `empty`.",
    "example": "h(CartSummary, { items: cart.map((c) => ({ name: c.name, price: c.price, qty: c.qty })), shipping: 15000, action: h(Button, { href: \"/bayar\", block: true }, \"Lanjut bayar\") })",
    "props": [
      {
        "name": "items",
        "type": "CartLine[]",
        "required": true
      },
      {
        "name": "shipping",
        "type": "number",
        "required": false
      },
      {
        "name": "discount",
        "type": "number",
        "required": false
      },
      {
        "name": "currency",
        "type": "string",
        "required": false
      },
      {
        "name": "title",
        "type": "string",
        "required": false
      },
      {
        "name": "action",
        "type": "Child",
        "required": false
      },
      {
        "name": "empty",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "Alert",
    "group": "feedback",
    "kind": "component",
    "id": "Pesan untuk pengguna: `tone` info (default), success, error, atau warn.",
    "en": "Message for the user: `tone` info (default), success, error, or warn.",
    "example": "h(Alert, { tone: \"success\" }, \"Produk tersimpan.\")",
    "props": [
      {
        "name": "tone",
        "type": "\"info\" | \"success\" | \"error\" | \"warn\"",
        "required": false
      }
    ]
  },
  {
    "name": "EmptyState",
    "group": "feedback",
    "kind": "component",
    "id": "Keadaan kosong yang memberi tahu cara mengisinya.",
    "en": "Empty state that tells the user how to fill it.",
    "example": "h(EmptyState, { title: \"Belum ada produk\", text: \"Tambahkan produk pertama Anda.\", action: h(Button, { href: \"/produk/baru\" }, \"Tambah produk\") })",
    "props": [
      {
        "name": "title",
        "type": "string",
        "required": true
      },
      {
        "name": "text",
        "type": "string",
        "required": false
      },
      {
        "name": "action",
        "type": "Child",
        "required": false
      }
    ]
  },
  {
    "name": "Toast",
    "group": "feedback",
    "kind": "component",
    "id": "Pesan singkat yang melayang di pojok bawah layar dan hilang sendiri (default 6 detik; `timeout: 0` = tetap tampil). Untuk pesan setelah redirect, pakai `flash: takeFlash(ctx)`: tidak ada pesan = tidak dirender apa-apa. Tanpa JavaScript toast tetap tampil sampai halaman berganti.",
    "en": "Short message that floats in the bottom corner and disappears by itself (6 seconds by default; `timeout: 0` = stays). For a message after a redirect, pass `flash: takeFlash(ctx)`: no message = nothing is rendered. Without JavaScript the toast stays until the page changes.",
    "example": "h(Toast, { flash: takeFlash(ctx) })",
    "props": [
      {
        "name": "tone",
        "type": "\"success\" | \"info\" | \"warn\" | \"error\"",
        "required": false
      },
      {
        "name": "flash",
        "type": "Flash",
        "required": false
      },
      {
        "name": "timeout",
        "type": "number",
        "required": false
      }
    ]
  },
  {
    "name": "Progress",
    "group": "feedback",
    "kind": "component",
    "id": "Bilah kemajuan (unggah, kuota, langkah). Tanpa `value` menjadi animasi \"sedang berjalan\".",
    "en": "Progress bar (upload, quota, steps). Without `value` it becomes an indeterminate \"in progress\" animation.",
    "example": "h(Progress, { label: \"Kuota penyimpanan\", value: 7.2, max: 10, text: \"7,2 dari 10 GB\" })",
    "props": [
      {
        "name": "label",
        "type": "string",
        "required": true
      },
      {
        "name": "value",
        "type": "number",
        "required": false
      },
      {
        "name": "max",
        "type": "number",
        "required": false
      },
      {
        "name": "text",
        "type": "string",
        "required": false
      }
    ]
  },
  {
    "name": "Spinner",
    "group": "feedback",
    "kind": "component",
    "id": "Indikator memuat yang berputar, dengan teks opsional di sampingnya.",
    "en": "Spinning loading indicator, with optional text beside it.",
    "example": "h(Spinner, { text: \"Memuat pesanan…\" })",
    "props": [
      {
        "name": "text",
        "type": "string",
        "required": false
      },
      {
        "name": "size",
        "type": "\"sm\" | \"md\" | \"lg\"",
        "required": false
      }
    ]
  },
  {
    "name": "Skeleton",
    "group": "feedback",
    "kind": "component",
    "id": "Kerangka abu-abu berdenyut sebagai tempat isi yang sedang dimuat (mis. di dalam Card).",
    "en": "Pulsing grey placeholder for content that is still loading (e.g. inside a Card).",
    "example": "h(Skeleton, { lines: 3, avatar: true })",
    "props": [
      {
        "name": "lines",
        "type": "number",
        "required": false
      },
      {
        "name": "avatar",
        "type": "boolean",
        "required": false
      },
      {
        "name": "block",
        "type": "boolean",
        "required": false
      }
    ]
  },
  {
    "name": "flash",
    "group": "feedback",
    "kind": "function",
    "id": "Simpan pesan untuk ditampilkan satu kali di halaman berikutnya (biasanya tepat sebelum redirect). Tampilkan dengan `h(Toast, { flash: takeFlash(ctx) })` di halaman tujuan.",
    "en": "Store a message to show once on the next page (usually right before a redirect). Show it with `h(Toast, { flash: takeFlash(ctx) })` on the target page.",
    "example": "flash(ctx, \"Produk tersimpan\"); return redirect(\"/produk\");",
    "props": [],
    "signature": "flash(ctx: ZenContext, message: string, tone?: Flash[\"tone\"]): void"
  },
  {
    "name": "takeFlash",
    "group": "feedback",
    "kind": "function",
    "id": "Ambil pesan flash lalu hapus, atau `undefined` bila tidak ada. Biasanya langsung diberikan ke Toast.",
    "en": "Take the flash message and remove it, or `undefined` when there is none. Usually passed straight to Toast.",
    "example": "h(Toast, { flash: takeFlash(ctx) })",
    "props": [],
    "signature": "takeFlash(ctx: ZenContext): Flash | undefined"
  },
  {
    "name": "rupiah",
    "group": "format",
    "kind": "function",
    "id": "Format rupiah, mis. 45000 -> \"Rp45.000\", apa pun bahasa aktifnya.",
    "en": "Rupiah format, e.g. 45000 -> \"Rp45.000\", whatever the active language.",
    "example": "rupiah(45000)",
    "props": [],
    "signature": "rupiah(value: number): string"
  },
  {
    "name": "money",
    "group": "format",
    "kind": "function",
    "id": "Format mata uang sesuai bahasa aktif (default IDR untuk id, USD untuk en).",
    "en": "Currency in the active language's format (IDR by default for id, USD for en).",
    "example": "money(12.5, \"USD\")",
    "props": [],
    "signature": "money(value: number, currency?: string): string"
  },
  {
    "name": "formatNumber",
    "group": "format",
    "kind": "function",
    "id": "Angka dengan pemisah ribuan sesuai bahasa aktif, mis. 12500 -> \"12.500\" (id) atau \"12,500\" (en).",
    "en": "Number with thousands separators for the active language, e.g. 12500 -> \"12.500\" (id) or \"12,500\" (en).",
    "example": "formatNumber(12500)",
    "props": [],
    "signature": "formatNumber(value: number): string"
  },
  {
    "name": "formatDate",
    "group": "format",
    "kind": "function",
    "id": "Tanggal sesuai bahasa aktif, mis. \"25 Sep 2026\" (id) atau \"Sep 25, 2026\" (en).",
    "en": "Date in the active language, e.g. \"25 Sep 2026\" (id) or \"Sep 25, 2026\" (en).",
    "example": "formatDate(note.createdAt, \"long\")",
    "props": [],
    "signature": "formatDate(value: Date | string | number, style?: \"short\" | \"medium\" | \"long\" | \"full\"): string"
  }
];

export const UI_EXAMPLES: PageExample[] = [
  {
    "name": "landing",
    "title": {
      "id": "Landing page toko kue",
      "en": "Bakery landing page"
    },
    "text": {
      "id": "Halaman depan usaha kecil: navigasi, hero dengan foto, keunggulan, produk unggulan, testimoni, FAQ, ajakan pesan, dan kaki halaman. Tanpa CSS sendiri.",
      "en": "Front page for a small business: navigation, a hero with a photo, benefits, featured products, testimonials, FAQ, a call to order, and a footer. No custom CSS."
    },
    "source": {
      "id": "import { h } from \"zusantara\";\nimport { Button, Columns, Container, CTA, FAQ, FeatureGrid, Footer, Hero, Navbar, page, placeholder, ProductCard, Section, Stack, Testimonial } from \"zusantara/ui\";\n\n// Di aplikasi nyata data ini dari database.\nconst products = [\n  { slug: \"bolu-pandan\", name: \"Bolu pandan\", price: 45000, original: 55000, rating: 4.9, reviews: 212 },\n  { slug: \"brownies-panggang\", name: \"Brownies panggang\", price: 38000, rating: 4.8, reviews: 180 },\n  { slug: \"kue-lapis-legit\", name: \"Kue lapis legit\", price: 120000, rating: 5, reviews: 64 },\n];\n\nexport function GET() {\n  return page(\n    { title: \"Dapur Senja · Kue rumahan di Bandung\", description: \"Kue segar tanpa pengawet, dipanggang setiap pagi dan diantar ke rumah Anda.\" },\n    h(Navbar, {\n      appName: \"Dapur Senja\",\n      links: [\n        { href: \"/\", label: \"Beranda\" },\n        { href: \"/menu\", label: \"Menu\" },\n        { href: \"/tentang\", label: \"Tentang\" },\n      ],\n      active: \"/\",\n      actions: h(Button, { href: \"/pesan\", small: true }, \"Pesan\"),\n    }),\n    h(\n      \"main\",\n      { id: \"konten\" },\n      h(\n        Container,\n        null,\n        h(\n          Stack,\n          { gap: \"xl\" },\n          h(Hero, {\n            eyebrow: \"Kue rumahan di Bandung\",\n            title: \"Kue segar, dipanggang setiap pagi\",\n            text: \"Tanpa pengawet dan pewarna buatan. Pesan sebelum jam 10, kue sampai di rumah Anda sore ini.\",\n            actions: [h(Button, { href: \"/menu\" }, \"Lihat menu\"), h(Button, { href: \"https://wa.me/6281234567890\", variant: \"secondary\" }, \"Tanya lewat WhatsApp\")],\n            image: { src: placeholder(\"Kue cokelat\", 800, 600), alt: \"Kue cokelat dengan taburan kacang di atas meja kayu\" },\n          }),\n          h(FeatureGrid, {\n            title: \"Kenapa Dapur Senja\",\n            features: [\n              { icon: \"🌾\", title: \"Bahan lokal\", text: \"Tepung, telur, dan mentega dari peternak di sekitar Lembang.\" },\n              { icon: \"🚚\", title: \"Antar hari ini\", text: \"Gratis ongkir se-Bandung untuk pesanan di atas Rp150.000.\" },\n              { icon: \"🎂\", title: \"Bisa pesan khusus\", text: \"Tulisan dan hiasan sesuai acara ulang tahun atau arisan.\" },\n            ],\n          }),\n          h(\n            Section,\n            { title: \"Paling dicari minggu ini\", actions: h(Button, { href: \"/menu\", variant: \"secondary\", small: true }, \"Semua menu\") },\n            h(\n              Columns,\n              { cols: 3 },\n              products.map((p) =>\n                h(ProductCard, {\n                  name: p.name,\n                  href: `/menu/${p.slug}`,\n                  image: { src: placeholder(p.name, 600, 600), alt: p.name },\n                  price: p.price,\n                  original: p.original,\n                  rating: p.rating,\n                  reviews: p.reviews,\n                }),\n              ),\n            ),\n          ),\n          h(\n            Section,\n            { title: \"Kata pelanggan\" },\n            h(\n              Columns,\n              { cols: 2 },\n              h(Testimonial, { quote: \"Bolunya lembut dan wangi pandan asli. Anak-anak minta pesan lagi.\", name: \"Rina Wulandari\", role: \"Pelanggan sejak 2024\", rating: 5 }),\n              h(Testimonial, { quote: \"Pesan jam 9, jam 3 sore sudah sampai. Kemasannya rapi untuk hantaran.\", name: \"Budi Santoso\", role: \"Pemesan arisan kantor\", rating: 5 }),\n            ),\n          ),\n          h(FAQ, {\n            title: \"Pertanyaan umum\",\n            items: [\n              { question: \"Berapa lama kue tahan?\", answer: \"Tiga hari di suhu ruang, satu minggu di kulkas.\" },\n              { question: \"Bisa kirim ke luar Bandung?\", answer: \"Untuk kue kering bisa lewat ekspedisi. Kue basah hanya se-Bandung Raya.\" },\n              { question: \"Bagaimana cara bayar?\", answer: \"Transfer bank, QRIS, atau bayar di tempat untuk wilayah Bandung.\" },\n            ],\n          }),\n          h(CTA, {\n            title: \"Ada acara minggu ini?\",\n            text: \"Pesan kue untuk 20 orang atau lebih dan dapatkan potongan 10%.\",\n            actions: h(Button, { href: \"/pesan\" }, \"Pesan sekarang\"),\n          }),\n        ),\n      ),\n    ),\n    h(Footer, {\n      appName: \"Dapur Senja\",\n      columns: [\n        {\n          title: \"Toko\",\n          links: [\n            { href: \"/menu\", label: \"Menu\" },\n            { href: \"/pesan\", label: \"Cara pesan\" },\n          ],\n        },\n        {\n          title: \"Tentang\",\n          links: [\n            { href: \"/tentang\", label: \"Cerita kami\" },\n            { href: \"/kontak\", label: \"Kontak\" },\n          ],\n        },\n      ],\n    }),\n  );\n}\n",
      "en": "import { h } from \"zusantara\";\nimport { Button, Columns, Container, CTA, FAQ, FeatureGrid, Footer, Hero, Navbar, page, placeholder, ProductCard, Section, Stack, Testimonial } from \"zusantara/ui\";\n\n// In a real app this data comes from the database.\nconst products = [\n  { slug: \"pandan-sponge-cake\", name: \"Pandan sponge cake\", price: 12, original: 15, rating: 4.9, reviews: 212 },\n  { slug: \"baked-brownies\", name: \"Baked brownies\", price: 10, rating: 4.8, reviews: 180 },\n  { slug: \"layer-cake\", name: \"Spiced layer cake\", price: 28, rating: 5, reviews: 64 },\n];\n\nexport function GET() {\n  return page(\n    { title: \"Dusk Kitchen · Home bakery\", description: \"Fresh cakes without preservatives, baked every morning and delivered to your door.\" },\n    h(Navbar, {\n      appName: \"Dusk Kitchen\",\n      links: [\n        { href: \"/\", label: \"Home\" },\n        { href: \"/menu\", label: \"Menu\" },\n        { href: \"/about\", label: \"About\" },\n      ],\n      active: \"/\",\n      actions: h(Button, { href: \"/order\", small: true }, \"Order\"),\n    }),\n    h(\n      \"main\",\n      { id: \"konten\" },\n      h(\n        Container,\n        null,\n        h(\n          Stack,\n          { gap: \"xl\" },\n          h(Hero, {\n            eyebrow: \"Home bakery\",\n            title: \"Fresh cakes, baked every morning\",\n            text: \"No preservatives or artificial colouring. Order before 10 am and your cake arrives this afternoon.\",\n            actions: [h(Button, { href: \"/menu\" }, \"See the menu\"), h(Button, { href: \"https://wa.me/6281234567890\", variant: \"secondary\" }, \"Ask on WhatsApp\")],\n            image: { src: placeholder(\"Chocolate cake\", 800, 600), alt: \"Chocolate cake topped with nuts on a wooden table\" },\n          }),\n          h(FeatureGrid, {\n            title: \"Why Dusk Kitchen\",\n            features: [\n              { icon: \"🌾\", title: \"Local ingredients\", text: \"Flour, eggs, and butter from nearby farms.\" },\n              { icon: \"🚚\", title: \"Same-day delivery\", text: \"Free delivery in town for orders over $40.\" },\n              { icon: \"🎂\", title: \"Custom orders\", text: \"Lettering and decoration for birthdays and parties.\" },\n            ],\n          }),\n          h(\n            Section,\n            { title: \"Popular this week\", actions: h(Button, { href: \"/menu\", variant: \"secondary\", small: true }, \"Full menu\") },\n            h(\n              Columns,\n              { cols: 3 },\n              products.map((p) =>\n                h(ProductCard, {\n                  name: p.name,\n                  href: `/menu/${p.slug}`,\n                  image: { src: placeholder(p.name, 600, 600), alt: p.name },\n                  price: p.price,\n                  original: p.original,\n                  rating: p.rating,\n                  reviews: p.reviews,\n                }),\n              ),\n            ),\n          ),\n          h(\n            Section,\n            { title: \"What customers say\" },\n            h(\n              Columns,\n              { cols: 2 },\n              h(Testimonial, { quote: \"Soft sponge with real pandan. The kids keep asking for more.\", name: \"Rina Wulandari\", role: \"Customer since 2024\", rating: 5 }),\n              h(Testimonial, { quote: \"Ordered at 9, it arrived at 3 pm. Neatly packed for gifts.\", name: \"Budi Santoso\", role: \"Office party organiser\", rating: 5 }),\n            ),\n          ),\n          h(FAQ, {\n            title: \"Frequently asked questions\",\n            items: [\n              { question: \"How long do the cakes keep?\", answer: \"Three days at room temperature, one week in the fridge.\" },\n              { question: \"Do you ship out of town?\", answer: \"Cookies ship by courier. Fresh cakes are local delivery only.\" },\n              { question: \"How can I pay?\", answer: \"Bank transfer, QR payment, or cash on delivery in town.\" },\n            ],\n          }),\n          h(CTA, {\n            title: \"Having a party this week?\",\n            text: \"Order cake for 20 people or more and save 10%.\",\n            actions: h(Button, { href: \"/order\" }, \"Order now\"),\n          }),\n        ),\n      ),\n    ),\n    h(Footer, {\n      appName: \"Dusk Kitchen\",\n      columns: [\n        {\n          title: \"Shop\",\n          links: [\n            { href: \"/menu\", label: \"Menu\" },\n            { href: \"/order\", label: \"How to order\" },\n          ],\n        },\n        {\n          title: \"About\",\n          links: [\n            { href: \"/about\", label: \"Our story\" },\n            { href: \"/contact\", label: \"Contact\" },\n          ],\n        },\n      ],\n    }),\n  );\n}\n"
    }
  },
  {
    "name": "profile",
    "title": {
      "id": "Profil usaha dan tim",
      "en": "Business and team profile"
    },
    "text": {
      "id": "Halaman profil perusahaan: hero rata tengah, angka ringkas, tim dengan foto, galeri kantor, logo klien, dan formulir kontak.",
      "en": "Company profile page: a centered hero, key numbers, the team with photos, an office gallery, client logos, and a contact form."
    },
    "source": {
      "id": "import { h } from \"zusantara\";\nimport { Columns, ContactForm, Container, DescriptionList, Footer, Gallery, Hero, LogoCloud, Navbar, page, placeholder, Section, Stack, Split, Stat, StatGroup, TeamCard } from \"zusantara/ui\";\n\nconst team = [\n  { name: \"Sari Dewi\", role: \"Pendiri dan arsitek\", bio: \"15 tahun merancang rumah tropis hemat energi.\", photo: placeholder(\"SD\", 400, 400) },\n  { name: \"Andi Pratama\", role: \"Kepala proyek\", bio: \"Memastikan setiap proyek selesai tepat waktu.\", photo: placeholder(\"AP\", 400, 400) },\n  { name: \"Maya Lestari\", role: \"Desainer interior\", bio: \"Menyukai kayu lokal dan cahaya alami.\", photo: placeholder(\"ML\", 400, 400) },\n];\n\nexport function GET() {\n  return page(\n    { title: \"Studio Ruang · Arsitek rumah tropis\", description: \"Studio arsitektur di Yogyakarta untuk rumah dan kantor tropis hemat energi.\" },\n    h(Navbar, {\n      appName: \"Studio Ruang\",\n      links: [\n        { href: \"/\", label: \"Beranda\" },\n        { href: \"/proyek\", label: \"Proyek\" },\n        { href: \"/tentang\", label: \"Tentang\" },\n        { href: \"#kontak\", label: \"Kontak\" },\n      ],\n      active: \"/tentang\",\n    }),\n    h(\n      \"main\",\n      { id: \"konten\" },\n      h(\n        Container,\n        null,\n        h(\n          Stack,\n          { gap: \"xl\" },\n          h(Hero, {\n            eyebrow: \"Tentang kami\",\n            title: \"Rumah yang sejuk tanpa AC seharian\",\n            text: \"Sejak 2012 kami merancang rumah dan kantor tropis di Yogyakarta: ventilasi silang, atap lebar, dan bahan lokal.\",\n            align: \"center\",\n          }),\n          h(StatGroup, null, h(Stat, { label: \"Proyek selesai\", value: \"140+\" }), h(Stat, { label: \"Kota\", value: 12 }), h(Stat, { label: \"Tahun berdiri\", value: 2012 })),\n          h(\n            Section,\n            { title: \"Tim kami\", description: \"Orang-orang yang akan menemani proyek Anda dari sketsa pertama sampai serah terima.\" },\n            h(\n              Columns,\n              { cols: 3 },\n              team.map((p) => h(TeamCard, p)),\n            ),\n          ),\n          h(\n            Section,\n            { title: \"Studio kami\" },\n            h(Gallery, {\n              images: [\n                { src: placeholder(\"Ruang kerja\", 800, 600), alt: \"Ruang kerja studio dengan meja kayu panjang\", caption: \"Ruang kerja\" },\n                { src: placeholder(\"Maket\", 800, 600), alt: \"Maket rumah dari karton\", caption: \"Maket proyek\" },\n                { src: placeholder(\"Taman\", 800, 600), alt: \"Taman kecil di tengah studio\", caption: \"Taman dalam\" },\n              ],\n            }),\n          ),\n          h(LogoCloud, {\n            title: \"Dipercaya oleh\",\n            logos: [\"Kopi Nusantara\", \"Hotel Senja\", \"Sekolah Alam\"].map((name) => ({ src: placeholder(name, 200, 50), alt: name })),\n          }),\n          h(\n            Section,\n            { title: \"Hubungi kami\", id: \"kontak\", description: \"Ceritakan rencana Anda. Kami membalas dalam satu hari kerja.\" },\n            h(\n              Split,\n              null,\n              h(ContactForm, { action: \"/kontak\", whatsapp: \"081234567890\" }),\n              h(DescriptionList, {\n                items: [\n                  { label: \"Alamat\", value: \"Jl. Kaliurang km 5, Yogyakarta\" },\n                  { label: \"Jam kerja\", value: \"Senin sampai Jumat, 09.00 sampai 17.00\" },\n                  { label: \"Email\", value: h(\"a\", { href: \"mailto:halo@studioruang.id\" }, \"halo@studioruang.id\") },\n                ],\n              }),\n            ),\n          ),\n        ),\n      ),\n    ),\n    h(Footer, {\n      appName: \"Studio Ruang\",\n      links: [\n        { href: \"/proyek\", label: \"Proyek\" },\n        { href: \"#kontak\", label: \"Kontak\" },\n      ],\n    }),\n  );\n}\n",
      "en": "import { h } from \"zusantara\";\nimport { Columns, ContactForm, Container, DescriptionList, Footer, Gallery, Hero, LogoCloud, Navbar, page, placeholder, Section, Stack, Split, Stat, StatGroup, TeamCard } from \"zusantara/ui\";\n\nconst team = [\n  { name: \"Sari Dewi\", role: \"Founder and architect\", bio: \"15 years designing energy-saving tropical homes.\", photo: placeholder(\"SD\", 400, 400) },\n  { name: \"Andi Pratama\", role: \"Project lead\", bio: \"Makes sure every project finishes on time.\", photo: placeholder(\"AP\", 400, 400) },\n  { name: \"Maya Lestari\", role: \"Interior designer\", bio: \"Loves local timber and natural light.\", photo: placeholder(\"ML\", 400, 400) },\n];\n\nexport function GET() {\n  return page(\n    { title: \"Room Studio · Tropical home architects\", description: \"An architecture studio designing energy-saving tropical homes and offices.\" },\n    h(Navbar, {\n      appName: \"Room Studio\",\n      links: [\n        { href: \"/\", label: \"Home\" },\n        { href: \"/projects\", label: \"Projects\" },\n        { href: \"/about\", label: \"About\" },\n        { href: \"#contact\", label: \"Contact\" },\n      ],\n      active: \"/about\",\n    }),\n    h(\n      \"main\",\n      { id: \"konten\" },\n      h(\n        Container,\n        null,\n        h(\n          Stack,\n          { gap: \"xl\" },\n          h(Hero, {\n            eyebrow: \"About us\",\n            title: \"Homes that stay cool without air conditioning\",\n            text: \"Since 2012 we have designed tropical homes and offices: cross ventilation, wide roofs, and local materials.\",\n            align: \"center\",\n          }),\n          h(StatGroup, null, h(Stat, { label: \"Projects finished\", value: \"140+\" }), h(Stat, { label: \"Cities\", value: 12 }), h(Stat, { label: \"Founded\", value: 2012 })),\n          h(\n            Section,\n            { title: \"Our team\", description: \"The people who will stay with your project from the first sketch to handover.\" },\n            h(\n              Columns,\n              { cols: 3 },\n              team.map((p) => h(TeamCard, p)),\n            ),\n          ),\n          h(\n            Section,\n            { title: \"Our studio\" },\n            h(Gallery, {\n              images: [\n                { src: placeholder(\"Workspace\", 800, 600), alt: \"Studio workspace with a long wooden table\", caption: \"Workspace\" },\n                { src: placeholder(\"Model\", 800, 600), alt: \"Cardboard model of a house\", caption: \"Project model\" },\n                { src: placeholder(\"Garden\", 800, 600), alt: \"Small garden in the middle of the studio\", caption: \"Inner garden\" },\n              ],\n            }),\n          ),\n          h(LogoCloud, {\n            title: \"Trusted by\",\n            logos: [\"Island Coffee\", \"Dusk Hotel\", \"Nature School\"].map((name) => ({ src: placeholder(name, 200, 50), alt: name })),\n          }),\n          h(\n            Section,\n            { title: \"Contact us\", id: \"contact\", description: \"Tell us about your plans. We reply within one working day.\" },\n            h(\n              Split,\n              null,\n              h(ContactForm, { action: \"/contact\", whatsapp: \"081234567890\" }),\n              h(DescriptionList, {\n                items: [\n                  { label: \"Address\", value: \"5 Kaliurang Road, Yogyakarta\" },\n                  { label: \"Hours\", value: \"Monday to Friday, 9 am to 5 pm\" },\n                  { label: \"Email\", value: h(\"a\", { href: \"mailto:hello@roomstudio.id\" }, \"hello@roomstudio.id\") },\n                ],\n              }),\n            ),\n          ),\n        ),\n      ),\n    ),\n    h(Footer, {\n      appName: \"Room Studio\",\n      links: [\n        { href: \"/projects\", label: \"Projects\" },\n        { href: \"#contact\", label: \"Contact\" },\n      ],\n    }),\n  );\n}\n"
    }
  },
  {
    "name": "store",
    "title": {
      "id": "Toko online dengan keranjang",
      "en": "Online store with a cart"
    },
    "text": {
      "id": "Katalog toko: kategori sebagai tab, kartu produk dengan tombol tambah, ringkasan keranjang di samping, dan nomor halaman. Harga dalam rupiah.",
      "en": "Store catalog: categories as tabs, product cards with an add button, a cart summary beside them, and page numbers."
    },
    "source": {
      "id": "import { h } from \"zusantara\";\nimport { Button, CartSummary, Columns, Container, Footer, Form, Navbar, page, PageHeader, Pagination, placeholder, ProductCard, QuantityInput, Split, Stack, Tabs } from \"zusantara/ui\";\n\n// Di aplikasi nyata: produk dari database, keranjang dari session, halaman dari ctx.query.\nconst products = [\n  { id: 1, slug: \"kopi-gayo\", name: \"Kopi Gayo 250 g\", price: 85000, original: 95000, rating: 4.9, reviews: 320 },\n  { id: 2, slug: \"kopi-toraja\", name: \"Kopi Toraja 250 g\", price: 90000, rating: 4.8, reviews: 210 },\n  { id: 3, slug: \"kopi-kintamani\", name: \"Kopi Kintamani 250 g\", price: 80000, rating: 4.7, reviews: 150, soldOut: true },\n  { id: 4, slug: \"drip-bag\", name: \"Drip bag isi 10\", price: 45000, rating: 4.6, reviews: 98 },\n];\nconst cart = [\n  { name: \"Kopi Gayo 250 g\", price: 85000, qty: 2, note: \"Giling kasar\" },\n  { name: \"Drip bag isi 10\", price: 45000, qty: 1 },\n];\n\nexport function GET() {\n  return page(\n    { title: \"Kopi · Toko Tanah Air\" },\n    h(Navbar, {\n      appName: \"Toko Tanah Air\",\n      links: [\n        { href: \"/produk\", label: \"Produk\" },\n        { href: \"/pesanan\", label: \"Pesanan saya\" },\n      ],\n      active: \"/produk\",\n      actions: h(Button, { href: \"/keranjang\", small: true, variant: \"secondary\" }, `Keranjang (${cart.length})`),\n    }),\n    h(\n      Container,\n      { pad: true },\n      h(\n        \"main\",\n        { id: \"konten\" },\n        h(\n          Stack,\n          { gap: \"lg\" },\n          h(PageHeader, { title: \"Kopi\", description: \"Biji kopi dari petani Nusantara, disangrai setiap Senin.\", breadcrumb: [{ label: \"Beranda\", href: \"/\" }, { label: \"Kopi\" }] }),\n          h(Tabs, {\n            items: [\n              { href: \"/produk?kategori=kopi\", label: \"Kopi\", count: 12 },\n              { href: \"/produk?kategori=teh\", label: \"Teh\", count: 8 },\n              { href: \"/produk?kategori=alat\", label: \"Alat seduh\", count: 5 },\n            ],\n            active: \"/produk?kategori=kopi\",\n          }),\n          h(\n            Split,\n            null,\n            h(\n              Stack,\n              { gap: \"lg\" },\n              h(\n                Columns,\n                { cols: 2 },\n                products.map((p) =>\n                  h(ProductCard, {\n                    name: p.name,\n                    href: `/produk/${p.slug}`,\n                    image: { src: placeholder(p.name, 600, 600), alt: p.name },\n                    price: p.price,\n                    original: p.original,\n                    rating: p.rating,\n                    reviews: p.reviews,\n                    soldOut: p.soldOut,\n                    action: h(\n                      Form,\n                      { action: `/keranjang/${p.id}` },\n                      h(QuantityInput, { name: \"qty\", value: 1, max: 20, hideLabel: true }),\n                      h(Button, { small: true, loading: \"Menambah…\" }, \"Tambah\"),\n                    ),\n                  }),\n                ),\n              ),\n              h(Pagination, { page: 1, pages: 3, href: \"/produk?kategori=kopi&halaman={page}\" }),\n            ),\n            h(CartSummary, { items: cart, shipping: 0, discount: 10000, action: h(Button, { href: \"/bayar\", block: true }, \"Lanjut bayar\") }),\n          ),\n        ),\n      ),\n    ),\n    h(Footer, { appName: \"Toko Tanah Air\" }),\n  );\n}\n",
      "en": "import { h } from \"zusantara\";\nimport { Button, CartSummary, Columns, Container, Footer, Form, Navbar, page, PageHeader, Pagination, placeholder, ProductCard, QuantityInput, Split, Stack, Tabs } from \"zusantara/ui\";\n\n// In a real app: products from the database, the cart from the session, the page from ctx.query.\nconst products = [\n  { id: 1, slug: \"gayo-coffee\", name: \"Gayo coffee 250 g\", price: 18, original: 21, rating: 4.9, reviews: 320 },\n  { id: 2, slug: \"toraja-coffee\", name: \"Toraja coffee 250 g\", price: 19.5, rating: 4.8, reviews: 210 },\n  { id: 3, slug: \"kintamani-coffee\", name: \"Kintamani coffee 250 g\", price: 17, rating: 4.7, reviews: 150, soldOut: true },\n  { id: 4, slug: \"drip-bags\", name: \"Drip bags, pack of 10\", price: 9.5, rating: 4.6, reviews: 98 },\n];\nconst cart = [\n  { name: \"Gayo coffee 250 g\", price: 18, qty: 2, note: \"Coarse grind\" },\n  { name: \"Drip bags, pack of 10\", price: 9.5, qty: 1 },\n];\n\nexport function GET() {\n  return page(\n    { title: \"Coffee · Homeland Store\" },\n    h(Navbar, {\n      appName: \"Homeland Store\",\n      links: [\n        { href: \"/products\", label: \"Products\" },\n        { href: \"/orders\", label: \"My orders\" },\n      ],\n      active: \"/products\",\n      actions: h(Button, { href: \"/cart\", small: true, variant: \"secondary\" }, `Cart (${cart.length})`),\n    }),\n    h(\n      Container,\n      { pad: true },\n      h(\n        \"main\",\n        { id: \"konten\" },\n        h(\n          Stack,\n          { gap: \"lg\" },\n          h(PageHeader, { title: \"Coffee\", description: \"Beans from Indonesian farmers, roasted every Monday.\", breadcrumb: [{ label: \"Home\", href: \"/\" }, { label: \"Coffee\" }] }),\n          h(Tabs, {\n            items: [\n              { href: \"/products?category=coffee\", label: \"Coffee\", count: 12 },\n              { href: \"/products?category=tea\", label: \"Tea\", count: 8 },\n              { href: \"/products?category=gear\", label: \"Brewing gear\", count: 5 },\n            ],\n            active: \"/products?category=coffee\",\n          }),\n          h(\n            Split,\n            null,\n            h(\n              Stack,\n              { gap: \"lg\" },\n              h(\n                Columns,\n                { cols: 2 },\n                products.map((p) =>\n                  h(ProductCard, {\n                    name: p.name,\n                    href: `/products/${p.slug}`,\n                    image: { src: placeholder(p.name, 600, 600), alt: p.name },\n                    price: p.price,\n                    original: p.original,\n                    rating: p.rating,\n                    reviews: p.reviews,\n                    soldOut: p.soldOut,\n                    action: h(Form, { action: `/cart/${p.id}` }, h(QuantityInput, { name: \"qty\", value: 1, max: 20, hideLabel: true }), h(Button, { small: true, loading: \"Adding…\" }, \"Add\")),\n                  }),\n                ),\n              ),\n              h(Pagination, { page: 1, pages: 3, href: \"/products?category=coffee&page={page}\" }),\n            ),\n            h(CartSummary, { items: cart, shipping: 0, discount: 2, action: h(Button, { href: \"/checkout\", block: true }, \"Checkout\") }),\n          ),\n        ),\n      ),\n    ),\n    h(Footer, { appName: \"Homeland Store\" }),\n  );\n}\n"
    }
  },
  {
    "name": "booking",
    "title": {
      "id": "Jadwal booking",
      "en": "Booking schedule"
    },
    "text": {
      "id": "Halaman booking layanan: langkah pemesanan, kalender jadwal yang sudah terisi (daftar di ponsel), dan formulir pilih tanggal, jam, dan layanan.",
      "en": "Service booking page: booking steps, a calendar of taken slots (a list on phones), and a form to pick the date, time, and service."
    },
    "source": {
      "id": "import { h } from \"zusantara\";\nimport { Alert, Button, Calendar, Card, Container, Field, Footer, Form, FormActions, FormRow, Navbar, page, PageHeader, Select, Split, Stack, Steps } from \"zusantara/ui\";\n\n// Di aplikasi nyata: booking dari database untuk bulan yang diminta (ctx.query.bulan).\nconst month = \"2026-10\";\nconst bookings = [\n  { date: \"2026-10-05\", time: \"10.00\", title: \"Potong rambut\" },\n  { date: \"2026-10-05\", time: \"13.00\", title: \"Creambath\" },\n  { date: \"2026-10-12\", time: \"09.00\", title: \"Potong rambut\" },\n  { date: \"2026-10-19\", time: \"15.00\", title: \"Pewarnaan\" },\n];\n\nexport function GET() {\n  return page(\n    { title: \"Booking · Salon Melati\" },\n    h(Navbar, {\n      appName: \"Salon Melati\",\n      links: [\n        { href: \"/\", label: \"Beranda\" },\n        { href: \"/layanan\", label: \"Layanan\" },\n        { href: \"/booking\", label: \"Booking\" },\n      ],\n      active: \"/booking\",\n    }),\n    h(\n      Container,\n      { pad: true },\n      h(\n        \"main\",\n        { id: \"konten\" },\n        h(\n          Stack,\n          { gap: \"lg\" },\n          h(PageHeader, { title: \"Booking jadwal\", description: \"Pilih tanggal dan jam yang masih kosong. Kami konfirmasi lewat WhatsApp.\" }),\n          h(Steps, { steps: [\"Pilih jadwal\", \"Isi data\", \"Konfirmasi\"], current: 1 }),\n          h(\n            Split,\n            null,\n            h(Calendar, { month, events: bookings, href: \"/booking?bulan={month}\", today: \"2026-10-01\" }),\n            h(\n              Card,\n              { title: \"Jadwal baru\" },\n              h(\n                Form,\n                { action: \"/booking\" },\n                h(\n                  Stack,\n                  null,\n                  h(Alert, null, \"Jam yang sudah terisi tampil di kalender.\"),\n                  h(Select, {\n                    name: \"layanan\",\n                    label: \"Layanan\",\n                    placeholder: \"Pilih layanan\",\n                    options: [\n                      { value: \"potong\", label: \"Potong rambut (45 menit)\" },\n                      { value: \"creambath\", label: \"Creambath (60 menit)\" },\n                      { value: \"warna\", label: \"Pewarnaan (120 menit)\" },\n                    ],\n                    required: true,\n                  }),\n                  h(\n                    FormRow,\n                    null,\n                    h(Field, { name: \"tanggal\", label: \"Tanggal\", type: \"date\", min: \"2026-10-01\", required: true }),\n                    h(Field, { name: \"jam\", label: \"Jam\", type: \"time\", min: \"09:00\", max: \"17:00\", step: 1800, required: true }),\n                  ),\n                  h(Field, { name: \"nama\", label: \"Nama\", autocomplete: \"name\", required: true }),\n                  h(Field, { name: \"telepon\", label: \"Nomor WhatsApp\", type: \"tel\", autocomplete: \"tel\", inputmode: \"tel\", required: true }),\n                  h(FormActions, null, h(Button, { loading: \"Menyimpan…\" }, \"Lanjut\")),\n                ),\n              ),\n            ),\n          ),\n        ),\n      ),\n    ),\n    h(Footer, { appName: \"Salon Melati\" }),\n  );\n}\n",
      "en": "import { h } from \"zusantara\";\nimport { Alert, Button, Calendar, Card, Container, Field, Footer, Form, FormActions, FormRow, Navbar, page, PageHeader, Select, Split, Stack, Steps } from \"zusantara/ui\";\n\n// In a real app: bookings from the database for the requested month (ctx.query.month).\nconst month = \"2026-10\";\nconst bookings = [\n  { date: \"2026-10-05\", time: \"10:00\", title: \"Haircut\" },\n  { date: \"2026-10-05\", time: \"13:00\", title: \"Hair spa\" },\n  { date: \"2026-10-12\", time: \"09:00\", title: \"Haircut\" },\n  { date: \"2026-10-19\", time: \"15:00\", title: \"Colouring\" },\n];\n\nexport function GET() {\n  return page(\n    { title: \"Booking · Jasmine Salon\" },\n    h(Navbar, {\n      appName: \"Jasmine Salon\",\n      links: [\n        { href: \"/\", label: \"Home\" },\n        { href: \"/services\", label: \"Services\" },\n        { href: \"/booking\", label: \"Booking\" },\n      ],\n      active: \"/booking\",\n    }),\n    h(\n      Container,\n      { pad: true },\n      h(\n        \"main\",\n        { id: \"konten\" },\n        h(\n          Stack,\n          { gap: \"lg\" },\n          h(PageHeader, { title: \"Book an appointment\", description: \"Pick a free date and time. We confirm on WhatsApp.\" }),\n          h(Steps, { steps: [\"Pick a time\", \"Your details\", \"Confirmation\"], current: 1 }),\n          h(\n            Split,\n            null,\n            h(Calendar, { month, events: bookings, href: \"/booking?month={month}\", today: \"2026-10-01\" }),\n            h(\n              Card,\n              { title: \"New booking\" },\n              h(\n                Form,\n                { action: \"/booking\" },\n                h(\n                  Stack,\n                  null,\n                  h(Alert, null, \"Taken slots are shown on the calendar.\"),\n                  h(Select, {\n                    name: \"service\",\n                    label: \"Service\",\n                    placeholder: \"Choose a service\",\n                    options: [\n                      { value: \"haircut\", label: \"Haircut (45 minutes)\" },\n                      { value: \"spa\", label: \"Hair spa (60 minutes)\" },\n                      { value: \"colour\", label: \"Colouring (120 minutes)\" },\n                    ],\n                    required: true,\n                  }),\n                  h(\n                    FormRow,\n                    null,\n                    h(Field, { name: \"date\", label: \"Date\", type: \"date\", min: \"2026-10-01\", required: true }),\n                    h(Field, { name: \"time\", label: \"Time\", type: \"time\", min: \"09:00\", max: \"17:00\", step: 1800, required: true }),\n                  ),\n                  h(Field, { name: \"name\", label: \"Name\", autocomplete: \"name\", required: true }),\n                  h(Field, { name: \"phone\", label: \"WhatsApp number\", type: \"tel\", autocomplete: \"tel\", inputmode: \"tel\", required: true }),\n                  h(FormActions, null, h(Button, { loading: \"Saving…\" }, \"Continue\")),\n                ),\n              ),\n            ),\n          ),\n        ),\n      ),\n    ),\n    h(Footer, { appName: \"Jasmine Salon\" }),\n  );\n}\n"
    }
  },
  {
    "name": "dashboard",
    "title": {
      "id": "Dasbor admin",
      "en": "Admin dashboard"
    },
    "text": {
      "id": "Halaman setelah login: kerangka AppShell, angka ringkas dengan tren, tabel pesanan terbaru dengan status, dan riwayat aktivitas.",
      "en": "Signed-in page: the AppShell frame, key numbers with trends, a table of recent orders with their status, and an activity history."
    },
    "source": {
      "id": "import { h } from \"zusantara\";\nimport { AppShell, Badge, Button, Card, page, rupiah, Split, Stat, StatGroup, Table, Timeline } from \"zusantara/ui\";\n\n// Di aplikasi nyata: angka dan pesanan dari database, user dari ctx.state.user.\nconst orders = [\n  { code: \"INV-1042\", customer: \"Rina Wulandari\", total: 128000, status: \"Lunas\" },\n  { code: \"INV-1041\", customer: \"Budi Santoso\", total: 90000, status: \"Menunggu\" },\n  { code: \"INV-1040\", customer: \"Maya Lestari\", total: 245000, status: \"Dikirim\" },\n];\nconst tone = { Lunas: \"ok\", Menunggu: \"warn\", Dikirim: \"accent\" } as const;\n\nexport function GET() {\n  return page(\n    { title: \"Dasbor · Toko Tanah Air\" },\n    h(\n      AppShell,\n      {\n        appName: \"Toko Tanah Air\",\n        nav: [\n          { href: \"/admin\", label: \"Dasbor\" },\n          { href: \"/admin/pesanan\", label: \"Pesanan\" },\n          { href: \"/admin/produk\", label: \"Produk\" },\n          { href: \"/admin/pengaturan\", label: \"Pengaturan\", section: \"Akun\" },\n        ],\n        active: \"/admin\",\n        user: { name: \"Sari Dewi\", email: \"sari@tanahair.id\" },\n        title: \"Dasbor\",\n        subtitle: \"Ringkasan toko hari ini\",\n        actions: h(Button, { href: \"/admin/produk/baru\", small: true }, \"Tambah produk\"),\n      },\n      h(\n        StatGroup,\n        null,\n        h(Stat, { label: \"Pendapatan bulan ini\", value: rupiah(12500000), trend: \"up\", change: \"12%\", hint: \"dari bulan lalu\" }),\n        h(Stat, { label: \"Pesanan baru\", value: 42, trend: \"up\", change: \"8\" }),\n        h(Stat, { label: \"Keluhan\", value: 3, trend: \"down\", change: \"2\", good: \"down\" }),\n      ),\n      h(\n        Split,\n        null,\n        h(\n          Card,\n          { title: \"Pesanan terbaru\", flush: true, actions: h(Button, { href: \"/admin/pesanan\", variant: \"secondary\", small: true }, \"Semua\") },\n          h(Table, {\n            columns: [{ label: \"Kode\" }, { label: \"Pelanggan\" }, { label: \"Total\", align: \"num\" }, { label: \"Status\" }],\n            rows: orders.map((o) => [h(\"a\", { href: `/admin/pesanan/${o.code}` }, o.code), o.customer, rupiah(o.total), h(Badge, { tone: tone[o.status as keyof typeof tone] }, o.status)]),\n          }),\n        ),\n        h(\n          Card,\n          { title: \"Aktivitas\" },\n          h(Timeline, {\n            items: [\n              { title: \"INV-1042 dibayar\", time: \"10.24\", tone: \"ok\" },\n              { title: \"Stok Kopi Kintamani habis\", time: \"09.10\", tone: \"warn\" },\n              { title: \"INV-1040 dikirim\", text: \"JNE 0123456789\", time: \"08.02\" },\n            ],\n          }),\n        ),\n      ),\n    ),\n  );\n}\n",
      "en": "import { h } from \"zusantara\";\nimport { AppShell, Badge, Button, Card, money, page, Split, Stat, StatGroup, Table, Timeline } from \"zusantara/ui\";\n\n// In a real app: numbers and orders from the database, the user from ctx.state.user.\nconst orders = [\n  { code: \"INV-1042\", customer: \"Rina Wulandari\", total: 34, status: \"Paid\" },\n  { code: \"INV-1041\", customer: \"Budi Santoso\", total: 19.5, status: \"Pending\" },\n  { code: \"INV-1040\", customer: \"Maya Lestari\", total: 62, status: \"Shipped\" },\n];\nconst tone = { Paid: \"ok\", Pending: \"warn\", Shipped: \"accent\" } as const;\n\nexport function GET() {\n  return page(\n    { title: \"Dashboard · Homeland Store\" },\n    h(\n      AppShell,\n      {\n        appName: \"Homeland Store\",\n        nav: [\n          { href: \"/admin\", label: \"Dashboard\" },\n          { href: \"/admin/orders\", label: \"Orders\" },\n          { href: \"/admin/products\", label: \"Products\" },\n          { href: \"/admin/settings\", label: \"Settings\", section: \"Account\" },\n        ],\n        active: \"/admin\",\n        user: { name: \"Sari Dewi\", email: \"sari@homeland.id\" },\n        title: \"Dashboard\",\n        subtitle: \"Today's store summary\",\n        actions: h(Button, { href: \"/admin/products/new\", small: true }, \"Add product\"),\n      },\n      h(\n        StatGroup,\n        null,\n        h(Stat, { label: \"Revenue this month\", value: money(3250), trend: \"up\", change: \"12%\", hint: \"vs last month\" }),\n        h(Stat, { label: \"New orders\", value: 42, trend: \"up\", change: \"8\" }),\n        h(Stat, { label: \"Complaints\", value: 3, trend: \"down\", change: \"2\", good: \"down\" }),\n      ),\n      h(\n        Split,\n        null,\n        h(\n          Card,\n          { title: \"Latest orders\", flush: true, actions: h(Button, { href: \"/admin/orders\", variant: \"secondary\", small: true }, \"All\") },\n          h(Table, {\n            columns: [{ label: \"Code\" }, { label: \"Customer\" }, { label: \"Total\", align: \"num\" }, { label: \"Status\" }],\n            rows: orders.map((o) => [h(\"a\", { href: `/admin/orders/${o.code}` }, o.code), o.customer, money(o.total), h(Badge, { tone: tone[o.status as keyof typeof tone] }, o.status)]),\n          }),\n        ),\n        h(\n          Card,\n          { title: \"Activity\" },\n          h(Timeline, {\n            items: [\n              { title: \"INV-1042 paid\", time: \"10:24\", tone: \"ok\" },\n              { title: \"Kintamani coffee sold out\", time: \"09:10\", tone: \"warn\" },\n              { title: \"INV-1040 shipped\", text: \"Tracking 0123456789\", time: \"08:02\" },\n            ],\n          }),\n        ),\n      ),\n    ),\n  );\n}\n"
    }
  }
];
