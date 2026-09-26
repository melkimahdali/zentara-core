/**
 * "Melihat" halaman aplikasi untuk Zentara AI (tool `view_page` dan `zentara view`).
 *
 * Dua cara:
 * - **browser**: widget chat di tab yang terbuka memuat halaman di iframe tersembunyi lalu mengirim
 *   snapshot: elemen yang terlihat beserta posisi dan ukurannya, teks, error console, dan request gagal;
 * - **teks**: bila tidak ada tab yang terhubung, halaman diambil langsung dari server aplikasi dan
 *   diringkas dari HTML-nya (tanpa JavaScript).
 *
 * Kedua cara juga menjalankan **pemeriksaan tampilan** (`layoutIssues`/`staticIssues`): elemen keluar layar,
 * saling menimpa, teks terpotong, gambar rusak, kontras rendah, dan CSS di luar kit UI. Posisi dan warna
 * hanya bisa diukur di browser; versi teks memeriksa yang terbaca dari HTML.
 *
 * Hasilnya mengikuti bahasa Zentara (id/en), baik untuk model maupun `zentara view` di terminal.
 */
import { t } from "../i18n/index.js";

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

/** Ukuran layar untuk `view_page`: desktop (default) dan ponsel. */
export type Viewport = "desktop" | "mobile";
export const VIEWPORTS: Record<Viewport, { w: number; h: number }> = { desktop: { w: 1280, h: 800 }, mobile: { w: 390, h: 844 } };

export function parseViewport(value: unknown): Viewport {
  return value === "mobile" ? "mobile" : "desktop";
}

/**
 * Data mentah untuk pemeriksaan tampilan, diukur oleh probe di browser (lihat PROBE_JS). Analisisnya
 * dilakukan di sini (`layoutIssues`) supaya bisa diuji tanpa browser.
 */
export interface LayoutBox {
  /** Indeks box leluhur terdekat (-1 bila tidak ada). */
  p: number;
  tag: string;
  /** Deskripsi singkat elemen, mis. `button.zu-btn "Simpan"`. */
  d: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Di dalam elemen fixed/sticky. */
  fx?: boolean;
  /** Di dalam area yang bisa digulir mendatar (mis. pembungkus tabel), jadi boleh lebih lebar dari layar. */
  sc?: boolean;
  /** Elemen inline yang terpecah ke beberapa baris (kotaknya tidak mewakili posisi teks). */
  ml?: boolean;
  /** Punya teks sendiri. */
  txt?: boolean;
  /** Warna teks dan latar efektif (RGBA 0-255, alpha 0-1). bg undefined = tidak bisa diukur (gambar latar). */
  fg?: number[];
  bg?: number[];
  fs?: number;
  fw?: number;
  /** Teks terpotong: "x"/"y" (overflow tersembunyi) atau "ellipsis" (tanpa title). */
  clip?: string;
  /** Gambar gagal dimuat. */
  br?: boolean;
  dis?: boolean;
}

export interface LayoutData {
  /** Lebar dokumen dan lebar layar (tanpa scrollbar). */
  docWidth: number;
  width: number;
  boxes: LayoutBox[];
  /** Elemen dengan atribut style. */
  styled: string[];
  styleTags: number;
  /** Stylesheet selain /_zentara/*. */
  sheets: string[];
  /** Memakai kit UI: body.zu dan /_zentara/ui.css. */
  kit: boolean;
  viewportMeta: boolean;
  /** Halaman bawaan framework (sambutan, error): pemeriksaan kit UI dilewati. */
  framework?: boolean;
}

export type LayoutIssueKind = "overflow" | "overlap" | "truncated" | "image" | "contrast" | "style" | "kit" | "meta";

export interface LayoutIssue {
  kind: LayoutIssueKind;
  message: string;
  /** Baris "(+N lagi)": jumlah temuan sejenis yang tidak ditampilkan. */
  extra?: number;
}

