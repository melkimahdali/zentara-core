---
title: Input validation
order: 4
group: Basics
description: Validate body, query, and params with Standard Schema.
---

# Input validation

`validate()` accepts any schema that follows [Standard Schema](https://standardschema.dev), such as zod, valibot, or arktype. The Zentara core stays dependency-free.

```ts
// npm install zod
import { z } from "zod";
import { validate } from "zentara";

export const POST = validate(
  {
    body: z.object({ name: z.string().min(2), age: z.coerce.number().int().min(17) }),
    query: z.object({ ref: z.string().optional() }),
  },
  (ctx, { body, query }) => ({ hello: body.name, ref: query.ref }),  // body & query are typed
);
```

The body is read according to `Content-Type`: JSON, HTML forms (`application/x-www-form-urlencoded`), or `multipart/form-data` (see [file uploads](upload.html)). Invalid input gets a `422` with a list of errors per field:

```json
{ "error": { "status": 422, "message": "Validation failed",
  "details": { "source": "body", "issues": [{ "path": "age", "message": "Too small: expected number to be >=17" }] } } }
```

For manual validation: `const data = await parse(schema, value)`.
