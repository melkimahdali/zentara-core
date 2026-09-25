/** @type {import("zentara").UserConfig} */
export default {
  appName: "Zentara App",
  port: 3000,
  // Bahasa Zentara (CLI, halaman bawaan, pesan error, kit UI): "id" atau "en".
  locale: "id",
  // Pengirim email bawaan untuk sendMail(). Tujuan pengiriman diatur lewat MAIL_URL di .env.
  mail: { from: "Zentara App <noreply@example.com>" },
  // Opsi lain: host, logLevel, bodyLimit, publicDir, plugins, middleware
  // Zentara AI: ai: { mode: "ask" | "auto", providers: [...] }  (lihat: zentara ai:setup)
};
