---
title: CSRF, CORS & security
order: 4
group: Data & security
description: Built-in protection for your app.
---

# CSRF, CORS & security

- **`csrf()`** needs no tokens. It checks the `Sec-Fetch-Site` and `Origin` headers sent by modern browsers and rejects (`403`) state-changing requests from other origins. Non-browser clients such as curl or server-to-server calls are not affected. Options: `trustedOrigins` and `skip(ctx)`.
- **`cors()`** handles simple and preflight requests. Options: `origin` (string, array, RegExp, or function), `credentials`, `methods`, `allowedHeaders`, `exposedHeaders`, and `maxAge`.

## Rate limiting

```ts
import { rateLimit } from "zentara";

// In a route file: allow 10 requests per 15 minutes per IP (e.g. for sign-in).
export const middleware = [rateLimit({ windowMs: 15 * 60_000, max: 10 })];
```

## File uploads

`saveUpload()` stores files under random names, takes the type from the extension (not from the browser's claim), rejects executable extensions (`.html`, `.svg`, `.js`, `.php`, ...), and checks the contents of images and PDFs. [Details](upload.html#security).

## Error pages & debug mode

During development (`NODE_ENV=development`, set automatically by `zentara dev`), the browser shows a full error page: stack trace, code excerpt, and request details (secret headers are hidden). In production, visitors only see a simple status page with no internal details. Override it with `debug` in `zentara.config.mjs` or the `ZENTARA_DEBUG` env, but never enable it in production.

## Zentara AI safety

- The AI **never** reads or changes `.env` or database files, and cannot write to `.git/`, `node_modules/`, `dist/`, or outside the project folder.
- Critical actions (deleting files, installing packages, database migrations, changing `package.json`/config, terminal commands outside the read-only list) **always** ask for approval, even in auto mode.
- Terminal commands run without a shell, so pipes, `&&`, redirects, and variables are rejected. Admin commands, nested shells, credentials (`npm publish`, `git push`, `git config`), and arguments that mention `.env` or paths outside the project are rejected too. Secret values are redacted from output before it is sent to the AI provider. [Details](zentara-ai.html#terminal-commands).
- Conversation history (`.zentara/sessions/`) is stored readable by the owner only and ignored by git.
- The browser chat is only active during development, through a server on `127.0.0.1` with a per-session token and a `localhost` origin.
- OmniRoute started by Zentara only listens on `127.0.0.1`.
