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

After changing a page, Zentara AI **must** call the `view_page` tool for that page on a desktop and a mobile screen and fix what it finds, just like the typecheck and tests. If problems remain after two attempts, the AI reports the findings as they are and the task is not marked done.

- **A browser tab is open** (any page with the widget): the page is loaded in a hidden iframe in that tab, with your login cookie, at 1280×800 (`desktop`) or 390×844 (`mobile`). The chat keeps running.
- **No tab is open:** the AI uses a text version from the server (no JavaScript, not logged in). If the page redirects to `/login`, the AI says so.

An example call by the AI:

```json
{ "url": "/notes", "viewport": "mobile", "expect": { "text": ["Add"], "selector": ["table"], "noConsoleErrors": true, "noLayoutIssues": true } }
```

### Layout checks

Every `view_page` result includes layout checks. Each finding names its element, and the result names the page's route file.

| Finding | Meaning | In the browser | Text version |
| --- | --- | --- | --- |
| `overflow` | an element sticks out past the screen edge or makes the page scroll sideways (tables inside a scroll area do not count) | ✓ | |
| `overlap` | two elements (text, buttons, inputs, images) overlap | ✓ | |
| `truncated` | text is cut off by `overflow: hidden`, or shortened with "…" without a `title` attribute | ✓ | |
| `image` | an image failed to load | ✓ | ✓ (local images) |
| `contrast` | text contrast below WCAG AA: 4.5:1, or 3:1 for large text | ✓ | |
| `style` | a `style` attribute, a `<style>` element, or a stylesheet outside the UI kit | ✓ | ✓ |
| `kit` | the page is not built with `page()` from `zentara/ui` | ✓ | ✓ |
| `meta` | no `<meta name="viewport">`, so phones show the page zoomed out | ✓ | ✓ |

The framework's own welcome and error pages are not checked for `style`, `kit`, and `meta`.

You can see the same result yourself. When `zentara dev` or the interactive CLI is running and a browser tab is open, `zentara view` uses that tab; otherwise the text version. It exits with 1 when there are findings, errors, or a missing `--text`.

```bash
npx zentara view /notes                    # elements, console errors, and layout checks
npx zentara view /notes --mobile           # phone screen (390 px)
npx zentara view /login --text "Sign in"   # fails when the text is missing
npx zentara view /api/hello --json
```

## AI task journal

Every Zentara AI task (terminal, interactive CLI, and the browser chat) writes a summary to `.zentara/ai-tasks.jsonl`: status, steps, duration, tokens, the typecheck and test results, and every `view_page`. File contents and the conversation are not recorded. Only the first line of the request is kept, and the journal never leaves your computer. The AI evals in Stage 15 use this data.

```bash
npx zentara ai:log               # the last 20 tasks and the share that finished
npx zentara ai:log --limit 100 --json
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
- `zentara dev` writes the devtools port and token to `.zentara/devtools.json` (readable only by the file's owner, removed when the server stops) so `zentara view` from another terminal can use the browser tab;
- the devtools token is on the page during development, so a third-party script you load on the page (e.g. from a CDN) could technically use the chat too. The `ask` mode (the default) still asks for your approval before every change, so use it when your pages load outside scripts.

In production (`zentara start`), visitors only see a simple error page without details, and the welcome page has no chat or route list. API clients (`Accept: application/json`) still get JSON.

## How the AI works

1. It reads the project structure, routes, database schema, and existing code.
2. It shares a short plan.
3. It creates or changes files, with your approval.
4. **It always runs the typecheck and tests.** If they fail, it fixes the problem itself (up to 2 times).
5. **When a page changed, it checks it with `view_page`** on desktop and mobile and fixes the findings (up to 2 times).
6. It reports the result: which files changed and how to try them.
