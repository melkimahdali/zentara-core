import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, it } from "node:test";
import { AnthropicProvider } from "../../src/ai/providers/anthropic.js";
import { OpenAICompatibleProvider } from "../../src/ai/providers/openai-compatible.js";
import { ProviderUnavailableError, type ChatMessage, type ToolSpec } from "../../src/ai/types.js";

type Handler = (req: { url: string; body: any; headers: http.IncomingHttpHeaders }) => { status: number; body: unknown };

/** Server HTTP palsu yang meniru API provider. */
async function fakeServer(handler: Handler) {
  const requests: { url: string; body: any; headers: http.IncomingHttpHeaders }[] = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const entry = { url: req.url ?? "", body: raw ? JSON.parse(raw) : undefined, headers: req.headers };
      requests.push(entry);
      const { status, body } = handler(entry);
      res.writeHead(status, { "Content-Type": "application/json" }).end(JSON.stringify(body));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, requests, close: () => new Promise<void>((r) => server.close(() => r())) };
}

const tools: ToolSpec[] = [
  { name: "read_file", description: "baca", inputSchema: { type: "object", properties: { path: { type: "string" } }, required: ["path"] } },
];

const history: ChatMessage[] = [
  { role: "user", text: "baca README" },
  { role: "assistant", text: "Saya baca dulu.", toolCalls: [{ id: "call.1", name: "read_file", input: { path: "README.md" } }] },
  { role: "tool_results", results: [{ id: "call.1", content: "# Halo" }] },
];

describe("AnthropicProvider", () => {
  let server: Awaited<ReturnType<typeof fakeServer>>;
  let mode: "tool" | "billing" | "bad" | "overloaded" = "tool";
  before(async () => {
    server = await fakeServer(() => {
      if (mode === "billing") return { status: 402, body: { type: "error", error: { type: "billing_error", message: "Your credit balance is too low" } } };
      if (mode === "overloaded") return { status: 529, body: { type: "error", error: { type: "overloaded_error", message: "Overloaded" } } };
      if (mode === "bad") return { status: 400, body: { type: "error", error: { type: "invalid_request_error", message: "bad" } } };
      return {
        status: 200,
        body: {
          id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5", stop_reason: "tool_use", stop_sequence: null,
          content: [
            { type: "thinking", thinking: "", signature: "sig" },
            { type: "text", text: "Membaca file." },
            { type: "tool_use", id: "toolu_1", name: "read_file", input: { path: "a.ts" } },
          ],
          usage: { input_tokens: 10, output_tokens: 5 },
        },
      };
    });
  });
  after(() => server.close());

  const provider = () => new AnthropicProvider({ apiKey: "test-key", baseURL: server.base, maxRetries: 0 });

  it("menerjemahkan request & respons tool_use", async () => {
    mode = "tool";
    const turn = await provider().complete({ system: "sys", messages: history, tools });
    assert.equal(turn.stop, "tool_use");
    assert.equal(turn.text, "Membaca file.");
    assert.deepEqual(turn.toolCalls, [{ id: "toolu_1", name: "read_file", input: { path: "a.ts" } }]);
    assert.equal(turn.native?.provider, "claude");

    const sent = server.requests.at(-1)!;
    assert.equal(sent.body.model, "claude-opus-5");
    assert.equal(sent.body.fallbacks, "default");
    assert.deepEqual(sent.body.cache_control, { type: "ephemeral" });
    assert.match(String(sent.headers["anthropic-beta"]), /server-side-fallback-2026-07-01/);
    assert.equal(sent.body.tools[0].input_schema.type, "object");
    // ID dari provider lain disanitasi, dan hasil tool dikirim sebagai tool_result.
    assert.equal(sent.body.messages[1].content[1].id, "call_1");
    assert.equal(sent.body.messages[2].content[0].type, "tool_result");
    assert.equal(sent.body.messages[2].content[0].tool_use_id, "call_1");
  });

  it("mengirim ulang konten asli (termasuk thinking) ke provider yang sama", async () => {
    mode = "tool";
    const p = provider();
    const turn = await p.complete({ system: "s", messages: [{ role: "user", text: "hai" }], tools });
    await p.complete({
      system: "s",
      messages: [
        { role: "user", text: "hai" },
        { role: "assistant", text: turn.text, toolCalls: turn.toolCalls, native: turn.native },
      ],
      tools,
    });
    assert.equal(server.requests.at(-1)!.body.messages[1].content[0].type, "thinking");
  });

  it("402 billing -> ProviderUnavailableError (kredit habis)", async () => {
    mode = "billing";
    await assert.rejects(provider().complete({ system: "s", messages: history, tools }), (err: unknown) => {
      assert.ok(err instanceof ProviderUnavailableError);
      assert.match(err.reason, /kredit habis/);
      return true;
    });
  });

  it("529 overloaded -> tidak tersedia; 400 -> error biasa (bukan fallback)", async () => {
    mode = "overloaded";
    await assert.rejects(provider().complete({ system: "s", messages: history, tools }), ProviderUnavailableError);
    mode = "bad";
    await assert.rejects(provider().complete({ system: "s", messages: history, tools }), (err: unknown) => !(err instanceof ProviderUnavailableError));
  });

  it("tanpa kredensial -> tidak tersedia", async () => {
    const saved = { key: process.env.ANTHROPIC_API_KEY, token: process.env.ANTHROPIC_AUTH_TOKEN };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_AUTH_TOKEN;
    try {
      const p = new AnthropicProvider({ baseURL: server.base, maxRetries: 0 });
      await assert.rejects(p.complete({ system: "s", messages: history, tools }), (err: unknown) => {
        assert.ok(err instanceof ProviderUnavailableError);
        assert.match(err.reason, /ANTHROPIC_API_KEY/);
        return true;
      });
    } finally {
      if (saved.key !== undefined) process.env.ANTHROPIC_API_KEY = saved.key;
      if (saved.token !== undefined) process.env.ANTHROPIC_AUTH_TOKEN = saved.token;
    }
  });
});

