import { logout, type ZenContext } from "zusantara";

export function POST(ctx: ZenContext) {
  logout(ctx);
}
