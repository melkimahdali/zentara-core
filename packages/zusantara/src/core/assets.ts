import type { IncomingMessage, ServerResponse } from "node:http";
import { FAVICON_PNG, LOGO_WEBP } from "../brand/assets.js";
import { FONT_LATIN, FONT_LATIN_EXT, FONT_LICENSE } from "../ui/font.js";
import { UI_CSS } from "../ui/styles.js";
import { activeTheme } from "../ui/theme.js";

interface Asset {
  type: string;
  body: Buffer;
}

function fromDataUri(uri: string): Buffer {
  return Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64");
}

let assets: Map<string, Asset> | undefined;

/** Aset bawaan framework di /_zusantara/* (stylesheet kit UI, font brand + lisensinya, logo, favicon). Dibuat sekali saat pertama diminta. */
function builtinAssets(): Map<string, Asset> {
  assets ??= new Map([
    ["/_zusantara/ui.css", { type: "text/css; charset=utf-8", body: Buffer.from(UI_CSS.trim()) }],
    ["/_zusantara/logo.webp", { type: "image/webp", body: fromDataUri(LOGO_WEBP) }],
    ["/_zusantara/favicon.png", { type: "image/png", body: fromDataUri(FAVICON_PNG) }],
    ["/_zusantara/fonts/plus-jakarta-sans-latin.woff2", { type: "font/woff2", body: Buffer.from(FONT_LATIN, "base64") }],
    ["/_zusantara/fonts/plus-jakarta-sans-latin-ext.woff2", { type: "font/woff2", body: Buffer.from(FONT_LATIN_EXT, "base64") }],
    ["/_zusantara/fonts/LICENSE.txt", { type: "text/plain; charset=utf-8", body: Buffer.from(FONT_LICENSE) }],
  ]);
  return assets;
}

/**
 * Gambar contoh /_zusantara/placeholder.svg?text=&w=&h= untuk purwarupa (lihat placeholder() di kit UI):
 * kotak abu-abu berukuran w×h dengan teks di tengah. Teks di-escape sebagai XML dan dibatasi panjangnya.
 */
export function placeholderSvg(query: URLSearchParams): Buffer {
  const size = (value: string | null, fallback: number) => {
    const n = Math.round(Number(value));
    return Number.isFinite(n) && n >= 16 && n <= 4000 ? n : fallback;
  };
  const w = size(query.get("w"), 800);
  const h = size(query.get("h"), 600);
  const raw = (query.get("text") ?? "").replace(/\s+/g, " ").trim().slice(0, 60);
  const label = raw || `${w}×${h}`;
  const text = label.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const font = Math.max(12, Math.min(Math.round((w * 0.8) / Math.max(label.length * 0.62, 6)), Math.round(h / 5), 64));
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="100%" height="100%" fill="#e4eae6"/>` +
    `<path d="M0 ${h}L${Math.round(w * 0.35)} ${Math.round(h * 0.55)}L${Math.round(w * 0.55)} ${Math.round(h * 0.75)}L${Math.round(w * 0.75)} ${Math.round(h * 0.5)}L${w} ${Math.round(h * 0.8)}V${h}Z" fill="#d3dcd7"/>` +
    `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600" font-size="${font}" fill="#56686a">${text}</text>` +
    `</svg>`;
  return Buffer.from(svg);
}

/** Kirim aset bawaan bila path cocok. Mengembalikan false bila bukan aset bawaan. */
export function sendBuiltinAsset(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
  if (pathname === "/_zusantara/placeholder.svg") {
    const body = placeholderSvg(new URL(req.url ?? "/", "http://x").searchParams);
    res.statusCode = 200;
    res.setHeader("Content-Type", "image/svg+xml; charset=utf-8");
    res.setHeader("Content-Length", body.length);
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.setHeader("X-Content-Type-Options", "nosniff");
    // SVG yang dibuka langsung tidak boleh menjalankan skrip apa pun.
    res.setHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'; sandbox");
    res.end(req.method === "HEAD" ? undefined : body);
    return true;
  }
  // Tema dari config: URL-nya memuat hash isi (?v=), jadi aman disimpan lama seperti ui.css.
  const asset = pathname === "/_zusantara/theme.css" ? { type: "text/css; charset=utf-8", body: Buffer.from(activeTheme().css) } : builtinAssets().get(pathname);
  if (!asset) return false;
  res.statusCode = 200;
  res.setHeader("Content-Type", asset.type);
  res.setHeader("Content-Length", asset.body.length);
  // URL stylesheet memuat versi zusantara (?v=), jadi aman disimpan lama oleh browser.
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(req.method === "HEAD" ? undefined : asset.body);
  return true;
}
