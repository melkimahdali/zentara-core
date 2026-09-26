import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import {
  closeDatabase,
  createPostgres,
  createSqlite,
  databaseDialect,
  dialectFromUrl,
  migrateDatabase,
  sqlitePathFromUrl,
} from "../src/db/index.js";
import * as pgSchema from "./fixtures/pg/schema.js";
import { FIXTURES } from "./helpers.js";

const notes = sqliteTable("notes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  body: text("body").notNull(),
});

function sqliteMigrations(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-mig-"));
  fs.mkdirSync(path.join(dir, "meta"));
  fs.writeFileSync(path.join(dir, "0000_init.sql"), "CREATE TABLE `notes` (`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL, `body` text NOT NULL);");
  fs.writeFileSync(
    path.join(dir, "meta", "_journal.json"),
    JSON.stringify({ version: "7", dialect: "sqlite", entries: [{ idx: 0, version: "6", when: 1, tag: "0000_init", breakpoints: true }] }),
  );
  return dir;
}

describe("URL database", () => {
  it("mendeteksi dialect dan path", () => {
    assert.equal(dialectFromUrl("postgres://u@h/db"), "postgres");
    assert.equal(dialectFromUrl("postgresql://u@h/db"), "postgres");
    assert.equal(dialectFromUrl("file:./data/app.db"), "sqlite");
    assert.equal(sqlitePathFromUrl("file:./data/app.db", "/proj"), path.resolve("/proj/data/app.db"));
    assert.equal(sqlitePathFromUrl(":memory:"), ":memory:");
  });
});

describe("SQLite (node:sqlite)", () => {
  it("migrasi, CRUD, relational query, dan file dibuat otomatis", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-db-"));
    const db = createSqlite(`file:${path.join(dir, "nested", "app.db")}`, { notes });
    assert.equal(databaseDialect(db), "sqlite");
    await migrateDatabase(db, sqliteMigrations());
    const [created] = await db.insert(notes).values({ body: "halo" }).returning();
    assert.deepEqual(created, { id: 1, body: "halo" });
    await db.update(notes).set({ body: "halo dunia" }).where(eq(notes.id, 1));
    assert.deepEqual(await db.query.notes.findFirst(), { id: 1, body: "halo dunia" });
    assert.deepEqual(await db.select().from(notes).where(eq(notes.id, 99)), []);
    await closeDatabase(db);
    assert.ok(fs.existsSync(path.join(dir, "nested", "app.db")));
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("migrasi hanya dijalankan sekali", async () => {
    const db = createSqlite(":memory:", { notes });
    const mig = sqliteMigrations();
    await migrateDatabase(db, mig);
    await migrateDatabase(db, mig);
    await db.insert(notes).values({ body: "x" });
    assert.equal((await db.select().from(notes)).length, 1);
    await closeDatabase(db);
  });

  it("transaksi di-rollback saat error", async () => {
    const db = createSqlite(":memory:", { notes });
    await migrateDatabase(db, sqliteMigrations());
    await assert.rejects(
      db.transaction(async (tx) => {
        await tx.insert(notes).values({ body: "batal" });
        throw new Error("gagal");
      }),
      /gagal/,
    );
    assert.equal((await db.select().from(notes)).length, 0);
    await closeDatabase(db);
  });

  it("query dari request lain tidak masuk ke transaksi yang sedang berjalan", async () => {
    const db = createSqlite(":memory:", { notes });
    await migrateDatabase(db, sqliteMigrations());
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const tx = db
      .transaction(async (t) => {
        await t.insert(notes).values({ body: "dalam-transaksi" });
        await gate; // transaksi "menggantung" sementara request lain datang
        throw new Error("rollback");
      })
      .catch(() => "rolled back");
    // Request lain menulis saat transaksi terbuka: harus menunggu, bukan ikut ter-rollback.
    const outside = db.insert(notes).values({ body: "di-luar" });
    await new Promise((r) => setTimeout(r, 20));
    release();
    assert.equal(await tx, "rolled back");
    await outside;
    assert.deepEqual((await db.select().from(notes)).map((n) => n.body), ["di-luar"]);
    await closeDatabase(db);
  });

  it("dua transaksi bersamaan dijalankan bergantian", async () => {
    const db = createSqlite(":memory:", { notes });
    await migrateDatabase(db, sqliteMigrations());
    await Promise.all(
      [1, 2, 3].map((i) =>
        db.transaction(async (t) => {
          await t.insert(notes).values({ body: `a${i}` });
          await new Promise((r) => setTimeout(r, 5));
          await t.insert(notes).values({ body: `b${i}` });
        }),
      ),
    );
    // Tiap transaksi utuh berurutan: a_i selalu langsung diikuti b_i.
    const bodies = (await db.select().from(notes)).map((n) => n.body);
    assert.equal(bodies.length, 6);
    for (let i = 0; i < 6; i += 2) assert.equal(bodies[i + 1], bodies[i]!.replace("a", "b"));
    await closeDatabase(db);
  });
});

// Butuh server PostgreSQL sungguhan: di CI disediakan lewat service container.
const PG_URL = process.env.ZUSANTARA_TEST_POSTGRES_URL;
describe("PostgreSQL", { skip: PG_URL ? false : "set ZUSANTARA_TEST_POSTGRES_URL untuk menjalankan" }, () => {
  it("migrasi, CRUD, dan transaksi", async () => {
    const db = await createPostgres(PG_URL!, pgSchema);
    try {
      assert.equal(databaseDialect(db), "postgres");
      await db.execute(sql`drop table if exists zusantara_test_items; drop schema if exists drizzle cascade`);
      await migrateDatabase(db, path.join(FIXTURES, "pg", "migrations"));
      const [row] = await db.insert(pgSchema.items).values({ name: "kopi", qty: 2 }).returning();
      assert.equal(row!.name, "kopi");
      await assert.rejects(
        db.transaction(async (tx) => {
          await tx.insert(pgSchema.items).values({ name: "batal" });
          throw new Error("rollback");
        }),
      );
      assert.deepEqual((await db.select().from(pgSchema.items)).map((r) => r.name), ["kopi"]);
      assert.equal((await db.query.items.findFirst({ where: eq(pgSchema.items.name, "kopi") }))?.qty, 2);
    } finally {
      await closeDatabase(db);
    }
  });
});
