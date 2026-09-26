/** @type {import("zusantara").UserConfig} */
export default {
  appName: "Zusantara App",
  port: 3000,
  // Bahasa Zusantara (CLI, halaman bawaan, pesan error, kit UI): "id" atau "en".
  locale: "id",
  // Tema kit UI: ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" }  (lihat: zusantara theme)
  // Opsi lain: host, logLevel, bodyLimit, publicDir, plugins, middleware
  // Zusantara AI: ai: { mode: "ask" | "auto", providers: [...] }  (lihat: zusantara ai:setup)
};
