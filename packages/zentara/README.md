# Zentara

Framework web TypeScript AI-driven asal Nusantara: routing berbasis file, auth, database, dan **Zentara AI** yang membangun aplikasi dari bahasa sehari-hari.

> Status: **v0.6, rilis awal**. API masih bisa berubah sebelum v1.0.

## Mulai cepat

Butuh Node.js 22 atau lebih baru.

```bash
npm create zentara@latest toko-saya     # pilih template: api (login + database) atau minimal
cd toko-saya
npm run dev                             # http://localhost:3000, auto-reload
```

| Perintah | Fungsi |
|---|---|
| `zentara dev` | server pengembangan dari `src/app` (TypeScript, auto-reload) |
| `zentara build` | kompilasi ke `dist/` (memakai `tsconfig.build.json`) |
| `zentara start` | jalankan hasil build (`dist/app`), default `NODE_ENV=production` |
| `zentara routes` | daftar route |
| `zentara make:route <path>` · `make:middleware <nama>` | buat file baru |
| `zentara db:generate` · `db:migrate` · `db:seed` | database |
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
npx zentara "buatkan API produk dengan nama, harga, dan stok, lengkap dengan validasi"
npx zentara                       # mode obrolan: ketik permintaan satu per satu
npx zentara undo                  # batalkan perubahan AI terakhir
```

Cara kerja AI:
1. Membaca struktur proyek, route, schema database, dan kode yang ada.
2. Menyampaikan rencana singkat.
3. Membuat atau mengubah file, dengan persetujuan Anda.
4. **Selalu menjalankan typecheck dan test.** Bila gagal, AI memperbaikinya sendiri (maksimal 2 kali).
5. Melaporkan hasilnya: file yang berubah dan cara mencobanya.

### Persetujuan

| Mode | Perubahan file biasa | Aksi krusial |
|---|---|---|
| `ask` (default) | ditanyakan satu per satu (`s` = setujui semua sisanya) | selalu ditanyakan |
| `auto` (`--auto` atau `ai.mode: "auto"`) | langsung dikerjakan | selalu ditanyakan |

Yang termasuk **aksi krusial**:
- menghapus file, memasang paket npm, serta menerapkan migrasi atau seed ke database;
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

Cara termudah untuk memilih provider:

```bash
npx zentara ai:setup            # menu: pilih provider, ketik API key (tersembunyi), pilih model, tes koneksi
npx zentara ai:setup openai     # langsung ke provider tertentu
npx zentara ai:status           # lihat rantai provider yang aktif
```

Hasilnya disimpan ke `.env` (izin 0600, tidak ikut ter-commit), bukan ke file config.

Zentara mencoba provider **berurutan**. Kalau satu provider kehabisan kredit (402), kena batas kuota (429), mati, atau belum diatur, Zentara otomatis pindah ke provider berikutnya tanpa kehilangan percakapan. Provider cloud **otomatis ikut** begitu API key-nya ada di `.env`:

| Provider | API key | Model (default) | Keterangan |
|---|---|---|---|
| Claude | `ANTHROPIC_API_KEY` | `ZENTARA_CLAUDE_MODEL` (`claude-opus-5`) | selalu ada di rantai; dilewati bila key kosong |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` (`gpt-4.1`) | otomatis memakai `max_completion_tokens` |
| Google Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` (`gemini-2.5-flash`) | |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` (`llama-3.3-70b-versatile`) | |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL` (`deepseek-chat`) | |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` (`openai/gpt-4.1`) | banyak model dengan satu key |
| [OmniRoute](https://github.com/diegosouzapw/OmniRoute) | – | `OMNIROUTE_MODEL` | lokal di `localhost:20128`, dilewati bila tidak berjalan |
| Ollama | – | `OLLAMA_MODEL` | lokal & offline di `localhost:11434` |

Pengaturan lain:
- **Urutan:** `ZENTARA_AI_ORDER=openai,claude,ollama`. Provider lain yang aktif menyusul di belakang.
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

MIT
