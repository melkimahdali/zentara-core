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

Tahap 10 dan 11 dirilis bersama di 0.12.

## Berikutnya

| Tahap | Versi | Isi |
|---|---|---|
| 12 | 0.12.5 | Chat Zentara AI di semua halaman saat pengembangan, dan AI bisa melihat halaman (`view_page`) |
| 13 | 0.13 | Data dan panel admin: CRUD otomatis dari schema, relasi, paginasi, filter, interaksi tanpa muat ulang dengan [htmx](https://htmx.org), dan manifest aplikasi `zentara describe --json` |
| 14 | 0.14 | Zentara untuk semua agen AI: `zentara mcp`, `AGENTS.md` di template, dan `llms.txt` untuk dokumentasi |
| 15 | 0.15 | Testing dan eval AI: helper uji, factory, laporan cakupan, eval AI yang hasilnya diterbitkan, dan benchmark dasar |
| 16 | 0.16 | Runtime portabel: inti `app.fetch()` standar dan paket produksi ringan tanpa CLI/AI |
| 17 | 0.17 | Deploy satu perintah: Docker, PM2, Vercel, dan Cloudflare (eksperimental) |
| 18 | 0.18 | Katalog plugin resmi, termasuk pembayaran Midtrans/Xendit sejak awal |
| 19 | 1.0 | Stabil: API beku, audit keamanan, CSP bawaan, kebijakan rilis dan LTS, panduan migrasi |

Item bertanda **[menunggu keputusan]** di bawah memakai rekomendasi saat ini dan masih bisa berubah.

### Tahap 12 · 0.12.5: chat di semua halaman dan `view_page`

- Widget chat Zentara AI muncul di setiap halaman saat server dev berjalan, dan tidak pernah ada di produksi.
- Tool `view_page` membuat AI bisa membuka halaman aplikasi dan memeriksa hasilnya sendiri.
- Setiap tugas AI mencatat hasil ringkas (berhasil/gagal, jumlah langkah, cek yang lulus) ke journal lokal untuk eval di Tahap 15. Tidak ada data yang dikirim keluar dari komputer Anda.

### Tahap 13 · 0.13: data dan panel admin

- htmx masuk inti, prop `hx` di kit UI, komponen baru untuk tabel, filter, dan formulir, serta menu bertanda.
- `zentara make:admin` membuat halaman admin dari schema database.
- `zentara describe --json` mencetak manifest aplikasi (route, tabel dan kolom, halaman admin, job, plugin) tanpa kolom rahasia. Manifest ini dipakai Zentara AI sebagai konteks awal dan menjadi tool utama `zentara mcp`.

### Tahap 14 · 0.14: Zentara untuk semua agen AI

Pengembang yang memakai Claude Code, Cursor, atau agen lain tetap mendapat pengalaman terbaik di proyek Zentara, dengan aturan keamanan yang sama seperti Zentara AI. **[menunggu keputusan: MCP dimajukan ke tahap ini]**

- `zentara mcp`: server MCP dengan tool baca (`describe`, `list_routes`, `view_page`, baca dan cari file, log server dev) dan tool ubah (`make:*`, `db:generate`, `db:migrate`, tulis dan edit file). Batas path, larangan `.env` dan file database, serta aksi krusial sama dengan Zentara AI, dan setiap perubahan bisa dibatalkan dengan `zentara undo`.
- `AGENTS.md` (dan `CLAUDE.md` pendek) di template `api` dan `minimal` dalam dua bahasa. `zentara agents` menambahkannya ke proyek lama.
- `llms.txt` dan `llms-full.txt` dibuat otomatis untuk situs dokumentasi.

### Tahap 15 · 0.15: testing dan eval AI

- `zentara/testing`: `testApp()`, `loginAs`, factory data uji, dan `zentara test --coverage`. Zentara AI dan generator ikut menulis tes.
- Eval AI: 20 sampai 30 tugas standar pada template `api` yang dinilai otomatis (typecheck, tes, `view_page`, aksi terlarang, jumlah langkah, token). Hasilnya diterbitkan per versi di situs dokumentasi.
- Benchmark dasar request per detik dan latensi dibandingkan Express dan Fastify, dijalankan di CI supaya tahap berikutnya tidak membuat Zentara lebih lambat.

### Tahap 16 · 0.16: runtime portabel dan paket produksi ringan

Zentara berjalan di Node, Bun, Deno, Vercel, dan Cloudflare dari satu kode.

- `app.fetch(request)` dengan `Request`/`Response` standar menjadi inti runtime, dan server Node menjadi adapter tipis di atasnya. **[menunggu keputusan: lapisan fetch]**
- `zentara build` menulis manifest route, supaya platform tanpa akses folder tetap bisa melayani route.
- Paket `zentara` hanya berisi runtime, UI, database, dan testing; CLI dan AI pindah ke `@zentara/cli`, yang tetap terpasang lewat `npm install -g zentara`. **[menunggu keputusan: pemisahan paket]**
- Header keamanan default (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS di produksi).
- Aplikasi yang sudah ada tetap jalan tanpa perubahan kode.

### Tahap 17 · 0.17: deploy satu perintah

- `zentara deploy:check` dan `zentara deploy <target>`. Docker dan PM2 wajib, Vercel penuh, Cloudflare eksperimental.
- Vercel dan Cloudflare memakai `app.fetch()` dari Tahap 16, dan image Docker hanya memakai paket runtime sehingga lebih kecil.
- Zentara AI hanya boleh `--dry-run`; pengiriman ke server selalu meminta persetujuan Anda. Setelah deploy, URL kesehatan diperiksa dan hasilnya ditampilkan.

### Tahap 18 · 0.18: katalog plugin

- `zentara add <plugin>` dengan lima plugin pertama: Tailwind, grafik (Chart.js), PostgreSQL, login GitHub/Google, dan pembayaran Midtrans/Xendit.
- Menyusul di 0.18.x: editor teks, peta, island React/Preact, WhatsApp, dan format lokal (Rupiah, NPWP, e-Faktur). Subagent dan language server menyusul di 0.18.x atau setelah 1.0.
- Lisensi ditetapkan sebelum tahap ini, karena penulis plugin menilai lisensi sebelum membangun di atas Zentara. **[menunggu keputusan: lisensi]**

### Tahap 19 · 1.0: stabil

- API dibekukan dan dicatat, audit keamanan (termasuk `zentara mcp` dan plugin pembayaran), dan CSP bawaan.
- Dokumentasi lengkap dua bahasa dengan tutorial yang diuji e2e, kebijakan rilis dan LTS, `CONTRIBUTING.md`, dan dokumentasi arsitektur.
- Panduan migrasi dari Express dan dari Laravel.
- Eval AI dan benchmark versi 1.0 diterbitkan, dan lisensi final tercantum di README dan `package.json`. **[menunggu keputusan: lisensi]**

## Integrasi framework lain

Zentara tetap memakai satu sistem tampilan, yaitu kit UI `zentara/ui`, supaya semua halaman (termasuk yang dibuat Zentara AI) seragam dan tanpa build step.

- **Tahap 13:** [htmx](https://htmx.org) masuk inti untuk paginasi, filter, dan simpan formulir tanpa memuat ulang halaman. Server tetap mengirim HTML.
- **Tahap 14:** agen AI lain (Claude Code, Cursor, dan klien MCP lainnya) bisa bekerja di proyek Zentara lewat `zentara mcp` dan `AGENTS.md`.
- **Tahap 18:** Tailwind, grafik, editor teks, peta, pembayaran, login Google/GitHub, dan "island" React/Preact menjadi plugin opsional dari katalog resmi (`zentara add <plugin>`). Zentara AI hanya menawarkannya sebagai pilihan saat permintaan memang membutuhkannya, dengan opsi "tanpa plugin" sebagai default, dan pemasangannya selalu meminta persetujuan.

## Tahap 10: Bahasa Inggris (selesai)

Tujuannya agar Zentara bisa dipakai penuh dalam Bahasa Indonesia **atau** Bahasa Inggris, tanpa mengubah perilaku bagi pengguna yang sudah ada. Bahasa Indonesia tetap menjadi default.

Tahap ini dikerjakan sebelum Back-End, jadi fitur di Tahap 11 sampai 19 langsung ditulis dalam dua bahasa.

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
