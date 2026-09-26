---
title: Zentara AI di browser
order: 3
group: Zentara AI
description: Halaman sambutan, halaman error, chat AI di setiap halaman, dan AI yang bisa melihat tampilan.
---

# Zentara AI di browser

Selama pengembangan (`npx zentara` atau `npm run dev`), Zentara AI juga bisa dipakai dari browser:

- **Halaman sambutan** (`src/app/routes/index.ts` bawaan template) menampilkan status aplikasi, daftar route, dan kotak chat Zentara AI. Ganti file itu untuk halaman Anda sendiri; pakai lagi kapan saja dengan `export { welcomePage as GET } from "zentara";`.
- **Halaman error** menampilkan pesan, stack trace dengan potongan kode yang disorot, penyebab (`cause`), dan detail request. Tombol **✦ Tanya Zentara AI** mengirim error itu ke AI, yang menjelaskan penyebabnya lalu mengusulkan perbaikan. Setiap perubahan tetap meminta persetujuan (diff + tombol Setujui/Tolak) dan bisa dibatalkan.
- **Halaman 404** menampilkan route yang tersedia dan tombol untuk membuat halaman itu dengan AI.
- Aplikasi yang gagal dijalankan (mis. salah ketik di file route) tetap menampilkan halaman error di port-nya, dan server mulai ulang otomatis setelah file diperbaiki.

## Chat di setiap halaman

Selama pengembangan, setiap halaman aplikasi Anda (bukan hanya halaman sambutan dan error) mendapat tombol **Tanya Zentara AI** yang mengambang di pojok kanan bawah. Fungsinya sama dengan chat di halaman error: minta perubahan, lihat diff lalu Setujui/Tolak, Batalkan perubahan, Berhenti, dan Percakapan baru. Percakapan tetap ada setelah halaman dimuat ulang.

Setiap pesan dari widget melampirkan **tampilan halaman saat ini**, jadi permintaan seperti "tambah tombol ekspor di atas tabel ini" langsung menunjuk file route yang benar:

- URL, judul, dan file route yang melayani halaman itu;
- elemen yang terlihat (heading, tombol, link, field, tabel beserta jumlah barisnya) dengan posisi dan ukurannya;
- teks halaman;
- error console (`console.error`, error JavaScript, promise yang ditolak) dan request yang gagal (fetch/XHR dengan status 400 ke atas, gambar atau script yang gagal dimuat).

Isi field password, field tersembunyi, field dengan nama seperti `token`/`secret`/`card`, dan field bertanda `data-private` tidak pernah dikirim. Angka merah di tombol widget menunjukkan jumlah error console dan request gagal di halaman itu.

## AI memeriksa hasilnya: `view_page`

Setelah mengubah halaman, Zentara AI **wajib** memanggil tool `view_page` untuk halaman itu di layar desktop dan ponsel, lalu memperbaiki temuannya, sama seperti typecheck dan test. Bila setelah dua percobaan masih ada masalah, AI melaporkan temuannya apa adanya dan tugas tidak ditandai selesai.

- **Ada tab browser yang terbuka** (halaman apa pun dengan widget): halaman dimuat di iframe tersembunyi di tab itu, dengan cookie login Anda, berukuran 1280×800 (`desktop`) atau 390×844 (`mobile`). Chat tidak terputus.
- **Tidak ada tab yang terbuka:** AI memakai versi teks dari server (tanpa JavaScript, tanpa login). Bila halaman mengarah ke `/login`, AI menyampaikannya.

Contoh pemanggilan oleh AI:

```json
{ "url": "/notes", "viewport": "mobile", "expect": { "text": ["Tambah"], "selector": ["table"], "noConsoleErrors": true, "noLayoutIssues": true } }
```

### Pemeriksaan tampilan

Setiap hasil `view_page` memuat pemeriksaan tampilan. Setiap temuan menyebut elemennya, dan hasilnya menyebut file route halaman itu.

| Temuan | Artinya | Di browser | Versi teks |
| --- | --- | --- | --- |
| `overflow` | elemen keluar dari sisi layar atau membuat halaman bisa digeser ke samping (tabel di dalam area gulir tidak dihitung) | ✓ | |
| `overlap` | dua elemen (teks, tombol, input, gambar) saling menimpa | ✓ | |
| `truncated` | teks terpotong oleh `overflow: hidden`, atau diberi "…" tanpa atribut `title` | ✓ | |
| `image` | gambar gagal dimuat | ✓ | ✓ (gambar lokal) |
| `contrast` | kontras teks di bawah WCAG AA: 4,5:1, atau 3:1 untuk teks besar | ✓ | |
| `style` | atribut `style`, elemen `<style>`, atau stylesheet di luar kit UI | ✓ | ✓ |
| `kit` | halaman tidak dibuat dengan `page()` dari `zentara/ui` | ✓ | ✓ |
| `meta` | tidak ada `<meta name="viewport">`, jadi di ponsel halaman tampil diperkecil | ✓ | ✓ |

