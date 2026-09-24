import type { ZenContext } from "zentara";

export function GET(ctx: ZenContext) {
  const name = typeof ctx.query.name === "string" ? ctx.query.name : "Zentara";
  return { message: `Hello from ${name} API`, time: new Date().toISOString() };
}
