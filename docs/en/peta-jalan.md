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
| 12 | 0.13 | Data and admin panel: automatic CRUD from the schema, relations, pagination, filters |
| 13 | 0.14 | Testing: route and page test helpers, test data (factories), coverage reports |
| 14 | 0.15 | Deploy: Docker, Vercel, and Cloudflare adapters, plus a self-hosting guide |
| 15 | 1.0 | Ecosystem: plugins, MCP, subagents, a language server, a stable API |

## Stage 10: English (done)

The goal: Zentara can be used fully in Indonesian **or** English, without changing behavior for existing users. Indonesian stays the default.

This stage came before the back-end work, so stages 11 to 15 are written in both languages from the start.

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
