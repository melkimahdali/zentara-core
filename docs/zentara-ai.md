---
title: Cara kerja Zentara AI
order: 1
group: Zentara AI
description: Bangun aplikasi dengan bahasa sehari-hari, dengan persetujuan Anda.
---

# Cara kerja Zentara AI

Tidak perlu hafal perintah. Tulis apa yang Anda mau dalam bahasa sehari-hari:

```bash
npx zentara                       # CLI interaktif: percakapan berlanjut, server dev di latar belakang
npx zentara "buatkan API buku tamu dengan nama, pesan, dan tanggal, lengkap dengan validasi"   # satu perintah
npx zentara undo                  # batalkan perubahan AI terakhir
```

Zentara AI membalas dalam bahasa yang Anda pakai saat menulis.

## Persetujuan

| Mode | Perubahan file biasa | Aksi krusial |
|---|---|---|
| `ask` (default) | ditanyakan satu per satu (bisa pilih "setujui semua" untuk sisanya) | selalu ditanyakan |
| `auto` (`--auto` atau `ai.mode: "auto"`) | langsung dikerjakan | selalu ditanyakan |

Yang termasuk **aksi krusial**:
- menghapus file, memasang paket npm, serta menerapkan migrasi atau seed ke database;
- menyalakan atau memulai ulang server dev (dari CLI interaktif);
- menjalankan perintah terminal selain perintah baca-saja (lihat di bawah);
- mengedit file migrasi di `drizzle/` secara manual;
- mengubah `package.json`, `zentara.config`, `tsconfig`, `.github/`, `.gitignore`, atau `.env*`.

Yang **tidak pernah** bisa dilakukan AI:
- membaca atau mengubah `.env` dan file database (`.db`/`.sqlite`), supaya rahasia dan data pengguna tidak dikirim ke provider AI;
- menulis ke `.git/`, `node_modules/` (termasuk framework Zentara), atau `dist/`;
- menyentuh file di luar folder proyek, termasuk lewat symlink.

## Perintah Zentara

AI menjalankan perintah Zentara lewat zentara milik proyek (`node_modules/zentara`), jadi semuanya jalan dari terminal maupun browser walau CLI yang Anda buka adalah instalasi global:

| Perintah | Perlakuan |
|---|---|
| `routes`, `jobs` | langsung jalan |
| `make:route`, `make:middleware`, `make:job`, `build` | ditanyakan di mode `ask`; file buatan `make:*` bisa di-undo |
| `jobs:run`, `db:migrate`, `db:seed` | aksi krusial, selalu ditanyakan |
| `db:generate` | ditanyakan di mode `ask`; file migrasi bisa di-undo |

## Tampilan halaman

Halaman yang dibuat Zentara AI memakai layout aplikasi yang sudah ada, bukan tampilan baru:

- Halaman untuk user yang login dibungkus `appPage()` dari `src/app/lib/ui.ts`, dan halaman publik memakai `page()` dari [kit UI](ui.html).
- Sebelum membuat halaman, AI membaca satu halaman serupa lalu mengikuti strukturnya. Halaman baru ditambahkan ke menu navigasi di `navFor()`.
- AI tidak menulis `<html>`, `<style>`, file CSS, atau navigasi sendiri, kecuali Anda memintanya secara jelas. Bila sebuah route ternyata membuat dokumen HTML atau CSS sendiri, AI langsung diberi catatan untuk memperbaikinya.

## Perintah terminal

AI bisa menjalankan **satu perintah terminal** di folder proyek (tool `run_command`), mis. `git diff --stat` atau `npx eslint src`. Aturannya:

| Jenis | Contoh | Perlakuan |
|---|---|---|
| Baca-saja | `git status`, `git diff`, `git log`, `git show`, `ls`, `npm ls`, `npm outdated`, `npx tsc --noEmit` | langsung jalan |
| Diizinkan Anda | awalan di `ai.allowedCommands`, mis. `["npm run lint", "npx eslint"]` | ditanyakan di mode `ask`, langsung di mode `auto` |
| Lainnya | `npx prisma ...`, `node script.js`, `git commit ...` | **aksi krusial**, selalu ditanyakan |
| Terlarang | `sudo`, `bash -c`, `powershell`, `env`, `npm publish`, `npm token`, `git push`, `git config`, perintah yang menyebut `.env`/file database, path di luar proyek (`/etc`, `..`, `~`), server/watch (`npm run dev`, `--watch`) | ditolak |

- Perintah dijalankan **tanpa shell**. Operator seperti `|`, `&&`, `;`, `>`, `$VAR`, dan `%VAR%` ditolak, jadi satu persetujuan berarti persis satu perintah.
- Nilai rahasia (variabel berakhiran `KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `DATABASE_URL`, dan sejenisnya, dari environment maupun `.env`) **disensor** dari output sebelum dikirim ke provider AI. Ini juga berlaku untuk output `typecheck`, `test`, dan perintah database.
- Batas waktu default 2 menit (maksimal 10 menit), dan output dipotong bila terlalu panjang.
- Perubahan yang dibuat oleh perintah terminal **tidak** tercatat untuk `zentara undo`. Karena itu perintah seperti ini selalu ditanyakan dulu.

```js
// zentara.config.mjs
ai: {
  allowedCommands: ["npm run lint", "npx eslint"],
  compactAt: 60000, // ringkas otomatis di atas ±60 ribu token; 0 = mati
},
```

Pilihan lain:
- `--dry-run`: melihat rencana tanpa mengubah apa pun.
- Setiap perubahan dicatat di `.zentara/history/`, jadi `zentara undo` bisa mengembalikannya.
