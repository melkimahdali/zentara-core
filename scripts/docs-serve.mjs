// Pratinjau lokal situs dokumentasi (site-dist/) di http://localhost:4173
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "site-dist");
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".json": "application/json" };
http
  .createServer((req, res) => {
    const name = decodeURIComponent((req.url ?? "/").split("?")[0]).replace(/^\/+/, "") || "index.html";
    const file = path.join(DIR, name);
    if (!file.startsWith(DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return res.writeHead(404).end("404");
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream" }).end(fs.readFileSync(file));
  })
  .listen(4173, () => console.log("Dokumentasi: http://localhost:4173"));
