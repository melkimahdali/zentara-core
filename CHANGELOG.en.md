# Changelog

English release notes start at 0.12.0. Earlier versions are described in Indonesian in [CHANGELOG.md](https://github.com/melkimahdali/zentara-core/blob/main/CHANGELOG.md). `zentara` and `create-zentara` always share the same version.

## [0.12.5]

### Added
- **Zentara AI chat on every page of your app** while running `zentara dev` or the interactive CLI. An **Ask Zentara AI** button floats in the bottom-right corner and works like the chat on the error page: request changes, see a diff with Approve/Reject, Undo changes, Stop, and New conversation. The conversation and panel state survive a page reload. The widget lives in a Shadow DOM, so the app's styles and the widget's styles never affect each other.
- **The AI can see the page.** Every message from the widget carries the current page: URL, the route file that serves it, the visible elements with their position and size, the text, console errors, and failed requests. Values of password fields, hidden fields, and fields marked `data-private` are never sent. The widget button shows how many console errors and failed requests the page has.
- **`view_page` tool for Zentara AI.** After changing a page, the AI opens it in your browser tab (in a hidden iframe, so the chat keeps running and your login cookie applies) and checks that it looks right, e.g. `{ url: "/notes", viewport: "mobile", expect: { text: ["Add"], selector: ["table"], noConsoleErrors: true, noLayoutIssues: true } }`. When no tab is open, the AI uses a text version from the server (no JavaScript) and says when the page needs a login.
- **Layout checks in `view_page`:** elements past the screen edge or causing sideways scrolling, overlapping elements, cut-off text, broken images, text contrast below WCAG AA, and `style` attributes, `<style>` elements, or pages outside the UI kit. Each finding names its element and the result names the route file. The text version checks what can be read from the HTML (custom CSS, UI kit, viewport meta, local images).
- **Desktop and mobile screens:** `viewport: "desktop"` (1280×800, the default) or `"mobile"` (390×844).
- **The AI must check the pages it changes.** After changing a page, typecheck and tests are followed by `view_page` on desktop and mobile. The AI fixes the findings in up to two attempts; if problems remain, the task ends as `verification_failed` with the findings instead of being reported as done. API routes are not checked, and neither is anything when the app server is not running.
- **Local AI task journal:** every Zentara AI task writes a summary to `.zentara/ai-tasks.jsonl` (status, steps, duration, tokens, typecheck, tests, and every `view_page`), without file contents or the conversation, and it never leaves your computer. `zentara ai:log [--limit 20] [--json]` shows it. The Stage 15 AI evals use this data. `AgentResult` gains `checks`.
- **`zentara view <path> [--mobile]`**: the same result as `view_page` in the terminal. When `zentara dev` or the interactive CLI runs and a browser tab is open, it uses that tab (through `.zentara/devtools.json`); otherwise the text version. `--text "a,b"` checks for text and `--json` prints JSON. It exits with 1 when there are findings or errors.

### Changed
- **The UI kit's light-mode accent is slightly darker (`#097e6b` instead of `#0b8a76`)** so white text on primary buttons and accent links on the page background meet the WCAG AA contrast of 4.5:1. The new layout check found this on the template's `/login` page.

### Fixed
- **Zentara AI verification no longer fails while the dev server runs.** The CLI process loads `.env` (e.g. `PORT=3000`), and `PORT` beats `port: 0` in tests, so the AI's `npm test` clashed with the dev server (`EADDRINUSE`) and verification always failed in the interactive CLI and the browser chat. The AI's typecheck and test scripts now run without `PORT` and the development server variables. The AI smoke test checks this flow from the widget.

### Security
- **The widget only exists during development, with nothing to remove by hand.** The app server injects it only when debug mode is on, the app was started by the development server (`ZENTARA_DEV=1`, set automatically by `zentara dev`), and `NODE_ENV` is not `production`. `zentara start` also removes the development server variables from the environment. In production, `/_zentara/dev/*` answers 404 and HTML is left untouched. The e2e tests check this, including when the devtools variables leak into the environment and `ZENTARA_DEBUG=1` is set.
- The widget scripts are files (`/_zentara/dev/probe.js`, `/_zentara/dev/widget.js`), not inline scripts. HTML fragments (without `<html>`/`<body>`) and htmx requests (`HX-Request`) are left alone.

## [0.12.4]

### Added
- **End-to-end tests for real-world use**, so bugs like the ones in 0.12.2 are caught in CI (Ubuntu & Windows) before a release:
  - **Global CLI:** zentara installed with `npm install -g` without drizzle-orm. After a new table and route are added, `db:generate`, `db:migrate`, `routes`, and `jobs` run from the global CLI in the api project.
  - **Zentara AI tools from the global install:** `list_routes` reads new routes and schema exports right away in the same process, `database generate/migrate` runs through the project's zentara, and so does the `zentara jobs` tool.
  - **Interactive flow:** on first open, the language is asked first and saved. "Create a new project" with a name containing spaces produces a safe folder, installs dependencies, and uses the chosen language template.
- `ZENTARA_CREATE_PACKAGE` and `ZENTARA_CREATE_ARGS` to test "Create a new project" with local packages.

## [0.12.3]

### Fixed
- **Creating a project from the interactive CLI no longer "exits" Zentara.** Previously the Zentara screen closed and the terminal was handed to `npm create zentara`, which then asked everything again in the plain terminal ("Ok to proceed?", template, dependencies, OmniRoute). Now:
  - the folder name and template are asked inside Zentara;
  - `create-zentara` and `npm install` run in the background without questions, with progress in the spinner;
  - when done, Zentara opens in the new project right away;
  - **Esc** cancels project creation and removes the half-created folder. If it fails, the error is shown and you stay in Zentara.
- Project folder names are made safe: spaces and other characters become `-` (e.g. "hub tiket transportasi" becomes `hub-tiket-transportasi`). A folder that already has files is never overwritten.
- **Language selection stays:** the first time `zentara` opens (no language chosen yet via `ZENTARA_LANG`, `locale` in the config, or `zentara lang`), it asks for the language first and saves it to `~/.zentara/settings.json`; *Create a new project* also asks for the app language (the current language is highlighted).
- **Database commands from the global CLI no longer fail on drizzle-orm.** `zentara db:generate`, `db:migrate`, and `db:seed`, including the ones Zentara AI runs in the terminal and in the browser, now use the project's own zentara (`node_modules/zentara`), which has drizzle-orm and drizzle-kit. If the project's dependencies are missing, the message says so clearly: run `npm install`.
- **Zentara AI's `list_routes` always reads the latest code.** Routes are loaded in a fresh process, so routes and schema that were just changed (e.g. a new `bookings` table) no longer fail with "does not provide an export named ..." because of a stale module cache.

### Added
- **A `zentara` tool for Zentara AI**, so the AI can run every CLI function (terminal and browser) with the project's own zentara:
  - `routes` and `jobs` run right away without approval;
  - `make:route`, `make:middleware`, `make:job`, and `build` are asked in ask mode, and files created by `make:*` can be reverted with `zentara undo`;
  - `jobs:run` always asks for approval.

  The AI is also told to stop asking the developer to run these commands themselves.

## [0.12.2]

### Fixed
- **Zentara AI reuses the app's existing layout** when asked to build a page, instead of inventing its own design.
  - The project summary sent to the AI now names `src/app/lib/ui.ts` and its exports (`appPage`, `APP_NAME`, ...), one example page that already uses `appPage()`, and the route list.
  - The AI's instructions require `appPage()` for signed-in pages and `page()` for public pages, ask it to read a similar page first, add new pages to the `navFor()` menu, and forbid its own `<html>`, `<style>`, CSS, or navigation unless asked.
  - When `write_file`/`edit_file` writes a route that builds its own HTML document or CSS, the tool result adds a note so the AI fixes it right away.
- The `api` and `minimal` templates no longer ship a `zenstyles/` folder (an old, differently styled stylesheet no page used, which confused the AI). `loadZenStyles()` is deprecated but kept for existing projects; there, the AI is told not to use it.

### Added
- Roadmap: htmx joins stage 12, and an optional plugin catalog that Zentara AI can offer as choices joins stage 15.

## [0.12.1]

### Fixed
- **The interactive CLI no longer leaves old output behind.** Full screen now uses the terminal's alternate screen (`\u001b[?1049h`), so earlier output (e.g. `npm create zentara` and `npm install`) is hidden and can't be scrolled to. On exit, the normal screen returns and the conversation recap is printed to the scrollback. Other processes started from the CLI (creating a project, installing OmniRoute) write to the normal screen, and the full screen is redrawn afterwards.
- **The terminal tab title** becomes *zentara* while the CLI is open (Ink and `--classic`), and is restored on exit.

### Changed
- **A framed header with the logo**, like Claude Code: a small Z logo (teal and gold), name & version, tagline, AI status, and folder on the left; command tips and the dev server status on the right when the terminal is wide enough. Short terminals get a compact two-line header.

## [0.12.0]

Stage 10 (English) and stage 11 (back-end) ship together. Indonesian stays the default; existing projects keep working as before, apart from the changes listed below.

### Added
- **Zentara in English.** Every text in the CLI (Ink and classic), `ai:setup`, Zentara AI, the welcome/error/404 pages, built-in error messages, the `zentara/ui` kit, and `create-zentara` is available in `id` and `en`. The catalogs are typed: a key missing in either language is a TypeScript error.
  - Choose with `zentara lang en` (global, `~/.zentara/settings.json`), `/lang en` in the interactive CLI, `locale: "en"` in `zentara.config.mjs`, or the `ZENTARA_LANG` env.
  - Zentara AI replies in the user's language and writes app texts in the project's `locale`. Tool descriptions for the model are now in English.
  - UI kit: `money()`, `formatNumber()`, and `formatDate()` use `Intl` for the language; `page({ lang })` for a single page.
  - `npm create zentara` asks for the language first, or pass `--lang en`. The `api` and `minimal` templates come in both languages with identical code (enforced by tests).
  - English documentation at https://zentara-core.morixa.id/en/ with a language switcher, bilingual npm READMEs, and these English release notes.
- **Background jobs & cron schedules.** Every file in `src/app/jobs/` is a job; queue it with `enqueue(name, data, { delay, runAt, retries })`.
  - The queue is stored in SQLite (`data/jobs.db`), survives restarts, and is safe across several processes; failed jobs are retried after 10 seconds, 20 seconds, ... up to 1 hour.
  - `export const schedule = "0 7 * * *"` runs a job on a cron schedule (5 fields, day/month names, `@daily` and friends), once per minute even with several servers.
  - CLI: `zentara make:job <name> [--schedule]`, `zentara jobs [--json]`, `zentara jobs:run <name> [--data]`. The `jobs` config and the `ZENTARA_JOBS=off` env.
  - Tests: the queue lives in memory when `NODE_ENV=test`, and `jobs.drain()` runs every job that is due.
- **Email with `sendMail()`**: built-in SMTP without dependencies (STARTTLS, `smtps://`, AUTH PLAIN/LOGIN), attachments, cc/bcc. Configure with `MAIL_URL`/`MAIL_FROM` or the `mail` config. During development emails are printed to the log and saved in `.zentara/mail/`; in tests they are collected in `outbox`; in production without `MAIL_URL` it throws.
- **File uploads** with `readForm()` (multipart/urlencoded/JSON as `FormData`) and `saveUpload()`: random file names, the type from the extension, dangerous extensions rejected, image/PDF contents checked, size limits. `readInput()` now reads multipart too.
- **In-memory cache**: `cache.get/set/has/delete/clear(prefix)` and `cache.remember(key, ttl, fn)` (concurrent requests compute once), plus `MemoryCache` with TTL and an LRU limit.
- `api` template: a `welcome-email` job that sends a welcome email after sign-up, with a test.
- New docs: Jobs & schedules, Email, File uploads, Cache, and Language.

### Changed
- The classic CLI (`--classic`) now runs on the same host as the Ink CLI, so both always behave the same.
- `api` template: the delete-note route is now `/notes/:id/delete`, and URL messages use neutral codes (`?msg=created`, `?new=1`) so they match in both languages.
- The `zentara` and `create-zentara` READMEs are shorter, bilingual, and point to the documentation site.
