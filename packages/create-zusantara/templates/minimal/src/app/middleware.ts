import { requestLogger, type Middleware } from "zusantara";

// Middleware global aplikasi, dijalankan berurutan untuk setiap request.
export default [requestLogger()] satisfies Middleware[];
