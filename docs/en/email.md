---
title: Email
order: 2
group: Back-End
description: Send email over SMTP with sendMail(); logged during development and collected in tests.
---

# Email

```ts
import { sendMail } from "zentara";

await sendMail({
  to: "sarah@mail.test",
  subject: "We received your order",
  text: "Thank you, order #1042 is being processed.",
  html: "<p>Thank you, order <b>#1042</b> is being processed.</p>",
});
```

Other options: `from`, `cc`, `bcc`, `replyTo`, `headers`, and `attachments` (`{ filename, content, contentType }`). Subjects and names with non-ASCII characters are encoded automatically.

Send email from a [job](jobs.html), not directly from a route. Users don't have to wait for the mail server, and failed emails are retried.

## Setup

Delivery is configured with the `MAIL_URL` env, and the sender with `MAIL_FROM` or `mail.from` in the config:

```bash
# .env
MAIL_URL=smtp://user:password@smtp.example.com:587   # STARTTLS when the server supports it
# MAIL_URL=smtps://user:password@smtp.example.com:465 # direct TLS
MAIL_FROM="My App <hello@example.com>"
```

```js
// zentara.config.mjs
export default {
  mail: { from: "My App <hello@example.com>" }, // env MAIL_URL / MAIL_FROM override this
};
```

Special characters in the user or password must be URL-encoded, e.g. `@` becomes `%40`.

| Situation | What happens |
|---|---|
| `MAIL_URL` is `smtp://` or `smtps://` | email is sent over SMTP |
| development without `MAIL_URL` | email is printed to the log and saved in `.zentara/mail/*.eml` |
| `NODE_ENV=test` | email is collected in `outbox` |
| production without `MAIL_URL` | `sendMail()` throws, so email never disappears silently |

## Testing email

```ts
import { outbox } from "zentara";

await jobs.drain();
const mail = outbox.find((m) => m.to.includes("sarah@mail.test"));
assert.match(mail!.subject, /Welcome/);
```

Each email in `outbox` has `from`, `to`, `subject`, `text`, `html`, and `raw` (the full message). Clear it between tests with `outbox.length = 0` if needed.
