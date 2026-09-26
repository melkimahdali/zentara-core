import { HttpError } from "../../../../src/core/index.js";
export function GET(): never {
  throw new HttpError(403, "Akses ditolak");
}
