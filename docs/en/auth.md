---
title: Auth
order: 2
group: Data & security
description: Sign-in, roles, and safe passwords.
---

# Auth

Auth is built into the core. Passwords are hashed with scrypt (OWASP parameters), and sign-ins use encrypted sessions.

```ts
import { hashPassword, verifyPassword, fakeVerify, login, logout, currentUser, requireAuth, rateLimit, withMiddleware } from "zentara";

login(ctx, { id: user.id, role: user.role });   // after the password matches
logout(ctx);

export const middleware = [requireAuth()];                      // the whole route file requires sign-in
export const POST = withMiddleware([requireAuth({ roles: ["admin"] })], handler);  // one method only
export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];         // brute-force protection
```

`requireAuth({ loadUser })` loads the latest user from the database on every request. As a result:
- deleted users are signed out automatically;
- role changes take effect immediately.

The example app already includes:

| Endpoint | Access |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` | public (rate limited to 10×/15 minutes) |
| `GET /api/auth/me` | signed in |
| `GET /api/notes?q=` · `POST /api/notes` | signed in; own notes only |
| `GET/PUT/DELETE /api/notes/:id` | signed in; other people's notes return 404 |

Built-in sign-in safeguards:
- the same message and response time for unknown emails and wrong passwords (`fakeVerify`);
- password hashes are never sent to the client;
- old hashes are upgraded automatically on sign-in (`needsRehash`).