/** Jumlah temuan, termasuk yang diringkas sebagai "(+N lagi)". */
export function issueTotal(issues: LayoutIssue[]): number {
  return issues.reduce((n, i) => n + (i.extra ?? 1), 0);
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
  /** Ukuran layar yang diminta. */
  device?: Viewport;
  layout?: LayoutData;
}

export interface ViewExpect {
  text?: string[];
  selector?: string[];
  /** Tidak ada error console, request gagal, atau status HTTP error. */
  noConsoleErrors?: boolean;
  /** Tidak ada temuan pemeriksaan tampilan. */
  noLayoutIssues?: boolean;
}

/** Hasil dari tab browser: snapshot, atau alasan gagal (mis. iframe diblokir). */
export type BrowserView = { snapshot: PageSnapshot } | { error: string };

export interface PageViewer {
  /** Alamat server aplikasi yang sedang berjalan (dilaporkan oleh server aplikasi saat mulai). */
  appUrl(): string | undefined;
  /** Buka `path` di tab browser yang terhubung. undefined bila tidak ada tab. */
  browser(path: string, options: { selectors?: string[]; viewport?: Viewport; signal?: AbortSignal }): Promise<BrowserView | undefined>;
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
  if (r.device === "mobile" || r.device === "desktop") snapshot.device = r.device;
  const layout = normalizeLayout(r.layout);
  if (layout) snapshot.layout = layout;
  return snapshot;
}

const MAX_BOXES = 600;

function color(value: unknown): number[] | undefined {
  if (!Array.isArray(value) || value.length < 3) return undefined;
  const [r, g, b, a = 1] = value.map(Number);
  if (![r, g, b, a].every((n) => Number.isFinite(n))) return undefined;
  const byte = (n: number) => Math.min(255, Math.max(0, Math.round(n)));
  return [byte(r!), byte(g!), byte(b!), Math.min(1, Math.max(0, a!))];
}

function normalizeLayout(raw: unknown): LayoutData | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;
  const boxes = (Array.isArray(r.boxes) ? r.boxes.slice(0, MAX_BOXES) : [])
    .filter((b): b is Record<string, unknown> => Boolean(b) && typeof b === "object")
    .map((b, i) => {
      const p = num(b.p);
      const box: LayoutBox = { p: p >= 0 && p < i ? p : -1, tag: clip(b.tag, 20).toLowerCase(), d: clip(b.d, 120), x: num(b.x), y: num(b.y), w: num(b.w), h: num(b.h) };
      for (const flag of ["fx", "sc", "ml", "txt", "br", "dis"] as const) if (b[flag]) box[flag] = true;
      const fg = color(b.fg);
      const bg = color(b.bg);
      if (fg) box.fg = fg;
      if (bg) box.bg = bg;
      if (b.fs !== undefined) box.fs = Math.max(0, Number(b.fs) || 0);
      if (b.fw !== undefined) box.fw = num(b.fw);
      if (b.clip === "x" || b.clip === "y" || b.clip === "ellipsis") box.clip = b.clip;
      return box;
    });
  const strings = (value: unknown, max: number) => (Array.isArray(value) ? value.slice(0, 20).map((v) => clip(v, max)) : []);
  return {
    docWidth: num(r.docWidth),
    width: num(r.width),
    boxes,
    styled: Array.isArray(r.styled) ? [...strings(r.styled, 120), ...(r.styled.length > 20 ? [`+${r.styled.length - 20}`] : [])] : [],
    styleTags: num(r.styleTags),
    sheets: strings(r.sheets, 200),
    kit: r.kit === true,
    viewportMeta: r.viewportMeta !== false,
    ...(r.framework ? { framework: true } : {}),
  };
}

