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
| `Card` · `Split` · `Grid` | kartu berjudul, tata letak dua kolom 2:1 (isi utama dan panel samping), dan grid responsif |
| `Form` · `FormRow` · `Field` · `FormActions` | formulir POST, baris beberapa field, input berlabel dengan `error`, `hint`, dan `inputmode` (atribut aksesibilitas sudah benar; password tidak pernah diisi ulang), serta baris tombol di akhir formulir |
| `Button` · `PostButton` | tombol atau tautan bergaya tombol (`loading` untuk teks saat mengirim), dan tombol yang mengirim POST dengan konfirmasi (mis. hapus) |
| `Search` · `Disclosure` | kolom cari (GET, `?q=`, dengan tautan *Hapus*), dan bagian buka-tutup tanpa JavaScript, mis. formulir tambah data |
| `Alert` · `Badge` | pesan (`info`, `success`, `error`, `warn`) dan label kecil bersudut (`accent`, `ok`, `warn`, `danger`) |
| `Table` · `List` · `EmptyState` | tabel data (kolom `align: "num"` untuk angka, `"end"` untuk rata kanan), daftar ringkas dua sisi, dan tampilan saat data kosong dengan saran langkah berikutnya |
| `Avatar` · `Brand` | inisial nama dan logo dengan nama aplikasi |
| `money()` · `formatNumber()` · `formatDate()` · `rupiah()` | format uang, angka, dan tanggal sesuai [bahasa](bahasa.html) aktif; `rupiah(45000)` selalu `Rp45.000` |

Semua warna berupa variabel CSS (`--zu-accent`, `--zu-bg`, `--zu-surface`, dan seterusnya). Ubah tema dengan menimpanya lewat `head`:

```ts
page({ title: "Studio", head: h("style", null, raw(":root{--zu-accent:#c89b52}")) }, ...);
```

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
