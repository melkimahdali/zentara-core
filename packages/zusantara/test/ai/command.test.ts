import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { ApprovalPolicy, type PendingAction } from "../../src/ai/approval.js";
import { classifyCommand, CommandRejected, createCommandRunner, parseCommand, redactSecrets, secretValues } from "../../src/ai/command.js";
import { Journal } from "../../src/ai/journal.js";
import { agentTools, type ToolContext } from "../../src/ai/tools.js";

const classify = (line: string, allowed: string[] = []) => classifyCommand(parseCommand(line), allowed);

describe("parseCommand", () => {
  it("memecah argumen dengan kutip", () => {
    assert.deepEqual(parseCommand(`git commit -m "pesan dengan spasi" --author='A B'`), ["git", "commit", "-m", "pesan dengan spasi", "--author=A B"]);
    assert.deepEqual(parseCommand(`node --version`), ["node", "--version"]);
    assert.deepEqual(parseCommand(`echo ""`), ["echo", ""]);
  });

  it("menolak operator shell, juga di dalam kutip", () => {
    for (const bad of ["ls | grep a", "npm test && rm -rf src", "cat a > b", "echo $HOME", 'echo "%PATH%"', "echo `id`", "a; b", "node -e (1)", "ls\nrm x"]) {
      assert.throws(() => parseCommand(bad), CommandRejected, bad);
    }
    assert.throws(() => parseCommand(`echo "tidak ditutup`), /kutip/);
  });
});

describe("classifyCommand", () => {
  it("perintah baca-saja langsung jalan", () => {
    for (const ok of ["git status", "git diff --stat", "git log -5 --oneline", "ls -la src", "npm ls", "npx tsc --noEmit", "node -v"]) {
      assert.equal(classify(ok).risk, "read", ok);
    }
  });

  it("perintah lain krusial; ai.allowedCommands menurunkannya ke write", () => {
    assert.equal(classify("npx eslint src").risk, "critical");
    assert.equal(classify("npx eslint src", ["npx eslint"]).risk, "write");
    assert.equal(classify("npm run lint -- --fix", ["npm run lint"]).risk, "write");
    assert.equal(classify("npm run lint2", ["npm run lint"]).risk, "critical");
    // Argumen yang bisa menulis file membuat git diff tidak lagi aman.
    assert.equal(classify("git diff --output=x.txt").risk, "critical");
  });

  it("menolak admin/sistem, shell bersarang, kredensial, rahasia, path luar, dan server", () => {
    const rejected = [
      "sudo rm -rf src", "bash -c ls", "powershell Get-ChildItem", "env", "printenv", "npm publish", "npm token list",
      "git push origin main", "git config --global user.name x", "cat .env", "cat .env.local", "type config/.env",
      "git show HEAD:.env", "cp data/app.db x", "cat /etc/passwd", "ls ../other", "ls ~", "node C:\\x.js",
      "npm run dev", "npx zusantara dev", "npx tsc --watch", "./node_modules/.bin/tsc",
    ];
    for (const line of rejected) assert.throws(() => classify(line), CommandRejected, line);
    assert.equal(classify("cat .env.example").risk, "critical");
    // Mencocokkan nama program tanpa ekstensi Windows.
    assert.throws(() => classify("npm.cmd publish"), CommandRejected);
  });
});

describe("redaksi rahasia", () => {
  let root: string;
  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-cmd-"));
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("nilai rahasia dari .env dan environment disembunyikan, nilai biasa tidak", () => {
    fs.writeFileSync(path.join(root, ".env"), 'SESSION_SECRET="rahasia-sesi-123"\nPORT=3000\nexport OPENAI_API_KEY=sk-abcdef\nNODE_ENV=development\n');
    const secrets = secretValues(root, { GITHUB_TOKEN: "ghp_tokenku", HOME: "/home/x", SHORT_KEY: "abc" });
    assert.deepEqual(new Set(secrets), new Set(["rahasia-sesi-123", "sk-abcdef", "ghp_tokenku"]));
    assert.equal(
      redactSecrets("key=sk-abcdef token ghp_tokenku port 3000 env development", secrets),
      "key=[disembunyikan] token [disembunyikan] port 3000 env development",
    );
  });
});

describe("tool run_command", () => {
  let root: string;
  let asked: PendingAction[];
  let answer: "yes" | "no";
  const tool = agentTools.find((t) => t.spec.name === "run_command")!;
  const ctx = (mode: "ask" | "auto" = "ask"): ToolContext => ({
    root,
    approval: new ApprovalPolicy(mode, async (a) => {
      asked.push(a);
      return answer;
    }),
    journal: new Journal(root, "uji"),
    dryRun: false,
    runScript: async () => ({ ok: true, output: "" }),
    runDb: async () => ({ ok: true, output: "" }),
    runCommand: createCommandRunner(root),
    allowedCommands: ["node --print"],
  });

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-cmd-"));
    fs.writeFileSync(path.join(root, ".env"), "API_KEY=kunci-rahasia-99\n");
    fs.writeFileSync(path.join(root, "a.txt"), "halo");
    asked = [];
    answer = "yes";
  });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

  it("perintah baca-saja jalan tanpa ditanya", async () => {
    const out = await tool.run({ command: "ls" }, ctx());
    assert.match(out, /^BERHASIL: ls\n[\s\S]*a\.txt/);
    assert.equal(asked.length, 0);
    assert.equal(tool.mutates!({ command: "ls" }, ctx()), false);
  });

  it("perintah lain minta persetujuan (krusial, juga di mode auto); ditolak -> tidak jalan", async () => {
    answer = "no";
    await assert.rejects(tool.run({ command: "node -p 1" }, ctx("auto")), /tidak menyetujui/);
    assert.equal(asked[0]!.risk, "critical");
    assert.equal(asked[0]!.previewKind, "command");
    assert.equal(tool.mutates!({ command: "node -p 1" }, ctx()), true);
  });

  it("output yang memuat rahasia disensor sebelum dikirim ke AI", async () => {
    process.env.ZUSANTARA_TEST_TOKEN = "token-uji-rahasia";
    try {
      const out = await tool.run({ command: "node --print process.env.ZUSANTARA_TEST_TOKEN" }, ctx("auto"));
      assert.match(out, /BERHASIL/);
      assert.ok(!out.includes("token-uji-rahasia"));
      assert.match(out, /\[disembunyikan\]/);
      // Cocok dengan allowedCommands -> write: otomatis di mode auto.
      assert.equal(asked.length, 0);
    } finally {
      delete process.env.ZUSANTARA_TEST_TOKEN;
    }
  });

  it("perintah terlarang ditolak dengan pesan yang jelas untuk model", async () => {
    await assert.rejects(tool.run({ command: "cat .env" }, ctx()), /Perintah ditolak: .*rahasia/);
    await assert.rejects(tool.run({ command: "ls | head" }, ctx()), /Perintah ditolak: operator shell/);
    assert.equal(asked.length, 0);
  });
});
