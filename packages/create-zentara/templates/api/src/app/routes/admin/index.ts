import { redirect } from "zentara";
import { requireAdminPage } from "../../lib/auth.js";

export const middleware = [requireAdminPage];

export const GET = () => redirect("/admin/users", 303);
