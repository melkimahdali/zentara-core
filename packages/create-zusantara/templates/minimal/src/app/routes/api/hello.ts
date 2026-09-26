import type { ZenContext } from "zusantara";

export function GET(ctx: ZenContext) {
  const name = typeof ctx.query.name === "string" ? ctx.query.name : "Zusantara";
  return { message: `Hello from ${name} API`, time: new Date().toISOString() };
}
