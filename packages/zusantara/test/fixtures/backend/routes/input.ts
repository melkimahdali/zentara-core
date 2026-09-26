import { readInput, type ZenContext } from "../../../../src/core/index.js";

export async function POST(ctx: ZenContext) {
  const input = (await readInput(ctx)) as Record<string, unknown>;
  return Object.fromEntries(Object.entries(input).map(([k, v]) => [k, v instanceof File ? `file:${v.name}:${v.size}` : v]));
}
