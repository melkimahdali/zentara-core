import { h, type Child } from "../core/view.js";
import { getLocale, intlLocale, t } from "../i18n/index.js";
import { Avatar } from "./index.js";
import { cx, type WithChildren } from "./types.js";

/**
 * Tampilan data kit UI: detail satu data, akordeon, linimasa, tag, kumpulan avatar, rating, blok kode,
 * dan kalender. Semuanya dirender di server; akordeon memakai `<details>`.
 */

export interface DescriptionItem {
  label: string;
  value: Child;
}

/**
 * Detail satu data sebagai pasangan label dan nilai (mis. halaman detail pesanan). `columns: 2` untuk
 * dua kolom di layar lebar.
 * @en Details of one record as label and value pairs (e.g. an order detail page). `columns: 2` for two columns on wide screens.
 * @group data
 * @example h(DescriptionList, { items: [{ label: "Pelanggan", value: order.customer }, { label: "Total", value: rupiah(order.total) }, { label: "Status", value: h(Badge, { tone: "ok" }, "Lunas") }] })
 */
export function DescriptionList({ items, columns = 1 }: WithChildren<{ items: DescriptionItem[]; columns?: 1 | 2 }>): Child {
  return h("dl", { class: cx("zu-dl", columns === 2 && "c2") }, items.map((item) => h("div", null, h("dt", null, item.label), h("dd", null, item.value))));
}

export interface AccordionItem {
  title: string;
  content: Child;
  open?: boolean;
}

let accordionCount = 0;

/**
 * Daftar bagian yang bisa dibuka-tutup (mis. FAQ), tanpa JavaScript. `single: true` = membuka satu
 * bagian menutup yang lain.
 * @en List of sections that open and close (e.g. an FAQ), without JavaScript. `single: true` = opening one section closes the others.
 * @group data
 * @example h(Accordion, { single: true, items: [{ title: "Berapa lama pengiriman?", content: "1 sampai 3 hari kerja." }, { title: "Bisa bayar di tempat?", content: "Bisa, untuk wilayah Bandung." }] })
 */
export function Accordion({ items, single }: WithChildren<{ items: AccordionItem[]; single?: boolean }>): Child {
  const name = single ? `zu-acc-${(accordionCount = (accordionCount + 1) % 1_000_000)}` : undefined;
  return h(
    "div",
    { class: "zu-accordion" },
    items.map((item) => h("details", { name, open: item.open }, h("summary", null, item.title), h("div", null, item.content))),
  );
}

export interface TimelineItem {
  title: string;
  /** Waktu kejadian, sudah diformat (mis. formatDate(...) atau "10.30"). */
  time?: string;
  text?: Child;
  tone?: "accent" | "ok" | "warn" | "danger";
}

/**
 * Urutan kejadian dari atas ke bawah (riwayat pesanan, log aktivitas).
 * @en Sequence of events from top to bottom (order history, activity log).
 * @group data
 * @example h(Timeline, { items: [{ title: "Pesanan dibuat", time: "09.12" }, { title: "Dibayar", time: "09.15", tone: "ok" }, { title: "Dikirim", time: "13.40", text: "JNE 0123456789" }] })
 */
export function Timeline({ items }: WithChildren<{ items: TimelineItem[] }>): Child {
  return h(
    "ol",
    { class: "zu-timeline" },
    items.map((item) =>
      h("li", { class: item.tone }, h("div", { class: "zu-timeline-head" }, h("b", null, item.title), item.time ? h("time", null, item.time) : null), item.text !== undefined ? h("div", { class: "zu-timeline-text" }, item.text) : null),
    ),
  );
}

/**
 * Label kategori berbentuk pil, bisa berupa tautan (mis. filter kategori). Untuk status pakai Badge.
 * @en Pill-shaped category label, optionally a link (e.g. a category filter). For a status use Badge.
 * @group data
 * @example h(Tag, { href: "/produk?kategori=kopi" }, "Kopi")
 */
export function Tag({ href, active, children }: WithChildren<{ href?: string; active?: boolean }>): Child {
  return href ? h("a", { class: cx("zu-tag", active && "active"), href, "aria-current": active ? "true" : undefined }, children) : h("span", { class: cx("zu-tag", active && "active") }, children);
}

/**
 * Deretan avatar yang sedikit bertumpuk, dengan "+N" bila lebih dari `max`.
 * @en Row of slightly overlapping avatars, with "+N" when there are more than `max`.
 * @group data
 * @example h(AvatarGroup, { names: team.map((m) => m.name), max: 4 })
 */
