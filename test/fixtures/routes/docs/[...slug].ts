import type { ZenContext } from "../../../../src/core/index.js";
export const GET = (ctx: ZenContext) => ({ slug: ctx.params.slug });
