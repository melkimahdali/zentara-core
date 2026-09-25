# Changelog

English release notes start at 0.12.0. Earlier versions are described in Indonesian in [CHANGELOG.md](https://github.com/melkimahdali/zentara-core/blob/main/CHANGELOG.md). `zentara` and `create-zentara` always share the same version.

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
