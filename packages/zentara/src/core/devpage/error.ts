import fs from "node:fs";
import { t } from "../../i18n/index.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { IncomingMessage } from "node:http";
import { defaultMessage } from "../errors.js";
import { escapeHtml } from "../view.js";
import { CHAT_CSS, CHAT_JS } from "./chat.js";
import { appInfo, devtoolsClient, type RouteInfo } from "./info.js";
import { highlight, LOGO_SVG, renderPage, WORDMARK, ZENTARA_VERSION } from "./theme.js";

export interface StackFrame {
  fn?: string;
  /** Path file absolut, atau nama modul internal (mis. node:internal/...). */
  file: string;
  line: number;
  column: number;
  /** Kode aplikasi (di dalam proyek, bukan node_modules/internal). */
  app: boolean;
}

const FRAME = /^\s*at (?:(.+?) \()?(.+?):(\d+):(\d+)\)?\s*$/;

/** Uraikan stack trace V8 menjadi daftar frame. */
export function parseStack(stack: string | undefined, root = appInfo().root): StackFrame[] {
  if (!stack) return [];
  const frames: StackFrame[] = [];
  for (const line of stack.split("\n")) {
    const m = FRAME.exec(line);
    if (!m) continue;
    let file = m[2]!.replace(/^async /, "");
    if (file.startsWith("file://")) {
      try {
        file = fileURLToPath(file.replace(/\?.*$/, ""));
      } catch {
        continue;
      }
    }
    const inProject = path.isAbsolute(file) && (file === root || file.startsWith(root + path.sep));
    frames.push({
      fn: m[1]?.replace(/^async /, ""),
      file,
      line: Number(m[3]),
      column: Number(m[4]),
      app: inProject && !file.split(path.sep).includes("node_modules"),
    });
  }
  return frames;
}

export interface Snippet {
  start: number;
  lines: string[];
  highlight: number;
}

/** Potongan kode di sekitar baris tertentu (hanya file teks yang wajar ukurannya). */
export function readSnippet(file: string, line: number, context = 8): Snippet | undefined {
  try {
    if (!path.isAbsolute(file) || fs.statSync(file).size > 1_000_000) return undefined;
    const all = fs.readFileSync(file, "utf8").split(/\r?\n/);
    if (line < 1 || line > all.length) return undefined;
    const start = Math.max(1, line - context);
    return { start, lines: all.slice(start - 1, Math.min(all.length, line + context)), highlight: line };
  } catch {
    return undefined;
  }
}

const SECRET_HEADERS = new Set(["cookie", "authorization", "proxy-authorization", "x-zentara-token", "x-api-key"]);

function requestDetails(req: IncomingMessage) {
  const headers: [string, string][] = Object.entries(req.headers).map(([k, v]) => [
    k,
    SECRET_HEADERS.has(k) ? "•••••• (disembunyikan)" : Array.isArray(v) ? v.join(", ") : String(v ?? ""),
  ]);
  return { method: req.method ?? "GET", url: req.url ?? "/", headers };
}

function rel(file: string): string {
  const root = appInfo().root;
  return path.isAbsolute(file) && file.startsWith(root + path.sep) ? path.relative(root, file).split(path.sep).join("/") : file;
}

function codeBlock(snippet: Snippet): string {
  const rows = snippet.lines
    .map((text, i) => {
      const n = snippet.start + i;
      return `<div class="ln${n === snippet.highlight ? " hl" : ""}"><span class="no">${n}</span><span class="tx">${highlight(text) || " "}</span></div>`;
    })
    .join("");
  return `<pre class="code">${rows}</pre>`;
}

