---
title: Roadmap
order: 5
group: Reference
description: How Zusantara Core is being developed toward 1.0.
---

# Roadmap

Zusantara Core is developed in stages. Each stage ships as a new minor version and is listed in the [release notes](rilis.html). The order of unfinished stages may still change.

Zusantara is a general-purpose web framework, not a framework for one kind of app. The default template only gives you a neutral starting point (sign-in, dashboard, users, and a Notes CRUD example), and you are free to build anything on top of it: a blog, a booking system, an internal dashboard, an API, a portfolio, or a shop.

## Released

| Stage | Version | Contents |
|---|---|---|
| 1 | before 0.6 | Core foundation: file-based routing, responses and error handling, escaped HTML rendering, static files, config |
| 2 | before 0.6 | Middleware, cookies, encrypted sessions, CSRF, CORS, validation, basic CLI |
| 3 | before 0.6 | Zusantara AI: build apps in plain language, approvals, undo, provider fallback |
| 4 | before 0.6 | Drizzle database (SQLite and PostgreSQL), auth, database-aware AI |
| 5 | 0.6 | The `zusantara` and `create-zusantara` npm packages, automated releases with 2FA approval |
| 6 | 0.7 | Claude Code–style interactive CLI, background dev server, error and welcome pages |
| 7 | 0.8 | The Zusantara Core brand and documentation site |
| 8 | 0.9 | Zusantara AI architecture and safety: streaming, saved sessions, safe `run_command`, diffs |
| 9 | 0.10 | Front-end: the `zusantara/ui` kit, built-in pages, and the Ink-based CLI |
| 10 | 0.12 | [English support](bahasa.html): CLI, Zusantara AI, built-in pages, UI kit, templates, and docs in `id` and `en` |
| 11 | 0.12 | Back-end: [jobs & schedules](jobs.html), [email](email.html), [file uploads](upload.html), [cache](cache.html) |

Stages 10 and 11 shipped together in 0.12.

## Next

