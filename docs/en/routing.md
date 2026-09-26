---
title: File-based routing
order: 1
group: Basics
description: Files in src/app/routes become URLs.
---

# File-based routing

Every file in `src/app/routes/` becomes a URL:

| File | URL |
|---|---|
| `index.ts` | `/` |
| `about.ts` | `/about` |
| `api/hello.ts` | `/api/hello` |
| `users/index.ts` | `/users` |
| `users/[id].ts` | `/users/42` → `ctx.params.id === "42"` |
| `docs/[...slug].ts` | `/docs/a/b` → `ctx.params.slug === "a/b"` |
| `_utils.ts` | (ignored, not a route) |

Static routes always win over `[param]`, and `[param]` wins over `[...catchAll]`.

Export one function per HTTP method. `default` handles every method:

```ts
// src/app/routes/api/users/[id].ts
import { HttpError, json, type ZenContext } from "zusantara";

export function GET(ctx: ZenContext) {
  return { id: ctx.params.id };                 // object -> JSON
}

export async function PUT(ctx: ZenContext) {
  const body = await ctx.json<{ name: string }>();
  if (!body?.name) throw new HttpError(400, "name is required");
  return json({ ok: true }, { status: 200 });    // custom status/headers
}
```

What a handler returns:

| Return | Response |
|---|---|
| `string` | `200 text/html` |
| object / array | `200 application/json` |
| `undefined` / `null` | `204 No Content` |
| `json()`, `html()`, `text()`, `redirect()` | the status and headers you choose |

Other built-in behavior:
- `HEAD` uses `GET` automatically.
- `OPTIONS` answers automatically with an `Allow` header.
- Methods that are not exported get `405`.
- Plain errors become `500` without leaking details and without crashing the server. `HttpError` uses its own status and message.
- Request bodies are limited by `bodyLimit` (1 MB by default; larger bodies get `413`). Invalid JSON gets `400`.
