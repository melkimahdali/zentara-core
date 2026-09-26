---
title: Referensi CLI
order: 2
group: Referensi
description: Semua perintah zusantara.
---

# Referensi CLI

Pasang global agar cukup mengetik `zusantara`, atau jalankan lewat `npx zusantara` di folder proyek.

```bash
npm install -g zusantara
```

## Aplikasi

| Perintah | Fungsi |
|---|---|
| `zusantara dev` | server pengembangan dari `src/app` (TypeScript, auto-reload, halaman error lengkap, chat AI di browser) |
| `zusantara build` | kompilasi ke `dist/` |
| `zusantara start` | jalankan hasil build (`NODE_ENV=production`) |
| `zusantara routes [--json]` | daftar route |
| `zusantara view <path> [--mobile\|--tablet] [--dark] [--lang en] [--screenshot] [--min-score 80] [--text "a,b"] [--json]` | lihat halaman, periksa tampilannya, dan beri skor, di tab browser bila ada, bila tidak versi teks ([AI di browser](ai-browser.html)) |
| `zusantara requests [id] [--path /x] [--json]` | request terakhir di server dev: waktu proses, query, N+1, session, dan log ([Alat pengembang](ai-browser.html#alat-pengembang)) |
| `zusantara ai:log [--limit 20] [--json]` | hasil tugas Zusantara AI terakhir dari journal lokal |
| `zusantara ui [Nama] [--group form] [--json]` | katalog komponen kit UI: kegunaan, props, dan contoh ([Kit UI](ui.html)) |
| `zusantara ui --example [nama]` | contoh halaman utuh (landing, profil, toko, booking, dasbor) sebagai kode route lengkap |
| `zusantara theme [--accent biru] [--radius lg] [--font system] [--mode dark] [--reset]` | lihat atau ubah tema kit UI di `zusantara.config.mjs` |
| `zusantara make:route <path> [--methods GET,POST]` | buat file route, mis. `api/events/[id]` |
| `zusantara make:middleware <nama>` | buat file middleware |
| `zusantara make:job <nama> [--schedule "0 7 * * *"]` | buat file [job](jobs.html), opsional dengan jadwal cron |
| `zusantara jobs [--json]` | daftar job, jadwal, jalan berikutnya, dan isi antrean |
| `zusantara jobs:run <nama> [--data <json>]` | jalankan satu job sekarang, tanpa antrean |
| `zusantara db:generate` · `db:migrate` · `db:seed` | database (Drizzle) |
| `zusantara lang [id\|en]` | lihat atau ganti [bahasa](bahasa.html) Zusantara |
| `zusantara migrate:zusantara` | pindahkan proyek yang dibuat saat framework masih bernama Zentara (lihat di bawah) |

## Zusantara AI

| Perintah | Fungsi |
|---|---|
| `zusantara` | CLI interaktif (gaya Claude Code) |
| `zusantara --continue` | CLI interaktif, langsung melanjutkan percakapan terakhir |
| `zusantara --classic` | CLI interaktif klasik (tanpa tampilan Ink) |
| `zusantara "<kalimat>" [--auto] [--dry-run] [--report <file>]` | satu perintah AI |
| `zusantara ai:setup [provider]` | atur akses AI dengan menu panah |
| `zusantara ai:status` | cek provider AI |
| `zusantara undo [--yes]` | batalkan perubahan AI terakhir |

## Perintah di CLI interaktif

| Perintah | Fungsi |
|---|---|
| `/help` | bantuan |
| `/mode ask` · `/mode auto` (atau **Shift+Tab**) | mode persetujuan |
| `/dev` · `/dev start` · `/dev stop` · `/dev restart` | server dev di latar belakang |
| `/logs` | log server dev |
| `/open [path]` | buka aplikasi di browser |
| `/undo` | batalkan perubahan AI terakhir |
| `/resume` | lanjutkan percakapan tersimpan |
| `/compact` | ringkas percakapan |
| `/status` · `/setup [provider]` (alias `/login`) | cek atau atur akses AI |
| `/omniroute [install\|start\|stop]` | OmniRoute (AI gratis) |
| `/lang [id\|en]` | ganti bahasa |
| `/clear` | percakapan baru |
| `/exit` | keluar |

**Esc** menghentikan AI; **Ctrl+C** dua kali untuk keluar.

## Opsi umum

| Opsi | Fungsi |
|---|---|
| `--auto` | perubahan biasa langsung dikerjakan; aksi krusial tetap ditanyakan |
| `--dry-run` | lihat rencana AI tanpa mengubah file |
| `--report <file>` | tulis hasil tugas AI (status, langkah, token, tool, aksi yang ditolak) sebagai JSON; tanpa nama file ke `.zusantara/ai-report.json` |
| `--no-dev` | CLI interaktif tanpa menawarkan server dev |
| `--continue` | CLI interaktif melanjutkan percakapan terakhir |
| `--no-ai` | `zusantara dev` tanpa chat AI di browser |
| `--force` | timpa file saat `make:*` |
| `--lang id\|en` | bahasa untuk `npm create zusantara` |

## Pindah dari Zentara

Sampai 0.12.9 framework ini bernama **Zentara** (paket `zentara` dan `create-zentara`). Proyek lama dipindah dengan satu perintah dari folder proyek:

```bash
npx zusantara@latest migrate:zusantara
npm install
```

Perintah ini mengganti import `zentara` dan `zentara/...` menjadi `zusantara/...`, dependensi dan script di `package.json`, `zentara.config.mjs` menjadi `zusantara.config.mjs`, variabel `ZENTARA_*` di `.env`, dan folder `.zentara/` menjadi `.zusantara/`. Zusantara AI juga bisa menjalankannya (dengan persetujuan Anda).

Selama 0.12.x nama lama masih diterima: perintah `zentara`, `zentara.config.mjs`, variabel `ZENTARA_*`, dan URL `/_zentara/*`. Dukungan ini dihapus di 0.13.
