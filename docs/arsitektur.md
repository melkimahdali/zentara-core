---
title: Arsitektur
order: 6
group: Referensi
description: Peta kode Zentara Core untuk kontributor: paket, runtime, CLI, Zentara AI, dan alur pengembangan.
---

# Arsitektur

Halaman ini untuk Anda yang ingin memahami atau mengubah kode Zentara Core. Untuk memakai framework, mulai dari [Mulai cepat](mulai-cepat.html). Kontrak perilaku yang dijaga (dan dianggap *breaking change* bila berubah) ada di [`CORE_SPEC.md`](https://github.com/melkimahdali/zentara-core/blob/main/CORE_SPEC.md); cara menyiapkan repo ada di [`CONTRIBUTING.md`](https://github.com/melkimahdali/zentara-core/blob/main/CONTRIBUTING.md).

## Isi repo

| Path | Isi |
|---|---|
| `packages/zentara` | paket `zentara`: runtime framework, CLI `zentara`, Zentara AI, kit UI, back-end |
| `packages/create-zentara` | `npm create zentara`: menyalin template `api` atau `minimal` |
| `docs/`, `docs/en/` | dokumentasi (Markdown), dibangun menjadi situs oleh `scripts/docs-build.mjs` |
| `scripts/` | `e2e.mjs` (simulasi publish), `ai-smoke.mjs` (uji AI sungguhan), `version.mjs`, `release-approve.mjs`, `brand/` |
| `.github/workflows/` | `ci.yml`, `release.yml` (stage ke npm), `docs.yml` (GitHub Pages), `ai-smoke.yml` (manual) |
| `assets/brand/` | logo dan aset brand master |

Kedua paket di-build dengan `tsc` (ESM, tanpa bundler) dan versinya selalu naik bersamaan.

## Paket `zentara`

Isi `packages/zentara/src/` dibagi per lapisan. Titik masuk publik diatur `exports` di `package.json`:

| Import | Berkas | Isi |
|---|---|---|
| `zentara` | `core/index.ts` | runtime, middleware, session, validasi, view, auth, back-end |
| `zentara/ui` | `ui/index.ts` | kit UI server-side dan halaman bawaan |
| `zentara/db` | `db/index.ts` | `createSqlite`, `createPostgres`, migrasi (butuh `drizzle-orm`, opsional) |
| `zentara/host` | `repl/host.ts` | inti CLI interaktif untuk tampilan lain (`HostUI`) |
| bin `zentara` | `cli.ts` | CLI |

| Folder | Tanggung jawab |
|---|---|
| `core/` | runtime HTTP: config, router, context, middleware, respons, error, cookie, session, CSRF/CORS, rate limit, validasi, view, file statis, auth, aset bawaan `/_zentara/*` |
| `core/devpage/` | halaman sambutan, halaman error lengkap, dan widget chat Zentara AI untuk browser |
| `backend/` | job & cron, email SMTP, unggah file, cache, parser durasi/ukuran |
| `db/` | adaptor Drizzle dan perintah `db:generate/migrate/seed` |
| `ui/` | kit UI (`zentara/ui`), gaya, dan font brand |
| `ai/` | Zentara AI: loop agen, tool, persetujuan, jurnal undo, provider, OmniRoute, sesi tersimpan |
| `repl/` | inti CLI interaktif (`host.ts`) dan tampilan klasik readline (`repl.ts`) |
| `tui/` | tampilan Ink (React) untuk CLI interaktif; dimuat hanya saat dipakai |
| `dev/` | server dev latar belakang (`server.ts`) dan server devtools untuk chat browser (`devtools.ts`) |
| `i18n/` | katalog teks `id/` dan `en/`, pemilihan bahasa, `t()` |
| `brand/` | logo terminal (ANSI/ASCII) dan aset brand yang dibuat dari master |
| `serve.ts` | menjalankan aplikasi pengguna (dipakai `zentara dev` dan `zentara start`) |
| `process.ts`, `update.ts` | proses anak lintas OS, CLI milik proyek, cek versi baru |

## Runtime HTTP

`ZenRuntime` (`core/runtime.ts`) adalah server aplikasi. Siklusnya:

1. **`new ZenRuntime(config)`**: `resolveConfig()` (`core/config.ts`) menggabungkan `zentara.config.mjs` dengan env lalu memvalidasinya. Bahasa aplikasi diatur dari `locale`.
2. **`init()`**: plugin dijalankan (`setup(runtime)`, boleh menambah middleware), lalu file middleware aplikasi dimuat, route dimuat dari `routesDir` (`core/router.ts`), job dimuat dari folder `jobs/` di sampingnya, dan email dikonfigurasi.
3. **`start()`**: `node:http` mendengarkan `host:port`. **`stop()`** menunggu request yang sedang berjalan.

Setiap request melewati `handle()`, yang tidak pernah melempar:

```text
request
  └─ createContext()                     ctx: req/res, params, query, cookies, body()
      └─ middleware global               config.middleware → plugin (runtime.use) → src/app/middleware.ts
          └─ route()
              ├─ router.match(path)      statis > [param] > [...catch-all]
              │   └─ middleware route → handler (export GET/POST/... atau default)
              ├─ /_zentara/*             aset bawaan (CSS kit UI, font, logo)
              ├─ publicDir               file statis
              └─ 404
      └─ send()                          nilai return → ZenResponse (string=HTML, objek=JSON, ...)
  └─ sendError()                         HttpError → status; lainnya → 500 (detail hanya di log / halaman dev)
```

Folder aplikasi (`src/app` saat dev, `dist/app` di produksi) menentukan semuanya: `routes/`, `middleware.ts`, `jobs/`, dan `db/`. `serve.ts` memuat `.env`, membuat `ZenRuntime`, dan menjalankannya. Bila boot gagal saat pengembangan, `serve.ts` tetap membuka port dengan halaman error, supaya error bisa diperbaiki dari browser.

## CLI

`cli.ts` adalah satu-satunya bin. `run(argv, io)` memilih jalur:

- **Perintah biasa** (`dev`, `build`, `start`, `routes`, `make:*`, `db:*`, `jobs*`, `lang`, `undo`, `ai:*`) dijalankan langsung. Perintah database di CLI global diteruskan ke CLI `zentara` milik proyek (`node_modules/zentara`), karena `drizzle-orm` ada di sana (`process.ts`, `findLocalCli`).
- **Teks bebas** (argumen berspasi, atau `zentara ai "..."`) dijalankan sebagai tugas Zentara AI sekali jalan di terminal.
- **Tanpa argumen di terminal interaktif** membuka CLI interaktif.

Loader TypeScript (`tsx`) dipasang hanya untuk perintah yang perlu memuat kode `.ts` proyek.

### CLI interaktif

```text
cli.ts ──► tui/ (Ink, bawaan)      ┐
       └─► repl/repl.ts (--classic) ┴─► repl/host.ts (createReplHost)
                                          ├─ sesi AI            ai/session.ts → ai/agent.ts
                                          ├─ server dev         dev/server.ts (npm run dev di latar belakang)
                                          ├─ server devtools    dev/devtools.ts (chat browser)
                                          ├─ OmniRoute          ai/omniroute.ts (127.0.0.1)
                                          └─ perintah /garis-miring, sesi tersimpan, buat proyek
```

Semua logika ada di `repl/host.ts`; tampilan cukup mengimplementasikan `HostUI` (menampilkan jawaban, tool, persetujuan, menu, dan input). Tampilan Ink di `tui/` dan tampilan klasik di `repl/repl.ts` memakai host yang sama, jadi perilakunya identik. Bila `HostUI` berubah tidak kompatibel, naikkan `HOST_API`.

## Zentara AI

```text
tugas (terminal / browser)
  └─ ai/session.ts       satu percakapan, simpan ke .zentara/sessions/
      └─ ai/agent.ts     loop: panggil model → jalankan tool → ulangi (maks. ai.maxSteps)
          ├─ ai/chain.ts        rantai provider + fallback (ai/providers/anthropic.ts, openai-compatible.ts)
          ├─ ai/tools.ts        tool: baca/tulis/edit/hapus file, search, list_routes, run_check,
          │                     run_command, database, zentara, install_package
          ├─ ai/approval.ts     risiko read / write / critical → tanya atau jalan
          ├─ ai/command.ts      parse perintah tanpa shell, klasifikasi, sensor rahasia
          └─ ai/journal.ts      catat isi file sebelum diubah → zentara undo
      └─ verifikasi         npm run typecheck lalu npm run test; gagal → dikirim balik ke model (maks. 2x)
```

- **Prompt dan konteks proyek** disusun di `ai/prompt.ts` dan `ai/layout.ts` (ringkasan proyek, layout UI yang ada, daftar route).
- **Pagar pengaman** dipusatkan di `ai/tools.ts` (path terlarang, `.env`, file database, symlink) dan `ai/approval.ts` (kebijakan persetujuan). Aturan persisnya di `CORE_SPEC.md` bagian Zentara AI, dan setiap perubahan di sini harus disertai test.
- **Konfigurasi dan provider** di `ai/config.ts`, `ai/presets.ts`, dan `ai/setup.ts` (`zentara ai:setup`). Percakapan disimpan dalam format netral, jadi rantai bisa berpindah provider di tengah sesi.

### Chat di browser

Saat `zentara dev` atau CLI interaktif berjalan, `dev/devtools.ts` membuka server kecil di `127.0.0.1` dengan token acak per sesi. Port dan token diteruskan ke proses aplikasi lewat `ZENTARA_DEVTOOLS_PORT` dan `ZENTARA_DEVTOOLS_TOKEN`; halaman sambutan dan halaman error (`core/devpage/`) lalu menyisipkan widget chat (`core/devpage/chat.ts`) yang berbicara dengan server itu (`/status`, `/chat`, `/approve`, `/stop`, `/undo`, `/reset`). Server devtools memakai sesi AI dan aturan yang sama dengan terminal, dan kunci bersama (`AiLock`) mencegah tugas terminal dan browser berjalan bersamaan.

## Alur `zentara dev`

```text
zentara dev
  ├─ dev/devtools.ts                  chat browser (dilewati bila sudah disediakan CLI interaktif)
  └─ tsx watch serve.ts               memantau src/app, .env, zentara.config.mjs → restart otomatis
        env: NODE_ENV=development, ZENTARA_APP_DIR=src/app, ZENTARA_DEVTOOLS_*
        └─ ZenRuntime                 aplikasi pengguna
```

`zentara build` menjalankan `tsc` milik proyek, dan `zentara start` menjalankan `serve.ts` langsung dari `dist/app` dengan `NODE_ENV=production`.

## Bahasa

`i18n/index.ts` menentukan bahasa: env `ZENTARA_LANG`, lalu `locale` di config proyek, lalu `~/.zentara/settings.json` (`zentara lang`), lalu Bahasa Indonesia. Semua teks antarmuka diambil lewat `t()` dari katalog `i18n/id/` (sumber tipe `Messages`) dan `i18n/en/`. Di `create-zentara`, template Indonesia ada di `templates/` dan file pengganti Bahasa Inggris di `locales/en/`.

## Test

| Lapisan | Letak | Dijalankan |
|---|---|---|
| unit & integrasi | `packages/*/test/` (`node:test` + `tsx`) | `npm test`, CI Node 22 & 24 dengan PostgreSQL |
| AI dengan provider tiruan | `packages/zentara/test/ai/` | `npm test` |
| e2e "seolah sudah di-publish" | `scripts/e2e.mjs` | `npm run e2e`, CI Ubuntu & Windows |
| AI dengan provider sungguhan | `scripts/ai-smoke.mjs` | manual (`ai-smoke.yml`), memakai kredit API |

Bug yang ditemukan dari pemakaian sungguhan ditambahkan ke `scripts/e2e.mjs`.

## Rilis dan dokumentasi

`node scripts/version.mjs <versi>` menaikkan versi kedua paket. GitHub Release memicu `release.yml`, yang menguji semuanya lalu menitipkan (stage) paket di npm lewat Trusted Publishing; paket baru tayang setelah pemilik menyetujuinya dengan `npm run release:approve`. Rinciannya di [`PUBLISHING.md`](https://github.com/melkimahdali/zentara-core/blob/main/PUBLISHING.md). Situs dokumentasi dibangun dari `docs/` dan CHANGELOG oleh `docs.yml` setiap ada perubahan di `main`.
