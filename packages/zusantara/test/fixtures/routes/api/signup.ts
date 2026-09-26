import { z } from "zod";
import { validate } from "../../../../src/core/index.js";

export const POST = validate(
  {
    body: z.object({ name: z.string().min(2), age: z.coerce.number().int().min(17) }),
    query: z.object({ ref: z.string().optional() }),
  },
  (_ctx, { body, query }) => ({ name: body.name.toUpperCase(), age: body.age, ref: query.ref ?? null }),
);
