import type { ZenContext } from "../../../../src/core/index.js";
export function GET(ctx: ZenContext) {
  ctx.res.writeHead(202, { "Content-Type": "text/plain" });
  ctx.res.end("manual");
}
