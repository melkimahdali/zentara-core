import { flash, h, takeFlash, type ZenContext } from "../../../src/core/index.js";
import { page, Toast } from "../../../src/ui/index.js";

// Pesan yang ditampilkan di request yang sama tidak boleh terbawa ke request berikutnya.
export const GET = (ctx: ZenContext) => {
  flash(ctx, "Langsung", "info");
  return page({ title: "Sekaligus" }, h(Toast, { flash: takeFlash(ctx) }));
};
