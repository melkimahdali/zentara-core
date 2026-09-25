---
title: Bahasa (Indonesia/Inggris)
order: 1.5
group: Referensi
description: Pakai Zentara dalam Bahasa Indonesia atau Bahasa Inggris: CLI, Zentara AI, halaman bawaan, kit UI, dan template.
---

# Bahasa (Indonesia/Inggris)

Zentara tersedia dalam Bahasa Indonesia (`id`, default) dan Bahasa Inggris (`en`). Bahasa yang dipilih dipakai oleh CLI, Zentara AI, halaman sambutan dan error, pesan error bawaan, kit UI `zentara/ui`, serta pembuat proyek. Dokumentasi Bahasa Inggris ada di [/en/](en/index.html).

## Memilih bahasa

```bash
npx zentara lang          # lihat bahasa aktif
npx zentara lang en       # simpan pilihan untuk semua proyek (~/.zentara/settings.json)
```

Di CLI interaktif, ketik `/lang en` atau `/lang id`.

Untuk satu proyek, tulis di config. Nilai ini juga menentukan bahasa halaman aplikasi di produksi:

```js
// zentara.config.mjs
export default {
  locale: "en",
};
```

Urutan prioritasnya:

1. env `ZENTARA_LANG` (mis. `ZENTARA_LANG=en npx zentara dev`)
2. `locale` di `zentara.config.mjs`
3. pilihan global dari `zentara lang` (tidak dipakai saat `NODE_ENV=production`)
4. `id`

## Proyek baru

`npm create zentara` menanyakan bahasa lebih dulu, atau pilih langsung:

```bash
npm create zentara@latest aplikasi-saya -- --lang en
```

Template `api` dan `minimal` tersedia dalam dua bahasa: teks halaman, pesan validasi, contoh data, README, komentar, dan test. Kodenya sama persis; hanya teksnya yang berbeda.

## Zentara AI

Zentara AI membalas dalam bahasa yang Anda pakai saat menulis. Nama tool dan instruksi untuk model ditulis dalam Bahasa Inggris, sedangkan hasil tool dan pesan error mengikuti bahasa aktif.

## Kit UI & format

Teks bawaan kit UI ("Lewati ke konten", "Keluar", "Belum ada data", dan lainnya) mengikuti bahasa aktif. Untuk satu halaman, pakai `page({ title, lang: "en" })`.

```ts
import { formatDate, formatNumber, money } from "zentara/ui";

money(125000);            // "Rp125.000" (id) · money(12.5) -> "$12.50" (en)
formatNumber(12500);      // "12.500" (id) · "12,500" (en)
formatDate(new Date());   // "25 Sep 2026" (id) · "Sep 25, 2026" (en)
```

Di kode aplikasi, baca bahasa aktif dengan `getLocale()` dari `"zentara"`.
