import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { Agent, type AgentUI } from "../../src/ai/agent.js";
import { ApprovalPolicy, type ApprovalAnswer, type PendingAction } from "../../src/ai/approval.js";
import { ProviderChain } from "../../src/ai/chain.js";
import { resolveAiConfig } from "../../src/ai/config.js";
import { Journal, latestJournal, undoLatest } from "../../src/ai/journal.js";
import { agentTools, resolveProjectPath, type ToolContext } from "../../src/ai/tools.js";
import { AbortedError, ProviderUnavailableError, type CompletionRequest, type ModelProvider, type ModelTurn } from "../../src/ai/types.js";

const quietUI: AgentUI = { thinking() {}, assistant() {}, toolStart() {}, toolEnd() {}, info() {} };

/** Provider palsu yang menjawab sesuai skrip; bisa diatur "kehabisan kredit" setelah n panggilan. */
class ScriptedProvider implements ModelProvider {
  calls: CompletionRequest[] = [];
  constructor(readonly name: string, private readonly script: ModelTurn[], private readonly failAfter = Infinity) {}
  describe() { return this.name; }
  async check() { return "ok"; }
  async complete(req: CompletionRequest): Promise<ModelTurn> {
    if (this.calls.length >= this.failAfter) throw new ProviderUnavailableError(this.name, "kredit habis (402)");
    this.calls.push(structuredClone(req));
    const turn = this.script.shift();
    if (!turn) return { text: "selesai", toolCalls: [], stop: "end" };
    return turn;
  }
}

const tool = (id: string, name: string, input: unknown): ModelTurn => ({ text: "", toolCalls: [{ id, name, input }], stop: "tool_use" });

let root: string;
let asked: PendingAction[];
let answer: ApprovalAnswer;
let dbCalls: string[];

function makeContext(mode: "ask" | "auto" = "ask", dryRun = false): ToolContext {
  return {
    root,
    approval: new ApprovalPolicy(mode, async (a) => {
      asked.push(a);
      return answer;
    }),
    journal: new Journal(root, "tugas uji"),
    dryRun,
    runScript: async () => ({ ok: true, output: "ok" }),
    runDb: async (action) => {
      dbCalls.push(action);
      if (action === "generate") {
        fs.mkdirSync(path.join(root, "drizzle", "meta"), { recursive: true });
        fs.writeFileSync(path.join(root, "drizzle", "0001_baru.sql"), "CREATE TABLE x (id integer);");
        fs.writeFileSync(path.join(root, "drizzle", "meta", "_journal.json"), '{"entries":["0000","0001"]}');
      }
      return { ok: true, output: `db:${action} ok` };
    },
  };
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-ai-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "demo", scripts: {} }));
  fs.writeFileSync(path.join(root, ".env"), "ANTHROPIC_API_KEY=rahasia");
  fs.mkdirSync(path.join(root, "src"));
  fs.writeFileSync(path.join(root, "src", "a.ts"), "export const a = 1;\n");
  asked = [];
  answer = "yes";
  dbCalls = [];
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("keamanan tool", () => {
  it("path di luar proyek dan lewat symlink ditolak", () => {
    assert.throws(() => resolveProjectPath(root, "../luar.txt"), /luar folder proyek/);
    assert.throws(() => resolveProjectPath(root, "/etc/passwd"), /luar folder proyek/);
    fs.symlinkSync(os.tmpdir(), path.join(root, "link"));
    assert.throws(() => resolveProjectPath(root, "link/x.txt"), /symlink/);
    assert.equal(resolveProjectPath(root, "src/../src/a.ts").rel, "src/a.ts");
  });

  it("file .env tidak bisa dibaca atau diubah; .git/node_modules tidak bisa ditulis", async () => {
    const ctx = makeContext("auto");
    const run = (name: string, input: Record<string, unknown>) => agentTools.find((t) => t.spec.name === name)!.run(input, ctx);
    await assert.rejects(run("read_file", { path: ".env" }), /rahasia/);
    await assert.rejects(run("edit_file", { path: ".env", old_text: "a", new_text: "b" }), /rahasia/);
    await assert.rejects(run("write_file", { path: ".git/config", content: "x" }), /tidak diizinkan/);
    await assert.rejects(run("write_file", { path: "node_modules/x.js", content: "x" }), /tidak diizinkan/);
    const found = await run("search", { query: "rahasia" });
    assert.equal(found, "Tidak ada hasil.");
  });

  it("edit_file mewajibkan teks yang unik", async () => {
    fs.writeFileSync(path.join(root, "src", "b.ts"), "x\nx\n");
    const ctx = makeContext("auto");
    const edit = agentTools.find((t) => t.spec.name === "edit_file")!;
    await assert.rejects(edit.run({ path: "src/b.ts", old_text: "x", new_text: "y" }, ctx), /2 kali/);
    await assert.rejects(edit.run({ path: "src/b.ts", old_text: "zzz", new_text: "y" }, ctx), /tidak ditemukan/);
    assert.equal(await edit.run({ path: "src/a.ts", old_text: "= 1", new_text: "= 2" }, ctx), "Diubah: src/a.ts");
    assert.equal(fs.readFileSync(path.join(root, "src", "a.ts"), "utf8"), "export const a = 2;\n");
  });
});