const ERROR_CSS = `
.ze-hero{padding:26px 28px;position:relative;overflow:hidden}
.ze-hero::before{content:"";position:absolute;inset:0 auto 0 0;width:4px;background:linear-gradient(var(--danger),#f79009)}
.ze-chip{display:inline-flex;align-items:center;gap:8px;font-size:12.5px;font-weight:600;color:var(--danger);background:var(--danger-soft);border-radius:999px;padding:3px 10px}
.ze-title{font-size:26px;line-height:1.3;margin:12px 0 6px;letter-spacing:-.015em;word-break:break-word}
.ze-title code{font-size:.85em;background:var(--surface-2);border:1px solid var(--border);border-radius:8px;padding:1px 8px}
.ze-loc{font-family:var(--mono);font-size:13px;color:var(--muted)}
.ze-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
.ze-main{display:grid;grid-template-columns:minmax(260px,340px) 1fr;gap:18px;margin-top:18px}
.ze-frames{padding:10px;max-height:560px;overflow:auto}
.ze-frame{display:block;width:100%;text-align:left;border:1px solid transparent;background:none;color:var(--text);border-radius:10px;padding:9px 11px;cursor:pointer;font:inherit}
.ze-frame:hover{background:var(--surface-2)}
.ze-frame.on{background:var(--accent-soft);border-color:var(--accent)}
.ze-frame .fn{font-family:var(--mono);font-size:12.5px;font-weight:600;word-break:break-all}
.ze-frame .fl{font-family:var(--mono);font-size:11.5px;color:var(--muted);word-break:break-all}
.ze-frame.vendor{opacity:.65}
.ze-vendor-toggle{margin:6px 4px 2px;font-size:12.5px}
.ze-code{min-width:0}
.ze-code-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 16px;border-bottom:1px solid var(--border);font-family:var(--mono);font-size:12.5px}
.code{margin:0;padding:10px 0;background:var(--code-bg);border-radius:0 0 var(--radius) var(--radius);overflow:auto;font-size:13px;line-height:1.65}
.code .ln{display:flex;padding:0 16px 0 0}
.code .ln.hl{background:var(--code-line);box-shadow:inset 3px 0 0 var(--danger)}
.code .no{width:52px;flex:none;text-align:right;padding-right:16px;color:var(--muted);user-select:none;opacity:.7}
.code .tx{white-space:pre}
.ze-nocode{padding:40px 20px;text-align:center;color:var(--muted);font-size:14px}
.ze-sec{margin-top:18px}
.ze-table{width:100%;border-collapse:collapse;font-size:13px}
.ze-table td{border-top:1px solid var(--border);padding:7px 0;vertical-align:top}
.ze-table td:first-child{color:var(--muted);width:220px;padding-right:16px;font-family:var(--mono);font-size:12.5px}
.ze-table td:last-child{font-family:var(--mono);font-size:12.5px;word-break:break-all}
.ze-cause{border-left:3px solid var(--border);padding:4px 0 4px 14px;margin-top:10px;font-family:var(--mono);font-size:13px}
.ze-drawer{position:fixed;top:0;right:0;bottom:0;width:min(460px,100vw);background:var(--surface);border-left:1px solid var(--border);box-shadow:-20px 0 60px -20px rgba(0,0,0,.35);transform:translateX(105%);transition:transform .25s ease;display:flex;flex-direction:column;z-index:50}
.ze-drawer.open{transform:none}
.ze-drawer-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--border)}
.ze-drawer-head .zx-logo{width:24px;height:24px}
.ze-drawer-body{flex:1;min-height:0;padding:14px 16px}
.ze-routes{display:grid;gap:6px;font-family:var(--mono);font-size:13px}
.ze-routes div{display:flex;gap:12px}.ze-routes .m{color:var(--accent);min-width:80px}
.zs{min-height:100vh;display:grid;place-items:center;text-align:center;padding:24px}
.zs .code-big{font-size:88px;font-weight:800;letter-spacing:-.04em;line-height:1;background:linear-gradient(135deg,var(--accent),var(--accent-2));-webkit-background-clip:text;background-clip:text;color:transparent}
.zs h1{font-size:22px;margin:14px 0 6px}.zs p{color:var(--muted);margin:0 0 22px}
@media (max-width:900px){.ze-main{grid-template-columns:1fr}.ze-frames{max-height:none}}
`;

