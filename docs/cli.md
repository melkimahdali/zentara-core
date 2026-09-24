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
| `zentara make:route <path> [--methods GET,POST]` | buat file route, mis. `api/products/[id]` |
| `zentara make:middleware <nama>` | buat file middleware |
| `zentara db:generate` · `db:migrate` · `db:seed` | database (Drizzle) |

## Zentara AI

| Perintah | Fungsi |
|---|---|
| `zentara` | CLI interaktif (gaya Claude Code) |
| `zentara "<kalimat>" [--auto] [--dry-run]` | satu perintah AI |
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
| `/status` · `/setup [provider]` (alias `/login`) | cek atau atur akses AI |
| `/omniroute [install\|start\|stop]` | OmniRoute (AI gratis) |
| `/clear` | percakapan baru |
| `/exit` | keluar |

**Esc** menghentikan AI; **Ctrl+C** dua kali untuk keluar.

## Opsi umum

| Opsi | Fungsi |
|---|---|
| `--auto` | perubahan biasa langsung dikerjakan; aksi krusial tetap ditanyakan |
| `--dry-run` | lihat rencana AI tanpa mengubah file |
| `--no-dev` | CLI interaktif tanpa menawarkan server dev |
| `--no-ai` | `zentara dev` tanpa chat AI di browser |
| `--force` | timpa file saat `make:*` |
