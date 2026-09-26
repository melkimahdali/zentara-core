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
import { ZUSANTARA_VERSION } from "../core/devpage/theme.js";
import fs from "node:fs";
import path from "node:path";
import { fetchTraces } from "./requests.js";
import { formatSnapshot, normalizeSnapshot, parseVariant, parseViewport, viewPage, VIEWPORTS, type BrowserView, type PageViewer, type ViewExpect } from "./view.js";

/**
 * Server devtools: jembatan antara chat Zusantara AI di browser (halaman sambutan & halaman error)
 * dan agen AI yang berjalan di proses `zusantara dev` / CLI interaktif.
 *
 * Keamanan (server ini bisa mengubah file proyek):
 * - hanya mendengar di 127.0.0.1, dan menolak Host selain 127.0.0.1/localhost (anti DNS rebinding);
 * - setiap request wajib membawa token acak sesi di header X-Zusantara-Token (header kustom juga memaksa
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
  /** Tab browser yang memuat widget chat: dipakai tool `view_page` untuk melihat halaman. */
  viewer: PageViewer;
  close(): Promise<void>;
}

type WebEvent = Record<string, unknown> & { type: string };

const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/;
const MAX_BODY = 64 * 1024;
const MAX_CONTEXT = 20_000;
/** Snapshot halaman (elemen + teks + error) boleh lebih besar dari pesan biasa. */
const MAX_VIEW_BODY = 512 * 1024;
const VIEW_TIMEOUT_MS = 15_000;

