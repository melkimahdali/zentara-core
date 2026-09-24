import type { ZenContext } from "../../../../src/core/index.js";
export const GET = (ctx: ZenContext) => ({ id: ctx.params.id });
export const DELETE = () => undefined;
