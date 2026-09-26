/**
 * "Melihat" halaman aplikasi untuk Zentara AI (tool `view_page` dan `zentara view`).
 *
 * Dua cara:
 * - **browser**: widget chat di tab yang terbuka memuat halaman di iframe tersembunyi lalu mengirim
 *   snapshot: elemen yang terlihat beserta posisi dan ukurannya, teks, error console, dan request gagal;
 * - **teks**: bila tidak ada tab yang terhubung, halaman diambil langsung dari server aplikasi dan
 *   diringkas dari HTML-nya (tanpa JavaScript).
 *
 * Hasilnya ditulis dalam Bahasa Inggris karena dibaca oleh model, sama seperti deskripsi tool.
 */

export interface PageElement {
  tag: string;
  role?: string;
  text?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Jumlah baris data (khusus tabel). */
  rows?: number;
  /** true bila elemen berada di luar layar (perlu digulir). */
  off?: boolean;
  attrs?: Record<string, string>;
}

export interface PageProblem {
  kind: string;
  message: string;
  source?: string;
}

export interface FailedRequest {
  method: string;
  url: string;
  status: number;
  statusText?: string;
}

export interface PageSnapshot {
  url: string;
  title: string;
  status?: number;
  /** File route yang melayani halaman ini (relatif terhadap proyek). */
  route?: string;
  viewport: { w: number; h: number };
  docHeight?: number;
  elements: PageElement[];
  truncated?: boolean;
  text: string;
  errors: PageProblem[];
  failed: FailedRequest[];
  /** Jumlah elemen yang cocok untuk setiap selector yang diminta. -1 = selector tidak valid. */
  matches?: Record<string, number>;
  note?: string;
}

export interface ViewExpect {
  text?: string[];
  selector?: string[];
  noErrors?: boolean;
}

/** Hasil dari tab browser: snapshot, atau alasan gagal (mis. iframe diblokir). */
export type BrowserView = { snapshot: PageSnapshot } | { error: string };

export interface PageViewer {
  /** Alamat server aplikasi yang sedang berjalan (dilaporkan oleh server aplikasi saat mulai). */
  appUrl(): string | undefined;
  /** Buka `path` di tab browser yang terhubung. undefined bila tidak ada tab. */
  browser(path: string, options: { selectors?: string[]; signal?: AbortSignal }): Promise<BrowserView | undefined>;
  /**
   * Tunggu server aplikasi selesai dimulai ulang setelah file berubah pada waktu `after` (ms epoch).
   * Langsung selesai bila server sudah mulai setelah itu, atau belum pernah melapor (bukan server `zentara dev`).
   */
  waitForApp(after: number, options: { timeoutMs?: number; signal?: AbortSignal }): Promise<void>;
}

const MAX_ELEMENTS = 250;
const MAX_TEXT = 4000;
const MAX_PROBLEMS = 50;

