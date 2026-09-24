import fs from "node:fs";
import path from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf",
  ".webmanifest": "application/manifest+json",
};

/**
 * Cari file di `publicDir` untuk pathname (ter-encode). Mengembalikan path absolut
 * atau `undefined`; tidak pernah keluar dari `publicDir` dan menolak dotfile.
 */
export async function resolveStaticFile(publicDir: string, pathname: string): Promise<string | undefined> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  if (decoded.includes("\0")) return undefined;

  const root = path.resolve(publicDir);
  const file = path.resolve(root, "." + path.posix.normalize("/" + decoded.replace(/\\/g, "/")));
  if (file !== root && !file.startsWith(root + path.sep)) return undefined;
  if (path.relative(root, file).split(path.sep).some((part) => part.startsWith("."))) return undefined;

  try {
    const stat = await fs.promises.stat(file);
    return stat.isFile() ? file : undefined;
  } catch {
    return undefined;
  }
}

export async function sendStaticFile(req: IncomingMessage, res: ServerResponse, file: string): Promise<void> {
  const stat = await fs.promises.stat(file);
  res.statusCode = 200;
  res.setHeader("Content-Type", MIME_TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream");
  res.setHeader("Content-Length", stat.size);
  res.setHeader("Last-Modified", stat.mtime.toUTCString());
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method === "HEAD") {
    res.end();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(file);
    stream.on("error", reject);
    res.on("close", resolve);
    stream.pipe(res);
  });
}
