---
title: Peta jalan
order: 5
group: Referensi
description: Tahapan pengembangan Zusantara Core menuju 1.0, termasuk dukungan Bahasa Inggris.
---

# Peta jalan

Zusantara Core dikembangkan per tahap. Setiap tahap dirilis sebagai versi minor baru dan dicatat di [catatan rilis](rilis.html). Urutan tahap yang belum selesai masih bisa berubah.

Zusantara adalah framework web umum, bukan framework untuk jenis aplikasi tertentu. Template bawaan hanya memberi titik awal yang netral (login, dasbor, pengguna, dan contoh CRUD Catatan), dan Anda bebas membangun apa saja di atasnya: blog, sistem booking, dasbor internal, API, portofolio, atau toko.

## Sudah dirilis

| Tahap | Versi | Isi |
|---|---|---|
| 1 | sebelum 0.6 | Fondasi core: routing berbasis file, respons dan error handling, render HTML ter-escape, file statis, config |
| 2 | sebelum 0.6 | Middleware, cookie, session terenkripsi, CSRF, CORS, validasi, CLI dasar |
| 3 | sebelum 0.6 | Zusantara AI: bangun aplikasi dengan bahasa sehari-hari, persetujuan, undo, fallback provider |
| 4 | sebelum 0.6 | Database Drizzle (SQLite dan PostgreSQL), auth, AI yang paham database |
| 5 | 0.6 | Paket npm `zusantara` dan `create-zusantara`, rilis otomatis dengan persetujuan 2FA |
| 6 | 0.7 | CLI interaktif gaya Claude Code, server dev di latar belakang, halaman error dan sambutan |
| 7 | 0.8 | Brand Zusantara Core dan situs dokumentasi |
| 8 | 0.9 | Arsitektur dan keamanan Zusantara AI: streaming, sesi tersimpan, `run_command` aman, diff |
| 9 | 0.10 | Front-End: kit UI `zusantara/ui`, halaman bawaan, dan CLI berbasis Ink |
| 10 | 0.12 | [Bahasa Inggris](bahasa.html): CLI, Zusantara AI, halaman bawaan, kit UI, template, dan dokumentasi dalam `id` dan `en` |
| 11 | 0.12 | Back-End: [job & jadwal](jobs.html), [email](email.html), [unggah file](upload.html), [cache](cache.html) |

Tahap 10 dan 11 dirilis bersama di 0.12.

## Berikutnya

