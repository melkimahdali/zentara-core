---
title: Language (English/Indonesian)
order: 1.5
group: Reference
description: "Use Zusantara in English or Indonesian: CLI, Zusantara AI, built-in pages, UI kit, and templates."
---

# Language (English/Indonesian)

Zusantara is available in Indonesian (`id`, the default) and English (`en`). The chosen language is used by the CLI, Zusantara AI, the welcome and error pages, built-in error messages, the `zusantara/ui` kit, and the project creator. The Indonesian documentation is at [the site root](../index.html).

## Choosing the language

The first time `zusantara` opens (no language chosen yet), Zusantara asks for the language first and saves it. To change it any time:

```bash
npx zusantara lang          # show the active language
npx zusantara lang en       # save the choice for all projects (~/.zusantara/settings.json)
```

In the interactive CLI, type `/lang en` or `/lang id`.

For one project, set it in the config. This value also sets the language of the app's pages in production:

```js
// zusantara.config.mjs
export default {
  locale: "en",
};
```

Precedence:

1. the `ZUSANTARA_LANG` env (e.g. `ZUSANTARA_LANG=en npx zusantara dev`)
2. `locale` in `zusantara.config.mjs`
3. the global choice from `zusantara lang` (not used when `NODE_ENV=production`)
4. `id`

## New projects

`npm create zusantara` asks for the language first, and so does *Create a new project* in the interactive CLI. Or choose it directly:

```bash
npm create zusantara@latest my-app -- --lang en
```

The `api` and `minimal` templates come in both languages: page texts, validation messages, sample data, README, comments, and tests. The code is identical; only the texts differ.

## Zusantara AI

Zusantara AI replies in the language you write in. Tool names and the model's instructions are in English, while tool results and error messages follow the active language.

## UI kit & formatting

The UI kit's built-in texts ("Skip to content", "Sign out", "No data yet", and more) follow the active language. For a single page, use `page({ title, lang: "en" })`.

```ts
import { formatDate, formatNumber, money } from "zusantara/ui";

money(12.5);              // "$12.50" (en) · money(125000) -> "Rp125.000" (id)
formatNumber(12500);      // "12,500" (en) · "12.500" (id)
formatDate(new Date());   // "Sep 25, 2026" (en) · "25 Sep 2026" (id)
```

In app code, read the active language with `getLocale()` from `"zusantara"`.
