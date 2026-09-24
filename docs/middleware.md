---
title: Middleware
order: 3
group: Dasar
description: Rantai middleware global dan per route.
---

# Middleware

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
