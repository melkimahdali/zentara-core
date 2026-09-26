import path from "node:path";
import { fileURLToPath } from "node:url";
import { t } from "../i18n/index.js";
export type Props = Record<string, unknown>;
export type Component<P extends Props = Props> = (props: P & { children: Child[] }) => Child;

export interface ZenElement {
  type: string | Component<any>;
  props: Props;
  children: Child[];
}

const RAW = Symbol("zusantara.raw");
export interface RawHtml {
  readonly [RAW]: true;
  readonly html: string;
}

export type Child = ZenElement | RawHtml | string | number | boolean | null | undefined | Child[];

const VOID_ELEMENTS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
]);
const TAG_NAME = /^[A-Za-z][A-Za-z0-9-]*$/;
const ATTR_NAME = /^[^\s"'<>/=\u0000-\u001f]+$/;

const ESCAPES: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ESCAPES[c]!);
}

/** Tandai string sebagai HTML tepercaya agar tidak di-escape. Jangan pernah dipakai untuk input pengguna. */
export function raw(html: string): RawHtml {
  return { [RAW]: true, html };
}

function isRaw(node: unknown): node is RawHtml {
  return typeof node === "object" && node !== null && RAW in node;
}

// ── Sumber elemen (mode inspeksi saat pengembangan) ──────────────────────
// Bila aktif, setiap h() yang dipanggil dari kode aplikasi mencatat file:baris pemanggilnya, dan elemen
// HTML-nya mendapat atribut data-zsrc. Hanya dinyalakan runtime saat `zusantara dev` dengan devtools.

const SRC = Symbol("zusantara.src");
/** Kode framework (src/ atau dist/ paket zusantara): pemanggilan dari sini bukan kode aplikasi. */
const PACKAGE_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FRAME = /\(?((?:file:\/\/)?(?:\/|[A-Za-z]:[\\/])[^():]*?(?::[^():\d][^():]*)*):(\d+):\d+\)?\s*$/;
const NO_SOURCE_TAGS = new Set(["html", "head", "body", "script", "style", "meta", "link", "title", "template"]);
let sourceRoot: string | undefined;

/** Nyalakan (dengan folder proyek) atau matikan pencatatan sumber elemen. */
export function setSourceTracking(root: string | undefined): void {
  sourceRoot = root ? path.resolve(root) : undefined;
}

function callSite(): string | undefined {
  const limit = Error.stackTraceLimit;
  Error.stackTraceLimit = 4;
  const stack = new Error().stack;
  Error.stackTraceLimit = limit;
  // Baris 0 "Error", 1 callSite, 2 h, 3 pemanggil h(). Hanya pemanggil langsung yang berupa kode aplikasi.
  const m = FRAME.exec(stack?.split("\n")[3] ?? "");
  if (!m) return undefined;
  const file = m[1]!.startsWith("file://") ? fileURLToPath(m[1]!) : m[1]!;
  if (file.startsWith(PACKAGE_DIR + path.sep) || file.includes(`${path.sep}node_modules${path.sep}`)) return undefined;
  const rel = path.relative(sourceRoot!, file);
  if (rel.startsWith("..") || path.isAbsolute(rel)) return undefined;
  return `${rel.split(path.sep).join("/")}:${m[2]}`;
}

export function h(type: string | Component<any>, props?: Props | null, ...children: Child[]): ZenElement {
  const el: ZenElement = { type, props: props ?? {}, children };
  if (sourceRoot) {
    const at = callSite();
    if (at) Object.defineProperty(el, SRC, { value: at, enumerable: false });
  }
  return el;
}

/** file:baris tempat elemen dibuat (hanya saat pencatatan sumber aktif). */
export function elementSource(el: ZenElement): string | undefined {
  return (el as unknown as Record<symbol, string | undefined>)[SRC];
}

export function Fragment({ children }: { children: Child[] }): Child {
  return children;
}

function renderAttrs(props: Props): string {
  let out = "";
  for (const [rawKey, value] of Object.entries(props)) {
    if (rawKey === "children" || value === undefined || value === null || value === false) continue;
    if (typeof value === "function") continue;
    const key = rawKey === "className" ? "class" : rawKey === "htmlFor" ? "for" : rawKey;
    if (!ATTR_NAME.test(key)) throw new Error(t().core.attrInvalid(JSON.stringify(key)));
    out += value === true ? ` ${key}` : ` ${key}="${escapeHtml(String(value))}"`;
  }
  return out;
}

/** Render pohon elemen ke string HTML. Semua teks dan nilai atribut di-escape. */
export function renderToString(node: Child): string {
  return render(node, undefined);
}

/** `inherited` = sumber komponen yang menghasilkan node ini (untuk elemen akar keluaran komponen). */
function render(node: Child, inherited: string | undefined): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return escapeHtml(node);
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map((n) => render(n, inherited)).join("");
  if (isRaw(node)) return node.html;

  if (typeof node.type === "function") {
    return render(node.type({ ...node.props, children: node.children }), elementSource(node) ?? inherited);
  }

  const tag = node.type;
  if (!TAG_NAME.test(tag)) throw new Error(t().core.tagInvalid(JSON.stringify(tag)));
  const at = sourceRoot ? elementSource(node) ?? inherited : undefined;
  const attrs = renderAttrs(at && !NO_SOURCE_TAGS.has(tag.toLowerCase()) ? { ...node.props, "data-zsrc": at } : node.props);
  if (VOID_ELEMENTS.has(tag.toLowerCase())) return `<${tag}${attrs}>`;
  return `<${tag}${attrs}>${render(node.children, undefined)}</${tag}>`;
}