| Stage | Version | Contents |
|---|---|---|
| 12 | 0.12.5 | Zusantara AI chat on every page during development, and an AI that can see the page and check its layout on desktop and mobile (`view_page`) |
| 12b | 0.12.6 | Layout foundations and complete forms: layout, Select, Checkbox, Radio, Switch, file upload, theme config, and a component catalog |
| 12c | 0.12.7 | Navigation, dialogs, notifications, and data display: Navbar, Tabs, Pagination, Dialog, Toast, Accordion, Timeline, Calendar, 403/404/500 pages |
| 12d | 0.12.8 | Public pages and ready-made patterns: Hero, Pricing, Gallery, FAQ, Testimonial, ProductCard, cart, and full example pages |
| 12e | 0.12.9 | Developer tools: per-request toolbar (queries, N+1), inspect mode, page score, tablet/dark/en variants, screenshots, recorded steps, voice input |
| 13 | 0.13 | Admin panel foundations with [htmx](https://htmx.org): re-runnable CRUD from the schema, sort/search/filter, permissions, admin dashboard, and `zusantara describe --json` |
| 13b | 0.13.1 | Relations, content, and workflows: many-to-many, CSV/Excel, audit log, revisions, draft and publish, SEO, media, approvals, automations, schema editor |
| 13c | 0.13.2 | Calendar/kanban/spreadsheet views, saved views, per-column and per-row permissions, user management, multi-tenant, API and webhooks, UU PDP |
| 13d | 0.13.3 | Content and business templates: business, portfolio, blog, news, government, service provider, static, public |
| 13e | 0.13.4 | Application and transaction templates: online shop, e-learning, file sharing, search engine, dynamic |
| 13f | 0.13.5 | Community and access templates: social media, intranet, extranet, PWA, SPA |
| 14 | 0.14 | Zusantara for every AI agent: `zusantara mcp`, `search_docs`, runtime tools, MCP client, code index, OpenAPI, AI rules and costs, `AGENTS.md`, `llms.txt` |
| 14b | 0.14.1 | An AI that plans and sees: plan mode, checkpoints per task, visual editing, image or design to page |
| 15 | 0.15 | Testing and AI evals: test helpers, factories, fakes, a database per test, `--watch`, bug-to-test workflow, published evals |
| 15b | 0.15.1 | Browser tests and performance: `--browser`, accessibility, recorded tests, visual regression, `zusantara ci github`, benchmarks |
| 15c | 0.15.2 | Security tests and test quality: schema fuzzing, automatic security tests, mutation testing |
| 16 | 0.16 | Portable runtime: a standard `app.fetch()` core and a lean production package without the CLI/AI |
| 17 | 0.17 | One-command deploy: Docker, PM2, Vercel, and Cloudflare (experimental) |
| 18 | 0.18 | Official plugin catalog, with Midtrans/Xendit payments from the start |
| 19 | 1.0 | Stable: frozen API, security audit, built-in CSP, release and LTS policy, migration guides |

Items marked **[pending decision]** below follow the current recommendation and may still change.

### Stage 12 · 0.12.5: chat on every page and `view_page`

The goal: Zusantara AI can be called from any page during development, and can **see for itself** the pages it builds, including whether the layout looks right. This stage also lays the groundwork for the UI kit in stage 12b and the AI evals in stage 15, so those stages do not have to rework stage 12.

**Chat widget**
- Injected into every HTML response only when three conditions hold: `config.debug`, devtools is running, and the server was started by `zusantara dev` or the interactive CLI. `zusantara start` and production never load it, and the `/_zusantara/dev/*` assets return 404 in production.
- Loaded as an external script (not inline), so it keeps working when the built-in CSP arrives in stage 19.
- Uses the same chat flow as the error page: diff with Approve/Reject, Undo, Stop, and Reset. Pages that already have their own chat (welcome, error) do not get a second widget.
- Every message automatically carries the page context and the route file that serves the URL, so "change this page" points at the right file.
- Console errors, JavaScript errors, and failed requests in the browser are recorded and sent along as context.
- Values of `<input type=password>` and elements marked `data-private` are never sent to the AI.

**The `view_page({ url, viewport?, expect? })` tool**
- When a browser tab has the widget loaded, the page opens in that tab (hidden iframe, signed-in cookies included). Otherwise a server-side text version is used, labelled "no JavaScript".
- The result: HTTP status, title, outline (headings, forms, tables, buttons, links), visible elements with their position and size, console errors, and failed requests.
- **Layout checks** (new, for the problem of the AI not yet building layouts that fit the request): elements that overflow the screen or cause horizontal scrolling, overlapping elements, clipped text, images that fail to load, text with too little contrast, and HTML or `style` attributes that do not use the UI kit. Each finding names the element and its route file.
- Optional `viewport`: `"desktop"` (default) or `"mobile"` (390 px), so the AI can check the phone layout.
- Optional `expect` (e.g. `{ text: "Add", selector: "table", noConsoleErrors: true, noLayoutIssues: true }`) gives a clear pass/fail result.
- Read-only and limited to the app's localhost URLs, so it needs no approval.

**AI workflow**
- After changing a route or a page, the AI must call `view_page` for that page (desktop and mobile) and fix what it finds within two attempts, just like typecheck and tests. If it still fails, the AI reports the findings as they are instead of claiming it is done.
- Every AI task records a short result in the local journal: success/failure, number of steps, and the typecheck, test, and `view_page` results. The evals in stage 15 use this data, and it never leaves your computer.

**CLI and both languages**
- `zusantara view <url> [--mobile]` prints the same result in the terminal, and the interactive CLI shows `view_page` results like any other tool.
- All widget, tool, and layout-check text is available in Indonesian and English.

**Done when**
- Unit: widget injection conditions, filtering of private data, every kind of layout check on a deliberately broken sample page, and `expect`.
- e2e: in a scaffolded project, `zusantara dev` injects the widget and `zusantara start` does not; `zusantara view /login` and `zusantara view /login --mobile` pass with no findings; the broken sample page produces the right findings.
- AI smoke (manual/scheduled): a request such as "add page X" ends with a `view_page` that passes on desktop and mobile.

### A complete UI kit: stages 12b, 12c, and 12d

The `zusantara/ui` kit currently has about 25 components, almost all of them for dashboards and simple forms. `Field` does not even have a dropdown (`select`), checkboxes, radio buttons, switches, or file upload yet. Because Zusantara AI may not write its own CSS, every missing component is a layout the AI cannot build. The three stages below complete the UI kit before the admin panel, done in order with one PR per stage.

**Rules for every new component** (in 12b, 12c, 12d, and later stages):
- Rendered on the server and fully working without JavaScript. A small built-in script only adds convenience (e.g. closing a dialog with Esc).
- Built-in text in Indonesian and English, light and dark mode, and following the theme from `zusantara.config.mjs`.
- Accessible: the right HTML elements, labels, keyboard focus, and enough contrast.
- Listed in the component catalog (examples and purpose for the AI) and the `/_zusantara/ui` gallery.
- Covered by unit tests (id/en rendering, escaping, no JS) and passing the `view_page` layout checks on desktop and mobile.

#### Stage 12b · 0.12.6: layout foundations and complete forms

- **Layout:** `Container`, `Stack`, `Row`/`Cluster`, `Columns`, `Section`, `Divider`, and `PageHeader` (title, description, breadcrumb, and action buttons). Spacing and alignment through props with a fixed set of values.
- **Complete forms:** `Select`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`, `FileInput` (with image preview, wired to `saveUpload`), `Fieldset`, inputs with a prefix/suffix (e.g. "Rp"), show/hide password, and the `time`, `datetime-local`, `month`, `range`, and `color` types in `Field`. Validation and error messages still go through `tryParse` as today.
- **Theme** in `zusantara.config.mjs` (`ui: { accent, radius, font, mode }`), so colors and fonts can change without CSS. The default stays the Zusantara brand.
- **Component catalog** for the AI (id/en, generated from source) and the `/_zusantara/ui` gallery during development. `zusantara ui` prints the catalog and `zusantara theme` sets the theme.
- **New AI workflow:** pick components from the catalog, arrange them with the layout primitives, then check with `view_page`. When the kit is not enough, the AI explains the limit and offers custom CSS with your approval.

#### Stage 12c · 0.12.7: navigation, overlays, feedback, and data display

- **Navigation:** public `Navbar` (with a mobile menu), `Breadcrumb`, `Tabs`, `Pagination` (plain links; the htmx version comes in stage 13), `Steps`/`Stepper`, `DropdownMenu`, `BottomNav` for phones, and `Footer`.
- **Overlays:** `Dialog`, `ConfirmDialog`, `Drawer`/`Sheet`, `Popover`, and `Tooltip`, built on the browser's own `<dialog>` and `popover`.
- **Feedback:** `Toast` and session flash messages (e.g. "Saved" after a redirect), `Progress`, `Spinner`, and `Skeleton`.
- **Data display:** `DescriptionList` (details of one record), `Accordion`, `Timeline`, `Tag`, `AvatarGroup`, `Stat` with an up/down trend, `Rating`, `CodeBlock`, and `Calendar` (month view and event list, for bookings and schedules).
- **Built-in app pages:** production 403, 404, and 500 pages that use the app's theme.

#### Stage 12d · 0.12.8: public pages and ready-made patterns

- **Public pages:** `Hero`, `FeatureGrid`, `MediaCard`, `Gallery`, `Pricing`, `Testimonial`, `FAQ`, `CTA`, `LogoCloud`, `TeamCard`, and `ContactForm`.
- **Business patterns:** `ProductCard`, `QuantityInput`, a cart summary, and price cards with Rupiah formatting, as a starting point for shops and orders. Payments stay a plugin in stage 18.
- **Full example pages** in the catalog (landing, business profile, shop, booking schedule, dashboard) that the AI follows, and that also become eval tasks in stage 15.
- **Done when:** AI smoke runs for "a landing page for a cake shop", "a team profile page with photos", "a booking schedule page", and "change the main color to blue" finish with no AI-written CSS or `style`, and `view_page` passes on desktop and mobile.

**After 12d:** components that need server interaction (tables with filtering, sorting, and inline editing; `Combobox` search; bulk actions) come in stages 13 and 13b with htmx. Heavy components that need outside libraries (rich text editor, charts, maps, date range picker) stay plugins in stage 18.

### Stage 12e · 0.12.9: developer tools

Compared with Django Debug Toolbar, Laravel Telescope, Lighthouse, Sentry, and the Vite/Svelte inspectors. All of these tools exist only during development, and Zusantara AI can read all of their data.

- **Per-request dev toolbar:** processing time, database queries with their timings, N+1 query detection, session contents, and logs.
- **Inspect mode:** hover over an element on the page to see the file and line of code that renders it.
- **Page score** in `view_page`: load time, page weight, number of requests, images without `alt`, missing SEO meta tags, and basic accessibility.
- **Check variants:** `view_page` can check tablet, dark mode, and the `en` language in addition to desktop and mobile.
- **Pixel screenshots** for AI providers that can read images, in addition to the DOM structure.
- **Recorded user steps** before an error (clicks, form input, navigation), sent to the AI so the bug can be reproduced.
- **Automatic reload** of every open tab after a file changes and the dev server is ready.
- **Voice input** in the widget, in Indonesian and English.

### Admin panel: stages 13, 13b, and 13c

Compared with Django Admin, Laravel Filament/Nova, Rails Avo, Airtable/NocoDB, Directus/Strapi, Retool/Metabase, Supabase Studio, and Odoo/Salesforce. The admin panel has to fit any kind of website, not only shops.

#### Stage 13 · 0.13: data and admin panel foundations

- htmx joins the core, with an `hx` prop in the UI kit and badged menu items. The admin panel uses the components from stages 12b to 12d, plus components that need the server: a searchable `Combobox` and sortable tables with inline editing.
- `zusantara make:admin` builds admin pages from the database schema, and **can be run again** after the schema changes without overwriting code you edited (only marked blocks are updated).
- Record lists with column sorting, search across several columns, and filters per data type (date range, enum, boolean).
- Image and file columns automatically use `FileInput` with a preview.
- Permissions per table and per action (view, create, update, delete) based on role.
- An automatic admin dashboard: record counts per table and the latest records.
- One AI request is carried out end to end, e.g. "add a status column to products": schema, migration, admin, tests, then a check with `view_page`.
- `zusantara describe --json` prints the app manifest (routes, tables and columns, admin pages, jobs, plugins) without secret columns. Zusantara AI uses this manifest as its starting context, and it becomes the main tool of `zusantara mcp`.

#### Stage 13b · 0.13.1: relations, content, and workflows

- **Relations:** many-to-many (multiple choice) and child records directly on the parent page, e.g. order items on the order page.
- **Bulk data:** bulk actions, CSV export and import, and Excel import with column mapping.
- **Data history:** an audit log (who changed what), soft delete with a restore button, and per-record revision history with a diff.
- **Content:** draft, published, and scheduled states with preview; automatic slugs and SEO fields; a media library; per-record content in two languages; and single settings pages (site name, contact, opening hours).
- **Workflows:** statuses with transition rules and approvals, internal notes per record, custom actions that run jobs, and per-record printing and PDF export.
- **Automations** in the style of Airtable/Zapier: "when record X is created or changed, send an email, a webhook, or run a job". Can be created through the AI.
- **Plain-language filters**, e.g. "orders this month over 1 million", which the AI turns into a regular filter.
- **Schema editor in the admin panel:** create tables and columns through the UI, and Zusantara writes the Drizzle schema and its migration with your approval.

#### Stage 13c · 0.13.2: views, users, and integrations

- **Views beyond tables:** a calendar for dated records, a kanban board for records with a status (change status by dragging), hierarchical data (categories, menus) with adjustable order, and a spreadsheet-style table (keyboard editing, grouping, totals and averages).
- **Saved views** per user (filters, columns, order) that can be shared, plus simple reports and charts from a table with no outside library.
- **Advanced permissions:** per column, and per-row rules (e.g. owner only), like RLS in Supabase.
- **User management:** invite, reset password, deactivate, and sign in as a user (logged).
- **Multi-tenant:** data separated per organization for SaaS apps.
- **Integrations:** an automatic JSON API per table with the same permissions, and webhooks when data changes.
- **Indonesian personal data law (UU PDP) compliance:** export and delete a user's personal data, and a consent log.
- **Operations:** database backup and restore, an "X is editing" marker with protection against overwriting, and a command palette (Ctrl+K) with keyboard shortcuts.

### Templates per kind of website: stages 13d, 13e, and 13f

Today `npm create zusantara` only has the general `api` and `minimal` templates (both stay). These three stages add 18 templates per kind of website, used through `npm create zusantara -- --template <name>` or picked from the interactive CLI and Zusantara AI.

Every template includes: full example pages built with the UI kit, sample data (seed), the admin panel from stages 13–13c, tests, a scaffold e2e, `AGENTS.md`, and text in Indonesian and English. Its example pages also become eval tasks in stage 15.

#### Stage 13d · 0.13.3: content and business

- `bisnis` (business website): home, services, about, team, testimonials, and contact.
- `portofolio` (portfolio): projects, gallery, profile, and a contact form.
- `blog`: articles, categories, tags, comments, and RSS.
- `berita` (news): sections, headlines, authors, archive, and most-read stories.
- `pemerintah` (government): agency profile, public services, announcements, public documents, and complaints.
- `layanan` (service provider): service list, prices, schedule booking, and order status.
- `statis` (static): a site with no database, exported to HTML files. Adds **`zusantara build --static`** to the core.
- `publik` (public): an organization or community portal with events, announcements, forms, and donations.

#### Stage 13e · 0.13.4: applications and transactions

- `toko` (online shop): catalog, cart, checkout, orders, and stock. Payments come through a stage 18 plugin.
- `elearning`: courses, lessons, quizzes, learning progress, and certificates.
- `berbagi-berkas` (file sharing): uploads, folders, share links with an expiry date, and quotas.
- `mesin-pencari` (search engine): content indexing, results pages, and search suggestions. Adds **full-text search** to the core (SQLite FTS5 and PostgreSQL).
- `dinamis` (dynamic): a general data-driven app with sign-in, as a starting point for any app.

#### Stage 13f · 0.13.5: community and access

- `sosial` (social media): profiles, follow, feed, likes, comments, and notifications. Adds **realtime notifications** (Server-Sent Events) to the core.
- `intranet`: sign-in required, staff directory, announcements, documents, and leave requests.
- `ekstranet` (extranet): a partner or client portal with a partner role, document sharing, and tickets.
- `pwa`: installable on phones and working offline. Adds **a manifest, a service worker, and offline mode** to the core.
- `spa`: navigation without full page reloads through htmx, still with no build step. React/Preact islands stay a stage 18 plugin.

### AI agents: stages 14 and 14b

Compared with Laravel Boost, the Next.js devtools MCP, Cursor, Devin, Replit Agent, Lovable, v0, ASP.NET, and Spring.

#### Stage 14 · 0.14: Zusantara for every AI agent

Developers who use Claude Code, Cursor, or other agents still get the best experience in a Zusantara project, with the same safety rules as Zusantara AI. **[pending decision: MCP moved up to this stage]**

- `zusantara mcp`: an MCP server with read tools (`describe`, `list_routes`, `view_page`, reading and searching files, dev server logs) and write tools (`make:*`, `db:generate`, `db:migrate`, writing and editing files). Path limits, the ban on `.env` and database files, and the critical actions are the same as in Zusantara AI, and every change can be undone with `zusantara undo`.
- `search_docs`: searches the Zusantara documentation for the installed version, so agents do not use outdated APIs.
- Runtime tools: the latest errors with stack traces, the request log, job status, emails sent during development, and read-only database queries with secret columns masked.
- Running a code snippet in the app's context (like Laravel's `tinker`), always with approval.
- Zusantara AI can use other MCP servers (e.g. GitHub, Figma).
- A project code index so the AI stays accurate in large projects.
- OpenAPI and typed clients generated automatically from routes, plus an architecture diagram from `zusantara describe`.
- A per-project AI rules file (what the AI may and may not do), a cost limit per task, an audit log of every agent action, and token cost shown per task.
- `AGENTS.md` (and a short `CLAUDE.md`) in every template in both languages. `zusantara agents` adds them to existing projects.
- `llms.txt` and `llms-full.txt` generated automatically for the documentation site.

#### Stage 14b · 0.14.1: an AI that plans and sees

- **Plan mode:** for large tasks, the AI shows a step-by-step plan first and only starts after you approve it.
- **Checkpoints per task** through git, so a whole large task can be undone at once.
- **Visual editing:** click an element on the page through the widget and ask "change this", and the AI knows the element and its file.
- **Image or design to page:** upload a screenshot or sketch, and the AI builds it with the UI kit.

### Testing: stages 15, 15b, and 15c

Compared with Laravel (Pest, Dusk, fakes), Rails (system tests), AdonisJS (Japa), Spring Boot (Testcontainers), ASP.NET, Phoenix (database sandbox), Go (built-in fuzzing), Playwright, and Stryker.

#### Stage 15 · 0.15: testing and AI evals

- `zusantara/testing`: `testApp()`, `loginAs`, test data factories, and `zusantara test --coverage`. Zusantara AI and the generators also write tests.
- Fakes for email, jobs, uploads, outgoing HTTP requests, and time (jump to a given date).
- An isolated database per test, parallel tests, PostgreSQL support, and real databases through Docker (like Testcontainers).
- `zusantara test --watch` and running only the tests affected by a change.
- **"Bug to test" workflow:** every bug report is first written as a failing test, then fixed.
- AI evals: standard tasks on the `api` template and the per-website templates, graded automatically (typecheck, tests, `view_page`, forbidden actions, number of steps, tokens). Model responses can be recorded so evals run in CI without an API key. Results are published per version on the documentation site.

#### Stage 15b · 0.15.1: browser tests and performance

- `zusantara test --browser` (optional Playwright): fill in forms, click, automatic screenshots on failure, and `view_page` layout checks as assertions.
- Basic accessibility checks as assertions.
- **Record tests from the browser:** click through a page with the widget, and it becomes a test file.
- Visual regression: screenshots compared with the previous version.
- `zusantara ci github` writes a GitHub Actions workflow for the user's project.
- `zusantara bench` for the performance of the user's app, and a framework benchmark against Express and Fastify in CI so later stages do not make Zusantara slower.

#### Stage 15c · 0.15.2: security tests and test quality

- **Automatic fuzzing** from validation schemas: every route is tested with random and invalid input.
- **Automatic security tests:** routes without auth, CSRF, security headers, injection, and access to another user's data.
- **Mutation testing** to measure whether tests (including AI-written ones) actually catch bugs rather than just pass.

### Stage 16 · 0.16: portable runtime and lean production package

Zusantara runs on Node, Bun, Deno, Vercel, and Cloudflare from one codebase.

- `app.fetch(request)` with standard `Request`/`Response` becomes the runtime core, and the Node server becomes a thin adapter on top of it. **[pending decision: fetch layer]**
- `zusantara build` writes a route manifest, so platforms without folder access can still serve routes.
- The `zusantara` package holds only the runtime, UI, database, and testing; the CLI and AI move to `@zusantara/cli`, which still installs with `npm install -g zusantara`. **[pending decision: package split]**
- Default security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS in production).
- Existing apps keep working without code changes.

### Stage 17 · 0.17: one-command deploy

- `zusantara deploy:check` and `zusantara deploy <target>`. Docker and PM2 are required, Vercel is fully supported, and Cloudflare is experimental.
- Vercel and Cloudflare use `app.fetch()` from stage 16, and the Docker image uses only the runtime package, so it is smaller.
- Zusantara AI may only use `--dry-run`; shipping to a server always asks for your approval. After a deploy, the health URL is checked and the result shown.

### Stage 18 · 0.18: plugin catalog

- `zusantara add <plugin>` with the first five plugins: Tailwind, charts (Chart.js), PostgreSQL, GitHub/Google sign-in, and Midtrans/Xendit payments.
- Coming in 0.18.x: rich text editor, maps, React/Preact islands, WhatsApp, and local formats (Rupiah, NPWP, e-Faktur). Subagents and a language server follow in 0.18.x or after 1.0.
- The license is settled before this stage, because plugin authors weigh the license before building on Zusantara. **[pending decision: license]**

### Stage 19 · 1.0: stable

- A frozen, documented API, a security audit (including `zusantara mcp` and the payment plugin), and a built-in CSP.
- Complete bilingual documentation with tutorials tested by e2e, a release and LTS policy, `CONTRIBUTING.md`, and architecture docs.
- Migration guides from Express and from Laravel.
- AI evals and benchmarks for 1.0 are published, and the final license is stated in the README and `package.json`. **[pending decision: license]**

## Integrating other frameworks

Zusantara keeps a single UI system, the `zusantara/ui` kit, so every page (including the ones Zusantara AI builds) looks consistent and needs no build step.

- **Stages 12b to 12d:** a complete UI kit, themes, and public page components mean apps no longer have to look like the Zusantara brand, still with no build step.
- **Stage 13:** [htmx](https://htmx.org) joins the core for pagination, filters, and form saves without full page reloads. The server still sends HTML.
- **Stage 14:** other AI agents (Claude Code, Cursor, and other MCP clients) can work in a Zusantara project through `zusantara mcp` and `AGENTS.md`.
- **Stage 18:** Tailwind, charts, rich text editors, maps, payments, Google/GitHub sign-in, and React/Preact "islands" become optional plugins from an official catalog (`zusantara add <plugin>`). Zusantara AI only offers them as options when a request actually needs one, with "no plugin" as the default, and installing always asks for approval.

## Stage 10: English (done)

The goal: Zusantara can be used fully in Indonesian **or** English, without changing behavior for existing users. Indonesian stays the default.

This stage came before the back-end work, so stages 11 to 19 are written in both languages from the start.

1. **i18n foundation in the core**
   - `id` and `en` message catalogs and a typed `t()` (a wrong key is a TypeScript error).
   - The language comes from `zusantara.config.mjs` (`locale: "en"`), the `ZUSANTARA_LANG` env, or `zusantara lang en`.
2. **CLI and Zusantara AI**
   - Every text in the classic CLI, the Ink CLI, `ai:setup`, and error messages comes from the catalogs.
   - Zusantara AI replies in the user's language, and its system instructions are in English.
3. **Built-in framework pages**
   - The welcome page, development error and 404 pages, and the production status page.
   - Default `HttpError` and validation messages.
4. **The `zusantara/ui` kit**
   - Built-in texts such as "Skip to content", "Sign out", "Search…", and "No data yet" follow `page({ lang })`.
   - Numbers, currency, and dates are formatted with `Intl` for the language.
5. **Project creator and templates**
   - `npm create zusantara` asks for the language (or `--lang en`).
   - The `api` and `minimal` templates come in both languages: page texts, validation messages, README, and tests.
6. **Documentation**
   - An English documentation site under `/en/` with a language switcher.
   - Bilingual npm package READMEs, and English release notes from 0.12 on.
7. **Testing**
   - Tests make sure every catalog key exists in both languages.
   - e2e runs the main flows in `id` and `en`.
