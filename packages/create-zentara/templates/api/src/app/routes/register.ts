import { currentUser, h, html, login, rateLimit, readInput, redirect, tryParse, withMiddleware, type ZenContext } from "zentara";
import { Alert, AuthCard, Button, Field, Form, page } from "zentara/ui";
import { registerUser } from "../lib/auth.js";
import { APP_NAME } from "../lib/ui.js";
import { RegisterInput } from "./api/auth/register.js";

interface View {
  values?: { name?: string; email?: string };
  errors?: Record<string, string>;
  message?: string;
}

function view({ values = {}, errors = {}, message }: View): string {
  return page(
    { title: `Daftar · ${APP_NAME}` },
    h(
      AuthCard,
      { title: "Buat akun", subtitle: "Gratis, hanya butuh satu menit", appName: APP_NAME, footer: ["Sudah punya akun? ", h("a", { href: "/login" }, "Masuk")] },
      h(
        Form,
        { action: "/register" },
        message ? h(Alert, { tone: "error" }, message) : null,
        h(Field, { name: "name", label: "Nama", value: values.name, error: errors.name, autocomplete: "name", required: true, autofocus: true }),
        h(Field, { name: "email", label: "Email", type: "email", value: values.email, error: errors.email, autocomplete: "email", required: true }),
        h(Field, { name: "password", label: "Password", type: "password", error: errors.password, hint: "Minimal 8 karakter", autocomplete: "new-password", required: true }),
        h(Button, { block: true }, "Daftar"),
      ),
    ),
  );
}

export function GET(ctx: ZenContext) {
  if (currentUser(ctx)) return redirect("/dashboard", 303);
  return view({});
}

export const POST = withMiddleware([rateLimit({ windowMs: 15 * 60_000, max: 10 })], async (ctx) => {
  const raw = (await readInput(ctx)) as Record<string, unknown>;
  const values = { name: typeof raw.name === "string" ? raw.name : "", email: typeof raw.email === "string" ? raw.email : "" };
  const input = await tryParse(RegisterInput, raw);
  if (!input.ok) return html(view({ values, errors: input.errors }), { status: 422 });
  const user = await registerUser(input.data);
  if (!user) return html(view({ values, errors: { email: "Email sudah terdaftar" } }), { status: 409 });
  login(ctx, { id: user.id, role: user.role });
  return redirect("/dashboard", 303);
});
