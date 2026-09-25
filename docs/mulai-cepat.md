---
title: Mulai cepat
order: 1
group: Memulai
description: Buat proyek Zentara pertama dalam satu menit.
---

# Mulai cepat

Butuh Node.js 22 atau lebih baru.

```bash
npm create zentara@latest aplikasi-saya     # pilih template: api (login + database) atau minimal
cd aplikasi-saya
npx zentara                             # CLI interaktif: chat dengan AI + server dev di latar belakang
```

Atau jalankan server saja dengan `npm run dev` (http://localhost:3000, auto-reload). Halaman sambutan dan halaman error di browser juga punya chat Zentara AI selama pengembangan.

| Perintah | Fungsi |
|---|---|
| `zentara dev` | server pengembangan dari `src/app` (TypeScript, auto-reload) |
| `zentara build` | kompilasi ke `dist/` (memakai `tsconfig.build.json`) |
| `zentara start` | jalankan hasil build (`dist/app`), default `NODE_ENV=production` |
| `zentara routes` | daftar route |
| `zentara make:route <path>` · `make:middleware <nama>` | buat file baru |
| `zentara db:generate` · `db:migrate` · `db:seed` | database |
| `zentara` | CLI interaktif Zentara AI (gaya Claude Code) |
| `zentara "<kalimat>"` · `ai:status` · `ai:setup` · `undo` | Zentara AI |

Di dalam proyek, jalankan lewat `npx zentara ...` atau skrip `npm run dev` / `build` / `start`.

Import API framework dari paket:

```ts
import { HttpError, json, validate, type ZenContext } from "zentara";
import { createSqlite, createPostgres } from "zentara/db";
```

## Struktur proyek

```
src/app/routes/       route aplikasi (file = URL)
src/app/middleware.ts middleware global aplikasi
src/app/db/           schema, koneksi, dan seed database (template api)
src/app/lib/          helper aplikasi (mis. requireUser/requireAdmin)
public/               file statis
zenstyles/            CSS aplikasi
drizzle/              file migrasi SQL (hasil db:generate)
test/                 test (node:test)
zentara.config.mjs    konfigurasi
```
