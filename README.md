# Zentara Core

Framework AI-driven fullstack asal Nusantara. Ditulis dalam TypeScript, tanpa dependency runtime.

> Status: **v0.2 – fondasi (Tahap 1)**. API masih bisa berubah.

## Mulai cepat

Butuh Node.js 22 atau lebih baru.

```bash
npm install
npm run dev        # server dev dengan auto-reload di http://localhost:3000
npm test           # jalankan test
npm run build      # kompilasi ke dist/
npm start          # jalankan hasil build
```

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

`method`, `path`, `url`, `query`, `params`, `state`, `req`, `res`, serta `await ctx.body()`, `ctx.text()`, `ctx.json()`.

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
src/core/        inti framework (runtime, router, context, view, ...)
src/app/routes/  route aplikasi
public/          file statis
zenstyles/       CSS aplikasi
test/            test (node:test)
```
