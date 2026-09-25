---
title: How Zentara AI works
order: 1
group: Zentara AI
description: Build your app in plain language, with your approval.
---

# How Zentara AI works

No commands to memorize. Write what you want in plain language:

```bash
npx zentara                       # interactive CLI: ongoing conversation, dev server in the background
npx zentara "build a guestbook API with name, message, and date, including validation"   # one-off request
npx zentara undo                  # undo the last AI change
```

Zentara AI replies in the language you write in.

## Approval

| Mode | Regular file changes | Critical actions |
|---|---|---|
| `ask` (default) | asked one by one (you can choose "approve all" for the rest) | always asked |
| `auto` (`--auto` or `ai.mode: "auto"`) | done right away | always asked |

**Critical actions** are:
- deleting files, installing npm packages, and applying migrations or seeds to the database;
- starting or restarting the dev server (from the interactive CLI);
- running terminal commands other than read-only ones (see below);
- editing migration files in `drizzle/` by hand;
- changing `package.json`, `zentara.config`, `tsconfig`, `.github/`, `.gitignore`, or `.env*`.

What the AI can **never** do:
- read or change `.env` and database files (`.db`/`.sqlite`), so secrets and user data are never sent to the AI provider;
- write to `.git/`, `node_modules/` (including the Zentara framework), or `dist/`;
- touch files outside the project folder, including through symlinks.

## Terminal commands

The AI can run **one terminal command** in the project folder (the `run_command` tool), e.g. `git diff --stat` or `npx eslint src`. The rules:

| Kind | Examples | Handling |
|---|---|---|
| Read-only | `git status`, `git diff`, `git log`, `git show`, `ls`, `npm ls`, `npm outdated`, `npx tsc --noEmit` | runs right away |
| Allowed by you | prefixes in `ai.allowedCommands`, e.g. `["npm run lint", "npx eslint"]` | asked in `ask` mode, runs right away in `auto` mode |
| Everything else | `npx prisma ...`, `node script.js`, `git commit ...` | **critical action**, always asked |
| Forbidden | `sudo`, `bash -c`, `powershell`, `env`, `npm publish`, `npm token`, `git push`, `git config`, commands that mention `.env`/database files, paths outside the project (`/etc`, `..`, `~`), servers/watchers (`npm run dev`, `--watch`) | rejected |

- Commands run **without a shell**. Operators such as `|`, `&&`, `;`, `>`, `$VAR`, and `%VAR%` are rejected, so one approval means exactly one command.
- Secret values (variables ending in `KEY`, `SECRET`, `TOKEN`, `PASSWORD`, `DATABASE_URL`, and the like, from the environment or `.env`) are **redacted** from output before it is sent to the AI provider. This also applies to `typecheck`, `test`, and database command output.
- The default timeout is 2 minutes (10 minutes at most), and long output is truncated.
- Changes made by terminal commands are **not** recorded for `zentara undo`. That's why such commands are always asked first.

```js
// zentara.config.mjs
ai: {
  allowedCommands: ["npm run lint", "npx eslint"],
  compactAt: 60000, // compact automatically above ~60k tokens; 0 = off
},
```

Other options:
- `--dry-run`: see the plan without changing anything.
- Every change is recorded in `.zentara/history/`, so `zentara undo` can revert it.
