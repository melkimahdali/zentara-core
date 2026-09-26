import { h, renderToString, type ZenContext } from "../../../src/core/index.js";
export const GET = (ctx: ZenContext) => {
  const q = String(ctx.query.q ?? "");
  return renderToString(h("p", { title: q }, q));
};
