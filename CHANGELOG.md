# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/). Versi `zentara` dan `create-zentara` selalu dinaikkan bersamaan.

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
