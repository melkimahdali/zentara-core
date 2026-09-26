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
| `StatGroup` · `Stat` | a strip of summary numbers with thin dividers (not a row of identical cards); `trend: "up"` and `change: "12%"` show a colored change |
| `Container` · `Stack` · `Row` · `Cluster` · `Columns` | layout without CSS: content width, a vertical stack, a horizontal row, a group of small items, and equal columns that stack on phones. Spacing through `gap` (`none`, `xs`, `sm`, `md`, `lg`, `xl`), alignment through `align` and `justify` |
| `PageHeader` · `Section` · `Divider` | a page header (breadcrumb, title, description, action buttons), a titled section without a box, and a separator line (optionally with text, e.g. "or") |
| `Card` · `Split` · `Grid` | a titled card, a 2:1 two-column layout (main content and side panel), and a responsive grid |
| `Form` · `FormRow` · `Field` · `FormActions` | a POST form (`upload: true` for file uploads), a row of several fields, a labeled input with `error`, `hint`, `inputmode`, a prefix/suffix (`prefix: "$"`), a *Show* button on passwords, and the `date`, `time`, `datetime-local`, `month`, `range`, and `color` types (passwords are never refilled), and the button row at the end of a form |
| `Select` · `Checkbox` · `CheckboxGroup` · `RadioGroup` · `Switch` | a dropdown (with groups and a `placeholder`), a single checkbox, several checkboxes, pick-one options, and an on/off switch |
| `FileInput` · `Fieldset` | a file upload with a hint written from `types` and `maxBytes` (the same as `saveUpload`) and an image preview, and a titled group of fields |
| `Button` · `PostButton` | a button or button-styled link (`loading` for the text while submitting), and a button that sends a POST with a confirmation (e.g. delete) |
| `Search` · `Disclosure` | a search field (GET, `?q=`, with a *Clear* link), and a JavaScript-free expandable section, e.g. an "add item" form |
| `Alert` · `Badge` | messages (`info`, `success`, `error`, `warn`) and small square labels (`accent`, `ok`, `warn`, `danger`) |
| `Table` · `List` · `EmptyState` | a data table (`align: "num"` columns for numbers, `"end"` for right alignment), a compact two-sided list, and an empty state that suggests the next step |
| `Avatar` · `Brand` | name initials and the logo with the app name |
| `Navbar` · `Footer` · `BottomNav` | top bar for public pages (links and buttons move into a *Menu* on phones, no JavaScript), a footer with link columns, and a phone-only bottom navigation |
| `Breadcrumb` · `Tabs` · `Pagination` · `Steps` | page location trail, tabs made of links (`?tab=…`, with `count`), page numbers (`href: "?page={page}"`, compact on phones), and process steps (`current` starts at 1) |
| `DropdownMenu` | a button that opens a list of actions: links, or POSTs (`action`) for actions such as delete |
| `Dialog` · `ConfirmDialog` · `Drawer` · `Sheet` | a centered dialog, a confirmation dialog that sends a POST, a drawer from the side (`side`), and a sheet from the bottom. Open them with `trigger: "Label"` or `h(Button, { opens: id })`; they use the browser's built-in `popover` attribute, so Esc and clicking outside close them without JavaScript |
| `Popover` · `Tooltip` | a small box below its button, and a hint on hover or keyboard focus |
| `Toast` · `flash()` · `takeFlash()` | a floating message that disappears by itself, including a one-time message after a redirect (see below) |
| `Progress` · `Spinner` · `Skeleton` | a progress bar (no `value` = in progress), a loading indicator, and a placeholder for content that is loading |
| `DescriptionList` · `Timeline` · `Accordion` | details of one record (label and value), a sequence of events, and sections that open and close (`single: true` = one open at a time) |
| `Tag` · `AvatarGroup` · `Rating` · `CodeBlock` | a pill-shaped category label (optionally a link), a row of avatars with "+N", a star rating (display, or an input with `name`), and a code block with a *Copy* button |
| `Calendar` | a one-month calendar with events (bookings, schedules); `href: "/schedule?month={month}"` for the previous and next month, a list on phones |
| `StatusPage` · `statusPage()` | a status page (403, 404, 500, …) in the app theme. The framework uses it for errors in production |
| `money()` · `formatNumber()` · `formatDate()` · `rupiah()` | money, numbers, and dates in the active [language](bahasa.html); `rupiah(45000)` is always `Rp45.000` |

