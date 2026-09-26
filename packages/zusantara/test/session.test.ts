import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, it } from "node:test";
import { session, type ZenContext } from "../src/core/index.js";
import { sealSession, unsealSession } from "../src/core/session.js";
import { startServer } from "./helpers.js";

const SECRET = "s".repeat(32);
const key = (s: string) => Buffer.from(crypto.hkdfSync("sha256", s, "zusantara-session", "session-encryption-v1", 32));

describe("seal/unseal", () => {
  const k1 = key(SECRET);
  const k2 = key("t".repeat(32));

  it("round-trip dan tidak berisi plaintext", () => {
    const sealed = sealSession({ userId: 7, role: "admin" }, Date.now() + 60_000, k1, "zen_session");
    assert.ok(!sealed.includes("admin"));
    assert.deepEqual(unsealSession(sealed, [k1], "zen_session"), { userId: 7, role: "admin" });
  });

  it("menolak cookie yang diubah, kunci salah, nama cookie lain, dan kedaluwarsa", () => {
    const sealed = sealSession({ a: 1 }, Date.now() + 60_000, k1, "zen_session");
    const body = Buffer.from(sealed.slice(3), "base64url");
    body[body.length - 1]! ^= 1;
    assert.equal(unsealSession("v1." + body.toString("base64url"), [k1], "zen_session"), undefined);
    assert.equal(unsealSession(sealed, [k2], "zen_session"), undefined);
    assert.equal(unsealSession(sealed, [k1], "other"), undefined);
    assert.equal(unsealSession(sealed, [k1], "zen_session", Date.now() + 120_000), undefined);
    assert.equal(unsealSession("garbage", [k1], "zen_session"), undefined);
  });

  it("rotasi kunci: kunci lama masih bisa membaca", () => {
    const sealed = sealSession({ a: 1 }, Date.now() + 60_000, k2, "zen_session");
    assert.deepEqual(unsealSession(sealed, [k1, k2], "zen_session"), { a: 1 });
  });

  it("memvalidasi secret", () => {
    assert.throws(() => session({ secret: "pendek" }), /minimal 32/);
    const prev = process.env.NODE_ENV;
    const prevSecret = process.env.SESSION_SECRET;
    process.env.NODE_ENV = "production";
    delete process.env.SESSION_SECRET;
    try {
      assert.throws(() => session(), /wajib/);
    } finally {
      process.env.NODE_ENV = prev;
      if (prevSecret !== undefined) process.env.SESSION_SECRET = prevSecret;
    }
  });
});

describe("session di server", () => {
  let base: string;
  let close: () => Promise<void>;

  before(async () => {
    ({ base, close } = await startServer({
      middleware: [
        session({ secret: SECRET, maxAge: 3600 }),
        (ctx: ZenContext, next) => {
          if (ctx.path === "/login") {
            ctx.session.set("user", "budi");
            return { ok: true };
          }
          if (ctx.path === "/me") return { user: ctx.session.get("user") ?? null, isNew: ctx.session.isNew };
          if (ctx.path === "/logout") {
            ctx.session.destroy();
            return { ok: true };
          }
          return next();
        },
      ],
    }));
  });
  after(() => close());

  const cookieFrom = (res: Response) => res.headers.getSetCookie()[0]?.split(";")[0] ?? "";

  it("menyimpan session di cookie terenkripsi dan membacanya kembali", async () => {
    const login = await fetch(`${base}/login`);
    const setCookie = login.headers.getSetCookie()[0] ?? "";
    assert.match(setCookie, /^zen_session=v1\./);
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /Max-Age=3600/);
    const cookie = cookieFrom(login);

    const me = await fetch(`${base}/me`, { headers: { cookie } });
    assert.deepEqual(await me.json(), { user: "budi", isNew: false });
    assert.equal(me.headers.getSetCookie().length, 0, "tidak menulis ulang cookie bila tidak berubah");
  });

  it("tanpa cookie -> session baru; cookie palsu -> dibersihkan", async () => {
    assert.deepEqual(await (await fetch(`${base}/me`)).json(), { user: null, isNew: true });
    const forged = await fetch(`${base}/me`, { headers: { cookie: "zen_session=v1.AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" } });
    assert.deepEqual(await forged.json(), { user: null, isNew: true });
    assert.match(forged.headers.getSetCookie()[0] ?? "", /zen_session=; .*Max-Age=0/);
  });

  it("destroy() menghapus cookie", async () => {
    const cookie = cookieFrom(await fetch(`${base}/login`));
    const out = await fetch(`${base}/logout`, { headers: { cookie } });
    assert.match(out.headers.getSetCookie()[0] ?? "", /zen_session=; .*Max-Age=0/);
  });

  it("ctx.session tanpa middleware memberi error yang jelas", async () => {
    const { base: other, close: stop } = await startServer({
      middleware: [(ctx: ZenContext) => ctx.session.get("x")],
      logLevel: "silent",
    });
    const res = await fetch(`${other}/`);
    assert.equal(res.status, 500);
    await stop();
  });
});
