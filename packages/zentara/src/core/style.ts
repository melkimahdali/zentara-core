import fs from "node:fs";
import path from "node:path";

let cache: { file: string; mtimeMs: number; css: string } | undefined;

/**
 * Baca `zenstyles/app.zs.css`. Dibaca ulang bila file berubah, jadi aman dipakai saat dev.
 *
 * @deprecated Pakai kit UI `zentara/ui` (page, AppShell, dan komponennya). Tetap ada agar proyek
 * lama tidak rusak; template baru tidak lagi membawa folder `zenstyles/`.
 */
export function loadZenStyles(file = path.join(process.cwd(), "zenstyles", "app.zs.css")): string {
  let stat: fs.Stats;
  try {
    stat = fs.statSync(file);
  } catch {
    return "";
  }
  if (cache && cache.file === file && cache.mtimeMs === stat.mtimeMs) return cache.css;
  const css = fs.readFileSync(file, "utf8");
  cache = { file, mtimeMs: stat.mtimeMs, css };
  return css;
}
