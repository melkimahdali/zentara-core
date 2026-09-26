---
title: Kit UI (zusantara/ui)
order: 1
group: Front-End
description: Komponen HTML bergaya brand Zusantara untuk halaman login, dasbor, dan admin.
---

# Kit UI (zusantara/ui)

`zusantara/ui` berisi komponen HTML server-side yang siap pakai. Tampilannya mengikuti brand Zusantara Core: font Plus Jakarta Sans, satu warna aksen teal (emas hanya di logo), mode gelap/terang mengikuti sistem, dan responsif di layar ponsel. Tanpa build step, dan semua teks di-escape otomatis.

```ts
import { h, type ZenContext } from "zusantara";
import { AuthCard, Button, Field, Form, page } from "zusantara/ui";

export function GET(ctx: ZenContext) {
  return page(
    { title: "Masuk" },
    h(AuthCard, { title: "Masuk", subtitle: "Selamat datang kembali" },
      h(Form, { action: "/login" },
        h(Field, { name: "email", label: "Email", type: "email", required: true }),
        h(Field, { name: "password", label: "Password", type: "password", required: true }),
        h(Button, { block: true }, "Masuk"),
      ),
    ),
  );
}
```

`page()` menghasilkan dokumen HTML lengkap yang memuat stylesheet `/_zusantara/ui.css`. Stylesheet itu, beserta logo (`/_zusantara/logo.webp`), favicon, dan font, disajikan langsung oleh framework, jadi tidak perlu disalin ke `public/`.

Setiap halaman dari `page()` juga sudah punya:

- **Font Plus Jakarta Sans yang di-host sendiri** di `/_zusantara/fonts/` (subset latin dan latin-ext, lisensi SIL OFL di `/_zusantara/fonts/LICENSE.txt`). Tidak ada permintaan ke Google Fonts atau CDN lain.
- **Teks bawaan mengikuti bahasa aktif** (`id` atau `en`), atau `page({ lang })` untuk satu halaman. Lihat [Bahasa](bahasa.html).
- **Tautan "Lewati ke konten"** untuk pengguna keyboard, menuju elemen `#konten`.
- **Status memuat pada formulir.** Saat formulir dikirim, tombolnya dinonaktifkan dan diberi `aria-busy`, sehingga tidak terkirim dua kali. Jika tombol punya `loading`, teksnya berganti, mis. `h(Button, { loading: "Menyimpan…" }, "Simpan")`. Skrip kecil ini bisa dimatikan dengan `page({ title, script: false })`; halaman tetap berfungsi tanpanya.
- Animasi masuk yang halus, otomatis mati untuk pengguna yang memilih *reduced motion*.

## Komponen

