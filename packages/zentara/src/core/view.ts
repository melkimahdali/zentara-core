import { t } from "../i18n/index.js";
export type Props = Record<string, unknown>;
export type Component<P extends Props = Props> = (props: P & { children: Child[] }) => Child;

export interface ZenElement {
  type: string | Component<any>;
  props: Props;
  children: Child[];
}

const RAW = Symbol("zentara.raw");
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

export function h(type: string | Component<any>, props?: Props | null, ...children: Child[]): ZenElement {
  return { type, props: props ?? {}, children };
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
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string") return escapeHtml(node);
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(renderToString).join("");
  if (isRaw(node)) return node.html;

  if (typeof node.type === "function") {
    return renderToString(node.type({ ...node.props, children: node.children }));
  }

  const tag = node.type;
  if (!TAG_NAME.test(tag)) throw new Error(t().core.tagInvalid(JSON.stringify(tag)));
  const attrs = renderAttrs(node.props);
  if (VOID_ELEMENTS.has(tag.toLowerCase())) return `<${tag}${attrs}>`;
  return `<${tag}${attrs}>${renderToString(node.children)}</${tag}>`;
}