describe("persetujuan", () => {
  const write = (ctx: ToolContext, p: string) => agentTools.find((t) => t.spec.name === "write_file")!.run({ path: p, content: "x" }, ctx);

  it("mode ask: setiap perubahan ditanyakan; jawaban tidak -> tidak ditulis", async () => {
    answer = "no";
    const ctx = makeContext("ask");
    await assert.rejects(write(ctx, "src/new.ts"), /tidak menyetujui/);
    assert.equal(fs.existsSync(path.join(root, "src", "new.ts")), false);
    assert.equal(asked.length, 1);
    assert.equal(asked[0]!.risk, "write");
  });

  it("jawaban 'semua' -> perubahan biasa berikutnya tidak ditanyakan lagi, tapi aksi krusial tetap ditanyakan", async () => {
    answer = "all";
    const ctx = makeContext("ask");
    await write(ctx, "src/one.ts");
    await write(ctx, "src/two.ts");
    assert.equal(asked.length, 1);
    answer = "yes";
    await write(ctx, "package.json");
    assert.equal(asked.length, 2);
    assert.equal(asked[1]!.risk, "critical");
  });

  it("mode auto: perubahan biasa langsung; krusial (hapus, config, install) tetap ditanyakan", async () => {
    answer = "no";
    const ctx = makeContext("auto");
    await write(ctx, "src/app.ts");
    assert.equal(asked.length, 0);
    await assert.rejects(write(ctx, "zentara.config.mjs"), /tidak menyetujui/);
    await assert.rejects(agentTools.find((t) => t.spec.name === "delete_file")!.run({ path: "src/a.ts" }, ctx), /tidak menyetujui/);
    await assert.rejects(agentTools.find((t) => t.spec.name === "install_package")!.run({ name: "zod" }, ctx), /tidak menyetujui/);
    assert.deepEqual(asked.map((a) => a.risk), ["critical", "critical", "critical"]);
    assert.ok(fs.existsSync(path.join(root, "src", "a.ts")));
  });

  it("dry-run tidak mengubah file", async () => {
    const ctx = makeContext("auto", true);
    assert.match(await write(ctx, "src/dry.ts"), /dry-run/);
    assert.equal(fs.existsSync(path.join(root, "src", "dry.ts")), false);
  });
});

describe("tool database", () => {
  const db = (ctx: ToolContext, action: string) => agentTools.find((t) => t.spec.name === "database")!.run({ action }, ctx);

  it("generate = perubahan biasa (bisa di-undo); migrate & seed = krusial", async () => {
    answer = "no";
    fs.mkdirSync(path.join(root, "drizzle", "meta"), { recursive: true });
    fs.writeFileSync(path.join(root, "drizzle", "0000_init.sql"), "CREATE TABLE a (id integer);");
    fs.writeFileSync(path.join(root, "drizzle", "meta", "_journal.json"), '{"entries":["0000"]}');
    const ctx = makeContext("auto");
    assert.match(await db(ctx, "generate"), /BERHASIL/);
    assert.deepEqual(ctx.journal.changedFiles.sort(), ["drizzle/0001_baru.sql", "drizzle/meta/_journal.json"]);
    await assert.rejects(db(ctx, "migrate"), /tidak menyetujui/);
    await assert.rejects(db(ctx, "seed"), /tidak menyetujui/);
    assert.deepEqual(dbCalls, ["generate"]);
    assert.deepEqual(asked.map((a) => a.risk), ["critical", "critical"]);
    undoLatest(root);
    assert.equal(fs.existsSync(path.join(root, "drizzle", "0001_baru.sql")), false);
    assert.equal(fs.readFileSync(path.join(root, "drizzle", "meta", "_journal.json"), "utf8"), '{"entries":["0000"]}');
    assert.ok(fs.existsSync(path.join(root, "drizzle", "0000_init.sql")));
  });

  it("file database tidak bisa dibaca/ditulis AI; migrasi manual = krusial", async () => {
    fs.writeFileSync(path.join(root, "app.db"), "SQLite format 3");
    const ctx = makeContext("auto");
    const run = (name: string, input: Record<string, unknown>) => agentTools.find((t) => t.spec.name === name)!.run(input, ctx);
    await assert.rejects(run("read_file", { path: "app.db" }), /rahasia/);
    await assert.rejects(run("write_file", { path: "data/app.db", content: "x" }), /tidak diizinkan/);
    answer = "no";
    await assert.rejects(run("write_file", { path: "drizzle/0002_manual.sql", content: "x" }), /tidak menyetujui/);
    assert.equal(asked.at(-1)!.risk, "critical");
  });
});

