import { logout, redirect, type ZenContext } from "zusantara";

// Keluar lewat POST (tombol "Keluar" di navigasi atas), bukan GET, agar tidak bisa dipicu tautan dari situs lain.
export function POST(ctx: ZenContext) {
  logout(ctx);
  return redirect("/login", 303);
}