| Komponen | Kegunaan |
|---|---|
| `page(options, ...body)` | dokumen HTML lengkap: `title`, `description`, `lang`, `head` tambahan, `script` |
| `AuthCard` | halaman masuk dan daftar: `title`, `subtitle`, `footer`, `appName`. Dengan `aside: { title, text }`, layar dibagi dua: panel brand di kiri, formulir di kanan (menumpuk di ponsel) |
| `AppShell` | kerangka aplikasi dengan navigasi atas: logo, menu (`nav`, `active`, pemisah lewat `section`), user dan tombol *Keluar* (POST ke `/logout`), judul, `subtitle`, `actions` |
| `StatGroup` · `Stat` | strip angka ringkasan dengan pemisah tipis (bukan deretan kartu kembar); `trend: "up"` dan `change: "12%"` menampilkan perubahan berwarna |
| `Container` · `Stack` · `Row` · `Cluster` · `Columns` | tata letak tanpa CSS: lebar konten, tumpukan vertikal, baris mendatar, kumpulan item kecil, dan kolom sama lebar yang menumpuk di ponsel. Jarak lewat `gap` (`none`, `xs`, `sm`, `md`, `lg`, `xl`), perataan lewat `align` dan `justify` |
| `PageHeader` · `Section` · `Divider` | kepala halaman (breadcrumb, judul, deskripsi, tombol aksi), bagian berjudul tanpa kotak, dan garis pemisah (opsional dengan teks, mis. "atau") |
| `Card` · `Split` · `Grid` | kartu berjudul, tata letak dua kolom 2:1 (isi utama dan panel samping), dan grid responsif |
| `Form` · `FormRow` · `Field` · `FormActions` | formulir POST (`upload: true` untuk unggah file), baris beberapa field, input berlabel dengan `error`, `hint`, `inputmode`, awalan/akhiran (`prefix: "Rp"`), tombol *Tampilkan* pada password, dan tipe `date`, `time`, `datetime-local`, `month`, `range`, `color` (password tidak pernah diisi ulang), serta baris tombol di akhir formulir |
| `Select` · `Checkbox` · `CheckboxGroup` · `RadioGroup` · `Switch` | daftar pilihan (dengan kelompok dan `placeholder`), satu kotak centang, beberapa kotak centang, pilih satu, dan sakelar nyala/mati |
| `FileInput` · `Fieldset` | unggah file dengan petunjuk otomatis dari `types` dan `maxBytes` (sama dengan `saveUpload`) serta pratinjau gambar, dan kelompok field berjudul |
| `Button` · `PostButton` | tombol atau tautan bergaya tombol (`loading` untuk teks saat mengirim), dan tombol yang mengirim POST dengan konfirmasi (mis. hapus) |
| `Search` · `Disclosure` | kolom cari (GET, `?q=`, dengan tautan *Hapus*), dan bagian buka-tutup tanpa JavaScript, mis. formulir tambah data |
| `Alert` · `Badge` | pesan (`info`, `success`, `error`, `warn`) dan label kecil bersudut (`accent`, `ok`, `warn`, `danger`) |
| `Table` · `List` · `EmptyState` | tabel data (kolom `align: "num"` untuk angka, `"end"` untuk rata kanan), daftar ringkas dua sisi, dan tampilan saat data kosong dengan saran langkah berikutnya |
| `Avatar` · `Brand` | inisial nama dan logo dengan nama aplikasi |
| `Navbar` · `Footer` · `BottomNav` | bilah atas halaman publik (tautan dan tombol pindah ke menu *Menu* di ponsel, tanpa JavaScript), kaki halaman dengan kolom tautan, dan navigasi bawah khusus ponsel |
| `Breadcrumb` · `Tabs` · `Pagination` · `Steps` | jejak lokasi halaman, tab berupa tautan (`?tab=…`, dengan `count`), nomor halaman (`href: "?page={page}"`, di ponsel ringkas), dan langkah proses (`current` mulai dari 1) |
| `DropdownMenu` | tombol yang membuka daftar aksi: tautan, atau POST (`action`) untuk aksi seperti hapus |
| `Dialog` · `ConfirmDialog` · `Drawer` · `Sheet` | dialog di tengah layar, dialog konfirmasi yang mengirim POST, laci dari samping (`side`), dan lembar dari bawah. Dibuka dengan `trigger: "Label"` atau `h(Button, { opens: id })`, memakai atribut `popover` bawaan browser, jadi Esc dan klik di luar menutupnya tanpa JavaScript |
| `Popover` · `Tooltip` | kotak kecil di bawah tombolnya, dan keterangan saat disentuh kursor atau difokus keyboard |
| `Toast` · `flash()` · `takeFlash()` | pesan melayang yang hilang sendiri, termasuk pesan satu kali setelah redirect (lihat di bawah) |
| `Progress` · `Spinner` · `Skeleton` | bilah kemajuan (tanpa `value` = sedang berjalan), indikator memuat, dan kerangka isi yang sedang dimuat |
| `DescriptionList` · `Timeline` · `Accordion` | detail satu data (label dan nilai), urutan kejadian, dan bagian buka-tutup (`single: true` = satu terbuka) |
| `Tag` · `AvatarGroup` · `Rating` · `CodeBlock` | label kategori berbentuk pil (bisa tautan), deretan avatar dengan "+N", rating bintang (tampilan, atau input dengan `name`), dan blok kode dengan tombol *Salin* |
| `Calendar` | kalender satu bulan dengan acara (booking, jadwal); `href: "/jadwal?bulan={month}"` untuk bulan sebelumnya dan berikutnya, di ponsel menjadi daftar |
| `Hero` · `FeatureGrid` · `CTA` | pembuka halaman publik (judul besar, teks, tombol, foto di samping atau rata tengah), grid keunggulan dengan ikon, dan pita ajakan bertindak |
| `MediaCard` · `Gallery` · `LogoCloud` | kartu bergambar (artikel, layanan; seluruh kartu bisa diklik lewat `href`), galeri foto dengan rasio seragam, dan deretan logo mitra |
| `Pricing` · `Testimonial` · `FAQ` | harga paket berdampingan (`featured` = paket yang disorot, harga angka lewat `money()`), kutipan pelanggan dengan rating, dan pertanyaan umum buka-tutup plus data terstruktur FAQPage untuk mesin pencari |
| `TeamCard` · `ContactForm` | kartu anggota tim (foto atau inisial), dan formulir kontak siap pakai dengan `values`, `errors`, dan tautan WhatsApp (`whatsapp: "0812…"`) |
| `PriceTag` · `ProductCard` | harga dengan harga coret dan periode, dan kartu produk (foto, harga, label hemat otomatis, rating, stok habis, tombol aksi) |
| `QuantityInput` · `CartSummary` | input jumlah dengan tombol − dan + (tanpa JavaScript tetap input angka), dan ringkasan keranjang (jumlah × harga, subtotal, ongkir, potongan, total) |
| `placeholder()` | URL gambar contoh bawaan `/_zusantara/placeholder.svg` untuk purwarupa sebelum foto asli ada |
| `StatusPage` · `statusPage()` | halaman status (403, 404, 500, …) bertema aplikasi. Framework memakainya sendiri untuk error di produksi |
| `money()` · `formatNumber()` · `formatDate()` · `rupiah()` | format uang, angka, dan tanggal sesuai [bahasa](bahasa.html) aktif; `rupiah(45000)` selalu `Rp45.000` |

