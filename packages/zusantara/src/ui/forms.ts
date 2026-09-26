import { h, type Child } from "../core/view.js";
import { t } from "../i18n/index.js";
import { cx, type WithChildren } from "./types.js";

/**
 * Formulir kit UI. Semua field punya label, `error`, dan `hint` dengan atribut aksesibilitas yang benar,
 * dan tetap berfungsi tanpa JavaScript. Validasi tetap di server lewat `tryParse()`: tampilkan ulang
 * formulir dengan `values` dan `errors`-nya.
 */

/** Pesan error atau petunjuk di bawah field, beserta id untuk aria-describedby. */
function feedback(id: string, error?: string, hint?: string): { node: Child; describedBy?: string } {
  if (error) return { node: h("span", { class: "zu-error", id: `${id}-error` }, error), describedBy: `${id}-error` };
  if (hint) return { node: h("small", { id: `${id}-hint` }, hint), describedBy: `${id}-hint` };
  return { node: null };
}

/**
 * Formulir POST (CSRF ditangani middleware csrf() lewat header browser, tanpa token). `upload: true`
 * untuk formulir dengan FileInput.
 * @en POST form (CSRF is handled by the csrf() middleware through browser headers, no token). Set `upload: true` for forms with a FileInput.
 * @group form
 * @example h(Form, { action: "/produk" }, h(Field, { name: "nama", label: "Nama" }), h(FormActions, null, h(Button, null, "Simpan")))
 */
export function Form({ action, method = "post", upload, children }: WithChildren<{ action?: string; method?: "post" | "get"; upload?: boolean }>): Child {
  return h("form", { class: "zu-form", method, action, enctype: upload ? "multipart/form-data" : undefined }, children);
}

/**
 * Baris beberapa field berdampingan (menumpuk di layar sempit).
 * @en Several fields side by side (stacked on narrow screens).
 * @group form
 * @example h(FormRow, null, h(Field, { name: "kota", label: "Kota" }), h(Field, { name: "kodePos", label: "Kode pos" }))
 */
export function FormRow({ children }: WithChildren<object>): Child {
  return h("div", { class: "zu-form-row" }, children);
}

/**
 * Baris tombol di akhir formulir.
 * @en Row of buttons at the end of a form.
 * @group form
 * @example h(FormActions, null, h(Button, { loading: "Menyimpan…" }, "Simpan"), h(Button, { variant: "ghost", href: "/produk" }, "Batal"))
 */
export function FormActions({ children }: WithChildren<object>): Child {
  return h("div", { class: "zu-form-actions" }, children);
}

export interface FieldProps {
  name: string;
  label: string;
  /** `"textarea"` untuk teks panjang beberapa baris. */
  type?: "text" | "email" | "password" | "number" | "search" | "tel" | "url" | "date" | "time" | "datetime-local" | "month" | "range" | "color" | "textarea";
  value?: string | number;
  /** Tinggi awal textarea (baris). */
  rows?: number;
  maxlength?: number;
  error?: string;
  hint?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autocomplete?: string;
  min?: number | string;
  max?: number | string;
  step?: number | "any";
  autofocus?: boolean;
  inputmode?: "numeric" | "decimal" | "email" | "tel" | "url" | "search" | "text";
  /** Teks di depan input, mis. "Rp" atau "https://". */
  prefix?: string;
  /** Teks di belakang input, mis. "kg" atau "%". */
  suffix?: string;
  /** Tombol Tampilkan/Sembunyikan untuk password (default true; butuh skrip bawaan page()). */
  reveal?: boolean;
}

/**
 * Label + input + pesan error/petunjuk. Mendukung awalan/akhiran (mis. "Rp"), tombol tampilkan password,
 * dan tipe date, time, datetime-local, month, range, color. Password tidak pernah diisi ulang.
 * @en Label + input + error/hint message. Supports a prefix/suffix (e.g. "Rp"), a show-password button, and date, time, datetime-local, month, range, color types. Passwords are never refilled.
 * @group form
 * @example h(Field, { name: "harga", label: "Harga", type: "number", prefix: "Rp", value: values.harga, error: errors.harga })
 */
