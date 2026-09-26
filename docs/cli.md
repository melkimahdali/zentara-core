---
title: Referensi CLI
order: 2
group: Referensi
description: Semua perintah zentara.
---

# Referensi CLI

Pasang global agar cukup mengetik `zentara`, atau jalankan lewat `npx zentara` di folder proyek.

```bash
npm install -g zentara
```

## Aplikasi

| Perintah | Fungsi |
|---|---|
| `zentara dev` | server pengembangan dari `src/app` (TypeScript, auto-reload, halaman error lengkap, chat AI di browser) |
| `zentara build` | kompilasi ke `dist/` |
| `zentara start` | jalankan hasil build (`NODE_ENV=production`) |
| `zentara routes [--json]` | daftar route |
| `zentara view <path> [--mobile] [--text "a,b"] [--json]` | lihat halaman dan periksa tampilannya, di tab browser bila ada, bila tidak versi teks ([AI di browser](ai-browser.html)) |
| `zentara ai:log [--limit 20] [--json]` | hasil tugas Zentara AI terakhir dari journal lokal |
| `zentara make:route <path> [--methods GET,POST]` | buat file route, mis. `api/events/[id]` |
| `zentara make:middleware <nama>` | buat file middleware |
| `zentara make:job <nama> [--schedule "0 7 * * *"]` | buat file [job](jobs.html), opsional dengan jadwal cron |
| `zentara jobs [--json]` | daftar job, jadwal, jalan berikutnya, dan isi antrean |
| `zentara jobs:run <nama> [--data <json>]` | jalankan satu job sekarang, tanpa antrean |
| `zentara db:generate` · `db:migrate` · `db:seed` | database (Drizzle) |
| `zentara lang [id\|en]` | lihat atau ganti [bahasa](bahasa.html) Zentara |

## Zentara AI

| Perintah | Fungsi |
|---|---|
| `zentara` | CLI interaktif (gaya Claude Code) |
| `zentara --continue` | CLI interaktif, langsung melanjutkan percakapan terakhir |
| `zentara --classic` | CLI interaktif klasik (tanpa tampilan Ink) |
| `zentara "<kalimat>" [--auto] [--dry-run] [--report <file>]` | satu perintah AI |
| `zentara ai:setup [provider]` | atur akses AI dengan menu panah |
| `zentara ai:status` | cek provider AI |
| `zentara undo [--yes]` | batalkan perubahan AI terakhir |

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
| `--report <file>` | tulis hasil tugas AI (status, langkah, token, tool, aksi yang ditolak) sebagai JSON; tanpa nama file ke `.zentara/ai-report.json` |
| `--no-dev` | CLI interaktif tanpa menawarkan server dev |
| `--continue` | CLI interaktif melanjutkan percakapan terakhir |
| `--no-ai` | `zentara dev` tanpa chat AI di browser |
| `--force` | timpa file saat `make:*` |
| `--lang id\|en` | bahasa untuk `npm create zentara` |