## Tata letak tanpa CSS

Susun halaman dengan primitif tata letak. Jarak dan perataan diatur lewat prop bernilai terbatas, jadi tampilan tetap rapi di desktop dan ponsel tanpa menulis CSS:

```ts
page(
  { title: "Produk" },
  h(Container, { pad: true },
    h(PageHeader, {
      title: "Produk",
      description: "Kelola katalog toko",
      breadcrumb: [{ label: "Beranda", href: "/" }, { label: "Produk" }],
      actions: h(Button, { href: "/produk/baru" }, "Tambah"),
    }),
    h(Stack, { gap: "lg" },
      h(Columns, { cols: 3 }, ...kartu),
      h(Section, { title: "Terlaris" }, h(Table, { ... })),
    ),
  ),
);
```

## Formulir lengkap

```ts
h(Form, { action: "/produk", upload: true },
  h(Field, { name: "nama", label: "Nama", value: values.nama, error: errors.nama }),
  h(FormRow, null,
    h(Field, { name: "harga", label: "Harga", type: "number", prefix: "Rp", value: values.harga }),
    h(Select, { name: "kategori", label: "Kategori", placeholder: "Pilih kategori", options: ["Kopi", "Teh"], value: values.kategori }),
  ),
  h(CheckboxGroup, { name: "hari", label: "Hari tersedia", inline: true, options: ["Senin", "Selasa", "Rabu"], values: values.hari }),
  h(RadioGroup, { name: "kirim", label: "Pengiriman", options: [{ value: "ambil", label: "Ambil sendiri" }, { value: "kurir", label: "Kurir", hint: "Rp10.000" }], value: values.kirim }),
  h(Switch, { name: "aktif", label: "Tampilkan di toko", checked: true }),
  h(FileInput, { name: "foto", label: "Foto", types: ["image/*"], maxBytes: "5mb", preview: product.fotoUrl }),
  h(FormActions, null, h(Button, { loading: "Menyimpan…" }, "Simpan")),
)
```

