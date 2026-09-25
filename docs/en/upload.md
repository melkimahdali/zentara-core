---
title: File uploads
order: 3
group: Back-End
description: Accept files from multipart forms and store them safely with readForm() and saveUpload().
---

# File uploads

```ts
// src/app/routes/profile/photo.ts
import { HttpError, readForm, saveUpload, type ZenContext } from "zentara";

export async function POST(ctx: ZenContext) {
  const form = await readForm(ctx, { maxBytes: "10mb" });
  const photo = form.get("photo");
  if (!(photo instanceof File)) throw new HttpError(422, "Choose a photo first");
  const saved = await saveUpload(photo, { types: ["image/*"], maxBytes: "5mb" });
  return { url: saved.url }; // e.g. "/uploads/3f0c...e1.png"
}
```

The HTML form:

```html
<form method="post" action="/profile/photo" enctype="multipart/form-data">
  <input type="file" name="photo" accept="image/*">
  <button>Upload</button>
</form>
```

## readForm

`readForm(ctx, { maxBytes })` reads a `multipart/form-data`, `application/x-www-form-urlencoded`, or JSON body as a standard `FormData`. Without `maxBytes`, the limit is `bodyLimit` from the config (1 MB). Larger bodies are rejected with 413.

`readInput()` for [validation](validasi.html) reads multipart too, so the text fields of an upload form can be validated as usual.

## saveUpload

| Option | Default | Notes |
|---|---|---|
| `dir` | `public/uploads` | target folder, relative to the project folder |
| `maxBytes` | `"10mb"` | size limit for one file |
| `types` | common images, PDF, text, CSV, Office | MIME types (`"image/png"`, `"image/*"`) or extensions (`".pdf"`) |

It returns `{ name, originalName, path, size, type, url }`. `url` is only set when the file is stored under `public/`.

## Security

`saveUpload()` is safe by default:

- **Random file names.** Files are stored under a UUID, not the user's file name, so they can't overwrite other files or escape the folder (`../`). The original name is only kept in `originalName` for display.
- **The type comes from the extension, not the browser.** The browser's `Content-Type` claim is not trusted.
- **Dangerous extensions are always rejected**, including `.html`, `.svg`, `.js`, `.php`, and `.exe`, because browsers or servers could execute them.
- **File contents are checked.** PNG, JPEG, GIF, WebP, PDF, and ZIP files must start with the matching file signature, so a script renamed to `.png` is rejected.
- **Empty and oversized files are rejected** with 422 and 413.

Files in `public/uploads` can be opened by anyone who knows the URL. For private files, store them outside `public/` (e.g. `dir: "data/uploads"`) and serve them through a route that checks sign-in.
