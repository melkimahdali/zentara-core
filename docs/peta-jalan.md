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

## Berikutnya

| Tahap | Versi | Isi |
|---|---|---|
| **10** | **0.11** | **Bahasa Inggris (i18n)**, rinciannya di bawah |
| 11 | 0.12 | Back-End: job latar belakang, jadwal (cron), unggah file, email, cache |
| 12 | 0.13 | Data dan panel admin: CRUD otomatis dari schema, relasi, paginasi, filter |
| 13 | 0.14 | Testing: helper uji route dan halaman, data uji (factory), laporan cakupan |
| 14 | 0.15 | Deploy: adapter Docker, Vercel, Cloudflare, dan panduan server sendiri |
| 15 | 1.0 | Ekosistem: plugin, MCP, subagent, language server, API stabil |

## Tahap 10: Bahasa Inggris

Tujuannya agar Zentara bisa dipakai penuh dalam Bahasa Indonesia **atau** Bahasa Inggris, tanpa mengubah perilaku bagi pengguna yang sudah ada. Bahasa Indonesia tetap menjadi default.

Tahap ini sengaja ditempatkan sebelum Back-End. Dengan begitu, fitur di Tahap 11 sampai 15 langsung ditulis dalam dua bahasa, tidak perlu diterjemahkan belakangan.

1. **Fondasi i18n di core**
   - Katalog pesan `id` dan `en` serta fungsi `t()` yang bertipe (kunci yang salah menjadi error TypeScript).
   - Bahasa dipilih lewat `zentara.config.mjs` (`locale: "en"`), env `ZENTARA_LANG`, atau otomatis dari bahasa sistem.
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
   - README paket npm dan catatan rilis dalam Bahasa Inggris.
7. **Pengujian**
   - Test memastikan setiap kunci katalog ada di kedua bahasa.
   - e2e menjalankan alur utama dalam `id` dan `en`.
