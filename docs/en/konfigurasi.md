---
title: Configuration & plugins
order: 1
group: Reference
description: zusantara.config.mjs and plugins.
---

# Configuration & plugins

Configuration lives in `zusantara.config.mjs`:

```js
export default {
  appName: "Zusantara Core",
  locale: "en",        // "id" or "en" (env ZUSANTARA_LANG), see the Language page
  port: 3000,          // env PORT overrides this
  host: "0.0.0.0",     // env HOST
  logLevel: "info",    // debug | info | warn | error | silent (env LOG_LEVEL)
  debug: true,         // full error pages; defaults to true only when NODE_ENV=development (env ZUSANTARA_DEBUG)
  bodyLimit: 1048576,
  publicDir: "public", // or false
  plugins: [],
  middleware: [],      // global middleware
  middlewareFile: "src/app/middleware", // default: app/middleware next to the routes folder; false = off
  cli: { animation: true, fullscreen: true }, // logo animation & full screen when `zusantara` opens (env ZUSANTARA_ANIMATION=off, ZUSANTARA_FULLSCREEN=off)
  jobs: { store: "sqlite", path: "data/jobs.db", worker: true, concurrency: 2 }, // background jobs (env ZUSANTARA_JOBS=off)
  mail: { from: "My App <hello@example.com>" }, // env MAIL_URL / MAIL_FROM override this
  ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" }, // UI kit theme (zusantara theme)
};
```

Details: [Language](bahasa.html), [Jobs & schedules](jobs.html), [Email](email.html), [UI kit and theme](ui.html#theme).

## Plugins

```ts
import { definePlugin } from "zusantara";

export default definePlugin({
  name: "hello",
  setup(runtime) {
    runtime.logger.info("plugin active");
  },
});
```
