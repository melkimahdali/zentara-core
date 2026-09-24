import { h, loadZenStyles, raw, renderToString } from "zentara";

export function GET(): string {
  const page = h("html", { lang: "id" },
    h("head", null,
      h("meta", { charset: "utf-8" }),
      h("meta", { name: "viewport", content: "width=device-width, initial-scale=1" }),
      h("title", null, "Zentara"),
      h("style", null, raw(loadZenStyles())),
    ),
    h("body", null,
      h("div", { class: "p-8" },
        h("h1", { class: "text-3xl" }, "Zentara Core"),
        h("p", null, "Framework AI-driven asal Nusantara."),
      ),
    ),
  );
  return "<!doctype html>" + renderToString(page);
}
