import type { ZenContext } from "zentara";

// Contoh session: hitung kunjungan per browser.
export function GET(ctx: ZenContext) {
  const visits = (ctx.session.get<number>("visits") ?? 0) + 1;
  ctx.session.set("visits", visits);
  return { visits };
}

export function DELETE(ctx: ZenContext) {
  ctx.session.destroy();
}
