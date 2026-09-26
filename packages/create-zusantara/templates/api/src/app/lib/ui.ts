import { h, type Child, type ZenContext } from "zusantara";
import { AppShell, page, type NavItem } from "zusantara/ui";
import type { User } from "../db/schema.js";

/** Nama aplikasi di judul halaman dan navigasi atas. */
export const APP_NAME = "Zusantara App";

/** Menu navigasi atas; bagian "Kelola" hanya untuk admin. Tambahkan halaman baru Anda di sini. */
function navFor(user: User): NavItem[] {
  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dasbor" },
    { href: "/notes", label: "Catatan" },
  ];
  if (user.role === "admin") nav.push({ href: "/admin/users", label: "Pengguna", section: "Kelola" });
  return nav;
}

export interface AppPageOptions {
  title: string;
  subtitle?: string;
  /** href menu yang aktif di navigasi. */
  active: string;
  actions?: Child;
}

/** Halaman aplikasi untuk user yang sudah login (dipakai bersama requireUserPage/requireAdminPage). */
export function appPage(ctx: ZenContext, options: AppPageOptions, ...children: Child[]): string {
  const user = ctx.state.user as User;
  return page(
    { title: `${options.title} · ${APP_NAME}` },
    h(
      AppShell,
      {
        appName: APP_NAME,
        nav: navFor(user),
        active: options.active,
        user: { name: user.name, email: user.email, role: user.role },
        title: options.title,
        subtitle: options.subtitle,
        actions: options.actions,
      },
      children,
    ),
  );
}

/** Tanggal hari ini dalam bahasa Indonesia, mis. "Kamis, 25 September 2026". */
export function today(): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "full" }).format(new Date());
}

/** Waktu relatif singkat, mis. "5 menit yang lalu" atau "kemarin"; lebih dari seminggu memakai tanggal. */
export function relativeDate(date: Date, now = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("id-ID", { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return "baru saja";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return rtf.format(Math.round(seconds / 86_400), "day");
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date);
}

/** Potongan teks satu baris untuk daftar. */
export function excerpt(text: string, max = 90): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