describe("OpenAICompatibleProvider", () => {
  let server: Awaited<ReturnType<typeof fakeServer>>;
  let status = 200;
  let rejectParam: string | undefined;
  before(async () => {
    server = await fakeServer(({ url, body }) => {
      if (url === "/v1/models") return { status: 200, body: { data: [{ id: "free/kimi-k2" }, { id: "other" }] } };
      if (rejectParam && body && rejectParam in body) {
        return { status: 400, body: { error: { message: `Unsupported parameter: '${rejectParam}'. Use 'max_completion_tokens' instead.` } } };
      }
      if (status !== 200) return { status, body: { error: { message: "quota exceeded" } } };
      return {
        status: 200,
        body: {
          model: "free/kimi-k2",
          choices: [{
            finish_reason: "tool_calls",
            message: { content: null, tool_calls: [{ id: "call_9", type: "function", function: { name: "read_file", arguments: '{"path":"b.ts"}' } }] },
          }],
          usage: { prompt_tokens: 3, completion_tokens: 4 },
        },
      };
    });
  });
  after(() => server.close());

  it("memilih model otomatis dari /models dan menerjemahkan tool call", async () => {
    status = 200;
    const p = new OpenAICompatibleProvider({ name: "omniroute", baseUrl: `${server.base}/v1/`, apiKey: "k" });
    const turn = await p.complete({ system: "sys", messages: history, tools });
    assert.equal(turn.stop, "tool_use");
    assert.deepEqual(turn.toolCalls, [{ id: "call_9", name: "read_file", input: { path: "b.ts" } }]);
    const sent = server.requests.at(-1)!;
    assert.equal(sent.url, "/v1/chat/completions");
    assert.equal(sent.body.model, "free/kimi-k2");
    assert.equal(sent.headers.authorization, "Bearer k");
    assert.equal(sent.body.messages[0].role, "system");
    assert.equal(sent.body.messages[2].tool_calls[0].function.arguments, '{"path":"README.md"}');
    assert.deepEqual(sent.body.messages[3], { role: "tool", tool_call_id: "call_1", content: "# Halo" });
    assert.equal(sent.body.tools[0].function.name, "read_file");
  });

  it("tokenParam: OpenAI memakai max_completion_tokens", async () => {
    status = 200;
    const p = new OpenAICompatibleProvider({ name: "openai", baseUrl: `${server.base}/v1`, model: "m", tokenParam: "max_completion_tokens" });
    await p.complete({ system: "", messages: history, tools });
    const body = server.requests.at(-1)!.body;
    assert.equal(body.max_completion_tokens, 16000);
    assert.equal("max_tokens" in body, false);
  });

  it("server menolak parameter token -> coba sekali dengan parameter lain lalu diingat", async () => {
    status = 200;
    rejectParam = "max_tokens";
    const p = new OpenAICompatibleProvider({ name: "x", baseUrl: `${server.base}/v1`, model: "m" });
    const before = server.requests.length;
    const turn = await p.complete({ system: "", messages: history, tools });
    assert.equal(turn.toolCalls.length, 1);
    const sent = server.requests.slice(before).map((r) => ("max_tokens" in r.body ? "max_tokens" : "max_completion_tokens"));
    assert.deepEqual(sent, ["max_tokens", "max_completion_tokens"]);
    await p.complete({ system: "", messages: history, tools });
    assert.ok("max_completion_tokens" in server.requests.at(-1)!.body, "pilihan diingat");
    rejectParam = undefined;
  });

  it("400 lain tidak diulang dan bukan fallback", async () => {
    status = 400;
    const p = new OpenAICompatibleProvider({ name: "x", baseUrl: `${server.base}/v1`, model: "m" });
    const before = server.requests.length;
    await assert.rejects(p.complete({ system: "", messages: history, tools }), (err: unknown) => !(err instanceof ProviderUnavailableError));
    assert.equal(server.requests.length - before, 1);
    status = 200;
  });

  it("check: model yang tidak ada di akun dilaporkan", async () => {
    status = 200;
    assert.match(await new OpenAICompatibleProvider({ name: "x", baseUrl: `${server.base}/v1`, model: "free/kimi-k2" }).check(), /siap/);
    assert.match(await new OpenAICompatibleProvider({ name: "x", baseUrl: `${server.base}/v1`, model: "tidak-ada" }).check(), /tidak ada di daftar/);
  });

  it("429/402 -> tidak tersedia; server mati -> tidak tersedia", async () => {
    for (const s of [429, 402, 503]) {
      status = s;
      await assert.rejects(
        new OpenAICompatibleProvider({ name: "x", baseUrl: `${server.base}/v1`, model: "m" }).complete({ system: "", messages: history, tools }),
        ProviderUnavailableError,
      );
    }
    await assert.rejects(
      new OpenAICompatibleProvider({ name: "x", baseUrl: "http://127.0.0.1:1/v1", model: "m" }).complete({ system: "", messages: history, tools }),
      ProviderUnavailableError,
    );
  });
});
