import { flash, redirect, type ZenContext } from "../../../src/core/index.js";

export function POST(ctx: ZenContext) {
  flash(ctx, "Tersimpan <ok>");
  return redirect("/lihat", 303);
}
