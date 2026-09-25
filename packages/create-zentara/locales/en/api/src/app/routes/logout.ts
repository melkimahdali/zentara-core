import { logout, redirect, type ZenContext } from "zentara";

// Sign out with POST (the "Sign out" button in the top navigation), not GET, so links from other sites cannot trigger it.
export function POST(ctx: ZenContext) {
  logout(ctx);
  return redirect("/login", 303);
}
