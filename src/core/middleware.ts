import type { ZenContext } from "./context.js";

export type Next = () => Promise<unknown>;

/**
 * Middleware bergaya "onion": kerjakan sesuatu, panggil `await next()` untuk meneruskan
 * ke middleware/handler berikutnya, lalu kerjakan sesuatu lagi setelahnya.
 * Nilai yang dikembalikan menjadi respons; kembalikan nilai tanpa memanggil `next()`
 * untuk menghentikan rantai (mis. menolak request).
 */
export type Middleware = (ctx: ZenContext, next: Next) => unknown;

export function defineMiddleware(middleware: Middleware): Middleware {
  return middleware;
}

/** Gabungkan middleware menjadi satu function yang diakhiri `final`. */
export function compose(middleware: readonly Middleware[], final: (ctx: ZenContext) => unknown) {
  return (ctx: ZenContext): Promise<unknown> => {
    let last = -1;
    const dispatch = async (i: number): Promise<unknown> => {
      if (i <= last) throw new Error("next() dipanggil lebih dari sekali dalam satu middleware");
      last = i;
      const fn = middleware[i];
      return fn ? fn(ctx, () => dispatch(i + 1)) : final(ctx);
    };
    return dispatch(0);
  };
}

/** Log satu baris per request: method, path, status, dan durasi. */
export function requestLogger(): Middleware {
  return (ctx, next) => {
    const start = performance.now();
    ctx.res.once("finish", () => {
      const ms = (performance.now() - start).toFixed(1);
      ctx.logger.info(`${ctx.method} ${ctx.path} ${ctx.res.statusCode} ${ms}ms`);
    });
    return next();
  };
}
