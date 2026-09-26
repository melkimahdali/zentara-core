---
title: Context (ctx)
order: 2
group: Basics
description: The request & response object every handler receives.
---

# Context (ctx)

Every route handler and middleware receives a `ctx` of type `ZenContext`.

```ts
import type { ZenContext } from "zusantara";

export async function GET(ctx: ZenContext) {
  return { path: ctx.path, id: ctx.params.id, q: ctx.query.q };
}
```

| Property | Contents |
|---|---|
| `method` | HTTP method, e.g. `"GET"` |
| `path` · `url` | the pathname and the full `URL` object |
| `query` | the query string (`?tag=a&tag=b` becomes `{ tag: ["a", "b"] }`) |
| `params` | dynamic route parameters, e.g. `{ id: "5" }` for `users/[id].ts` |
| `state` | shared data between middleware for one request (e.g. the signed-in user) |
| `cookies` | read & write cookies |
| `session` | encrypted session (requires the `session()` middleware) |
| `logger` | the app logger |
| `req` · `res` | the raw Node.js `http` objects |
| `await ctx.json()` · `ctx.text()` · `ctx.body()` | the request body as JSON, text, or a `Buffer` (forms and files: [`readForm`](upload.html)) |

## Returning a response

| Returned value | Result |
|---|---|
| `string` | HTML (`text/html`) |
| object / array | JSON |
| `undefined` | `204 No Content` |
| `json(data, { status })` · `html(markup, { status })` · `text(...)` | custom status & headers |
| `redirect("/", 303)` | redirect |
| `throw new HttpError(404, "Not found")` | an error response (JSON for APIs, an error page for browsers) |

```ts
import { html, HttpError, json, redirect, type ZenContext } from "zusantara";

export async function POST(ctx: ZenContext) {
  const data = await ctx.json<{ name?: string }>();
  if (!data?.name) throw new HttpError(422, "Name is required");
  return json({ ok: true, name: data.name }, { status: 201 });
}
```

There is no `ctx.status`: set the status with `json()`, `html()`, `text()`, or `redirect()`.