export function AvatarGroup({ names, max = 4 }: WithChildren<{ names: string[]; max?: number }>): Child {
  const shown = names.slice(0, max);
  const rest = names.length - shown.length;
  return h(
    "span",
    { class: "zu-avatars", role: "img", "aria-label": names.join(", ") },
    shown.map((name) => h(Avatar, { name })),
    rest > 0 ? h("span", { class: "zu-avatar more", "aria-hidden": "true" }, `+${rest}`) : null,
  );
}

/**
 * Rating bintang. Tanpa `name` hanya menampilkan nilai; dengan `name` menjadi input pilihan bintang
 * dalam formulir (tanpa JavaScript).
 * @en Star rating. Without `name` it only shows the value; with `name` it becomes a star input in a form (no JavaScript).
 * @group data
 * @example h(Rating, { value: 4.5, count: 128 })
 */
export function Rating({ value = 0, max = 5, count, name, label, required }: WithChildren<{ value?: number; max?: number; count?: number; name?: string; label?: string; required?: boolean }>): Child {
  const m = t().ui;
  if (name) {
    const stars = Array.from({ length: max }, (_, i) => max - i);
    return h(
      "fieldset",
      { class: "zu-rating-input" },
      h("legend", null, label ?? m.rating),
      h(
        "div",
        { class: "zu-stars-input" },
        stars.map((n) => [
          h("input", { type: "radio", id: `${name}-${n}`, name, value: String(n), checked: Math.round(value) === n, required: required && n === max ? true : undefined, "aria-label": m.stars(n) }),
          h("label", { for: `${name}-${n}`, title: m.stars(n) }, "★"),
        ]),
      ),
    );
  }
  const full = Math.round(Math.min(Math.max(value, 0), max));
  const shown = new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 1 }).format(value);
  return h(
    "span",
    { class: "zu-rating" },
    h("span", { class: "zu-stars", role: "img", "aria-label": m.ratingOf(shown, max) }, h("span", { class: "on", "aria-hidden": "true" }, "★".repeat(full)), h("span", { "aria-hidden": "true" }, "★".repeat(max - full))),
    h("b", null, shown),
    count !== undefined ? h("small", null, `(${new Intl.NumberFormat(intlLocale()).format(count)})`) : null,
  );
}

/**
 * Blok kode dengan tombol Salin (tombolnya muncul bila JavaScript aktif). `title` untuk nama file.
 * @en Code block with a Copy button (the button appears when JavaScript is on). `title` for a file name.
 * @group data
 * @example h(CodeBlock, { title: "Terminal", code: "npx zusantara dev" })
 */
export function CodeBlock({ code, title, lang }: WithChildren<{ code: string; title?: string; lang?: string }>): Child {
  const m = t().ui;
  return h(
    "figure",
    { class: "zu-code" },
    h("figcaption", null, h("span", null, title ?? lang ?? m.code), h("button", { class: "zu-copy", type: "button", "data-zu-copy": "", "data-done": m.copied, hidden: true }, m.copy)),
    h("pre", null, h("code", { class: lang ? `language-${lang}` : undefined }, code)),
  );
}

export interface CalendarEvent {
  /** Tanggal acara, "YYYY-MM-DD". */
  date: string;
  title: string;
  /** Jam atau keterangan singkat, mis. "10.00". */
  time?: string;
  href?: string;
  tone?: "accent" | "ok" | "warn" | "danger";
}

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

