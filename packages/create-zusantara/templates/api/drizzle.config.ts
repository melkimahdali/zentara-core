import { defineConfig } from "drizzle-kit";

// Dipakai `zusantara db:generate` untuk membuat file migrasi SQL dari src/app/db/schema.ts.
// Untuk PostgreSQL: ganti dialect menjadi "postgresql" dan tulis schema dengan drizzle-orm/pg-core.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/app/db/schema.ts",
  out: "./drizzle",
});
