import { requestLogger, type Middleware } from "zentara";

// Middleware global aplikasi, dijalankan berurutan untuk setiap request.
export default [requestLogger()] satisfies Middleware[];
