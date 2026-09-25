---
title: Jobs & schedules
order: 1
group: Back-End
description: Run work in the background, retry on failure, and run on cron schedules.
---

# Jobs & schedules

A job is work the user shouldn't have to wait for: sending email, building a report, calling another API, cleaning up old data. A route just adds the job to the queue and responds right away, and the job runs in the background.

## Creating a job

Every file in `src/app/jobs/` is one job. The job name is the file path without the extension, so `src/app/jobs/reports/daily.ts` is called `reports/daily`.

```bash
npx zentara make:job send-report
npx zentara make:job clean-sessions --schedule "0 3 * * *"
```

```ts
// src/app/jobs/send-report.ts
import { sendMail, type JobContext } from "zentara";

export const retries = 3; // optional, 3 by default

export default async function (data: { email: string }, job: JobContext) {
  await sendMail({ to: data.email, subject: "Weekly report", text: "..." });
  job.logger.info(`Report sent (attempt ${job.attempt}/${job.maxAttempts})`);
}
```

`JobContext` has `id`, `name`, `attempt` (starting at 1), `maxAttempts`, and `logger`.

## Adding to the queue

```ts
import { enqueue } from "zentara";

export async function POST(ctx: ZenContext) {
  const user = await registerUser(input);
  await enqueue("send-report", { email: user.email });
  await enqueue("reminder", { id: user.id }, { delay: "1h" });           // wait an hour
  await enqueue("reminder", { id: user.id }, { runAt: new Date("2026-12-01T09:00:00") });
  return { ok: true };
}
```

Job data is stored as JSON, so pass plain data (numbers, strings, objects), not class instances or database connections. An unknown job name is an error right away, so typos show up during development.

## Retries

A job that throws is retried with growing delays: 10 seconds, 20 seconds, 40 seconds, and so on up to 1 hour. Once its `retries` are used up, the job is marked as failed and the error is logged. Change the number per job with `export const retries = 5`, or per call with `enqueue(name, data, { retries: 0 })`.

Because a job can run more than once, make it safe to repeat: check whether the work was already done before doing it again.

## Schedules (cron)

Add `schedule` to run a job automatically:

```ts
// src/app/jobs/clean-sessions.ts
export const schedule = "0 3 * * *"; // every day at 03:00

export default async function () {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
```

| Schedule | Meaning |
|---|---|
| `*/15 * * * *` | every 15 minutes |
| `0 7 * * *` | every day at 07:00 |
| `0 9 * * 1-5` | Monday to Friday at 09:00 |
| `0 0 1 * *` | on the 1st of every month |
| `@hourly`, `@daily`, `@weekly`, `@monthly` | shorthands |

The fields are: minute, hour, day of month, month, day of week (0 or 7 = Sunday; names such as `mon` and `jan` work too). Times follow the server's time zone; set it with the `TZ` env, e.g. `TZ=America/New_York`. When several servers share the same queue file, each schedule runs only once per minute.

## CLI commands

```bash
npx zentara jobs                                  # list jobs, schedules, and next runs
npx zentara jobs --json
npx zentara jobs:run send-report --data '{"email":"sarah@mail.test"}'   # run now, without the queue
```

## Storage & worker

The queue is stored in SQLite (`data/jobs.db`), so unfinished jobs survive server restarts. The worker runs inside the server process (`zentara dev` and `zentara start`).

```js
// zentara.config.mjs
export default {
  jobs: {
    store: "sqlite",       // or "memory" (the default when NODE_ENV=test)
    path: "data/jobs.db",
    worker: true,          // false or env ZENTARA_JOBS=off: this server only enqueues jobs, it doesn't run them
    concurrency: 2,        // jobs running at the same time
    pollMs: 1000,
  },
};
```

## Testing jobs

With `NODE_ENV=test` the queue lives in memory. Call `jobs.drain()` to run every job that is due:

```ts
import { jobs, outbox } from "zentara";

await post("/api/auth/register", { name: "Sarah", email: "sarah@mail.test", password: "secret123" });
await jobs.drain();
assert.match(outbox[0]!.subject, /Welcome/);
```
