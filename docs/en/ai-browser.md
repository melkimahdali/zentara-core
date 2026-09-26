---
title: Zentara AI in the browser
order: 3
group: Zentara AI
description: The welcome page, error pages, AI chat on every page, and an AI that can see the page.
---

# Zentara AI in the browser

During development (`npx zentara` or `npm run dev`), Zentara AI is also available in the browser:

- **The welcome page** (the template's default `src/app/routes/index.ts`) shows the app status, the route list, and a Zentara AI chat box. Replace that file with your own page; bring it back any time with `export { welcomePage as GET } from "zentara";`.
- **Error pages** show the message, a stack trace with highlighted code excerpts, the `cause`, and request details. The **✦ Ask Zentara AI** button sends the error to the AI, which explains the cause and proposes a fix. Every change still asks for approval (diff + Approve/Reject buttons) and can be undone.
- **The 404 page** lists the available routes and offers a button to build that page with the AI.
- An app that fails to start (e.g. a typo in a route file) still shows an error page on its port, and the server restarts automatically once the file is fixed.

## Chat on every page

During development, every page of your app (not only the welcome and error pages) gets an **Ask Zentara AI** button floating in the bottom-right corner. It works like the chat on the error page: request changes, review the diff and Approve/Reject, Undo changes, Stop, and New conversation. The conversation survives a page reload.

Every message from the widget carries **the page as it looks right now**, so a request like "add an export button above this table" points straight at the right route file:

- the URL, the title, and the route file that serves the page;
- the visible elements (headings, buttons, links, fields, tables with their row count) with their position and size;
- the page text;
- console errors (`console.error`, JavaScript errors, rejected promises) and failed requests (fetch/XHR with status 400 or higher, images or scripts that failed to load).

Values of password fields, hidden fields, fields named like `token`/`secret`/`card`, and fields marked `data-private` are never sent. The red number on the widget button shows how many console errors and failed requests the page has.

## The AI checks its work: `view_page`

After changing a page, Zentara AI calls the `view_page` tool to look at the result and fixes what is wrong, e.g. the requested button is missing or there is a console error.

- **A browser tab is open** (any page with the widget): the page is loaded in a hidden iframe in that tab, with the same screen size and your login cookie. The chat keeps running.
- **No tab is open:** the AI uses a text version from the server (no JavaScript, not logged in). If the page redirects to `/login`, the AI says so.

You can look at the same text version yourself:

```bash
npx zentara view /notes                    # title, headings, tables, forms, buttons, links, text
npx zentara view /login --text "Sign in"   # fails (exit 1) when the text is missing
npx zentara view /api/hello --json
```

## Not in production

Only the development server injects the widget. There is nothing to remove before a build or deploy:

- the app server only injects it when debug mode is on, the app was started by `zentara dev` or the interactive CLI (which set `ZENTARA_DEV=1` and the devtools token), and `NODE_ENV` is not `production`;
- `zentara start` removes the development server variables from the environment;
- in production `/_zentara/dev/probe.js` and `/_zentara/dev/widget.js` answer 404, and your HTML is left untouched;
- HTML fragments (without `<html>`/`<body>`) and htmx requests are never touched.

The e2e tests check that production pages do not include the widget, including when the devtools variables leak into the environment and `ZENTARA_DEBUG=1` is set.

## Browser chat safety

- it is only active during development, through a small server that only listens on `127.0.0.1`;
- every request needs a random per-session token and is only accepted from `localhost` pages (other sites and DNS rebinding are rejected);
- the rules are the same as in the terminal: `.env` and database files are off limits, critical actions are always asked, and every change can be undone;
- the devtools token is on the page during development, so a third-party script you load on the page (e.g. from a CDN) could technically use the chat too. The `ask` mode (the default) still asks for your approval before every change, so use it when your pages load outside scripts.

In production (`zentara start`), visitors only see a simple error page without details, and the welcome page has no chat or route list. API clients (`Accept: application/json`) still get JSON.

## How the AI works

1. It reads the project structure, routes, database schema, and existing code.
2. It shares a short plan.
3. It creates or changes files, with your approval.
4. **It always runs the typecheck and tests.** If they fail, it fixes the problem itself (up to 2 times).
5. It reports the result: which files changed and how to try them.