export function Field(props: WithChildren<FieldProps>): Child {
  const id = `f-${props.name}`;
  const fb = feedback(id, props.error, props.hint);
  const type = props.type ?? "text";
  const aria = { "aria-invalid": props.error ? "true" : undefined, "aria-describedby": fb.describedBy };
  // Urutan atribut sama dengan versi sebelumnya (tes aplikasi bisa bergantung padanya).
  let control: Child =
    type === "textarea"
      ? h(
          "textarea",
          { class: "zu-input zu-textarea", id, name: props.name, rows: props.rows ?? 4, maxlength: props.maxlength, placeholder: props.placeholder, required: props.required, disabled: props.disabled, autofocus: props.autofocus, ...aria },
          props.value === undefined ? "" : String(props.value),
        )
      : h("input", {
          class: cx("zu-input", type === "range" && "zu-range", type === "color" && "zu-color"),
          id,
          name: props.name,
          type,
          value: type === "password" ? undefined : props.value,
          placeholder: props.placeholder,
          required: props.required,
          disabled: props.disabled,
          autocomplete: props.autocomplete,
          min: props.min,
          max: props.max,
          step: props.step,
          maxlength: props.maxlength,
          inputmode: props.inputmode,
          autofocus: props.autofocus,
          ...aria,
        });
  const reveal = type === "password" && props.reveal !== false;
  if (props.prefix || props.suffix || reveal) {
    const m = t().ui;
    control = h(
      "div",
      { class: cx("zu-affix", props.error && "invalid") },
      props.prefix ? h("span", { "aria-hidden": "true" }, props.prefix) : null,
      control,
      props.suffix ? h("span", { "aria-hidden": "true" }, props.suffix) : null,
      reveal
        ? h("button", { class: "zu-reveal", type: "button", hidden: true, "data-zu-reveal": id, "data-show": m.showPassword, "data-hide": m.hidePassword, "aria-pressed": "false", "aria-label": m.showPasswordLabel(props.label) }, m.showPassword)
        : null,
    );
  }
  return h("div", { class: "zu-field" }, h("label", { for: id }, props.label), control, fb.node);
}

/** Pilihan untuk Select, CheckboxGroup, dan RadioGroup: teks saja, atau nilai dan label terpisah. */
export type Option = string | { value: string; label: string; hint?: string; disabled?: boolean };
export interface OptionGroup {
  group: string;
  options: Option[];
}

function optionOf(o: Option): { value: string; label: string; hint?: string; disabled?: boolean } {
  return typeof o === "string" ? { value: o, label: o } : o;
}

/**
 * Daftar pilihan (`<select>`). `options` berisi teks, `{ value, label }`, atau kelompok `{ group, options }`.
 * `placeholder` menambah pilihan kosong di atas.
 * @en Dropdown (`<select>`). `options` holds strings, `{ value, label }`, or groups `{ group, options }`. `placeholder` adds an empty first option.
 * @group form
 * @example h(Select, { name: "kategori", label: "Kategori", placeholder: "Pilih kategori", options: [{ value: "kopi", label: "Kopi" }, { value: "teh", label: "Teh" }], value: values.kategori, error: errors.kategori })
 */
export function Select(
  props: WithChildren<{
    name: string;
    label: string;
    options: (Option | OptionGroup)[];
    /** Nilai terpilih; array untuk `multiple`. */
    value?: string | number | (string | number)[];
    placeholder?: string;
    error?: string;
    hint?: string;
    required?: boolean;
    disabled?: boolean;
    multiple?: boolean;
    autofocus?: boolean;
  }>,
): Child {
  const id = `f-${props.name}`;
  const fb = feedback(id, props.error, props.hint);
  const selected = new Set((Array.isArray(props.value) ? props.value : props.value === undefined ? [] : [props.value]).map(String));
  const render = (o: Option) => {
    const opt = optionOf(o);
    return h("option", { value: opt.value, selected: selected.has(opt.value), disabled: opt.disabled }, opt.label);
  };
  return h(
    "div",
    { class: "zu-field" },
    h("label", { for: id }, props.label),
    h(
      "select",
      {
        class: "zu-input zu-select",
        id,
        name: props.name,
        required: props.required,
        disabled: props.disabled,
        multiple: props.multiple,
        autofocus: props.autofocus,
        "aria-invalid": props.error ? "true" : undefined,
        "aria-describedby": fb.describedBy,
      },
      props.placeholder !== undefined && !props.multiple ? h("option", { value: "", selected: selected.size === 0 }, props.placeholder || t().ui.choose) : null,
      props.options.map((o) => (typeof o === "object" && "group" in o ? h("optgroup", { label: o.group }, o.options.map(render)) : render(o))),
    ),
    fb.node,
  );
}

