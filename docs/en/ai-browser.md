---
title: Zentara AI in the browser
order: 3
group: Zentara AI
description: The welcome page, error pages, and AI chat in the browser.
---

# Zentara AI in the browser

During development (`npx zentara` or `npm run dev`), Zentara AI is also available in the browser:

- **The welcome page** (the template's default `src/app/routes/index.ts`) shows the app status, the route list, and a Zentara AI chat box. Replace that file with your own page; bring it back any time with `export { welcomePage as GET } from "zentara";`.
- **Error pages** show the message, a stack trace with highlighted code excerpts, the `cause`, and request details. The **✦ Ask Zentara AI** button sends the error to the AI, which explains the cause and proposes a fix. Every change still asks for approval (diff + Approve/Reject buttons) and can be undone.
- **The 404 page** lists the available routes and offers a button to build that page with the AI.
- An app that fails to start (e.g. a typo in a route file) still shows an error page on its port, and the server restarts automatically once the file is fixed.

Browser chat safety:
- it is only active during development, through a small server that only listens on `127.0.0.1`;
- every request needs a random per-session token and is only accepted from `localhost` pages (other sites and DNS rebinding are rejected);
- the rules are the same as in the terminal: `.env` and database files are off limits, critical actions are always asked, and every change can be undone.

In production (`zentara start`), visitors only see a simple error page without details, and the welcome page has no chat or route list. API clients (`Accept: application/json`) still get JSON.

How the AI works:
1. It reads the project structure, routes, database schema, and existing code.
2. It shares a short plan.
3. It creates or changes files, with your approval.
4. **It always runs the typecheck and tests.** If they fail, it fixes the problem itself (up to 2 times).
5. It reports the result: which files changed and how to try them.
