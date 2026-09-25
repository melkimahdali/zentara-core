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

`zentara --classic` (atau `ZENTARA_UI=classic`) memakai CLI klasik tanpa Ink.

Saat dibuka, Zentara menampilkan logo Zentara Core beserta versi, AI yang aktif, mode, dan folder, seperti Claude Code. Kolom input ada di antara dua garis, dengan baris mode di bawahnya (**Shift+Tab** untuk mengganti mode). Lalu:
- **Belum ada AI yang siap:** muncul layar sambutan untuk memilih cara mengakses model, yaitu *OmniRoute (gratis)*, *Masukkan API key*, *Provider kustom*, atau *Lewati dulu*. Menu dipilih dengan ↑/↓ + Enter, atau ketik untuk mencari.
- **Di luar folder proyek:** muncul pilihan *Buat proyek baru* (menjalankan `npm create zentara` lalu langsung membuka proyeknya), *Chat di folder ini*, atau *Buka dokumentasi*.

Fitur sesi interaktif:

- **Server dev di latar belakang.** Saat dibuka, Zentara bertanya dulu *"Jalankan server dev (npm run dev) di latar belakang?"*. Bila Ya, tidak perlu membuka terminal kedua; lognya disimpan (lihat dengan `/logs`) dan error server muncul di baris status. AI juga bisa membaca log itu untuk mencari penyebab error, dan menyalakan server hanya setelah Anda setujui. Bila `npm run dev` sudah berjalan di terminal lain, Zentara memakainya. Lewati pertanyaannya dengan `--no-dev`.
- **Jawaban mengalir (streaming).** Teks AI muncul baris demi baris selagi ditulis, tidak perlu menunggu jawaban selesai.
- **Percakapan berlanjut dan tersimpan.** Permintaan berikutnya bisa merujuk yang sebelumnya ("ubah warnanya jadi biru"). Percakapan disimpan otomatis di `.zentara/sessions/` (30 terbaru, diabaikan git), jadi setelah menutup terminal Anda bisa melanjutkannya dengan `/resume` atau `zentara --continue`.
- **Hemat token.** `/compact` meringkas percakapan panjang menjadi catatan singkat. Ini juga terjadi otomatis saat percakapan melewati ±60 ribu token (atur dengan `ai.compactAt`), sehingga batas token per menit provider (error 429) lebih jarang tercapai.
- **Esc** menghentikan AI kapan saja. **Ctrl+C dua kali** untuk keluar (server dev ikut dimatikan).
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
| `/clear` | mulai percakapan baru |
| `/exit` | keluar |
