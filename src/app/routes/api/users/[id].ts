import { HttpError, json, type ZenContext } from "../../../../core/index.js";

// Contoh route dinamis: /api/users/42
export function GET(ctx: ZenContext) {
  const id = Number(ctx.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "id harus bilangan bulat positif");
  return { id, name: `User ${id}` };
}

export async function PUT(ctx: ZenContext) {
  const body = await ctx.json<{ name?: unknown }>();
  if (!body || typeof body.name !== "string") throw new HttpError(400, "Field \"name\" wajib berupa string");
  return json({ id: Number(ctx.params.id), name: body.name }, { status: 200 });
}
