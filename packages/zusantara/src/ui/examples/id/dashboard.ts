/**
 * Dasbor admin
 * Halaman setelah login: kerangka AppShell, angka ringkas dengan tren, tabel pesanan terbaru dengan
 * status, dan riwayat aktivitas.
 */
import { h } from "../../../core/view.js";
import { AppShell, Badge, Button, Card, page, rupiah, Split, Stat, StatGroup, Table, Timeline } from "../../index.js";

// Di aplikasi nyata: angka dan pesanan dari database, user dari ctx.state.user.
const orders = [
  { code: "INV-1042", customer: "Rina Wulandari", total: 128000, status: "Lunas" },
  { code: "INV-1041", customer: "Budi Santoso", total: 90000, status: "Menunggu" },
  { code: "INV-1040", customer: "Maya Lestari", total: 245000, status: "Dikirim" },
];
const tone = { Lunas: "ok", Menunggu: "warn", Dikirim: "accent" } as const;

export function GET() {
  return page(
    { title: "Dasbor · Toko Tanah Air" },
    h(
      AppShell,
      {
        appName: "Toko Tanah Air",
        nav: [
          { href: "/admin", label: "Dasbor" },
          { href: "/admin/pesanan", label: "Pesanan" },
          { href: "/admin/produk", label: "Produk" },
          { href: "/admin/pengaturan", label: "Pengaturan", section: "Akun" },
        ],
        active: "/admin",
        user: { name: "Sari Dewi", email: "sari@tanahair.id" },
        title: "Dasbor",
        subtitle: "Ringkasan toko hari ini",
        actions: h(Button, { href: "/admin/produk/baru", small: true }, "Tambah produk"),
      },
      h(
        StatGroup,
        null,
        h(Stat, { label: "Pendapatan bulan ini", value: rupiah(12500000), trend: "up", change: "12%", hint: "dari bulan lalu" }),
        h(Stat, { label: "Pesanan baru", value: 42, trend: "up", change: "8" }),
        h(Stat, { label: "Keluhan", value: 3, trend: "down", change: "2", good: "down" }),
      ),
      h(
        Split,
        null,
        h(
          Card,
          { title: "Pesanan terbaru", flush: true, actions: h(Button, { href: "/admin/pesanan", variant: "secondary", small: true }, "Semua") },
          h(Table, {
            columns: [{ label: "Kode" }, { label: "Pelanggan" }, { label: "Total", align: "num" }, { label: "Status" }],
            rows: orders.map((o) => [h("a", { href: `/admin/pesanan/${o.code}` }, o.code), o.customer, rupiah(o.total), h(Badge, { tone: tone[o.status as keyof typeof tone] }, o.status)]),
          }),
        ),
        h(
          Card,
          { title: "Aktivitas" },
          h(Timeline, {
            items: [
              { title: "INV-1042 dibayar", time: "10.24", tone: "ok" },
              { title: "Stok Kopi Kintamani habis", time: "09.10", tone: "warn" },
              { title: "INV-1040 dikirim", text: "JNE 0123456789", time: "08.02" },
            ],
          }),
        ),
      ),
    ),
  );
}
