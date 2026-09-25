import { randomBytes, timingSafeEqual } from "node:crypto";
import { t } from "../i18n/index.js";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import type { AgentResult } from "../ai/agent.js";
import type { ApprovalAnswer, PendingAction, Prompter } from "../ai/approval.js";
import type { AiConfig } from "../ai/config.js";
import { undoLatest } from "../ai/journal.js";
import { createAiSession, type AiSession, type SessionUI } from "../ai/session.js";
import { c, summarizeCall } from "../ai/terminal.js";
import type { ToolCall, ToolResult } from "../ai/types.js";
import { ZENTARA_VERSION } from "../core/devpage/theme.js";

/**
 * Server devtools: jembatan antara chat Zentara AI di browser (halaman sambutan & halaman error)
 * dan agen AI yang berjalan di proses `zentara dev` / CLI interaktif.
 *
 * Keamanan (server ini bisa mengubah file proyek):
 * - hanya mendengar di 127.0.0.1, dan menolak Host selain 127.0.0.1/localhost (anti DNS rebinding);
 * - setiap request wajib membawa token acak sesi di header X-Zentara-Token (header kustom juga memaksa
 *   preflight CORS, jadi situs lain tidak bisa mengirim request diam-diam);
 * - CORS hanya untuk origin localhost; aturan AI sama dengan di terminal (.env & file database
 *   tidak bisa diakses, aksi krusial selalu minta persetujuan, perubahan bisa di-undo).
 */
export interface DevtoolsOptions {
  root: string;
  loadConfig: () => Promise<AiConfig>;
  /** Tulis catatan aktivitas ke terminal. */
  log?: (line: string) => void;
  /** Kunci bersama dengan CLI interaktif agar dua tugas AI tidak berjalan bersamaan. */
  lock?: AiLock;
}

export interface AiLock {
  owner: string | undefined;
}

export interface Devtools {
  port: number;
  token: string;
  /** Variabel lingkungan untuk proses server aplikasi agar halamannya bisa menampilkan chat. */
  env: Record<string, string>;
  close(): Promise<void>;
}

type WebEvent = Record<string, unknown> & { type: string };

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;
const MAX_BODY = 64 * 1024;
const MAX_CONTEXT = 20_000;

function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(new Error(t().dev.devtools.bodyTooLarge));
        req.destroy();
      } else chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const text = Buffer.concat(chunks).toString("utf8");
        const data = text ? (JSON.parse(text) as unknown) : {};
        resolve(typeof data === "object" && data !== null && !Array.isArray(data) ? (data as Record<string, unknown>) : {});
      } catch {
        reject(new Error(t().dev.devtools.invalidJson));
      }
    });
    req.on("error", reject);
  });
}

