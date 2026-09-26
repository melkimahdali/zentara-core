import { defineConfig } from "drizzle-kit";

// Used by `zusantara db:generate` to create SQL migrations from src/app/db/schema.ts.
// For PostgreSQL: change the dialect to "postgresql" and write the schema with drizzle-orm/pg-core.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/app/db/schema.ts",
  out: "./drizzle",
});