function readBody(req: IncomingMessage, max = MAX_BODY): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > max) {
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

  // Tab browser yang memuat widget (kanal halaman) dan permintaan "lihat halaman" yang menunggu jawaban.
  interface PageTab {
    res: ServerResponse;
    url: string;
    seen: number;
  }
  const pages = new Map<string, PageTab>();
  const views = new Map<string, (view: BrowserView) => void>();
  let pageSeq = 0;
  let viewSeq = 0;
  let appUrl: string | undefined;
  let appStartedAt = 0;
  const appWaiters = new Set<() => void>();
  // Muat ulang otomatis: setelah server aplikasi mulai ulang (file berubah), semua tab dimuat ulang.
  // Ditunda selama tugas AI dari browser berjalan, karena memuat ulang tab akan memutus tugas itu.
  let reloadPending = false;
  let reloadedAt = 0;
  const tabWaiters = new Set<() => void>();

  function broadcastReload(): void {
    if (lock.owner === "browser") {
      reloadPending = true;
      return;
    }
    reloadPending = false;
    if (!pages.size) return;
    reloadedAt = Date.now();
    for (const tab of pages.values()) sendToPage(tab, { type: "reload" });
  }

  /** Setelah muat ulang otomatis, tab butuh sebentar untuk tersambung lagi. */
  function waitForTab(signal?: AbortSignal): Promise<void> {
    if (pages.size || Date.now() - reloadedAt > 5000) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const done = () => {
        clearTimeout(timer);
        tabWaiters.delete(done);
        signal?.removeEventListener("abort", done);
        resolve();
      };
      const timer = setTimeout(done, Math.max(0, 5000 - (Date.now() - reloadedAt)));
      signal?.addEventListener("abort", done, { once: true });
      tabWaiters.add(done);
    });
  }

  function sendToPage(tab: PageTab, event: WebEvent): void {
    if (!tab.res.writableEnded) tab.res.write(JSON.stringify(event) + "\n");
  }

  function touch(id: unknown, url?: unknown): void {
    const tab = typeof id === "string" ? pages.get(id) : undefined;
    if (!tab) return;
    tab.seen = Date.now();
    if (typeof url === "string") tab.url = url.slice(0, 500);
  }

  const viewer: PageViewer = {
    appUrl: () => appUrl,
    waitForApp(after, { timeoutMs = 15_000, signal } = {}) {
      if (appStartedAt === 0 || appStartedAt > after) return Promise.resolve();
      return new Promise<void>((resolve) => {
        const done = () => {
          clearTimeout(timer);
          appWaiters.delete(check);
          signal?.removeEventListener("abort", done);
          resolve();
        };
        const check = () => {
          if (appStartedAt > after) done();
        };
        const timer = setTimeout(done, timeoutMs);
        signal?.addEventListener("abort", done, { once: true });
        appWaiters.add(check);
      });
    },
    async trace(id, { signal } = {}) {
      if (!appUrl) return undefined;
      return (await fetchTraces(appUrl, token, id, signal))[0];
    },
    async traces(id, { signal } = {}) {
      if (!appUrl) return undefined;
      return fetchTraces(appUrl, token, id, signal);
    },
    async browser(path, { selectors, viewport, signal }) {
      await waitForTab(signal);
      const tab = [...pages.values()].sort((a, b) => b.seen - a.seen)[0];
      if (!tab) return Promise.resolve(undefined);
      const id = `v${++viewSeq}`;
      log(c.dim(t().dev.devtools.viewing(path)));
      return new Promise<BrowserView>((resolve) => {
        const done = (view: BrowserView) => {
          clearTimeout(timer);
          views.delete(id);
          signal?.removeEventListener("abort", onAbort);
          resolve(view);
        };
        const onAbort = () => done({ error: "stopped" });
        const timer = setTimeout(() => done({ error: "the browser did not answer in time" }), VIEW_TIMEOUT_MS);
        signal?.addEventListener("abort", onAbort, { once: true });
        views.set(id, done);
        sendToPage(tab, { type: "view", id, path, selectors: (selectors ?? []).slice(0, 20), ...(viewport ? { size: VIEWPORTS[viewport] } : {}) });
      });
    },
  };

  function pageChannel(req: IncomingMessage, res: ServerResponse): void {
    const id = `p${++pageSeq}`;
    const url = new URL(req.url ?? "/", "http://127.0.0.1").searchParams.get("url") ?? "";
    const tab: PageTab = { res, url: url.slice(0, 500), seen: Date.now() };
    pages.set(id, tab);
    res.writeHead(200, { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" });
    sendToPage(tab, { type: "hello", id });
    for (const done of [...tabWaiters]) done();
    const ping = setInterval(() => sendToPage(tab, { type: "ping" }), 25_000);
    res.on("close", () => {
      clearInterval(ping);
      pages.delete(id);
    });
  }

  const ui: SessionUI = {
    thinking: () => emit({ type: "thinking" }),
    assistantDelta: (text) => emit({ type: "delta", text }),
    assistant: (text) => emit({ type: "assistant", text }),
    toolStart: (call) => emit({ type: "tool", phase: "start", id: call.id, label: toolLabel(call) }),
    toolEnd: (call: ToolCall, result: ToolResult) => {
      const first = result.content.split("\n")[0] ?? "";
      const writes = /^(write_file|edit_file|delete_file|install_package|database|run_command|zusantara)$/.test(call.name);
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
    session ??= createAiSession({ root: options.root, config: await options.loadConfig(), ui, prompter, viewer });
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
    let context = typeof body.context === "string" ? body.context.slice(0, MAX_CONTEXT) : "";
    // Widget di halaman aplikasi: tampilan halaman saat ini ikut dikirim ke AI.
    const page = normalizeSnapshot(body.page);
    if (page) context = [context, formatSnapshot(page)].filter(Boolean).join("\n\n").slice(0, MAX_CONTEXT);
    touch(body.pageId);
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

    log(`${c.cyan("◆ Zusantara AI (browser)")} ${message.split("\n")[0]!.slice(0, 100)}`);
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
      if (reloadPending) setTimeout(broadcastReload, 300);
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
        "Access-Control-Allow-Headers": "Content-Type, X-Zusantara-Token",
        "Access-Control-Allow-Private-Network": "true",
        "Access-Control-Max-Age": "600",
      });
      return res.end();
    }
    const given = req.headers["x-zusantara-token"];
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
          return json(res, 200, { version: ZUSANTARA_VERSION, busy: Boolean(lock.owner), mode, providers });
        }
        case "POST /chat":
          return chat(req, res);
        case "GET /page-channel":
          return pageChannel(req, res);
        case "POST /page-focus": {
          const body = await readBody(req);
          touch(body.id, body.url);
          return json(res, 200, { ok: true });
        }
        case "POST /view-result": {
          const body = await readBody(req, MAX_VIEW_BODY);
          const resolve = typeof body.id === "string" ? views.get(body.id) : undefined;
          if (!resolve) return json(res, 404, { error: t().dev.devtools.notFound });
          const snapshot = normalizeSnapshot(body.snapshot);
          resolve(snapshot ? { snapshot } : { error: typeof body.error === "string" ? body.error.slice(0, 200) : "no snapshot" });
          return json(res, 200, { ok: true });
        }
        case "POST /view": {
          // `zusantara view` dari terminal lain: hasil sama dengan tool view_page (browser bila ada tab).
          const body = await readBody(req);
          const raw = (body.expect && typeof body.expect === "object" ? body.expect : {}) as Record<string, unknown>;
          const strings = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").slice(0, 20) : undefined);
          const expect: ViewExpect = {
            text: strings(raw.text),
            selector: strings(raw.selector),
            noConsoleErrors: raw.noConsoleErrors === true,
            noLayoutIssues: raw.noLayoutIssues === true,
            ...(typeof raw.minScore === "number" && Number.isFinite(raw.minScore) ? { minScore: raw.minScore } : {}),
          };
          const fallbackBase = typeof body.base === "string" && LOCAL_ORIGIN.test(body.base) ? body.base : "http://localhost:3000";
          const result = await viewPage(
            { path: typeof body.path === "string" ? body.path : "/", viewport: parseViewport(body.viewport), expect, variant: parseVariant(body), screenshot: body.screenshot === true },
            viewer,
            { fallbackBase, root: options.root },
          );
          // Gambar sudah tersimpan di .zusantara/screenshots; tidak perlu dikirim ulang lewat JSON.
          const { screenshot: _shot, ...rest } = result;
          return json(res, 200, rest);
        }
        case "GET /requests": {
          const id = new URL(req.url ?? "/", "http://127.0.0.1").searchParams.get("id") ?? undefined;
          if (!appUrl) return json(res, 503, { error: t().dev.requests.unavailable });
          const traces = await fetchTraces(appUrl, token, id);
          return json(res, 200, { requests: traces });
        }
        case "POST /app": {
          const body = await readBody(req);
          if (typeof body.url === "string" && /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d{1,5})?$/.test(body.url)) {
            const restarted = appStartedAt > 0;
            appUrl = body.url;
            appStartedAt = Date.now();
            for (const check of [...appWaiters]) check();
            if (restarted) broadcastReload();
          }
          return json(res, 200, { ok: true });
        }
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
  const info = writeDevtoolsInfo(options.root, port, token);

  return {
    port,
    token,
    env: { ZUSANTARA_DEV: "1", ZUSANTARA_DEVTOOLS_PORT: String(port), ZUSANTARA_DEVTOOLS_TOKEN: token },
    viewer,
    close: () =>
      new Promise<void>((resolve) => {
        controller?.abort();
        for (const done of views.values()) done({ error: "devtools closed" });
        removeDevtoolsInfo(info, token);
        server.close(() => resolve());
        server.closeAllConnections();
      }),
  };
}

