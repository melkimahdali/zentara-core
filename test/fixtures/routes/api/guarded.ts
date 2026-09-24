import { HttpError, type Middleware, type ZenContext } from "../../../../src/core/index.js";

const requireToken: Middleware = (ctx, next) => {
  if (ctx.req.headers.authorization !== "Bearer rahasia") throw new HttpError(401, "Token tidak valid");
  ctx.state.user = "budi";
  return next();
};

const wrap: Middleware = async (_ctx, next) => {
  const result = (await next()) as Record<string, unknown>;
  return { ...result, wrapped: true };
};

export const middleware = [requireToken, wrap];

export const GET = (ctx: ZenContext) => ({ user: ctx.state.user });
