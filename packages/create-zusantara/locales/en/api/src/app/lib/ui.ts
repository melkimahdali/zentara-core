import { h, type Child, type ZenContext } from "zusantara";
import { AppShell, page, type NavItem } from "zusantara/ui";
import type { User } from "../db/schema.js";

/** App name in page titles and the top navigation. */
export const APP_NAME = "Zusantara App";

/** Top navigation; the "Manage" section is for admins only. Add your new pages here. */
function navFor(user: User): NavItem[] {
  const nav: NavItem[] = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/notes", label: "Notes" },
  ];
  if (user.role === "admin") nav.push({ href: "/admin/users", label: "Users", section: "Manage" });
  return nav;
}

export interface AppPageOptions {
  title: string;
  subtitle?: string;
  /** href of the active navigation item. */
  active: string;
  actions?: Child;
}

/** App page for signed-in users (used with requireUserPage/requireAdminPage). */
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

/** Today's date, e.g. "Thursday, September 25, 2026". */
export function today(): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "full" }).format(new Date());
}

/** Short relative time, e.g. "5 minutes ago" or "yesterday"; older than a week uses the date. */
export function relativeDate(date: Date, now = new Date()): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat("en-US", { numeric: "auto" });
  const abs = Math.abs(seconds);
  if (abs < 60) return "just now";
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86_400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86_400) return rtf.format(Math.round(seconds / 86_400), "day");
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

/** One-line excerpt for lists. */
export function excerpt(text: string, max = 90): string {
  const line = text.replace(/\s+/g, " ").trim();
  return line.length > max ? `${line.slice(0, max - 1).trimEnd()}…` : line;
}
