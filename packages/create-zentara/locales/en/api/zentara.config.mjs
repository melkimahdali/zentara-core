/** @type {import("zentara").UserConfig} */
export default {
  appName: "Zentara App",
  port: 3000,
  // Zentara language (CLI, built-in pages, error messages, UI kit): "id" or "en".
  locale: "en",
  // Default sender for sendMail(). Delivery is configured with MAIL_URL in .env.
  mail: { from: "Zentara App <noreply@example.com>" },
  // Other options: host, logLevel, bodyLimit, publicDir, plugins, middleware
  // Zentara AI: ai: { mode: "ask" | "auto", providers: [...] }  (see: zentara ai:setup)
};
