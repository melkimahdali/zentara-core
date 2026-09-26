/** @type {import("zusantara").UserConfig} */
export default {
  appName: "Zusantara App",
  port: 3000,
  // Bahasa Zusantara (CLI, halaman bawaan, pesan error, kit UI): "id" atau "en".
  locale: "id",
  // Pengirim email bawaan untuk sendMail(). Tujuan pengiriman diatur lewat MAIL_URL di .env.
  mail: { from: "Zusantara App <noreply@example.com>" },
  // Tema kit UI: ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" }  (lihat: zusantara theme)
  // Opsi lain: host, logLevel, bodyLimit, publicDir, plugins, middleware
  // Zusantara AI: ai: { mode: "ask" | "auto", providers: [...] }  (lihat: zusantara ai:setup)
};
