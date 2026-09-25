---
title: Cache
order: 4
group: Back-End
description: Simpan hasil perhitungan yang mahal di memori dengan masa berlaku.
---

# Cache

```ts
import { cache } from "zentara";

export async function GET() {
  // Dihitung paling banyak sekali per menit; permintaan lain memakai hasil yang tersimpan.
  const stats = await cache.remember("dashboard:stats", "1m", () => hitungStatistik());
  return stats;
}
```

Bila beberapa permintaan datang bersamaan saat cache kosong, `remember()` hanya menjalankan fungsinya sekali dan semuanya menunggu hasil yang sama.

## API

| Metode | Keterangan |
|---|---|
| `cache.get(key)` | nilai, atau `undefined` bila tidak ada atau kedaluwarsa |
| `cache.set(key, value, ttl?)` | simpan; `ttl` seperti `"30s"`, `"5m"`, `"1h"` |
| `cache.has(key)` | ada dan belum kedaluwarsa |
| `cache.delete(key)` | hapus satu kunci |
| `cache.clear(prefix?)` | hapus semua, atau hanya kunci yang diawali `prefix` |
| `cache.remember(key, ttl, fn)` | ambil dari cache, atau jalankan `fn` lalu simpan hasilnya |

Setelah data berubah, hapus cache yang terkait agar halaman tidak menampilkan data lama:

```ts
await db.update(notes).set(input).where(eq(notes.id, id));
cache.clear(`notes:${userId}:`);
```

## Cache sendiri

`cache` bawaan menyimpan sampai 1000 entri. Buat cache terpisah dengan batas sendiri:

```ts
import { MemoryCache } from "zentara";

const kurs = new MemoryCache({ max: 100, ttl: "10m" });
```

Entri yang paling lama tidak dipakai dibuang lebih dulu saat batas tercapai.

## Batasan

Cache disimpan di memori proses. Isinya hilang saat server dimulai ulang dan tidak dibagi antarserver. Jangan simpan data yang tidak boleh hilang di cache; simpan di [database](database.html).
