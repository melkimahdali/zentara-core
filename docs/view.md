---
title: View & HTML
order: 5
group: Dasar
description: Render HTML aman dengan h() dan renderToString().
---

# View & HTML

```ts
import { h, raw, renderToString } from "zentara";

renderToString(h("p", { class: "note" }, userInput)); // teks & atribut otomatis di-escape
renderToString(h("style", null, raw(css)));            // raw() hanya untuk HTML tepercaya
```

Untuk halaman lengkap bergaya Zentara (login, dasbor, admin), pakai [kit UI `zentara/ui`](ui.html).

## File statis

Isi folder `public/` dilayani apa adanya, misalnya `public/logo.png` di `/logo.png`. Route didahulukan daripada file statis. Dotfile dan path traversal ditolak.