const ERROR_JS = `
(function(){
  var data = JSON.parse(document.getElementById("zx-data").textContent);
  document.querySelectorAll(".ze-frame[data-i]").forEach(function(b){
    b.addEventListener("click", function(){
      document.querySelectorAll(".ze-frame.on").forEach(function(x){ x.classList.remove("on"); });
      b.classList.add("on");
      document.querySelectorAll(".ze-snippet").forEach(function(s){ s.hidden = s.getAttribute("data-i") !== b.getAttribute("data-i"); });
    });
  });
  var vt = document.querySelector(".ze-vendor-toggle");
  if (vt) vt.addEventListener("click", function(){ document.querySelectorAll(".ze-frame.vendor").forEach(function(f){ f.hidden = !f.hidden; }); });
  var copy = document.querySelector("[data-copy-error]");
  if (copy) copy.addEventListener("click", function(){ navigator.clipboard.writeText(data.context).then(function(){ copy.textContent = data.copied; setTimeout(function(){ copy.textContent = data.copyError; }, 1600); }); });
  var drawer = document.querySelector(".ze-drawer"), chat = null;
  function open(first){
    if (!drawer) return;
    drawer.classList.add("open");
    if (!chat) chat = ZentaraChat.mount(document.querySelector(".ze-drawer-body"), { port: data.devtools.port, token: data.devtools.token, storageKey: "error", context: data.context, placeholder: data.placeholder, t: data.chat });
    if (first && chat.ask) chat.ask(data.askText, data.context);
    if (chat.focus) chat.focus();
  }
  document.querySelectorAll("[data-ask-ai]").forEach(function(b){ b.addEventListener("click", function(){ open(!drawer.classList.contains("asked")); drawer.classList.add("asked"); }); });
  var close = document.querySelector("[data-close-drawer]");
  if (close) close.addEventListener("click", function(){ drawer.classList.remove("open"); });
  document.addEventListener("keydown", function(e){ if (e.key === "Escape" && drawer) drawer.classList.remove("open"); });
})();
`;

/** Teks yang dipakai skrip halaman (tombol salin, chat AI), dalam bahasa aktif. */
function clientText() {
  const m = t().dev;
  return { copied: m.copied, copyError: m.error.copyError, placeholder: m.error.askPlaceholder, chat: m.chat };
}

function header(badge: string): string {
  const info = appInfo();
  return `<header class="zx-top">${LOGO_SVG}<div class="zx-brand">${WORDMARK}<small>${escapeHtml(info.appName)}</small></div><div class="zx-spacer"></div><span class="zx-badge warn"><span class="dot"></span>${escapeHtml(badge)}</span></header>`;
}

function drawer(): string {
  return `<aside class="ze-drawer" aria-label="Zentara AI"><div class="ze-drawer-head">${LOGO_SVG}<strong>Zentara AI</strong><div class="zx-spacer"></div><button class="zx-btn small" data-close-drawer>${escapeHtml(t().dev.error.close)}</button></div><div class="ze-drawer-body"></div></aside>`;
}

/** Ringkasan error dalam teks biasa: untuk tombol salin dan konteks Zentara AI. */
function errorContext(err: Error, req: IncomingMessage, frames: StackFrame[], snippet: Snippet | undefined): string {
  const first = frames.find((f) => f.app);
  const m = t().dev.error;
  const lines = [
    `${err.name}: ${err.message}`,
    `Request: ${req.method} ${req.url}`,
    first ? `${m.location}: ${rel(first.file)}:${first.line}:${first.column}` : "",
  ];
  if (snippet) {
    lines.push("", `${m.code}:`, ...snippet.lines.map((l, i) => `${String(snippet.start + i).padStart(4)}${snippet.start + i === snippet.highlight ? " >" : "  "} ${l}`));
  }
  lines.push("", "Stack trace:", ...(err.stack ?? "").split("\n").slice(0, 25));
  let cause = err.cause;
  for (let depth = 0; cause instanceof Error && depth < 3; depth++, cause = cause.cause) lines.push("", `${m.causedBy}: ${cause.name}: ${cause.message}`);
  return lines.filter((l, i) => l !== "" || i > 0).join("\n");
}

