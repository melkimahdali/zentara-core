# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/). Versi `zentara` dan `create-zentara` selalu dinaikkan bersamaan.

## [0.12.4]

### Ditambahkan
- **Uji e2e untuk pemakaian sungguhan**, supaya bug seperti di 0.12.2 ketahuan di CI (Ubuntu & Windows) sebelum rilis:
  - **CLI global:** zentara dipasang dengan `npm install -g` tanpa drizzle-orm. Setelah tabel dan route baru ditambahkan, `db:generate`, `db:migrate`, `routes`, dan `jobs` dijalankan dari CLI global di proyek api.
  - **Tool Zentara AI dari instalasi global:** `list_routes` langsung membaca route dan export schema baru di proses yang sama, `database generate/migrate` berjalan lewat zentara proyek, begitu juga tool `zentara jobs`.
  - **Alur interaktif:** pertama kali dibuka, bahasa ditanyakan lebih dulu dan disimpan. "Buat proyek baru" dengan nama berspasi menghasilkan folder aman, dependency terpasang, dan template berbahasa yang dipilih.
- `ZENTARA_CREATE_PACKAGE` dan `ZENTARA_CREATE_ARGS` untuk menguji "Buat proyek baru" dengan paket lokal.

## [0.12.3]

### Diperbaiki
- **Membuat proyek dari CLI interaktif tidak lagi "keluar" dari Zentara.** Sebelumnya layar Zentara ditutup dan terminal diserahkan ke `npm create zentara`, yang lalu menanyakan ulang semuanya di terminal biasa ("Ok to proceed?", template, dependency, OmniRoute). Sekarang:
  - nama folder dan template ditanyakan di dalam Zentara;
  - `create-zentara` dan `npm install` berjalan di latar belakang tanpa pertanyaan, dengan progres di spinner;
  - setelah selesai, Zentara langsung terbuka di proyek baru;
  - **Esc** membatalkan pembuatan proyek dan menghapus folder yang setengah jadi. Bila gagal, pesan error ditampilkan dan Anda tetap di Zentara.
- Nama folder proyek dibuat aman: spasi dan karakter lain menjadi `-` (mis. "hub tiket transportasi" menjadi `hub-tiket-transportasi`). Folder yang sudah berisi tidak ditimpa.
- **Pemilihan bahasa tetap ada:** saat `zentara` pertama kali dibuka (belum ada pilihan bahasa dari `ZENTARA_LANG`, `locale` di config, atau `zentara lang`), bahasa ditanyakan lebih dulu lalu disimpan ke `~/.zentara/settings.json`; *Buat proyek baru* juga menanyakan bahasa aplikasi (pilihan yang disorot adalah bahasa yang sedang dipakai).
- **Perintah database dari CLI global tidak lagi gagal karena drizzle-orm.** `zentara db:generate`, `db:migrate`, dan `db:seed`, termasuk yang dijalankan Zentara AI di terminal maupun di browser, kini otomatis memakai zentara milik proyek (`node_modules/zentara`), yang punya drizzle-orm dan drizzle-kit. Bila dependency proyek belum terpasang, pesannya jelas: jalankan `npm install`.
- **`list_routes` Zentara AI selalu membaca kode terbaru.** Route dimuat di proses baru, jadi route dan schema yang baru diubah (mis. tabel `bookings` baru) tidak lagi gagal dengan "does not provide an export named ..." karena cache modul lama.

### Ditambahkan
- **Tool `zentara` untuk Zentara AI**, supaya semua fungsi CLI bisa dijalankan AI (terminal dan browser) memakai zentara milik proyek:
  - `routes` dan `jobs` langsung jalan tanpa persetujuan;
  - `make:route`, `make:middleware`, `make:job`, dan `build` ditanyakan di mode ask, dan file buatan `make:*` bisa dibatalkan dengan `zentara undo`;
  - `jobs:run` selalu minta persetujuan.

  AI juga diinstruksikan untuk tidak lagi menyuruh developer menjalankan perintah ini sendiri.

## [0.12.2]

### Diperbaiki
- **Zentara AI memakai layout aplikasi yang sudah ada** saat diminta membuat halaman, bukan membuat tampilan sendiri.
  - Ringkasan proyek yang dikirim ke AI kini menyebut `src/app/lib/ui.ts` beserta ekspornya (`appPage`, `APP_NAME`, ...), satu halaman contoh yang sudah memakai `appPage()`, dan daftar route.
  - Instruksi AI mewajibkan `appPage()` untuk halaman user login dan `page()` untuk halaman publik, meminta membaca halaman serupa lebih dulu, menambahkan halaman baru ke menu `navFor()`, dan melarang `<html>`, `<style>`, CSS, atau navigasi buatan sendiri kecuali diminta.
  - Bila `write_file`/`edit_file` menulis route yang membuat dokumen HTML atau CSS sendiri, hasil tool memberi catatan agar AI langsung memperbaikinya.
