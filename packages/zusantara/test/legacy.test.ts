import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { after, before, describe, it } from "node:test";
import { ApprovalPolicy } from "../src/ai/approval.js";
import { agentTools } from "../src/ai/tools.js";
import { SqliteJobStore } from "../src/backend/jobs.js";
import { run } from "../src/cli.js";
import { loadConfigFile } from "../src/core/config.js";
import { applyLegacyEnv, migrateLegacyDirs, migrateProject, modernInternalPath } from "../src/core/legacy.js";
import { startServer } from "./helpers.js";

function tmp(prefix: string): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), `zusantara-${prefix}-`));
}

describe("nama lama Zentara (kompatibilitas satu versi)", () => {
  it("ZENTARA_* dibaca sebagai ZUSANTARA_*, nama baru tetap menang", () => {
    const env: NodeJS.ProcessEnv = { ZENTARA_LANG: "en", ZENTARA_DEBUG: "1", ZUSANTARA_DEBUG: "0", OTHER: "x" };
    assert.deepEqual(applyLegacyEnv(env), ["ZENTARA_LANG"]);
    assert.equal(env.ZUSANTARA_LANG, "en");
    assert.equal(env.ZUSANTARA_DEBUG, "0");
    assert.equal(env.OTHER, "x");
  });

  it("path internal /_zentara dipetakan ke /_zusantara", () => {
    assert.equal(modernInternalPath("/_zentara/ui.css"), "/_zusantara/ui.css");
    assert.equal(modernInternalPath("/_zentara"), "/_zusantara");
    assert.equal(modernInternalPath("/_zentaraku"), "/_zentaraku");
    assert.equal(modernInternalPath("/produk"), "/produk");
  });

  it("zentara.config.mjs lama tetap dimuat bila belum ada zusantara.config.*", async () => {
    const dir = tmp("config");
    fs.writeFileSync(path.join(dir, "zentara.config.mjs"), "export default { appName: 'Lama' };\n");
    assert.equal((await loadConfigFile(dir)).appName, "Lama");
    fs.writeFileSync(path.join(dir, "zusantara.config.mjs"), "export default { appName: 'Baru' };\n");
    assert.equal((await loadConfigFile(dir)).appName, "Baru");
  });

  it("folder .zentara proyek dan home dipindah, .gitignore ikut diperbarui", () => {
    const cwd = tmp("proj");
    const home = tmp("home");
    fs.mkdirSync(path.join(cwd, ".zentara", "sessions"), { recursive: true });
    fs.writeFileSync(path.join(cwd, ".zentara", "sessions", "a.json"), "{}");
    fs.writeFileSync(path.join(cwd, ".gitignore"), "node_modules\n.zentara/\n");
    fs.mkdirSync(path.join(home, ".zentara"));
    assert.equal(migrateLegacyDirs(cwd, {}, home).length, 2);
    assert.ok(fs.existsSync(path.join(cwd, ".zusantara", "sessions", "a.json")));
    assert.ok(fs.existsSync(path.join(home, ".zusantara")));
    assert.match(fs.readFileSync(path.join(cwd, ".gitignore"), "utf8"), /^\.zusantara\/$/m);
    assert.deepEqual(migrateLegacyDirs(cwd, {}, home), [], "kedua kalinya tidak ada yang dipindah");
  });

  it("migrate:zusantara mengubah import, package.json, config, dan .env", () => {
    const cwd = tmp("migrate");
    fs.writeFileSync(
      path.join(cwd, "package.json"),
      JSON.stringify({ name: "app", scripts: { dev: "zentara dev", build: "zentara build" }, dependencies: { zentara: "^0.12.9", zod: "^3.0.0" } }, null, 2),
    );
    fs.mkdirSync(path.join(cwd, "src", "app", "routes"), { recursive: true });
    fs.writeFileSync(path.join(cwd, "src", "app", "routes", "index.tsx"), `import { html } from "zentara";\nimport { Page } from 'zentara/ui';\nconst s = "zentara adalah nama lama";\n`);
    fs.writeFileSync(path.join(cwd, "zentara.config.mjs"), "export default {};\n");
    fs.writeFileSync(path.join(cwd, ".env"), "ZENTARA_AI_ORDER=claude\nPORT=3000\n");

    const changed = migrateProject(cwd, "0.12.10");
    assert.ok(changed.includes("package.json") && changed.includes("src/app/routes/index.tsx"), changed.join(", "));
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8"));
    assert.deepEqual(pkg.dependencies, { zod: "^3.0.0", zusantara: "^0.12.10" });
    assert.deepEqual(pkg.scripts, { dev: "zusantara dev", build: "zusantara build" });
    const route = fs.readFileSync(path.join(cwd, "src", "app", "routes", "index.tsx"), "utf8");
    assert.match(route, /from "zusantara";/);
    assert.match(route, /from 'zusantara\/ui';/);
    assert.match(route, /"zentara adalah nama lama"/, "teks biasa tidak ikut diubah");
    assert.ok(fs.existsSync(path.join(cwd, "zusantara.config.mjs")) && !fs.existsSync(path.join(cwd, "zentara.config.mjs")));
    assert.equal(fs.readFileSync(path.join(cwd, ".env"), "utf8"), "ZUSANTARA_AI_ORDER=claude\nPORT=3000\n");
    assert.deepEqual(migrateProject(cwd, "0.12.10"), [], "kedua kalinya tidak ada perubahan");
  });

  it("perintah CLI migrate:zusantara melaporkan perubahan", async () => {
    const cwd = tmp("cli");
    fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ name: "app", dependencies: { zentara: "^0.12.9" } }));
    const out: string[] = [];
    assert.equal(await run(["migrate:zusantara"], { cwd, out: (l) => out.push(l), err: () => {}, interactive: false }), 0);
    assert.ok(out.some((l) => l.includes("package.json")), out.join("\n"));
    out.length = 0;
    assert.equal(await run(["migrate:zusantara"], { cwd, out: (l) => out.push(l), err: () => {}, interactive: false }), 0);
    assert.equal(out.length, 1);
  });

  it("Zusantara AI bisa menjalankan migrate:zusantara (dengan persetujuan)", async () => {
    const cwd = tmp("ai");
    fs.writeFileSync(path.join(cwd, "package.json"), JSON.stringify({ name: "app", dependencies: { zentara: "^0.12.9" } }));
    const tool = agentTools.find((x) => x.spec.name === "zusantara")!;
    const asked: string[] = [];
    const approval = new ApprovalPolicy("auto", async (a) => (asked.push(a.risk), "yes"));
    const out = await tool.run({ command: "migrate:zusantara" }, { root: cwd, approval, dryRun: false } as Parameters<typeof tool.run>[1]);
    assert.deepEqual(asked, ["critical"], "aksi krusial tetap ditanyakan di mode auto");
    assert.match(out, /package\.json/);
    assert.ok(JSON.parse(fs.readFileSync(path.join(cwd, "package.json"), "utf8")).dependencies.zusantara);
  });

  it("tabel antrean zentara_jobs dipakai terus dengan nama baru", () => {
    const file = path.join(tmp("jobs"), "jobs.db");
    const old = new DatabaseSync(file);
    old.exec(`CREATE TABLE zentara_jobs (id TEXT PRIMARY KEY, name TEXT NOT NULL, data TEXT NOT NULL, status TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0, max_attempts INTEGER NOT NULL, run_at INTEGER NOT NULL, locked_until INTEGER NOT NULL DEFAULT 0,
      last_error TEXT, created_at INTEGER NOT NULL, finished_at INTEGER);
      CREATE INDEX zentara_jobs_due ON zentara_jobs (status, run_at);
      CREATE TABLE zentara_schedules (name TEXT PRIMARY KEY, last_slot INTEGER NOT NULL);
      INSERT INTO zentara_jobs (id, name, data, status, max_attempts, run_at, created_at) VALUES ('lama', 'kirim', 'null', 'queued', 1, 0, 0);`);
    old.close();
    const store = new SqliteJobStore(file);
    assert.equal(store.claim(Date.now(), 60_000)?.id, "lama");
    store.close();
    const check = new DatabaseSync(file);
    const tables = check.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map((r) => r.name);
    check.close();
    assert.deepEqual(tables, ["zusantara_jobs", "zusantara_schedules"]);
  });

  describe("URL /_zentara lama", () => {
    let base: string;
    let close: () => Promise<void>;
    before(async () => ({ base, close } = await startServer()));
    after(() => close());

    it("aset bawaan tetap dilayani", async () => {
      const css = await fetch(`${base}/_zentara/ui.css`);
      assert.equal(css.status, 200);
      assert.match(css.headers.get("content-type")!, /text\/css/);
      assert.equal((await fetch(`${base}/_zentara/tidak-ada.css`)).status, 404);
    });
  });
});