/** Halaman error lengkap untuk mode debug: pesan, stack trace dengan kode, detail request, dan Zentara AI. */
export function renderErrorPage(error: unknown, req: IncomingMessage, status = 500): string {
  const err = error instanceof Error ? error : new Error(String(error));
  const info = appInfo();
  const frames = parseStack(err.stack, info.root);
  const firstApp = frames.findIndex((f) => f.app);
  const selected = firstApp >= 0 ? firstApp : 0;
  const snippets = frames.map((f, i) => (f.app || i === selected ? readSnippet(f.file, f.line) : undefined));
  const request = requestDetails(req);
  const devtools = devtoolsClient();
  const context = errorContext(err, req, frames, snippets[selected]);
  const m = t().dev.error;

  const frameButtons = frames
    .map((f, i) => {
      const cls = `ze-frame${i === selected ? " on" : ""}${f.app ? "" : " vendor"}`;
      return `<button type="button" class="${cls}" data-i="${i}"${f.app || i === selected ? "" : " hidden"}><div class="fn">${escapeHtml(f.fn ?? m.anonymous)}</div><div class="fl">${escapeHtml(rel(f.file))}:${f.line}</div></button>`;
    })
    .join("");
  const vendorCount = frames.filter((f, i) => !f.app && i !== selected).length;
  const codePanels = frames
    .map((f, i) => {
      const snippet = snippets[i];
      if (!snippet && i !== selected) return "";
      const body = snippet ? codeBlock(snippet) : `<div class="ze-nocode">${escapeHtml(m.noSourceFrame)}</div>`;
      return `<div class="ze-snippet" data-i="${i}"${i === selected ? "" : " hidden"}><div class="ze-code-head"><span>${escapeHtml(rel(f.file))}:${f.line}:${f.column}</span><span class="zx-muted">${escapeHtml(f.fn ?? "")}</span></div>${body}</div>`;
    })
    .join("");

  let causes = "";
  let cause = err.cause;
  for (let depth = 0; cause !== undefined && depth < 5; depth++) {
    const c = cause instanceof Error ? cause : new Error(String(cause));
    causes += `<div class="ze-cause"><strong>${escapeHtml(c.name)}</strong>: ${escapeHtml(c.message)}</div>`;
    cause = c.cause;
  }

  const loc = firstApp >= 0 ? `${rel(frames[firstApp]!.file)}:${frames[firstApp]!.line}:${frames[firstApp]!.column}` : "";
  const askButton = devtools
    ? `<button class="zx-btn primary" data-ask-ai>${escapeHtml(m.askAi)}</button>`
    : `<span class="zx-muted" style="align-self:center;font-size:13px">${m.runWithDevHtml}</span>`;

  const body = `<div class="zx-wrap">${header(m.devMode)}
<section class="zx-card ze-hero"><span class="ze-chip">${status} · ${escapeHtml(err.name)}</span>
<h1 class="ze-title">${escapeHtml(err.message || defaultMessage(status))}</h1>
<div class="ze-loc">${escapeHtml(request.method)} ${escapeHtml(request.url)}${loc ? ` · ${escapeHtml(loc)}` : ""}</div>
<div class="ze-actions">${askButton}<button class="zx-btn" data-copy-error>${escapeHtml(m.copyError)}</button><a class="zx-btn" href="${escapeHtml(request.url)}">${escapeHtml(m.reload)}</a></div></section>
${causes ? `<section class="zx-card zx-pad ze-sec"><h2>${escapeHtml(m.causes)}</h2>${causes}</section>` : ""}
<div class="ze-main"><section class="zx-card ze-frames"><h2 style="margin:8px 8px 10px">Stack trace</h2>${frameButtons || `<div class="ze-nocode">${escapeHtml(m.noStack)}</div>`}${vendorCount ? `<button type="button" class="zx-btn small ze-vendor-toggle">${escapeHtml(m.toggleVendor(vendorCount))}</button>` : ""}</section>
<section class="zx-card ze-code">${codePanels || `<div class="ze-nocode">${escapeHtml(m.noSource)}</div>`}</section></div>
<section class="zx-card zx-pad ze-sec"><h2>Request</h2><table class="ze-table"><tr><td>method</td><td>${escapeHtml(request.method)}</td></tr><tr><td>url</td><td>${escapeHtml(request.url)}</td></tr>${request.headers.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join("")}</table></section>
<section class="zx-card zx-pad ze-sec"><h2>${escapeHtml(m.environment)}</h2><dl class="zx-kv"><dt>Zentara</dt><dd>${escapeHtml(ZENTARA_VERSION)}</dd><dt>Node.js</dt><dd>${escapeHtml(process.version)}</dd><dt>Env</dt><dd>${escapeHtml(info.env)}</dd><dt>${escapeHtml(m.folder)}</dt><dd>${escapeHtml(info.root)}</dd></dl></section>
<p class="zx-foot">${escapeHtml(m.foot)}</p></div>${devtools ? drawer() : ""}`;

  return renderPage({
    title: `${err.name}: ${err.message}`.slice(0, 120),
    body,
    css: ERROR_CSS + (devtools ? CHAT_CSS : ""),
    data: { context, devtools: devtools ?? null, askText: m.askText, ...clientText() },
    script: (devtools ? CHAT_JS : "") + ERROR_JS,
  });
}