- Template `api` dan `minimal` tidak lagi membawa folder `zenstyles/` (stylesheet lama bergaya berbeda yang tidak dipakai halaman mana pun dan membingungkan AI). `loadZenStyles()` ditandai usang tetapi tetap ada untuk proyek lama; di proyek lama, AI diberi tahu agar tidak memakainya.

### Ditambahkan
- Peta jalan: htmx masuk Tahap 12, dan katalog plugin opsional yang bisa ditawarkan Zentara AI sebagai pilihan masuk Tahap 15.

## [0.12.1]

### Diperbaiki
- **CLI interaktif tidak lagi menyisakan output lama.** Layar penuh kini memakai layar alternatif terminal (`\u001b[?1049h`), jadi output sebelumnya (mis. `npm create zentara` dan `npm install`) tidak terlihat dan tidak bisa digulir ke atas. Saat keluar, layar biasa kembali dan rekap percakapan dicetak ke scrollback. Proses lain yang dijalankan dari CLI (buat proyek, pasang OmniRoute) menulis ke layar biasa, dan layar penuh digambar ulang setelahnya.
- **Judul tab terminal** menjadi *zentara* selama CLI terbuka (Ink maupun `--classic`), lalu dikembalikan saat keluar.

### Diubah
- **Header berbingkai dengan logo** seperti Claude Code: logo Z kecil (teal dan emas), nama & versi, tagline, status AI, dan folder di kiri; tips perintah dan status server dev di kanan bila terminal cukup lebar. Terminal pendek memakai header ringkas dua baris.

## [0.12.0]

Tahap 10 (Bahasa Inggris) dan Tahap 11 (Back-End) dirilis bersama. Bahasa Indonesia tetap default; tidak ada perubahan perilaku untuk proyek yang sudah ada selain yang dicatat di bawah.

### Ditambahkan
- **Zentara dalam Bahasa Inggris.** Semua teks CLI (Ink dan klasik), `ai:setup`, Zentara AI, halaman sambutan/error/404, pesan error bawaan, kit UI `zentara/ui`, dan `create-zentara` tersedia dalam `id` dan `en`. Katalog bertipe: kunci yang hilang di salah satu bahasa menjadi error TypeScript.
  - Pilih dengan `zentara lang en` (global, `~/.zentara/settings.json`), `/lang en` di CLI interaktif, `locale: "en"` di `zentara.config.mjs`, atau env `ZENTARA_LANG`.
  - Zentara AI membalas dalam bahasa pengguna dan menulis teks aplikasi sesuai `locale` proyek. Deskripsi tool untuk model kini berbahasa Inggris.
  - Kit UI: `money()`, `formatNumber()`, dan `formatDate()` memakai `Intl` sesuai bahasa; `page({ lang })` untuk satu halaman.
  - `npm create zentara` menanyakan bahasa lebih dulu, atau `--lang en`. Template `api` dan `minimal` tersedia dalam dua bahasa dengan kode yang identik (dijaga oleh test).
  - Dokumentasi Bahasa Inggris di https://zentara-core.morixa.id/en/ dengan tombol pindah bahasa, README paket npm dua bahasa, dan catatan rilis Bahasa Inggris (`CHANGELOG.en.md`).
- **Job latar belakang & jadwal cron.** Setiap file di `src/app/jobs/` adalah satu job; masukkan ke antrean dengan `enqueue(nama, data, { delay, runAt, retries })`.
  - Antrean disimpan di SQLite (`data/jobs.db`), tahan restart dan aman dipakai beberapa proses; job yang gagal dicoba ulang dengan jeda 10 detik, 20 detik, ... sampai 1 jam.
  - `export const schedule = "0 7 * * *"` menjalankan job sesuai cron (5 kolom, nama hari/bulan, `@daily` dan sejenisnya), sekali per menit walau ada beberapa server.
  - CLI: `zentara make:job <nama> [--schedule]`, `zentara jobs [--json]`, `zentara jobs:run <nama> [--data]`. Config `jobs` dan env `ZENTARA_JOBS=off`.
  - Test: antrean di memori saat `NODE_ENV=test`, dan `jobs.drain()` menjalankan semua job yang sudah waktunya.
- **Email dengan `sendMail()`**: SMTP bawaan tanpa dependency (STARTTLS, `smtps://`, AUTH PLAIN/LOGIN), lampiran, cc/bcc. Diatur dengan `MAIL_URL`/`MAIL_FROM` atau config `mail`. Saat pengembangan email dicetak ke log dan disimpan di `.zentara/mail/`; saat test dikumpulkan di `outbox`; di produksi tanpa `MAIL_URL` melempar error.
- **Unggah file** dengan `readForm()` (multipart/urlencoded/JSON sebagai `FormData`) dan `saveUpload()`: nama file acak, tipe dari ekstensi, ekstensi berbahaya ditolak, isi gambar/PDF diperiksa, batas ukuran. `readInput()` kini juga membaca multipart.
- **Cache** di memori: `cache.get/set/has/delete/clear(prefix)` dan `cache.remember(key, ttl, fn)` (permintaan bersamaan hanya menghitung sekali), plus `MemoryCache` dengan TTL dan batas LRU.
- Template `api`: job `welcome-email` yang mengirim email sambutan setelah mendaftar, beserta testnya.
- Dokumentasi baru: Job & jadwal, Email, Unggah file, Cache, dan Bahasa.

