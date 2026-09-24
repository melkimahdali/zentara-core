import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import {
  currentUser,
  hashPassword,
  login,
  logout,
  needsRehash,
  rateLimit,
  requireAuth,
  session,
  verifyPassword,
  withMiddleware,
  type ZenContext,
} from "../src/core/index.js";
import { startServer } from "./helpers.js";

describe("password", () => {
  it("hash dan verifikasi", async () => {
    const hash = await hashPassword("rahasia123");
    assert.match(hash, /^scrypt\$32768\$8\$3\$/);
    assert.notEqual(hash, await hashPassword("rahasia123"), "salt acak");
    assert.equal(await verifyPassword("rahasia123", hash), true);
    assert.equal(await verifyPassword("rahasia124", hash), false);
    assert.equal(needsRehash(hash), false);
  });

  it("hash rusak / parameter berbahaya dianggap tidak cocok", async () => {
    assert.equal(await verifyPassword("x", "bukan-hash"), false);
    assert.equal(await verifyPassword("x", "scrypt$1048577$8$1$AAAA$AAAA"), false);
    assert.equal(needsRehash("scrypt$16384$8$1$AAAA$AAAA"), true);
    await assert.rejects(hashPassword(""), /kosong/);
    await assert.rejects(hashPassword("x".repeat(2000)), /maksimal/);
  });

  it("normalisasi unicode (NFKC)", async () => {
    const hash = await hashPassword("ｐａｓｓｗｏｒｄ１");
    assert.equal(await verifyPassword("password1", hash), true);
  });
});

describe("login, requireAuth, rateLimit, withMiddleware", () => {
  let base: string;
  let close: () => Promise<void>;
  const users = new Map<number, { id: number; role: string }>([
    [1, { id: 1, role: "user" }],
    [2, { id: 2, role: "admin" }],
  ]);

  before(async () => {
    const loadUser = (id: string | number) => users.get(Number(id));
    const routes: Record<string, (ctx: ZenContext) => unknown> = {
      "/masuk": (ctx) => {
        const id = Number(ctx.query.id);
        login(ctx, users.get(id)!);
        return { ok: true };
      },
      "/keluar": (ctx) => void logout(ctx),
      "/siapa": (ctx) => ({ user: currentUser(ctx) ?? null }),
      "/profil": withMiddleware([requireAuth({ loadUser })], (ctx) => ({ user: ctx.state.user })),
      "/admin": withMiddleware([requireAuth({ loadUser, roles: ["admin"] })], () => ({ admin: true })),
      "/terbatas": withMiddleware([rateLimit({ windowMs: 60_000, max: 2 })], () => ({ ok: true })),
    };
    ({ base, close } = await startServer({
      middleware: [
        session({ secret: "k".repeat(32) }),
        (ctx, next) => (routes[ctx.path] ? routes[ctx.path]!(ctx) : next()),
      ],
    }));
  });
  after(() => close());

  const cookieOf = async (id: number) => (await fetch(`${base}/masuk?id=${id}`)).headers.getSetCookie()[0]!.split(";")[0]!;

  it("tanpa login -> 401; login -> user tersedia", async () => {
    assert.equal((await fetch(`${base}/profil`)).status, 401);
    const cookie = await cookieOf(1);
    assert.deepEqual(await (await fetch(`${base}/siapa`, { headers: { cookie } })).json(), { user: { id: 1, role: "user" } });
    assert.deepEqual(await (await fetch(`${base}/profil`, { headers: { cookie } })).json(), { user: { id: 1, role: "user" } });
  });

  it("role dicek dari data terbaru (loadUser)", async () => {
    const cookie = await cookieOf(1);
    assert.equal((await fetch(`${base}/admin`, { headers: { cookie } })).status, 403);
    users.set(1, { id: 1, role: "admin" });
    assert.equal((await fetch(`${base}/admin`, { headers: { cookie } })).status, 200);
    users.set(1, { id: 1, role: "user" });
  });

  it("user yang dihapus -> sesi berakhir (401 + cookie dihapus)", async () => {
    users.set(9, { id: 9, role: "user" });
    const cookie = await cookieOf(9);
    users.delete(9);
    const res = await fetch(`${base}/profil`, { headers: { cookie } });
    assert.equal(res.status, 401);
    assert.match(res.headers.getSetCookie()[0] ?? "", /Max-Age=0/);
  });

  it("logout menghapus sesi", async () => {
    const cookie = await cookieOf(2);
    const res = await fetch(`${base}/keluar`, { headers: { cookie } });
    assert.match(res.headers.getSetCookie()[0] ?? "", /Max-Age=0/);
  });

  it("rateLimit -> 429 dengan Retry-After", async () => {
    const r1 = await fetch(`${base}/terbatas`);
    assert.equal(r1.headers.get("ratelimit-remaining"), "1");
    assert.equal((await fetch(`${base}/terbatas`)).status, 200);
    const r3 = await fetch(`${base}/terbatas`);
    assert.equal(r3.status, 429);
    assert.ok(Number(r3.headers.get("retry-after")) > 0);
  });
});
