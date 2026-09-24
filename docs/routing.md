---
title: Routing berbasis file
order: 1
group: Dasar
description: File di src/app/routes menjadi URL.
---

# Routing berbasis file

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
