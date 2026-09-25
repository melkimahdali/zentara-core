---
title: Language (English/Indonesian)
order: 1.5
group: Reference
description: "Use Zentara in English or Indonesian: CLI, Zentara AI, built-in pages, UI kit, and templates."
---

# Language (English/Indonesian)

Zentara is available in Indonesian (`id`, the default) and English (`en`). The chosen language is used by the CLI, Zentara AI, the welcome and error pages, built-in error messages, the `zentara/ui` kit, and the project creator. The Indonesian documentation is at [the site root](../index.html).

## Choosing the language

```bash
npx zentara lang          # show the active language
npx zentara lang en       # save the choice for all projects (~/.zentara/settings.json)
```

In the interactive CLI, type `/lang en` or `/lang id`.

For one project, set it in the config. This value also sets the language of the app's pages in production:

```js
// zentara.config.mjs
export default {
  locale: "en",
};
```

Precedence:

1. the `ZENTARA_LANG` env (e.g. `ZENTARA_LANG=en npx zentara dev`)
2. `locale` in `zentara.config.mjs`
3. the global choice from `zentara lang` (not used when `NODE_ENV=production`)
4. `id`

## New projects

`npm create zentara` asks for the language first, or choose it directly:

```bash
npm create zentara@latest my-app -- --lang en
```

The `api` and `minimal` templates come in both languages: page texts, validation messages, sample data, README, comments, and tests. The code is identical; only the texts differ.

## Zentara AI

Zentara AI replies in the language you write in. Tool names and the model's instructions are in English, while tool results and error messages follow the active language.

## UI kit & formatting

The UI kit's built-in texts ("Skip to content", "Sign out", "No data yet", and more) follow the active language. For a single page, use `page({ title, lang: "en" })`.

```ts
import { formatDate, formatNumber, money } from "zentara/ui";

money(12.5);              // "$12.50" (en) · money(125000) -> "Rp125.000" (id)
formatNumber(12500);      // "12,500" (en) · "12.500" (id)
formatDate(new Date());   // "Sep 25, 2026" (en) · "25 Sep 2026" (id)
```

In app code, read the active language with `getLocale()` from `"zentara"`.
