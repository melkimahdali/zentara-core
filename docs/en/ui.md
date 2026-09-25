---
title: UI kit (zentara/ui)
order: 1
group: Front-End
description: Zentara-branded HTML components for sign-in, dashboard, and admin pages.
---

# UI kit (zentara/ui)

`zentara/ui` provides ready-to-use server-side HTML components. They follow the Zentara Core brand: the Plus Jakarta Sans font, a single teal accent (gold only in the logo), dark/light mode that follows the system, and responsive layouts on phones. No build step, and every text is escaped automatically.

```ts
import { h, type ZenContext } from "zentara";
import { AuthCard, Button, Field, Form, page } from "zentara/ui";

export function GET(ctx: ZenContext) {
  return page(
    { title: "Sign in" },
    h(AuthCard, { title: "Sign in", subtitle: "Welcome back" },
      h(Form, { action: "/login" },
        h(Field, { name: "email", label: "Email", type: "email", required: true }),
        h(Field, { name: "password", label: "Password", type: "password", required: true }),
        h(Button, { block: true }, "Sign in"),
      ),
    ),
  );
}
```

`page()` produces a complete HTML document that loads the `/_zentara/ui.css` stylesheet. That stylesheet, along with the logo (`/_zentara/logo.webp`), favicons, and fonts, is served by the framework itself, so there's nothing to copy into `public/`.

Every page from `page()` also comes with:

- **Built-in texts in the active language** (`id` or `en`), or `page({ lang })` for a single page. See [Language](bahasa.html).
- **Self-hosted Plus Jakarta Sans** in `/_zentara/fonts/` (latin and latin-ext subsets, SIL OFL license at `/_zentara/fonts/LICENSE.txt`). No requests to Google Fonts or other CDNs.
- **A "Skip to content" link** for keyboard users, pointing to the `#konten` element.
- **Loading state on forms.** When a form is submitted, its button is disabled and gets `aria-busy`, so it can't be sent twice. If the button has `loading`, its text changes, e.g. `h(Button, { loading: "Saving…" }, "Save")`. This small script can be turned off with `page({ title, script: false })`; pages still work without it.
- A subtle entrance animation, turned off automatically for users who prefer *reduced motion*.

## Components

| Component | Use |
|---|---|
| `page(options, ...body)` | a complete HTML document: `title`, `description`, `lang`, extra `head`, `script` |
| `AuthCard` | sign-in and sign-up pages: `title`, `subtitle`, `footer`, `appName`. With `aside: { title, text }` the screen splits in two: a brand panel on the left, the form on the right (stacked on phones) |
| `AppShell` | an app frame with top navigation: logo, menu (`nav`, `active`, separators via `section`), user and *Sign out* button (POST to `/logout`), title, `subtitle`, `actions` |
| `StatGroup` · `Stat` | a strip of summary numbers with thin dividers (not a row of identical cards) |
| `Card` · `Split` · `Grid` | a titled card, a 2:1 two-column layout (main content and side panel), and a responsive grid |
| `Form` · `FormRow` · `Field` · `FormActions` | a POST form, a row of several fields, a labeled input with `error`, `hint`, and `inputmode` (correct accessibility attributes; passwords are never refilled), and the button row at the end of a form |
| `Button` · `PostButton` | a button or button-styled link (`loading` for the text while submitting), and a button that sends a POST with a confirmation (e.g. delete) |
| `Search` · `Disclosure` | a search field (GET, `?q=`, with a *Clear* link), and a JavaScript-free expandable section, e.g. an "add item" form |
| `Alert` · `Badge` | messages (`info`, `success`, `error`, `warn`) and small square labels (`accent`, `ok`, `warn`, `danger`) |
| `Table` · `List` · `EmptyState` | a data table (`align: "num"` columns for numbers, `"end"` for right alignment), a compact two-sided list, and an empty state that suggests the next step |
| `Avatar` · `Brand` | name initials and the logo with the app name |
| `money()` · `formatNumber()` · `formatDate()` · `rupiah()` | money, numbers, and dates in the active [language](bahasa.html); `rupiah(45000)` is always `Rp45.000` |

Every color is a CSS variable (`--zu-accent`, `--zu-bg`, `--zu-surface`, and so on). Change the theme by overriding them through `head`:

```ts
page({ title: "Studio", head: h("style", null, raw(":root{--zu-accent:#c89b52}")) }, ...);
```

## Forms with per-field errors

`tryParse()` validates without throwing, so the form can be shown again with its messages:

```ts
import { html, readInput, redirect, tryParse } from "zentara";

export async function POST(ctx: ZenContext) {
  const raw = await readInput(ctx); // HTML forms or JSON
  const input = await tryParse(NoteForm, raw);
  if (!input.ok) return html(view({ values: raw, errors: input.errors }), { status: 422 });
  await db.insert(notes).values({ ...input.data, userId: (ctx.state.user as User).id });
  return redirect("/notes?msg=created", 303);
}
```

Values from HTML forms are always strings, so use `z.coerce.number()` for numbers. The built-in CSRF protection (`csrf()`) works through browser headers, so forms need no hidden token.

## Pages that require sign-in

`requireAuth({ redirectTo: "/login" })` sends guests to the sign-in page with `?next=<original page>` instead of answering 401. Users with the wrong role still get 403:

```ts
export const requireUserPage = requireAuth<User>({ loadUser, redirectTo: "/login" });
export const requireAdminPage = requireAuth<User>({ loadUser, roles: ["admin"], redirectTo: "/login" });
```

After sign-in, redirect to local paths only. The `api` template includes `safeNext()`, which rejects `https://…` and `//…` to prevent *open redirects*.

## Built-in pages in the api template

A new project from `npm create zentara` (the **api** template) comes with:

| Page | Contents |
|---|---|
| `/login` · `/register` | sign-in and sign-up forms, with validation, error messages, and attempt limits |
| `/dashboard` | a summary (notes, activity this week, users), recent notes, and ideas for what to build next |
| `/notes` | an example of user-owned data: write, search, and list notes (each user only sees their own) |
| `/notes/:id` | edit and delete a note |
| `/admin/users` | users and their roles (admins only) |

All of these pages live in `src/app/routes/` and are yours to change. `src/app/lib/ui.ts` contains `appPage()` (the frame with top navigation) and `APP_NAME`. Zentara AI uses this kit too when you ask for a new page, e.g. *"build a booking schedule page for signed-in users"*.
