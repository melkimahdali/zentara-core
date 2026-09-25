---
title: Database
order: 1
group: Data & security
description: "Drizzle ORM: zero-install SQLite or PostgreSQL."
---

# Database

Zentara uses [Drizzle ORM](https://orm.drizzle.team). The default is SQLite through Node's built-in `node:sqlite` module, so **you don't need to install any driver or database server**.

```ts
// src/app/db/schema.ts
export const events = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  seats: integer("seats").notNull(),
});

// in a route
import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { events } from "../../db/schema.js";

export const GET = () => db.select().from(events);
const [created] = await db.insert(events).values({ title: "Zentara workshop", seats: 40 }).returning();
await db.update(events).set({ seats: 60 }).where(eq(events.id, 1));
await db.transaction(async (tx) => { /* ... */ });
```

Workflow after changing the schema:

| Command | What it does |
|---|---|
| `zentara db:generate [--name x]` | create a SQL migration in `drizzle/` from schema changes |
| `zentara db:migrate` | apply pending migrations |
| `zentara db:seed` | load initial data from `src/app/db/seed.ts` (safe to repeat) |

**PostgreSQL for production:**
1. Run `npm install postgres`.
2. Write the schema with `drizzle-orm/pg-core`, then set `dialect` in `drizzle.config.ts` to `"postgresql"`.
3. In `src/app/db/index.ts`, replace `createSqlite(...)` with `await createPostgres(process.env.DATABASE_URL, schema)`.

SQLite note: transactions run one at a time, so queries from other requests never end up inside a running transaction.
