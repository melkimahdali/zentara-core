---
title: Quick start
order: 1
group: Getting started
description: Create your first Zusantara project in a minute.
---

# Quick start

You need Node.js 22 or newer.

```bash
npm create zusantara@latest my-app -- --lang en   # choose a template: api (sign-in + database) or minimal
cd my-app
npx zusantara                                     # interactive CLI: chat with the AI + dev server in the background
```

Or run just the server with `npm run dev` (http://localhost:3000, auto-reload). During development the welcome page and error pages in the browser also have a Zusantara AI chat.

| Command | What it does |
|---|---|
| `zusantara dev` | development server from `src/app` (TypeScript, auto-reload) |
| `zusantara build` | compile to `dist/` (uses `tsconfig.build.json`) |
| `zusantara start` | run the build (`dist/app`), `NODE_ENV=production` by default |
| `zusantara routes` | list routes |
| `zusantara make:route <path>` · `make:middleware <name>` · `make:job <name>` | create new files |
| `zusantara jobs` · `jobs:run <name>` | background jobs |
| `zusantara db:generate` · `db:migrate` · `db:seed` | database |
| `zusantara` | Zusantara AI interactive CLI (Claude Code style) |
| `zusantara "<sentence>"` · `ai:status` · `ai:setup` · `undo` | Zusantara AI |

Inside a project, run commands with `npx zusantara ...` or the `npm run dev` / `build` / `start` scripts.

Import the framework API from the package:

```ts
import { HttpError, json, validate, type ZenContext } from "zusantara";
import { createSqlite, createPostgres } from "zusantara/db";
```

## Project structure

```
src/app/routes/       app routes (file = URL)
src/app/middleware.ts global app middleware
src/app/db/           database schema, connection, and seed (api template)
src/app/jobs/         background jobs (file = job, api template)
src/app/lib/          app helpers (e.g. requireUser/requireAdmin)
public/               static files
drizzle/              SQL migrations (from db:generate)
test/                 tests (node:test)
zusantara.config.mjs    configuration
```
