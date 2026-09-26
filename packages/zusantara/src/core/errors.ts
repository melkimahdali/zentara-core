/**
 * Error dengan status HTTP. Lempar dari handler untuk membalas dengan status tertentu:
 *   throw new HttpError(404, "Data tidak ditemukan")
 * Pesan hanya dikirim ke klien bila `expose` true (default untuk status < 500).
 */
export class HttpError extends Error {
  readonly status: number;
  readonly expose: boolean;
  readonly headers: Record<string, string>;
  /** Data tambahan yang ikut dikirim di respons JSON bila `expose`, mis. daftar error validasi. */
  readonly details: unknown;

  constructor(
    status: number,
    message?: string,
    options: { expose?: boolean; headers?: Record<string, string>; details?: unknown; cause?: unknown } = {},
  ) {
    super(message ?? defaultMessage(status), { cause: options.cause });
    this.name = "HttpError";
    this.status = status;
    this.expose = options.expose ?? status < 500;
    this.headers = options.headers ?? {};
    this.details = options.details;
  }
}

export function defaultMessage(status: number): string {
  switch (status) {
    case 400: return "Bad Request";
    case 404: return "Not Found";
    case 405: return "Method Not Allowed";
    case 413: return "Payload Too Large";
    case 403: return "Forbidden";
    case 415: return "Unsupported Media Type";
    case 401: return "Unauthorized";
    case 409: return "Conflict";
    case 422: return "Unprocessable Content";
    case 429: return "Too Many Requests";
    default: return status >= 500 ? "Internal Server Error" : "Error";
  }
}
