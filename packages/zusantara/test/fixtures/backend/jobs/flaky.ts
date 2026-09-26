import type { JobContext } from "../../../../src/core/index.js";

export const retries = 2;

export default function (_data: unknown, job: JobContext) {
  const log = ((globalThis as { __jobLog?: unknown[] }).__jobLog ??= []);
  log.push({ name: job.name, attempt: job.attempt });
  if (job.attempt < 2) throw new Error("gagal sementara");
}