- **Semua field** punya `label`, `error`, dan `hint` dengan `aria-describedby` yang benar, dan tetap berfungsi tanpa JavaScript.
- **`FileInput`** memakai `types` dan `maxBytes` yang sama dengan `saveUpload()` di handler, sehingga browser hanya menawarkan file yang cocok dan petunjuknya ditulis otomatis (mis. "Gambar, maks. 5 MB"). Gambar yang baru dipilih langsung dipratinjau. Formulirnya perlu `upload: true`. Lihat [Unggah file](upload.html).
- **Kotak centang dan sakelar** tidak mengirim apa pun saat mati. `CheckboxGroup` mengirim nama yang sama beberapa kali: baca dengan `form.getAll("hari")` dari `readForm()`.
- **Tombol *Tampilkan*** pada password muncul hanya bila JavaScript aktif. Matikan dengan `reveal: false`.

## Tema

Warna aksen, sudut, font, dan mode gelap/terang diatur di `zusantara.config.mjs`, tanpa CSS:

```js
export default {
  ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" },
};
```

| Opsi | Pilihan |
|---|---|
| `accent` | `teal` (bawaan), `blue`, `sky`, `cyan`, `indigo`, `violet`, `purple`, `pink`, `rose`, `red`, `orange`, `amber`, `gold`, `brown`, `green`, `emerald`, `slate`, nama Indonesia (`biru`, `merah`, `hijau`, `ungu`, `oranye`, `kuning`, `emas`, `abu`, `toska`, …), atau hex `#rrggbb` |
| `radius` | `none`, `sm`, `md` (bawaan), `lg` |
| `font` | `jakarta` (Plus Jakarta Sans, bawaan), `system`, `serif`, `mono` |
| `mode` | `auto` (ikuti sistem, bawaan), `light`, `dark` |

Warna aksen disesuaikan otomatis untuk mode terang dan gelap, sehingga teks di tombol dan tautan tetap memenuhi kontras WCAG AA apa pun warna yang dipilih. Atur juga dari terminal:

```bash
npx zusantara theme                                  # lihat tema saat ini
npx zusantara theme --accent biru --radius lg        # ubah (ditulis ke zusantara.config.mjs)
npx zusantara theme --reset                          # kembali ke bawaan
```

Server dev memuat ulang config sendiri. Zusantara AI memakai perintah yang sama saat Anda meminta, misalnya, *"ubah warna utama jadi biru"*.

## Navigasi dan dialog

Semua navigasi berupa tautan biasa, jadi setiap tab dan halaman punya URL sendiri dan bisa dibuka tanpa JavaScript:

```ts
h(Navbar, { appName: "Toko Senja", links: [{ href: "/", label: "Beranda" }, { href: "/menu", label: "Menu" }], active: "/menu", actions: h(Button, { href: "/pesan", small: true }, "Pesan") }),
h(Tabs, { items: [{ href: "?tab=baru", label: "Baru", count: 3 }, { href: "?tab=selesai", label: "Selesai" }], active: `?tab=${tab}` }),
h(Pagination, { page, pages, href: "/produk?page={page}" }),
```

Dialog, laci, dan popover memakai atribut `popover` bawaan browser. Isi `trigger` untuk membuat tombol pembukanya sekaligus, atau buka dari tombol mana pun dengan `opens`:

