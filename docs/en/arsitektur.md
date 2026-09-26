---
title: Architecture
order: 6
group: Reference
description: A map of the Zentara Core code for contributors: packages, runtime, CLI, Zentara AI, and the development flow.
---

# Architecture

This page is for anyone who wants to understand or change the Zentara Core code. To use the framework, start with the [Quick start](mulai-cepat.html). The behavior contract that is guarded (and counts as a *breaking change* when it changes) is in [`CORE_SPEC.md`](https://github.com/melkimahdali/zentara-core/blob/main/CORE_SPEC.md); setting up the repo is covered in [`CONTRIBUTING.md`](https://github.com/melkimahdali/zentara-core/blob/main/CONTRIBUTING.md).

## What's in the repo

| Path | Contents |
|---|---|
| `packages/zentara` | the `zentara` package: framework runtime, `zentara` CLI, Zentara AI, UI kit, back-end |
| `packages/create-zentara` | `npm create zentara`: copies the `api` or `minimal` template |
| `docs/`, `docs/en/` | documentation (Markdown), built into the site by `scripts/docs-build.mjs` |
| `scripts/` | `e2e.mjs` (publish simulation), `ai-smoke.mjs` (real AI test), `version.mjs`, `release-approve.mjs`, `brand/` |
| `.github/workflows/` | `ci.yml`, `release.yml` (stage to npm), `docs.yml` (GitHub Pages), `ai-smoke.yml` (manual) |
| `assets/brand/` | master logo and brand assets |

Both packages are built with `tsc` (ESM, no bundler) and always share the same version.

## The `zentara` package

`packages/zentara/src/` is split into layers. Public entry points are set by `exports` in `package.json`:

| Import | File | Contents |
|---|---|---|
| `zentara` | `core/index.ts` | runtime, middleware, sessions, validation, views, auth, back-end |
| `zentara/ui` | `ui/index.ts` | server-side UI kit and built-in pages |
| `zentara/db` | `db/index.ts` | `createSqlite`, `createPostgres`, migrations (needs the optional `drizzle-orm`) |
| `zentara/host` | `repl/host.ts` | the interactive CLI core, for other front-ends (`HostUI`) |
| bin `zentara` | `cli.ts` | the CLI |

| Folder | Responsibility |
|---|---|
| `core/` | HTTP runtime: config, router, context, middleware, responses, errors, cookies, sessions, CSRF/CORS, rate limiting, validation, views, static files, auth, built-in assets at `/_zentara/*` |
| `core/devpage/` | welcome page, full error page, and the Zentara AI chat widget for the browser |
| `backend/` | jobs & cron, SMTP email, file uploads, cache, duration/size parsers |
| `db/` | Drizzle adapters and the `db:generate/migrate/seed` commands |
| `ui/` | the UI kit (`zentara/ui`), styles, and brand font |
| `ai/` | Zentara AI: agent loop, tools, approvals, undo journal, providers, OmniRoute, saved sessions |
| `repl/` | the interactive CLI core (`host.ts`) and the classic readline front-end (`repl.ts`) |
| `tui/` | the Ink (React) front-end for the interactive CLI; loaded only when used |
| `dev/` | background dev server (`server.ts`) and the devtools server for the browser chat (`devtools.ts`) |
| `i18n/` | `id/` and `en/` text catalogs, language selection, `t()` |
| `brand/` | terminal logo (ANSI/ASCII) and brand assets generated from the master |
| `serve.ts` | runs the user's app (used by `zentara dev` and `zentara start`) |
| `process.ts`, `update.ts` | cross-platform child processes, the project's own CLI, update check |

## HTTP runtime

`ZenRuntime` (`core/runtime.ts`) is the application server. Its lifecycle:

1. **`new ZenRuntime(config)`**: `resolveConfig()` (`core/config.ts`) merges `zentara.config.mjs` with the environment and validates it. The app language is set from `locale`.
2. **`init()`**: plugins run (`setup(runtime)`, which may add middleware), then the app's middleware file loads, routes load from `routesDir` (`core/router.ts`), jobs load from the `jobs/` folder next to it, and email is configured.
3. **`start()`**: `node:http` listens on `host:port`. **`stop()`** waits for in-flight requests.

Every request goes through `handle()`, which never throws:

```text
request
  └─ createContext()                     ctx: req/res, params, query, cookies, body()
      └─ global middleware               config.middleware → plugins (runtime.use) → src/app/middleware.ts
          └─ route()
              ├─ router.match(path)      static > [param] > [...catch-all]
              │   └─ route middleware → handler (export GET/POST/... or default)
              ├─ /_zentara/*             built-in assets (UI kit CSS, font, logo)
              ├─ publicDir               static files
              └─ 404
      └─ send()                          return value → ZenResponse (string=HTML, object=JSON, ...)
  └─ sendError()                         HttpError → its status; anything else → 500 (details only in logs / dev page)
```

The app folder (`src/app` in development, `dist/app` in production) drives everything: `routes/`, `middleware.ts`, `jobs/`, and `db/`. `serve.ts` loads `.env`, creates the `ZenRuntime`, and starts it. If boot fails during development, `serve.ts` still opens the port with an error page, so the error can be fixed from the browser.

## CLI

`cli.ts` is the only bin. `run(argv, io)` picks a path:

- **Regular commands** (`dev`, `build`, `start`, `routes`, `make:*`, `db:*`, `jobs*`, `lang`, `undo`, `ai:*`) run directly. Database commands from the global CLI are forwarded to the project's own `zentara` CLI (`node_modules/zentara`), because that is where `drizzle-orm` lives (`process.ts`, `findLocalCli`).
- **Free text** (arguments containing spaces, or `zentara ai "..."`) runs as a one-off Zentara AI task in the terminal.
- **No arguments in an interactive terminal** opens the interactive CLI.

The TypeScript loader (`tsx`) is registered only for commands that need to load the project's `.ts` code.

### Interactive CLI

```text
cli.ts ──► tui/ (Ink, default)     ┐
       └─► repl/repl.ts (--classic) ┴─► repl/host.ts (createReplHost)
                                          ├─ AI session         ai/session.ts → ai/agent.ts
                                          ├─ dev server         dev/server.ts (npm run dev in the background)
                                          ├─ devtools server    dev/devtools.ts (browser chat)
                                          ├─ OmniRoute          ai/omniroute.ts (127.0.0.1)
                                          └─ /slash commands, saved sessions, create project
```

All the logic lives in `repl/host.ts`; a front-end only implements `HostUI` (showing answers, tools, approvals, menus, and input). The Ink front-end in `tui/` and the classic one in `repl/repl.ts` share the same host, so they behave identically. When `HostUI` changes incompatibly, bump `HOST_API`.

## Zentara AI

```text
task (terminal / browser)
  └─ ai/session.ts       one conversation, saved to .zentara/sessions/
      └─ ai/agent.ts     loop: call model → run tools → repeat (up to ai.maxSteps)
          ├─ ai/chain.ts        provider chain + fallback (ai/providers/anthropic.ts, openai-compatible.ts)
          ├─ ai/tools.ts        tools: read/write/edit/delete files, search, list_routes, run_check,
          │                     run_command, database, zentara, install_package
          ├─ ai/approval.ts     risk read / write / critical → ask or run
          ├─ ai/command.ts      shell-free command parsing, classification, secret redaction
          └─ ai/journal.ts      record file contents before changes → zentara undo
      └─ verification     npm run typecheck then npm run test; failures go back to the model (up to 2x)
```

- **The prompt and project context** are built in `ai/prompt.ts` and `ai/layout.ts` (project summary, existing UI layout, route list).
- **Guardrails** are centralized in `ai/tools.ts` (forbidden paths, `.env`, database files, symlinks) and `ai/approval.ts` (the approval policy). The exact rules are in the Zentara AI section of `CORE_SPEC.md`, and every change here must come with tests.
- **Configuration and providers** live in `ai/config.ts`, `ai/presets.ts`, and `ai/setup.ts` (`zentara ai:setup`). Conversations are stored in a neutral format, so the chain can switch providers mid-session.

### Browser chat

While `zentara dev` or the interactive CLI is running, `dev/devtools.ts` opens a small server on `127.0.0.1` with a random per-session token. The port and token reach the app process through `ZENTARA_DEVTOOLS_PORT` and `ZENTARA_DEVTOOLS_TOKEN`; the welcome and error pages (`core/devpage/`) then embed the chat widget (`core/devpage/chat.ts`), which talks to that server (`/status`, `/chat`, `/approve`, `/stop`, `/undo`, `/reset`). The devtools server uses the same AI session and rules as the terminal, and a shared lock (`AiLock`) stops terminal and browser tasks from running at the same time.

## The `zentara dev` flow

```text
zentara dev
  ├─ dev/devtools.ts                  browser chat (skipped when the interactive CLI already provides it)
  └─ tsx watch serve.ts               watches src/app, .env, zentara.config.mjs → automatic restart
        env: NODE_ENV=development, ZENTARA_APP_DIR=src/app, ZENTARA_DEVTOOLS_*
        └─ ZenRuntime                 the user's app
```

`zentara build` runs the project's own `tsc`, and `zentara start` runs `serve.ts` directly from `dist/app` with `NODE_ENV=production`.

## Languages

`i18n/index.ts` picks the language: the `ZENTARA_LANG` env, then `locale` in the project config, then `~/.zentara/settings.json` (`zentara lang`), then Indonesian. All interface text comes through `t()` from the `i18n/id/` catalog (the source of the `Messages` type) and `i18n/en/`. In `create-zentara`, the Indonesian templates live in `templates/` and English replacement files in `locales/en/`.

## Tests

| Layer | Location | Runs in |
|---|---|---|
| unit & integration | `packages/*/test/` (`node:test` + `tsx`) | `npm test`, CI on Node 22 & 24 with PostgreSQL |
| AI with fake providers | `packages/zentara/test/ai/` | `npm test` |
| e2e "as if published" | `scripts/e2e.mjs` | `npm run e2e`, CI on Ubuntu & Windows |
| AI with a real provider | `scripts/ai-smoke.mjs` | manual (`ai-smoke.yml`), uses API credits |

Bugs found in real use are added to `scripts/e2e.mjs`.

## Releases and docs

`node scripts/version.mjs <version>` bumps both packages. A GitHub Release triggers `release.yml`, which tests everything and then stages the packages on npm through Trusted Publishing; they go live once the owner approves with `npm run release:approve`. Details are in [`PUBLISHING.md`](https://github.com/melkimahdali/zentara-core/blob/main/PUBLISHING.md). The docs site is built from `docs/` and the CHANGELOG by `docs.yml` on every change to `main`.
