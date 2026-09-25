<p align="center"><img src="https://raw.githubusercontent.com/melkimahdali/zentara-core/main/assets/zentara-banner.webp" alt="Zentara Core — AI-driven TypeScript web framework from Indonesia" width="100%"></p>

# Zentara Core

*Rooted here. Built for what's next.*

Framework web TypeScript AI-driven asal Nusantara: routing berbasis file, auth, database, dan **Zentara AI** yang membangun aplikasi dari bahasa sehari-hari.

📖 Dokumentasi lengkap: **https://zentara-core.morixa.id/**

> Status: **v0.8**. API masih bisa berubah sebelum v1.0.

## Mulai cepat

Butuh Node.js 22 atau lebih baru.

```bash
npm create zentara@latest toko-saya     # pilih template: api (login + database) atau minimal
cd toko-saya
npx zentara                             # CLI interaktif: chat dengan AI + server dev di latar belakang
```

Atau jalankan server saja dengan `npm run dev` (http://localhost:3000, auto-reload). Halaman sambutan dan halaman error di browser juga punya chat Zentara AI selama pengembangan.

| Perintah | Fungsi |
|---|---|
| `zentara dev` | server pengembangan dari `src/app` (TypeScript, auto-reload) |
| `zentara build` | kompilasi ke `dist/` (memakai `tsconfig.build.json`) |
| `zentara start` | jalankan hasil build (`dist/app`), default `NODE_ENV=production` |
| `zentara routes` | daftar route |
| `zentara make:route <path>` · `make:middleware <nama>` | buat file baru |
| `zentara db:generate` · `db:migrate` · `db:seed` | database |
| `zentara` | CLI interaktif Zentara AI (gaya Claude Code) |
| `zentara "<kalimat>"` · `ai:status` · `ai:setup` · `undo` | Zentara AI |

Di dalam proyek, jalankan lewat `npx zentara ...` atau skrip `npm run dev` / `build` / `start`.

Import API framework dari paket:

```ts
import { HttpError, json, validate, type ZenContext } from "zentara";
import { createSqlite, createPostgres } from "zentara/db";
```

## Zentara AI: cukup bicara

Tidak perlu hafal perintah. Tulis apa yang Anda mau dalam bahasa sehari-hari:

```bash
npx zentara                       # CLI interaktif: percakapan berlanjut, server dev di latar belakang
npx zentara "buatkan API produk dengan nama, harga, dan stok, lengkap dengan validasi"   # satu perintah
npx zentara undo                  # batalkan perubahan AI terakhir
```

### CLI interaktif

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

`zentara --classic` (atau `ZENTARA_UI=classic`) memakai CLI klasik tanpa Ink. Logo pembuka beranimasi, dan bisa dimatikan dengan `cli: { animation: false }` di `zentara.config.mjs` atau `ZENTARA_ANIMATION=off`.

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

### Zentara AI di browser

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

### Persetujuan

| Mode | Perubahan file biasa | Aksi krusial |
|---|---|---|
| `ask` (default) | ditanyakan satu per satu (bisa pilih "setujui semua" untuk sisanya) | selalu ditanyakan |
| `auto` (`--auto` atau `ai.mode: "auto"`) | langsung dikerjakan | selalu ditanyakan |

Yang termasuk **aksi krusial**:
- menghapus file, memasang paket npm, serta menerapkan migrasi atau seed ke database;
- menyalakan atau memulai ulang server dev (dari CLI interaktif);
- mengedit file migrasi di `drizzle/` secara manual;
- mengubah `package.json`, `zentara.config`, `tsconfig`, `.github/`, `.gitignore`, atau `.env*`.

Yang **tidak pernah** bisa dilakukan AI:
- membaca atau mengubah `.env` dan file database (`.db`/`.sqlite`), supaya rahasia dan data pengguna tidak dikirim ke provider AI;
- menulis ke `.git/`, `node_modules/` (termasuk framework Zentara), atau `dist/`;
- menyentuh file di luar folder proyek, termasuk lewat symlink.

Pilihan lain:
- `--dry-run`: melihat rencana tanpa mengubah apa pun.
- Setiap perubahan dicatat di `.zentara/history/`, jadi `zentara undo` bisa mengembalikannya.

### Provider AI & fallback

**Default: [OmniRoute](https://github.com/diegosouzapw/OmniRoute), gratis tanpa API key.** OmniRoute adalah gateway AI lokal ke ratusan provider, termasuk banyak yang gratis. Model `auto` memilih provider gratis yang sedang sehat.

#### Tutorial: memakai OmniRoute

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

## Routing berbasis file

Setiap file di `src/app/routes/` menjadi URL:

| File | URL |
|---|---|
| `index.ts` | `/` |
| `about.ts` | `/about` |
| `api/hello.ts` | `/api/hello` |
| `users/index.ts` | `/users` |
| `users/[id].ts` | `/users/42` → `ctx.params.id === "42"` |
| `docs/[...slug].ts` | `/docs/a/b` → `ctx.params.slug === "a/b"` |
| `_utils.ts` | (diabaikan, bukan route) |

Route statis selalu menang atas `[param]`, dan `[param]` menang atas `[...catchAll]`.

Export satu function per HTTP method. `default` menangani semua method:

```ts
// src/app/routes/api/users/[id].ts
import { HttpError, json, type ZenContext } from "zentara";

export function GET(ctx: ZenContext) {
  return { id: ctx.params.id };                 // object -> JSON
}

export async function PUT(ctx: ZenContext) {
  const body = await ctx.json<{ name: string }>();
  if (!body?.name) throw new HttpError(400, "name wajib diisi");
  return json({ ok: true }, { status: 200 });    // status/header kustom
}
```

Nilai yang dikembalikan handler:

| Return | Respons |
|---|---|
| `string` | `200 text/html` |
| object / array | `200 application/json` |
| `undefined` / `null` | `204 No Content` |
| `json()`, `html()`, `text()`, `redirect()` | status dan header sesuai pilihan |

Perilaku bawaan lainnya:
- `HEAD` otomatis memakai `GET`.
- `OPTIONS` otomatis menjawab dengan header `Allow`.
- Method yang tidak diekspor dijawab `405`.
- Error biasa menjadi `500` tanpa membocorkan detail dan tidak mematikan server. `HttpError` memakai status dan pesannya sendiri.
- Body request dibatasi `bodyLimit` (default 1 MB, lebih dari itu dijawab `413`). JSON yang tidak valid dijawab `400`.

## Context (`ctx`)

`method`, `path`, `url`, `query`, `params`, `state`, `req`, `res`, `cookies`, `session`, `logger`, serta `await ctx.body()`, `ctx.text()`, `ctx.json()`.

## Middleware

Middleware bergaya "onion". Kerjakan sesuatu sebelum `await next()`, lalu kerjakan sesuatu lagi sesudahnya. Kalau middleware mengembalikan nilai tanpa memanggil `next()`, rantai berhenti di situ.

```ts
import { defineMiddleware, HttpError } from "zentara";

export const requireLogin = defineMiddleware(async (ctx, next) => {
  if (!ctx.session.get("userId")) throw new HttpError(401, "Silakan login");
  return next();
});
```

Ada tiga tempat untuk memasang middleware, dan urutan eksekusinya dari atas ke bawah:

| Tempat | Cakupan |
|---|---|
| `middleware: [...]` di `zentara.config.mjs` | semua request |
| `runtime.use(...)` di `setup()` plugin | semua request |
| `src/app/middleware.ts` (`export default [...]`) | semua request |
| `export const middleware = [...]` di file route | hanya route itu |

Middleware bawaan:

```ts
// src/app/middleware.ts
import { cors, csrf, requestLogger, session } from "zentara";

export default [
  requestLogger(),                                        // GET /api/hello 200 1.2ms
  cors({ origin: ["https://app.contoh.id"], credentials: true }),
  csrf(),                                                 // tolak POST/PUT/PATCH/DELETE lintas origin
  session(),                                              // ctx.session, secret dari SESSION_SECRET
];
```

## Session & cookie

`session()` menyimpan data **terenkripsi (AES-256-GCM)** di dalam cookie, jadi tidak butuh database atau Redis. Batas ukurannya sekitar 4 KB, jadi simpan ID saja, bukan data besar.

```ts
ctx.session.set("userId", 42);
ctx.session.get<number>("userId");
ctx.session.destroy();               // logout

ctx.cookies.get("tema");
ctx.cookies.set("tema", "gelap", { maxAge: 60 * 60 * 24 * 365 });  // default: HttpOnly, SameSite=Lax
ctx.cookies.delete("tema");
```

Rotasi kunci: `session({ secret: [rahasiaBaru, rahasiaLama] })`. Rahasia baru dipakai untuk mengenkripsi, dan keduanya tetap bisa membaca session lama.

## CSRF & CORS

- **`csrf()`** tidak memakai token. Middleware ini memeriksa header `Sec-Fetch-Site` dan `Origin` yang dikirim browser modern, dan menolak (`403`) request yang mengubah data bila datang dari origin lain. Klien non-browser seperti curl atau server-ke-server tidak terpengaruh. Opsi yang tersedia: `trustedOrigins` dan `skip(ctx)`.
- **`cors()`** menangani request biasa dan preflight. Opsinya: `origin` (string, array, RegExp, atau function), `credentials`, `methods`, `allowedHeaders`, `exposedHeaders`, dan `maxAge`.

## Validasi input

`validate()` menerima schema apa pun yang mengikuti [Standard Schema](https://standardschema.dev), misalnya zod, valibot, atau arktype. Core Zentara tetap tanpa dependency.

```ts
// npm install zod
import { z } from "zod";
import { validate } from "zentara";

export const POST = validate(
  {
    body: z.object({ name: z.string().min(2), age: z.coerce.number().int().min(17) }),
    query: z.object({ ref: z.string().optional() }),
  },
  (ctx, { body, query }) => ({ halo: body.name, ref: query.ref }),  // body & query sudah bertipe
);
```

Body dibaca sesuai `Content-Type`: JSON atau form HTML (`application/x-www-form-urlencoded`). Input yang tidak valid dijawab `422` dengan daftar error per field:

```json
{ "error": { "status": 422, "message": "Validasi gagal",
  "details": { "source": "body", "issues": [{ "path": "age", "message": "Too small: expected number to be >=17" }] } } }
```

Untuk validasi manual: `const data = await parse(schema, nilai)`.

## CLI

```bash
npx zentara routes                                   # daftar route (+ --json)
npx zentara make:route api/products/[id] --methods GET,PUT
npx zentara make:middleware auth-guard
```



## Database

Zentara memakai [Drizzle ORM](https://orm.drizzle.team). Defaultnya SQLite lewat modul `node:sqlite` bawaan Node, jadi **tidak perlu memasang driver atau server database** apa pun.

```ts
// src/app/db/schema.ts
export const products = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  price: integer("price").notNull(),
});

// di route
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products } from "../../db/schema.js";

export const GET = () => db.select().from(products);
const [baru] = await db.insert(products).values({ name: "Kopi", price: 45000 }).returning();
await db.update(products).set({ price: 40000 }).where(eq(products.id, 1));
await db.transaction(async (tx) => { /* ... */ });
```

Alur kerja setelah mengubah schema:

| Perintah | Fungsi |
|---|---|
| `zentara db:generate [--name x]` | buat file migrasi SQL di `drizzle/` dari perubahan schema |
| `zentara db:migrate` | terapkan migrasi yang belum jalan |
| `zentara db:seed` | isi data awal dari `src/app/db/seed.ts` (aman diulang) |

**PostgreSQL untuk produksi:**
1. Jalankan `npm install postgres`.
2. Tulis schema dengan `drizzle-orm/pg-core`, lalu ubah `dialect` di `drizzle.config.ts` menjadi `"postgresql"`.
3. Di `src/app/db/index.ts`, ganti `createSqlite(...)` dengan `await createPostgres(process.env.DATABASE_URL, schema)`.

Catatan SQLite: transaksi dijalankan bergantian (satu per satu) supaya query dari request lain tidak ikut masuk ke transaksi yang sedang berjalan.

## Auth

Auth sudah tersedia di core. Password di-hash dengan scrypt (parameter OWASP), dan sesi memakai session terenkripsi.

```ts
import { hashPassword, verifyPassword, fakeVerify, login, logout, currentUser, requireAuth, rateLimit, withMiddleware } from "zentara";

login(ctx, { id: user.id, role: user.role });   // setelah password cocok
logout(ctx);

export const middleware = [requireAuth()];                      // seluruh file route wajib login
export const POST = withMiddleware([requireAuth({ roles: ["admin"] })], handler);  // satu method saja
export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];         // anti brute-force
```

`requireAuth({ loadUser })` memuat user terbaru dari database di setiap request. Akibatnya:
- user yang dihapus otomatis ter-logout;
- perubahan role langsung berlaku.

Aplikasi contoh sudah menyediakan fitur-fitur berikut:

| Endpoint | Akses |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` | publik (rate limit 10×/15 menit) |
| `GET /api/auth/me` | wajib login |
| `GET /api/products?q=&maxHarga=` · `GET /api/products/:id` | publik |
| `POST /api/products` · `PUT/DELETE /api/products/:id` | khusus admin |

Pengaman bawaan pada login:
- pesan dan waktu respons sama untuk email yang tidak terdaftar maupun password salah (`fakeVerify`);
- hash password tidak pernah dikirim ke klien;
- hash lama otomatis diperbarui saat login (`needsRehash`).

## View

```ts
import { h, raw, renderToString } from "zentara";

renderToString(h("p", { class: "note" }, userInput)); // teks & atribut otomatis di-escape
renderToString(h("style", null, raw(css)));            // raw() hanya untuk HTML tepercaya
```

## File statis

Isi folder `public/` dilayani apa adanya, misalnya `public/logo.png` di `/logo.png`. Route didahulukan daripada file statis. Dotfile dan path traversal ditolak.

## Konfigurasi

Konfigurasi ada di `zentara.config.mjs`:

```js
export default {
  appName: "Zentara Core",
  port: 3000,          // env PORT menimpa nilai ini
  host: "0.0.0.0",     // env HOST
  logLevel: "info",    // debug | info | warn | error | silent (env LOG_LEVEL)
  debug: true,         // halaman error lengkap; default true hanya saat NODE_ENV=development (env ZENTARA_DEBUG)
  bodyLimit: 1048576,
  publicDir: "public", // atau false
  plugins: [],
  middleware: [],      // middleware global
  middlewareFile: "src/app/middleware", // default: app/middleware di samping folder route; false = mati
};
```

## Plugin

```ts
import { definePlugin } from "zentara";

export default definePlugin({
  name: "hello",
  setup(runtime) {
    runtime.logger.info("plugin aktif");
  },
});
```

## Struktur proyek

```
src/app/routes/       route aplikasi (file = URL)
src/app/middleware.ts middleware global aplikasi
src/app/db/           schema, koneksi, dan seed database (template api)
src/app/lib/          helper aplikasi (mis. requireUser/requireAdmin)
public/               file statis
zenstyles/            CSS aplikasi
drizzle/              file migrasi SQL (hasil db:generate)
test/                 test (node:test)
zentara.config.mjs    konfigurasi
```

## Lisensi

Lisensi [Business Source License 1.1](https://github.com/melkimahdali/zentara-core/blob/main/LICENSE) (BSL). Boleh dipakai gratis untuk membangun dan menjalankan aplikasi Anda sendiri, termasuk untuk produksi dan komersial; yang dilarang adalah menawarkan Zentara Core (atau turunannya) sebagai framework, generator proyek, atau layanan pesaing. Setiap versi otomatis menjadi Apache 2.0 empat tahun setelah terbit. Versi 0.8.6 ke bawah tetap MIT.
