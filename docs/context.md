---
title: Context (ctx)
order: 2
group: Dasar
description: Objek request & respons yang diterima setiap handler.
---

# Context (ctx)

Setiap handler route dan middleware menerima `ctx` bertipe `ZenContext`.

```ts
import type { ZenContext } from "zentara";

export async function GET(ctx: ZenContext) {
  return { path: ctx.path, id: ctx.params.id, q: ctx.query.q };
}
```

| Properti | Isi |
|---|---|
| `method` | method HTTP, mis. `"GET"` |
| `path` · `url` | pathname dan objek `URL` lengkap |
| `query` | query string (`?tag=a&tag=b` menjadi `{ tag: ["a", "b"] }`) |
| `params` | parameter route dinamis, mis. `{ id: "5" }` untuk `users/[id].ts` |
| `state` | tempat berbagi data antar-middleware selama satu request (mis. user yang login) |
| `cookies` | baca & tulis cookie |
| `session` | session terenkripsi (butuh middleware `session()`) |
| `logger` | logger aplikasi |
| `req` · `res` | objek `http` asli Node.js |
| `await ctx.json()` · `ctx.text()` · `ctx.body()` | body request sebagai JSON, teks, atau `Buffer` (formulir dan file: [`readForm`](upload.html)) |

## Mengembalikan respons

| Nilai yang di-return | Hasil |
|---|---|
| `string` | HTML (`text/html`) |
| object / array | JSON |
| `undefined` | `204 No Content` |
| `json(data, { status })` · `html(markup, { status })` · `text(...)` | status & header kustom |
| `redirect("/", 303)` | redirect |
| `throw new HttpError(404, "Data tidak ditemukan")` | respons error (JSON untuk API, halaman error untuk browser) |

```ts
import { html, HttpError, json, redirect, type ZenContext } from "zentara";

export async function POST(ctx: ZenContext) {
  const data = await ctx.json<{ nama?: string }>();
  if (!data?.nama) throw new HttpError(422, "Nama wajib diisi");
  return json({ ok: true, nama: data.nama }, { status: 201 });
}
```

Tidak ada `ctx.status`: atur status lewat `json()`, `html()`, `text()`, atau `redirect()`.
