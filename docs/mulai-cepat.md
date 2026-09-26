---
title: Mulai cepat
order: 1
group: Memulai
description: Buat proyek Zusantara pertama dalam satu menit.
---

# Mulai cepat

Butuh Node.js 22 atau lebih baru.

```bash
npm create zusantara@latest aplikasi-saya     # pilih bahasa (id/en) dan template: api (login + database) atau minimal
cd aplikasi-saya
npx zusantara                             # CLI interaktif: chat dengan AI + server dev di latar belakang
```

Atau jalankan server saja dengan `npm run dev` (http://localhost:3000, auto-reload). Halaman sambutan dan halaman error di browser juga punya chat Zusantara AI selama pengembangan.

| Perintah | Fungsi |
|---|---|
| `zusantara dev` | server pengembangan dari `src/app` (TypeScript, auto-reload) |
| `zusantara build` | kompilasi ke `dist/` (memakai `tsconfig.build.json`) |
| `zusantara start` | jalankan hasil build (`dist/app`), default `NODE_ENV=production` |
| `zusantara routes` | daftar route |
| `zusantara make:route <path>` · `make:middleware <nama>` · `make:job <nama>` | buat file baru |
| `zusantara jobs` · `jobs:run <nama>` | job latar belakang |
| `zusantara db:generate` · `db:migrate` · `db:seed` | database |
| `zusantara` | CLI interaktif Zusantara AI (gaya Claude Code) |
| `zusantara "<kalimat>"` · `ai:status` · `ai:setup` · `undo` | Zusantara AI |

Di dalam proyek, jalankan lewat `npx zusantara ...` atau skrip `npm run dev` / `build` / `start`.

Import API framework dari paket:

```ts
import { HttpError, json, validate, type ZenContext } from "zusantara";
import { createSqlite, createPostgres } from "zusantara/db";
```

## Struktur proyek

```
src/app/routes/       route aplikasi (file = URL)
src/app/middleware.ts middleware global aplikasi
src/app/db/           schema, koneksi, dan seed database (template api)
src/app/jobs/         job latar belakang (file = job, template api)
src/app/lib/          helper aplikasi (mis. requireUser/requireAdmin)
public/               file statis
drizzle/              file migrasi SQL (hasil db:generate)
test/                 test (node:test)
zusantara.config.mjs    konfigurasi
```
