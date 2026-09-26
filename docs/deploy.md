---
title: Build & deploy
order: 3
group: Referensi
description: Menjalankan aplikasi Zentara di produksi.
---

# Build & deploy

```bash
npm run build     # zentara build: TypeScript -> dist/
npm start         # zentara start: jalankan dist/app dengan NODE_ENV=production
```

Hal yang perlu disiapkan di server:

- **Node.js 22+**.
- **`.env` produksi**: `NODE_ENV=production`, `PORT`, `SESSION_SECRET` (minimal 32 karakter), `DATABASE_URL`, dan `SEED_ADMIN_PASSWORD` bila memakai `db:seed`.
- **Migrasi database**: `npx zentara db:migrate` sebelum aplikasi dijalankan.
- **Email**: isi `MAIL_URL` dan `MAIL_FROM` bila aplikasi mengirim email. Tanpa `MAIL_URL`, `sendMail()` melempar error di produksi.
- **Job**: antrean disimpan di `data/jobs.db`, jadi folder `data/` harus bisa ditulis dan tidak dihapus saat deploy. Bila menjalankan beberapa proses, pakai file antrean yang sama atau matikan pekerja di proses tertentu dengan `ZENTARA_JOBS=off`.
- **Halaman error**: di produksi pengunjung hanya melihat halaman status sederhana. Pastikan `ZENTARA_DEBUG` tidak diaktifkan.

Contoh dengan PM2:

```bash
npm ci && npm run build
npx zentara db:migrate
pm2 start npm --name aplikasi -- start
```

Adapter deploy (Docker, Vercel, Cloudflare, dan lainnya) ada di [peta jalan](peta-jalan.html) Tahap 17.
