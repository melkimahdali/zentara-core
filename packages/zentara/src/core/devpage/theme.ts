import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml } from "../view.js";

/** Versi paket zentara yang sedang dipakai (dibaca sekali dari package.json). */
export const ZENTARA_VERSION: string = (() => {
  try {
    const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "package.json");
    return (JSON.parse(fs.readFileSync(file, "utf8")) as { version?: string }).version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
})();

export const LOGO_SVG = `<svg class="zx-logo" viewBox="0 0 32 32" aria-hidden="true"><defs><linearGradient id="zx-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2dd4bf"/><stop offset=".55" stop-color="#38bdf8"/><stop offset="1" stop-color="#6366f1"/></linearGradient></defs><rect width="32" height="32" rx="9" fill="url(#zx-g)"/><path d="M10.5 10.5h11l-11 11h11" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

/** CSS bersama untuk halaman bawaan Zentara (sambutan, error, status). Mengikuti mode gelap/terang sistem. */
export const BASE_CSS = `
:root{color-scheme:light dark;--bg:#f6f7f9;--bg-glow:rgba(45,212,191,.16);--surface:#fff;--surface-2:#f1f3f6;--border:#e3e6ec;--text:#141821;--muted:#667085;--accent:#0f9f8f;--accent-2:#5b5ff0;--accent-soft:rgba(15,159,143,.1);--danger:#d92d20;--danger-soft:rgba(217,45,32,.08);--warn:#b54708;--warn-soft:rgba(247,144,9,.12);--ok:#079455;--code-bg:#f8f9fb;--code-line:rgba(217,45,32,.1);--shadow:0 1px 2px rgba(16,24,40,.05),0 8px 24px -8px rgba(16,24,40,.12);--radius:14px;--mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,"Liberation Mono",monospace;--sans:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--tok-k:#7c3aed;--tok-s:#067647;--tok-c:#98a2b3;--tok-n:#c4320a;--tok-f:#175cd3}
@media (prefers-color-scheme:dark){:root{--bg:#0a0c11;--bg-glow:rgba(45,212,191,.12);--surface:#11141b;--surface-2:#171b24;--border:#242a36;--text:#e8eaf0;--muted:#8a93a6;--accent:#2dd4bf;--accent-2:#818cf8;--accent-soft:rgba(45,212,191,.12);--danger:#f97066;--danger-soft:rgba(249,112,102,.1);--warn:#fdb022;--warn-soft:rgba(253,176,34,.1);--ok:#47cd89;--code-bg:#0d1017;--code-line:rgba(249,112,102,.14);--shadow:0 1px 2px rgba(0,0,0,.3),0 12px 32px -12px rgba(0,0,0,.6);--tok-k:#c4b5fd;--tok-s:#86efac;--tok-c:#5d6679;--tok-n:#fdba74;--tok-f:#93c5fd}}
*{box-sizing:border-box}
[hidden]{display:none!important}
html,body{margin:0}
body{background:radial-gradient(1200px 500px at 10% -10%,var(--bg-glow),transparent 60%),radial-gradient(900px 400px at 110% 0%,rgba(99,102,241,.12),transparent 60%),var(--bg);background-attachment:fixed;color:var(--text);font:15px/1.6 var(--sans);-webkit-font-smoothing:antialiased;min-height:100vh}
a{color:var(--accent);text-decoration:none}a:hover{text-decoration:underline}
code,pre,kbd{font-family:var(--mono);font-size:13px}
.zx-wrap{max-width:1180px;margin:0 auto;padding:24px 20px 64px}
.zx-top{display:flex;align-items:center;gap:12px;margin-bottom:28px}
.zx-logo{width:32px;height:32px;flex:none}
.zx-brand{font-weight:700;letter-spacing:-.01em;font-size:16px}
.zx-brand small{font-weight:500;color:var(--muted);margin-left:6px}
.zx-spacer{flex:1}
.zx-badge{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);background:var(--surface);border-radius:999px;padding:3px 10px;font-size:12px;color:var(--muted);white-space:nowrap}
.zx-badge .dot{width:7px;height:7px;border-radius:50%;background:var(--ok)}
.zx-badge.warn .dot{background:var(--warn)}.zx-badge.off .dot{background:var(--muted)}
.zx-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow)}
.zx-card h2,.zx-h2{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted);margin:0 0 12px;font-weight:600}
.zx-pad{padding:20px 22px}
.zx-grid{display:grid;gap:18px}
.zx-btn{display:inline-flex;align-items:center;gap:8px;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:10px;padding:8px 14px;font:inherit;font-size:14px;font-weight:500;cursor:pointer;transition:transform .08s ease,background .15s,border-color .15s}
.zx-btn:hover{border-color:var(--accent);text-decoration:none}.zx-btn:active{transform:translateY(1px)}
.zx-btn:disabled{opacity:.5;cursor:not-allowed}
.zx-btn.primary{background:linear-gradient(135deg,var(--accent),var(--accent-2));border-color:transparent;color:#fff}
.zx-btn.primary:hover{filter:brightness(1.07)}
.zx-btn.danger{color:var(--danger)}.zx-btn.small{padding:5px 10px;font-size:13px;border-radius:8px}
.zx-muted{color:var(--muted)}
.zx-kv{display:grid;grid-template-columns:minmax(120px,max-content) 1fr;gap:6px 18px;font-size:13.5px}
.zx-kv dt{color:var(--muted)}.zx-kv dd{margin:0;font-family:var(--mono);font-size:12.5px;word-break:break-all}
.zx-cmd{display:flex;align-items:center;gap:10px;background:var(--surface-2);border:1px solid var(--border);border-radius:10px;padding:8px 10px 8px 12px;font-family:var(--mono);font-size:13px}
.zx-cmd span{flex:1;overflow:auto;white-space:nowrap}.zx-cmd span::before{content:"$ ";color:var(--muted)}
.zx-copy{border:0;background:none;color:var(--muted);cursor:pointer;font:inherit;font-size:12px;padding:2px 6px;border-radius:6px}.zx-copy:hover{color:var(--text);background:var(--border)}
.zx-foot{margin-top:40px;text-align:center;color:var(--muted);font-size:13px}
.tok-k{color:var(--tok-k)}.tok-s{color:var(--tok-s)}.tok-c{color:var(--tok-c);font-style:italic}.tok-n{color:var(--tok-n)}.tok-f{color:var(--tok-f)}
@media (max-width:760px){.zx-wrap{padding:16px 14px 48px}}
`;

export interface PageOptions {
  title: string;
  body: string;
  css?: string;
  /** Skrip inline tambahan (sudah dipercaya, bukan input pengguna). */
  script?: string;
  /** Data JSON yang disisipkan untuk skrip (di-escape aman). */
  data?: Record<string, unknown>;
}

/** Sisipkan JSON ke dalam <script> tanpa bisa menutup tag lebih awal. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

export function renderPage(options: PageOptions): string {
  const data = options.data ? `<script type="application/json" id="zx-data">${jsonForScript(options.data)}</script>` : "";
  const script = options.script ? `<script>${options.script}</script>` : "";
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(options.title)}</title><link rel="icon" href="data:image/svg+xml,${encodeURIComponent(LOGO_SVG)}"><style>${BASE_CSS}${options.css ?? ""}</style></head><body>${options.body}${data}${script}</body></html>`;
}

