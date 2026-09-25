import { h, type Child, type ZenContext } from "zentara";
import { AppShell, page, type NavItem } from "zentara/ui";
import type { User } from "../db/schema.js";

/** Nama aplikasi di judul halaman dan sidebar. */
export const APP_NAME = "Zentara App";

/** Menu sidebar; bagian "Kelola" hanya untuk admin. */
function navFor(user: User): NavItem[] {
  const nav: NavItem[] = [{ href: "/dashboard", label: "Dasbor" }];
  if (user.role === "admin") {
    nav.push({ href: "/admin/products", label: "Produk", section: "Kelola" }, { href: "/admin/users", label: "Pengguna" });
  }
  return nav;
}

export interface AppPageOptions {
  title: string;
  subtitle?: string;
  /** href menu yang aktif di sidebar. */
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

/** Pesan singkat setelah redirect (?pesan=kode). Hanya kode yang dikenal yang ditampilkan, bukan teks bebas dari URL. */
export function flash(ctx: ZenContext, messages: Record<string, string>): string | undefined {
  const code = ctx.query.pesan;
  return typeof code === "string" ? messages[code] : undefined;
}
