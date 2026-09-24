# CORE_SPEC

Kontrak inti Zentara Core v0.4. Perubahan pada kontrak ini dianggap *breaking change*.

## 1. Siklus hidup runtime

1. `new ZenRuntime(userConfig)`: config digabung dengan env lalu divalidasi (`resolveConfig`). Config yang tidak valid langsung melempar error.
2. `init()`: plugin dijalankan berurutan (`setup(runtime)`, boleh memanggil `runtime.use()`), lalu file middleware aplikasi dimuat, lalu route dimuat dan divalidasi. Route yang bentrok, pola yang tidak valid, atau file tanpa handler menggagalkan boot.
3. `start()`: server HTTP mendengarkan `host:port` dan mengembalikan `AddressInfo`. `port: 0` berarti port acak.
4. `stop()`: server berhenti menerima koneksi, lalu menunggu request yang sedang berjalan. `SIGINT`/`SIGTERM` di `main.ts` memanggil `stop()`.

## 2. Resolusi route

- Sumber route: `config.routesDir`. Default-nya `app/routes` di samping folder `core`, yaitu `src/` saat dev dan `dist/` saat produksi.
- Ekstensi yang dikenali: `.ts .mts .js .mjs`. Diabaikan: nama berawalan `_` atau `.`, `*.d.ts`, `*.test.*`, `*.spec.*`.
- `index` memetakan ke folder induknya.
- Tiga jenis segmen:
  - statis
  - `[nama]`: satu segmen
  - `[...nama]`: satu atau lebih segmen, harus terakhir
- Nama parameter berupa identifier JS.
- Urutan pencocokan: statis > param > catch-all, dibandingkan per posisi segmen.
- Segmen URL di-decode sebelum dicocokkan. Encoding yang rusak dijawab `400`. Trailing slash dan slash ganda diabaikan.

## 3. Dispatch method

`resolveHandler(module, method)` memilih handler dengan urutan: export method → (`HEAD` → `GET`) → `default`.

Bila tidak ada handler:
- `OPTIONS` dijawab `204` + `Allow`.
- Method lain dijawab `405` + `Allow`.

## 4. Respons

| Return handler | Hasil |
|---|---|
| `ZenResponse` | status, header, dan body sesuai isinya |
| `string` | `200 text/html; charset=utf-8` |
| `Uint8Array` | `200 application/octet-stream` |
| `undefined`/`null` | `204` |
| nilai lain | `200 application/json` (`JSON.stringify`) |

Aturan tambahan:
- Bila handler sudah menulis `ctx.res` sendiri, runtime tidak menulis apa pun.
- Respons `HEAD` tidak pernah memiliki body.

## 5. Error

- `HttpError(status, message, { expose, headers })`: pesan dikirim ke klien bila `expose`, yang default-nya `true` untuk status < 500.
- Error lain menjadi `500 Internal Server Error` dan di-log lengkap di server. Detail error tidak pernah dikirim ke klien.
- Format body: JSON `{ "error": { status, message } }` bila `Accept` meminta JSON, selain itu teks biasa.
- Error setelah header terkirim akan memutus koneksi.

## 6. Body request

`ctx.body()` dibaca sekali lalu di-cache. Melebihi `bodyLimit` dijawab `413` dan koneksi ditutup. `ctx.json()` mengembalikan `undefined` untuk body kosong dan melempar `400` untuk JSON yang tidak valid.

## 7. View

`renderToString` meng-escape semua teks dan nilai atribut.
- `raw(html)` adalah satu-satunya jalan untuk menyisipkan HTML tanpa escape.
- Nama tag dan atribut divalidasi.
- Void element dirender tanpa tag penutup.
- Atribut dengan nilai `false`/`null`/`undefined` atau berupa function dilewati. `true` dirender sebagai atribut boolean.

## 8. File statis

Hanya untuk `GET`/`HEAD`, dan hanya bila tidak ada route yang cocok. Path di-decode dan dinormalisasi, lalu dipastikan tetap di dalam `publicDir`. Null byte dan dotfile ditolak (`404`).

## 9. Middleware

- Tipe: `(ctx, next) => unknown`. `next()` mengembalikan `Promise` berisi hasil middleware atau handler berikutnya. Memanggil `next()` dua kali adalah error.
- Rantai global, berurutan: `config.middleware` → `runtime.use()` (dari plugin) → `export default` di `config.middlewareFile`. Rantai global membungkus seluruh request, termasuk 404, file statis, 405, dan OPTIONS otomatis.
- Rantai per route (`export const middleware`) berjalan setelah route cocok dan handler ditemukan, dengan `ctx.params` sudah terisi.
- Respons ditulis **setelah** seluruh rantai selesai, jadi middleware masih bisa mengatur header sesudah `await next()`, kecuali bila handler atau file statis sudah menulis `ctx.res` sendiri.
- `runtime.use()` setelah `start()` akan melempar error.

## 10. Cookie & session