```ts
h(ConfirmDialog, { id: `hapus-${p.id}`, trigger: "Hapus", title: `Hapus ${p.name}?`, text: "Produk yang dihapus tidak bisa dikembalikan.", action: `/produk/${p.id}/hapus`, confirm: "Hapus" }),
h(Button, { opens: "filter", variant: "secondary" }, "Filter"),
h(Drawer, { id: "filter", title: "Filter" }, ...),
```

`Dialog` dengan `open: true` langsung terbuka saat halaman dimuat, misalnya bila formulir di dalamnya punya error.

## Pesan setelah redirect (flash)

`flash(ctx, pesan)` menyimpan pesan untuk ditampilkan satu kali di halaman berikutnya, dan `takeFlash(ctx)` mengambilnya. Pesan disimpan di session bila middleware `session()` terpasang, bila tidak di cookie pendek `zen_flash`:

```ts
import { flash, redirect, takeFlash } from "zusantara";
import { Toast } from "zusantara/ui";

export async function POST(ctx: ZenContext) {
  // … simpan data
  flash(ctx, "Catatan disimpan.");
  return redirect("/notes", 303);
}

// Di halaman tujuan: tidak ada pesan = Toast tidak merender apa-apa.
h(Toast, { flash: takeFlash(ctx) })
```

Tone bawaan `success`; pakai `flash(ctx, "Gagal mengirim email", "error")` untuk yang lain. Toast hilang sendiri setelah 6 detik (`timeout: 0` = tetap tampil).

## Halaman publik dan toko

Halaman depan, profil usaha, toko, dan booking disusun dari komponen di atas tanpa CSS sendiri:

```ts
import { h } from "zusantara";
import { Button, Container, CTA, FAQ, Hero, Navbar, page, placeholder, Stack } from "zusantara/ui";

export function GET() {
  return page(
    { title: "Dapur Senja", description: "Kue segar setiap pagi" },
    h(Navbar, { appName: "Dapur Senja", links: [{ href: "/menu", label: "Menu" }], actions: h(Button, { href: "/pesan", small: true }, "Pesan") }),
    h("main", { id: "konten" }, h(Container, null, h(Stack, { gap: "xl" },
      h(Hero, { title: "Kue segar setiap pagi", actions: h(Button, { href: "/menu" }, "Lihat menu"), image: { src: placeholder("Kue cokelat", 800, 600), alt: "Kue cokelat" } }),
      h(FAQ, { title: "Pertanyaan umum", items: [{ question: "Berapa lama pengiriman?", answer: "Hari ini untuk pesanan sebelum jam 10." }] }),
      h(CTA, { title: "Ada acara minggu ini?", actions: h(Button, { href: "/pesan" }, "Pesan sekarang") }),
    ))),
  );
}
```

Harga di `Pricing`, `PriceTag`, `ProductCard`, dan `CartSummary` diformat dengan `money()`: rupiah tanpa desimal untuk Bahasa Indonesia. `QuantityInput` dipakai di dalam `Form`, jadi jumlah terkirim bersama formulirnya.

**Contoh halaman utuh.** Katalog memuat lima halaman lengkap sebagai titik awal: `landing` (toko kue), `profile` (profil usaha dan tim), `store` (toko dengan keranjang), `booking` (jadwal booking), dan `dashboard` (dasbor admin). `zusantara ui --example` menampilkan daftarnya, `zusantara ui --example store` mencetak kode route lengkapnya, dan saat `zusantara dev` hasilnya bisa dibuka di `/_zusantara/ui/examples/store`. Zusantara AI memakai contoh yang sama lewat `ui_catalog`.

## Halaman error

Di produksi, error 403, 404, 500, dan status lainnya ditampilkan dengan kit UI dan tema aplikasi (`ui` di `zusantara.config.mjs`), lengkap dengan nama aplikasi (`appName`) dan tombol kembali ke beranda. Pesan dari `throw new HttpError(403, "Hanya admin yang bisa membuka halaman ini")` ikut ditampilkan; detail error 500 tidak pernah ditampilkan. Saat pengembangan, 404 dan 500 tetap memakai halaman pengembang yang lebih lengkap.

