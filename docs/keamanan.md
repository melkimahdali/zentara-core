---
title: CSRF, CORS & keamanan
order: 4
group: Data & Keamanan
description: Perlindungan bawaan untuk aplikasi Anda.
---

# CSRF, CORS & keamanan

- **`csrf()`** tidak memakai token. Middleware ini memeriksa header `Sec-Fetch-Site` dan `Origin` yang dikirim browser modern, dan menolak (`403`) request yang mengubah data bila datang dari origin lain. Klien non-browser seperti curl atau server-ke-server tidak terpengaruh. Opsi yang tersedia: `trustedOrigins` dan `skip(ctx)`.
- **`cors()`** menangani request biasa dan preflight. Opsinya: `origin` (string, array, RegExp, atau function), `credentials`, `methods`, `allowedHeaders`, `exposedHeaders`, dan `maxAge`.

## Rate limit

```ts
import { rateLimit } from "zusantara";

// Di file route: batasi 10 request per 15 menit per IP (mis. untuk login).
export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];
```

## Unggah file

`saveUpload()` menyimpan file dengan nama acak, menentukan tipe dari ekstensi (bukan dari klaim browser), menolak ekstensi yang bisa dijalankan (`.html`, `.svg`, `.js`, `.php`, ...), dan memeriksa isi file gambar/PDF. [Rinciannya](upload.html#keamanan).

## Halaman error & mode debug

Saat pengembangan (`NODE_ENV=development`, otomatis lewat `zusantara dev`), browser menampilkan halaman error lengkap: stack trace, potongan kode, dan detail request (header rahasia disembunyikan). Di produksi, pengunjung hanya melihat halaman status sederhana tanpa detail internal. Atur manual dengan `debug` di `zusantara.config.mjs` atau env `ZUSANTARA_DEBUG`, tapi jangan aktifkan di produksi.

## Keamanan Zusantara AI

- AI **tidak pernah** membaca atau mengubah `.env` dan file database, dan tidak bisa menulis ke `.git/`, `node_modules/`, `dist/`, atau keluar folder proyek.
- Aksi krusial (hapus file, pasang paket, migrasi database, mengubah `package.json`/config, perintah terminal di luar daftar baca-saja) **selalu** meminta persetujuan, juga di mode otomatis.
- Perintah terminal dijalankan tanpa shell, jadi pipa, `&&`, pengalihan, dan variabel ditolak. Perintah admin, shell bersarang, kredensial (`npm publish`, `git push`, `git config`), dan argumen yang menyebut `.env` atau path di luar proyek juga ditolak. Nilai rahasia disensor dari output sebelum dikirim ke provider AI. [Rinciannya](zusantara-ai.html#perintah-terminal).
- Riwayat percakapan (`.zusantara/sessions/`) disimpan dengan izin baca pemilik saja dan diabaikan git.
- Chat di browser hanya aktif saat pengembangan, lewat server di `127.0.0.1` dengan token per sesi dan origin `localhost`.
- OmniRoute yang dijalankan Zusantara hanya mendengar di `127.0.0.1`.
