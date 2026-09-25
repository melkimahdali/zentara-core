import { enqueue, type ZenContext } from "../../../../src/core/index.js";

export async function POST(ctx: ZenContext) {
  const id = await enqueue("record", { value: String(ctx.query.value ?? "") });
  return { id };
}