### Diubah
- CLI klasik (`--classic`) kini berjalan di atas host yang sama dengan CLI Ink, jadi perilaku keduanya selalu sama.
- Template `api`: route hapus catatan menjadi `/notes/:id/delete`, dan pesan di URL memakai kode netral (`?msg=created`, `?new=1`) agar sama di kedua bahasa.
- README paket `zentara` dan `create-zentara` diringkas menjadi dua bahasa dan merujuk ke situs dokumentasi.

## [0.10.3]

### Diubah
- **CLI interaktif mengambil alih terminal seperti ruang chat.** Saat dibuka, layar dibersihkan (`\u001b[2J\u001b[0;0H`, aman untuk terminal cloud), lalu dibagi tiga seksi `<Box flexDirection="column">`:
  1. header terkunci berisi logo ringkas, versi, status AI dan server dev, folder, dan garis pembatas;
  2. log percakapan di tengah: pesan baru mendorong yang lama ke atas, **PgUp/PgDn** untuk menggulir, dan penanda jumlah pesan di atas/bawah layar;
  3. input di bawah: kotak input, menu, atau dialog persetujuan.

  Ink merender dengan `incrementalRendering` (hanya baris yang berubah ditulis ulang) dan frame satu baris lebih pendek dari terminal, sehingga layar tidak berkedip, termasuk di Windows. Hanya pesan yang terlihat yang dirender, jadi percakapan panjang tetap ringan. Saat keluar, seluruh percakapan dicetak ke scrollback. Terminal di bawah 12 baris atau output non-TTY memakai tata letak biasa; atur dengan `cli: { fullscreen: false }` atau `ZENTARA_FULLSCREEN=off`.
- **Keluar dengan anggun:** Esc atau Ctrl+C dua kali berturut-turut (tombol pertama menampilkan pengingat). Bila AI sedang bekerja, ada dialog, atau input berisi teks, tombol itu lebih dulu menghentikan AI, menutup dialog, atau mengosongkan input. Server dev dimatikan, sesi disimpan, lalu proses diakhiri dengan `process.exit` setelah output terkirim. `SIGTERM` dan `SIGHUP` (terminal ditutup, sesi cloud terputus) juga menutup CLI dengan rapi.
- **Template `api` kini netral, bukan aplikasi toko.** Contoh CRUD produk diganti **Catatan** milik user: tabel `notes`, API `/api/notes` (hanya catatan sendiri; catatan orang lain dijawab 404), dan halaman `/notes` dengan pencarian. README template menjelaskan cara menghapusnya untuk mulai dari kanvas kosong. Dasbor menampilkan ringkasan catatan dan ide untuk dibangun berikutnya. Contoh di CLI, halaman sambutan, instruksi AI, dan dokumentasi dibuat beragam (portofolio, blog, booking, buku tamu).

### Ditambahkan
- **Peta jalan** di dokumentasi (`peta-jalan.html`). Tahap berikutnya adalah **Tahap 10: dukungan Bahasa Inggris** (0.11), disusul Back-End, Data & admin, Testing, Deploy, dan 1.0.
- `Field` di kit UI menerima `type: "textarea"` (dengan `rows`) dan `maxlength`. Utilitas CSS baru: `.zu-block` dan `.zu-bullets`.
- `/clear` di layar penuh juga mengosongkan log.

### Diperbaiki
- CLI Ink:
  - timer pengingat dibersihkan saat komponen dilepas, dan penghubung `suspendTerminal` dilepas saat unmount (tidak ada setState setelah unmount);
  - error dari host saat mengirim permintaan ditampilkan sebagai pesan, bukan *unhandled rejection*;
  - menutup CLI berkali-kali hanya menutup host sekali;
  - menu panjang (mis. daftar model) dan pratinjau diff dibatasi setinggi layar;
  - tipe props komponen memakai `Key` dari Ink dan interface eksplisit.

## [0.10.2]

Desain ulang kit UI dan halaman bawaan agar terasa seperti produk jadi, bukan tampilan generik. Audit dan perbaikannya mengikuti skill desain *taste* dan *redesign* (MIT, dari Leonxlnx/taste-skill) yang kini ada di `.claude/skills/` repo ini.

