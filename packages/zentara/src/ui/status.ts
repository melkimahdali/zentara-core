import { defaultMessage } from "../core/errors.js";
import { h, type Child } from "../core/view.js";
import { t } from "../i18n/index.js";
import { Brand, Button, page } from "./index.js";
import type { WithChildren } from "./types.js";

/**
 * Halaman status bawaan (403, 404, 500, dan lainnya) yang memakai kit UI dan tema aplikasi. Dipakai
 * framework untuk error di produksi, dan bisa dipakai aplikasi untuk halaman error sendiri.
 */

/** Judul dan penjelasan bawaan untuk sebuah status HTTP, dalam bahasa aktif. */
export function statusText(status: number): [string, string] {
  const texts = t().dev.status;
  return texts[status] ?? (status >= 500 ? texts[500]! : [defaultMessage(status), ""]);
}

/**
 * Isi halaman status: kode besar, judul, penjelasan, dan tombol kembali. Judul dan teks bawaan
 * mengikuti status (403, 404, 500, …) dalam bahasa aktif.
 * @en Status page content: a large code, title, explanation, and a back button. The default title and text follow the status (403, 404, 500, …) in the active language.
 * @group page
 * @example h(StatusPage, { status: 404, text: "Produk ini sudah tidak dijual.", action: h(Button, { href: "/produk" }, "Lihat produk lain") })
 */
export function StatusPage({
  status,
  title,
  text,
  appName,
  action,
}: WithChildren<{ status: number; title?: string; text?: string; appName?: string; action?: Child }>): Child {
  const [defTitle, defText] = statusText(status);
  return h(
    "main",
    { class: "zu-status", id: "konten" },
    h(
      "div",
      { class: "zu-status-box" },
      h(Brand, { name: appName }),
      h("p", { class: "zu-status-code" }, String(status)),
      h("h1", null, title ?? defTitle),
      text ?? defText ? h("p", null, text ?? defText) : null,
      action ?? h(Button, { href: "/", variant: "secondary" }, t().dev.error.backHome),
    ),
  );
}

/**
 * Dokumen HTML lengkap halaman status dengan tema aplikasi. Framework memakainya sendiri untuk error
 * di produksi (mis. `throw new HttpError(403)`); panggil langsung bila perlu halaman status dari handler.
 * @en Full HTML status page document in the app theme. The framework uses it for errors in production (e.g. `throw new HttpError(403)`); call it directly when a handler needs a status page.
 * @group page
 * @example statusPage(403, { message: "Hanya admin yang bisa membuka halaman ini.", appName: "Toko Senja" })
 */
export function statusPage(status: number, options: { message?: string; appName?: string } = {}): string {
  const [title] = statusText(status);
  const text = options.message && options.message !== defaultMessage(status) ? options.message : undefined;
  return page({ title: `${status} · ${title}` }, h(StatusPage, { status, text, appName: options.appName }));
}
