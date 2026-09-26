import { HttpError } from "../../../src/core/index.js";

export const GET = () => {
  throw new HttpError(403, "Khusus admin <toko>");
};
