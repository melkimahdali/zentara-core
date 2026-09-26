import { requestLogger, type Middleware } from "zusantara";

// Global app middleware, run in order for every request.
export default [requestLogger()] satisfies Middleware[];
