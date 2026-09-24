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
import { rateLimit } from "zentara";

// Di file route: batasi 10 request per 15 menit per IP (mis. untuk login).
export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];
```

## Halaman error & mode debug

Saat pengembangan (`NODE_ENV=development`, otomatis lewat `zentara dev`), browser menampilkan halaman error lengkap: stack trace, potongan kode, dan detail request (header rahasia disembunyikan). Di produksi, pengunjung hanya melihat halaman status sederhana tanpa detail internal. Atur manual dengan `debug` di `zentara.config.mjs` atau env `ZENTARA_DEBUG`, tapi jangan aktifkan di produksi.

## Keamanan Zentara AI

- AI **tidak pernah** membaca atau mengubah `.env` dan file database, dan tidak bisa menulis ke `.git/`, `node_modules/`, `dist/`, atau keluar folder proyek.
- Aksi krusial (hapus file, pasang paket, migrasi database, mengubah `package.json`/config) **selalu** meminta persetujuan, juga di mode otomatis.
- Chat di browser hanya aktif saat pengembangan, lewat server di `127.0.0.1` dengan token per sesi dan origin `localhost`.
- OmniRoute yang dijalankan Zentara hanya mendengar di `127.0.0.1`.
