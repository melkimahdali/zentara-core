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
npx zentara "buatkan API produk dengan nama, harga, dan stok, lengkap dengan validasi"   # satu perintah
npx zentara undo                  # batalkan perubahan AI terakhir
```



## Persetujuan

| Mode | Perubahan file biasa | Aksi krusial |
|---|---|---|
| `ask` (default) | ditanyakan satu per satu (bisa pilih "setujui semua" untuk sisanya) | selalu ditanyakan |
| `auto` (`--auto` atau `ai.mode: "auto"`) | langsung dikerjakan | selalu ditanyakan |

Yang termasuk **aksi krusial**:
- menghapus file, memasang paket npm, serta menerapkan migrasi atau seed ke database;
- menyalakan atau memulai ulang server dev (dari CLI interaktif);
- mengedit file migrasi di `drizzle/` secara manual;
- mengubah `package.json`, `zentara.config`, `tsconfig`, `.github/`, `.gitignore`, atau `.env*`.

Yang **tidak pernah** bisa dilakukan AI:
- membaca atau mengubah `.env` dan file database (`.db`/`.sqlite`), supaya rahasia dan data pengguna tidak dikirim ke provider AI;
- menulis ke `.git/`, `node_modules/` (termasuk framework Zentara), atau `dist/`;
- menyentuh file di luar folder proyek, termasuk lewat symlink.

Pilihan lain:
- `--dry-run`: melihat rencana tanpa mengubah apa pun.
- Setiap perubahan dicatat di `.zentara/history/`, jadi `zentara undo` bisa mengembalikannya.
