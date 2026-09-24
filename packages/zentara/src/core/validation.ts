import type { ZenContext } from "./context.js";
import { toQuery } from "./context.js";
import { HttpError } from "./errors.js";

/**
 * Antarmuka Standard Schema v1 (https://standardschema.dev). Didukung langsung oleh
 * zod, valibot, arktype, effect/schema, dan lainnya, jadi Zentara tidak terikat ke satu library.
 */
export interface StandardSchemaV1<Input = unknown, Output = Input> {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (value: unknown) => StandardResult<Output> | Promise<StandardResult<Output>>;
    readonly types?: { readonly input: Input; readonly output: Output } | undefined;
  };
}

type StandardResult<Output> =
  | { readonly value: Output; readonly issues?: undefined }
  | { readonly issues: ReadonlyArray<StandardIssue> };

interface StandardIssue {
  readonly message: string;
  readonly path?: ReadonlyArray<PropertyKey | { readonly key: PropertyKey }> | undefined;
}

export type InferOutput<S extends StandardSchemaV1> = NonNullable<S["~standard"]["types"]>["output"];

export interface ValidationIssue {
  /** Lokasi field, mis. "items.0.qty". Kosong untuk nilai di akar. */
  path: string;
  message: string;
}

function formatPath(path: StandardIssue["path"]): string {
  return (path ?? []).map((p) => String(typeof p === "object" && p !== null ? p.key : p)).join(".");
}

/** Validasi nilai dengan schema; melempar HttpError 422 berisi daftar error per field bila gagal. */
export async function parse<S extends StandardSchemaV1>(schema: S, value: unknown, source = "input"): Promise<InferOutput<S>> {
  const result = await schema["~standard"].validate(value);
  if (result.issues) {
    const issues: ValidationIssue[] = result.issues.map((i) => ({ path: formatPath(i.path), message: i.message }));
    throw new HttpError(422, "Validasi gagal", { details: { source, issues } });
  }
  return result.value as InferOutput<S>;
}

/** Baca body sesuai Content-Type: form HTML (urlencoded) menjadi object, selain itu JSON. */
export async function readInput(ctx: ZenContext): Promise<unknown> {
  const type = String(ctx.req.headers["content-type"] ?? "").toLowerCase();
  if (type.startsWith("application/x-www-form-urlencoded")) {
    return toQuery(new URLSearchParams(await ctx.text()));
  }
  return ctx.json();
}

export interface InputSchemas {
  body?: StandardSchemaV1;
  query?: StandardSchemaV1;
  params?: StandardSchemaV1;
}

export type ValidatedInput<S extends InputSchemas> = {
  [K in keyof S]: S[K] extends StandardSchemaV1 ? InferOutput<S[K]> : never;
};

/**
 * Bungkus handler dengan validasi input. Handler hanya dipanggil bila semua input valid,
 * dan menerima data yang sudah bertipe sesuai schema:
 *
 *   export const POST = validate({ body: z.object({ name: z.string() }) }, (ctx, { body }) => body.name);
 */
export function validate<S extends InputSchemas>(
  schemas: S,
  handler: (ctx: ZenContext, input: ValidatedInput<S>) => unknown,
): (ctx: ZenContext) => Promise<unknown> {
  return async (ctx) => {
    const input: Record<string, unknown> = {};
    if (schemas.params) input.params = await parse(schemas.params, ctx.params, "params");
    if (schemas.query) input.query = await parse(schemas.query, ctx.query, "query");
    if (schemas.body) input.body = await parse(schemas.body, await readInput(ctx), "body");
    return handler(ctx, input as ValidatedInput<S>);
  };
}