## Layout without CSS

Build pages with the layout primitives. Spacing and alignment are props with a fixed set of values, so the page stays tidy on desktop and phones without any CSS:

```ts
page(
  { title: "Products" },
  h(Container, { pad: true },
    h(PageHeader, {
      title: "Products",
      description: "Manage the store catalog",
      breadcrumb: [{ label: "Home", href: "/" }, { label: "Products" }],
      actions: h(Button, { href: "/products/new" }, "Add"),
    }),
    h(Stack, { gap: "lg" },
      h(Columns, { cols: 3 }, ...cards),
      h(Section, { title: "Best sellers" }, h(Table, { ... })),
    ),
  ),
);
```

## Complete forms

```ts
h(Form, { action: "/products", upload: true },
  h(Field, { name: "name", label: "Name", value: values.name, error: errors.name }),
  h(FormRow, null,
    h(Field, { name: "price", label: "Price", type: "number", prefix: "$", value: values.price }),
    h(Select, { name: "category", label: "Category", placeholder: "Choose a category", options: ["Coffee", "Tea"], value: values.category }),
  ),
  h(CheckboxGroup, { name: "days", label: "Available days", inline: true, options: ["Mon", "Tue", "Wed"], values: values.days }),
  h(RadioGroup, { name: "delivery", label: "Delivery", options: [{ value: "pickup", label: "Pick up" }, { value: "courier", label: "Courier", hint: "$2" }], value: values.delivery }),
  h(Switch, { name: "active", label: "Show in the store", checked: true }),
  h(FileInput, { name: "photo", label: "Photo", types: ["image/*"], maxBytes: "5mb", preview: product.photoUrl }),
  h(FormActions, null, h(Button, { loading: "Saving…" }, "Save")),
)
```

- **Every field** has a `label`, `error`, and `hint` with the right `aria-describedby`, and works without JavaScript.
- **`FileInput`** takes the same `types` and `maxBytes` as `saveUpload()` in the handler, so the browser only offers matching files and the hint is written for you (e.g. "Image, max. 5 MB"). A newly chosen image is previewed right away. The form needs `upload: true`. See [File uploads](upload.html).
- **Checkboxes and switches** send nothing when off. `CheckboxGroup` sends the same name several times: read it with `form.getAll("days")` from `readForm()`.
- **The *Show* button** on passwords only appears when JavaScript runs. Turn it off with `reveal: false`.

## Theme

The accent color, corner radius, font, and dark/light mode are set in `zentara.config.mjs`, without CSS:

```js
export default {
  ui: { accent: "blue", radius: "lg", font: "system", mode: "auto" },
};
```

| Option | Values |
|---|---|
| `accent` | `teal` (default), `blue`, `sky`, `cyan`, `indigo`, `violet`, `purple`, `pink`, `rose`, `red`, `orange`, `amber`, `gold`, `brown`, `green`, `emerald`, `slate`, or a `#rrggbb` hex |
| `radius` | `none`, `sm`, `md` (default), `lg` |
| `font` | `jakarta` (Plus Jakarta Sans, default), `system`, `serif`, `mono` |
| `mode` | `auto` (follow the system, default), `light`, `dark` |

The accent color is adjusted for light and dark mode automatically, so text on buttons and links keeps WCAG AA contrast whatever color you pick. You can also set it from the terminal:

