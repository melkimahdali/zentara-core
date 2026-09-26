---
title: Auth
order: 2
group: Data & Keamanan
description: Login, role, dan password yang aman.
---

# Auth

Auth sudah tersedia di core. Password di-hash dengan scrypt (parameter OWASP), dan sesi memakai session terenkripsi.

```ts
import { hashPassword, verifyPassword, fakeVerify, login, logout, currentUser, requireAuth, rateLimit, withMiddleware } from "zusantara";

login(ctx, { id: user.id, role: user.role });   // setelah password cocok
logout(ctx);

export const middleware = [requireAuth()];                      // seluruh file route wajib login
export const POST = withMiddleware([requireAuth({ roles: ["admin"] })], handler);  // satu method saja
export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];         // anti brute-force
```

`requireAuth({ loadUser })` memuat user terbaru dari database di setiap request. Akibatnya:
- user yang dihapus otomatis ter-logout;
- perubahan role langsung berlaku.

Aplikasi contoh sudah menyediakan fitur-fitur berikut:

| Endpoint | Akses |
|---|---|
| `POST /api/auth/register` · `POST /api/auth/login` · `POST /api/auth/logout` | publik (rate limit 10×/15 menit) |
| `GET /api/auth/me` | wajib login |
| `GET /api/notes?q=` · `POST /api/notes` | wajib login; hanya catatan milik sendiri |
| `GET/PUT/DELETE /api/notes/:id` | wajib login; catatan orang lain dijawab 404 |

Pengaman bawaan pada login:
- pesan dan waktu respons sama untuk email yang tidak terdaftar maupun password salah (`fakeVerify`);
- hash password tidak pernah dikirim ke klien;
- hash lama otomatis diperbarui saat login (`needsRehash`).
