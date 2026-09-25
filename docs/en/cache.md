---
title: Cache
order: 4
group: Back-End
description: Keep the results of expensive work in memory with an expiry time.
---

# Cache

```ts
import { cache } from "zentara";

export async function GET() {
  // Computed at most once a minute; other requests reuse the stored result.
  const stats = await cache.remember("dashboard:stats", "1m", () => computeStats());
  return stats;
}
```

When several requests arrive at once while the cache is empty, `remember()` runs the function only once and they all wait for the same result.

## API

| Method | Notes |
|---|---|
| `cache.get(key)` | the value, or `undefined` if missing or expired |
| `cache.set(key, value, ttl?)` | store; `ttl` like `"30s"`, `"5m"`, `"1h"` |
| `cache.has(key)` | present and not expired |
| `cache.delete(key)` | remove one key |
| `cache.clear(prefix?)` | remove everything, or only keys starting with `prefix` |
| `cache.remember(key, ttl, fn)` | read from the cache, or run `fn` and store its result |

After data changes, clear the related cache so pages don't show stale data:

```ts
await db.update(notes).set(input).where(eq(notes.id, id));
cache.clear(`notes:${userId}:`);
```

## Your own cache

The built-in `cache` holds up to 1000 entries. Create a separate cache with its own limits:

```ts
import { MemoryCache } from "zentara";

const rates = new MemoryCache({ max: 100, ttl: "10m" });
```

The least recently used entries are dropped first when the limit is reached.

## Limits

The cache lives in the process memory. It is emptied when the server restarts and is not shared between servers. Don't keep data in the cache that must not be lost; store it in the [database](database.html).
