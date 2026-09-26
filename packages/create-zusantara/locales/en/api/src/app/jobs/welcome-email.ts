import { eq } from "drizzle-orm";
import { sendMail, type JobContext } from "zusantara";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { APP_NAME } from "../lib/ui.js";

// Welcome email for new accounts. Queued at sign-up (see registerUser in lib/auth.ts).
// Retried up to 3 times when the email server has trouble.
export const retries = 3;

export default async function (data: { userId: number }, job: JobContext) {
  const user = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
  if (!user) return; // the account was deleted before the email was sent
  await sendMail({
    to: user.email,
    subject: `Welcome to ${APP_NAME}`,
    text: `Hi ${user.name},\n\nYour ${APP_NAME} account is active. Enjoy!`,
  });
  job.logger.info(`Welcome email sent to ${user.email}`);
}
