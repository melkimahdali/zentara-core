# Changelog

Format mengikuti [Keep a Changelog](https://keepachangelog.com/id/1.1.0/). Versi `zentara` dan `create-zentara` selalu dinaikkan bersamaan.

## [0.6.0] - Rilis awal di npm

### Ditambahkan
- Paket npm `zentara` (framework + CLI) dan `create-zentara` (`npm create zentara@latest`) dengan template `api` dan `minimal`.
- CLI `zentara dev` (auto-reload TypeScript), `zentara build`, `zentara start`.
- Import dari paket: `from "zentara"` dan `from "zentara/db"`.
- Workflow rilis otomatis (npm Trusted Publishing + provenance) dan uji simulasi publish (`npm run e2e`).
- Lisensi MIT.

### Fitur yang sudah ada sejak tahap sebelumnya
- **Tahap 1:** routing berbasis file, respons & error handling, render HTML ter-escape, file statis, config.
- **Tahap 2:** middleware, cookie, session terenkripsi, CSRF, CORS, validasi Standard Schema, CLI dasar.
- **Tahap 3:** Zentara AI (bahasa sehari-hari, persetujuan ask/auto, undo, fallback Claude → OmniRoute → Ollama).
- **Tahap 4:** database Drizzle (SQLite `node:sqlite` / PostgreSQL), auth (scrypt, role, rate limit), AI yang paham database.