/** Bulan kalender ("YYYY-MM") dari string atau Date; bulan ini bila kosong atau tidak valid. */
function calendarMonth(month?: string | Date): { year: number; month: number } {
  if (month instanceof Date && !Number.isNaN(month.getTime())) return { year: month.getFullYear(), month: month.getMonth() + 1 };
  const match = typeof month === "string" ? /^(\d{4})-(\d{2})/.exec(month) : null;
  if (match && Number(match[2]) >= 1 && Number(match[2]) <= 12) return { year: Number(match[1]), month: Number(match[2]) };
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** "YYYY-MM" bulan sebelumnya atau berikutnya. */
function shiftMonth(month: string | Date | undefined, delta: number): string {
  const { year, month: m } = calendarMonth(month);
  const d = new Date(year, m - 1 + delta, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

/**
 * Kalender satu bulan dengan acara (booking, jadwal kelas, agenda). `month` = "YYYY-MM". `href` memakai
 * `{month}` untuk tautan bulan sebelumnya/berikutnya (mis. "/jadwal?bulan={month}"). Di ponsel
 * (atau `view: "list"`) tampil sebagai daftar acara.
 * @en One-month calendar with events (bookings, class schedules, agendas). `month` = "YYYY-MM". `href` uses `{month}` for the previous/next month links (e.g. "/schedule?month={month}"). On phones (or with `view: "list"`) it shows as a list of events.
 * @group data
 * @example h(Calendar, { month: ctx.query.bulan, href: "/jadwal?bulan={month}", events: bookings.map((b) => ({ date: b.date, time: b.time, title: b.name, href: `/booking/${b.id}` })) })
 */
export function Calendar({
  month,
  events = [],
  href,
  view = "month",
  today,
}: WithChildren<{ month?: string; events?: CalendarEvent[]; href?: string; view?: "month" | "list"; today?: string }>): Child {
  const m = t().ui;
  const { year, month: mon } = calendarMonth(month);
  const locale = intlLocale();
  const now = new Date();
  const todayIso = today ?? iso(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const title = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(new Date(year, mon - 1, 1));
  const days = new Date(year, mon, 0).getDate();
  const prefix = `${year}-${pad(mon)}-`;
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of [...events].filter((e) => e.date.startsWith(prefix)).sort((a, b) => (a.date + (a.time ?? "")).localeCompare(b.date + (b.time ?? "")))) {
    const key = e.date.slice(0, 10);
    byDay.set(key, [...(byDay.get(key) ?? []), e]);
  }
  const chip = (e: CalendarEvent) => {
    const text = [e.time ? h("span", { class: "zu-cal-time" }, e.time) : null, " ", e.title];
    return e.href ? h("a", { class: cx("zu-cal-event", e.tone), href: e.href }, text) : h("span", { class: cx("zu-cal-event", e.tone) }, text);
  };
  const nav = href
    ? h(
        "div",
        { class: "zu-cal-nav" },
        h("a", { class: "zu-btn ghost small", href: href.replaceAll("{month}", shiftMonth(`${year}-${pad(mon)}`, -1)), "aria-label": m.prevMonth }, "‹"),
        h("a", { class: "zu-btn ghost small", href: href.replaceAll("{month}", shiftMonth(`${year}-${pad(mon)}`, 1)), "aria-label": m.nextMonth }, "›"),
      )
    : null;

  // Senin di awal minggu untuk Bahasa Indonesia, Minggu untuk Bahasa Inggris (en-US).
  const weekStart = getLocale() === "en" ? 0 : 1;
  const weekday = new Intl.DateTimeFormat(locale, { weekday: "short" });
  const names = Array.from({ length: 7 }, (_, i) => weekday.format(new Date(2026, 1, 1 + ((i + weekStart) % 7))));
  const lead = (new Date(year, mon - 1, 1).getDay() - weekStart + 7) % 7;
  const cells: Child[] = [];
  const weeks: Child[] = [];
  for (let i = 0; i < lead; i++) cells.push(h("td", { class: "out" }));
  for (let d = 1; d <= days; d++) {
    const key = iso(year, mon, d);
    const list = byDay.get(key) ?? [];
    cells.push(
      h(
        "td",
        { class: key === todayIso ? "today" : undefined },
        h("span", { class: "zu-cal-day", "aria-current": key === todayIso ? "date" : undefined }, String(d)),
        list.map(chip),
      ),
    );
  }
  while (cells.length % 7) cells.push(h("td", { class: "out" }));
  for (let i = 0; i < cells.length; i += 7) weeks.push(h("tr", null, cells.slice(i, i + 7)));

  const dayFormat = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" });
  const list = byDay.size
    ? h(
        "ol",
        { class: "zu-cal-list" },
        [...byDay.entries()].map(([date, list]) => {
          const [y, mo, d] = date.split("-").map(Number) as [number, number, number];
          return h("li", { class: date === todayIso ? "today" : undefined }, h("b", null, dayFormat.format(new Date(y, mo - 1, d))), h("div", null, list.map(chip)));
        }),
      )
    : h("p", { class: "zu-cal-empty" }, m.noEvents);

  return h(
    "section",
    { class: cx("zu-calendar", view === "list" && "list") },
    h("div", { class: "zu-cal-head" }, h("h2", null, title), nav),
    view === "month" ? h("div", { class: "zu-cal-grid" }, h("table", null, h("thead", null, h("tr", null, names.map((n) => h("th", { scope: "col" }, n)))), h("tbody", null, weeks))) : null,
    list,
  );
}
