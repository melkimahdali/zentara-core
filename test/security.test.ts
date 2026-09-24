import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { cors, csrf } from "../src/core/index.js";
import { startServer } from "./helpers.js";

describe("cors", () => {
  it("menolak credentials dengan origin *", () => {
    assert.throws(() => cors({ credentials: true }), /credentials/);
  });

  describe("origin terbatas + credentials", () => {
    let base: string;
    let close: () => Promise<void>;
    before(async () => {
      ({ base, close } = await startServer({
        middleware: [cors({ origin: ["https://app.contoh.id"], credentials: true, exposedHeaders: ["X-Total"], maxAge: 600 })],
      }));
    });
    after(() => close());

    it("request biasa dari origin yang diizinkan", async () => {
      const res = await fetch(`${base}/users`, { headers: { Origin: "https://app.contoh.id" } });
      assert.equal(res.headers.get("access-control-allow-origin"), "https://app.contoh.id");
      assert.equal(res.headers.get("access-control-allow-credentials"), "true");
      assert.equal(res.headers.get("access-control-expose-headers"), "X-Total");
      assert.equal(res.headers.get("vary"), "Origin");
    });

    it("preflight dari origin yang diizinkan", async () => {
      const res = await fetch(`${base}/api/items`, {
        method: "OPTIONS",
        headers: { Origin: "https://app.contoh.id", "Access-Control-Request-Method": "POST", "Access-Control-Request-Headers": "content-type" },
      });
      assert.equal(res.status, 204);
      assert.equal(res.headers.get("access-control-allow-origin"), "https://app.contoh.id");
      assert.match(res.headers.get("access-control-allow-methods") ?? "", /POST/);
      assert.equal(res.headers.get("access-control-allow-headers"), "content-type");
      assert.equal(res.headers.get("access-control-max-age"), "600");
    });

    it("origin lain tidak mendapat header CORS", async () => {
      const res = await fetch(`${base}/users`, { headers: { Origin: "https://evil.example" } });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get("access-control-allow-origin"), null);
      const pre = await fetch(`${base}/users`, {
        method: "OPTIONS",
        headers: { Origin: "https://evil.example", "Access-Control-Request-Method": "GET" },
      });
      assert.equal(pre.status, 204);
      assert.equal(pre.headers.get("access-control-allow-origin"), null);
    });
  });

  it("origin * default", async () => {
    const { base, close } = await startServer({ middleware: [cors()] });
    const res = await fetch(`${base}/users`, { headers: { Origin: "https://mana.saja" } });
    assert.equal(res.headers.get("access-control-allow-origin"), "*");
    await close();
  });
});

describe("csrf", () => {
  let base: string;
  let port: number;
  let close: () => Promise<void>;
  before(async () => {
    ({ base, port, close } = await startServer({ middleware: [csrf({ trustedOrigins: ["https://admin.contoh.id"] })] }));
  });
  after(() => close());

  const post = (headers: Record<string, string>) =>
    fetch(`${base}/api/items`, { method: "POST", body: "{}", headers: { "Content-Type": "application/json", ...headers } });

  it("mengizinkan GET dari mana saja", async () => {
    assert.equal((await fetch(`${base}/users`, { headers: { "Sec-Fetch-Site": "cross-site" } })).status, 200);
  });

  it("mengizinkan same-origin, trusted origin, dan klien non-browser", async () => {
    assert.equal((await post({ "Sec-Fetch-Site": "same-origin" })).status, 201);
    assert.equal((await post({ Origin: `http://127.0.0.1:${port}` })).status, 201);
    assert.equal((await post({ Origin: "https://admin.contoh.id", "Sec-Fetch-Site": "cross-site" })).status, 201);
    assert.equal((await post({})).status, 201);
  });

  it("menolak request lintas origin dari browser", async () => {
    assert.equal((await post({ "Sec-Fetch-Site": "cross-site" })).status, 403);
    assert.equal((await post({ "Sec-Fetch-Site": "same-site" })).status, 403);
    assert.equal((await post({ Origin: "https://evil.example" })).status, 403);
    assert.equal((await post({ Origin: "null" })).status, 403);
  });
});
