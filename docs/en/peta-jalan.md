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
| 12 | 0.12.5 | Zentara AI chat on every page during development, and an AI that can see the page and check its layout on desktop and mobile (`view_page`) |
| 12b | 0.12.6 | Layout foundations and complete forms: layout, Select, Checkbox, Radio, Switch, file upload, theme config, and a component catalog |
| 12c | 0.12.7 | Navigation, dialogs, notifications, and data display: Navbar, Tabs, Pagination, Dialog, Toast, Accordion, Timeline, Calendar, 403/404/500 pages |
| 12d | 0.12.8 | Public pages and ready-made patterns: Hero, Pricing, Gallery, FAQ, Testimonial, ProductCard, cart, and full example pages |
| 13 | 0.13 | Data and admin panel: automatic CRUD from the schema, relations, pagination, filters, interactions without full page reloads using [htmx](https://htmx.org), and the `zentara describe --json` app manifest |
| 14 | 0.14 | Zentara for every AI agent: `zentara mcp`, `AGENTS.md` in the templates, and `llms.txt` for the docs |
| 15 | 0.15 | Testing and AI evals: test helpers, factories, coverage reports, published AI eval results, and baseline benchmarks |
| 16 | 0.16 | Portable runtime: a standard `app.fetch()` core and a lean production package without the CLI/AI |
| 17 | 0.17 | One-command deploy: Docker, PM2, Vercel, and Cloudflare (experimental) |
| 18 | 0.18 | Official plugin catalog, with Midtrans/Xendit payments from the start |
| 19 | 1.0 | Stable: frozen API, security audit, built-in CSP, release and LTS policy, migration guides |

Items marked **[pending decision]** below follow the current recommendation and may still change.

### Stage 12 · 0.12.5: chat on every page and `view_page`

The goal: Zentara AI can be called from any page during development, and can **see for itself** the pages it builds, including whether the layout looks right. This stage also lays the groundwork for the UI kit in stage 12b and the AI evals in stage 15, so those stages do not have to rework stage 12.

**Chat widget**
- Injected into every HTML response only when three conditions hold: `config.debug`, devtools is running, and the server was started by `zentara dev` or the interactive CLI. `zentara start` and production never load it, and the `/_zentara/dev/*` assets return 404 in production.
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
- `zentara view <url> [--mobile]` prints the same result in the terminal, and the interactive CLI shows `view_page` results like any other tool.
- All widget, tool, and layout-check text is available in Indonesian and English.

**Done when**
- Unit: widget injection conditions, filtering of private data, every kind of layout check on a deliberately broken sample page, and `expect`.
- e2e: in a scaffolded project, `zentara dev` injects the widget and `zentara start` does not; `zentara view /login` and `zentara view /login --mobile` pass with no findings; the broken sample page produces the right findings.
- AI smoke (manual/scheduled): a request such as "add page X" ends with a `view_page` that passes on desktop and mobile.

### A complete UI kit: stages 12b, 12c, and 12d

The `zentara/ui` kit currently has about 25 components, almost all of them for dashboards and simple forms. `Field` does not even have a dropdown (`select`), checkboxes, radio buttons, switches, or file upload yet. Because Zentara AI may not write its own CSS, every missing component is a layout the AI cannot build. The three stages below complete the UI kit before the admin panel, done in order with one PR per stage.

**Rules for every new component** (in 12b, 12c, 12d, and later stages):
- Rendered on the server and fully working without JavaScript. A small built-in script only adds convenience (e.g. closing a dialog with Esc).
- Built-in text in Indonesian and English, light and dark mode, and following the theme from `zentara.config.mjs`.
- Accessible: the right HTML elements, labels, keyboard focus, and enough contrast.
- Listed in the component catalog (examples and purpose for the AI) and the `/_zentara/ui` gallery.
- Covered by unit tests (id/en rendering, escaping, no JS) and passing the `view_page` layout checks on desktop and mobile.

#### Stage 12b · 0.12.6: layout foundations and complete forms

- **Layout:** `Container`, `Stack`, `Row`/`Cluster`, `Columns`, `Section`, `Divider`, and `PageHeader` (title, description, breadcrumb, and action buttons). Spacing and alignment through props with a fixed set of values.
- **Complete forms:** `Select`, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `Switch`, `FileInput` (with image preview, wired to `saveUpload`), `Fieldset`, inputs with a prefix/suffix (e.g. "Rp"), show/hide password, and the `time`, `datetime-local`, `month`, `range`, and `color` types in `Field`. Validation and error messages still go through `tryParse` as today.
- **Theme** in `zentara.config.mjs` (`ui: { accent, radius, font, mode }`), so colors and fonts can change without CSS. The default stays the Zentara brand.
- **Component catalog** for the AI (id/en, generated from source) and the `/_zentara/ui` gallery during development. `zentara ui` prints the catalog and `zentara theme` sets the theme.
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

**After 12d:** components that need server interaction (tables with filtering, sorting, and inline editing; `Combobox` search; bulk actions) come in stage 13 with htmx. Heavy components that need outside libraries (rich text editor, charts, maps, date range picker) stay plugins in stage 18.

### Stage 13 · 0.13: data and admin panel

- htmx joins the core, with an `hx` prop in the UI kit, new components for tables, filters, and forms, and badged menu items. The admin panel uses the components from stages 12b to 12d, plus components that need the server: a searchable `Combobox`, sortable tables with inline editing, and bulk actions.
- `zentara make:admin` builds admin pages from the database schema.
- `zentara describe --json` prints an app manifest (routes, tables and columns, admin pages, jobs, plugins) without secret columns. Zentara AI uses it as starting context, and it becomes the main tool of `zentara mcp`.

### Stage 14 · 0.14: Zentara for every AI agent

Developers using Claude Code, Cursor, or other agents still get the best experience in a Zentara project, under the same safety rules as Zentara AI. **[pending decision: moving MCP up to this stage]**

- `zentara mcp`: an MCP server with read tools (`describe`, `list_routes`, `view_page`, reading and searching files, dev server logs) and change tools (`make:*`, `db:generate`, `db:migrate`, writing and editing files). Path limits, the ban on `.env` and database files, and critical actions match Zentara AI, and every change can be reverted with `zentara undo`.
- `AGENTS.md` (plus a short `CLAUDE.md`) in the `api` and `minimal` templates, in both languages. `zentara agents` adds them to existing projects.
- `llms.txt` and `llms-full.txt` generated automatically for the documentation site.

### Stage 15 · 0.15: testing and AI evals

- `zentara/testing`: `testApp()`, `loginAs`, test data factories, and `zentara test --coverage`. Zentara AI and the generators write tests too.
- AI evals: 20 to 30 standard tasks on the `api` template, graded automatically (typecheck, tests, `view_page`, forbidden actions, steps, tokens). Results are published per version on the documentation site.
- Baseline requests-per-second and latency benchmarks against Express and Fastify, run in CI so later stages don't make Zentara slower.

### Stage 16 · 0.16: portable runtime and lean production package

Zentara runs on Node, Bun, Deno, Vercel, and Cloudflare from one codebase.

- `app.fetch(request)` with standard `Request`/`Response` becomes the runtime core, and the Node server becomes a thin adapter on top of it. **[pending decision: fetch layer]**
- `zentara build` writes a route manifest, so platforms without folder access can still serve routes.
- The `zentara` package holds only the runtime, UI, database, and testing; the CLI and AI move to `@zentara/cli`, which still installs with `npm install -g zentara`. **[pending decision: package split]**
- Default security headers (`X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, HSTS in production).
- Existing apps keep working without code changes.

### Stage 17 · 0.17: one-command deploy

- `zentara deploy:check` and `zentara deploy <target>`. Docker and PM2 are required, Vercel is fully supported, and Cloudflare is experimental.
- Vercel and Cloudflare use `app.fetch()` from stage 16, and the Docker image uses only the runtime package, so it is smaller.
- Zentara AI may only use `--dry-run`; shipping to a server always asks for your approval. After a deploy, the health URL is checked and the result shown.

### Stage 18 · 0.18: plugin catalog

- `zentara add <plugin>` with the first five plugins: Tailwind, charts (Chart.js), PostgreSQL, GitHub/Google sign-in, and Midtrans/Xendit payments.
- Coming in 0.18.x: rich text editor, maps, React/Preact islands, WhatsApp, and local formats (Rupiah, NPWP, e-Faktur). Subagents and a language server follow in 0.18.x or after 1.0.
- The license is settled before this stage, because plugin authors weigh the license before building on Zentara. **[pending decision: license]**

### Stage 19 · 1.0: stable

- A frozen, documented API, a security audit (including `zentara mcp` and the payment plugin), and a built-in CSP.
- Complete bilingual documentation with tutorials tested by e2e, a release and LTS policy, `CONTRIBUTING.md`, and architecture docs.
- Migration guides from Express and from Laravel.
- AI evals and benchmarks for 1.0 are published, and the final license is stated in the README and `package.json`. **[pending decision: license]**

## Integrating other frameworks

Zentara keeps a single UI system, the `zentara/ui` kit, so every page (including the ones Zentara AI builds) looks consistent and needs no build step.

- **Stages 12b to 12d:** a complete UI kit, themes, and public page components mean apps no longer have to look like the Zentara brand, still with no build step.
- **Stage 13:** [htmx](https://htmx.org) joins the core for pagination, filters, and form saves without full page reloads. The server still sends HTML.
- **Stage 14:** other AI agents (Claude Code, Cursor, and other MCP clients) can work in a Zentara project through `zentara mcp` and `AGENTS.md`.
- **Stage 18:** Tailwind, charts, rich text editors, maps, payments, Google/GitHub sign-in, and React/Preact "islands" become optional plugins from an official catalog (`zentara add <plugin>`). Zentara AI only offers them as options when a request actually needs one, with "no plugin" as the default, and installing always asks for approval.

## Stage 10: English (done)

The goal: Zentara can be used fully in Indonesian **or** English, without changing behavior for existing users. Indonesian stays the default.

This stage came before the back-end work, so stages 11 to 19 are written in both languages from the start.

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