### Diubah
- **Font brand Plus Jakarta Sans di-host sendiri** oleh framework di `/_zentara/fonts/` (latin dan latin-ext, lisensi SIL OFL). Sebelumnya font ini disebut di CSS tetapi tidak pernah dimuat, sehingga browser memakai font sistem.
- **Satu warna aksen**: UI memakai teal saja, sedangkan emas hanya dipakai di logo. Latar diberi cahaya teal lembut dan tekstur halus, dan mode gelap/terang disetel ulang.
- **`AppShell` memakai navigasi atas** menggantikan sidebar untuk menu yang sedikit. Menu aktif diberi garis bawah, avatar berbentuk *squircle*, dan konten punya lebar maksimum.
- **`AuthCard` bisa dibagi dua** lewat `aside: { title, text }`: panel brand di kiri, formulir di kanan.
- `Stat` kini berupa angka polos. Kelompokkan dengan `StatGroup` agar tampil sebagai satu strip berpemisah, bukan tiga kartu kembar.
- Label tabel dan formulir memakai huruf kalimat, bukan huruf kapital semua. Badge bersudut, bukan berbentuk pil.

### Ditambahkan
- Komponen baru: `StatGroup`, `Split`, `FormActions`, `List`, `Search`, dan `Disclosure`. Juga `Button` dengan `loading`, `Badge` dengan tone `warn`, `Field` dengan `inputmode`, dan kolom tabel dengan `align: "end"`.
- Status yang dulu belum ada:
  - saat formulir dikirim, tombol memuat (`aria-busy`, teks `loading`) sehingga tidak terkirim dua kali;
  - efek tekan pada tombol;
  - tampilan kosong yang menyarankan langkah berikutnya;
  - tautan "Lewati ke konten";
  - animasi masuk yang menghormati *reduced motion*.
- Halaman bawaan template `api`:
  - dasbor menampilkan strip ringkasan, stok menipis, dan tanggal hari ini;
  - daftar produk bisa dicari dan menandai stok yang habis atau menipis;
  - formulir tambah produk bisa dibuka-tutup;
  - teks halaman masuk, daftar, dan admin ditulis ulang agar lebih jelas.
- `scripts/brand/font.mjs` untuk membuat ulang modul font dari paket `@fontsource-variable/plus-jakarta-sans`.

## [0.10.1]

### Ditambahkan
- **Animasi logo saat CLI interaktif dibuka** (±1 detik). Logo Zentara Core tersapu muncul mengikuti arah goresan Z, dari kiri bawah ke kanan atas, dengan kilau Pearl di tepi sapuan. Motif emas Nusantara menyusul, lalu info versi, AI, dan folder muncul di akhir. Frame terakhir sama persis dengan logo diam.
- Mematikan animasi: `cli: { animation: false }` di `zentara.config.mjs`, atau env `ZENTARA_ANIMATION=off`. Animasi otomatis mati di CI.
- `terminalLogoFrame(depth, progress)` di `zentara/host` untuk tampilan lain.
- **Situs dokumentasi pindah ke https://zentara-core.morixa.id/** (GitHub Pages dengan domain kustom lewat Cloudflare).
  - Semua tautan dokumentasi (CLI, halaman sambutan, README, template, `homepage` paket) memakai domain baru; alamatnya disimpan di satu konstanta `DOCS_URL`.
  - Situs memuat `CNAME`, tautan kanonis, `sitemap.xml`, dan `robots.txt` untuk domain tersebut.
  - Halaman **Catatan rilis** dibuat otomatis dari CHANGELOG.md, dan lencana versi di header menautkannya.
  - Situs diterbitkan ulang setiap ada perubahan di `main` (serta saat GitHub Release terbit), sehingga versi, catatan rilis, dan dokumentasi selalu mengikuti versi terbaru.

## [0.10.0]

Tahap 9: Front-End, ditambah CLI berbasis Ink.

### Ditambahkan
- **Kit UI `zentara/ui`**: komponen HTML server-side bergaya brand Zentara Core. Warnanya teal/emas, otomatis mengikuti mode gelap/terang, responsif, dan tanpa JavaScript maupun build step.
  - Komponen: `page()`, `AuthCard`, `AppShell` (sidebar, navigasi, user, tombol keluar), `Card`, `Grid`, `Stat`, `Form`, `FormRow`, `Field` (label, error, aria), `Button`, `PostButton` (POST dengan konfirmasi), `Alert`, `Badge`, `Table`, `EmptyState`, `Avatar`, `Brand`, `rupiah()`.
  - Stylesheet, logo, dan favicon disajikan framework di `/_zentara/*`.
- **Halaman bawaan di template `api`**:
  - `/login` dan `/register`: validasi per field, pesan error, pembatasan percobaan hanya untuk POST, dan kembali ke halaman asal lewat `?next` (hanya path lokal).
  - `/logout` (POST) dan `/dashboard` (ringkasan dan produk terbaru).
  - `/admin/products`: tambah, ubah, dan hapus produk.
  - `/admin/users`.
  - Logika login dan daftar dipakai bersama oleh API JSON dan halaman.
