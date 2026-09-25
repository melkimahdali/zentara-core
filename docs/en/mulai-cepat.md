---
title: Quick start
order: 1
group: Getting started
description: Create your first Zentara project in a minute.
---

# Quick start

You need Node.js 22 or newer.

```bash
npm create zentara@latest my-app -- --lang en   # choose a template: api (sign-in + database) or minimal
cd my-app
npx zentara                                     # interactive CLI: chat with the AI + dev server in the background
```

Or run just the server with `npm run dev` (http://localhost:3000, auto-reload). During development the welcome page and error pages in the browser also have a Zentara AI chat.

| Command | What it does |
|---|---|
| `zentara dev` | development server from `src/app` (TypeScript, auto-reload) |
| `zentara build` | compile to `dist/` (uses `tsconfig.build.json`) |
| `zentara start` | run the build (`dist/app`), `NODE_ENV=production` by default |
| `zentara routes` | list routes |
| `zentara make:route <path>` · `make:middleware <name>` · `make:job <name>` | create new files |
| `zentara jobs` · `jobs:run <name>` | background jobs |
| `zentara db:generate` · `db:migrate` · `db:seed` | database |
| `zentara` | Zentara AI interactive CLI (Claude Code style) |
| `zentara "<sentence>"` · `ai:status` · `ai:setup` · `undo` | Zentara AI |

Inside a project, run commands with `npx zentara ...` or the `npm run dev` / `build` / `start` scripts.

Import the framework API from the package:

```ts
import { HttpError, json, validate, type ZenContext } from "zentara";
import { createSqlite, createPostgres } from "zentara/db";
```

## Project structure

```
src/app/routes/       app routes (file = URL)
src/app/middleware.ts global app middleware
src/app/db/           database schema, connection, and seed (api template)
src/app/jobs/         background jobs (file = job, api template)
src/app/lib/          app helpers (e.g. requireUser/requireAdmin)
public/               static files
zenstyles/            app CSS
drizzle/              SQL migrations (from db:generate)
test/                 tests (node:test)
zentara.config.mjs    configuration
```
