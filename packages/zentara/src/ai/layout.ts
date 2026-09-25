import fs from "node:fs";
import path from "node:path";

/**
 * Pengetahuan tentang tata letak (layout) proyek untuk Zentara AI, agar halaman baru memakai layout
 * yang sudah ada (appPage di src/app/lib/ui.ts atau page() dari zentara/ui), bukan membuat HTML dan
 * CSS sendiri.
 */

const LAYOUT_FILES = ["src/app/lib/ui.ts", "src/app/lib/ui.tsx"];
const ROUTES_DIR = "src/app/routes";

export interface ProjectLayout {
  /** File layout proyek, mis. "src/app/lib/ui.ts". */
  file: string;
  /** Nama yang diekspor file itu, mis. ["appPage", "APP_NAME"]. */
  exports: string[];
  /** Satu route yang sudah memakai appPage(), sebagai contoh untuk ditiru. */
  example?: string;
}

const toPosix = (p: string) => p.split(path.sep).join("/");

/** Daftar file route (relatif ke root, posix), paling banyak `limit`. */
export function routeFiles(root: string, limit = 60): string[] {
  const out: string[] = [];
  const walk = (dir: string) => {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    } catch {
      return;
    }
    for (const e of entries) {
      if (out.length >= limit) return;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(toPosix(path.relative(root, full)));
    }
  };
  walk(path.join(root, ROUTES_DIR));
  return out;
}

/** Cari layout proyek (src/app/lib/ui.ts) beserta ekspornya dan satu contoh route yang memakainya. */
export function findLayout(root: string): ProjectLayout | undefined {
  const file = LAYOUT_FILES.find((f) => fs.existsSync(path.join(root, f)));
  if (!file) return undefined;
  let source = "";
  try {
    source = fs.readFileSync(path.join(root, file), "utf8");
  } catch {
    return undefined;
  }
  const exports = [...source.matchAll(/^export\s+(?:async\s+)?(?:function\*?|const|let|class)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]!);
  let example: string | undefined;
  if (exports.includes("appPage")) {
    for (const route of routeFiles(root)) {
      try {
        if (/\bappPage\(/.test(fs.readFileSync(path.join(root, route), "utf8"))) {
          example = route;
          break;
        }
      } catch {
        // abaikan file yang tidak bisa dibaca
      }
    }
  }
  return { file, exports, example };
}

/** Baris ringkasan proyek tentang layout & route (bahasa Inggris, untuk model). */
export function layoutSnapshot(root: string): string[] {
  const lines: string[] = [];
  const layout = findLayout(root);
  if (layout) {
    const uses = layout.exports.includes("appPage")
      ? `Every signed-in page MUST use appPage(ctx, { title, active }, ...children) from ${layout.file}; public pages use page() from "zentara/ui". Add new pages to the navigation menu in navFor() in ${layout.file}.`
      : `Reuse it for new pages instead of writing your own layout.`;
    lines.push(`App layout: ${layout.file} exports ${layout.exports.join(", ") || "-"}. ${uses}`);
    if (layout.example) lines.push(`Example page to follow: ${layout.example} (read it before creating a similar page).`);
  } else {
    lines.push(`App layout: none yet. Build full pages with page() and the components from "zentara/ui".`);
  }
  const routes = routeFiles(root);
  if (routes.length) lines.push(`Routes: ${routes.map((r) => r.slice(ROUTES_DIR.length + 1)).join(", ")}`);
  if (fs.existsSync(path.join(root, "zenstyles"))) lines.push(`zenstyles/ is a legacy stylesheet: do not use it (or loadZenStyles) for new pages.`);
  return lines;
}

/** Route yang membangun dokumen HTML atau CSS sendiri (tanda layout dibuat ulang). */
const OWN_LAYOUT = /<!doctype\s+html|<html[\s>]|<head[\s>]|<style[\s>]|<link[^>]+rel=["']?stylesheet|h\(\s*["'](?:html|head|style)["']/i;

/**
 * Catatan untuk model bila file route yang baru ditulis membuat layout sendiri. Dikembalikan bersama
 * hasil tool agar model memperbaikinya sebelum selesai. undefined = tidak ada masalah.
 */
export function layoutWarning(root: string, rel: string, content: string): string | undefined {
  if (!rel.startsWith(`${ROUTES_DIR}/`) || !/\.(ts|tsx|js|mjs)$/.test(rel)) return undefined;
  if (!OWN_LAYOUT.test(content)) return undefined;
  const layout = findLayout(root);
  const use = layout?.exports.includes("appPage")
    ? `appPage(ctx, { title, active }, ...children) from ${layout.file} (signed-in pages) or page() from "zentara/ui" (public pages)`
    : `page({ title }, ...body) and the components from "zentara/ui"`;
  return `Note: ${rel} builds its own HTML document or CSS (<html>, <head>, <style>, or a stylesheet). This project has a shared layout: use ${use} and remove the custom document/CSS, unless the developer explicitly asked for a custom design. Fix it now with edit_file.`;
}
