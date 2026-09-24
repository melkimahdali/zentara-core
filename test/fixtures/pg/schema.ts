import { integer, pgTable, serial, text } from "drizzle-orm/pg-core";

export const items = pgTable("zentara_test_items", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  qty: integer("qty").notNull().default(0),
});
