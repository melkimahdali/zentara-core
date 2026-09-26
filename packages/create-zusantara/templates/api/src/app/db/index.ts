import { createSqlite } from "zusantara/db";
import * as schema from "./schema.js";

// Default SQLite di data/app.db. Ubah lewat env DATABASE_URL (mis. file:./data/lain.db).
export const db = createSqlite(process.env.DATABASE_URL ?? "file:./data/app.db", schema);
export { schema };
