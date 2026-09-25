# Zentara app

Created with `npm create zentara@latest` (**api** template: sign-in & dashboard pages, auth, database, and an example CRUD feature). It is a neutral starting point: build anything on top of it.

## Get started

```bash
npm run dev          # http://localhost:3000 (auto-reload)
```

The SQLite database lives in `data/app.db`. Development admin account: `admin@zentara.test` / `admin12345`.

## Built-in pages

| Page | Contents |
|---|---|
| `/login` · `/register` | sign in & create an account |
| `/dashboard` | summary and latest notes |
| `/notes` | example of user-owned data: write, search, edit, delete notes |
| `/admin/users` | list of users (admins only) |

All of them use the `zentara/ui` kit (see https://zentara-core.morixa.id/en/ui.html). The app name and navigation live in `src/app/lib/ui.ts`.

## Jobs & email

New users get a welcome email after signing up, sent by the job in `src/app/jobs/welcome-email.ts`. Jobs run in the background, are retried on failure, and the queue is stored in `data/jobs.db`. During development emails are not sent: they are printed to the log and saved in `.zentara/mail/`. To send real email, set `MAIL_URL` and `MAIL_FROM` in `.env`.

```bash
npx zentara jobs                          # list jobs & schedules
npx zentara make:job daily-report --schedule "0 7 * * *"
```

## Talk to Zentara AI

```bash
npx zentara ai:setup                       # set up an AI provider (Claude, OpenAI, Gemini, Groq, ...)
npx zentara                                # interactive CLI; can also run the dev server
npx zentara "build a booking schedule page for signed-in users"
npx zentara undo                           # undo the last AI change
```

## Start from a blank canvas

The **Notes** feature is only an example of user-owned data (table, API, pages, tests). To replace it with your own feature:

1. Delete `src/app/routes/notes/`, `src/app/routes/api/notes/`, and `src/app/lib/notes.ts`.
2. Remove the `notes` table from `src/app/db/schema.ts` and its example data from `src/app/db/seed.ts`.
3. Remove the "Notes" menu item in `src/app/lib/ui.ts`, then adjust `src/app/routes/dashboard.ts` and `test/app.test.ts`.
4. Run `npx zentara db:generate`, then `npx zentara db:migrate`.

Or ask Zentara AI: `npx zentara "remove the notes feature, then build ..."`.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | development server |
| `npm run build`, then `npm start` | build and run the production version |
| `npm test` | run the tests |
| `npx zentara routes` | list routes |
| `npx zentara db:generate`, then `npx zentara db:migrate` | after changing `src/app/db/schema.ts` |
| `npx zentara db:seed` | insert initial data |
| `npx zentara lang id` | switch Zentara to Bahasa Indonesia (or set `locale` in `zentara.config.mjs`) |

## Structure

```
src/app/routes/      routes (file = URL)
src/app/middleware.ts global middleware
src/app/db/          schema, connection, seed
src/app/jobs/        background jobs (file = job)
src/app/lib/         helpers: auth (requireUser, requireUserPage, ...) and ui (appPage)
drizzle/             SQL migrations
test/                tests
```

## Production

Fill in `.env`, at least:
- `NODE_ENV=production`;
- `SESSION_SECRET`, random and at least 32 characters;
- `SEED_ADMIN_PASSWORD`.

Then run:

```bash
npm run build && npx zentara db:migrate && npm start
```

Full documentation: https://zentara-core.morixa.id/en/