/**
 * `.zusantara/devtools.json` (port + token, hanya bisa dibaca pemilik) supaya `zusantara view` dari terminal lain
 * bisa memakai tab browser yang terhubung. Dihapus saat devtools berhenti.
 */
export function devtoolsInfoPath(root: string): string {
  return path.join(root, ".zusantara", "devtools.json");
}

function writeDevtoolsInfo(root: string, port: number, token: string): string | undefined {
  const file = devtoolsInfoPath(root);
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ port, token, pid: process.pid }) + "\n", { mode: 0o600 });
    fs.chmodSync(file, 0o600);
    return file;
  } catch {
    return undefined;
  }
}

function removeDevtoolsInfo(file: string | undefined, token: string): void {
  if (!file) return;
  try {
    // Jangan hapus milik devtools lain yang dimulai sesudahnya.
    if ((JSON.parse(fs.readFileSync(file, "utf8")) as { token?: string }).token === token) fs.rmSync(file, { force: true });
  } catch {
    // Sudah tidak ada.
  }
}

/** Baca `.zusantara/devtools.json` (undefined bila devtools tidak berjalan). */
export function readDevtoolsInfo(root: string): { port: number; token: string } | undefined {
  try {
    const data = JSON.parse(fs.readFileSync(devtoolsInfoPath(root), "utf8")) as { port?: unknown; token?: unknown };
    return typeof data.port === "number" && typeof data.token === "string" ? { port: data.port, token: data.token } : undefined;
  } catch {
    return undefined;
  }
}
