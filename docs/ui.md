---
title: Kit UI (zentara/ui)
order: 1
group: Front-End
description: Komponen HTML bergaya brand Zentara untuk halaman login, dasbor, dan admin.
---

# Kit UI (zentara/ui)

`zentara/ui` berisi komponen HTML server-side yang siap pakai. Tampilannya mengikuti brand Zentara Core (teal dan emas), otomatis menyesuaikan mode gelap/terang sistem, dan responsif di layar ponsel. Tanpa JavaScript, tanpa build step. Semua teks di-escape otomatis.

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

`page()` menghasilkan dokumen HTML lengkap yang memuat stylesheet `/_zentara/ui.css`. Stylesheet itu, beserta logo (`/_zentara/logo.webp`) dan favicon, disajikan langsung oleh framework, jadi tidak perlu disalin ke `public/`.

## Komponen

| Komponen | Kegunaan |
|---|---|
| `page(options, ...body)` | dokumen HTML lengkap: `title`, `description`, `lang`, `head` tambahan |
| `AuthCard` | kartu di tengah layar untuk halaman masuk dan daftar: `title`, `subtitle`, `footer`, `appName` |
| `AppShell` | kerangka aplikasi: sidebar dengan logo, navigasi (`nav`, `active`), user dan tombol *Keluar* (POST ke `/logout`), judul halaman, `actions` |
| `Card` · `Grid` · `Stat` | kartu berjudul, grid responsif, dan kartu angka ringkasan |
| `Form` · `FormRow` · `Field` | formulir POST, baris beberapa field, serta input berlabel dengan `error` dan `hint` (atribut aksesibilitas sudah benar; password tidak pernah diisi ulang) |
| `Button` · `PostButton` | tombol atau tautan bergaya tombol, dan tombol yang mengirim POST dengan konfirmasi (mis. hapus) |
| `Alert` · `Badge` | pesan (`info`, `success`, `error`, `warn`) dan label kecil |
| `Table` · `EmptyState` | tabel data (kolom `align: "num"` untuk angka), dan tampilan saat data kosong |
| `Avatar` · `Brand` · `rupiah()` | inisial nama, logo dengan nama aplikasi, dan format `Rp45.000` |

Semua warna berupa variabel CSS (`--zu-accent`, `--zu-bg`, `--zu-surface`, dan seterusnya). Ubah tema dengan menimpanya lewat `head`:

```ts
page({ title: "Toko", head: h("style", null, raw(":root{--zu-accent:#c89b52}")) }, ...);
```

## Formulir dengan pesan error per field

`tryParse()` memvalidasi tanpa melempar error, sehingga formulir bisa ditampilkan ulang lengkap dengan pesannya:

```ts
import { html, readInput, redirect, tryParse } from "zentara";

export async function POST(ctx: ZenContext) {
  const raw = await readInput(ctx); // form HTML maupun JSON
  const input = await tryParse(ProductForm, raw);
  if (!input.ok) return html(view({ values: raw, errors: input.errors }), { status: 422 });
  await db.insert(products).values(input.data);
  return redirect("/admin/products?pesan=dibuat", 303);
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
| `/dashboard` | ringkasan (produk, stok, pengguna) dan produk terbaru |
| `/admin/products` | daftar produk dan tambah produk (khusus admin) |
| `/admin/products/:id` | ubah dan hapus produk |
| `/admin/users` | daftar pengguna dan perannya |

Semua halaman ini ada di `src/app/routes/` dan boleh diubah sesuka Anda. `src/app/lib/ui.ts` berisi `appPage()` (kerangka dengan menu sidebar) dan `APP_NAME`. Zentara AI juga memakai kit ini saat Anda meminta halaman baru, mis. *"buatkan halaman kategori produk di admin"*.
