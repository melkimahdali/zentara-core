# Aplikasi Zentara

Dibuat dengan `npm create zentara@latest` (template **api**: auth + database + CRUD produk).

## Mulai

```bash
npm run dev          # http://localhost:3000 (auto-reload)
```

Database SQLite ada di `data/app.db`. Akun admin untuk pengembangan: `admin@zentara.test` / `admin12345`.

## Bicara dengan Zentara AI

```bash
npx zentara ai:setup                       # atur provider AI (Claude, OpenAI, Gemini, Groq, ...)
npx zentara                                # CLI interaktif; server dev bisa ikut dijalankan
npx zentara "tambahkan fitur keranjang belanja untuk user yang login"
npx zentara undo                           # batalkan perubahan AI terakhir
```

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | server pengembangan |
| `npm run build` lalu `npm start` | build dan jalankan versi produksi |
| `npm test` | jalankan test |
| `npx zentara routes` | daftar route |
| `npx zentara db:generate` lalu `npx zentara db:migrate` | setelah mengubah `src/app/db/schema.ts` |
| `npx zentara db:seed` | isi data awal |

## Struktur

```
src/app/routes/      route (file = URL)
src/app/middleware.ts middleware global
src/app/db/          schema, koneksi, seed
src/app/lib/         helper (requireUser, requireAdmin)
drizzle/             file migrasi SQL
test/                test
```

## Produksi

Isi `.env`, minimal:
- `NODE_ENV=production`;
- `SESSION_SECRET`, acak dan minimal 32 karakter;
- `SEED_ADMIN_PASSWORD`.

Lalu jalankan:

```bash
npm run build && npx zentara db:migrate && npm start
```

Dokumentasi lengkap: https://github.com/melkimahdali/zentara-core
