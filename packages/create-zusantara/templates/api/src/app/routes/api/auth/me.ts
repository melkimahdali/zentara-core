import type { ZenContext } from "zusantara";
import type { User } from "../../../db/schema.js";
import { publicUser, requireUser } from "../../../lib/auth.js";

export const middleware = [requireUser];

export function GET(ctx: ZenContext) {
  return { user: publicUser(ctx.state.user as User) };
}