- `tryParse(schema, value)` untuk formulir HTML: validasi tanpa melempar error, dengan pesan pertama per field.
- `requireAuth({ redirectTo: "/login" })` untuk halaman: tamu diarahkan ke `/login?next=…` (303), bukan dibalas 401.
- **CLI interaktif berbasis Ink** (bawaan paket `zentara`), bergaya Claude Code. Isinya:
  - logo dan info di atas;
  - jawaban AI yang mengalir dan dirender sebagai Markdown;
  - kotak input di bawah dengan riwayat dan saran perintah garis miring (Tab untuk melengkapi);
  - dialog menu, persetujuan, dan pertanyaan rahasia;
  - baris mode dan status server.

  Tampilan ini dipakai otomatis oleh `zentara`; `zentara --classic` memakai CLI klasik. Ink dan React kini menjadi dependency `zentara` (±25 MB), tetapi hanya dimuat saat CLI interaktif dibuka.
- `zentara/host`: inti CLI interaktif tanpa tampilan (`createReplHost`, `HostUI`, `HOST_API`), sehingga tampilan lain bisa memakai logika yang sama.
- Dokumentasi: grup baru **Front-End** dengan halaman *Kit UI*. Zentara AI kini diarahkan memakai kit UI dan `appPage()` saat membuat halaman.

### Diubah
- CI dan workflow Release menjalankan build sebelum typecheck.

## [0.9.0]

Tahap 8: arsitektur & keamanan Zentara AI.

### Ditambahkan
- **Jawaban AI mengalir (streaming)** di CLI interaktif, perintah `zentara "..."`, dan chat di browser. Didukung Claude (SSE resmi) dan semua server OpenAI-compatible (OmniRoute, OpenAI, Gemini, Groq, DeepSeek, OpenRouter, Ollama). Server yang tidak mendukung streaming dideteksi otomatis, lalu dipakai tanpa streaming. Antarmuka `AgentUI` mendapat event `assistantDelta`, sehingga tampilan lain bisa memakai mesin agen yang sama.
- **Percakapan tersimpan**:
  - otomatis disimpan di `.zentara/sessions/` (30 terbaru, izin baca pemilik saja);
  - `/resume` memilih percakapan untuk dilanjutkan;
  - `zentara --continue` langsung melanjutkan percakapan terakhir.
- **`/compact`** meringkas percakapan menjadi catatan singkat agar hemat token. Peringkasan juga berjalan otomatis saat percakapan melewati `ai.compactAt` (default ±60 ribu token), sehingga error 429 (batas token per menit) lebih jarang terjadi.
- **Tool `run_command`**: AI bisa menjalankan satu perintah terminal di folder proyek.
  - Perintah baca-saja (`git status/diff/log/show`, `ls`, `npm ls/outdated/view`, `npx tsc --noEmit`) langsung jalan.
  - Awalan di `ai.allowedCommands` ditanyakan seperti perubahan biasa.
  - Perintah lain adalah aksi krusial yang selalu ditanyakan.
  - Perintah dijalankan tanpa shell, jadi pipa, `&&`, pengalihan, dan `$VAR`/`%VAR%` ditolak.
  - Selalu ditolak: perintah admin, shell bersarang, kredensial (`npm publish`, `git push`, `git config`), argumen yang menyebut `.env`/file database, path di luar proyek, dan server/watch.
- **Sensor rahasia**: nilai variabel rahasia (dari environment dan `.env`) disembunyikan dari output perintah, `typecheck`/`test`, dan database sebelum dikirim ke provider AI.
- **Diff sebenarnya** saat meminta persetujuan: hanya baris yang berubah beserta 3 baris konteks dan nomor baris (format unified `@@ -a,b +c,d @@`). Berlaku di terminal dan browser. Menimpa file yang sudah ada kini juga ditampilkan sebagai diff.
- Opsi `zentara.config`: `ai.allowedCommands` dan `ai.compactAt`.

### Diubah
- `write_file` tidak lagi boleh menimpa file `.env` yang sudah ada (sama seperti `edit_file`), dan tidak meminta persetujuan bila isinya tidak berubah.
- Permintaan tanpa tools (mis. meringkas) tidak lagi mengirim daftar `tools` kosong, yang ditolak sebagian server.
- **Lisensi berganti dari MIT ke Business Source License 1.1** (`BUSL-1.1`) mulai versi 0.9.0. Zentara Core tetap gratis untuk membangun dan menjalankan aplikasi sendiri (termasuk produksi dan komersial); yang dilarang adalah menawarkannya sebagai framework, generator proyek, atau layanan pesaing. Setiap versi otomatis menjadi Apache 2.0 empat tahun setelah terbit. Versi yang sudah terbit (≤ 0.8.6) tetap berlisensi MIT.

## [0.8.6]

Penyelesaian Tahap 7 (brand & dokumentasi).