```bash
npx zentara theme                                  # show the current theme
npx zentara theme --accent blue --radius lg        # change it (written to zentara.config.mjs)
npx zentara theme --reset                          # back to the default
```

The dev server reloads the config on its own. Zentara AI runs the same command when you ask, for example, *"make the main color blue"*.

## Navigation and dialogs

All navigation is made of plain links, so every tab and page has its own URL and works without JavaScript:

```ts
h(Navbar, { appName: "Senja Bakery", links: [{ href: "/", label: "Home" }, { href: "/menu", label: "Menu" }], active: "/menu", actions: h(Button, { href: "/order", small: true }, "Order") }),
h(Tabs, { items: [{ href: "?tab=new", label: "New", count: 3 }, { href: "?tab=done", label: "Done" }], active: `?tab=${tab}` }),
h(Pagination, { page, pages, href: "/products?page={page}" }),
```

Dialogs, drawers, and popovers use the browser's built-in `popover` attribute. Set `trigger` to render the opening button too, or open them from any button with `opens`:

```ts
h(ConfirmDialog, { id: `delete-${p.id}`, trigger: "Delete", title: `Delete ${p.name}?`, text: "Deleted products cannot be restored.", action: `/products/${p.id}/delete`, confirm: "Delete" }),
h(Button, { opens: "filters", variant: "secondary" }, "Filters"),
h(Drawer, { id: "filters", title: "Filters" }, ...),
```

A `Dialog` with `open: true` opens as soon as the page loads, for example when the form inside it has errors.

## Messages after a redirect (flash)

`flash(ctx, message)` stores a message to show once on the next page, and `takeFlash(ctx)` takes it. The message lives in the session when the `session()` middleware is installed, otherwise in a short-lived `zen_flash` cookie:

```ts
import { flash, redirect, takeFlash } from "zentara";
import { Toast } from "zentara/ui";

export async function POST(ctx: ZenContext) {
  // … save the data
  flash(ctx, "Note saved.");
  return redirect("/notes", 303);
}

// On the target page: no message = Toast renders nothing.
h(Toast, { flash: takeFlash(ctx) })
```

The default tone is `success`; use `flash(ctx, "Could not send the email", "error")` for others. The toast disappears after 6 seconds (`timeout: 0` = stays).

## Error pages

In production, 403, 404, 500, and other statuses are shown with the UI kit and the app theme (`ui` in `zentara.config.mjs`), with the app name (`appName`) and a button back to the home page. The message from `throw new HttpError(403, "Only admins can open this page")` is shown too; details of a 500 error never are. During development, 404 and 500 keep the richer developer pages.

For your own status page, use `h(StatusPage, { status: 404, text: "…", action: … })` inside `page()`, or `statusPage(404)` for a full document.

## Component catalog and gallery

- **`zentara ui`** prints every component by group. `zentara ui Select` shows what it is for, every prop with its type and allowed values, and an example. `--json` for other tools.
- **The `/_zentara/ui` gallery** during `zentara dev`: every component with a live example in your app's theme. The gallery does not exist in production.
- **Zentara AI** reads the same catalog (the `ui_catalog` tool), arranges the page with the layout primitives, then checks it with `view_page` on desktop and mobile. When the kit cannot build what you asked for, the AI explains the limit and offers custom CSS, which it only writes after you agree.

The catalog is generated from the JSDoc in the UI kit's code, so it always matches the installed zentara version.

## Forms with per-field errors

`tryParse()` validates without throwing, so the form can be shown again with its messages:

```ts
import { flash, html, readInput, redirect, tryParse } from "zentara";

export async function POST(ctx: ZenContext) {
  const raw = await readInput(ctx); // HTML forms or JSON
  const input = await tryParse(NoteForm, raw);
  if (!input.ok) return html(view({ values: raw, errors: input.errors }), { status: 422 });
  await db.insert(notes).values({ ...input.data, userId: (ctx.state.user as User).id });
  flash(ctx, "Note saved.");
  return redirect("/notes", 303);
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
