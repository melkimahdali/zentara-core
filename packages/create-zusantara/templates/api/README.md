# Aplikasi Zusantara

Dibuat dengan `npm create zusantara@latest` (template **api**: halaman login & dasbor, auth, database, dan contoh CRUD). Aplikasi ini titik awal yang netral: bangun apa saja di atasnya.

## Mulai

```bash
npm run dev          # http://localhost:3000 (auto-reload)
```

Database SQLite ada di `data/app.db`. Akun admin untuk pengembangan: `admin@zusantara.test` / `admin12345`.

## Halaman bawaan

| Halaman | Isi |
|---|---|
| `/login` · `/register` | masuk & daftar |
| `/dashboard` | ringkasan dan catatan terbaru |
| `/notes` | contoh fitur milik user: tulis, cari, ubah, hapus catatan |
| `/admin/users` | daftar pengguna (admin) |

Semua dibuat dengan kit UI `zusantara/ui` (lihat https://zusantara.morixa.id/ui.html). Nama aplikasi dan menu navigasi ada di `src/app/lib/ui.ts`.

## Job & email

Setelah mendaftar, pengguna baru mendapat email sambutan lewat job di `src/app/jobs/welcome-email.ts`. Job dijalankan di latar belakang, dicoba ulang bila gagal, dan antreannya disimpan di `data/jobs.db`. Saat pengembangan, email tidak dikirim tetapi dicetak ke log dan disimpan di `.zusantara/mail/`. Untuk mengirim sungguhan, isi `MAIL_URL` dan `MAIL_FROM` di `.env`.

```bash
npx zusantara jobs                          # daftar job & jadwal
npx zusantara make:job laporan-harian --schedule "0 7 * * *"
```

## Bicara dengan Zusantara AI

```bash
npx zusantara ai:setup                       # atur provider AI (Claude, OpenAI, Gemini, Groq, ...)
npx zusantara                                # CLI interaktif; server dev bisa ikut dijalankan
npx zusantara "buatkan halaman jadwal booking untuk user yang login"
npx zusantara undo                           # batalkan perubahan AI terakhir
```

## Mulai dari kanvas kosong

Fitur **Catatan** hanya contoh cara membuat data milik user (tabel, API, halaman, test). Untuk menggantinya dengan fitur Anda sendiri:

1. Hapus `src/app/routes/notes/`, `src/app/routes/api/notes/`, dan `src/app/lib/notes.ts`.
2. Hapus tabel `notes` dari `src/app/db/schema.ts` dan data contohnya dari `src/app/db/seed.ts`.
3. Hapus menu "Catatan" di `src/app/lib/ui.ts`, lalu sesuaikan `src/app/routes/dashboard.ts` dan `test/app.test.ts`.
4. Jalankan `npx zusantara db:generate` lalu `npx zusantara db:migrate`.

Atau minta Zusantara AI: `npx zusantara "hapus fitur catatan, lalu buatkan fitur ..."`.

## Perintah

| Perintah | Fungsi |
|---|---|
| `npm run dev` | server pengembangan |
| `npm run build` lalu `npm start` | build dan jalankan versi produksi |
| `npm test` | jalankan test |
| `npx zusantara routes` | daftar route |
| `npx zusantara db:generate` lalu `npx zusantara db:migrate` | setelah mengubah `src/app/db/schema.ts` |
| `npx zusantara db:seed` | isi data awal |
| `npx zusantara lang en` | ganti bahasa Zusantara ke Bahasa Inggris (atau atur `locale` di `zusantara.config.mjs`) |

## Struktur

```
src/app/routes/      route (file = URL)
src/app/middleware.ts middleware global
src/app/db/          schema, koneksi, seed
src/app/lib/         helper: auth (requireUser, requireUserPage, ...) dan ui (appPage)
src/app/jobs/        job latar belakang (file = job)
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
npm run build && npx zusantara db:migrate && npm start
```

Dokumentasi lengkap: https://zusantara.morixa.id/
