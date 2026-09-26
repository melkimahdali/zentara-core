---
title: Konfigurasi & plugin
order: 1
group: Referensi
description: zusantara.config.mjs dan plugin.
---

# Konfigurasi & plugin

Konfigurasi ada di `zusantara.config.mjs`:

```js
export default {
  appName: "Zusantara Core",
  locale: "id",        // "id" atau "en" (env ZUSANTARA_LANG), lihat halaman Bahasa
  port: 3000,          // env PORT menimpa nilai ini
  host: "0.0.0.0",     // env HOST
  logLevel: "info",    // debug | info | warn | error | silent (env LOG_LEVEL)
  debug: true,         // halaman error lengkap; default true hanya saat NODE_ENV=development (env ZUSANTARA_DEBUG)
  bodyLimit: 1048576,
  publicDir: "public", // atau false
  plugins: [],
  middleware: [],      // middleware global
  middlewareFile: "src/app/middleware", // default: app/middleware di samping folder route; false = mati
  cli: { animation: true, fullscreen: true }, // animasi logo & layar penuh saat `zusantara` dibuka (env ZUSANTARA_ANIMATION=off, ZUSANTARA_FULLSCREEN=off)
  jobs: { store: "sqlite", path: "data/jobs.db", worker: true, concurrency: 2 }, // job latar belakang (env ZUSANTARA_JOBS=off)
  mail: { from: "Aplikasi Saya <halo@example.com>" }, // env MAIL_URL / MAIL_FROM menimpa nilai ini
  ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" }, // tema kit UI (zusantara theme)
};
```

Rincian: [Bahasa](bahasa.html), [Job & jadwal](jobs.html), [Email](email.html), [Kit UI dan tema](ui.html#tema).

## Plugin

```ts
import { definePlugin } from "zusantara";

export default definePlugin({
  name: "hello",
  setup(runtime) {
    runtime.logger.info("plugin aktif");
  },
});
```