Untuk halaman status buatan sendiri, pakai `h(StatusPage, { status: 404, text: "…", action: … })` di dalam `page()`, atau `statusPage(404)` untuk dokumen lengkap.

## Katalog komponen dan galeri

- **`zusantara ui`** mencetak semua komponen per kelompok. `zusantara ui Select` menampilkan kegunaan, setiap prop beserta tipe dan pilihannya, dan contoh. `--json` untuk dipakai alat lain. `zusantara ui --example` menampilkan contoh halaman utuh.
- **Galeri `/_zusantara/ui`** saat `zusantara dev`: setiap komponen dengan contoh hidup dan tema aplikasi Anda. Di bagian bawahnya ada tautan ke contoh halaman utuh. Galeri tidak ada di produksi.
- **Zusantara AI** membaca katalog yang sama (tool `ui_catalog`), menyusun halaman dengan primitif tata letak, lalu memeriksanya dengan `view_page` di desktop dan ponsel. Bila kit belum bisa membuat yang diminta, AI menjelaskan batasnya dan menawarkan CSS khusus, yang baru ditulis setelah Anda setuju.

Katalog dibuat otomatis dari JSDoc di kode kit UI, jadi selalu sesuai dengan versi zusantara yang terpasang.

## Formulir dengan pesan error per field

`tryParse()` memvalidasi tanpa melempar error, sehingga formulir bisa ditampilkan ulang lengkap dengan pesannya:

```ts
import { flash, html, readInput, redirect, tryParse } from "zusantara";

export async function POST(ctx: ZenContext) {
  const raw = await readInput(ctx); // form HTML maupun JSON
  const input = await tryParse(NoteForm, raw);
  if (!input.ok) return html(view({ values: raw, errors: input.errors }), { status: 422 });
  await db.insert(notes).values({ ...input.data, userId: (ctx.state.user as User).id });
  flash(ctx, "Catatan disimpan.");
  return redirect("/notes", 303);
}
```

Nilai dari form HTML selalu berupa string, jadi pakai `z.coerce.number()` untuk angka. Proteksi CSRF bawaan (`csrf()`) bekerja lewat header browser, sehingga formulir tidak perlu token tersembunyi.

## Halaman yang butuh login

`requireAuth({ redirectTo: "/login" })` mengarahkan tamu ke halaman login dengan `?next=<halaman asal>`, bukan membalas 401. User dengan role yang salah tetap mendapat 403:

```ts
export const requireUserPage = requireAuth<User>({ loadUser, redirectTo: "/login" });
export const requireAdminPage = requireAuth<User>({ loadUser, roles: ["admin"], redirectTo: "/login" });
```

Setelah login, arahkan hanya ke path lokal. Template `api` menyediakan `safeNext()`, yang menolak `https://…` dan `//…` untuk mencegah *open redirect*.

## Halaman bawaan template api

Proyek baru dari `npm create zusantara` (template **api**) langsung punya:

| Halaman | Isi |
|---|---|
| `/login` · `/register` | formulir masuk dan daftar, lengkap dengan validasi, pesan error, dan pembatasan percobaan |
| `/dashboard` | ringkasan (catatan, aktivitas minggu ini, pengguna), catatan terbaru, dan ide untuk dibangun berikutnya |
| `/notes` | contoh fitur milik user: tulis, cari, dan daftar catatan (setiap user hanya melihat catatannya sendiri) |
| `/notes/:id` | ubah dan hapus catatan |
| `/admin/users` | daftar pengguna dan perannya (khusus admin) |

Semua halaman ini ada di `src/app/routes/` dan boleh diubah sesuka Anda. `src/app/lib/ui.ts` berisi `appPage()` (kerangka dengan navigasi atas) dan `APP_NAME`. Zusantara AI juga memakai kit ini saat Anda meminta halaman baru, mis. *"buatkan halaman jadwal booking untuk user yang login"*.
