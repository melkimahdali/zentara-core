/**
 * Error dengan status HTTP. Lempar dari handler untuk membalas dengan status tertentu:
 *   throw new HttpError(404, "Produk tidak ditemukan")
 * Pesan hanya dikirim ke klien bila `expose` true (default untuk status < 500).
 */
export class HttpError extends Error {
  readonly status: number;
  readonly expose: boolean;
  readonly headers: Record<string, string>;

  constructor(status: number, message?: string, options: { expose?: boolean; headers?: Record<string, string>; cause?: unknown } = {}) {
    super(message ?? defaultMessage(status), { cause: options.cause });
    this.name = "HttpError";
    this.status = status;
    this.expose = options.expose ?? status < 500;
    this.headers = options.headers ?? {};
  }
}

export function defaultMessage(status: number): string {
  switch (status) {
    case 400: return "Bad Request";
    case 404: return "Not Found";
    case 405: return "Method Not Allowed";
    case 413: return "Payload Too Large";
    case 415: return "Unsupported Media Type";
    default: return status >= 500 ? "Internal Server Error" : "Error";
  }
}
