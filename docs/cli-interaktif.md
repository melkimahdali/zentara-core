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

Saat dibuka, Zentara menampilkan logo Zentara Core beserta versi, AI yang aktif, mode, dan folder, seperti Claude Code. Kolom input ada di antara dua garis, dengan baris mode di bawahnya (**Shift+Tab** untuk mengganti mode). Lalu:
- **Belum ada AI yang siap:** muncul layar sambutan untuk memilih cara mengakses model, yaitu *OmniRoute (gratis)*, *Masukkan API key*, *Provider kustom*, atau *Lewati dulu*. Menu dipilih dengan ↑/↓ + Enter, atau ketik untuk mencari.
- **Di luar folder proyek:** muncul pilihan *Buat proyek baru* (menjalankan `npm create zentara` lalu langsung membuka proyeknya), *Chat di folder ini*, atau *Buka dokumentasi*.

Fitur sesi interaktif:

- **Server dev di latar belakang.** Saat dibuka, Zentara bertanya dulu *"Jalankan server dev (npm run dev) di latar belakang?"*. Bila Ya, tidak perlu membuka terminal kedua; lognya disimpan (lihat dengan `/logs`) dan error server muncul di baris status. AI juga bisa membaca log itu untuk mencari penyebab error, dan menyalakan server hanya setelah Anda setujui. Bila `npm run dev` sudah berjalan di terminal lain, Zentara memakainya. Lewati pertanyaannya dengan `--no-dev`.
- **Percakapan berlanjut**, jadi permintaan berikutnya bisa merujuk yang sebelumnya ("ubah warnanya jadi biru").
- **Esc** menghentikan AI kapan saja. **Ctrl+C dua kali** untuk keluar (server dev ikut dimatikan).
- **Persetujuan lewat menu** (↑/↓ lalu Enter, atau angka): *Ya*, *Ya dan setujui semua perubahan biasa*, atau *Tidak*. Perubahan ditampilkan sebagai diff berwarna.
- **Perintah garis miring:**

| Perintah | Fungsi |
|---|---|
| `/help` | bantuan |
| `/mode ask` · `/mode auto` | ganti mode persetujuan |
| `/dev` · `/dev start` · `/dev stop` · `/dev restart` | kendalikan server dev |
| `/logs` | log server dev terakhir |
| `/open [path]` | buka aplikasi di browser |
| `/undo` | batalkan perubahan AI terakhir |
| `/status` · `/setup` (alias `/login`) | cek atau atur akses AI; `/setup openai` langsung ke provider tertentu |
| `/omniroute` | OmniRoute (AI gratis): status, `install`, `start`, `stop` |
| `/clear` | mulai percakapan baru |
| `/exit` | keluar |