Halaman sambutan dan error bawaan framework tidak diperiksa untuk `style`, `kit`, dan `meta`.

Hasil yang sama bisa Anda lihat sendiri. Bila `zentara dev` atau CLI interaktif berjalan dan ada tab browser yang terbuka, `zentara view` memakai tab itu; bila tidak, versi teks. Kode keluarnya 1 bila ada temuan, error, atau teks `--text` yang tidak ada.

```bash
npx zentara view /notes                    # elemen, error console, dan pemeriksaan tampilan
npx zentara view /notes --mobile           # layar ponsel (390 px)
npx zentara view /login --text "Masuk"     # gagal bila teks tidak ada
npx zentara view /api/hello --json
```

## Journal hasil tugas AI

Setiap tugas Zentara AI (terminal, CLI interaktif, dan chat di browser) mencatat ringkasannya ke `.zentara/ai-tasks.jsonl`: status, jumlah langkah, durasi, token, hasil typecheck dan test, serta setiap `view_page`. Isi file dan percakapan tidak dicatat. Hanya baris pertama permintaan yang disimpan, dan journal tidak pernah dikirim keluar dari komputer Anda. Eval AI di Tahap 15 memakai data ini.

```bash
npx zentara ai:log               # 20 tugas terakhir dan persentase yang selesai
npx zentara ai:log --limit 100 --json
```

## Tidak ada di produksi

Widget hanya disisipkan oleh server pengembangan. Anda tidak perlu menghapus apa pun sebelum build atau deploy:

- server aplikasi hanya menyisipkannya bila mode debug aktif, aplikasi dijalankan oleh `zentara dev` atau CLI interaktif (yang mengisi `ZENTARA_DEV=1` dan token devtools), dan bukan `NODE_ENV=production`;
- `zentara start` menghapus variabel server pengembangan dari env;
- di produksi `/_zentara/dev/probe.js` dan `/_zentara/dev/widget.js` menjawab 404, dan HTML Anda tidak diubah;
- potongan HTML (tanpa `<html>`/`<body>`) dan request htmx tidak pernah disisipi.

Uji e2e memastikan halaman produksi tidak memuat widget, termasuk saat env devtools sengaja terbawa dan `ZENTARA_DEBUG=1`.

## Keamanan chat di browser

- hanya aktif saat pengembangan, lewat server kecil yang hanya mendengar di `127.0.0.1`;
- setiap request butuh token acak per sesi, dan hanya diterima dari halaman `localhost` (situs lain dan DNS rebinding ditolak);
- aturannya sama dengan di terminal: `.env` dan file database tidak bisa diakses, aksi krusial selalu ditanyakan, dan semua perubahan bisa di-undo;
- `zentara dev` menulis port dan token devtools ke `.zentara/devtools.json` (hanya bisa dibaca pemilik file, dihapus saat server berhenti) supaya `zentara view` dari terminal lain bisa memakai tab browser;
- token devtools ada di halaman selama pengembangan, jadi script pihak ketiga yang Anda muat di halaman (mis. dari CDN) secara teknis juga bisa memakai chat. Mode `ask` (default) tetap meminta persetujuan Anda untuk setiap perubahan, jadi pakai mode itu bila halaman memuat script dari luar.

Di produksi (`zentara start`), pengunjung hanya melihat halaman error sederhana tanpa detail, dan halaman sambutan tanpa chat maupun daftar route. Klien API (`Accept: application/json`) tetap mendapat JSON.

## Cara kerja AI

1. Membaca struktur proyek, route, schema database, dan kode yang ada.
2. Menyampaikan rencana singkat.
3. Membuat atau mengubah file, dengan persetujuan Anda.
4. **Selalu menjalankan typecheck dan test.** Bila gagal, AI memperbaikinya sendiri (maksimal 2 kali).
5. **Bila halaman berubah, memeriksanya dengan `view_page`** di desktop dan ponsel, lalu memperbaiki temuannya (maksimal 2 kali).
6. Melaporkan hasilnya: file yang berubah dan cara mencobanya.
