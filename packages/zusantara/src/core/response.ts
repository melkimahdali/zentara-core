export type HeaderValue = string | number | readonly string[];
export type ResponseHeaders = Record<string, HeaderValue>;

export interface ResponseInit {
  status?: number;
  headers?: ResponseHeaders;
}

/** Respons eksplisit yang bisa dikembalikan handler bila butuh status/header khusus. */
export class ZenResponse {
  readonly body: string | Uint8Array | null;
  readonly status: number;
  readonly headers: ResponseHeaders;

  constructor(body: string | Uint8Array | null = null, init: ResponseInit = {}) {
    this.body = body;
    this.status = init.status ?? 200;
    this.headers = { ...init.headers };
  }
}

function withType(init: ResponseInit, type: string): ResponseInit {
  const headers = { ...init.headers };
  if (!Object.keys(headers).some((k) => k.toLowerCase() === "content-type")) {
    headers["Content-Type"] = type;
  }
  return { ...init, headers };
}

export function json(data: unknown, init: ResponseInit = {}): ZenResponse {
  return new ZenResponse(JSON.stringify(data) ?? "null", withType(init, "application/json; charset=utf-8"));
}

export function html(body: string, init: ResponseInit = {}): ZenResponse {
  return new ZenResponse(body, withType(init, "text/html; charset=utf-8"));
}

export function text(body: string, init: ResponseInit = {}): ZenResponse {
  return new ZenResponse(body, withType(init, "text/plain; charset=utf-8"));
}

export function redirect(location: string, status: 301 | 302 | 303 | 307 | 308 = 302): ZenResponse {
  return new ZenResponse(null, { status, headers: { Location: location } });
}
