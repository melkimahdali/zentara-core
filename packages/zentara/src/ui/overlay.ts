import { h, type Child } from "../core/view.js";
import { t } from "../i18n/index.js";
import { Button } from "./index.js";
import { cx, type WithChildren } from "./types.js";

/**
 * Lapisan kit UI: dialog, laci samping, popover, dan tooltip. Dibuka dengan atribut `popover` bawaan
 * browser (`h(Button, { opens: id })`), jadi tidak butuh JavaScript: Esc dan klik di luar menutupnya.
 * Skrip bawaan page() hanya menambah hal kecil, mis. membuka dialog yang diberi `open` saat halaman dimuat.
 */

/** Tombol pembuka (bila `trigger` diisi) diletakkan tepat sebelum lapisannya. */
function withTrigger(id: string, trigger: string | undefined, variant: "primary" | "secondary" | "danger", layer: Child): Child {
  return trigger ? [h(Button, { opens: id, variant }, trigger), layer] : layer;
}

function closeButton(id: string): Child {
  return h("button", { class: "zu-close", type: "button", popovertarget: id, popovertargetaction: "hide", "aria-label": t().ui.close }, "×");
}

/**
 * Dialog di tengah layar untuk isi singkat atau formulir kecil. Dibuka tombol dengan `opens: id`, atau
 * isi `trigger` untuk sekaligus membuat tombolnya. `open: true` membukanya saat halaman dimuat (mis.
 * formulir di dalamnya punya error).
 * @en Centered dialog for short content or a small form. Opened by a button with `opens: id`, or set `trigger` to render that button too. `open: true` opens it when the page loads (e.g. the form inside has errors).
 * @group overlay
 * @example h(Dialog, { id: "tambah-produk", title: "Tambah produk", trigger: "Tambah" }, h(Form, { action: "/produk" }, h(Field, { name: "nama", label: "Nama" }), h(FormActions, null, h(Button, null, "Simpan"))))
 */
export function Dialog({
  id,
  title,
  trigger,
  actions,
  open,
  size = "md",
  children,
}: WithChildren<{ id: string; title: string; trigger?: string; actions?: Child; open?: boolean; size?: "sm" | "md" | "lg" }>): Child {
  const layer = h(
    "dialog",
    { class: cx("zu-dialog", size !== "md" && size), id, popover: "auto", "aria-labelledby": `${id}-title`, "data-zu-open": open ? "" : undefined },
    h("div", { class: "zu-dialog-head" }, h("h2", { id: `${id}-title` }, title), closeButton(id)),
    h("div", { class: "zu-dialog-body" }, children),
    actions ? h("div", { class: "zu-dialog-foot" }, actions) : null,
  );
  return withTrigger(id, trigger, "primary", layer);
}

/**
 * Dialog konfirmasi sebelum aksi penting (mis. hapus): judul, penjelasan, tombol Batal, dan tombol
 * yang mengirim POST ke `action`. Pengganti PostButton dengan `confirm` bila butuh penjelasan lebih.
 * @en Confirmation dialog before an important action (e.g. delete): title, explanation, a Cancel button, and a button that POSTs to `action`. Use it instead of PostButton with `confirm` when more explanation is needed.
 * @group overlay
 * @example h(ConfirmDialog, { id: `hapus-${p.id}`, trigger: "Hapus", title: `Hapus ${p.name}?`, text: "Produk yang dihapus tidak bisa dikembalikan.", action: `/produk/${p.id}/hapus`, confirm: "Hapus" })
 */
export function ConfirmDialog({
  id,
  title,
  text,
  action,
  confirm,
  cancel,
  trigger,
  tone = "danger",
  children,
}: WithChildren<{ id: string; title: string; text?: string; action: string; confirm: string; cancel?: string; trigger?: string; tone?: "danger" | "primary" }>): Child {
  const layer = h(
    "dialog",
    { class: "zu-dialog sm", id, popover: "auto", role: "alertdialog", "aria-labelledby": `${id}-title`, "aria-describedby": text ? `${id}-text` : undefined },
    h("div", { class: "zu-dialog-head" }, h("h2", { id: `${id}-title` }, title), closeButton(id)),
    text || children.length ? h("div", { class: "zu-dialog-body" }, text ? h("p", { id: `${id}-text` }, text) : null, children) : null,
    h(
      "form",
      { class: "zu-dialog-foot", method: "post", action },
      h(Button, { variant: "secondary", closes: id }, cancel ?? t().ui.cancel),
      h(Button, { variant: tone }, confirm),
    ),
  );
  return withTrigger(id, trigger, tone === "danger" ? "danger" : "primary", layer);
}

