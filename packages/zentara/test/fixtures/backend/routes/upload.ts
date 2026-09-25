import path from "node:path";
import { HttpError, readForm, saveUpload, type ZenContext } from "../../../../src/core/index.js";

export async function POST(ctx: ZenContext) {
  const form = await readForm(ctx, { maxBytes: "2mb" });
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(422, "file wajib");
  const saved = await saveUpload(file, { dir: path.join(String(process.env.UPLOAD_TEST_DIR), "uploads"), maxBytes: "1mb", types: ["image/*", ".txt"] });
  return { title: form.get("title"), name: saved.name, size: saved.size, type: saved.type, originalName: saved.originalName };
}
