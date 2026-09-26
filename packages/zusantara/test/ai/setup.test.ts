import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import { defaultProviders, resolveAiConfig } from "../../src/ai/config.js";
import { isEnvIgnored, suggestModels, upsertEnvFile } from "../../src/ai/setup.js";

describe("provider dari .env", () => {
  it("tanpa API key: OmniRoute (gratis) lebih dulu, lalu claude & ollama", () => {
    assert.deepEqual(defaultProviders({}).map((p) => p.name), ["omniroute", "claude", "ollama"]);
  });

  it("API key terisi -> provider ikut, sesuai urutan default", () => {
    const providers = defaultProviders({ OPENAI_API_KEY: "sk-x", GROQ_API_KEY: "gsk-x" });
    assert.deepEqual(providers.map((p) => p.name), ["omniroute", "claude", "openai", "groq", "ollama"]);
    const openai = providers.find((p) => p.name === "openai")!;
    assert.ok(openai.type === "openai-compatible");
    assert.equal(openai.baseUrl, "https://api.openai.com/v1");
    assert.equal(openai.apiKey, "sk-x");
    assert.equal(openai.model, "gpt-4.1");
    assert.equal(openai.tokenParam, "max_completion_tokens");
  });

  it("ZUSANTARA_AI_ORDER, model & alamat dari env", () => {
    const providers = defaultProviders({
      OPENAI_API_KEY: "sk-x",
      OPENAI_MODEL: "gpt-x",
      OPENAI_BASE_URL: "http://proxy.local/v1",
      ZUSANTARA_AI_ORDER: "openai, ollama",
    });
    assert.deepEqual(providers.map((p) => p.name), ["openai", "ollama", "omniroute", "claude"]);
    const openai = providers[0]!;
    assert.ok(openai.type === "openai-compatible");
    assert.equal(openai.model, "gpt-x");
    assert.equal(openai.baseUrl, "http://proxy.local/v1");
  });

  it("provider tak dikenal di ZUSANTARA_AI_ORDER -> error jelas", () => {
    assert.throws(() => defaultProviders({ ZUSANTARA_AI_ORDER: "gpt" }), /tidak dikenal "gpt"/);
  });

  it("ai.providers di config tetap menang atas env", () => {
    const config = resolveAiConfig({ providers: [{ type: "openai-compatible", name: "x", baseUrl: "http://a/v1" }] }, { OPENAI_API_KEY: "k" });
    assert.deepEqual(config.providers.map((p) => p.name), ["x"]);
  });
});

describe("helper ai:setup", () => {
  it("upsertEnvFile memperbarui/menambah tanpa mengubah baris lain", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-env-"));
    const file = path.join(dir, ".env");
    fs.writeFileSync(file, "# komentar\nPORT=3000\nOPENAI_MODEL=lama\nSESSION_SECRET=abc\n");
    upsertEnvFile(file, { OPENAI_MODEL: "gpt-4.1", OPENAI_API_KEY: "sk-123", SKIP: undefined, NAMA: "dua kata" });
    assert.equal(
      fs.readFileSync(file, "utf8"),
      '# komentar\nPORT=3000\nOPENAI_MODEL=gpt-4.1\nSESSION_SECRET=abc\nOPENAI_API_KEY=sk-123\nNAMA="dua kata"\n',
    );
    if (process.platform !== "win32") assert.equal(fs.statSync(file).mode & 0o777, 0o600, ".env lama ikut dibatasi");
    upsertEnvFile(path.join(dir, "baru.env"), { A: "1" });
    assert.equal(fs.readFileSync(path.join(dir, "baru.env"), "utf8"), "A=1\n");
    if (process.platform !== "win32") assert.equal(fs.statSync(path.join(dir, "baru.env")).mode & 0o777, 0o600);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("isEnvIgnored", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-gi-"));
    assert.equal(isEnvIgnored(dir), false);
    fs.writeFileSync(path.join(dir, ".gitignore"), "node_modules/\n.env\n");
    assert.equal(isEnvIgnored(dir), true);
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("suggestModels menyaring model non-chat dan mendahulukan model pilihan", () => {
    const models = ["text-embedding-3-small", "gpt-4o", "whisper-1", "gpt-4.1", "dall-e-3", "o4-mini", "tts-1"];
    assert.deepEqual(suggestModels(models, "gpt-4.1"), ["gpt-4.1", "o4-mini", "gpt-4o"]);
  });

  it("suggestModels: model terbaru dulu (menurut created), model instruct/codex disaring", () => {
    const models = [
      { id: "gpt-3.5-turbo", created: 1677610602 },
      { id: "gpt-3.5-turbo-instruct", created: 1692901427 },
      { id: "gpt-5", created: 1754425777 },
      { id: "gpt-4.1", created: 1744316542 },
      { id: "codex-mini-latest", created: 1746673257 },
    ];
    assert.deepEqual(suggestModels(models), ["gpt-5", "gpt-4.1", "gpt-3.5-turbo"]);
  });
});

describe("OmniRoute sebagai default", () => {
  it("model auto dan alamat lokal bawaan", () => {
    const omni = defaultProviders({})[0]!;
    assert.equal(omni.name, "omniroute");
    assert.ok(omni.type === "openai-compatible");
    assert.equal(omni.baseUrl, "http://localhost:20128/v1");
    assert.equal(omni.model, "auto");
  });
});
