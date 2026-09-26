// Dibuat otomatis oleh scripts/ui-catalog.mjs dari JSDoc di src/ui. Jangan diubah manual:
// ubah JSDoc komponennya, lalu jalankan `node scripts/ui-catalog.mjs` di packages/zentara.
import type { CatalogEntry } from "./catalog.js";

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
    "example": "h(CodeBlock, { title: \"Terminal\", code: \"npx zentara dev\" })",
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
