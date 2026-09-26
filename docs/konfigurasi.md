---
title: Konfigurasi & plugin
order: 1
group: Referensi
description: zentara.config.mjs dan plugin.
---

# Konfigurasi & plugin

Konfigurasi ada di `zentara.config.mjs`:

```js
export default {
  appName: "Zentara Core",
  locale: "id",        // "id" atau "en" (env ZENTARA_LANG), lihat halaman Bahasa
  port: 3000,          // env PORT menimpa nilai ini
  host: "0.0.0.0",     // env HOST
  logLevel: "info",    // debug | info | warn | error | silent (env LOG_LEVEL)
  debug: true,         // halaman error lengkap; default true hanya saat NODE_ENV=development (env ZENTARA_DEBUG)
  bodyLimit: 1048576,
  publicDir: "public", // atau false
  plugins: [],
  middleware: [],      // middleware global
  middlewareFile: "src/app/middleware", // default: app/middleware di samping folder route; false = mati
  cli: { animation: true, fullscreen: true }, // animasi logo & layar penuh saat `zentara` dibuka (env ZENTARA_ANIMATION=off, ZENTARA_FULLSCREEN=off)
  jobs: { store: "sqlite", path: "data/jobs.db", worker: true, concurrency: 2 }, // job latar belakang (env ZENTARA_JOBS=off)
  mail: { from: "Aplikasi Saya <halo@example.com>" }, // env MAIL_URL / MAIL_FROM menimpa nilai ini
  ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" }, // tema kit UI (zentara theme)
};
```

Rincian: [Bahasa](bahasa.html), [Job & jadwal](jobs.html), [Email](email.html), [Kit UI dan tema](ui.html#tema).

## Plugin

```ts
import { definePlugin } from "zentara";

export default definePlugin({
  name: "hello",
  setup(runtime) {
    runtime.logger.info("plugin aktif");
  },
});
```
