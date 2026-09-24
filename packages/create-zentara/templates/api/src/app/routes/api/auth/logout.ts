import { logout, type ZenContext } from "zentara";

export function POST(ctx: ZenContext) {
  logout(ctx);
}
