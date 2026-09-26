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
| 12 | 0.12.5 | Chat Zentara AI di semua halaman saat pengembangan, dan AI bisa melihat halaman serta memeriksa tampilannya di desktop dan ponsel (`view_page`) |
| 12b | 0.12.6 | Fondasi tampilan dan formulir lengkap: tata letak, Select, Checkbox, Radio, Switch, unggah file, tema di config, dan katalog komponen |
| 12c | 0.12.7 | Navigasi, dialog, notifikasi, dan tampilan data: Navbar, Tabs, Pagination, Dialog, Toast, Accordion, Timeline, Calendar, halaman 403/404/500 |
| 12d | 0.12.8 | Halaman publik dan pola siap pakai: Hero, Pricing, Gallery, FAQ, Testimonial, ProductCard, keranjang, dan contoh halaman utuh |
| 13 | 0.13 | Data dan panel admin: CRUD otomatis dari schema, relasi, paginasi, filter, interaksi tanpa muat ulang dengan [htmx](https://htmx.org), dan manifest aplikasi `zentara describe --json` |
| 14 | 0.14 | Zentara untuk semua agen AI: `zentara mcp`, `AGENTS.md` di template, dan `llms.txt` untuk dokumentasi |
| 15 | 0.15 | Testing dan eval AI: helper uji, factory, laporan cakupan, eval AI yang hasilnya diterbitkan, dan benchmark dasar |
| 16 | 0.16 | Runtime portabel: inti `app.fetch()` standar dan paket produksi ringan tanpa CLI/AI |
| 17 | 0.17 | Deploy satu perintah: Docker, PM2, Vercel, dan Cloudflare (eksperimental) |
| 18 | 0.18 | Katalog plugin resmi, termasuk pembayaran Midtrans/Xendit sejak awal |
| 19 | 1.0 | Stabil: API beku, audit keamanan, CSP bawaan, kebijakan rilis dan LTS, panduan migrasi |

Item bertanda **[menunggu keputusan]** di bawah memakai rekomendasi saat ini dan masih bisa berubah.

### Tahap 12 · 0.12.5: chat di semua halaman dan `view_page`

Tujuannya: Zentara AI bisa dipanggil dari halaman mana pun saat pengembangan, dan bisa **melihat sendiri** hasil halaman yang ia buat, termasuk apakah tampilannya rapi. Tahap ini juga menyiapkan fondasi untuk kit UI di Tahap 12b dan eval AI di Tahap 15, supaya tahap itu tidak perlu membongkar ulang Tahap 12.

**Widget chat**
- Disisipkan ke setiap respons HTML hanya bila tiga syarat terpenuhi: `config.debug`, devtools berjalan, dan server dijalankan oleh `zentara dev` atau CLI interaktif. `zentara start` dan produksi tidak pernah memuatnya, dan aset `/_zentara/dev/*` mengembalikan 404 di produksi.
- Dimuat sebagai script eksternal (bukan inline), supaya tetap jalan saat CSP bawaan ditambahkan di Tahap 19.
- Memakai alur chat yang sama dengan halaman error: diff dengan Setujui/Tolak, Batalkan, Berhenti, dan Reset. Halaman yang sudah punya chat sendiri (sambutan, error) tidak mendapat widget ganda.
- Setiap pesan otomatis membawa konteks halaman dan file route yang melayani URL itu, sehingga "ubah halaman ini" langsung menunjuk file yang benar.
- Error console, error JavaScript, dan request yang gagal di browser dicatat dan ikut dikirim sebagai konteks.
- Nilai `<input type=password>` dan elemen bertanda `data-private` tidak pernah dikirim ke AI.

**Tool `view_page({ url, viewport?, expect? })`**
- Bila ada tab browser yang memuat widget, halaman dibuka di tab itu (iframe tersembunyi, cookie login ikut). Bila tidak ada, dipakai versi teks dari server yang diberi tanda "tanpa JavaScript".
- Hasilnya: status HTTP, judul, outline (heading, form, tabel, tombol, link), elemen yang terlihat beserta posisi dan ukurannya, error console, dan request gagal.
- **Pemeriksaan tampilan** (baru, untuk masalah AI yang belum bisa membuat tampilan yang sesuai): elemen yang keluar dari layar atau membuat scroll horizontal, elemen yang saling menimpa, teks yang terpotong, gambar yang gagal dimuat, kontras teks yang terlalu rendah, serta HTML atau atribut `style` yang tidak memakai kit UI. Setiap temuan menyebut elemen dan file route-nya.
- `viewport` opsional: `"desktop"` (default) atau `"mobile"` (390 px), sehingga AI bisa memeriksa tampilan ponsel.
- `expect` opsional (mis. `{ text: "Tambah", selector: "table", noConsoleErrors: true, noLayoutIssues: true }`) memberi hasil lulus/gagal yang jelas.
- Hanya membaca dan hanya untuk URL aplikasi di localhost, jadi tidak perlu persetujuan.

**Alur AI**
- Setelah mengubah route atau tampilan, AI wajib memanggil `view_page` untuk halaman itu (desktop dan mobile) dan memperbaiki temuan dalam batas dua percobaan, sama seperti typecheck dan tes. Bila masih gagal, AI melaporkan temuannya apa adanya, bukan mengaku selesai.
- Setiap tugas AI mencatat hasil ringkas ke journal lokal: berhasil/gagal, jumlah langkah, dan hasil typecheck, tes, serta `view_page`. Data ini dipakai eval di Tahap 15 dan tidak pernah dikirim keluar dari komputer Anda.

**CLI dan dua bahasa**
- `zentara view <url> [--mobile]` mencetak hasil yang sama di terminal, dan CLI interaktif menampilkan hasil `view_page` seperti tool lain.
- Semua teks widget, tool, dan pemeriksaan tampilan tersedia dalam Bahasa Indonesia dan Bahasa Inggris.

**Selesai bila**
- Unit: syarat penyisipan widget, penyaringan data rahasia, setiap jenis pemeriksaan tampilan pada halaman contoh yang sengaja dibuat rusak, dan `expect`.
- e2e: di proyek hasil scaffold, `zentara dev` menyisipkan widget dan `zentara start` tidak; `zentara view /login` dan `zentara view /login --mobile` lulus tanpa temuan; halaman contoh yang rusak menghasilkan temuan yang benar.
- AI smoke (manual/terjadwal): permintaan "tambahkan halaman X" diakhiri dengan `view_page` yang lulus di desktop dan mobile.

### Kit UI lengkap: Tahap 12b, 12c, dan 12d

Kit UI `zentara/ui` saat ini punya sekitar 25 komponen, hampir semuanya untuk dasbor dan formulir sederhana. Bahkan `Field` belum punya pilihan (`select`), kotak centang, radio, sakelar, atau unggah file. Karena Zentara AI dilarang menulis CSS sendiri, setiap komponen yang tidak ada berarti tampilan yang tidak bisa dibuat AI. Tiga tahap berikut melengkapi kit UI sebelum panel admin, dan dikerjakan berurutan dengan satu PR per tahap.

**Aturan untuk setiap komponen baru** (berlaku di 12b, 12c, 12d, dan tahap sesudahnya):
- Dirender di server dan tetap berfungsi tanpa JavaScript. JavaScript kecil bawaan hanya menambah kenyamanan (mis. menutup dialog dengan Esc).
- Teks bawaan tersedia dalam Bahasa Indonesia dan Bahasa Inggris, mendukung mode terang dan gelap, dan mengikuti tema dari `zentara.config.mjs`.
- Aksesibel: elemen HTML yang tepat, label, fokus keyboard, dan kontras yang cukup.
- Masuk katalog komponen (contoh dan kegunaan untuk AI) serta galeri `/_zentara/ui`.
- Punya tes unit (render id/en, escape, tanpa JS) dan lolos pemeriksaan tampilan `view_page` di desktop dan ponsel.

#### Tahap 12b · 0.12.6: fondasi tampilan dan formulir lengkap

- **Tata letak:** `Container`, `Stack`, `Row`/`Cluster`, `Columns`, `Section`, `Divider`, dan `PageHeader` (judul, deskripsi, breadcrumb, dan tombol aksi). Jarak dan perataan lewat prop bernilai terbatas.
- **Formulir lengkap:** `Select`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`, `FileInput` (dengan pratinjau gambar dan terhubung ke `saveUpload`), `Fieldset`, input dengan awalan/akhiran (mis. "Rp"), tampilkan/sembunyikan kata sandi, serta tipe `time`, `datetime-local`, `month`, `range`, dan `color` di `Field`. Validasi dan pesan error tetap lewat `tryParse` seperti sekarang.
- **Tema** di `zentara.config.mjs` (`ui: { accent, radius, font, mode }`), sehingga warna dan font bisa diganti tanpa CSS. Default tetap brand Zentara.
- **Katalog komponen** untuk AI (id/en, dibuat otomatis dari sumber) dan galeri `/_zentara/ui` saat pengembangan. `zentara ui` mencetak katalog dan `zentara theme` mengatur tema.
- **Alur AI baru:** pilih komponen dari katalog, susun dengan primitif tata letak, lalu periksa dengan `view_page`. Bila kit belum cukup, AI menjelaskan batasnya dan menawarkan CSS khusus dengan persetujuan.

#### Tahap 12c · 0.12.7: navigasi, lapisan, umpan balik, dan tampilan data

- **Navigasi:** `Navbar` publik (dengan menu ponsel), `Breadcrumb`, `Tabs`, `Pagination` (link biasa; versi htmx di Tahap 13), `Steps`/`Stepper`, `DropdownMenu`, `BottomNav` untuk ponsel, dan `Footer`.
- **Lapisan:** `Dialog`, `ConfirmDialog`, `Drawer`/`Sheet`, `Popover`, dan `Tooltip`, memakai `<dialog>` dan `popover` bawaan browser.
- **Umpan balik:** `Toast` dan pesan flash dari session (mis. "Data tersimpan" setelah redirect), `Progress`, `Spinner`, dan `Skeleton`.
- **Tampilan data:** `DescriptionList` (detail satu data), `Accordion`, `Timeline`, `Tag`, `AvatarGroup`, `Stat` dengan tren naik/turun, `Rating`, `CodeBlock`, dan `Calendar` (tampilan bulan dan daftar acara, untuk booking dan jadwal).
- **Halaman aplikasi bawaan:** halaman 403, 404, dan 500 untuk produksi yang memakai tema aplikasi.

#### Tahap 12d · 0.12.8: halaman publik dan pola siap pakai

- **Halaman publik:** `Hero`, `FeatureGrid`, `MediaCard`, `Gallery`, `Pricing`, `Testimonial`, `FAQ`, `CTA`, `LogoCloud`, `TeamCard`, dan `ContactForm`.
- **Pola usaha:** `ProductCard`, `QuantityInput`, ringkasan keranjang, dan kartu harga dengan format Rupiah, sebagai titik awal toko dan pemesanan. Pembayarannya tetap plugin di Tahap 18.
- **Contoh halaman utuh** di katalog (landing, profil usaha, toko, jadwal booking, dasbor) yang dijadikan acuan AI dan juga tugas eval di Tahap 15.
- **Selesai bila:** AI smoke untuk "landing page toko kue", "halaman profil tim dengan foto", "halaman jadwal booking", dan "ubah warna utama jadi biru" selesai tanpa CSS atau `style` buatan AI, dan `view_page` lulus di desktop dan ponsel.

**Setelah 12d:** komponen yang butuh interaksi server (tabel dengan filter, urutkan, dan ubah langsung; pencarian `Combobox`; aksi massal) dikerjakan di Tahap 13 bersama htmx. Komponen berat yang butuh pustaka luar (editor teks, grafik, peta, pemilih rentang tanggal) tetap plugin di Tahap 18.

### Tahap 13 · 0.13: data dan panel admin

- htmx masuk inti, prop `hx` di kit UI, komponen baru untuk tabel, filter, dan formulir, serta menu bertanda. Panel admin memakai komponen dari Tahap 12b sampai 12d, ditambah komponen yang butuh server: `Combobox` dengan pencarian, tabel yang bisa diurutkan dan diubah langsung, serta aksi massal.
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

- **Tahap 12b sampai 12d:** kit UI lengkap, tema, dan komponen halaman publik membuat aplikasi tidak lagi harus terlihat seperti brand Zentara, tetap tanpa build step.
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
