
import { h, renderToString } from "../../core/view";
import { loadZenStyles } from "../../core/style";

export default function Page(){
  const html=renderToString(
    h("div",{class:"p-8"},
      h("h1",{class:"text-3xl"},"Zentara Core"),
      h("p",{},"Framework AI-driven asal Nusantara.")
    )
  );
  const css=loadZenStyles();
  return `<!doctype html><html><head><style>${css}</style><title>Zentara</title></head><body>${html}</body></html>`;
}
