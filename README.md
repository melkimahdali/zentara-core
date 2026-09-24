# Zentara Core

Framework AI-driven fullstack asal Nusantara. Ditulis dalam TypeScript, tanpa dependency runtime.

> Status: **v0.4 – Tahap 3 (Zentara AI: bangun aplikasi dengan bahasa sehari-hari)**. API masih bisa berubah.

## Mulai cepat

Butuh Node.js 22 atau lebih baru.

```bash
npm install
npm run dev        # server dev dengan auto-reload di http://localhost:3000
npm test           # jalankan test
npm run build      # kompilasi ke dist/
npm start          # jalankan hasil build
npm run zen -- routes   # CLI Zentara (lihat bagian CLI)
```

Salin `.env.example` ke `.env` lalu isi `SESSION_SECRET`. Di production, secret ini **wajib** diisi.

## Zentara AI: cukup bicara

Tidak perlu hafal perintah. Tulis apa yang Anda mau dalam bahasa sehari-hari:

```bash
npm run zen -- "buatkan API produk dengan nama, harga, dan stok, lengkap dengan validasi"
npm run zen                       # mode obrolan: ketik permintaan satu per satu
npm run zen -- undo               # batalkan perubahan AI terakhir
```

Setelah build atau dipasang sebagai paket, perintahnya cukup `zentara "..."`.

Cara kerja AI:
1. Membaca struktur proyek, route, dan kode yang ada.
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
- menghapus file dan memasang paket npm;
- mengubah `package.json`, `zentara.config`, `tsconfig`, `.github/`, `.gitignore`, `.env*`, atau inti framework (`src/core/`).

Yang **tidak pernah** bisa dilakukan AI:
- membaca atau mengubah `.env` (rahasia tidak dikirim ke provider AI);
- menulis ke `.git/`, `node_modules/`, atau `dist/`;
- menyentuh file di luar folder proyek, termasuk lewat symlink.

Pilihan lain:
- `--dry-run`: melihat rencana tanpa mengubah apa pun.
- Setiap perubahan dicatat di `.zentara/history/`, jadi `zentara undo` bisa mengembalikannya.

### Provider AI & fallback

Zentara mencoba provider **berurutan**. Kalau satu provider kehabisan kredit (402), kena batas kuota (429), mati, atau belum diatur, Zentara otomatis pindah ke provider berikutnya tanpa kehilangan percakapan.

| Urutan default | Cara mengaktifkan |
|---|---|
| 1. **Claude** (`claude-opus-5`) | isi `ANTHROPIC_API_KEY` di `.env` |
| 2. **[OmniRoute](https://github.com/diegosouzapw/OmniRoute)** (opsional, gateway ke ratusan provider termasuk yang gratis) | pasang & jalankan; otomatis terdeteksi di `localhost:20128` |
| 3. **Ollama** (opsional, model lokal & offline) | pasang & jalankan; otomatis terdeteksi di `localhost:11434`, pilih model dengan `OLLAMA_MODEL` |

Provider yang tidak dipasang otomatis dilewati. Perintah terkait:
- `zentara ai:status` menampilkan provider yang siap.
- `zentara ai:setup` menampilkan panduan pemasangan.

Urutan kustom diatur di `zentara.config.mjs`:

```js
ai: {
  mode: "ask",
  providers: [
    { type: "anthropic", name: "claude", model: "claude-opus-5" },
    { type: "openai-compatible", name: "omniroute", baseUrl: "http://localhost:20128/v1" },
    { type: "openai-compatible", name: "ollama", baseUrl: "http://localhost:11434/v1", model: "qwen3-coder" },
  ],
},
```

Catatan:
- Claude dipanggil dengan *server-side fallback* (`fallbacks: "default"`). Kalau model utama menolak permintaan karena kebijakan keamanan, API otomatis mengulanginya di model cadangan.
- Lewat OmniRoute, kode proyek dikirim ke provider pihak ketiga yang Anda pilih. Output selalu menampilkan provider mana yang dipakai.

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
import { HttpError, json, type ZenContext } from "../../../../core/index.js";

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
import { defineMiddleware, HttpError } from "../core/index.js";

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
import { cors, csrf, requestLogger, session } from "../core/index.js";

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
import { validate } from "../../../core/index.js";

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
npm run zen -- routes                                   # daftar route (+ --json)
npm run zen -- make:route api/products/[id] --methods GET,PUT
npm run zen -- make:middleware auth-guard
```

Setelah build, CLI tersedia sebagai `zentara` (lihat `bin` di `package.json`). Contohnya `npx zentara routes`.

## View

```ts
import { h, raw, renderToString } from "../../core/index.js";

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
import { definePlugin } from "./src/core/index.js";

export default definePlugin({
  name: "hello",
  setup(runtime) {
    runtime.logger.info("plugin aktif");
  },
});
```

## Struktur

```
src/core/            inti framework (runtime, router, middleware, session, ...)
src/cli.ts           CLI zentara
src/ai/              Zentara AI (agen, provider, tool, persetujuan, undo)
src/app/routes/      route aplikasi
src/app/middleware.ts middleware global aplikasi
public/          file statis
zenstyles/       CSS aplikasi
test/            test (node:test)
```