/**
 * Satu kotak centang dengan label di sampingnya (mis. "Ingat saya", "Setuju dengan syarat"). Bila tidak
 * dicentang, browser tidak mengirim field ini sama sekali.
 * @en A single checkbox with its label (e.g. "Remember me", "I agree to the terms"). When unchecked, the browser does not send the field at all.
 * @group form
 * @example h(Checkbox, { name: "ingat", label: "Ingat saya", checked: true })
 */
export function Checkbox(props: WithChildren<{ name: string; label: string; value?: string; checked?: boolean; hint?: string; error?: string; required?: boolean; disabled?: boolean }>): Child {
  const id = `f-${props.name}`;
  const fb = feedback(id, props.error, undefined);
  return h(
    "div",
    { class: "zu-field" },
    h(
      "label",
      { class: cx("zu-check", props.disabled && "disabled") },
      h("input", { type: "checkbox", id, name: props.name, value: props.value ?? "1", checked: props.checked, required: props.required, disabled: props.disabled, "aria-invalid": props.error ? "true" : undefined, "aria-describedby": fb.describedBy }),
      h("span", null, props.label, props.hint ? h("small", null, props.hint) : null),
    ),
    fb.node,
  );
}

interface GroupProps {
  name: string;
  /** Judul kelompok (legend). */
  label: string;
  options: Option[];
  error?: string;
  hint?: string;
  /** Pilihan berjajar mendatar, bukan menurun. */
  inline?: boolean;
  disabled?: boolean;
}

function choiceGroup(type: "checkbox" | "radio", props: GroupProps & { selected: Set<string>; required?: boolean }): Child {
  const id = `f-${props.name}`;
  const fb = feedback(id, props.error, props.hint);
  return h(
    "fieldset",
    { class: "zu-fieldset", id, "aria-describedby": fb.describedBy, disabled: props.disabled },
    h("legend", null, props.label),
    h(
      "div",
      { class: cx("zu-choices", props.inline && "inline") },
      props.options.map((o, i) => {
        const opt = optionOf(o);
        return h(
          "label",
          { class: cx("zu-check", opt.disabled && "disabled") },
          h("input", { type, id: `${id}-${i}`, name: props.name, value: opt.value, checked: props.selected.has(opt.value), disabled: opt.disabled, required: type === "radio" ? props.required : undefined }),
          h("span", null, opt.label, opt.hint ? h("small", null, opt.hint) : null),
        );
      }),
    ),
    fb.node,
  );
}

/**
 * Beberapa kotak centang dengan nama yang sama. Di handler, baca semua nilainya dengan
 * `form.getAll(name)` (readForm) atau skema array.
 * @en Several checkboxes sharing one name. In the handler read every value with `form.getAll(name)` (readForm) or an array schema.
 * @group form
 * @example h(CheckboxGroup, { name: "hari", label: "Hari buka", inline: true, options: ["Senin", "Selasa", "Rabu"], values: ["Senin"] })
 */
export function CheckboxGroup(props: WithChildren<GroupProps & { values?: (string | number)[] }>): Child {
  return choiceGroup("checkbox", { ...props, selected: new Set((props.values ?? []).map(String)) });
}

/**
 * Pilih satu dari beberapa pilihan yang semuanya terlihat (untuk 2 sampai 5 pilihan; lebih dari itu
 * pakai Select).
 * @en Pick one of a few options that are all visible (for 2 to 5 options; use Select for more).
 * @group form
 * @example h(RadioGroup, { name: "kirim", label: "Pengiriman", options: [{ value: "ambil", label: "Ambil sendiri" }, { value: "kurir", label: "Kurir", hint: "Rp10.000" }], value: "ambil" })
 */
export function RadioGroup(props: WithChildren<GroupProps & { value?: string | number; required?: boolean }>): Child {
  return choiceGroup("radio", { ...props, selected: new Set(props.value === undefined ? [] : [String(props.value)]) });
}

/**
 * Sakelar nyala/mati untuk pengaturan (checkbox dengan role="switch"). Bila mati, field tidak dikirim.
 * @en On/off switch for settings (a checkbox with role="switch"). When off, the field is not sent.
 * @group form
 * @example h(Switch, { name: "notifikasi", label: "Kirim notifikasi email", hint: "Saat ada pesanan baru", checked: settings.notify })
 */
export function Switch(props: WithChildren<{ name: string; label: string; value?: string; checked?: boolean; hint?: string; disabled?: boolean }>): Child {
  return h(
    "div",
    { class: "zu-field" },
    h(
      "label",
      { class: "zu-switch" },
      h("input", { type: "checkbox", role: "switch", id: `f-${props.name}`, name: props.name, value: props.value ?? "1", checked: props.checked, disabled: props.disabled }),
      h("span", { class: "zu-switch-track", "aria-hidden": "true" }),
      h("span", null, props.label, props.hint ? h("small", null, props.hint) : null),
    ),
  );
}

