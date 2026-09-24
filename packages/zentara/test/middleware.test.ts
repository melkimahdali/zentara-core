import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { compose, definePlugin, type Middleware, type ZenContext } from "../src/core/index.js";
import { startServer } from "./helpers.js";

const fakeCtx = () => ({ state: {} }) as unknown as ZenContext;

describe("compose", () => {
  it("menjalankan middleware berurutan seperti bawang", async () => {
    const log: string[] = [];
    const mw = (name: string): Middleware => async (_ctx, next) => {
      log.push(`${name}:in`);
      const r = await next();
      log.push(`${name}:out`);
      return r;
    };
    const result = await compose([mw("a"), mw("b")], () => {
      log.push("handler");
      return 42;
    })(fakeCtx());
    assert.equal(result, 42);
    assert.deepEqual(log, ["a:in", "b:in", "handler", "b:out", "a:out"]);
  });

  it("bisa menghentikan rantai dan mengubah hasil", async () => {
    let called = false;
    const stop: Middleware = () => "stop";
    assert.equal(await compose([stop], () => (called = true))(fakeCtx()), "stop");
    assert.equal(called, false);
    const double: Middleware = async (_c, next) => ((await next()) as number) * 2;
    assert.equal(await compose([double], () => 21)(fakeCtx()), 42);
  });

  it("menolak next() dipanggil dua kali", async () => {
    const twice: Middleware = async (_c, next) => {
      await next();
      return next();
    };
    await assert.rejects(compose([twice], () => 1)(fakeCtx()), /lebih dari sekali/);
  });
});

describe("middleware di server", () => {
  let base: string;
  let close: () => Promise<void>;
  const order: string[] = [];

  before(async () => {
    const plugin = definePlugin({
      name: "order",
      setup: (rt) => {
        rt.use((_ctx, next) => {
          order.push("plugin");
          return next();
        });
      },
    });
    const fromConfig: Middleware = (ctx, next) => {
      order.push("config");
      if (ctx.path === "/short-circuit") return { shortCircuit: true };
      return next();
    };
    ({ base, close } = await startServer({ middleware: [fromConfig], plugins: [plugin] }));
  });
  after(() => close());

  it("urutan: config -> plugin -> file middleware aplikasi", async () => {
    order.length = 0;
    const res = await fetch(`${base}/users`);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("x-app-middleware"), "1");
    assert.deepEqual(order, ["config", "plugin"]);
  });

  it("middleware global berjalan juga untuk path tanpa route", async () => {
    const res = await fetch(`${base}/short-circuit`);
    assert.deepEqual(await res.json(), { shortCircuit: true });
    const missing = await fetch(`${base}/tidak-ada`);
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get("x-app-middleware"), "1");
  });

  it("middleware per route dari `export const middleware`", async () => {
    assert.equal((await fetch(`${base}/api/guarded`)).status, 401);
    const ok = await fetch(`${base}/api/guarded`, { headers: { Authorization: "Bearer rahasia" } });
    assert.deepEqual(await ok.json(), { user: "budi", wrapped: true });
  });

  it("runtime.use() ditolak setelah server berjalan", async () => {
    const { runtime, close: stop } = await startServer();
    assert.throws(() => runtime.use((_c, n) => n()), /sebelum start/);
    await stop();
  });
});
