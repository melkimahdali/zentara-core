---
title: Middleware
order: 3
group: Basics
description: Global and per-route middleware chains.
---

# Middleware

Middleware follows the "onion" model: do something before `await next()`, then something else after it. If a middleware returns a value without calling `next()`, the chain stops there.

```ts
import { defineMiddleware, HttpError } from "zusantara";

export const requireLogin = defineMiddleware(async (ctx, next) => {
  if (!ctx.session.get("userId")) throw new HttpError(401, "Please sign in");
  return next();
});
```

There are four places to register middleware. They run in this order, top to bottom:

| Where | Scope |
|---|---|
| `middleware: [...]` in `zusantara.config.mjs` | every request |
| `runtime.use(...)` in a plugin's `setup()` | every request |
| `src/app/middleware.ts` (`export default [...]`) | every request |
| `export const middleware = [...]` in a route file | that route only |

Built-in middleware:

```ts
// src/app/middleware.ts
import { cors, csrf, requestLogger, session } from "zusantara";

export default [
  requestLogger(),                                        // GET /api/hello 200 1.2ms
  cors({ origin: ["https://app.example.com"], credentials: true }),
  csrf(),                                                 // reject cross-origin POST/PUT/PATCH/DELETE
  session(),                                              // ctx.session, secret from SESSION_SECRET
];
```
