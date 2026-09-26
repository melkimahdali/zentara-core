/** @type {import("zentara").UserConfig} */
export default {
  appName: "Zentara App",
  port: 3000,
  // Bahasa Zentara (CLI, halaman bawaan, pesan error, kit UI): "id" atau "en".
  locale: "id",
  // Tema kit UI: ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" }  (lihat: zentara theme)
  // Opsi lain: host, logLevel, bodyLimit, publicDir, plugins, middleware
  // Zentara AI: ai: { mode: "ask" | "auto", providers: [...] }  (lihat: zentara ai:setup)
};