describe("undo", () => {
  it("mengembalikan file yang diubah dan menghapus file yang dibuat", async () => {
    const ctx = makeContext("auto");
    const run = (name: string, input: Record<string, unknown>) => agentTools.find((t) => t.spec.name === name)!.run(input, ctx);
    await run("edit_file", { path: "src/a.ts", old_text: "= 1", new_text: "= 99" });
    await run("write_file", { path: "src/baru.ts", content: "baru" });
    await run("edit_file", { path: "src/a.ts", old_text: "= 99", new_text: "= 100" });
    const preview = latestJournal(root)!;
    assert.deepEqual(preview.entries, [
      { path: "src/a.ts", action: "restore" },
      { path: "src/baru.ts", action: "delete" },
    ]);
    undoLatest(root);
    assert.equal(fs.readFileSync(path.join(root, "src", "a.ts"), "utf8"), "export const a = 1;\n");
    assert.equal(fs.existsSync(path.join(root, "src", "baru.ts")), false);
    assert.equal(latestJournal(root), undefined);
  });
});

describe("Agent", () => {
  it("menjalankan tool, memverifikasi, dan meminta perbaikan bila verifikasi gagal", async () => {
    const provider = new ScriptedProvider("claude", [
      tool("1", "write_file", { path: "src/app/routes/api/produk.ts", content: "export const GET = () => [];" }),
      { text: "Selesai membuat route.", toolCalls: [], stop: "end" },
      tool("2", "edit_file", { path: "src/app/routes/api/produk.ts", old_text: "[]", new_text: "[{ id: 1 }]" }),
      { text: "Sudah diperbaiki.", toolCalls: [], stop: "end" },
    ]);
    let verifications = 0;
    const agent = new Agent({
      chain: new ProviderChain([provider]),
      tools: agentTools,
      context: makeContext("auto"),
      system: "sys",
      ui: quietUI,
      verify: async () => (++verifications === 1 ? { ok: false, output: "error TS2322" } : { ok: true, output: "ok" }),
    });
    const result = await agent.run("buat API produk");
    assert.equal(result.status, "done");
    assert.equal(verifications, 2);
    assert.deepEqual(result.changedFiles, ["src/app/routes/api/produk.ts"]);
    assert.equal(fs.readFileSync(path.join(root, "src/app/routes/api/produk.ts"), "utf8"), "export const GET = () => [{ id: 1 }];");
    // Pesan perbaikan berisi output verifikasi.
    const fixPrompt = provider.calls[2]!.messages.at(-1)!;
    assert.ok(fixPrompt.role === "user" && fixPrompt.text.includes("error TS2322"));
  });

  it("pindah ke provider berikutnya saat kredit habis tanpa kehilangan percakapan", async () => {
    const claude = new ScriptedProvider("claude", [tool("1", "read_file", { path: "src/a.ts" })], 1);
    const omni = new ScriptedProvider("omniroute", [{ text: "Isinya a = 1.", toolCalls: [], stop: "end" }]);
    const fallbacks: string[] = [];
    const chain = new ProviderChain([claude, omni], { onFallback: (from, reason, to) => fallbacks.push(`${from.name}->${to?.name}: ${reason}`) });
    const agent = new Agent({ chain, tools: agentTools, context: makeContext(), system: "sys", ui: quietUI });
    const result = await agent.run("apa isi a.ts?");
    assert.equal(result.status, "done");
    assert.deepEqual(result.providersUsed, ["claude", "omniroute"]);
    assert.deepEqual(fallbacks, ["claude->omniroute: kredit habis (402)"]);
    const sent = omni.calls[0]!.messages;
    assert.equal(sent.length, 3);
    assert.ok(sent[2]!.role === "tool_results" && sent[2]!.results[0]!.content.includes("export const a = 1"));
  });

  it("semua provider habis -> error yang menjelaskan alasannya", async () => {
    const chain = new ProviderChain([new ScriptedProvider("a", [], 0), new ScriptedProvider("b", [], 0)]);
    const agent = new Agent({ chain, tools: agentTools, context: makeContext(), system: "s", ui: quietUI });
    await assert.rejects(agent.run("x"), /Semua provider AI tidak tersedia[\s\S]*a: kredit habis[\s\S]*b: kredit habis/);
  });

  it("tool tidak dikenal / input rusak dikembalikan sebagai error ke model, bukan crash", async () => {
    const provider = new ScriptedProvider("p", [
      tool("1", "hapus_semua", {}),
      tool("2", "read_file", { __invalid_json__: "{path:" }),
    ]);
    const agent = new Agent({ chain: new ProviderChain([provider]), tools: agentTools, context: makeContext(), system: "s", ui: quietUI });
    assert.equal((await agent.run("x")).status, "done");
    const r1 = provider.calls[1]!.messages.at(-1)!;
    const r2 = provider.calls[2]!.messages.at(-1)!;
    assert.ok(r1.role === "tool_results" && r1.results[0]!.isError && /tidak dikenal/.test(r1.results[0]!.content));
    assert.ok(r2.role === "tool_results" && r2.results[0]!.isError);
  });

  it("berhenti di batas langkah", async () => {
    const loop = Array.from({ length: 10 }, (_, i) => tool(String(i), "list_files", {}));
    const agent = new Agent({ chain: new ProviderChain([new ScriptedProvider("p", loop)]), tools: agentTools, context: makeContext(), system: "s", ui: quietUI, maxSteps: 3 });
    assert.equal((await agent.run("x")).status, "incomplete");
  });
});

