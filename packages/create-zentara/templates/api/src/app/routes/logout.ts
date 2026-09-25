import { logout, redirect, type ZenContext } from "zentara";

// Keluar lewat POST (tombol "Keluar" di sidebar), bukan GET, agar tidak bisa dipicu tautan dari situs lain.
export function POST(ctx: ZenContext) {
  logout(ctx);
  return redirect("/login", 303);
}
