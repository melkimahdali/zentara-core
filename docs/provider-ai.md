---
title: Provider AI & OmniRoute
order: 2
group: Zentara AI
description: OmniRoute gratis sebagai default, plus Claude, OpenAI, Gemini, dan lainnya.
---

# Provider AI & OmniRoute

**Default: [OmniRoute](https://github.com/diegosouzapw/OmniRoute), gratis tanpa API key.** OmniRoute adalah gateway AI lokal ke ratusan provider, termasuk banyak yang gratis. Model `auto` memilih provider gratis yang sedang sehat.

## Tutorial: memakai OmniRoute

Zentara bisa memasang dan menjalankan OmniRoute sendiri. Tidak perlu membuka terminal lain.

1. **Pasang.** Pilih salah satu:
   - saat `npm create zentara@latest`, jawab **Y** pada *"Pasang OmniRoute sekarang?"*;
   - di CLI interaktif (`npx zentara`), pilih **Ya, pasang & jalankan** saat ditawari, atau ketik `/omniroute install`;
   - lewat wizard `npx zentara ai:setup omniroute`;
   - atau manual: `npm install -g omniroute`.

   OmniRoute butuh Node.js 22.22+ atau 24+, dan cukup dipasang sekali untuk semua proyek.
2. **Jalankan.** `npx zentara` otomatis menawarkan menjalankan OmniRoute di latar belakang dan mematikannya lagi saat Anda keluar. Perintah lain:
   - `/omniroute`: cek status;
   - `/omniroute start` / `/omniroute stop`: nyalakan atau matikan.
3. **Pakai.** Tulis permintaan seperti biasa. Model `auto` langsung bekerja tanpa API key.
4. **(Opsional) Tambah provider gratis** di dashboard OmniRoute http://localhost:20128, menu **Providers**, mis. *OpenCode Free* (tanpa login) atau *Kiro*. Bila dashboard meminta API key untuk endpoint, salin dari **Endpoints** lalu simpan dengan `npx zentara ai:setup omniroute`.

Bila OmniRoute tidak berjalan, Zentara otomatis memakai provider berikutnya di rantai (mis. OpenAI atau Claude bila API key-nya diisi).

Untuk memilih provider lain:

```bash
npx zentara ai:setup            # menu: pilih provider, ketik API key (tersembunyi), pilih model, tes koneksi
npx zentara ai:setup openai     # langsung ke provider tertentu
npx zentara ai:status           # lihat rantai provider yang aktif
```

Hasilnya disimpan ke `.env` (izin 0600, tidak ikut ter-commit), bukan ke file config.

Zentara mencoba provider **berurutan**. Kalau satu provider kehabisan kredit (402), kena batas kuota (429), mati, atau belum diatur, Zentara otomatis pindah ke provider berikutnya tanpa kehilangan percakapan. Provider cloud **otomatis ikut** begitu API key-nya ada di `.env`:

| Provider | API key | Model (default) | Keterangan |
|---|---|---|---|
| [OmniRoute](https://github.com/diegosouzapw/OmniRoute) (default) | `OMNIROUTE_API_KEY` (opsional) | `OMNIROUTE_MODEL` (`auto`) | gratis, lokal di `localhost:20128`, dicoba paling awal; dilewati bila tidak berjalan |
| Claude | `ANTHROPIC_API_KEY` | `ZENTARA_CLAUDE_MODEL` (`claude-opus-5`) | selalu ada di rantai; dilewati bila key kosong |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` (`gpt-4.1`) | otomatis memakai `max_completion_tokens` |
| Google Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` (`gemini-2.5-flash`) | |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` (`llama-3.3-70b-versatile`) | |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL` (`deepseek-chat`) | |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` (`openai/gpt-4.1`) | banyak model dengan satu key |
| Ollama | – | `OLLAMA_MODEL` | lokal & offline di `localhost:11434` |

Pengaturan lain:
- **Urutan:** default OmniRoute → Claude → provider cloud yang key-nya terisi → Ollama. Ubah dengan `ZENTARA_AI_ORDER=openai,omniroute,claude` (provider lain yang aktif menyusul di belakang), atau jawab "Ya" pada "Jadikan provider utama?" di `ai:setup`.
- **Alamat API** (proxy atau gateway): `OPENAI_BASE_URL`, `GEMINI_BASE_URL`, `GROQ_BASE_URL`, `DEEPSEEK_BASE_URL`, `OPENROUTER_BASE_URL`, `OMNIROUTE_URL`, `OLLAMA_URL`.
- **Model default bisa usang.** Ganti lewat variabel `*_MODEL`, atau pilih dari daftar model akun Anda di `ai:setup`.

Untuk kendali penuh, tulis rantainya sendiri di `zentara.config.mjs`. Bila diisi, pengaturan dari `.env` di atas tidak dipakai:

```js
ai: {
  mode: "ask",
  providers: [
    { type: "openai-compatible", name: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1", apiKey: process.env.OPENAI_API_KEY },
    { type: "anthropic", name: "claude" },
    { type: "openai-compatible", name: "ollama", baseUrl: "http://localhost:11434/v1", model: "qwen3-coder" },
  ],
},
```

Catatan:
- Claude dipanggil dengan *server-side fallback* (`fallbacks: "default"`). Kalau model utama menolak permintaan karena kebijakan keamanan, API otomatis mengulanginya di model cadangan.
- Kode proyek dikirim ke provider yang Anda pilih. Output selalu menampilkan provider mana yang dipakai.
- Jawaban dialirkan (*streaming*) di semua provider. Server OpenAI-compatible yang tidak mendukung streaming dideteksi otomatis, lalu dipakai tanpa streaming.
