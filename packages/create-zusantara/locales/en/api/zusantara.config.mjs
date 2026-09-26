/** @type {import("zusantara").UserConfig} */
export default {
  appName: "Zusantara App",
  port: 3000,
  // Zusantara language (CLI, built-in pages, error messages, UI kit): "id" or "en".
  locale: "en",
  // Default sender for sendMail(). Delivery is configured with MAIL_URL in .env.
  mail: { from: "Zusantara App <noreply@example.com>" },
  // UI kit theme: ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" }  (see: zusantara theme)
  // Other options: host, logLevel, bodyLimit, publicDir, plugins, middleware
  // Zusantara AI: ai: { mode: "ask" | "auto", providers: [...] }  (see: zusantara ai:setup)
};
