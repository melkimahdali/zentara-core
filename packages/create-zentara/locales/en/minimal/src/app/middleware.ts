import { requestLogger, type Middleware } from "zentara";

// Global app middleware, run in order for every request.
export default [requestLogger()] satisfies Middleware[];
