---
title: CLI reference
order: 2
group: Reference
description: Every zentara command.
---

# CLI reference

Install it globally so you can just type `zentara`, or run it with `npx zentara` in the project folder.

```bash
npm install -g zentara
```

## App

| Command | What it does |
|---|---|
| `zentara dev` | development server from `src/app` (TypeScript, auto-reload, full error pages, AI chat in the browser) |
| `zentara build` | compile to `dist/` |
| `zentara start` | run the build (`NODE_ENV=production`) |
| `zentara routes [--json]` | list routes |
| `zentara make:route <path> [--methods GET,POST]` | create a route file, e.g. `api/events/[id]` |
| `zentara make:middleware <name>` | create a middleware file |
| `zentara make:job <name> [--schedule "0 7 * * *"]` | create a [job](jobs.html) file, optionally with a cron schedule |
| `zentara jobs [--json]` | list jobs, schedules, next runs, and queue counts |
| `zentara jobs:run <name> [--data <json>]` | run one job now, without the queue |
| `zentara db:generate` · `db:migrate` · `db:seed` | database (Drizzle) |
| `zentara lang [id\|en]` | show or change the Zentara [language](bahasa.html) |

## Zentara AI

| Command | What it does |
|---|---|
| `zentara` | interactive CLI (Claude Code style) |
| `zentara --continue` | interactive CLI, continuing the last conversation |
| `zentara --classic` | classic interactive CLI (without the Ink interface) |
| `zentara "<sentence>" [--auto] [--dry-run]` | a single AI request |
| `zentara ai:setup [provider]` | set up AI access with an arrow-key menu |
| `zentara ai:status` | check AI providers |
| `zentara undo [--yes]` | undo the last AI change |

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
| `--no-dev` | interactive CLI without offering the dev server |
| `--continue` | interactive CLI continuing the last conversation |
| `--no-ai` | `zentara dev` without the browser AI chat |
| `--force` | overwrite files with `make:*` |
| `--lang id\|en` | language for `npm create zentara` |