/**
 * Laci yang meluncur dari sisi layar (kanan, kiri, atau bawah) untuk filter, detail, atau menu
 * panjang. Dibuka dengan `opens: id` atau `trigger`.
 * @en Drawer that slides in from a side of the screen (right, left, or bottom) for filters, details, or a long menu. Opened with `opens: id` or `trigger`.
 * @group overlay
 * @example h(Drawer, { id: "filter", title: "Filter", trigger: "Filter", actions: h(Button, null, "Terapkan") }, h(CheckboxGroup, { name: "kategori", label: "Kategori", options: ["Kopi", "Teh"] }))
 */
export function Drawer({
  id,
  title,
  side = "right",
  trigger,
  actions,
  children,
}: WithChildren<{ id: string; title: string; side?: "right" | "left" | "bottom"; trigger?: string; actions?: Child }>): Child {
  const layer = h(
    "dialog",
    { class: cx("zu-drawer", side), id, popover: "auto", "aria-labelledby": `${id}-title` },
    h("div", { class: "zu-dialog-head" }, h("h2", { id: `${id}-title` }, title), closeButton(id)),
    h("div", { class: "zu-drawer-body" }, children),
    actions ? h("div", { class: "zu-dialog-foot" }, actions) : null,
  );
  return withTrigger(id, trigger, "secondary", layer);
}

/**
 * Lembar dari bawah layar, cocok untuk pilihan cepat di ponsel. Sama dengan Drawer `side: "bottom"`.
 * @en Sheet from the bottom of the screen, good for quick choices on phones. Same as Drawer with `side: "bottom"`.
 * @group overlay
 * @example h(Sheet, { id: "bagikan", title: "Bagikan", trigger: "Bagikan" }, h(List, { items: [[h("a", { href: waLink }, "WhatsApp")]] }))
 */
export function Sheet({ id, title, trigger, actions, children }: WithChildren<{ id: string; title: string; trigger?: string; actions?: Child }>): Child {
  return h(Drawer, { id, title, trigger, actions, side: "bottom" }, children);
}

/**
 * Kotak kecil yang muncul di bawah tombolnya (info tambahan, pilihan singkat). Klik di luar atau Esc
 * menutupnya.
 * @en Small box that appears below its button (extra info, short choices). Clicking outside or pressing Esc closes it.
 * @group overlay
 * @example h(Popover, { id: "info-ongkir", trigger: "Info ongkir" }, h("p", null, "Gratis ongkir untuk pesanan di atas Rp100.000."))
 */
export function Popover({ id, trigger, children }: WithChildren<{ id: string; trigger: string }>): Child {
  return h(
    "span",
    { class: "zu-popover-wrap" },
    h("button", { class: "zu-btn secondary small", type: "button", popovertarget: id }, trigger),
    h("div", { class: "zu-popover", id, popover: "auto" }, children),
  );
}

let tipCount = 0;

/**
 * Keterangan singkat yang muncul saat elemen disentuh kursor atau difokus keyboard. Hanya untuk
 * penjelasan tambahan; informasi penting tulis langsung di halaman.
 * @en Short hint that appears when the element is hovered or focused with the keyboard. Only for extra explanation; write important information directly on the page.
 * @group overlay
 * @example h(Tooltip, { text: "Termasuk PPN 11%" }, h(Button, { variant: "ghost", small: true, type: "button" }, "Harga"))
 */
export function Tooltip({ text, children }: WithChildren<{ text: string }>): Child {
  const id = `zu-tip-${(tipCount = (tipCount + 1) % 1_000_000)}`;
  return h("span", { class: "zu-tip", "data-zu-tip": id }, children, h("span", { class: "zu-tip-text", role: "tooltip", id }, text));
}
