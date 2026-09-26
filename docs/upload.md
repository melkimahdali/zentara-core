---
title: Unggah file
order: 3
group: Back-End
description: Terima file dari formulir multipart dan simpan dengan aman memakai readForm() dan saveUpload().
---

# Unggah file

```ts
// src/app/routes/profil/foto.ts
import { HttpError, readForm, saveUpload, type ZenContext } from "zusantara";

export async function POST(ctx: ZenContext) {
  const form = await readForm(ctx, { maxBytes: "10mb" });
  const photo = form.get("photo");
  if (!(photo instanceof File)) throw new HttpError(422, "Pilih foto terlebih dulu");
  const saved = await saveUpload(photo, { types: ["image/*"], maxBytes: "5mb" });
  return { url: saved.url }; // mis. "/uploads/3f0c...e1.png"
}
```

Formulirnya dengan [kit UI](ui.html). Berikan `types` dan `maxBytes` yang sama dengan `saveUpload()`, sehingga browser hanya menawarkan file yang cocok, petunjuk "Gambar, maks. 5 MB" ditulis otomatis, dan gambar yang dipilih langsung dipratinjau:

```ts
import { Button, FileInput, Form, FormActions } from "zusantara/ui";

h(Form, { action: "/profil/foto", upload: true },
  h(FileInput, { name: "photo", label: "Foto profil", types: ["image/*"], maxBytes: "5mb", preview: user.photoUrl }),
  h(FormActions, null, h(Button, null, "Unggah")),
)
```

## readForm

`readForm(ctx, { maxBytes })` membaca body `multipart/form-data`, `application/x-www-form-urlencoded`, atau JSON sebagai `FormData` standar. Tanpa `maxBytes`, batasnya `bodyLimit` di config (1 MB). Body yang melewati batas ditolak dengan 413.

`readInput()` untuk [validasi](validasi.html) juga membaca multipart, jadi field teks dari formulir unggah bisa divalidasi seperti biasa.

## saveUpload

| Pilihan | Bawaan | Keterangan |
|---|---|---|
| `dir` | `public/uploads` | folder tujuan, relatif ke folder proyek |
| `maxBytes` | `"10mb"` | batas ukuran satu file |
| `types` | gambar umum, PDF, teks, CSV, Office | MIME (`"image/png"`, `"image/*"`) atau ekstensi (`".pdf"`) |

Hasilnya `{ name, originalName, path, size, type, url }`. `url` hanya ada bila file disimpan di bawah `public/`.

## Keamanan

`saveUpload()` dibuat agar aman secara bawaan:

- **Nama file acak.** File disimpan dengan UUID, bukan nama dari pengguna, jadi tidak bisa menimpa file lain atau keluar folder (`../`). Nama asli hanya ada di `originalName` untuk ditampilkan.
- **Tipe dari ekstensi, bukan dari browser.** Klaim `Content-Type` dari browser tidak dipercaya.
- **Ekstensi berbahaya selalu ditolak**, termasuk `.html`, `.svg`, `.js`, `.php`, dan `.exe`, karena bisa dijalankan browser atau server.
- **Isi file diperiksa.** PNG, JPEG, GIF, WebP, PDF, dan ZIP harus diawali tanda file yang sesuai, jadi skrip yang diganti namanya menjadi `.png` ditolak.
- **File kosong dan file terlalu besar ditolak** dengan 422 dan 413.

File di `public/uploads` bisa dibuka siapa saja yang tahu URL-nya. Untuk file pribadi, simpan di luar `public/` (mis. `dir: "data/uploads"`) dan kirim lewat route yang memeriksa login.
