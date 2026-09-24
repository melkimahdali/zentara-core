import { logout, type ZenContext } from "../../../../core/index.js";

export function POST(ctx: ZenContext) {
  logout(ctx);
}
