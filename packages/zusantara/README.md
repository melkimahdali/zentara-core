<p align="center"><img src="https://raw.githubusercontent.com/melkimahdali/zusantara-core/main/assets/zusantara-banner.webp" alt="Zusantara Core — AI-driven TypeScript web framework from Indonesia" width="100%"></p>

# Zusantara Core

*Rooted here. Built for what's next.*

**English** · [Bahasa Indonesia](#bahasa-indonesia)

An AI-driven TypeScript web framework from Indonesia: file-based routing, auth, a database, background jobs, and **Zusantara AI**, which builds your app from plain-language requests, with your approval and always checked by tests. Zusantara is general-purpose: build a blog, a booking system, an internal dashboard, an API, or anything else.

📖 Documentation: **https://zusantara.morixa.id/en/**

## Quick start

Requires Node.js 22 or newer.

```bash
npm create zusantara@latest my-app -- --lang en   # template: api (sign-in + database) or minimal
cd my-app
npx zusantara                                     # interactive CLI: chat with the AI + dev server in the background
```

Or install the CLI globally and just type `zusantara`:

```bash
npm install -g zusantara
zusantara
❯ build a booking schedule page for signed-in users
```

## Features

- **File-based routing** (`src/app/routes/users/[id].ts` → `/users/42`) and input validation with zod, valibot, or arktype.
- **Built-in security:** encrypted sessions, CSRF, CORS, rate limiting, and error pages that never leak details in production.
- **Database** with Drizzle ORM: zero-install SQLite, or PostgreSQL.
- **Auth** with scrypt and roles, plus ready-made sign-in, sign-up, dashboard, and admin pages from the `zusantara/ui` kit.
- **Back-end:** background jobs with retries and cron schedules, SMTP email, safe file uploads, and an in-memory cache.
- **Zusantara AI** in the terminal (a Claude Code–style interactive CLI) and in the browser: chat from the welcome page or an error page to build features or fix errors. Every change is shown as a diff and can be undone.
- **AI providers:** OmniRoute (default, free), Claude, OpenAI, Gemini, Groq, DeepSeek, OpenRouter, and Ollama, with automatic fallback.
- **Two languages:** everything (CLI, AI, pages, UI kit, templates) is available in English and Indonesian. `zusantara lang en`, or `locale: "en"` in `zusantara.config.mjs`.

```ts
// src/app/routes/api/notes.ts
import { enqueue, validate } from "zusantara";
import { z } from "zod";

export const POST = validate({ body: z.object({ title: z.string().min(1) }) }, async (ctx, { body }) => {
  const note = await createNote(body.title);
  await enqueue("notify-followers", { noteId: note.id }); // runs in the background
  return note;
});
```

License: [Business Source License 1.1](https://github.com/melkimahdali/zusantara-core/blob/main/LICENSE). Free to build and run your own apps, including in production and commercially; offering Zusantara Core (or a derivative) as a competing framework, project generator, or service is not allowed. Each version becomes Apache 2.0 four years after release.

---

## Bahasa Indonesia

Framework web TypeScript AI-driven asal Nusantara: routing berbasis file, auth, database, job latar belakang, dan **Zusantara AI** yang membangun aplikasi dari bahasa sehari-hari, dengan persetujuan Anda dan selalu dicek dengan test. Zusantara framework umum: bangun blog, sistem booking, dasbor internal, API, atau aplikasi apa pun.

📖 Dokumentasi: **https://zusantara.morixa.id/**

```bash
npm create zusantara@latest aplikasi-saya     # pilih bahasa dan template: api (login + database) atau minimal
cd aplikasi-saya
npx zusantara                                 # CLI interaktif: chat dengan AI + server dev di latar belakang
```

Fitur utama:
- **Routing berbasis file** dan validasi input (zod/valibot/arktype).
- **Keamanan bawaan:** session terenkripsi, CSRF, CORS, rate limit, dan halaman error yang tidak membocorkan detail di produksi.
- **Database** Drizzle ORM: SQLite tanpa instalasi, atau PostgreSQL.
- **Auth** dengan scrypt dan role, plus halaman login, daftar, dasbor, dan admin dari kit UI `zusantara/ui`.
- **Back-end:** job latar belakang dengan coba ulang dan jadwal cron, email SMTP, unggah file yang aman, dan cache.
- **Zusantara AI** di terminal (CLI interaktif gaya Claude Code) dan di browser. Setiap perubahan ditampilkan sebagai diff dan bisa di-undo.
- **Provider AI:** OmniRoute (default, gratis), Claude, OpenAI, Gemini, Groq, DeepSeek, OpenRouter, Ollama, dengan fallback otomatis.
- **Dua bahasa:** Bahasa Indonesia (default) dan Bahasa Inggris.

Lisensi [Business Source License 1.1](https://github.com/melkimahdali/zusantara-core/blob/main/LICENSE): gratis untuk membangun dan menjalankan aplikasi Anda sendiri, termasuk produksi dan komersial. Setiap versi otomatis menjadi Apache 2.0 empat tahun setelah terbit. Versi 0.8.6 ke bawah tetap MIT.
