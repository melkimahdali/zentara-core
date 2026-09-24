# CORE_SPEC

Kontrak inti Zentara Core v0.2. Perubahan pada kontrak ini dianggap *breaking change*.

## 1. Siklus hidup runtime

1. `new ZenRuntime(userConfig)`: config digabung dengan env lalu divalidasi (`resolveConfig`). Config yang tidak valid langsung melempar error.
2. `init()`: plugin dijalankan berurutan (`setup(runtime)`), lalu route dimuat dan divalidasi. Route yang bentrok, pola yang tidak valid, atau file tanpa handler menggagalkan boot.
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