### Ditambahkan
- **Situs dokumentasi Zentara Core** (https://melkimahdali.github.io/zentara-core/): 18 halaman berbahasa Indonesia (mulai cepat, CLI interaktif, Zentara AI & OmniRoute, AI di browser, routing, context, middleware, validasi, view, database, auth, session, keamanan, konfigurasi, referensi CLI, deploy, brand) dan beranda. Bergaya brand (logo, teal/emas, mode gelap/terang), dengan sidebar, daftar isi, pencarian (tekan `/`), tombol salin kode, halaman sebelumnya/berikutnya, dan tautan "Perbaiki halaman ini". Sumber Markdown di `docs/`, dibangun dengan `npm run docs:build` memakai brand & highlighter dari paket zentara, dan diterbitkan otomatis ke GitHub Pages (`.github/workflows/docs.yml`).
- `npm run docs:serve` untuk pratinjau lokal; CI ikut membangun dokumentasi.

### Diubah
- Tautan "Dokumentasi" di halaman sambutan, CLI (*Buka dokumentasi*), README, template, dan `homepage` paket npm mengarah ke situs dokumentasi.

## [0.8.5]

### Diubah
- **CLI makin mirip Claude Code:** layar dibersihkan saat dibuka, info (versi, AI & mode, folder) sejajar atas di samping logo, dan **kolom input menempel di bagian bawah jendela** dengan baris mode di bawahnya.
- Instruksi Zentara AI dipertegas agar kode yang dibuat lolos typecheck: handler selalu bertipe `ZenContext`, status lewat `html()/json()/redirect()` (tidak ada `ctx.status`), operator Drizzle sebagai fungsi (`eq(kolom, nilai)`), dan form HTML dibaca lewat `validate`/`readInput`.
- **Wizard `ai:setup` memakai menu panah** (↑/↓ + Enter), di CLI interaktif maupun `zentara ai:setup`: pilih provider, **pilih model dari daftar** (terbaru di atas, plus *Model lain…* untuk mengetik sendiri), dan pertanyaan Ya/Tidak. Hanya API key, alamat server, dan nama model lain yang diketik. Terminal non-interaktif tetap memakai ketikan.

### Diperbaiki
- **Model OpenAI terbaru (`gpt-5.6-*`) dengan tools** ditolak di `/v1/chat/completions` karena reasoning ("Function tools with reasoning_effort are not supported"): Zentara otomatis mengulang dengan `reasoning_effort: "none"` sesuai saran API, lalu mengingatnya.
- **Rate limit sesaat (429 batas token/permintaan per menit)** tidak lagi langsung dianggap provider habis: Zentara menunggu sesuai `retry-after`/"try again in …" lalu mencoba lagi (maks. 4 kali). Kuota/kredit yang benar-benar habis tetap memicu fallback ke provider berikutnya.

## [0.8.4]

### Ditambahkan
- **Zentara memasang OmniRoute sendiri** (dengan konfirmasi), sehingga provider AI gratis siap tanpa langkah manual:
  - `npm create zentara` menawarkan *"Pasang OmniRoute sekarang?"* dan memasangnya setelah proyek dibuat;
  - CLI interaktif menawarkan **"Ya, pasang & jalankan"** bila OmniRoute belum terpasang, lalu menyalakannya di latar belakang;
  - `zentara ai:setup omniroute` memasang (bila perlu), menyalakan OmniRoute sementara untuk tes koneksi & daftar model, lalu menyimpan pengaturan.
- Perintah `/omniroute` di CLI interaktif: status, `install`, `start`, `stop`.
- Tutorial OmniRoute di README (pasang, jalankan, pakai, tambah provider gratis lewat dashboard). Pemeriksaan versi Node.js yang dibutuhkan OmniRoute (22.22+ / 24+).
- **Tampilan CLI gaya Claude Code:** logo Zentara Core di kiri dengan info versi, AI aktif & mode, serta folder di kanan; input di antara dua garis dengan status di kanan atas dan **baris mode di bawah** (Shift+Tab untuk mengganti mode persetujuan).
- **Layar sambutan** bila AI belum diatur: *OmniRoute (gratis)*, *Masukkan API key*, *Provider kustom*, *Lewati dulu*. Menu dua kolom (pilihan + keterangan) dengan pencarian.
- **`zentara` dari folder mana pun** (`npm install -g zentara`): di luar proyek muncul pilihan *Buat proyek baru* (lalu langsung membuka proyeknya), *Chat di folder ini*, *Buka dokumentasi*.
- `/login` sebagai alias `/setup`; `/setup <provider>` langsung ke provider tertentu.

### Diperbaiki
- OmniRoute dianggap "tidak tersedia" karena `/v1/models`-nya meminta API key (padahal chat dengan model `auto` tidak). Kini `ai:status`/`ai:setup` mengenali server yang berjalan dan tetap memakai model yang diatur.

### Keamanan
- OmniRoute yang dijalankan Zentara hanya mendengar di `127.0.0.1` (`OMNIROUTE_SERVER_HOST`). Bawaan OmniRoute terbuka di `0.0.0.0` tanpa API key, sehingga perangkat lain di jaringan bisa memakai kuota provider Anda.

## [0.8.3]

### Diubah
- **OmniRoute menjadi provider AI default** (gratis, tanpa API key): dicoba paling awal dengan model `auto`, lalu Claude, provider cloud yang key-nya terisi, dan Ollama. Urutan tetap bisa diubah lewat `ZENTARA_AI_ORDER` atau `ai:setup` ("Jadikan provider utama").
- `ai:setup`: OmniRoute di urutan pertama (Enter = OmniRoute), API key OmniRoute opsional, dan petunjuk pemasangan (`npm install -g omniroute`) bila server belum berjalan.

### Ditambahkan
- CLI interaktif menawarkan menjalankan **OmniRoute di latar belakang** (dengan konfirmasi) bila sudah terpasang tapi belum berjalan, dan mematikannya saat keluar. Bila belum terpasang, CLI menampilkan cara memasangnya dan memakai provider berikutnya.

## [0.8.2]

### Diubah
- Logo di banner CLI kembali memakai **logo asli lengkap dengan motif Nusantara**, kini diposterisasi ke warna brand flat (Zentara Teal / Heritage Gold) per sel, tanpa gradasi dan tanpa latar gelap, 48 kolom. Garis emas tebal dan motif terbaca jelas di terminal gelap maupun terang.
- Terminal sedang (±60–100 kolom): logo di atas, teks di bawahnya; terminal sempit tetap satu baris.

## [0.8.1]

### Diperbaiki
- Logo di banner CLI tampak kotor/berbintik (gradasi & motif Nusantara pecah pada ukuran terminal). Kini memakai versi flat sesuai pedoman brand untuk ukuran mikro: siluet Z asli, Zentara Teal + garis Heritage Gold yang dikunci ke grid sel (tanpa motif, tanpa gradasi), 24 kolom × 9 baris.
- Garis pemisah input CLI selebar terminal.

### Ditambahkan
- CLI interaktif memberi tahu bila ada versi `zentara` yang lebih baru, dicek langsung ke registry npm (tidak terpengaruh cache npm lokal), paling sering sekali sehari. Matikan dengan `ZENTARA_NO_UPDATE_CHECK=1` (otomatis mati di CI).

## [0.8.0]

### Ditambahkan
- **Identitas brand Zentara Core** (Concept C · Nusantara Tech) dari paket logo resmi, tanpa desain ulang:
  - Halaman sambutan, error, 404, status, dan chat Zentara AI memakai logo asli, wordmark "Zentara **Core**", tagline *Rooted here. Built for what's next.*, font Plus Jakarta Sans, dan warna brand (Zentara Teal, Heritage Gold, Core Obsidian, Pearl White, Muted Slate) untuk mode gelap dan terang.
  - Favicon resmi di halaman bawaan dan di template proyek baru (`public/favicon.ico`, `public/apple-touch-icon.png`).
  - Banner CLI dengan logo Z berwarna (dikonversi dari master logo, latar transparan) di CLI interaktif dan `zentara help`: logo + teks di terminal lebar, teks saja di terminal sedang, satu baris `Z> Zentara Core` di terminal sempit; menyesuaikan truecolor/256/16 warna dan menghormati `NO_COLOR`. Prompt menjadi `zentara >`.
  - `create-zentara` menampilkan header brand.
- `assets/brand/`: master logo, favicon multi-ukuran, logo ANSI/monokrom untuk terminal, dan catatan paket asli. `scripts/brand/generate.py` membuat aset ringan untuk framework dari master.

## [0.7.0]

### Ditambahkan
- **CLI interaktif gaya Claude Code** (`npx zentara` tanpa argumen): banner, percakapan berlanjut, indikator kerja dengan waktu, jawaban AI dengan markdown, tampilan tool `⏺ Tulis(...)` / `⎿`, diff berwarna, persetujuan lewat menu panah, **Esc untuk menghentikan AI**, Ctrl+C dua kali untuk keluar, riwayat input, dan perintah `/help`, `/mode`, `/dev`, `/logs`, `/open`, `/undo`, `/status`, `/setup`, `/clear`, `/exit`.
- **Server dev di latar belakang**: CLI interaktif menawarkan menjalankan `npm run dev` (selalu dengan konfirmasi), menyimpan lognya, menampilkan status/error server di baris status, dan mematikannya saat keluar. Server yang sudah berjalan di terminal lain dipakai. AI mendapat tool `dev_server` untuk membaca log (mencari error runtime) dan menyalakan server setelah disetujui. `--no-dev` untuk melewati.
- **Halaman error untuk pengembangan**: pesan, stack trace dengan potongan kode yang disorot, rantai `cause`, detail request (header rahasia disembunyikan), tombol salin, dan **✦ Tanya Zentara AI** untuk menjelaskan & memperbaiki error langsung dari browser. Halaman 404 pengembangan menampilkan route yang ada dan tombol "Buat halaman ini dengan Zentara AI". Aplikasi yang gagal boot tetap menampilkan halaman error di port-nya.
- **Halaman sambutan bawaan** (`welcomePage`, dipakai template baru): status aplikasi, daftar route, perintah penting, dan chat Zentara AI di halaman. Mode gelap/terang otomatis.
- Chat Zentara AI di browser lewat server devtools `zentara dev`: hanya di `127.0.0.1`, token per sesi, hanya dari halaman localhost, persetujuan dengan diff dan tombol Setujui/Tolak, tombol Berhenti, dan Batalkan perubahan (undo).
- Halaman status yang rapi untuk produksi (404, 500, dll.) tanpa detail internal.
- Opsi config `debug` (env `ZENTARA_DEBUG`); default aktif hanya saat `NODE_ENV=development`.
- `npm run release:approve` (repo): menyetujui rilis terbaru langsung dari CLI dengan ID stage dari run Release terakhir. Workflow Release menulis ID stage sebagai anotasi publik.

### Diubah
- `zentara dev` juga memantau seluruh folder aplikasi (route baru langsung aktif), `.env`, dan `zentara.config.mjs`.
- `ai:setup`: daftar model diurutkan dari yang terbaru, dan model non-chat (instruct, codex, embedding, dll.) tidak ditampilkan.
- Perintah AI satu kali (`zentara "..."`) memakai tampilan terminal yang baru.

### Diperbaiki
- `release:approve` tidak lagi diam saat log GitHub tidak bisa dibaca: pesan menjelaskan penyebabnya dan cara menyetujui manual (atau pakai `GITHUB_TOKEN`).

## [0.6.2]

### Ditambahkan
- `zentara ai:setup` interaktif: pilih provider, API key diketik tanpa terlihat, pilih model dari daftar akun, tes koneksi, simpan ke `.env` (izin 0600), dan opsi menjadikannya provider utama. `zentara ai:setup <provider>` langsung ke provider tertentu.
- Provider siap pakai: **OpenAI, Google Gemini, Groq, DeepSeek, OpenRouter** (selain Claude, OmniRoute, Ollama). Provider cloud otomatis masuk rantai fallback bila API key-nya ada di `.env`; urutan lewat `ZENTARA_AI_ORDER`; alamat API bisa diganti (`OPENAI_BASE_URL`, dll.).
- `scripts/ai-smoke.mjs` dan workflow manual **AI smoke test**: uji Zentara AI dengan provider sungguhan memakai API key dari secret GitHub.

### Diperbaiki
- Model OpenAI generasi baru menolak `max_tokens`: preset OpenAI memakai `max_completion_tokens`, dan adapter mencoba sekali dengan parameter lain bila server menolak parameter token.
- `ai:status` melaporkan bila model yang diatur tidak ada di akun provider.
- `PUBLISHING.md`: `npm stage` memakai `npm@11` (npm 12 butuh Node ≥ 24.15).

## [0.6.1]

### Diperbaiki
- `npm audit` di proyek baru kini bersih (0 vulnerabilities): versi `esbuild` yang dibawa `drizzle-kit` (lewat `@esbuild-kit/core-utils`) dipaksa ke versi aman dengan `overrides` di template `api`. `db:generate` tetap berfungsi dan kini ikut diuji di e2e.

### Diubah
- Rilis otomatis memakai **staged publishing**: workflow hanya menitipkan (`npm stage publish`) versi baru, yang baru tayang setelah pemilik menyetujuinya dengan 2FA (`npm stage approve`).
- GitHub Actions diperbarui ke `actions/checkout@v6` dan `actions/setup-node@v6` (Node 24).
- Workflow rilis hanya memakai `--provenance` bila repo GitHub publik (npm menolak provenance dari repo private).
- `scripts/e2e.mjs` mendukung format `npm pack --json` npm 12 (object, bukan array). CI menjalankan e2e Ubuntu dengan npm terbaru seperti workflow Release.

## [0.6.0] - Rilis awal di npm

### Ditambahkan
- Paket npm `zentara` (framework + CLI) dan `create-zentara` (`npm create zentara@latest`) dengan template `api` dan `minimal`.
- CLI `zentara dev` (auto-reload TypeScript), `zentara build`, `zentara start`.
- Import dari paket: `from "zentara"` dan `from "zentara/db"`.
- Workflow rilis otomatis (npm Trusted Publishing + provenance) dan uji simulasi publish (`npm run e2e`).
- Lisensi MIT.

### Diperbaiki (sebelum rilis)
- Windows: `create-zentara` (migrasi & seed setelah install) dan Zentara AI (`run_check` lewat `npm`) gagal karena path berspasi terpotong saat dijalankan lewat shell dan `npm.cmd` tidak bisa dijalankan tanpa shell. CI kini juga menjalankan e2e di Windows.

### Fitur yang sudah ada sejak tahap sebelumnya
- **Tahap 1:** routing berbasis file, respons & error handling, render HTML ter-escape, file statis, config.
- **Tahap 2:** middleware, cookie, session terenkripsi, CSRF, CORS, validasi Standard Schema, CLI dasar.
- **Tahap 3:** Zentara AI (bahasa sehari-hari, persetujuan ask/auto, undo, fallback Claude → OmniRoute → Ollama).
- **Tahap 4:** database Drizzle (SQLite `node:sqlite` / PostgreSQL), auth (scrypt, role, rate limit), AI yang paham database.
