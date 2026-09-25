import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Setelah mengubah file ini jalankan: zentara db:generate lalu zentara db:migrate

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role", { enum: ["user", "admin"] })
    .notNull()
    .default("user"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

/**
 * Contoh data milik user: setiap catatan hanya bisa dilihat dan diubah pemiliknya.
 * Ganti atau hapus sesuai aplikasi Anda (lihat README bagian "Mulai dari kanvas kosong").
 */
export const notes = sqliteTable(
  "notes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull().default(""),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (t) => [index("notes_user_id_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type Note = typeof notes.$inferSelect;
