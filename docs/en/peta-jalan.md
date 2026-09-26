---
title: Roadmap
order: 5
group: Reference
description: How Zentara Core is being developed toward 1.0.
---

# Roadmap

Zentara Core is developed in stages. Each stage ships as a new minor version and is listed in the [release notes](rilis.html). The order of unfinished stages may still change.

Zentara is a general-purpose web framework, not a framework for one kind of app. The default template only gives you a neutral starting point (sign-in, dashboard, users, and a Notes CRUD example), and you are free to build anything on top of it: a blog, a booking system, an internal dashboard, an API, a portfolio, or a shop.

## Released

| Stage | Version | Contents |
|---|---|---|
| 1 | before 0.6 | Core foundation: file-based routing, responses and error handling, escaped HTML rendering, static files, config |
| 2 | before 0.6 | Middleware, cookies, encrypted sessions, CSRF, CORS, validation, basic CLI |
| 3 | before 0.6 | Zentara AI: build apps in plain language, approvals, undo, provider fallback |
| 4 | before 0.6 | Drizzle database (SQLite and PostgreSQL), auth, database-aware AI |
| 5 | 0.6 | The `zentara` and `create-zentara` npm packages, automated releases with 2FA approval |
| 6 | 0.7 | Claude Code–style interactive CLI, background dev server, error and welcome pages |
| 7 | 0.8 | The Zentara Core brand and documentation site |
| 8 | 0.9 | Zentara AI architecture and safety: streaming, saved sessions, safe `run_command`, diffs |
| 9 | 0.10 | Front-end: the `zentara/ui` kit, built-in pages, and the Ink-based CLI |
| 10 | 0.12 | [English support](bahasa.html): CLI, Zentara AI, built-in pages, UI kit, templates, and docs in `id` and `en` |
| 11 | 0.12 | Back-end: [jobs & schedules](jobs.html), [email](email.html), [file uploads](upload.html), [cache](cache.html) |

Stages 10 and 11 shipped together in 0.12.

## Next

| Stage | Version | Contents |
|---|---|---|
| 12 | 0.12.5 | Zentara AI chat on every page during development, and an AI that can see the page (`view_page`) |
| 13 | 0.13 | Data and admin panel: automatic CRUD from the schema, relations, pagination, filters, interactions without full page reloads using [htmx](https://htmx.org), and the `zentara describe --json` app manifest |
| 14 | 0.14 | Zentara for every AI agent: `zentara mcp`, `AGENTS.md` in the templates, and `llms.txt` for the docs |
| 15 | 0.15 | Testing and AI evals: test helpers, factories, coverage reports, published AI eval results, and baseline benchmarks |
| 16 | 0.16 | Portable runtime: a standard `app.fetch()` core and a lean production package without the CLI/AI |
| 17 | 0.17 | One-command deploy: Docker, PM2, Vercel, and Cloudflare (experimental) |
| 18 | 0.18 | Official plugin catalog, with Midtrans/Xendit payments from the start |
| 19 | 1.0 | Stable: frozen API, security audit, built-in CSP, release and LTS policy, migration guides |

Items marked **[pending decision]** below follow the current recommendation and may still change.

### Stage 12 · 0.12.5: chat on every page and `view_page`

- A Zentara AI chat widget appears on every page while the dev server runs, and never in production.
- The `view_page` tool lets the AI open a page of your app and check the result itself.
- Every AI task records a short result (success/failure, number of steps, which checks passed) in the local journal for the evals in stage 15. Nothing leaves your computer.

### Stage 13 · 0.13: data and admin panel

- htmx joins the core, with an `hx` prop in the UI kit, new components for tables, filters, and forms, and badged menu items.
- `zentara make:admin` builds admin pages from the database schema.
- `zentara describe --json` prints an app manifest (routes, tables and columns, admin pages, jobs, plugins) without secret columns. Zentara AI uses it as starting context, and it becomes the main tool of `zentara mcp`.

### Stage 14 · 0.14: Zentara for every AI agent

Developers using Claude Code, Cursor, or other agents still get the best experience in a Zentara project, under the same safety rules as Zentara AI. **[pending decision: moving MCP up to this stage]**

- `zentara mcp`: an MCP server with read tools (`describe`, `list_routes`, `view_page`, reading and searching files, dev server logs) and change tools (`make:*`, `db:generate`, `db:migrate`, writing and editing files). Path limits, the ban on `.env` and database files, and critical actions match Zentara AI, and every change can be reverted with `zentara undo`.
- `AGENTS.md` (plus a short `CLAUDE.md`) in the `api` and `minimal` templates, in both languages. `zentara agents` adds them to existing projects.
- `llms.txt` and `llms-full.txt` generated automatically for the documentation site.

### Stage 15 · 0.15: testing and AI evals

- `zentara/testing`: `testApp()`, `loginAs`, test data factories, and `zentara test --coverage`. Zentara AI and the generators write tests too.
- AI evals: 20 to 30 standard tasks on the `api` template, graded automatically (typecheck, tests, `view_page`, forbidden actions, steps, tokens). Results are published per version on the documentation site.
- Baseline requests-per-second and latency benchmarks against Express and Fastify, run in CI so later stages don't make Zentara slower.

### Stage 16 · 0.16: portable runtime and lean production package

Zentara runs on Node, Bun, Deno, Vercel, and Cloudflare from one codebase.

- `app.fetch(request)` with standard `Request`/`Response` becomes the runtime core, and the Node server becomes a thin adapter on top of it. **[pending decision: fetch layer]**
- `zentara build` writes a route manifest, so platforms without folder access can still serve routes.
- The `zentara` package holds only the runtime, UI, database, and testing; the CLI and AI move to `@zentara/cli`, which still installs with `npm install -g zentara`. **[pending decision: package split]**
- Default security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS in production).
- Existing apps keep working without code changes.

