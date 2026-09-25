import { csrf, requestLogger, session, type Middleware } from "zentara";

// Global app middleware, run in order for every request.
export default [
  requestLogger(),
  csrf(),
  session(), // secret from the SESSION_SECRET env (required in production)
] satisfies Middleware[];