describe("menghentikan AI (Esc / tombol Berhenti)", () => {
  it("abort saat menunggu model -> interrupted, percakapan tetap bisa dilanjutkan", async () => {
    let calls = 0;
    const provider: ModelProvider = {
      name: "lambat",
      describe: () => "lambat",
      check: async () => "ok",
      complete: (req) => {
        calls++;
        if (calls > 1) return Promise.resolve({ text: "lanjut", toolCalls: [], stop: "end" });
        return new Promise<ModelTurn>((_resolve, reject) => req.signal?.addEventListener("abort", () => reject(new AbortedError())));
      },
    };
    const agent = new Agent({ chain: new ProviderChain([provider]), tools: agentTools, context: makeContext(), system: "s", ui: quietUI });
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 20);
    const first = await agent.run("tugas panjang", { signal: controller.signal });
    assert.equal(first.status, "interrupted");
    const second = await agent.run("tugas berikutnya");
    assert.equal(second.status, "done");
  });

  it("abort saat menunggu persetujuan -> file tidak ditulis, semua tool call dijawab", async () => {
    const controller = new AbortController();
    const context = makeContext();
    context.approval = new ApprovalPolicy("ask", (_a, signal) => new Promise((resolve) => signal?.addEventListener("abort", () => resolve("no"))));
    const provider = new ScriptedProvider("p", [
      { text: "", toolCalls: [{ id: "a", name: "write_file", input: { path: "src/x.ts", content: "1" } }, { id: "b", name: "read_file", input: { path: "src/a.ts" } }], stop: "tool_use" },
    ]);
    const agent = new Agent({ chain: new ProviderChain([provider]), tools: agentTools, context, system: "s", ui: quietUI });
    setTimeout(() => controller.abort(), 20);
    const result = await agent.run("tulis", { signal: controller.signal });
    assert.equal(result.status, "interrupted");
    assert.ok(!fs.existsSync(path.join(root, "src/x.ts")));
    await agent.run("lagi");
    const toolResults = provider.calls[1]!.messages.find((m) => m.role === "tool_results");
    assert.equal(toolResults?.role === "tool_results" && toolResults.results.length, 2);
  });
});

describe("resolveAiConfig", () => {
  it("default: claude -> omniroute -> ollama, mode ask", () => {
    const c = resolveAiConfig(undefined, {});
    assert.deepEqual(c.providers.map((p) => p.name), ["claude", "omniroute", "ollama"]);
    assert.equal(c.mode, "ask");
  });
  it("env dan validasi", () => {
    assert.equal(resolveAiConfig(undefined, { ZENTARA_AI_MODE: "auto" }).mode, "auto");
    assert.throws(() => resolveAiConfig({ mode: "yolo" as "ask" }, {}), /mode tidak valid/);
    assert.throws(() => resolveAiConfig({ providers: [{ type: "openai-compatible", name: "x", baseUrl: "ftp://a" }] }, {}), /baseUrl/);
    assert.throws(
      () => resolveAiConfig({ providers: [{ type: "anthropic" }, { type: "anthropic", name: "claude" }] }, {}),
      /duplikat/,
    );
  });
});
