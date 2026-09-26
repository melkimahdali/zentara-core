---
title: CLI reference
order: 2
group: Reference
description: Every zusantara command.
---

# CLI reference

Install it globally so you can just type `zusantara`, or run it with `npx zusantara` in the project folder.

```bash
npm install -g zusantara
```

## App

| Command | What it does |
|---|---|
| `zusantara dev` | development server from `src/app` (TypeScript, auto-reload, full error pages, AI chat in the browser) |
| `zusantara build` | compile to `dist/` |
| `zusantara start` | run the build (`NODE_ENV=production`) |
| `zusantara routes [--json]` | list routes |
| `zusantara view <path> [--mobile\|--tablet] [--dark] [--lang en] [--screenshot] [--min-score 80] [--text "a,b"] [--json]` | view a page, check its layout, and score it, in a browser tab when one is open, otherwise the text version ([AI in the browser](ai-browser.html)) |
| `zusantara requests [id] [--path /x] [--json]` | recent requests on the dev server: processing time, queries, N+1, session, and logs ([Developer tools](ai-browser.html#developer-tools)) |
| `zusantara ai:log [--limit 20] [--json]` | results of recent Zusantara AI tasks from the local journal |
| `zusantara ui [Name] [--group form] [--json]` | UI kit component catalog: purpose, props, and examples ([UI kit](ui.html)) |
| `zusantara ui --example [name]` | whole-page examples (landing, profile, store, booking, dashboard) as complete route files |
| `zusantara theme [--accent blue] [--radius lg] [--font system] [--mode dark] [--reset]` | show or change the UI kit theme in `zusantara.config.mjs` |
| `zusantara make:route <path> [--methods GET,POST]` | create a route file, e.g. `api/events/[id]` |
| `zusantara make:middleware <name>` | create a middleware file |
| `zusantara make:job <name> [--schedule "0 7 * * *"]` | create a [job](jobs.html) file, optionally with a cron schedule |
| `zusantara jobs [--json]` | list jobs, schedules, next runs, and queue counts |
| `zusantara jobs:run <name> [--data <json>]` | run one job now, without the queue |
| `zusantara db:generate` · `db:migrate` · `db:seed` | database (Drizzle) |
| `zusantara lang [id\|en]` | show or change the Zusantara [language](bahasa.html) |
| `zusantara migrate:zusantara` | move a project made while the framework was still called Zentara (see below) |

## Zusantara AI

| Command | What it does |
|---|---|
| `zusantara` | interactive CLI (Claude Code style) |
| `zusantara --continue` | interactive CLI, continuing the last conversation |
| `zusantara --classic` | classic interactive CLI (without the Ink interface) |
| `zusantara "<sentence>" [--auto] [--dry-run] [--report <file>]` | a single AI request |
| `zusantara ai:setup [provider]` | set up AI access with an arrow-key menu |
| `zusantara ai:status` | check AI providers |
| `zusantara undo [--yes]` | undo the last AI change |

## Interactive CLI commands

| Command | What it does |
|---|---|
| `/help` | help |
| `/mode ask` · `/mode auto` (or **Shift+Tab**) | approval mode |
| `/dev` · `/dev start` · `/dev stop` · `/dev restart` | background dev server |
| `/logs` | dev server log |
| `/open [path]` | open the app in the browser |
| `/undo` | undo the last AI change |
| `/resume` | continue a saved conversation |
| `/compact` | summarize the conversation |
| `/status` · `/setup [provider]` (alias `/login`) | check or set up AI access |
| `/omniroute [install\|start\|stop]` | OmniRoute (free AI) |
| `/lang [id\|en]` | change the language |
| `/clear` | new conversation |
| `/exit` | exit |

**Esc** stops the AI; press **Ctrl+C** twice to exit.

## Common options

| Option | What it does |
|---|---|
| `--auto` | regular changes are applied right away; critical actions are still asked |
| `--dry-run` | see the AI's plan without changing files |
| `--report <file>` | write the AI task result (status, steps, tokens, tools, rejected actions) as JSON; without a file name to `.zusantara/ai-report.json` |
| `--no-dev` | interactive CLI without offering the dev server |
| `--continue` | interactive CLI continuing the last conversation |
| `--no-ai` | `zusantara dev` without the browser AI chat |
| `--force` | overwrite files with `make:*` |
| `--lang id\|en` | language for `npm create zusantara` |

## Moving from Zentara

Up to 0.12.9 this framework was called **Zentara** (packages `zentara` and `create-zentara`). Move an existing project with one command from its folder:

```bash
npx zusantara@latest migrate:zusantara
npm install
```

It rewrites `zentara` and `zentara/...` imports to `zusantara/...`, the dependencies and scripts in `package.json`, `zentara.config.mjs` to `zusantara.config.mjs`, `ZENTARA_*` variables in `.env`, and the `.zentara/` folder to `.zusantara/`. Zusantara AI can run it too (with your approval).

Throughout 0.12.x the old names still work: the `zentara` command, `zentara.config.mjs`, `ZENTARA_*` variables, and `/_zentara/*` URLs. This support is removed in 0.13.
