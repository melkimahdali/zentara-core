import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { run } from "../../src/cli.js";

/** Server palsu yang meniru API OpenAI: selalu menjawab "Selesai." tanpa tool, dengan usage. */
function fakeOpenAI(): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      const body = JSON.parse(raw || "{}") as { stream?: boolean };
      const usage = { prompt_tokens: 120, completion_tokens: 7 };
      if (body.stream) {
        res.writeHead(200, { "Content-Type": "text/event-stream" });
        res.write(`data: ${JSON.stringify({ model: "gpt-uji", choices: [{ delta: { content: "Selesai." }, finish_reason: "stop" }] })}\n\n`);
        res.write(`data: ${JSON.stringify({ model: "gpt-uji", choices: [], usage })}\n\n`);
        res.end("data: [DONE]\n\n");
        return;
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ model: "gpt-uji", choices: [{ message: { content: "Selesai." }, finish_reason: "stop" }], usage }));
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

describe("zentara ai --report", () => {
  let dir: string;
  let server: http.Server;
  const saved: Record<string, string | undefined> = {};
  const env = (key: string, value: string | undefined) => {
    if (!(key in saved)) saved[key] = process.env[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  };

  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-report-"));
    fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "demo", type: "module", scripts: {} }));
    server = await fakeOpenAI();
    env("OPENAI_API_KEY", "sk-uji");
    env("OPENAI_BASE_URL", `http://127.0.0.1:${(server.address() as AddressInfo).port}/v1`);
    env("OPENAI_MODEL", "gpt-uji");
    env("ZENTARA_AI_ORDER", "openai");
    env("ZENTARA_AI_MODE", undefined);
  });
  after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    server.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const cli = async (argv: string[]) => {
    const out: string[] = [];
    const err: string[] = [];
    const code = await run(argv, { cwd: dir, out: (l) => out.push(l), err: (l) => err.push(l) });
    return { code, out: out.join("\n"), err: err.join("\n") };
  };

  it("menulis hasil tugas sebagai JSON ke file yang diminta", async () => {
    const res = await cli(["ai", "jelaskan proyek ini", "--auto", "--report=hasil/ai.json"]);
    assert.equal(res.code, 0, res.err);
    const report = JSON.parse(fs.readFileSync(path.join(dir, "hasil", "ai.json"), "utf8")) as Record<string, unknown>;
    assert.equal(report.task, "jelaskan proyek ini");
    assert.equal(report.mode, "auto");
    assert.equal(report.dryRun, false);
    assert.equal(report.status, "done");
    assert.equal(report.steps, 1);
    assert.deepEqual(report.providersUsed, ["openai"]);
    assert.deepEqual(report.models, ["gpt-uji"]);
    assert.deepEqual(report.usage, { inputTokens: 120, outputTokens: 7, unreported: 0 });
    assert.deepEqual(report.toolCalls, []);
    assert.deepEqual(report.denied, []);
    assert.equal(typeof report.zentara, "string");
    assert.match(res.out, /hasil[\\/]ai\.json/);
  });

  it("tanpa nama file ditulis ke .zentara/ai-report.json", async () => {
    const res = await cli(["ai", "jelaskan proyek ini", "--report"]);
    assert.equal(res.code, 0, res.err);
    const report = JSON.parse(fs.readFileSync(path.join(dir, ".zentara", "ai-report.json"), "utf8")) as { mode: string; status: string };
    assert.equal(report.mode, "ask");
    assert.equal(report.status, "done");
  });
});
