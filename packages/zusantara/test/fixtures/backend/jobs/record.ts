import type { JobContext } from "../../../../src/core/index.js";

// Mencatat setiap job yang berjalan ke array global agar test bisa memeriksanya.
export const retries = 0;

export default function (data: { value: string }, job: JobContext) {
  const log = ((globalThis as { __jobLog?: unknown[] }).__jobLog ??= []);
  log.push({ name: job.name, value: data?.value, attempt: job.attempt });
}
