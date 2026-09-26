---
title: Peta jalan
order: 5
group: Referensi
description: Tahapan pengembangan Zentara Core menuju 1.0, termasuk dukungan Bahasa Inggris.
---

# Peta jalan

Zentara Core dikembangkan per tahap. Setiap tahap dirilis sebagai versi minor baru dan dicatat di [catatan rilis](rilis.html). Urutan tahap yang belum selesai masih bisa berubah.

Zentara adalah framework web umum, bukan framework untuk jenis aplikasi tertentu. Template bawaan hanya memberi titik awal yang netral (login, dasbor, pengguna, dan contoh CRUD Catatan), dan Anda bebas membangun apa saja di atasnya: blog, sistem booking, dasbor internal, API, portofolio, atau toko.

## Sudah dirilis

| Tahap | Versi | Isi |
|---|---|---|
| 1 | sebelum 0.6 | Fondasi core: routing berbasis file, respons dan error handling, render HTML ter-escape, file statis, config |
| 2 | sebelum 0.6 | Middleware, cookie, session terenkripsi, CSRF, CORS, validasi, CLI dasar |
| 3 | sebelum 0.6 | Zentara AI: bangun aplikasi dengan bahasa sehari-hari, persetujuan, undo, fallback provider |
| 4 | sebelum 0.6 | Database Drizzle (SQLite dan PostgreSQL), auth, AI yang paham database |
| 5 | 0.6 | Paket npm `zentara` dan `create-zentara`, rilis otomatis dengan persetujuan 2FA |
| 6 | 0.7 | CLI interaktif gaya Claude Code, server dev di latar belakang, halaman error dan sambutan |
| 7 | 0.8 | Brand Zentara Core dan situs dokumentasi |
| 8 | 0.9 | Arsitektur dan keamanan Zentara AI: streaming, sesi tersimpan, `run_command` aman, diff |
| 9 | 0.10 | Front-End: kit UI `zentara/ui`, halaman bawaan, dan CLI berbasis Ink |
| 10 | 0.12 | [Bahasa Inggris](bahasa.html): CLI, Zentara AI, halaman bawaan, kit UI, template, dan dokumentasi dalam `id` dan `en` |
| 11 | 0.12 | Back-End: [job & jadwal](jobs.html), [email](email.html), [unggah file](upload.html), [cache](cache.html) |
| 12 | 0.12.5 | [Chat Zentara AI di setiap halaman](ai-browser.html) saat pengembangan (hilang otomatis di produksi), dan AI yang bisa melihat tampilan lewat tool `view_page` |

Tahap 10 dan 11 dirilis bersama di 0.12.

## Berikutnya

| Tahap | Versi | Isi |
|---|---|---|
| 13 | 0.13 | Panel admin dan htmx: htmx di inti (`/_zentara/htmx.js`, `isHtmx(ctx)`), komponen paginasi, filter, tab, dialog konfirmasi, dan tabel yang bisa diedit, serta `zentara make:admin <tabel>` (CRUD dari schema, relasi, otomatis masuk menu) yang juga dipakai Zentara AI |
| 14 | 0.14 | Testing: `testApp()`, login sebagai user tertentu, data uji (factory) dari schema, AI menulis tes untuk fitur yang dibuatnya, `zentara test --coverage` |
| 15 | 0.15 | Deploy: `zentara deploy` dengan adapter Docker, VPS/PM2, Vercel, dan Cloudflare, panduan server sendiri dan domain, serta cek sebelum produksi |
| 16 | 0.16 | Ekosistem: katalog plugin resmi (`zentara add`/`zentara remove`) yang ditawarkan Zentara AI hanya bila dibutuhkan, MCP, subagent, dan language server |
| 17 | 1.0 | Stabil: API dibekukan (semver ketat) dengan panduan migrasi, audit keamanan dan uji performa, dokumentasi lengkap dua bahasa |

## Integrasi framework lain

Zentara tetap memakai satu sistem tampilan, yaitu kit UI `zentara/ui`, supaya semua halaman (termasuk yang dibuat Zentara AI) seragam dan tanpa build step.

- **Tahap 13:** [htmx](https://htmx.org) masuk inti untuk paginasi, filter, dan simpan formulir tanpa memuat ulang halaman. Server tetap mengirim HTML.
- **Tahap 16:** Tailwind, grafik, editor teks, peta, pembayaran, login Google/GitHub, dan "island" React/Preact menjadi plugin opsional dari katalog resmi (`zentara add <plugin>`). Zentara AI hanya menawarkannya sebagai pilihan saat permintaan memang membutuhkannya, dengan opsi "tanpa plugin" sebagai default, dan pemasangannya selalu meminta persetujuan.

## Tahap 10: Bahasa Inggris (selesai)

Tujuannya agar Zentara bisa dipakai penuh dalam Bahasa Indonesia **atau** Bahasa Inggris, tanpa mengubah perilaku bagi pengguna yang sudah ada. Bahasa Indonesia tetap menjadi default.

Tahap ini dikerjakan sebelum Back-End, jadi fitur di Tahap 11 sampai 17 langsung ditulis dalam dua bahasa.

1. **Fondasi i18n di core**
   - Katalog pesan `id` dan `en` serta fungsi `t()` yang bertipe (kunci yang salah menjadi error TypeScript).
   - Bahasa dipilih lewat `zentara.config.mjs` (`locale: "en"`), env `ZENTARA_LANG`, atau `zentara lang en`.
2. **CLI dan Zentara AI**
   - Semua teks CLI klasik, CLI Ink, `ai:setup`, dan pesan error diambil dari katalog.
   - Zentara AI menjawab dalam bahasa pengguna, dan instruksi sistemnya tersedia dalam Bahasa Inggris.
3. **Halaman bawaan framework**
   - Halaman sambutan, halaman error dan 404 pengembangan, serta halaman status produksi.
   - Pesan default `HttpError` dan validasi.
4. **Kit UI `zentara/ui`**
   - Teks bawaan seperti "Lewati ke konten", "Keluar", "Cari…", dan "Belum ada data" mengikuti `page({ lang })`.
   - Format angka, mata uang, dan tanggal memakai `Intl` sesuai bahasa.
5. **Pembuat proyek dan template**
   - `npm create zentara` menanyakan bahasa (atau `--lang en`).
   - Template `api` dan `minimal` tersedia dalam dua bahasa: teks halaman, pesan validasi, README, dan test.
6. **Dokumentasi**
   - Situs dokumentasi Bahasa Inggris di `/en/` dengan tombol pindah bahasa.
   - README paket npm dalam dua bahasa, dan catatan rilis Bahasa Inggris mulai 0.12.
7. **Pengujian**
   - Test memastikan setiap kunci katalog ada di kedua bahasa.
   - e2e menjalankan alur utama dalam `id` dan `en`.
