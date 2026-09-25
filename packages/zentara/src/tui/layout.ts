import { visibleWidth } from "../brand/index.js";
import type { Item } from "./store.js";

/**
 * Perhitungan tata letak layar penuh yang murni (tanpa React), agar bisa diuji langsung.
 *
 * Layar dibagi tiga seksi vertikal:
 *   1. header terkunci (logo ringkas, versi, status AI & server, garis pembatas);
 *   2. log percakapan: hanya item yang muat di layar yang dirender, sisanya bisa digulir (PgUp/PgDn);
 *   3. input interaktif (kotak input, menu, atau dialog persetujuan) dan baris status.
 */

/** Tinggi minimum terminal untuk mode layar penuh; di bawahnya CLI memakai tata letak biasa. */
export const MIN_FULLSCREEN_ROWS = 12;

/** Karakter ANSI standar: hapus layar lalu pindahkan kursor ke pojok kiri atas. Aman untuk terminal cloud. */
export const CLEAR_SCREEN = "\u001b[2J\u001b[0;0H";

/**
 * Tinggi frame layar penuh: satu baris lebih pendek dari terminal. Frame yang persis setinggi layar
 * membuat Ink membersihkan seluruh terminal di setiap render (berkedip, terutama di Windows).
 */
export function frameHeight(rows: number): number {
  return Math.max(MIN_FULLSCREEN_ROWS - 1, rows - 1);
}

/** Jumlah baris layar untuk teks (bisa berisi \n dan kode warna ANSI) pada lebar tertentu. */
export function wrappedLines(text: string, width: number): number {
  const w = Math.max(1, width);
  return text.split("\n").reduce((n, line) => n + Math.max(1, Math.ceil(visibleWidth(line) / w)), 0);
}

/** Perkiraan tinggi satu item log (termasuk margin atasnya) pada lebar terminal `columns`. */
export function itemHeight(item: Item, columns: number): number {
  switch (item.kind) {
    case "header":
      return 0;
    case "user":
      return 1 + wrappedLines(`❯ ${item.text}`, columns);
    case "assistant":
      return (item.first ? 1 : 0) + item.lines.reduce((n, line) => n + wrappedLines(`  ${line}`, columns), 0);
    case "tool":
      return wrappedLines(`⏺ ${item.title}`, columns);
    case "toolEnd":
      return wrappedLines(`  ⎿  ${item.summary}`, columns);
    case "notice":
      return wrappedLines(item.text, columns - 2);
  }
}

export interface LogWindow {
  /** Indeks item pertama yang dirender (inklusif). */
  start: number;
  /** Indeks setelah item terakhir yang dirender (eksklusif). */
  end: number;
  /** Jumlah item di atas jendela (belum terlihat). */
  above: number;
  /** Jumlah item di bawah jendela (saat pengguna menggulir ke atas). */
  below: number;
}

/**
 * Item mana yang dirender di log. Dihitung mundur dari `end` sampai tinggi `height` terisi; item
 * teratas boleh terpotong (bagian atasnya dipangkas oleh overflow). Hanya item yang terlihat yang
 * dirender, jadi riwayat yang panjang tidak memperlambat setiap frame.
 */
export function logWindow(items: readonly Item[], options: { height: number; columns: number; end?: number }): LogWindow {
  const end = Math.min(items.length, Math.max(0, options.end ?? items.length));
  let start = end;
  let used = 0;
  while (start > 0 && used < options.height) {
    start--;
    used += itemHeight(items[start]!, options.columns);
  }
  const visibleFrom = items.findIndex((item) => item.kind !== "header");
  const first = visibleFrom === -1 ? items.length : visibleFrom;
  return { start, end, above: Math.max(0, start - first), below: items.length - end };
}

/** Posisi akhir jendela setelah PgUp (naik kira-kira satu layar), atau undefined bila tidak bisa naik. */
export function scrollUp(items: readonly Item[], options: { height: number; columns: number; end?: number }): number | undefined {
  const current = logWindow(items, options);
  if (current.above === 0) return options.end;
  const half = Math.max(1, Math.floor((current.end - current.start) / 2));
  // Selalu maju minimal satu item, tetapi tidak melompati item teratas yang sedang terlihat.
  return Math.max(1, Math.min(current.end - 1, Math.max(current.start + 1, current.end - half)));
}

/** Posisi akhir jendela setelah PgDn; undefined = kembali mengikuti pesan terbaru. */
export function scrollDown(items: readonly Item[], options: { height: number; columns: number; end?: number }): number | undefined {
  if (options.end === undefined) return undefined;
  let next = options.end;
  let used = 0;
  while (next < items.length && used < Math.max(1, Math.floor(options.height / 2))) {
    used += itemHeight(items[next]!, options.columns);
    next++;
  }
  return next >= items.length ? undefined : next;
}
