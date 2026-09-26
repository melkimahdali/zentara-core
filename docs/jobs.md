---
title: Job & jadwal
order: 1
group: Back-End
description: Kerjakan tugas di latar belakang, coba ulang bila gagal, dan jalankan sesuai jadwal cron.
---

# Job & jadwal

Job adalah pekerjaan yang tidak perlu ditunggu pengguna: mengirim email, membuat laporan, memanggil API lain, membersihkan data lama. Route cukup memasukkan job ke antrean lalu langsung membalas, dan job dijalankan di latar belakang.

## Membuat job

Setiap file di `src/app/jobs/` adalah satu job. Nama job adalah path file tanpa ekstensi, jadi `src/app/jobs/laporan/harian.ts` bernama `laporan/harian`.

```bash
npx zusantara make:job kirim-laporan
npx zusantara make:job bersihkan-sesi --schedule "0 3 * * *"
```

```ts
// src/app/jobs/kirim-laporan.ts
import { sendMail, type JobContext } from "zusantara";

export const retries = 3; // opsional, default 3

export default async function (data: { email: string }, job: JobContext) {
  await sendMail({ to: data.email, subject: "Laporan mingguan", text: "..." });
  job.logger.info(`Laporan terkirim (percobaan ${job.attempt}/${job.maxAttempts})`);
}
```

`JobContext` berisi `id`, `name`, `attempt` (mulai 1), `maxAttempts`, dan `logger`.

## Memasukkan ke antrean

```ts
import { enqueue } from "zusantara";

export async function POST(ctx: ZenContext) {
  const user = await registerUser(input);
  await enqueue("kirim-laporan", { email: user.email });
  await enqueue("pengingat", { id: user.id }, { delay: "1h" });           // tunda satu jam
  await enqueue("pengingat", { id: user.id }, { runAt: new Date("2026-12-01T09:00:00") });
  return { ok: true };
}
```

Data job disimpan sebagai JSON, jadi kirim data sederhana (angka, teks, objek), bukan objek kelas atau koneksi database. Nama job yang tidak ada langsung menjadi error, sehingga salah ketik ketahuan saat pengembangan.

## Coba ulang

Job yang melempar error dicoba lagi dengan jeda yang makin panjang: 10 detik, 20 detik, 40 detik, dan seterusnya sampai maksimal 1 jam. Setelah `retries` percobaan ulang habis, job ditandai gagal dan errornya dicatat di log. Ganti jumlahnya per job dengan `export const retries = 5`, atau per pemanggilan dengan `enqueue(nama, data, { retries: 0 })`.

Karena job bisa berjalan lebih dari sekali, buat job aman untuk diulang: periksa dulu apakah pekerjaannya sudah dilakukan sebelum mengulanginya.

## Jadwal (cron)

Tambahkan `schedule` agar job berjalan otomatis:

```ts
// src/app/jobs/bersihkan-sesi.ts
export const schedule = "0 3 * * *"; // setiap hari jam 03:00

export default async function () {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
```

| Jadwal | Artinya |
|---|---|
| `*/15 * * * *` | setiap 15 menit |
| `0 7 * * *` | setiap hari jam 07:00 |
| `0 9 * * 1-5` | Senin sampai Jumat jam 09:00 |
| `0 0 1 * *` | tanggal 1 setiap bulan |
| `@hourly`, `@daily`, `@weekly`, `@monthly` | singkatan |

Kolomnya: menit, jam, tanggal, bulan, hari (0 atau 7 = Minggu; nama seperti `mon` dan `jan` juga bisa). Waktu mengikuti zona waktu server; atur dengan env `TZ`, mis. `TZ=Asia/Jakarta`. Bila beberapa server memakai file antrean yang sama, satu jadwal hanya dijalankan sekali per menit.

## Perintah CLI

```bash
npx zusantara jobs                                  # daftar job, jadwal, dan jalan berikutnya
npx zusantara jobs --json
npx zusantara jobs:run kirim-laporan --data '{"email":"sari@mail.id"}'   # jalankan sekarang, tanpa antrean
```

## Penyimpanan & pekerja

Antrean disimpan di SQLite (`data/jobs.db`), jadi job yang belum selesai tidak hilang saat server dimulai ulang. Pekerja berjalan di dalam proses server (`zusantara dev` dan `zusantara start`).

```js
// zusantara.config.mjs
export default {
  jobs: {
    store: "sqlite",       // atau "memory" (bawaan saat NODE_ENV=test)
    path: "data/jobs.db",
    worker: true,          // false atau env ZUSANTARA_JOBS=off: server hanya memasukkan job, tidak menjalankannya
    concurrency: 2,        // job yang berjalan bersamaan
    pollMs: 1000,
  },
};
```

## Menguji job

Saat `NODE_ENV=test` antrean disimpan di memori. Panggil `jobs.drain()` untuk menjalankan semua job yang sudah waktunya:

```ts
import { jobs, outbox } from "zusantara";

await post("/api/auth/register", { name: "Sari", email: "sari@mail.id", password: "rahasia123" });
await jobs.drain();
assert.match(outbox[0]!.subject, /Selamat datang/);
```
