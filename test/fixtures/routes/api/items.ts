import { json, type ZenContext } from "../../../../src/core/index.js";
export const GET = (ctx: ZenContext) => ({ q: ctx.query.q ?? null, tags: ctx.query.tag ?? [] });
export async function POST(ctx: ZenContext) {
  const body = await ctx.json();
  return json({ received: body }, { status: 201, headers: { "X-Created": "yes" } });
}
