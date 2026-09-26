---
title: Database
order: 1
group: Data & Keamanan
description: Drizzle ORM: SQLite tanpa instalasi atau PostgreSQL.
---

# Database

Zusantara memakai [Drizzle ORM](https://orm.drizzle.team). Defaultnya SQLite lewat modul `node:sqlite` bawaan Node, jadi **tidak perlu memasang driver atau server database** apa pun.

```ts
// src/app/db/schema.ts
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  seats: integer("seats").notNull(),
});

// di route
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { events } from "../../db/schema.js";

export const GET = () => db.select().from(events);
const [baru] = await db.insert(events).values({ title: "Workshop Zusantara", seats: 40 }).returning();
await db.update(events).set({ seats: 60 }).where(eq(events.id, 1));
await db.transaction(async (tx) => { /* ... */ });
```

Alur kerja setelah mengubah schema:

| Perintah | Fungsi |
|---|---|
| `zusantara db:generate [--name x]` | buat file migrasi SQL di `drizzle/` dari perubahan schema |
| `zusantara db:migrate` | terapkan migrasi yang belum jalan |
| `zusantara db:seed` | isi data awal dari `src/app/db/seed.ts` (aman diulang) |

**PostgreSQL untuk produksi:**
1. Jalankan `npm install postgres`.
2. Tulis schema dengan `drizzle-orm/pg-core`, lalu ubah `dialect` di `drizzle.config.ts` menjadi `"postgresql"`.
3. Di `src/app/db/index.ts`, ganti `createSqlite(...)` dengan `await createPostgres(process.env.DATABASE_URL, schema)`.

Catatan SQLite: transaksi dijalankan bergantian (satu per satu) supaya query dari request lain tidak ikut masuk ke transaksi yang sedang berjalan.