const KEYWORDS = new Set(
  "import export from as default function return const let var if else for while do switch case break continue new class extends async await try catch finally throw typeof instanceof in of this super null undefined true false void interface type enum implements public private protected readonly static yield delete".split(" "),
);
const TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\\n]|\\.)*"?|'(?:[^'\\\n]|\\.)*'?|`(?:[^`\\]|\\.)*`?)|(\b\d[\d_]*(?:\.\d+)?\b)|([A-Za-z_$][\w$]*)(?=\s*\()|([A-Za-z_$][\w$]*)/g;

/** Pewarnaan sintaks sederhana untuk TypeScript/JavaScript. Hasilnya HTML yang sudah di-escape. */
export function highlight(code: string): string {
  let out = "";
  let last = 0;
  for (const m of code.matchAll(TOKEN)) {
    out += escapeHtml(code.slice(last, m.index));
    last = m.index + m[0].length;
    const text = escapeHtml(m[0]);
    if (m[1]) out += `<span class="tok-c">${text}</span>`;
    else if (m[2]) out += `<span class="tok-s">${text}</span>`;
    else if (m[3]) out += `<span class="tok-n">${text}</span>`;
    else if (m[4]) out += KEYWORDS.has(m[4]) ? `<span class="tok-k">${text}</span>` : `<span class="tok-f">${text}</span>`;
    else out += KEYWORDS.has(m[5]!) ? `<span class="tok-k">${text}</span>` : text;
  }
  return out + escapeHtml(code.slice(last));
}
