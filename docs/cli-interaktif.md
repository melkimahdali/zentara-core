---
title: CLI interaktif
order: 2
group: Memulai
description: Chat dengan Zentara AI di terminal, gaya Claude Code.
---

# CLI interaktif

Pasang sekali secara global agar cukup mengetik `zentara` dari folder mana pun, seperti Claude Code:

```bash
npm install -g zentara
zentara
```

(Tanpa pemasangan global: `npx zentara` di folder proyek.)

Tampilannya dibangun dengan [Ink](https://github.com/vadimdemedes/ink), bergaya Claude Code:
- jawaban AI mengalir dan dirender sebagai Markdown;
- kotak input di bawah dengan riwayat (↑/↓) dan saran perintah (ketik `/` lalu **Tab**);
- dialog menu dan persetujuan berwarna;
- baris mode dan status server.

## Layar penuh seperti ruang chat

Saat dibuka, `zentara` pindah ke layar alternatif terminal (seperti vim atau htop), jadi output sebelumnya, mis. `npm install`, tidak terlihat dan tidak bisa digulir. Judul tab terminal menjadi *Zentara Core · nama-folder*. Layar dibagi tiga:

1. **Header berbingkai terkunci di atas:** logo Z kecil, nama dan versi Zentara Core, tagline, AI dan mode yang aktif, dan folder proyek; di terminal lebar juga tips perintah dan status server dev. Di terminal pendek (kurang dari 24 baris) header diringkas menjadi dua baris. Header tidak ikut bergulir.
2. **Log percakapan di tengah:** pesan baru mendorong pesan lama ke atas. **PgUp/PgDn** untuk menggulir; selama Anda membaca pesan lama, pesan baru tidak menarik layar ke bawah. **Esc** kembali ke pesan terbaru.
3. **Input di bawah:** kotak input, atau menu dan dialog persetujuan (↑/↓ + Enter).

Hanya baris yang berubah yang digambar ulang, sehingga spinner dan teks yang mengalir tidak membuat layar berkedip. Tampilan ini memakai kode ANSI standar, jadi berjalan di terminal lokal maupun terminal cloud (Codespaces, SSH, terminal web). Saat keluar, layar terminal kembali seperti semula, judul tab dikembalikan, dan seluruh percakapan dicetak ke scrollback, jadi tidak ada yang hilang.

Terminal yang lebih pendek dari 12 baris, atau output yang bukan terminal, otomatis memakai tata letak biasa (riwayat langsung ke scrollback). Untuk memakai tata letak biasa di terminal mana pun:

```js
// zentara.config.mjs
export default {
  cli: { fullscreen: false },
};
```

Atau untuk sementara: `ZENTARA_FULLSCREEN=off zentara`.

**Keluar:** tekan **Esc** atau **Ctrl+C** dua kali berturut-turut, atau ketik `/exit`. Tombol pertama menampilkan pengingat, jadi percakapan tidak tertutup tanpa sengaja. Esc dan Ctrl+C lebih dulu menghentikan AI yang sedang bekerja, menutup dialog, atau mengosongkan input. Server dev latar belakang ikut dimatikan dan sesi disimpan sebelum proses berakhir. Hal yang sama terjadi saat terminal ditutup (`SIGHUP`) atau proses dihentikan (`SIGTERM`).

`zentara --classic` (atau `ZENTARA_UI=classic`) memakai CLI klasik tanpa Ink.

Saat dibuka, logo Zentara Core muncul dengan animasi singkat (±1 detik): tersapu mengikuti goresan Z dengan kilau Pearl, lalu motif emas menyusul. Animasi ini otomatis mati di CI. Untuk mematikannya:

```js
// zentara.config.mjs
export default {
  cli: { animation: false },
};
```

Atau untuk sementara: `ZENTARA_ANIMATION=off zentara` (PowerShell: `$env:ZENTARA_ANIMATION="off"; zentara`).

Setelah animasi, header menampilkan versi, AI yang aktif, mode, dan folder. Kolom input ada di bawah, dengan baris mode di bawahnya (**Shift+Tab** untuk mengganti mode). Lalu:
- **Belum ada AI yang siap:** muncul layar sambutan untuk memilih cara mengakses model, yaitu *OmniRoute (gratis)*, *Masukkan API key*, *Provider kustom*, atau *Lewati dulu*. Menu dipilih dengan ↑/↓ + Enter, atau ketik untuk mencari.
- **Di luar folder proyek:** muncul pilihan *Buat proyek baru* (menjalankan `npm create zentara` lalu langsung membuka proyeknya), *Chat di folder ini*, atau *Buka dokumentasi*.

Fitur sesi interaktif:

- **Server dev di latar belakang.** Saat dibuka, Zentara bertanya dulu *"Jalankan server dev (npm run dev) di latar belakang?"*. Bila Ya, tidak perlu membuka terminal kedua; lognya disimpan (lihat dengan `/logs`) dan error server muncul di baris status. AI juga bisa membaca log itu untuk mencari penyebab error, dan menyalakan server hanya setelah Anda setujui. Bila `npm run dev` sudah berjalan di terminal lain, Zentara memakainya. Lewati pertanyaannya dengan `--no-dev`.
- **Jawaban mengalir (streaming).** Teks AI muncul baris demi baris selagi ditulis, tidak perlu menunggu jawaban selesai.
- **Percakapan berlanjut dan tersimpan.** Permintaan berikutnya bisa merujuk yang sebelumnya ("ubah warnanya jadi biru"). Percakapan disimpan otomatis di `.zentara/sessions/` (30 terbaru, diabaikan git), jadi setelah menutup terminal Anda bisa melanjutkannya dengan `/resume` atau `zentara --continue`.
- **Hemat token.** `/compact` meringkas percakapan panjang menjadi catatan singkat. Ini juga terjadi otomatis saat percakapan melewati ±60 ribu token (atur dengan `ai.compactAt`), sehingga batas token per menit provider (error 429) lebih jarang tercapai.
- **Esc** atau **Ctrl+C** menghentikan AI kapan saja. Tekan dua kali saat AI tidak bekerja untuk keluar (server dev ikut dimatikan).
- **Persetujuan lewat menu** (↑/↓ lalu Enter, atau angka): *Ya*, *Ya dan setujui semua perubahan biasa*, atau *Tidak*. Perubahan ditampilkan sebagai diff berwarna, hanya baris yang berubah beserta 3 baris konteks dan nomor barisnya (`@@ -12,7 +12,8 @@`).
- **Perintah terminal.** AI bisa menjalankan perintah seperti `git diff` atau `npx eslint src`. Lihat [aturan keamanannya](zentara-ai.html#perintah-terminal).
- **Perintah garis miring:**

| Perintah | Fungsi |
|---|---|
| `/help` | bantuan |
| `/mode ask` · `/mode auto` | ganti mode persetujuan |
| `/dev` · `/dev start` · `/dev stop` · `/dev restart` | kendalikan server dev |
| `/logs` | log server dev terakhir |
| `/open [path]` | buka aplikasi di browser |
| `/undo` | batalkan perubahan AI terakhir |
| `/resume` | lanjutkan percakapan sebelumnya (pilih dari daftar) |
| `/compact` | ringkas percakapan agar hemat token |
| `/status` · `/setup` (alias `/login`) | cek atau atur akses AI; `/setup openai` langsung ke provider tertentu |
| `/omniroute` | OmniRoute (AI gratis): status, `install`, `start`, `stop` |
| `/lang` | lihat bahasa; `/lang en` atau `/lang id` untuk mengganti |
| `/clear` | mulai percakapan baru (layar penuh: log dikosongkan) |
| `/exit` | keluar |
