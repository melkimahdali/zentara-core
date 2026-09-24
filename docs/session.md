---
title: Session & cookie
order: 3
group: Data & Keamanan
description: Session terenkripsi berbasis cookie.
---

# Session & cookie

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