/** Ukuran dalam byte menjadi teks singkat, mis. "5mb" atau 5242880 -> "5 MB". */
function sizeLabel(max: string | number | undefined): string | undefined {
  if (max === undefined) return undefined;
  if (typeof max === "string") {
    const m = /^\s*(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?\s*$/i.exec(max);
    return m ? `${m[1]} ${(m[2] ?? "b").toUpperCase()}` : max;
  }
  const units = ["B", "KB", "MB", "GB"];
  let v = max;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${Number.isInteger(v) ? v : v.toFixed(1)} ${units[i]}`;
}

function typesLabel(types: string[] | undefined): string | undefined {
  if (!types?.length) return undefined;
  const names = t().ui.fileTypes;
  return [
    ...new Set(
      types.map((type) => {
        const [main, sub] = type.toLowerCase().split("/");
        if (sub === "pdf") return names.pdf!;
        if (sub === "*" || !sub) return names[main!] ?? type;
        return sub.replace(/^x-/, "").toUpperCase();
      }),
    ),
  ].join(", ");
}

/**
 * Unggah file. Berikan `types` dan `maxBytes` yang sama dengan `saveUpload()` di handler supaya browser
 * menyaring file dan petunjuknya ditulis otomatis. `preview` menampilkan gambar yang sudah tersimpan;
 * gambar yang baru dipilih langsung dipratinjau (butuh skrip bawaan page()). Pakai di `Form` dengan
 * `upload: true`.
 * @en File upload. Pass the same `types` and `maxBytes` as `saveUpload()` in the handler so the browser filters files and the hint is written for you. `preview` shows the image already saved; a newly chosen image is previewed right away (needs page()'s built-in script). Use inside a `Form` with `upload: true`.
 * @group form
 * @example h(FileInput, { name: "foto", label: "Foto produk", types: ["image/*"], maxBytes: "5mb", preview: product.photoUrl, error: errors.foto })
 */
export function FileInput(
  props: WithChildren<{
    name: string;
    label: string;
    /** Tipe MIME yang diterima, sama dengan opsi `types` di saveUpload, mis. ["image/*", "application/pdf"]. */
    types?: string[];
    /** Batas ukuran untuk petunjuk, sama dengan opsi `maxBytes` di saveUpload, mis. "5mb". */
    maxBytes?: string | number;
    /** URL gambar yang sudah tersimpan. */
    preview?: string;
    multiple?: boolean;
    required?: boolean;
    disabled?: boolean;
    error?: string;
    hint?: string;
  }>,
): Child {
  const id = `f-${props.name}`;
  const auto = props.types || props.maxBytes !== undefined ? t().ui.fileHint(typesLabel(props.types), sizeLabel(props.maxBytes)) : undefined;
  const fb = feedback(id, props.error, props.hint ?? auto);
  const images = !props.types || props.types.some((type) => type.toLowerCase().startsWith("image/"));
  return h(
    "div",
    { class: "zu-field" },
    h("label", { for: id }, props.label),
    h(
      "div",
      { class: "zu-file" },
      images ? h("img", { class: "zu-file-preview", id: `${id}-preview`, src: props.preview, alt: t().ui.filePreview, hidden: !props.preview }) : null,
      h("input", {
        class: "zu-input zu-file-input",
        type: "file",
        id,
        name: props.name,
        accept: props.types?.join(","),
        multiple: props.multiple,
        required: props.required,
        disabled: props.disabled,
        "data-zu-preview": images ? `${id}-preview` : undefined,
        "aria-invalid": props.error ? "true" : undefined,
        "aria-describedby": fb.describedBy,
      }),
    ),
    fb.node,
  );
}

/**
 * Kelompok field dengan judul (legend), mis. "Alamat pengiriman". `box: true` memberi bingkai tipis.
 * @en A titled group of fields (legend), e.g. "Shipping address". `box: true` adds a thin frame.
 * @group form
 * @example h(Fieldset, { legend: "Alamat pengiriman", box: true }, h(Field, { name: "alamat", label: "Alamat" }), h(FormRow, null, ...))
 */
export function Fieldset({ legend, hint, box, children }: WithChildren<{ legend: string; hint?: string; box?: boolean }>): Child {
  return h("fieldset", { class: cx("zu-fieldset", box && "box") }, h("legend", null, legend), hint ? h("small", null, hint) : null, children);
}
