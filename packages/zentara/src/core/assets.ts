import type { IncomingMessage, ServerResponse } from "node:http";
import { FAVICON_PNG, LOGO_WEBP } from "../brand/assets.js";
import { UI_CSS } from "../ui/styles.js";

interface Asset {
  type: string;
  body: Buffer;
}

function fromDataUri(uri: string): Buffer {
  return Buffer.from(uri.slice(uri.indexOf(",") + 1), "base64");
}

let assets: Map<string, Asset> | undefined;

/** Aset bawaan framework di /_zentara/* (stylesheet kit UI, logo, favicon). Dibuat sekali saat pertama diminta. */
function builtinAssets(): Map<string, Asset> {
  assets ??= new Map([
    ["/_zentara/ui.css", { type: "text/css; charset=utf-8", body: Buffer.from(UI_CSS.trim()) }],
    ["/_zentara/logo.webp", { type: "image/webp", body: fromDataUri(LOGO_WEBP) }],
    ["/_zentara/favicon.png", { type: "image/png", body: fromDataUri(FAVICON_PNG) }],
  ]);
  return assets;
}

/** Kirim aset bawaan bila path cocok. Mengembalikan false bila bukan aset bawaan. */
export function sendBuiltinAsset(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
  const asset = builtinAssets().get(pathname);
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
