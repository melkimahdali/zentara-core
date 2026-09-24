import { csrf, requestLogger, session, type Middleware } from "../core/index.js";

// Middleware global aplikasi, dijalankan berurutan untuk setiap request.
export default [
  requestLogger(),
  csrf(),
  session(), // secret dari env SESSION_SECRET (wajib di production)
] satisfies Middleware[];
