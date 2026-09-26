import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { animationEnabled, parseArgs, run } from "../src/cli.js";
import { FIXTURES } from "./helpers.js";

function io(cwd: string) {
  const out: string[] = [];
  const err: string[] = [];
  return { io: { cwd, out: (l: string) => out.push(l), err: (l: string) => err.push(l) }, out, err };
}

describe("cli", () => {
  let dir: string;
  before(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-cli-"));
  });
  after(() => fs.rmSync(dir, { recursive: true, force: true }));

  it("parseArgs", () => {
    assert.deepEqual(parseArgs(["make:route", "a", "--methods", "GET,POST", "--force", "--dir=x"]), {
      positional: ["make:route", "a"],
      flags: { methods: "GET,POST", force: true, dir: "x" },
    });
  });

  it("make:route membuat file dengan method yang diminta", async () => {
    const t = io(dir);
    assert.equal(await run(["make:route", "/api/products/[id]", "--methods", "get,put"], t.io), 0);
    const file = path.join(dir, "src", "app", "routes", "api", "products", "[id].ts");
    const content = fs.readFileSync(file, "utf8");
    assert.match(content, /export function GET\(ctx: ZenContext\)/);
    assert.match(content, /export async function PUT\(ctx: ZenContext\)/);
    assert.match(content, /params: ctx\.params/);

    const again = io(dir);
    assert.equal(await run(["make:route", "api/products/[id]"], again.io), 1);
    assert.match(again.err[0] ?? "", /sudah ada/);
  });

  it("make:route menolak path dan method yang tidak valid", async () => {
    for (const args of [["make:route", "../x"], ["make:route", "a/[1x]"], ["make:route", "a", "--methods", "FETCH"], ["make:route"]]) {
      const t = io(dir);
      assert.equal(await run(args, t.io), 1, args.join(" "));
    }
  });

  it("make:middleware", async () => {
    const t = io(dir);
    assert.equal(await run(["make:middleware", "auth-guard"], t.io), 0);
    const content = fs.readFileSync(path.join(dir, "src", "app", "middleware", "auth-guard.ts"), "utf8");
    assert.match(content, /export const authGuard = defineMiddleware/);
  });

  it("routes --json membaca route dari config", async () => {
    fs.writeFileSync(
      path.join(dir, "zusantara.config.mjs"),
      `export default { routesDir: ${JSON.stringify(path.join(FIXTURES, "routes"))} };`,
    );
    const t = io(dir);
    assert.equal(await run(["routes", "--json"], t.io), 0);
    const rows = JSON.parse(t.out.join("\n")) as { pattern: string; methods: string[]; middleware: number }[];
    const items = rows.find((r) => r.pattern === "/api/items");
    assert.deepEqual(items?.methods, ["GET", "POST"]);
    assert.equal(rows.find((r) => r.pattern === "/api/guarded")?.middleware, 2);
    assert.ok(rows.findIndex((r) => r.pattern === "/users/new") < rows.findIndex((r) => r.pattern === "/users/[id]"));
  });

  it("perintah tidak dikenal -> exit 1", async () => {
    const t = io(dir);
    assert.equal(await run(["deploy"], t.io), 1);
  });
});

describe("animasi logo CLI interaktif", () => {
  it("aktif secara default; mati lewat config, ZUSANTARA_ANIMATION, atau di CI", () => {
    assert.equal(animationEnabled(undefined, {}), true);
    assert.equal(animationEnabled(false, {}), false);
    assert.equal(animationEnabled(undefined, { ZUSANTARA_ANIMATION: "off" }), false);
    assert.equal(animationEnabled(undefined, { CI: "true" }), false);
    assert.equal(animationEnabled(undefined, { CI: "true", ZUSANTARA_ANIMATION: "on" }), true, "env eksplisit menang");
    assert.equal(animationEnabled(false, { ZUSANTARA_ANIMATION: "1" }), true);
  });
});