/** Halaman status sederhana yang aman untuk produksi (tanpa detail internal). */
export function renderStatusPage(status: number, message?: string): string {
  const texts = t().dev.status;
  const [title, text] = texts[status] ?? (status >= 500 ? texts[500]! : [defaultMessage(status), ""]);
  const body = `<main class="zs"><div>${LOGO_SVG.replace('class="zx-logo"', 'class="zx-logo" style="width:56px;height:56px;margin-bottom:18px"')}<div class="code-big">${status}</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message && message !== defaultMessage(status) ? message : text)}</p><a class="zx-btn" href="/">${escapeHtml(t().dev.error.backHome)}</a></div></main>`;
  return renderPage({ title: `${status} · ${title}`, body, css: ERROR_CSS });
}

/** 404 saat pengembangan: tunjukkan route yang ada dan tawarkan untuk membuatnya dengan AI. */
export function renderNotFoundPage(req: IncomingMessage, routes: RouteInfo[]): string {
  const devtools = devtoolsClient();
  const url = req.url ?? "/";
  const pathname = url.split("?")[0] ?? "/";
  const suggestion = pathname.replace(/^\/+|\/+$/g, "") || "index";
  const m = t().dev.error;
  const list = routes.length
    ? `<div class="ze-routes">${routes.map((r) => `<div><span class="m">${escapeHtml(r.methods.join("|"))}</span><a href="${escapeHtml(r.pattern.includes(":") || r.pattern.includes("*") ? "#" : r.pattern)}">${escapeHtml(r.pattern)}</a><span class="zx-muted">${escapeHtml(r.file)}</span></div>`).join("")}</div>`
    : `<p class="zx-muted">${m.noRoutesHtml}</p>`;
  const body = `<div class="zx-wrap">${header(m.devMode)}
<section class="zx-card ze-hero"><span class="ze-chip">${escapeHtml(m.notFoundChip)}</span>
<h1 class="ze-title">${m.noRouteForHtml(escapeHtml(pathname))}</h1>
<div class="ze-loc">${escapeHtml(req.method ?? "GET")} ${escapeHtml(url)}</div>
<div class="ze-actions">${devtools ? `<button class="zx-btn primary" data-ask-ai>${escapeHtml(m.createWithAi)}</button>` : ""}<a class="zx-btn" href="/">${escapeHtml(m.home)}</a></div></section>
<div class="zx-grid ze-sec" style="grid-template-columns:repeat(auto-fit,minmax(320px,1fr))">
<section class="zx-card zx-pad"><h2>${escapeHtml(m.availableRoutes)}</h2>${list}</section>
<section class="zx-card zx-pad"><h2>${escapeHtml(m.createManually)}</h2><p class="zx-muted" style="margin-top:0">${m.createManuallyHtml}</p><div class="zx-cmd"><span>npx zentara make:route ${escapeHtml(suggestion)}</span></div></section></div>
<p class="zx-foot">${escapeHtml(m.notFoundFoot)}</p></div>${devtools ? drawer() : ""}`;
  return renderPage({
    title: `404 · ${pathname}`,
    body,
    css: ERROR_CSS + (devtools ? CHAT_CSS : ""),
    data: {
      context: m.notFoundContext(req.method ?? "GET", pathname),
      devtools: devtools ?? null,
      askText: m.notFoundAsk(pathname),
      ...clientText(),
    },
    script: (devtools ? CHAT_JS : "") + ERROR_JS,
  });
}
