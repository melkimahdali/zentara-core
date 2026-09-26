---
title: Configuration & plugins
order: 1
group: Reference
description: zentara.config.mjs and plugins.
---

# Configuration & plugins

Configuration lives in `zentara.config.mjs`:

```js
export default {
  appName: "Zentara Core",
  locale: "en",        // "id" or "en" (env ZENTARA_LANG), see the Language page
  port: 3000,          // env PORT overrides this
  host: "0.0.0.0",     // env HOST
  logLevel: "info",    // debug | info | warn | error | silent (env LOG_LEVEL)
  debug: true,         // full error pages; defaults to true only when NODE_ENV=development (env ZENTARA_DEBUG)
  bodyLimit: 1048576,
  publicDir: "public", // or false
  plugins: [],
  middleware: [],      // global middleware
  middlewareFile: "src/app/middleware", // default: app/middleware next to the routes folder; false = off
  cli: { animation: true, fullscreen: true }, // logo animation & full screen when `zentara` opens (env ZENTARA_ANIMATION=off, ZENTARA_FULLSCREEN=off)
  jobs: { store: "sqlite", path: "data/jobs.db", worker: true, concurrency: 2 }, // background jobs (env ZENTARA_JOBS=off)
  mail: { from: "My App <hello@example.com>" }, // env MAIL_URL / MAIL_FROM override this
  ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" }, // UI kit theme (zentara theme)
};
```

Details: [Language](bahasa.html), [Jobs & schedules](jobs.html), [Email](email.html), [UI kit and theme](ui.html#theme).

## Plugins

```ts
import { definePlugin } from "zentara";

export default definePlugin({
  name: "hello",
  setup(runtime) {
    runtime.logger.info("plugin active");
  },
});
```
