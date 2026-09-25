import { z } from "zod";
import { currentUser, h, html, login, rateLimit, readInput, redirect, tryParse, withMiddleware, type ZenContext } from "zentara";
import { Alert, AuthCard, Button, Field, Form, page } from "zentara/ui";
import { authenticate, safeNext } from "../lib/auth.js";
import { APP_NAME } from "../lib/ui.js";

const Body = z.object({
  email: z.string().trim().toLowerCase().min(1, "Email wajib diisi"),
  password: z.string().min(1, "Password wajib diisi").max(1024),
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
    { title: `Masuk · ${APP_NAME}` },
    h(
      AuthCard,
      {
        title: "Masuk",
        subtitle: "Pakai email dan password akun Anda.",
        appName: APP_NAME,
        aside: { title: "Selamat datang kembali.", text: "Masuk untuk melanjutkan pekerjaan Anda. Aplikasi ini dibangun dengan Zentara Core dan siap Anda ubah menjadi apa saja." },
        footer: ["Belum punya akun? ", h("a", { href: "/register" }, "Buat akun")],
      },
      h(
        Form,
        { action },
        message ? h(Alert, { tone: "error" }, message) : null,
        h(Field, { name: "email", label: "Email", type: "email", value: email, error: errors.email, autocomplete: "email", required: true, autofocus: !email }),
        h(Field, { name: "password", label: "Password", type: "password", error: errors.password, autocomplete: "current-password", required: true, autofocus: Boolean(email) }),
        next ? h("input", { type: "hidden", name: "next", value: next }) : null,
        h(Button, { block: true, loading: "Memeriksa…" }, "Masuk"),
      ),
    ),
  );
}

export function GET(ctx: ZenContext) {
  if (currentUser(ctx)) return redirect(safeNext(ctx.query.next), 303);
  return view({ next: safeNext(ctx.query.next, "") || undefined });
}

// Batasi percobaan masuk hanya untuk POST, jadi membuka halaman berulang kali tidak ikut dibatasi.
export const POST = withMiddleware([rateLimit({ windowMs: 15 * 60_000, max: 10 })], async (ctx) => {
  const input = await tryParse(Body, await readInput(ctx));
  if (!input.ok) return html(view({ errors: input.errors }), { status: 422 });
  const { email, password, next } = input.data;
  const user = await authenticate(email, password);
  if (!user) return html(view({ email, next, message: "Email atau password salah." }), { status: 401 });
  login(ctx, { id: user.id, role: user.role });
  return redirect(safeNext(next), 303);
});
