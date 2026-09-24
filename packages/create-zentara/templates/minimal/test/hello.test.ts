import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import { ZenRuntime } from "zentara";

describe("aplikasi", () => {
  let base: string;
  let runtime: ZenRuntime;

  before(async () => {
    runtime = new ZenRuntime({ port: 0, host: "127.0.0.1", logLevel: "silent" });
    const { port } = await runtime.start();
    base = `http://127.0.0.1:${port}`;
  });
  after(() => runtime.stop());

  it("halaman utama", async () => {
    const res = await fetch(base);
    assert.equal(res.status, 200);
    assert.match(await res.text(), /Zentara/);
  });

  it("API hello", async () => {
    const body = (await (await fetch(`${base}/api/hello?name=Nusantara`)).json()) as { message: string };
    assert.equal(body.message, "Hello from Nusantara API");
  });
});