function sameToken(given: string | undefined, token: string): boolean {
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

function toolLabel(call: ToolCall): string {
  return summarizeCall(call).replace(/^(\w+)/, (name) => name.replace(/_/g, " "));
}

export async function startDevtools(options: DevtoolsOptions): Promise<Devtools> {
  const token = randomBytes(24).toString("base64url");
  const log = options.log ?? (() => {});
  const lock = options.lock ?? { owner: undefined };

  let session: AiSession | undefined;
  let emit: (event: WebEvent) => void = () => {};
  let controller: AbortController | undefined;
  const pending = new Map<string, (answer: ApprovalAnswer) => void>();
  let approvalSeq = 0;

  const ui: SessionUI = {
    thinking: () => emit({ type: "thinking" }),
    assistantDelta: (text) => emit({ type: "delta", text }),
    assistant: (text) => emit({ type: "assistant", text }),
    toolStart: (call) => emit({ type: "tool", phase: "start", id: call.id, label: toolLabel(call) }),
    toolEnd: (call: ToolCall, result: ToolResult) => {
      const first = result.content.split("\n")[0] ?? "";
      const writes = /^(write_file|edit_file|delete_file|install_package|database|run_command|zentara)$/.test(call.name);
      emit({ type: "tool", phase: "end", id: call.id, ok: !result.isError, detail: result.isError || writes ? first.slice(0, 200) : "" });
      if (writes && !result.isError) log(c.dim(`  [AI browser] ${first}`));
    },
    info: (text) => emit({ type: "info", text }),
    fallback: (from, reason, to) => emit({ type: "fallback", from, reason, to }),
  };

  const prompter: Prompter = (action: PendingAction, signal?: AbortSignal) =>
    new Promise<ApprovalAnswer>((resolve) => {
      const id = `a${++approvalSeq}`;
      const done = (answer: ApprovalAnswer) => {
        pending.delete(id);
        signal?.removeEventListener("abort", onAbort);
        resolve(answer);
      };
      const onAbort = () => done("no");
      signal?.addEventListener("abort", onAbort, { once: true });
      pending.set(id, done);
      emit({ type: "approval", id, risk: action.risk, summary: action.summary, reason: action.reason, preview: action.preview });
      log(c.dim(t().dev.devtools.waitingBrowser(action.summary)));
    });

  async function getSession(): Promise<AiSession> {
    session ??= createAiSession({ root: options.root, config: await options.loadConfig(), ui, prompter });
    return session;
  }

  function json(res: ServerResponse, status: number, data: unknown): void {
    const body = JSON.stringify(data);
    res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
    res.end(body);
  }

  async function chat(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const body = await readBody(req);
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const context = typeof body.context === "string" ? body.context.slice(0, MAX_CONTEXT) : "";
    if (!message) return json(res, 400, { error: t().dev.devtools.emptyMessage });
    if (lock.owner) return json(res, 409, { error: t().dev.devtools.busy(lock.owner === "terminal" ? t().host.terminal : lock.owner) });

    let current: AiSession;
    try {
      current = await getSession();
    } catch (err) {
      return json(res, 500, { error: t().dev.devtools.notReady((err as Error).message) });
    }

    lock.owner = "browser";
    controller = new AbortController();
    const signal = controller.signal;
    let finished = false;
    res.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    emit = (event) => {
      if (!res.writableEnded) res.write(JSON.stringify(event) + "\n");
    };
    // Tab ditutup/dimuat ulang di tengah tugas: hentikan agar tidak ada persetujuan yang menggantung.
    res.on("close", () => {
      if (!finished) controller?.abort();
    });

    log(`${c.cyan("◆ Zentara AI (browser)")} ${message.split("\n")[0]!.slice(0, 100)}`);
    const tag = t().dev.devtools.contextTag;
    const task = context ? `${message}\n\n<${tag}>\n${context}\n</${tag}>` : message;
    try {
      const result: AgentResult = await current.run(task, { signal });
      emit({ type: "done", status: result.status, steps: result.steps, providers: result.providersUsed, changedFiles: result.changedFiles });
      log(c.dim(t().dev.devtools.finished(result.status, result.changedFiles.length)));
    } catch (err) {
      emit({ type: "error", message: (err as Error).message });
      log(c.red(`  [AI browser] ${(err as Error).message}`));
    } finally {
      finished = true;
      lock.owner = undefined;
      controller = undefined;
      emit = () => {};
      res.end();
    }
  }

  const server = http.createServer((req, res) => {
    const port = (server.address() as AddressInfo | null)?.port;
    const host = req.headers.host ?? "";
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) return json(res, 403, { error: t().dev.devtools.hostDenied });
    const origin = req.headers.origin;
    if (origin !== undefined) {
      if (!LOCAL_ORIGIN.test(origin)) return json(res, 403, { error: t().dev.devtools.originDenied });
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Vary", "Origin");
    }
    if (req.method === "OPTIONS") {
      res.writeHead(204, {
        "Access-Control-Allow-Methods": "GET, POST",
        "Access-Control-Allow-Headers": "Content-Type, X-Zentara-Token",
        "Access-Control-Allow-Private-Network": "true",
        "Access-Control-Max-Age": "600",
      });
      return res.end();
    }
    const given = req.headers["x-zentara-token"];
    if (!sameToken(typeof given === "string" ? given : undefined, token)) return json(res, 401, { error: t().dev.devtools.badToken });

    const route = `${req.method} ${(req.url ?? "/").split("?")[0]}`;
    const handle = async () => {
      switch (route) {
        case "GET /status": {
          let providers: string[] = [];
          let mode = "ask";
          try {
            const config = await options.loadConfig();
            providers = config.providers.map((p) => p.name ?? "claude");
            mode = session?.approval.mode ?? config.mode;
          } catch {
            // Config rusak: tampilkan tanpa provider.
          }
          return json(res, 200, { version: ZENTARA_VERSION, busy: Boolean(lock.owner), mode, providers });
        }
        case "POST /chat":
          return chat(req, res);
        case "POST /approve": {
          const body = await readBody(req);
          const answer = body.answer;
          const resolve = typeof body.id === "string" ? pending.get(body.id) : undefined;
          if (!resolve || (answer !== "yes" && answer !== "no" && answer !== "all")) return json(res, 404, { error: t().dev.devtools.approvalMissing });
          resolve(answer);
          log(c.dim(t().dev.devtools.answered(answer === "no")));
          return json(res, 200, { ok: true });
        }
        case "POST /stop":
          controller?.abort();
          return json(res, 200, { ok: true });
        case "POST /undo": {
          if (lock.owner) return json(res, 409, { ok: false, error: t().dev.devtools.waitTask });
          const undone = undoLatest(options.root);
          if (!undone) return json(res, 200, { ok: false, error: t().dev.devtools.nothingToUndo });
          log(c.dim(`  [AI browser] undo: ${undone.entries.map((e) => e.path).join(", ")}`));
          return json(res, 200, { ok: true, files: undone.entries.map((e) => e.path) });
        }
        case "POST /reset":
          if (!lock.owner) session?.reset();
          return json(res, 200, { ok: true });
        default:
          return json(res, 404, { error: t().dev.devtools.notFound });
      }
    };
    handle().catch((err: unknown) => {
      if (!res.headersSent) json(res, 400, { error: (err as Error).message });
      else res.end();
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve());
  });
  const port = (server.address() as AddressInfo).port;

  return {
    port,
    token,
    env: { ZENTARA_DEVTOOLS_PORT: String(port), ZENTARA_DEVTOOLS_TOKEN: token },
    close: () =>
      new Promise<void>((resolve) => {
        controller?.abort();
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}
