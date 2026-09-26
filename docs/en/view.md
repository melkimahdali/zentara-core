---
title: Views & HTML
order: 5
group: Basics
description: Render safe HTML with h() and renderToString().
---

# Views & HTML

```ts
import { h, raw, renderToString } from "zusantara";

renderToString(h("p", { class: "note" }, userInput)); // text & attributes are escaped automatically
renderToString(h("style", null, raw(css)));            // raw() is for trusted HTML only
```

For complete Zusantara-styled pages (sign-in, dashboard, admin), use the [`zusantara/ui` kit](ui.html).

## Static files

Everything in `public/` is served as is, for example `public/logo.png` at `/logo.png`. Routes take precedence over static files. Dotfiles and path traversal are rejected.
