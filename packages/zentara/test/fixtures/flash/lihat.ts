import { h, takeFlash, type ZenContext } from "../../../src/core/index.js";
import { page, Toast } from "../../../src/ui/index.js";

export const GET = (ctx: ZenContext) => page({ title: "Lihat" }, h(Toast, { flash: takeFlash(ctx) }), "isi");
