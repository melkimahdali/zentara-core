import { z } from "zod";
import { currentUser, h, html, login, rateLimit, readInput, redirect, tryParse, withMiddleware, type ZenContext } from "zusantara";
import { Alert, AuthCard, Button, Field, Form, page } from "zusantara/ui";
import { authenticate, safeNext } from "../lib/auth.js";
import { APP_NAME } from "../lib/ui.js";

const Body = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email is required"),
  password: z.string().min(1, "Password is required").max(1024),
  next: z.string().optional(),
});

interface View {
  email?: string;
  next?: string;
  errors?: Record<string, string>;
  message?: string;
}

function view({ email, next, errors = {}, message }: View): string {
  const action = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
  return page(
    { title: `Sign in · ${APP_NAME}` },
    h(
      AuthCard,
      {
        title: "Sign in",
        subtitle: "Use your account email and password.",
        appName: APP_NAME,
        aside: { title: "Welcome back.", text: "Sign in to continue your work. This app is built with Zusantara Core and ready to become anything you want." },
        footer: ["No account yet? ", h("a", { href: "/register" }, "Create one")],
      },
      h(
        Form,
        { action },
        message ? h(Alert, { tone: "error" }, message) : null,
        h(Field, { name: "email", label: "Email", type: "email", value: email, error: errors.email, autocomplete: "email", required: true, autofocus: !email }),
        h(Field, { name: "password", label: "Password", type: "password", error: errors.password, autocomplete: "current-password", required: true, autofocus: Boolean(email) }),
        next ? h("input", { type: "hidden", name: "next", value: next }) : null,
        h(Button, { block: true, loading: "Checking…" }, "Sign in"),
      ),
    ),
  );
}

export function GET(ctx: ZenContext) {
  if (currentUser(ctx)) return redirect(safeNext(ctx.query.next), 303);
  return view({ next: safeNext(ctx.query.next, "") || undefined });
}

// Rate-limit sign-in attempts on POST only, so opening the page repeatedly is not limited.
export const POST = withMiddleware([rateLimit({ windowMs: 15 * 60_000, max: 10 })], async (ctx) => {
  const input = await tryParse(Body, await readInput(ctx));
  if (!input.ok) return html(view({ errors: input.errors }), { status: 422 });
  const { email, password, next } = input.data;
  const user = await authenticate(email, password);
  if (!user) return html(view({ email, next, message: "Wrong email or password." }), { status: 401 });
  login(ctx, { id: user.id, role: user.role });
  return redirect(safeNext(next), 303);
});
