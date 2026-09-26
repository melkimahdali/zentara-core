/**
 * Admin dashboard
 * Signed-in page: the AppShell frame, key numbers with trends, a table of recent orders with their
 * status, and an activity history.
 */
import { h } from "../../../core/view.js";
import { AppShell, Badge, Button, Card, money, page, Split, Stat, StatGroup, Table, Timeline } from "../../index.js";

// In a real app: numbers and orders from the database, the user from ctx.state.user.
const orders = [
  { code: "INV-1042", customer: "Rina Wulandari", total: 34, status: "Paid" },
  { code: "INV-1041", customer: "Budi Santoso", total: 19.5, status: "Pending" },
  { code: "INV-1040", customer: "Maya Lestari", total: 62, status: "Shipped" },
];
const tone = { Paid: "ok", Pending: "warn", Shipped: "accent" } as const;

export function GET() {
  return page(
    { title: "Dashboard · Homeland Store" },
    h(
      AppShell,
      {
        appName: "Homeland Store",
        nav: [
          { href: "/admin", label: "Dashboard" },
          { href: "/admin/orders", label: "Orders" },
          { href: "/admin/products", label: "Products" },
          { href: "/admin/settings", label: "Settings", section: "Account" },
        ],
        active: "/admin",
        user: { name: "Sari Dewi", email: "sari@homeland.id" },
        title: "Dashboard",
        subtitle: "Today's store summary",
        actions: h(Button, { href: "/admin/products/new", small: true }, "Add product"),
      },
      h(
        StatGroup,
        null,
        h(Stat, { label: "Revenue this month", value: money(3250), trend: "up", change: "12%", hint: "vs last month" }),
        h(Stat, { label: "New orders", value: 42, trend: "up", change: "8" }),
        h(Stat, { label: "Complaints", value: 3, trend: "down", change: "2", good: "down" }),
      ),
      h(
        Split,
        null,
        h(
          Card,
          { title: "Latest orders", flush: true, actions: h(Button, { href: "/admin/orders", variant: "secondary", small: true }, "All") },
          h(Table, {
            columns: [{ label: "Code" }, { label: "Customer" }, { label: "Total", align: "num" }, { label: "Status" }],
            rows: orders.map((o) => [h("a", { href: `/admin/orders/${o.code}` }, o.code), o.customer, money(o.total), h(Badge, { tone: tone[o.status as keyof typeof tone] }, o.status)]),
          }),
        ),
        h(
          Card,
          { title: "Activity" },
          h(Timeline, {
            items: [
              { title: "INV-1042 paid", time: "10:24", tone: "ok" },
              { title: "Kintamani coffee sold out", time: "09:10", tone: "warn" },
              { title: "INV-1040 shipped", text: "Tracking 0123456789", time: "08:02" },
            ],
          }),
        ),
      ),
    ),
  );
}
