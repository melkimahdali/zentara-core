import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { findLocalCli } from "../src/process.js";

describe("CLI zentara milik proyek", () => {
  it("dipakai bila proyek memakai zentara dan CLI-nya terpasang; bukan bila sama dengan CLI yang berjalan", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-local-"));
    try {
      fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ dependencies: {} }));
      const cli = path.join(root, "node_modules", "zentara", "dist", "cli.js");
      fs.mkdirSync(path.dirname(cli), { recursive: true });
      fs.writeFileSync(cli, "");
      fs.mkdirSync(path.join(root, "src", "app"), { recursive: true });
      assert.equal(findLocalCli(path.join(root, "src", "app")), undefined, "proyek tidak memakai zentara");
      fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ dependencies: { zentara: "^0.12.0" } }));
      assert.equal(findLocalCli(path.join(root, "src", "app"), "/global/lib/node_modules/zentara/dist/cli.js"), cli);
      assert.equal(findLocalCli(root, cli), undefined, "CLI yang sedang berjalan adalah CLI proyek itu sendiri");
      assert.equal(findLocalCli(os.tmpdir()), undefined);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