- `ctx.cookies.set()` default-nya `Path=/; HttpOnly; SameSite=Lax`. `SameSite=None` atau `Partitioned` otomatis menambahkan `Secure`. Nama dan atribut yang mengandung `;` atau karakter kontrol ditolak.
- Format cookie session: `v1.` + base64url(`iv[12] | tag[16] | AES-256-GCM(JSON {d: data, e: expiresAtMs})`).
  - Kunci diturunkan dengan HKDF-SHA256 dari secret.
  - AAD berisi nama cookie.
  - Cookie yang rusak, dipalsukan, atau kedaluwarsa diperlakukan sebagai session baru, lalu cookie-nya dihapus.
- Secret minimal 32 karakter dan wajib di `NODE_ENV=production`. Di luar production, bila secret kosong, dipakai secret acak dengan peringatan.
- Cookie hanya ditulis bila data berubah, atau di setiap request bila `rolling: true`. `destroy()` menghapus cookie. Session di atas ±4 KB menghasilkan error.
- Perubahan session tidak disimpan bila handler melempar error.

## 11. CSRF & CORS

- `csrf()` hanya memeriksa method selain `GET`/`HEAD`/`OPTIONS`, dengan urutan:
  1. `Origin` ada di `trustedOrigins` → izinkan.
  2. `Sec-Fetch-Site` ada: izinkan hanya `same-origin`/`none`, selain itu `403`.
  3. `Origin` ada: host-nya harus sama dengan header `Host`, selain itu `403`.
  4. Tidak ada kedua header (bukan browser) → izinkan.
- `cors()`:
  - Preflight (`OPTIONS` + `Access-Control-Request-Method`) dijawab `204` tanpa menjalankan handler.
  - Origin yang tidak diizinkan tidak mendapat header CORS.
  - `credentials: true` dengan origin `"*"` menghasilkan error konfigurasi.

## 12. Validasi

- Schema harus mengikuti Standard Schema v1 (`schema["~standard"].validate`).
- Kegagalan menghasilkan `HttpError(422, "Validasi gagal", { details: { source, issues: [{ path, message }] } })`. `path` berupa segmen yang digabung dengan `.`.
- Urutan validasi di `validate()`: `params` → `query` → `body`. Handler hanya dipanggil bila semuanya valid.
- Respons error berbentuk JSON bila `Accept` meminta JSON, atau bila error memiliki `details` dan `Accept` tidak meminta HTML.

## 13. Zentara AI

- **Masukan.** Perintah CLI yang tidak dikenal dan berisi spasi diteruskan ke AI, begitu juga `zentara ai "<teks>"`. Menjalankan `zentara` tanpa argumen di terminal interaktif membuka mode obrolan.
- **Loop agen.** Model dipanggil dan tool yang diminta dijalankan, berulang sampai model selesai atau batas `ai.maxSteps` (default 40) tercapai.
  - Setelah model selesai, bila ada perubahan file, runtime menjalankan `npm run typecheck` lalu `npm run test`.
  - Bila verifikasi gagal, output kegagalan dikirim kembali ke model, maksimal 2 kali.
- **Tool.** Tersedia `list_files`, `read_file`, `search`, `list_routes`, `write_file`, `edit_file`, `delete_file`, `run_check` (typecheck/test/build), dan `install_package`.
- **Risiko tool:**

  | Risiko | Yang termasuk | Perlakuan |
  |---|---|---|
  | read | tool yang hanya membaca | tidak pernah ditanyakan |
  | write | membuat/mengubah file biasa | ditanyakan di mode `ask`; otomatis di mode `auto` atau setelah jawaban "semua" |
  | critical | `delete_file`, `install_package`, dan penulisan ke `package*.json`, `zentara.config.*`, `tsconfig*.json`, `.github/`, `.gitignore`, `.env*`, `src/core/` | **selalu** ditanyakan |

  Di terminal non-interaktif, semua aksi yang butuh persetujuan ditolak.
- **Larangan mutlak:**
  - path di luar root proyek, dicek secara leksikal dan lewat `realpath` leluhur terdekat (mencegah lolos lewat symlink);
  - menulis ke `.git/`, `node_modules/`, `.zentara/`, `dist/`;
  - membaca atau mengubah `.env` dan `.env.*` (kecuali `.env.example`).
- **Undo.** Sebelum file pertama kali diubah dalam satu perintah, isinya dicatat di `.zentara/history/<waktu>.json` (`null` bila file baru). `zentara undo` memulihkan file dalam urutan terbalik lalu menghapus jurnalnya.
- **Rantai provider.** Provider dicoba berurutan.
  - `ProviderUnavailableError` membuat rantai pindah ke provider berikutnya dan menetap di sana selama sesi. Pemicunya: kredensial tidak ada, 401/402/403/404/408/429, 5xx, koneksi gagal, timeout, atau respons rusak.
  - Error lain (mis. 400) diteruskan tanpa fallback.
  - Percakapan disimpan dalam format netral. Konten asli Claude (termasuk blok thinking) hanya dikirim ulang ke provider yang sama.
- **Provider:**
  - `anthropic`: memakai `@anthropic-ai/sdk`, `client.beta.messages.create`, default `claude-opus-5`, effort `high`, beta `server-side-fallback-2026-07-01` dengan `fallbacks: "default"`.
  - `openai-compatible`: memakai `POST {baseUrl}/chat/completions` dengan function calling. Bila model tidak diatur, dipakai model pertama dari `GET {baseUrl}/models`.
