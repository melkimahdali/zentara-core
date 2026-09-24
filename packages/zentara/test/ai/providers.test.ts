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

describe("OpenAI-compatible: model baru & rate limit", () => {
  const ok = { status: 200, body: { choices: [{ message: { content: "siap" }, finish_reason: "stop" }] } };

  it("400 'reasoning_effort' (gpt-5.x dengan tools) -> ulang dengan reasoning_effort none dan diingat", async () => {
    const server = await fakeServer(({ body }) =>
      body.reasoning_effort === "none"
        ? ok
        : { status: 400, body: { error: { message: "Function tools with reasoning_effort are not supported for gpt-5.6-sol in /v1/chat/completions. To use function tools, use /v1/responses or set reasoning_effort to 'none'.", param: "reasoning_effort" } } },
    );
    const p = new OpenAICompatibleProvider({ name: "openai", baseUrl: `${server.base}/v1`, model: "gpt-5.6-sol", apiKey: "k" });
    assert.equal((await p.complete({ system: "s", messages: history, tools })).text, "siap");
    assert.equal((await p.complete({ system: "s", messages: history, tools })).text, "siap");
    assert.deepEqual(server.requests.map((r) => r.body.reasoning_effort), [undefined, "none", "none"]);
    await server.close();
  });

  it("429 sesaat (TPM) ditunggu lalu dicoba ulang; kuota habis langsung pindah provider", async () => {
    let calls = 0;
    const server = await fakeServer(() =>
      ++calls === 1 ? { status: 429, body: { error: { message: "Rate limit reached for gpt-4.1 on tokens per min (TPM). Please try again in 0.05s.", type: "tokens" } } } : ok,
    );
    const p = new OpenAICompatibleProvider({ name: "openai", baseUrl: `${server.base}/v1`, model: "m", apiKey: "k" });
    assert.equal((await p.complete({ system: "s", messages: history, tools })).text, "siap");
    assert.equal(calls, 2);
    await server.close();

    const quota = await fakeServer(() => ({ status: 429, body: { error: { message: "You exceeded your current quota", type: "insufficient_quota" } } }));
    const q = new OpenAICompatibleProvider({ name: "openai", baseUrl: `${quota.base}/v1`, model: "m", apiKey: "k" });
    await assert.rejects(q.complete({ system: "s", messages: history, tools }), ProviderUnavailableError);
    assert.equal(quota.requests.length, 1);
    await quota.close();
  });
});

/** Server palsu yang menjawab dengan Server-Sent Events (streaming). */
async function sseServer(events: (body: any) => { status?: number; chunks: string[] }) {
  const requests: any[] = [];
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", async () => {
      const body = raw ? JSON.parse(raw) : undefined;
      requests.push(body);
      const { status = 200, chunks } = events(body);
      if (status !== 200) return res.writeHead(status, { "Content-Type": "application/json" }).end(chunks.join(""));
      res.writeHead(200, { "Content-Type": "text/event-stream" });
      for (const chunk of chunks) {
        res.write(chunk);
        await new Promise((r) => setTimeout(r, 2));
      }
      res.end();
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, requests, close: () => new Promise<void>((r) => server.close(() => r())) };
}

const data = (obj: unknown) => `data: ${JSON.stringify(obj)}\n\n`;

