---
title: Validasi input
order: 4
group: Dasar
description: Validasi body, query, dan params dengan Standard Schema.
---

# Validasi input

`validate()` menerima schema apa pun yang mengikuti [Standard Schema](https://standardschema.dev), misalnya zod, valibot, atau arktype. Core Zentara tetap tanpa dependency.

```ts
// npm install zod
import { z } from "zod";
import { validate } from "zentara";

export const POST = validate(
  {
    body: z.object({ name: z.string().min(2), age: z.coerce.number().int().min(17) }),
    query: z.object({ ref: z.string().optional() }),
  },
  (ctx, { body, query }) => ({ halo: body.name, ref: query.ref }),  // body & query sudah bertipe
);
```

Body dibaca sesuai `Content-Type`: JSON, form HTML (`application/x-www-form-urlencoded`), atau `multipart/form-data` (lihat [unggah file](upload.html)). Input yang tidak valid dijawab `422` dengan daftar error per field:

```json
{ "error": { "status": 422, "message": "Validasi gagal",
  "details": { "source": "body", "issues": [{ "path": "age", "message": "Too small: expected number to be >=17" }] } } }
```

Untuk validasi manual: `const data = await parse(schema, nilai)`.
