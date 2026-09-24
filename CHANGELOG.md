# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/). Versi `zentara` dan `create-zentara` selalu dinaikkan bersamaan.

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
