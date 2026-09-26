import { createSqlite } from "zusantara/db";
import * as schema from "./schema.js";

// SQLite in data/app.db by default. Change it with the DATABASE_URL env (e.g. file:./data/other.db).
export const db = createSqlite(process.env.DATABASE_URL ?? "file:./data/app.db", schema);
export { schema };
