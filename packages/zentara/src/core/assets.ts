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

/** Aset bawaan framework di /_zentara/* (stylesheet kit UI, font brand + lisensinya, logo, favicon). Dibuat sekali saat pertama diminta. */
function builtinAssets(): Map<string, Asset> {
  assets ??= new Map([
    ["/_zentara/ui.css", { type: "text/css; charset=utf-8", body: Buffer.from(UI_CSS.trim()) }],
    ["/_zentara/logo.webp", { type: "image/webp", body: fromDataUri(LOGO_WEBP) }],
    ["/_zentara/favicon.png", { type: "image/png", body: fromDataUri(FAVICON_PNG) }],
    ["/_zentara/fonts/plus-jakarta-sans-latin.woff2", { type: "font/woff2", body: Buffer.from(FONT_LATIN, "base64") }],
    ["/_zentara/fonts/plus-jakarta-sans-latin-ext.woff2", { type: "font/woff2", body: Buffer.from(FONT_LATIN_EXT, "base64") }],
    ["/_zentara/fonts/LICENSE.txt", { type: "text/plain; charset=utf-8", body: Buffer.from(FONT_LICENSE) }],
  ]);
  return assets;
}

/** Kirim aset bawaan bila path cocok. Mengembalikan false bila bukan aset bawaan. */
export function sendBuiltinAsset(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
  // Tema dari config: URL-nya memuat hash isi (?v=), jadi aman disimpan lama seperti ui.css.
  const asset = pathname === "/_zentara/theme.css" ? { type: "text/css; charset=utf-8", body: Buffer.from(activeTheme().css) } : builtinAssets().get(pathname);
  if (!asset) return false;
  res.statusCode = 200;
  res.setHeader("Content-Type", asset.type);
  res.setHeader("Content-Length", asset.body.length);
  // URL stylesheet memuat versi zentara (?v=), jadi aman disimpan lama oleh browser.
  res.setHeader("Cache-Control", "public, max-age=86400");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(req.method === "HEAD" ? undefined : asset.body);
  return true;
}
