---
title: Sessions & cookies
order: 3
group: Data & security
description: Encrypted cookie-based sessions.
---

# Sessions & cookies

`session()` stores data **encrypted (AES-256-GCM)** inside a cookie, so it needs no database or Redis. The size limit is about 4 KB, so store IDs, not large data.

```ts
ctx.session.set("userId", 42);
ctx.session.get<number>("userId");
ctx.session.destroy();               // sign out

ctx.cookies.get("theme");
ctx.cookies.set("theme", "dark", { maxAge: 60 * 60 * 24 * 365 });  // default: HttpOnly, SameSite=Lax
ctx.cookies.delete("theme");
```

Key rotation: `session({ secret: [newSecret, oldSecret] })`. The new secret encrypts, and both can still read existing sessions.
