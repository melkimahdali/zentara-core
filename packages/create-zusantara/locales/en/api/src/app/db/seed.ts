import { hashPassword } from "zusantara";
import type { db as Database } from "./index.js";
import { notes, users } from "./schema.js";

// Initial data: `zusantara db:seed`. Safe to run repeatedly (existing data is not duplicated).
export default async function seed(db: typeof Database): Promise<string> {
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@zusantara.test";
  let password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    if (process.env.NODE_ENV === "production") throw new Error("Set SEED_ADMIN_PASSWORD to seed in production");
    password = "admin12345";
  }

  const existing = await db.query.users.findFirst({ where: (u, { eq }) => eq(u.email, email) });
  if (existing) return "Initial data already exists.";

  const [admin] = await db.insert(users).values({ email, name: "Admin", role: "admin", passwordHash: await hashPassword(password) }).returning();
  await db.insert(notes).values([
    {
      userId: admin!.id,
      title: "Welcome to your app",
      body: "This note is example data owned by a user. Edit it, delete it, or replace the whole Notes feature with anything you want to build.",
    },
    {
      userId: admin!.id,
      title: "Next idea",
      body: 'Try asking Zusantara AI: npx zusantara "build a booking schedule page for signed-in users".',
    },
  ]);
  return `Admin created: ${email}${process.env.SEED_ADMIN_PASSWORD ? "" : " (password dev: admin12345)"}`;
}
