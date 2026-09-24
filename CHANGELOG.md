# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/). Versi `zentara` dan `create-zentara` selalu dinaikkan bersamaan.

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
