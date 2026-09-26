---
title: Kit UI (zentara/ui)
order: 1
group: Front-End
description: Komponen HTML bergaya brand Zentara untuk halaman login, dasbor, dan admin.
---

# Kit UI (zentara/ui)

`zentara/ui` berisi komponen HTML server-side yang siap pakai. Tampilannya mengikuti brand Zentara Core: font Plus Jakarta Sans, satu warna aksen teal (emas hanya di logo), mode gelap/terang mengikuti sistem, dan responsif di layar ponsel. Tanpa build step, dan semua teks di-escape otomatis.

```ts
import { h, type ZenContext } from "zentara";
import { AuthCard, Button, Field, Form, page } from "zentara/ui";

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

`page()` menghasilkan dokumen HTML lengkap yang memuat stylesheet `/_zentara/ui.css`. Stylesheet itu, beserta logo (`/_zentara/logo.webp`), favicon, dan font, disajikan langsung oleh framework, jadi tidak perlu disalin ke `public/`.

Setiap halaman dari `page()` juga sudah punya:

- **Font Plus Jakarta Sans yang di-host sendiri** di `/_zentara/fonts/` (subset latin dan latin-ext, lisensi SIL OFL di `/_zentara/fonts/LICENSE.txt`). Tidak ada permintaan ke Google Fonts atau CDN lain.
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
| `StatGroup` · `Stat` | strip angka ringkasan dengan pemisah tipis (bukan deretan kartu kembar) |
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

Warna aksen, sudut, font, dan mode gelap/terang diatur di `zentara.config.mjs`, tanpa CSS:

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
npx zentara theme                                  # lihat tema saat ini
npx zentara theme --accent biru --radius lg        # ubah (ditulis ke zentara.config.mjs)
npx zentara theme --reset                          # kembali ke bawaan
```

Server dev memuat ulang config sendiri. Zentara AI memakai perintah yang sama saat Anda meminta, misalnya, *"ubah warna utama jadi biru"*.

## Katalog komponen dan galeri

- **`zentara ui`** mencetak semua komponen per kelompok. `zentara ui Select` menampilkan kegunaan, setiap prop beserta tipe dan pilihannya, dan contoh. `--json` untuk dipakai alat lain.
- **Galeri `/_zentara/ui`** saat `zentara dev`: setiap komponen dengan contoh hidup dan tema aplikasi Anda. Galeri tidak ada di produksi.
- **Zentara AI** membaca katalog yang sama (tool `ui_catalog`), menyusun halaman dengan primitif tata letak, lalu memeriksanya dengan `view_page` di desktop dan ponsel. Bila kit belum bisa membuat yang diminta, AI menjelaskan batasnya dan menawarkan CSS khusus, yang baru ditulis setelah Anda setuju.

Katalog dibuat otomatis dari JSDoc di kode kit UI, jadi selalu sesuai dengan versi zentara yang terpasang.

## Formulir dengan pesan error per field

`tryParse()` memvalidasi tanpa melempar error, sehingga formulir bisa ditampilkan ulang lengkap dengan pesannya:

```ts
import { html, readInput, redirect, tryParse } from "zentara";

export async function POST(ctx: ZenContext) {
  const raw = await readInput(ctx); // form HTML maupun JSON
  const input = await tryParse(NoteForm, raw);
  if (!input.ok) return html(view({ values: raw, errors: input.errors }), { status: 422 });
  await db.insert(notes).values({ ...input.data, userId: (ctx.state.user as User).id });
  return redirect("/notes?msg=created", 303);
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

Proyek baru dari `npm create zentara` (template **api**) langsung punya:

| Halaman | Isi |
|---|---|
| `/login` · `/register` | formulir masuk dan daftar, lengkap dengan validasi, pesan error, dan pembatasan percobaan |
| `/dashboard` | ringkasan (catatan, aktivitas minggu ini, pengguna), catatan terbaru, dan ide untuk dibangun berikutnya |
| `/notes` | contoh fitur milik user: tulis, cari, dan daftar catatan (setiap user hanya melihat catatannya sendiri) |
| `/notes/:id` | ubah dan hapus catatan |
| `/admin/users` | daftar pengguna dan perannya (khusus admin) |

Semua halaman ini ada di `src/app/routes/` dan boleh diubah sesuka Anda. `src/app/lib/ui.ts` berisi `appPage()` (kerangka dengan navigasi atas) dan `APP_NAME`. Zentara AI juga memakai kit ini saat Anda meminta halaman baru, mis. *"buatkan halaman jadwal booking untuk user yang login"*.