### Stage 17 · 0.17: one-command deploy

- `zentara deploy:check` and `zentara deploy <target>`. Docker and PM2 are required, Vercel is fully supported, and Cloudflare is experimental.
- Vercel and Cloudflare use `app.fetch()` from stage 16, and the Docker image uses only the runtime package, so it is smaller.
- Zentara AI may only use `--dry-run`; shipping to a server always asks for your approval. After a deploy, the health URL is checked and the result shown.

### Stage 18 · 0.18: plugin catalog

- `zentara add <plugin>` with the first five plugins: Tailwind, charts (Chart.js), PostgreSQL, GitHub/Google sign-in, and Midtrans/Xendit payments.
- Coming in 0.18.x: rich text editor, maps, React/Preact islands, WhatsApp, and local formats (Rupiah, NPWP, e-Faktur). Subagents and a language server follow in 0.18.x or after 1.0.
- The license is settled before this stage, because plugin authors weigh the license before building on Zentara. **[pending decision: license]**

### Stage 19 · 1.0: stable

- A frozen, documented API, a security audit (including `zentara mcp` and the payment plugin), and a built-in CSP.
- Complete bilingual documentation with tutorials tested by e2e, a release and LTS policy, `CONTRIBUTING.md`, and architecture docs.
- Migration guides from Express and from Laravel.
- AI evals and benchmarks for 1.0 are published, and the final license is stated in the README and `package.json`. **[pending decision: license]**

## Integrating other frameworks

Zentara keeps a single UI system, the `zentara/ui` kit, so every page (including the ones Zentara AI builds) looks consistent and needs no build step.

- **Stage 13:** [htmx](https://htmx.org) joins the core for pagination, filters, and form saves without full page reloads. The server still sends HTML.
- **Stage 14:** other AI agents (Claude Code, Cursor, and other MCP clients) can work in a Zentara project through `zentara mcp` and `AGENTS.md`.
- **Stage 18:** Tailwind, charts, rich text editors, maps, payments, Google/GitHub sign-in, and React/Preact "islands" become optional plugins from an official catalog (`zentara add <plugin>`). Zentara AI only offers them as options when a request actually needs one, with "no plugin" as the default, and installing always asks for approval.

## Stage 10: English (done)

The goal: Zentara can be used fully in Indonesian **or** English, without changing behavior for existing users. Indonesian stays the default.

This stage came before the back-end work, so stages 11 to 19 are written in both languages from the start.

1. **i18n foundation in the core**
   - `id` and `en` message catalogs and a typed `t()` (a wrong key is a TypeScript error).
   - The language comes from `zentara.config.mjs` (`locale: "en"`), the `ZENTARA_LANG` env, or `zentara lang en`.
2. **CLI and Zentara AI**
   - Every text in the classic CLI, the Ink CLI, `ai:setup`, and error messages comes from the catalogs.
   - Zentara AI replies in the user's language, and its system instructions are in English.
3. **Built-in framework pages**
   - The welcome page, development error and 404 pages, and the production status page.
   - Default `HttpError` and validation messages.
4. **The `zentara/ui` kit**
   - Built-in texts such as "Skip to content", "Sign out", "Search…", and "No data yet" follow `page({ lang })`.
   - Numbers, currency, and dates are formatted with `Intl` for the language.
5. **Project creator and templates**
   - `npm create zentara` asks for the language (or `--lang en`).
   - The `api` and `minimal` templates come in both languages: page texts, validation messages, README, and tests.
6. **Documentation**
   - An English documentation site under `/en/` with a language switcher.
   - Bilingual npm package READMEs, and English release notes from 0.12 on.
7. **Testing**
   - Tests make sure every catalog key exists in both languages.
   - e2e runs the main flows in `id` and `en`.
