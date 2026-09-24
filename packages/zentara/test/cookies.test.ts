import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseCookieHeader, serializeCookie } from "../src/core/index.js";

describe("cookies", () => {
  it("mem-parse header Cookie", () => {
    const c = parseCookieHeader('a=1; b=hello%20world; c="quoted"; a=duplicate; bad; e=%E0%A4%A');
    assert.equal(c.get("a"), "1");
    assert.equal(c.get("b"), "hello world");
    assert.equal(c.get("c"), "quoted");
    assert.equal(c.get("e"), "%E0%A4%A");
    assert.equal(c.has("bad"), false);
    assert.equal(parseCookieHeader(undefined).size, 0);
  });

  it("serialize dengan default aman", () => {
    assert.equal(serializeCookie("sid", "a b"), "sid=a%20b; Path=/; HttpOnly; SameSite=Lax");
  });

  it("serialize dengan semua opsi", () => {
    const s = serializeCookie("t", "v", {
      maxAge: 60.9, domain: "contoh.id", path: "/app", httpOnly: false, sameSite: "None", partitioned: true,
      expires: new Date(0),
    });
    assert.equal(s, "t=v; Path=/app; Domain=contoh.id; Max-Age=60; Expires=Thu, 01 Jan 1970 00:00:00 GMT; Secure; SameSite=None; Partitioned");
  });

  it("menolak nama dan atribut yang bisa menyisipkan header", () => {
    assert.throws(() => serializeCookie("a;b", "v"), /Nama cookie/);
    assert.throws(() => serializeCookie("a", "v", { path: "/; Domain=evil" }), /Path/);
    assert.throws(() => serializeCookie("a", "v", { domain: "x\r\nSet-Cookie: y" }), /Domain/);
  });
});
