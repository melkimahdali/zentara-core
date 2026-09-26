import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { detectPackageManager, ownVersion, parseArgs, platformCommand, scaffold, TEMPLATES, toPackageName } from "../src/index.js";

describe("create-zusantara", () => {
  let tmp: string;
  before(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "create-zusantara-"));
  });
  after(() => fs.rmSync(tmp, { recursive: true, force: true }));

  for (const template of Object.keys(TEMPLATES) as (keyof typeof TEMPLATES)[]) {
    it(`template ${template}: file lengkap, .gitignore, package.json, .env`, () => {
      const target = path.join(tmp, `Toko Saya ${template}`);
      const { packageName } = scaffold({ targetDir: target, template });
      assert.equal(packageName, `toko-saya-${template}`);
      assert.ok(fs.existsSync(path.join(target, ".gitignore")));
      assert.ok(!fs.existsSync(path.join(target, "_gitignore")));
      assert.ok(fs.existsSync(path.join(target, "src", "app", "routes", "index.ts")));
      const pkg = JSON.parse(fs.readFileSync(path.join(target, "package.json"), "utf8"));
      assert.equal(pkg.name, packageName);
      assert.equal(pkg.dependencies.zusantara, `^${ownVersion()}`);
      assert.equal(pkg.scripts.dev, "zusantara dev");
      const env = fs.readFileSync(path.join(target, ".env"), "utf8");
      assert.match(env, /^SESSION_SECRET=[0-9a-f]{64}$/m);
      assert.match(fs.readFileSync(path.join(target, ".gitignore"), "utf8"), /^\.env$/m);
      if (template === "api") assert.ok(fs.existsSync(path.join(target, "drizzle", "meta", "_journal.json")));
    });
  }

  it("secret berbeda untuk setiap proyek", () => {
    scaffold({ targetDir: path.join(tmp, "a"), template: "minimal" });
    scaffold({ targetDir: path.join(tmp, "b"), template: "minimal" });
    const secret = (d: string) => fs.readFileSync(path.join(tmp, d, ".env"), "utf8").match(/SESSION_SECRET=(\w+)/)![1];
    assert.notEqual(secret("a"), secret("b"));
  });

  it("menolak folder yang sudah berisi dan template tak dikenal", () => {
    const busy = path.join(tmp, "busy");
    fs.mkdirSync(busy);
    fs.writeFileSync(path.join(busy, "x.txt"), "x");
    assert.throws(() => scaffold({ targetDir: busy, template: "api" }), /sudah berisi/);
    assert.throws(() => scaffold({ targetDir: path.join(tmp, "z"), template: "blog" as "api" }), /tidak dikenal/);
  });

  it("zusantaraSpec bisa diganti (untuk uji paket lokal)", () => {
    scaffold({ targetDir: path.join(tmp, "spec"), template: "minimal", zusantaraSpec: "file:../zusantara.tgz" });
    assert.equal(JSON.parse(fs.readFileSync(path.join(tmp, "spec", "package.json"), "utf8")).dependencies.zusantara, "file:../zusantara.tgz");
  });

  it("helper nama, argumen, dan package manager", () => {
    assert.equal(toPackageName("  My App!! "), "my-app");
    assert.equal(toPackageName("..."), "zusantara-app");
    assert.deepEqual(parseArgs(["toko", "--template", "minimal", "--no-install", "-y"]), {
      dir: "toko", template: "minimal", install: false, yes: true, help: false,
    });
    assert.equal(parseArgs(["--template=api"]).template, "api");
    assert.equal(detectPackageManager("pnpm/9.0.0 npm/? node/v22"), "pnpm");
    assert.equal(detectPackageManager(""), "npm");
  });

  it("Windows: node.exe berpath spasi tanpa shell; npm lewat shell dengan kutip", () => {
    const node = "C:\\Program Files\\nodejs\\node.exe";
    assert.deepEqual(platformCommand(node, ["cli.js", "db:migrate"], "win32"), { command: node, args: ["cli.js", "db:migrate"], shell: false });
    assert.deepEqual(platformCommand("npm", ["install"], "win32"), { command: "npm install", args: [], shell: true });
    assert.equal(platformCommand("npm", ["install"], "linux").shell, false);
  });
});
