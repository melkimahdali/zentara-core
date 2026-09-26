import type { Middleware } from "../../src/core/index.js";

// Middleware aplikasi untuk fixture: menandai setiap respons.
export default [
  (ctx, next) => {
    ctx.res.setHeader("X-App-Middleware", "1");
    return next();
  },
] satisfies Middleware[];