function luminance(c: number[]): number {
  const [r, g, b] = c.slice(0, 3).map((v) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Rasio kontras WCAG antara warna teks (boleh transparan) dan latar. */
export function contrastRatio(fg: number[], bg: number[]): number {
  const a = fg[3] ?? 1;
  const mixed = [0, 1, 2].map((i) => fg[i]! * a + bg[i]! * (1 - a));
  const l1 = luminance(mixed);
  const l2 = luminance(bg);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

const OVERLAP_TAGS = new Set(["img", "input", "select", "textarea", "button", "a", "video", "canvas", "svg", "iframe"]);
const MAX_PER_KIND = 6;

/**
 * Pemeriksaan tampilan dari data yang diukur di browser. Setiap jenis temuan dibatasi beberapa contoh
 * (sisanya dihitung), supaya hasilnya tetap ringkas untuk model.
 */
export function layoutIssues(s: PageSnapshot): LayoutIssue[] {
  const layout = s.layout;
  if (!layout) return [];
  const m = t().dev.view.issue;
  const out: LayoutIssue[] = [];
  const boxes = layout.boxes;
  const width = layout.width || s.viewport.w;
  const isAncestor = (a: number, b: number) => {
    for (let p = boxes[b]!.p, guard = 0; p >= 0 && guard < 200; p = boxes[p]!.p, guard++) if (p === a) return true;
    return false;
  };
  const push = (kind: LayoutIssueKind, messages: string[]) => {
    for (const message of messages.slice(0, MAX_PER_KIND)) out.push({ kind, message });
    if (messages.length > MAX_PER_KIND) out.push({ kind, message: t().dev.view.more(messages.length - MAX_PER_KIND), extra: messages.length - MAX_PER_KIND });
  };

  // Keluar dari layar / scroll horizontal: cukup elemen terluar yang menyebabkannya.
  const outside = new Set<number>();
  const overflow: string[] = [];
  boxes.forEach((b, i) => {
    if (b.sc || b.fx || b.w < 2 || b.h < 2) return;
    const right = b.x + b.w - width;
    const left = -b.x;
    const visible = b.x < width && b.x + b.w > 0;
    if (!visible || (right <= 1 && left <= 1)) return;
    outside.add(i);
    if (b.p >= 0 && outside.has(b.p)) return;
    overflow.push(right > 1 ? m.overflowRight(b.d, right) : m.overflowLeft(b.d, left));
  });
  if (layout.docWidth > width + 1 && overflow.length === 0) overflow.push(m.hscroll(layout.docWidth, width));
  push("overflow", overflow);

  // Saling menimpa: dua elemen konten (bukan leluhur satu sama lain) yang kotaknya banyak beririsan.
  const candidates = boxes.map((b, i) => ({ b, i })).filter(({ b }) => !b.fx && !b.ml && b.w >= 4 && b.h >= 4 && (b.txt || OVERLAP_TAGS.has(b.tag)));
  const overlaps: string[] = [];
  for (let x = 0; x < candidates.length && overlaps.length <= MAX_PER_KIND; x++) {
    const A = candidates[x]!;
    for (let y = x + 1; y < candidates.length; y++) {
      const B = candidates[y]!;
      const w = Math.min(A.b.x + A.b.w, B.b.x + B.b.w) - Math.max(A.b.x, B.b.x);
      const h = Math.min(A.b.y + A.b.h, B.b.y + B.b.h) - Math.max(A.b.y, B.b.y);
      if (w <= 0 || h <= 0) continue;
      const area = w * h;
      if (area < 40 || area < 0.3 * Math.min(A.b.w * A.b.h, B.b.w * B.b.h)) continue;
      if (isAncestor(A.i, B.i) || isAncestor(B.i, A.i)) continue;
      overlaps.push(m.overlap(B.b.d, A.b.d));
    }
  }
  push("overlap", overlaps);

  push("truncated", boxes.filter((b) => b.clip).map((b) => m.truncated(b.d)));
  push("image", boxes.filter((b) => b.br).map((b) => m.image(b.d)));

  // Kontras: kelompokkan pasangan warna yang sama (mis. semua sel tabel) agar tidak berulang.
  const contrast = new Map<string, { d: string; ratio: number; min: number; n: number }>();
  for (const b of boxes) {
    if (!b.txt || b.dis || !b.fg || !b.bg) continue;
    const large = (b.fs ?? 16) >= 24 || ((b.fs ?? 16) >= 18.66 && (b.fw ?? 400) >= 700);
    const min = large ? 3 : 4.5;
    const ratio = contrastRatio(b.fg, b.bg);
    if (ratio + 0.005 >= min) continue;
    const key = `${b.fg.join()}|${b.bg.join()}|${min}`;
    const seen = contrast.get(key);
    if (seen) seen.n++;
    else contrast.set(key, { d: b.d, ratio, min, n: 1 });
  }
  push("contrast", [...contrast.values()].map((c) => m.contrast(c.d, c.ratio.toFixed(2), String(c.min)) + (c.n > 1 ? ` ${t().dev.view.more(c.n - 1)}` : "")));

  out.push(...kitIssues(layout));
  return out;
}

/** Temuan yang juga bisa dibaca dari HTML: CSS sendiri, tidak memakai kit UI, dan meta viewport. */
function kitIssues(info: { styled: string[]; styleTags: number; sheets: string[]; kit: boolean; viewportMeta: boolean; framework?: boolean }): LayoutIssue[] {
  if (info.framework) return [];
  const m = t().dev.view.issue;
  const out: LayoutIssue[] = [];
  if (!info.kit) out.push({ kind: "kit", message: m.noKit });
  if (!info.viewportMeta) out.push({ kind: "meta", message: m.noViewportMeta });
  const styled = info.styled.filter((s) => !s.startsWith("+"));
  const extra = info.styled.find((s) => s.startsWith("+"));
  for (const el of styled.slice(0, MAX_PER_KIND)) out.push({ kind: "style", message: m.inlineStyle(el) });
  const hidden = Math.max(0, styled.length - MAX_PER_KIND) + (extra ? Number(extra.slice(1)) || 0 : 0);
  if (hidden) out.push({ kind: "style", message: t().dev.view.more(hidden), extra: hidden });
  if (info.styleTags) out.push({ kind: "style", message: m.styleTag(info.styleTags) });
  for (const href of info.sheets.slice(0, MAX_PER_KIND)) out.push({ kind: "style", message: m.stylesheet(href) });
  return out;
}

function describeElement(e: PageElement): string {
  const v = t().dev.view;
  let head = e.role ? `${e.tag}[role=${e.role}]` : e.tag;
  const attrs = e.attrs ? Object.entries(e.attrs).map(([k, val]) => (val === "true" ? k : `${k}=${JSON.stringify(val)}`)) : [];
  if (attrs.length) head += ` (${attrs.join(" ")})`;
  const text = e.text ? ` ${JSON.stringify(e.text)}` : "";
  const rows = e.rows !== undefined ? ` ${v.rows(e.rows)}` : "";
  return `- ${head}${rows}${text} @${e.x},${e.y} ${e.w}x${e.h}${e.off ? ` ${v.offScreen}` : ""}`;
}

function formatIssues(issues: LayoutIssue[], textOnly: boolean): string[] {
  const v = t().dev.view;
  const lines = [v.layout(issueTotal(issues)), ...issues.map((i) => `- [${i.kind}] ${i.message}`)];
  if (textOnly) lines.push(v.layoutTextOnly);
  return lines;
}

/** Tulis snapshot browser sebagai teks ringkas untuk model (dan `zentara view`). */
export function formatSnapshot(s: PageSnapshot, options: { issues?: LayoutIssue[] } = {}): string {
  const v = t().dev.view;
  const lines = [`${v.browserPage(s.url)}${s.status ? ` (HTTP ${s.status})` : ""}`, `${v.title}: ${s.title || v.none}`];
  if (s.route) lines.push(`${v.routeFile}: ${s.route}`);
  lines.push(`${v.viewport(s.device ?? "", s.viewport.w, s.viewport.h)}${s.docHeight ? `, ${v.pageHeight(s.docHeight)}` : ""}`);
  if (s.note === "no-probe") lines.push(v.noProbe);
  lines.push(v.consoleErrors(s.errors.length));
  for (const e of s.errors) lines.push(`- [${e.kind}] ${e.message}${e.source ? ` (${e.source})` : ""}`);
  lines.push(v.failedRequests(s.failed.length));
  for (const f of s.failed) lines.push(`- ${f.method} ${f.url} -> ${f.status || v.networkError}${f.statusText ? ` ${f.statusText}` : ""}`);
  if (s.layout || options.issues) lines.push(...formatIssues(options.issues ?? layoutIssues(s), false));
  if (s.matches) {
    lines.push(v.selectorMatches);
    for (const [sel, n] of Object.entries(s.matches)) lines.push(`- ${sel}: ${n < 0 ? v.invalidSelector : n}`);
  }
  lines.push(v.visible(s.truncated ? s.elements.length : undefined));
  lines.push(...(s.elements.length ? s.elements.map(describeElement) : [v.none]));
  if (s.text) lines.push(v.pageText, s.text);
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

export interface HtmlFacts {
  styled: string[];
  styleTags: number;
  sheets: string[];
  kit: boolean;
  viewportMeta: boolean;
  framework: boolean;
  /** src gambar lokal (untuk diperiksa apakah bisa dimuat). */
  images: string[];
}

/** Fakta dari HTML untuk pemeriksaan tampilan versi teks (CSS sendiri, kit UI, meta viewport, gambar). */
export function htmlFacts(html: string): HtmlFacts {
  const clean = html.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, "");
  const styled: string[] = [];
  for (const m of clean.matchAll(/<([a-z][\w-]*)\b([^>]*?)\sstyle\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)([^>]*)>/gi)) {
    const attrs = `${m[2]} ${m[4]}`;
    const id = attr(attrs, "id");
    const cls = (attr(attrs, "class") ?? "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
    styled.push(`${m[1]!.toLowerCase()}${id ? `#${id}` : ""}${cls.length ? `.${cls.join(".")}` : ""}`);
  }
  const sheets = [...clean.matchAll(/<link\b([^>]*)>/gi)]
    .filter((m) => /(^|\s)stylesheet(\s|$)/i.test(attr(m[1]!, "rel") ?? ""))
    .map((m) => attr(m[1]!, "href") ?? "")
    .filter((href) => !/^\/_zentara\//.test(href));
  const images = [...clean.matchAll(/<img\b([^>]*)>/gi)].map((m) => attr(m[1]!, "src") ?? "").filter((src) => src.startsWith("/") && !src.startsWith("//"));
  const body = /<body\b([^>]*)>/i.exec(clean);
  return {
    styled,
    styleTags: (clean.match(/<style\b/gi) ?? []).length,
    sheets,
    kit: Boolean(body && /(^|\s)zu(\s|$)/.test(attr(body[1]!, "class") ?? "")) && /\/_zentara\/ui\.css/.test(clean),
    viewportMeta: /<meta\b[^>]*name\s*=\s*["']?viewport/i.test(clean),
    // Halaman sambutan/error pengembangan sudah punya chat sendiri (data-ui="off" dari injectDevTools).
    framework: /window\.ZentaraChat/.test(html) || /\/_zentara\/dev\/widget\.js[^>]*data-ui="off"/.test(html),
    images: [...new Set(images)].slice(0, 10),
  };
}

/** Pemeriksaan tampilan versi teks: CSS sendiri, kit UI, meta viewport, dan gambar lokal yang gagal dimuat. */
export function staticIssues(facts: HtmlFacts, brokenImages: string[] = []): LayoutIssue[] {
  const m = t().dev.view.issue;
  return [...brokenImages.map((src): LayoutIssue => ({ kind: "image", message: m.image(`img ${JSON.stringify(src)}`) })), ...kitIssues(facts)];
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
      lines.push(`- table ${t().dev.view.rows(bodyRows)}${headers.length ? ` [${headers.join(" | ")}]` : ""}`);
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
  /** Temuan pemeriksaan tampilan yang terbaca dari HTML (hanya untuk halaman HTML). */
  issues?: LayoutIssue[];
}

/** Ambil halaman langsung dari server aplikasi (tanpa browser, tanpa cookie login). */
export async function fetchTextView(url: string, options: { timeoutMs?: number; signal?: AbortSignal } = {}): Promise<TextView> {
  const signal = () => AbortSignal.any([AbortSignal.timeout(options.timeoutMs ?? 15_000), ...(options.signal ? [options.signal] : [])]);
  const res = await fetch(url, { redirect: "manual", headers: { Accept: "text/html,application/json;q=0.9,*/*;q=0.8", "X-Zentara-View": "text" }, signal: signal() });
  const contentType = res.headers.get("content-type") ?? "";
  const body = await res.text();
  const view: TextView = { url, status: res.status, contentType, title: "", lines: [], text: "" };
  const location = res.headers.get("location");
  if (location) view.location = location;
  if (contentType.includes("html")) {
    Object.assign(view, htmlOutline(body));
    if (res.status < 300) {
      const facts = htmlFacts(body);
      const broken: string[] = [];
      await Promise.all(
        facts.images.map(async (src) => {
          try {
            const img = await fetch(new URL(src, url), { method: "GET", redirect: "manual", signal: signal() });
            await img.body?.cancel();
            if (img.status >= 400) broken.push(src);
          } catch {
            broken.push(src);
          }
        }),
      );
      view.issues = staticIssues(facts, broken.sort());
    }
  } else view.text = clip(body, MAX_TEXT);
  return view;
}

export function formatTextView(v: TextView): string {
  const m = t().dev.view;
  const lines = [`${m.textPage(v.url)} (HTTP ${v.status})`];
  if (v.location) lines.push(m.redirects(v.location, /login|masuk|signin/i.test(v.location)));
  if (v.title) lines.push(`${m.title}: ${v.title}`);
  if (v.contentType) lines.push(`Content-Type: ${v.contentType}`);
  if (v.issues) lines.push(...formatIssues(v.issues, true));
  if (v.lines.length) lines.push(m.elements, ...v.lines);
  if (v.text) lines.push(m.pageText, v.text);
  return lines.join("\n");
}

function includesText(haystack: string, needle: string): boolean {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/** Periksa harapan (`expect`) terhadap hasil lihat halaman. Mengembalikan baris hasil dan status lulus. */
export function checkExpect(
  expect: ViewExpect,
  view: { snapshot?: PageSnapshot; text?: TextView; issues?: LayoutIssue[] },
): { ok: boolean; lines: string[] } {
  const m = t().dev.view;
  const lines: string[] = [];
  let ok = true;
  const mark = (pass: boolean, text: string) => {
    if (!pass) ok = false;
    lines.push(`${pass ? "PASS" : "FAIL"} ${text}`);
  };
  const s = view.snapshot;
  const allText = s ? [s.title, s.text, ...s.elements.map((e) => `${e.text ?? ""} ${Object.values(e.attrs ?? {}).join(" ")}`)].join("\n") : [view.text?.title, view.text?.text, ...(view.text?.lines ?? [])].join("\n");
  for (const text of expect.text ?? []) mark(includesText(allText, text), m.expectText(text));
  for (const sel of expect.selector ?? []) {
    const n = s?.matches?.[sel];
    if (!s) lines.push(`SKIP ${m.skipSelector(sel)}`);
    else mark(n !== undefined && n > 0, m.expectSelector(sel, n === undefined ? "?" : n < 0 ? m.invalidSelector : String(n)));
  }
  if (expect.noConsoleErrors) {
    if (s) mark(s.errors.length === 0 && s.failed.length === 0 && (s.status ?? 200) < 400, m.expectNoConsoleErrors(s.errors.length, s.failed.length));
    else mark((view.text?.status ?? 500) < 400, m.expectStatus(view.text?.status ?? 0));
  }
  if (expect.noLayoutIssues) {
    const issues = view.issues ?? (s ? layoutIssues(s) : view.text?.issues ?? []);
    mark(issues.length === 0, m.expectNoLayoutIssues(issueTotal(issues)));
  }
  return { ok, lines };
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

/** Ubah input (mis. "/notes" atau "http://localhost:3000/notes") menjadi path + URL lengkap. Hanya localhost. */
export function resolveViewTarget(input: string, base: string): { path: string; url: string } {
  const value = input.trim();
  let url: URL;
  if (/^https?:\/\//i.test(value)) {
    url = new URL(value);
    if (!LOCAL_HOSTS.has(url.hostname)) throw new Error(t().dev.view.onlyLocal(url.hostname));
  } else {
    if (!value.startsWith("/")) throw new Error(t().dev.view.mustStartWithSlash);
    url = new URL(value, base);
  }
  return { path: `${url.pathname}${url.search}`, url: url.href };
}

/** Server aplikasi tidak bisa dihubungi (mis. `zentara dev` tidak berjalan). */
export class ViewUnreachableError extends Error {}

/** Ringkasan satu kali `view_page`, untuk journal tugas AI dan ringkasan di terminal. */
export interface ViewSummary {
  path: string;
  viewport: Viewport;
  mode: "browser" | "text";
  ok: boolean;
  issues: number;
  errors: number;
  failedChecks: number;
}

/** Dipakai tool `view_page` dan `zentara view`: lihat di browser bila ada tab terhubung, bila tidak pakai versi teks. */
export async function viewPage(
  input: { path: string; viewport?: Viewport; expect?: ViewExpect },
  viewer: PageViewer | undefined,
  options: { fallbackBase: string; signal?: AbortSignal; changedAt?: number },
): Promise<{ text: string; ok: boolean; mode: "browser" | "text"; summary: ViewSummary }> {
  const m = t().dev.view;
  // Kode baru saja diubah: tunggu server dev dimulai ulang agar yang dilihat adalah versi terbaru.
  if (viewer && options.changedAt) await viewer.waitForApp(options.changedAt, { signal: options.signal });
  const base = viewer?.appUrl() ?? options.fallbackBase;
  const target = resolveViewTarget(input.path, base);
  const viewport = input.viewport ?? "desktop";
  const expect = input.expect ?? {};
  const notes: string[] = [];
  const header = (summary: ViewSummary) =>
    `RESULT ${summary.ok ? "ok" : "fail"} · ${summary.mode} · ${summary.viewport} · ${m.issueCount(summary.issues)}${summary.failedChecks ? ` · ${summary.failedChecks} FAIL` : ""}`;
  const browser = viewer ? await viewer.browser(target.path, { selectors: expect.selector, viewport, signal: options.signal }) : undefined;
  if (browser && "snapshot" in browser) {
    const snapshot = { ...browser.snapshot, device: viewport };
    const issues = layoutIssues(snapshot);
    const check = checkExpect(expect, { snapshot, issues });
    const counted = issueTotal(issues);
    const errors = snapshot.errors.length + snapshot.failed.length + ((snapshot.status ?? 200) >= 400 ? 1 : 0);
    const summary: ViewSummary = { path: target.path, viewport, mode: "browser", ok: check.ok && counted === 0 && errors === 0, issues: counted, errors, failedChecks: check.lines.filter((l) => l.startsWith("FAIL")).length };
    return { text: [header(summary), formatSnapshot(snapshot, { issues }), ...(check.lines.length ? [m.checks, ...check.lines] : [])].join("\n"), ok: summary.ok, mode: "browser", summary };
  }
  if (browser) notes.push(m.browserFailed(browser.error));
  else notes.push(m.noTab);
  if (viewport === "mobile") notes.push(m.mobileTextOnly);
  let view: TextView;
  try {
    view = await fetchTextView(target.url, { signal: options.signal });
  } catch (err) {
    throw new ViewUnreachableError(m.unreachable(target.url, (err as Error).message));
  }
  const check = checkExpect(expect, { text: view });
  const issues = issueTotal(view.issues ?? []);
  const errors = view.status >= 400 ? 1 : 0;
  const summary: ViewSummary = {
    path: target.path,
    viewport,
    mode: "text",
    ok: check.ok && issues === 0 && errors === 0,
    issues,
    errors,
    failedChecks: check.lines.filter((l) => l.startsWith("FAIL")).length,
  };
  return { text: [header(summary), ...notes, formatTextView(view), ...(check.lines.length ? [m.checks, ...check.lines] : [])].join("\n"), ok: summary.ok, mode: "text", summary };
}