| Tahap | Versi | Isi |
|---|---|---|
| 12 | 0.12.5 | Chat Zusantara AI di semua halaman saat pengembangan, dan AI bisa melihat halaman serta memeriksa tampilannya di desktop dan ponsel (`view_page`) |
| 12b | 0.12.6 | Fondasi tampilan dan formulir lengkap: tata letak, Select, Checkbox, Radio, Switch, unggah file, tema di config, dan katalog komponen |
| 12c | 0.12.7 | Navigasi, dialog, notifikasi, dan tampilan data: Navbar, Tabs, Pagination, Dialog, Toast, Accordion, Timeline, Calendar, halaman 403/404/500 |
| 12d | 0.12.8 | Halaman publik dan pola siap pakai: Hero, Pricing, Gallery, FAQ, Testimonial, ProductCard, keranjang, dan contoh halaman utuh |
| 12e | 0.12.9 | Alat pengembang: toolbar per request (query, N+1), mode inspeksi, skor halaman, varian tablet/gelap/en, tangkapan layar, rekaman langkah, input suara |
| 13 | 0.13 | Fondasi panel admin dengan [htmx](https://htmx.org): CRUD dari schema yang bisa dibuat ulang, urutkan/cari/filter, hak akses, dasbor admin, dan `zusantara describe --json` |
| 13b | 0.13.1 | Relasi, konten, dan alur kerja: many-to-many, CSV/Excel, log audit, revisi, draf dan terbit, SEO, media, persetujuan, otomasi, pengubah schema |
| 13c | 0.13.2 | Tampilan kalender/kanban/spreadsheet, tampilan tersimpan, hak akses per kolom dan baris, kelola pengguna, multi-tenant, API dan webhook, UU PDP |
| 13d | 0.13.3 | Template konten dan bisnis: Website Bisnis, Portofolio, Blog, Berita, Pemerintah, Penyedia Layanan, Statis, Publik |
| 13e | 0.13.4 | Template aplikasi dan transaksi: Toko Online, E-Learning, Berbagi Berkas, Mesin Pencari, Dinamis |
| 13f | 0.13.5 | Template komunitas dan akses: Media Sosial, Intranet, Ekstranet, PWA, SPA |
| 14 | 0.14 | Zusantara untuk semua agen AI: `zusantara mcp`, `search_docs`, tool runtime, klien MCP, indeks kode, OpenAPI, aturan dan biaya AI, `AGENTS.md`, `llms.txt` |
| 14b | 0.14.1 | AI yang merencanakan dan melihat: mode rencana, titik simpan per tugas, edit visual, gambar atau desain jadi halaman |
| 15 | 0.15 | Testing dan eval AI: helper uji, factory, fake, database per tes, `--watch`, alur bug jadi tes, eval yang diterbitkan |
| 15b | 0.15.1 | Tes browser dan performa: `--browser`, aksesibilitas, rekam tes, regresi visual, `zusantara ci github`, benchmark |
| 15c | 0.15.2 | Tes keamanan dan kualitas tes: fuzz dari schema, uji keamanan otomatis, mutation testing |
| 16 | 0.16 | Runtime portabel: inti `app.fetch()` standar dan paket produksi ringan tanpa CLI/AI |
| 17 | 0.17 | Deploy satu perintah: Docker, PM2, Vercel, dan Cloudflare (eksperimental) |
| 18 | 0.18 | Katalog plugin resmi, termasuk pembayaran Midtrans/Xendit sejak awal |
| 19 | 1.0 | Stabil: API beku, audit keamanan, CSP bawaan, kebijakan rilis dan LTS, panduan migrasi |

Item bertanda **[menunggu keputusan]** di bawah memakai rekomendasi saat ini dan masih bisa berubah.

### Tahap 12 · 0.12.5: chat di semua halaman dan `view_page`

Tujuannya: Zusantara AI bisa dipanggil dari halaman mana pun saat pengembangan, dan bisa **melihat sendiri** hasil halaman yang ia buat, termasuk apakah tampilannya rapi. Tahap ini juga menyiapkan fondasi untuk kit UI di Tahap 12b dan eval AI di Tahap 15, supaya tahap itu tidak perlu membongkar ulang Tahap 12.

**Widget chat**
- Disisipkan ke setiap respons HTML hanya bila tiga syarat terpenuhi: `config.debug`, devtools berjalan, dan server dijalankan oleh `zusantara dev` atau CLI interaktif. `zusantara start` dan produksi tidak pernah memuatnya, dan aset `/_zusantara/dev/*` mengembalikan 404 di produksi.
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
- `zusantara view <url> [--mobile]` mencetak hasil yang sama di terminal, dan CLI interaktif menampilkan hasil `view_page` seperti tool lain.
- Semua teks widget, tool, dan pemeriksaan tampilan tersedia dalam Bahasa Indonesia dan Bahasa Inggris.

**Selesai bila**
- Unit: syarat penyisipan widget, penyaringan data rahasia, setiap jenis pemeriksaan tampilan pada halaman contoh yang sengaja dibuat rusak, dan `expect`.
- e2e: di proyek hasil scaffold, `zusantara dev` menyisipkan widget dan `zusantara start` tidak; `zusantara view /login` dan `zusantara view /login --mobile` lulus tanpa temuan; halaman contoh yang rusak menghasilkan temuan yang benar.
- AI smoke (manual/terjadwal): permintaan "tambahkan halaman X" diakhiri dengan `view_page` yang lulus di desktop dan mobile.

### Kit UI lengkap: Tahap 12b, 12c, dan 12d

Kit UI `zusantara/ui` saat ini punya sekitar 25 komponen, hampir semuanya untuk dasbor dan formulir sederhana. Bahkan `Field` belum punya pilihan (`select`), kotak centang, radio, sakelar, atau unggah file. Karena Zusantara AI dilarang menulis CSS sendiri, setiap komponen yang tidak ada berarti tampilan yang tidak bisa dibuat AI. Tiga tahap berikut melengkapi kit UI sebelum panel admin, dan dikerjakan berurutan dengan satu PR per tahap.

**Aturan untuk setiap komponen baru** (berlaku di 12b, 12c, 12d, dan tahap sesudahnya):
- Dirender di server dan tetap berfungsi tanpa JavaScript. JavaScript kecil bawaan hanya menambah kenyamanan (mis. menutup dialog dengan Esc).
- Teks bawaan tersedia dalam Bahasa Indonesia dan Bahasa Inggris, mendukung mode terang dan gelap, dan mengikuti tema dari `zusantara.config.mjs`.
- Aksesibel: elemen HTML yang tepat, label, fokus keyboard, dan kontras yang cukup.
- Masuk katalog komponen (contoh dan kegunaan untuk AI) serta galeri `/_zusantara/ui`.
- Punya tes unit (render id/en, escape, tanpa JS) dan lolos pemeriksaan tampilan `view_page` di desktop dan ponsel.

#### Tahap 12b · 0.12.6: fondasi tampilan dan formulir lengkap

- **Tata letak:** `Container`, `Stack`, `Row`/`Cluster`, `Columns`, `Section`, `Divider`, dan `PageHeader` (judul, deskripsi, breadcrumb, dan tombol aksi). Jarak dan perataan lewat prop bernilai terbatas.
- **Formulir lengkap:** `Select`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`, `FileInput` (dengan pratinjau gambar dan terhubung ke `saveUpload`), `Fieldset`, input dengan awalan/akhiran (mis. "Rp"), tampilkan/sembunyikan kata sandi, serta tipe `time`, `datetime-local`, `month`, `range`, dan `color` di `Field`. Validasi dan pesan error tetap lewat `tryParse` seperti sekarang.
- **Tema** di `zusantara.config.mjs` (`ui: { accent, radius, font, mode }`), sehingga warna dan font bisa diganti tanpa CSS. Default tetap brand Zusantara.
- **Katalog komponen** untuk AI (id/en, dibuat otomatis dari sumber) dan galeri `/_zusantara/ui` saat pengembangan. `zusantara ui` mencetak katalog dan `zusantara theme` mengatur tema.
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

**Setelah 12d:** komponen yang butuh interaksi server (tabel dengan filter, urutkan, dan ubah langsung; pencarian `Combobox`; aksi massal) dikerjakan di Tahap 13 dan 13b bersama htmx. Komponen berat yang butuh pustaka luar (editor teks, grafik, peta, pemilih rentang tanggal) tetap plugin di Tahap 18.

### Tahap 12e · 0.12.9: alat pengembang

Dibandingkan dengan Django Debug Toolbar, Laravel Telescope, Lighthouse, Sentry, dan inspector Vite/Svelte. Semua alat ini hanya ada saat pengembangan, dan semua datanya bisa dibaca Zusantara AI.

- **Toolbar dev per request:** waktu proses, daftar query database beserta waktunya, deteksi query N+1, isi session, dan log.
- **Mode inspeksi:** arahkan kursor ke elemen di halaman, lalu muncul file dan baris kode yang membuatnya.
- **Skor halaman** di `view_page`: waktu muat, ukuran halaman, jumlah request, gambar tanpa `alt`, meta SEO yang hilang, dan aksesibilitas dasar.
- **Varian pemeriksaan:** `view_page` bisa memeriksa tablet, mode gelap, dan bahasa `en` selain desktop dan ponsel.
- **Tangkapan layar piksel** untuk provider AI yang bisa membaca gambar, selain struktur DOM.
- **Rekaman langkah pengguna** sebelum error (klik, isi form, navigasi) yang ikut dikirim ke AI supaya bug bisa diulang.
- **Muat ulang otomatis** semua tab yang terbuka setelah file berubah dan server dev siap.
- **Input suara** di widget, dengan Bahasa Indonesia dan Bahasa Inggris.

### Panel admin: Tahap 13, 13b, dan 13c

Dibandingkan dengan Django Admin, Laravel Filament/Nova, Rails Avo, Airtable/NocoDB, Directus/Strapi, Retool/Metabase, Supabase Studio, dan Odoo/Salesforce. Panel admin harus cocok untuk jenis website apa pun, bukan hanya toko.

#### Tahap 13 · 0.13: fondasi data dan panel admin

- htmx masuk inti, prop `hx` di kit UI, dan menu bertanda. Panel admin memakai komponen dari Tahap 12b sampai 12d, ditambah komponen yang butuh server: `Combobox` dengan pencarian dan tabel yang bisa diurutkan dan diubah langsung.
- `zusantara make:admin` membuat halaman admin dari schema database, dan **bisa dijalankan ulang** setelah schema berubah tanpa menimpa kode yang sudah Anda ubah (hanya blok bertanda yang diperbarui).
- Daftar data dengan urutkan kolom, pencarian di beberapa kolom, dan filter per tipe data (rentang tanggal, enum, boolean).
- Kolom gambar dan file otomatis memakai `FileInput` dengan pratinjau.
- Hak akses per tabel dan per aksi (lihat, tambah, ubah, hapus) berdasarkan role.
- Dasbor admin otomatis: jumlah data per tabel dan data terbaru.
- Satu permintaan AI dikerjakan utuh, mis. "tambah kolom status ke produk": schema, migrasi, admin, tes, lalu dicek dengan `view_page`.
- `zusantara describe --json` mencetak manifest aplikasi (route, tabel dan kolom, halaman admin, job, plugin) tanpa kolom rahasia. Manifest ini dipakai Zusantara AI sebagai konteks awal dan menjadi tool utama `zusantara mcp`.

#### Tahap 13b · 0.13.1: relasi, konten, dan alur kerja

- **Relasi:** many-to-many (pilihan ganda) dan data anak langsung di halaman induk, mis. item pesanan di halaman pesanan.
- **Data massal:** aksi massal, ekspor dan impor CSV, dan impor Excel dengan pencocokan kolom.
- **Jejak data:** log audit (siapa mengubah apa), hapus lunak dengan tombol pulihkan, dan riwayat revisi per data dengan diff.
- **Konten:** status draf, terbit, dan terjadwal dengan pratinjau; slug otomatis dan kolom SEO; pustaka media; konten dua bahasa per data; dan halaman pengaturan tunggal (nama situs, kontak, jam buka).
- **Alur kerja:** status dengan aturan transisi dan persetujuan, catatan internal per data, aksi khusus yang menjalankan job, serta cetak dan ekspor PDF per data.
- **Otomasi** ala Airtable/Zapier: "bila data X dibuat atau berubah, kirim email, webhook, atau jalankan job". Bisa dibuat lewat AI.
- **Filter dengan bahasa sehari-hari**, mis. "pesanan bulan ini di atas 1 juta", yang diubah AI menjadi filter biasa.
- **Pengubah schema dari panel admin:** buat tabel dan kolom lewat UI, lalu Zusantara membuat schema Drizzle dan migrasinya dengan persetujuan.

#### Tahap 13c · 0.13.2: tampilan, pengguna, dan integrasi

- **Tampilan selain tabel:** kalender untuk data bertanggal, papan kanban untuk data berstatus (pindah status lewat seret), data bertingkat (kategori, menu) dengan urutan yang bisa diatur, dan tabel ala spreadsheet (edit dengan keyboard, kelompokkan, total dan rata-rata).
- **Tampilan tersimpan** per pengguna (filter, kolom, urutan) yang bisa dibagikan, serta laporan dan grafik sederhana dari tabel tanpa pustaka luar.
- **Hak akses lanjutan:** per kolom dan aturan per baris (mis. hanya pemilik data), seperti RLS di Supabase.
- **Kelola pengguna:** undang, reset kata sandi, nonaktifkan, dan masuk sebagai pengguna (dengan log).
- **Multi-tenant:** data terpisah per organisasi untuk aplikasi SaaS.
- **Integrasi:** API JSON otomatis per tabel dengan hak akses yang sama, dan webhook saat data berubah.
- **Kepatuhan UU PDP:** ekspor dan hapus data pribadi per pengguna, serta log persetujuan.
- **Operasional:** cadangan dan pemulihan database, penanda "sedang diedit oleh X" dan pencegahan saling timpa, serta palet perintah (Ctrl+K) dan pintasan keyboard.

### Template per jenis website: Tahap 13d, 13e, dan 13f

Saat ini `npm create zusantara` hanya punya template umum `api` dan `minimal` (keduanya tetap ada). Tiga tahap ini menambah 18 template per jenis website, dipakai lewat `npm create zusantara -- --template <nama>` atau dipilih dari CLI interaktif dan Zusantara AI.

Setiap template berisi: contoh halaman utuh yang memakai kit UI, data contoh (seed), panel admin dari Tahap 13–13c, tes, e2e scaffold, `AGENTS.md`, dan teks Bahasa Indonesia serta Bahasa Inggris. Contoh halamannya juga menjadi tugas eval di Tahap 15.

#### Tahap 13d · 0.13.3: konten dan bisnis

- `bisnis` (Website Bisnis): beranda, layanan, tentang, tim, testimoni, dan kontak.
- `portofolio`: proyek, galeri, profil, dan formulir kontak.
- `blog`: artikel, kategori, tag, komentar, dan RSS.
- `berita`: rubrik, berita utama, penulis, arsip, dan berita terpopuler.
- `pemerintah`: profil instansi, layanan publik, pengumuman, dokumen publik, dan pengaduan.
- `layanan` (Penyedia Layanan): daftar layanan, harga, booking jadwal, dan status pesanan.
- `statis`: situs tanpa database yang diekspor menjadi file HTML. Menambah **`zusantara build --static`** di inti.
- `publik`: portal organisasi atau komunitas dengan acara, pengumuman, formulir, dan donasi.

#### Tahap 13e · 0.13.4: aplikasi dan transaksi

- `toko` (Toko Online): katalog, keranjang, checkout, pesanan, dan stok. Pembayaran lewat plugin Tahap 18.
- `elearning`: kursus, materi, kuis, progres belajar, dan sertifikat.
- `berbagi-berkas`: unggah, folder, tautan berbagi dengan masa berlaku, dan kuota.
- `mesin-pencari`: indeks konten, halaman hasil, dan saran pencarian. Menambah **pencarian teks penuh** di inti (SQLite FTS5 dan PostgreSQL).
- `dinamis`: aplikasi berbasis data umum dengan login, sebagai titik awal aplikasi apa pun.

#### Tahap 13f · 0.13.5: komunitas dan akses

- `sosial` (Media Sosial): profil, ikuti, feed, suka, komentar, dan notifikasi. Menambah **notifikasi realtime** (Server-Sent Events) di inti.
- `intranet`: wajib login, direktori pegawai, pengumuman, dokumen, dan cuti.
- `ekstranet`: portal mitra atau klien dengan role mitra, berbagi dokumen, dan tiket.
- `pwa`: bisa dipasang di ponsel dan tetap jalan saat offline. Menambah **manifest, service worker, dan mode offline** di inti.
- `spa`: navigasi tanpa muat ulang halaman lewat htmx, tetap tanpa build step. Island React/Preact tetap plugin di Tahap 18.

### Agen AI: Tahap 14 dan 14b

Dibandingkan dengan Laravel Boost, MCP devtools Next.js, Cursor, Devin, Replit Agent, Lovable, v0, ASP.NET, dan Spring.

#### Tahap 14 · 0.14: Zusantara untuk semua agen AI

Pengembang yang memakai Claude Code, Cursor, atau agen lain tetap mendapat pengalaman terbaik di proyek Zusantara, dengan aturan keamanan yang sama seperti Zusantara AI. **[menunggu keputusan: MCP dimajukan ke tahap ini]**

- `zusantara mcp`: server MCP dengan tool baca (`describe`, `list_routes`, `view_page`, baca dan cari file, log server dev) dan tool ubah (`make:*`, `db:generate`, `db:migrate`, tulis dan edit file). Batas path, larangan `.env` dan file database, serta aksi krusial sama dengan Zusantara AI, dan setiap perubahan bisa dibatalkan dengan `zusantara undo`.
- `search_docs`: mencari dokumentasi Zusantara yang sesuai versi terpasang, supaya agen tidak memakai API lama.
- Tool runtime: error terakhir dengan stack trace, log request, status job, email yang terkirim saat dev, dan query database baca-saja dengan kolom rahasia disamarkan.
- Menjalankan potongan kode di konteks aplikasi (seperti `tinker` Laravel), selalu dengan persetujuan.
- Zusantara AI bisa memakai server MCP lain (mis. GitHub, Figma).
- Indeks kode proyek supaya AI tetap akurat di proyek besar.
- OpenAPI dan klien bertipe dibuat otomatis dari route, plus diagram arsitektur dari `zusantara describe`.
- File aturan AI per proyek (apa yang boleh dan tidak boleh dilakukan AI), batas biaya per tugas, log audit semua aksi agen, dan tampilan biaya token per tugas.
- `AGENTS.md` (dan `CLAUDE.md` pendek) di semua template dalam dua bahasa. `zusantara agents` menambahkannya ke proyek lama.
- `llms.txt` dan `llms-full.txt` dibuat otomatis untuk situs dokumentasi.

#### Tahap 14b · 0.14.1: AI yang merencanakan dan melihat

- **Mode rencana:** untuk tugas besar, AI menampilkan rencana langkah dulu dan baru mengerjakan setelah disetujui.
- **Titik simpan per tugas** lewat git, jadi satu tugas besar bisa dibatalkan sekaligus.
- **Edit visual:** klik elemen di halaman lewat widget lalu minta "ubah ini", dan AI langsung tahu elemen dan filenya.
- **Gambar atau desain jadi halaman:** unggah tangkapan layar atau sketsa, lalu AI menyusunnya dengan kit UI.

### Testing: Tahap 15, 15b, dan 15c

Dibandingkan dengan Laravel (Pest, Dusk, fake), Rails (system test), AdonisJS (Japa), Spring Boot (Testcontainers), ASP.NET, Phoenix (sandbox database), Go (fuzzing bawaan), Playwright, dan Stryker.

#### Tahap 15 · 0.15: testing dan eval AI

- `zusantara/testing`: `testApp()`, `loginAs`, factory data uji, dan `zusantara test --coverage`. Zusantara AI dan generator ikut menulis tes.
- Fake untuk email, job, unggahan, request HTTP keluar, dan waktu (lompat ke tanggal tertentu).
- Database terisolasi per tes, tes paralel, dukungan PostgreSQL, dan database asli lewat Docker (seperti Testcontainers).
- `zusantara test --watch` dan menjalankan hanya tes yang terdampak perubahan.
- **Alur "bug jadi tes":** setiap laporan bug ditulis dulu sebagai tes yang gagal, baru diperbaiki.
- Eval AI: tugas standar pada template `api` dan template per jenis website, dinilai otomatis (typecheck, tes, `view_page`, aksi terlarang, jumlah langkah, token). Respons model bisa direkam supaya eval jalan di CI tanpa API key. Hasilnya diterbitkan per versi di situs dokumentasi.

#### Tahap 15b · 0.15.1: tes browser dan performa

- `zusantara test --browser` (Playwright opsional): isi form, klik, tangkapan layar otomatis saat gagal, dan pemeriksaan tampilan `view_page` sebagai assertion.
- Pemeriksaan aksesibilitas dasar sebagai assertion.
- **Rekam tes dari browser:** klik-klik di halaman lewat widget, lalu jadi file tes.
- Regresi visual: tangkapan layar dibandingkan dengan versi sebelumnya.
- `zusantara ci github` membuat workflow GitHub Actions untuk proyek pengguna.
- `zusantara bench` untuk performa aplikasi pengguna, dan benchmark framework dibandingkan Express dan Fastify di CI supaya tahap berikutnya tidak membuat Zusantara lebih lambat.

#### Tahap 15c · 0.15.2: tes keamanan dan kualitas tes

- **Fuzz otomatis** dari schema validasi: setiap route diuji dengan input acak dan tidak valid.
- **Uji keamanan otomatis:** route tanpa auth, CSRF, header keamanan, injeksi, dan akses ke data milik pengguna lain.
- **Mutation testing** untuk mengukur apakah tes (termasuk buatan AI) benar-benar menangkap bug, bukan sekadar lulus.

### Tahap 16 · 0.16: runtime portabel dan paket produksi ringan

Zusantara berjalan di Node, Bun, Deno, Vercel, dan Cloudflare dari satu kode.

- `app.fetch(request)` dengan `Request`/`Response` standar menjadi inti runtime, dan server Node menjadi adapter tipis di atasnya. **[menunggu keputusan: lapisan fetch]**
- `zusantara build` menulis manifest route, supaya platform tanpa akses folder tetap bisa melayani route.
- Paket `zusantara` hanya berisi runtime, UI, database, dan testing; CLI dan AI pindah ke `@zusantara/cli`, yang tetap terpasang lewat `npm install -g zusantara`. **[menunggu keputusan: pemisahan paket]**
- Header keamanan default (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS di produksi).
- Aplikasi yang sudah ada tetap jalan tanpa perubahan kode.

### Tahap 17 · 0.17: deploy satu perintah

- `zusantara deploy:check` dan `zusantara deploy <target>`. Docker dan PM2 wajib, Vercel penuh, Cloudflare eksperimental.
- Vercel dan Cloudflare memakai `app.fetch()` dari Tahap 16, dan image Docker hanya memakai paket runtime sehingga lebih kecil.
- Zusantara AI hanya boleh `--dry-run`; pengiriman ke server selalu meminta persetujuan Anda. Setelah deploy, URL kesehatan diperiksa dan hasilnya ditampilkan.

### Tahap 18 · 0.18: katalog plugin

- `zusantara add <plugin>` dengan lima plugin pertama: Tailwind, grafik (Chart.js), PostgreSQL, login GitHub/Google, dan pembayaran Midtrans/Xendit.
- Menyusul di 0.18.x: editor teks, peta, island React/Preact, WhatsApp, dan format lokal (Rupiah, NPWP, e-Faktur). Subagent dan language server menyusul di 0.18.x atau setelah 1.0.
- Lisensi sudah ditetapkan: MIT mulai 0.12.10, dengan nama dan logo diatur terpisah di TRADEMARKS.md.

### Tahap 19 · 1.0: stabil

- API dibekukan dan dicatat, audit keamanan (termasuk `zusantara mcp` dan plugin pembayaran), dan CSP bawaan.
- Dokumentasi lengkap dua bahasa dengan tutorial yang diuji e2e, kebijakan rilis dan LTS, `CONTRIBUTING.md`, dan dokumentasi arsitektur.
- Panduan migrasi dari Express dan dari Laravel.
- Eval AI dan benchmark versi 1.0 diterbitkan, dan lisensi MIT tercantum di README dan `package.json`.

## Integrasi framework lain

Zusantara tetap memakai satu sistem tampilan, yaitu kit UI `zusantara/ui`, supaya semua halaman (termasuk yang dibuat Zusantara AI) seragam dan tanpa build step.

- **Tahap 12b sampai 12d:** kit UI lengkap, tema, dan komponen halaman publik membuat aplikasi tidak lagi harus terlihat seperti brand Zusantara, tetap tanpa build step.
- **Tahap 13:** [htmx](https://htmx.org) masuk inti untuk paginasi, filter, dan simpan formulir tanpa memuat ulang halaman. Server tetap mengirim HTML.
- **Tahap 14:** agen AI lain (Claude Code, Cursor, dan klien MCP lainnya) bisa bekerja di proyek Zusantara lewat `zusantara mcp` dan `AGENTS.md`.
- **Tahap 18:** Tailwind, grafik, editor teks, peta, pembayaran, login Google/GitHub, dan "island" React/Preact menjadi plugin opsional dari katalog resmi (`zusantara add <plugin>`). Zusantara AI hanya menawarkannya sebagai pilihan saat permintaan memang membutuhkannya, dengan opsi "tanpa plugin" sebagai default, dan pemasangannya selalu meminta persetujuan.

## Tahap 10: Bahasa Inggris (selesai)

Tujuannya agar Zusantara bisa dipakai penuh dalam Bahasa Indonesia **atau** Bahasa Inggris, tanpa mengubah perilaku bagi pengguna yang sudah ada. Bahasa Indonesia tetap menjadi default.

Tahap ini dikerjakan sebelum Back-End, jadi fitur di Tahap 11 sampai 19 langsung ditulis dalam dua bahasa.

1. **Fondasi i18n di core**
   - Katalog pesan `id` dan `en` serta fungsi `t()` yang bertipe (kunci yang salah menjadi error TypeScript).
   - Bahasa dipilih lewat `zusantara.config.mjs` (`locale: "en"`), env `ZUSANTARA_LANG`, atau `zusantara lang en`.
2. **CLI dan Zusantara AI**
   - Semua teks CLI klasik, CLI Ink, `ai:setup`, dan pesan error diambil dari katalog.
   - Zusantara AI menjawab dalam bahasa pengguna, dan instruksi sistemnya tersedia dalam Bahasa Inggris.
3. **Halaman bawaan framework**
   - Halaman sambutan, halaman error dan 404 pengembangan, serta halaman status produksi.
   - Pesan default `HttpError` dan validasi.
4. **Kit UI `zusantara/ui`**
   - Teks bawaan seperti "Lewati ke konten", "Keluar", "Cari…", dan "Belum ada data" mengikuti `page({ lang })`.
   - Format angka, mata uang, dan tanggal memakai `Intl` sesuai bahasa.
5. **Pembuat proyek dan template**
   - `npm create zusantara` menanyakan bahasa (atau `--lang en`).
   - Template `api` dan `minimal` tersedia dalam dua bahasa: teks halaman, pesan validasi, README, dan test.
6. **Dokumentasi**
   - Situs dokumentasi Bahasa Inggris di `/en/` dengan tombol pindah bahasa.
   - README paket npm dalam dua bahasa, dan catatan rilis Bahasa Inggris mulai 0.12.
7. **Pengujian**
   - Test memastikan setiap kunci katalog ada di kedua bahasa.
   - e2e menjalankan alur utama dalam `id` dan `en`.
