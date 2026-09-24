---
title: Zentara AI di browser
order: 3
group: Zentara AI
description: Halaman sambutan, halaman error, dan chat AI di browser.
---

# Zentara AI di browser

Selama pengembangan (`npx zentara` atau `npm run dev`), Zentara AI juga bisa dipakai dari browser:

- **Halaman sambutan** (`src/app/routes/index.ts` bawaan template) menampilkan status aplikasi, daftar route, dan kotak chat Zentara AI. Ganti file itu untuk halaman Anda sendiri; pakai lagi kapan saja dengan `export { welcomePage as GET } from "zentara";`.
- **Halaman error** menampilkan pesan, stack trace dengan potongan kode yang disorot, penyebab (`cause`), dan detail request. Tombol **✦ Tanya Zentara AI** mengirim error itu ke AI, yang menjelaskan penyebabnya lalu mengusulkan perbaikan. Setiap perubahan tetap meminta persetujuan (diff + tombol Setujui/Tolak) dan bisa dibatalkan.
- **Halaman 404** menampilkan route yang tersedia dan tombol untuk membuat halaman itu dengan AI.
- Aplikasi yang gagal dijalankan (mis. salah ketik di file route) tetap menampilkan halaman error di port-nya, dan server mulai ulang otomatis setelah file diperbaiki.

Keamanan chat di browser:
- hanya aktif saat pengembangan, lewat server kecil yang hanya mendengar di `127.0.0.1`;
- setiap request butuh token acak per sesi, dan hanya diterima dari halaman `localhost` (situs lain dan DNS rebinding ditolak);
- aturannya sama dengan di terminal: `.env` dan file database tidak bisa diakses, aksi krusial selalu ditanyakan, dan semua perubahan bisa di-undo.

Di produksi (`zentara start`), pengunjung hanya melihat halaman error sederhana tanpa detail, dan halaman sambutan tanpa chat maupun daftar route. Klien API (`Accept: application/json`) tetap mendapat JSON.

Cara kerja AI:
1. Membaca struktur proyek, route, schema database, dan kode yang ada.
2. Menyampaikan rencana singkat.
3. Membuat atau mengubah file, dengan persetujuan Anda.
4. **Selalu menjalankan typecheck dan test.** Bila gagal, AI memperbaikinya sendiri (maksimal 2 kali).
5. Melaporkan hasilnya: file yang berubah dan cara mencobanya.