describe("streaming", () => {
  it("OpenAI-compatible: teks dialirkan per potongan dan tool call dirakit dari delta", async () => {
    const server = await sseServer(() => ({
      chunks: [
        data({ model: "m", choices: [{ delta: { content: "Saya " } }] }),
        // Satu event bisa terpotong di tengah jalan oleh jaringan.
        data({ choices: [{ delta: { content: "baca dulu." } }] }).slice(0, 20),
        data({ choices: [{ delta: { content: "baca dulu." } }] }).slice(20),
        data({ choices: [{ delta: { tool_calls: [{ index: 0, id: "c1", function: { name: "read_file", arguments: '{"pa' } }] } }] }),
        data({ choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'th":"a.ts"}' } }] }, finish_reason: "tool_calls" }] }),
        "data: [DONE]\n\n",
      ],
    }));
    const p = new OpenAICompatibleProvider({ name: "local", baseUrl: `${server.base}/v1`, model: "m" });
    const deltas: string[] = [];
    const turn = await p.complete({ system: "s", messages: history, tools, onText: (d) => deltas.push(d) });
    assert.deepEqual(deltas, ["Saya ", "baca dulu."]);
    assert.equal(turn.text, "Saya baca dulu.");
    assert.deepEqual(turn.toolCalls, [{ id: "c1", name: "read_file", input: { path: "a.ts" } }]);
    assert.equal(turn.stop, "tool_use");
    assert.equal(server.requests[0].stream, true);
    await server.close();
  });

  it("OpenAI-compatible: tool call tanpa index dipisah lewat id", async () => {
    const server = await sseServer(() => ({
      chunks: [
        data({ choices: [{ delta: { tool_calls: [{ id: "a", function: { name: "read_file", arguments: '{"path":"a.ts"}' } }] } }] }),
        data({ choices: [{ delta: { tool_calls: [{ id: "b", function: { name: "read_file", arguments: '{"path":"b.ts"}' } }] } }] }),
        data({ choices: [{ delta: {}, finish_reason: "tool_calls" }] }),
      ],
    }));
    const p = new OpenAICompatibleProvider({ name: "gemini", baseUrl: `${server.base}/v1`, model: "m" });
    const turn = await p.complete({ system: "s", messages: history, tools, onText: () => {} });
    assert.deepEqual(turn.toolCalls.map((c) => [c.id, (c.input as { path: string }).path]), [["a", "a.ts"], ["b", "b.ts"]]);
    await server.close();
  });

  it("OpenAI-compatible: server yang menolak stream -> diulang tanpa stream dan diingat", async () => {
    const json = await fakeServer(({ body }) =>
      body.stream ? { status: 400, body: { error: { message: "stream is not supported" } } } : { status: 200, body: { choices: [{ message: { content: "utuh" }, finish_reason: "stop" }] } },
    );
    const p = new OpenAICompatibleProvider({ name: "local", baseUrl: `${json.base}/v1`, model: "m" });
    const deltas: string[] = [];
    assert.equal((await p.complete({ system: "s", messages: history, tools, onText: (d) => deltas.push(d) })).text, "utuh");
    assert.equal((await p.complete({ system: "s", messages: history, tools, onText: (d) => deltas.push(d) })).text, "utuh");
    assert.deepEqual(json.requests.map((r) => Boolean(r.body.stream)), [true, false, false]);
    await json.close();
  });

  it("OpenAI-compatible: tanpa tools tidak mengirim daftar tools kosong", async () => {
    const json = await fakeServer(() => ({ status: 200, body: { choices: [{ message: { content: "ringkas" }, finish_reason: "stop" }] } }));
    const p = new OpenAICompatibleProvider({ name: "local", baseUrl: `${json.base}/v1`, model: "m" });
    await p.complete({ system: "s", messages: history, tools: [] });
    assert.equal("tools" in json.requests[0]!.body, false);
    await json.close();
  });

  it("Claude: teks dialirkan lewat SSE dan hasil akhir tetap utuh", async () => {
    const ev = (type: string, obj: object) => `event: ${type}\ndata: ${JSON.stringify({ type, ...obj })}\n\n`;
    const server = await sseServer(() => ({
      chunks: [
        ev("message_start", { message: { id: "m1", type: "message", role: "assistant", model: "claude-opus-5", content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 5, output_tokens: 0 } } }),
        ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } }),
        ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: "Halo " } }),
        ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: "dunia" } }),
        ev("content_block_stop", { index: 0 }),
        ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 3 } }),
        ev("message_stop", {}),
      ],
    }));
    const p = new AnthropicProvider({ apiKey: "k", baseURL: server.base, maxRetries: 0 });
    const deltas: string[] = [];
    const turn = await p.complete({ system: "s", messages: history, tools, onText: (d) => deltas.push(d) });
    assert.deepEqual(deltas, ["Halo ", "dunia"]);
    assert.equal(turn.text, "Halo dunia");
    assert.equal(turn.stop, "end");
    assert.equal(server.requests[0].stream, true);
    await server.close();
  });
});