function clip(value: unknown, max: number): string {
  const s = String(value ?? "").replace(/\s+/g, " ").trim();
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function num(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/** Rapikan snapshot dari browser: batasi ukuran dan buang field yang tidak dikenal. */
export function normalizeSnapshot(raw: unknown): PageSnapshot | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const viewport = (r.viewport ?? {}) as Record<string, unknown>;
  const elements = Array.isArray(r.elements) ? r.elements.slice(0, MAX_ELEMENTS) : [];
  const list = <T>(value: unknown, map: (v: Record<string, unknown>) => T): T[] =>
    Array.isArray(value) ? value.slice(0, MAX_PROBLEMS).filter((v) => v && typeof v === "object").map((v) => map(v as Record<string, unknown>)) : [];
  const snapshot: PageSnapshot = {
    url: clip(r.url, 500),
    title: clip(r.title, 200),
    viewport: { w: num(viewport.w), h: num(viewport.h) },
    elements: elements
      .filter((e): e is Record<string, unknown> => Boolean(e) && typeof e === "object")
      .map((e) => {
        const el: PageElement = { tag: clip(e.tag, 20).toLowerCase(), x: num(e.x), y: num(e.y), w: num(e.w), h: num(e.h) };
        if (e.role) el.role = clip(e.role, 30);
        if (e.text) el.text = clip(e.text, 160);
        if (e.rows !== undefined) el.rows = num(e.rows);
        if (e.off) el.off = true;
        if (e.attrs && typeof e.attrs === "object") {
          const attrs: Record<string, string> = {};
          for (const [k, v] of Object.entries(e.attrs as Record<string, unknown>).slice(0, 12)) attrs[clip(k, 30)] = clip(v, 100);
          el.attrs = attrs;
        }
        return el;
      }),
    text: clip(r.text, MAX_TEXT),
    errors: list(r.errors, (p) => ({ kind: clip(p.kind, 20), message: clip(p.message, 500), ...(p.source ? { source: clip(p.source, 200) } : {}) })),
    failed: list(r.failed, (f) => ({ method: clip(f.method, 10).toUpperCase(), url: clip(f.url, 300), status: num(f.status), ...(f.statusText ? { statusText: clip(f.statusText, 100) } : {}) })),
  };
  if (r.status !== undefined && num(r.status) > 0) snapshot.status = num(r.status);
  if (r.route) snapshot.route = clip(r.route, 300);
  if (r.docHeight !== undefined) snapshot.docHeight = num(r.docHeight);
  if (r.truncated || (Array.isArray(r.elements) && r.elements.length > MAX_ELEMENTS)) snapshot.truncated = true;
  if (r.note) snapshot.note = clip(r.note, 100);
  if (r.matches && typeof r.matches === "object") {
    const matches: Record<string, number> = {};
    for (const [k, v] of Object.entries(r.matches as Record<string, unknown>).slice(0, 20)) matches[clip(k, 200)] = Number.isFinite(Number(v)) ? Number(v) : -1;
    snapshot.matches = matches;
  }
  return snapshot;
}

function describeElement(e: PageElement): string {
  let head = e.role ? `${e.tag}[role=${e.role}]` : e.tag;
  const attrs = e.attrs ? Object.entries(e.attrs).map(([k, v]) => (v === "true" ? k : `${k}=${JSON.stringify(v)}`)) : [];
  if (attrs.length) head += ` (${attrs.join(" ")})`;
  const text = e.text ? ` ${JSON.stringify(e.text)}` : "";
  const rows = e.rows !== undefined ? ` ${e.rows} rows` : "";
  return `- ${head}${rows}${text} @${e.x},${e.y} ${e.w}x${e.h}${e.off ? " (off-screen)" : ""}`;
}

/** Tulis snapshot browser sebagai teks ringkas untuk model. */
export function formatSnapshot(s: PageSnapshot): string {
  const lines = [`Page (seen in the developer's browser): ${s.url}${s.status ? ` (HTTP ${s.status})` : ""}`, `Title: ${s.title || "(none)"}`];
  if (s.route) lines.push(`Route file: ${s.route}`);
  lines.push(`Viewport: ${s.viewport.w}x${s.viewport.h}${s.docHeight ? `, page height ${s.docHeight}` : ""}`);
  if (s.note === "no-probe") lines.push("Note: this response is not a Zentara HTML page, so console errors and element positions are not available.");
  lines.push(s.errors.length ? `Console errors (${s.errors.length}):` : "Console errors: none");
  for (const e of s.errors) lines.push(`- [${e.kind}] ${e.message}${e.source ? ` (${e.source})` : ""}`);
  lines.push(s.failed.length ? `Failed requests (${s.failed.length}):` : "Failed requests: none");
  for (const f of s.failed) lines.push(`- ${f.method} ${f.url} -> ${f.status || "network error"}${f.statusText ? ` ${f.statusText}` : ""}`);
  if (s.matches) {
    lines.push("Selector matches:");
    for (const [sel, n] of Object.entries(s.matches)) lines.push(`- ${sel}: ${n < 0 ? "invalid selector" : n}`);
  }
  lines.push(`Visible elements (document order, x,y width x height)${s.truncated ? `, first ${s.elements.length} only` : ""}:`);
  lines.push(...(s.elements.length ? s.elements.map(describeElement) : ["(none)"]));
  if (s.text) lines.push("Page text:", s.text);
  return lines.join("\n");
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'" };

function decode(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

function stripTags(html: string): string {
  return decode(html.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function attr(attrs: string, name: string): string | undefined {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i").exec(attrs);
  return m ? decode(m[1] ?? m[2] ?? m[3] ?? "") : new RegExp(`(?:^|\\s)${name}(?=\\s|$|/)`, "i").test(attrs) ? "" : undefined;
}

export interface HtmlOutline {
  title: string;
  lines: string[];
  text: string;
}

/**
 * Ringkasan halaman dari HTML saja (versi teks, tanpa JavaScript): judul, heading, tabel beserta jumlah
 * baris, form dan field-nya, tombol, link, gambar, dan pesan peringatan.
 */
export function htmlOutline(html: string, maxLines = 150): HtmlOutline {
  const clean = html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|template|noscript|svg)\b[\s\S]*?<\/\1\s*>/gi, "");
  const title = stripTags(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(clean)?.[1] ?? "");
  const bodyStart = clean.search(/<body\b/i);
  const body = bodyStart >= 0 ? clean.slice(bodyStart) : clean;
  const lower = body.toLowerCase();
  const lines: string[] = [];
  const TAG = /<(h[1-6]|a|button|table|form|label|img|input|select|textarea|nav|main|dialog|[a-z][\w-]*(?=[^>]*\brole\s*=\s*["']?alert))\b([^>]*)>/gi;
  let m: RegExpExecArray | null;
  const inner = (tag: string, from: number): string => {
    const end = lower.indexOf(`</${tag.toLowerCase()}`, from);
    return end < 0 ? "" : body.slice(from, end);
  };
  while ((m = TAG.exec(body)) && lines.length < maxLines) {
    const tag = m[1]!.toLowerCase();
    const attrs = m[2] ?? "";
    const after = m.index + m[0].length;
    if (/^h[1-6]$/.test(tag)) lines.push(`- ${tag} ${JSON.stringify(clip(stripTags(inner(tag, after)), 120))}`);
    else if (tag === "a") lines.push(`- a (href=${JSON.stringify(attr(attrs, "href") ?? "")}) ${JSON.stringify(clip(stripTags(inner(tag, after)) || attr(attrs, "aria-label") || "", 80))}`);
    else if (tag === "button") lines.push(`- button ${JSON.stringify(clip(stripTags(inner(tag, after)) || attr(attrs, "aria-label") || "", 80))}${attr(attrs, "disabled") !== undefined ? " disabled" : ""}`);
    else if (tag === "label") lines.push(`- label ${JSON.stringify(clip(stripTags(inner(tag, after)), 80))}`);
    else if (tag === "table") {
      const table = inner(tag, after);
      const headers = [...table.matchAll(/<th\b[^>]*>([\s\S]*?)<\/th\s*>/gi)].slice(0, 12).map((h) => clip(stripTags(h[1] ?? ""), 30));
      const bodyRows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr\s*>/gi)].filter((r) => /<td\b/i.test(r[1] ?? "")).length;
      lines.push(`- table ${bodyRows} rows${headers.length ? ` [${headers.join(" | ")}]` : ""}`);
    } else if (tag === "form") lines.push(`- form (method=${(attr(attrs, "method") ?? "get").toLowerCase()} action=${JSON.stringify(attr(attrs, "action") ?? "")})`);
    else if (tag === "img") lines.push(`- img (alt=${JSON.stringify(attr(attrs, "alt") ?? "")} src=${JSON.stringify(clip(attr(attrs, "src") ?? "", 80))})`);
    else if (tag === "input" || tag === "select" || tag === "textarea") {
      const type = attr(attrs, "type") ?? (tag === "input" ? "text" : tag);
      if (type === "hidden") continue;
      const parts = [`type=${type}`];
      for (const name of ["name", "placeholder"]) {
        const v = attr(attrs, name);
        if (v) parts.push(`${name}=${JSON.stringify(clip(v, 60))}`);
      }
      if (attr(attrs, "required") !== undefined) parts.push("required");
      lines.push(`- ${tag} (${parts.join(" ")})`);
    } else if (tag === "nav" || tag === "main" || tag === "dialog") lines.push(`- ${tag}`);
    else lines.push(`- alert ${JSON.stringify(clip(stripTags(inner(tag, after)), 160))}`);
  }
  return { title, lines, text: clip(stripTags(body), MAX_TEXT) };
}

export interface TextView {
  url: string;
  status: number;
  location?: string;
  contentType: string;
  title: string;
  lines: string[];
  text: string;
}

/** Ambil halaman langsung dari server aplikasi (tanpa browser, tanpa cookie login). */
export async function fetchTextView(url: string, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<TextView> {
  const signals = [AbortSignal.timeout(options.timeoutMs ?? 15_000), ...(options.signal ? [options.signal] : [])];
  const res = await fetch(url, { redirect: "manual", headers: { Accept: "text/html,application/json;q=0.9,*/*;q=0.8", "X-Zentara-View": "text" }, signal: AbortSignal.any(signals) });
  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();
  const view: TextView = { url, status: res.status, contentType, title: "", lines: [], text: "" };
  const location = res.headers.get("location");
  if (location) view.location = location;
  if (contentType.includes("html")) Object.assign(view, htmlOutline(body));
  else view.text = clip(body, MAX_TEXT);
  return view;
}

export function formatTextView(v: TextView): string {
  const lines = [`Page (text version from the server, JavaScript not run, not logged in): ${v.url} (HTTP ${v.status})`];
  if (v.location) lines.push(`Redirects to: ${v.location}${/login|masuk|signin/i.test(v.location) ? " (the page needs a logged-in user; open it in the browser to see it)" : ""}`);
  if (v.title) lines.push(`Title: ${v.title}`);
  if (v.contentType) lines.push(`Content-Type: ${v.contentType}`);
  if (v.lines.length) lines.push("Elements (document order):", ...v.lines);
  if (v.text) lines.push("Page text:", v.text);
  return lines.join("\n");
}

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Periksa harapan (`expect`) terhadap hasil lihat halaman. Mengembalikan baris hasil dan status lulus. */
export function checkExpect(expect: ViewExpect, view: { snapshot?: PageSnapshot; text?: TextView }): { ok: boolean; lines: string[] } {
  const lines: string[] = [];
  let ok = true;
  const mark = (pass: boolean, text: string) => {
    if (!pass) ok = false;
    lines.push(`${pass ? "PASS" : "FAIL"} ${text}`);
  };
  const s = view.snapshot;
  const allText = s ? [s.title, s.text, ...s.elements.map((e) => `${e.text ?? ""} ${Object.values(e.attrs ?? {}).join(" ")}`)].join("\n") : [view.text?.title, view.text?.text, ...(view.text?.lines ?? [])].join("\n");
  for (const text of expect.text ?? []) mark(includesText(allText, text), `text ${JSON.stringify(text)} is on the page`);
  for (const sel of expect.selector ?? []) {
    const n = s?.matches?.[sel];
    if (!s) lines.push(`SKIP selector ${JSON.stringify(sel)} (only checked in the browser view)`);
    else mark(n !== undefined && n > 0, `selector ${JSON.stringify(sel)} matches ${n === undefined ? "?" : n < 0 ? "invalid selector" : n}`);
  }
  if (expect.noErrors) {
    if (s) mark(s.errors.length === 0 && s.failed.length === 0 && (s.status ?? 200) < 400, `no console errors or failed requests (${s.errors.length} errors, ${s.failed.length} failed requests)`);
    else mark((view.text?.status ?? 500) < 400, `page responds without an error (HTTP ${view.text?.status})`);
  }
  return { ok, lines };
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Ubah input `path` (mis. "/notes" atau "http://localhost:3000/notes") menjadi path + URL lengkap. Hanya localhost. */
export function resolveViewTarget(input: string, base: string): { path: string; url: string } {
  const value = input.trim();
  let url: URL;
  if (/^https?:\/\//i.test(value)) {
    url = new URL(value);
    if (!LOCAL_HOSTS.has(url.hostname)) throw new Error(`Only pages of the local app can be viewed (got ${url.hostname}).`);
  } else {
    if (!value.startsWith("/")) throw new Error('path must start with "/", e.g. "/notes".');
    url = new URL(value, base);
  }
  return { path: `${url.pathname}${url.search}`, url: url.href };
}

/** Dipakai tool `view_page`: lihat di browser bila ada tab terhubung, bila tidak pakai versi teks. */
export async function viewPage(
  input: { path: string; expect?: ViewExpect },
  viewer: PageViewer | undefined,
  options: { fallbackBase: string; signal?: AbortSignal; changedAt?: number },
): Promise<{ text: string; ok: boolean; mode: "browser" | "text" }> {
  // Kode baru saja diubah: tunggu server dev dimulai ulang agar yang dilihat adalah versi terbaru.
  if (viewer && options.changedAt) await viewer.waitForApp(options.changedAt, { signal: options.signal });
  const base = viewer?.appUrl() ?? options.fallbackBase;
  const target = resolveViewTarget(input.path, base);
  const expect = input.expect ?? {};
  const notes: string[] = [];
  const browser = viewer ? await viewer.browser(target.path, { selectors: expect.selector, signal: options.signal }) : undefined;
  if (browser && "snapshot" in browser) {
    const check = checkExpect(expect, { snapshot: browser.snapshot });
    return { text: [formatSnapshot(browser.snapshot), ...(check.lines.length ? ["Checks:", ...check.lines] : [])].join("\n"), ok: check.ok, mode: "browser" };
  }
  if (browser) notes.push(`The browser could not show the page (${browser.error}); using the text version instead.`);
  else notes.push("No browser tab with the Zentara chat widget is open; using the text version from the server.");
  let view: TextView;
  try {
    view = await fetchTextView(target.url, { signal: options.signal });
  } catch (err) {
    throw new Error(`Could not reach the app at ${target.url}: ${(err as Error).message}. Is the dev server running?`);
  }
  const check = checkExpect(expect, { text: view });
  return { text: [...notes, formatTextView(view), ...(check.lines.length ? ["Checks:", ...check.lines] : [])].join("\n"), ok: check.ok, mode: "text" };
}
