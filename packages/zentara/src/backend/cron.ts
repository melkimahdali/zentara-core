/**
 * Jadwal cron 5 kolom: menit jam tanggal bulan hari (waktu lokal server; atur zona waktu dengan env TZ).
 *
 *   "0 7 * * *"      setiap hari jam 07:00
 *   "* /15 * * * *"  (tanpa spasi) setiap 15 menit
 *   "0 9 * * 1-5"    Senin sampai Jumat jam 09:00
 *   "@daily"         = "0 0 * * *" (juga @hourly, @weekly, @monthly, @yearly)
 *
 * Seperti cron standar, bila kolom tanggal DAN hari sama-sama dibatasi, jadwal berjalan bila salah satunya cocok.
 */
export interface CronSchedule {
  readonly source: string;
  matches(date: Date): boolean;
  /** Waktu jalan berikutnya setelah `from` (detik dibulatkan ke menit berikutnya). */
  next(from?: Date): Date;
}

const MACROS: Record<string, string> = {
  "@yearly": "0 0 1 1 *",
  "@annually": "0 0 1 1 *",
  "@monthly": "0 0 1 * *",
  "@weekly": "0 0 * * 0",
  "@daily": "0 0 * * *",
  "@midnight": "0 0 * * *",
  "@hourly": "0 * * * *",
};
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const DAYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

interface Field {
  values: Set<number>;
  /** Kolom berisi "*" (tanpa batas). */
  any: boolean;
}

function parseField(text: string, min: number, max: number, names: string[] | undefined, source: string): Field {
  const values = new Set<number>();
  const value = (raw: string): number => {
    const named = names?.indexOf(raw.toLowerCase());
    const n = named !== undefined && named >= 0 ? named + (min === 1 ? 1 : 0) : Number(raw);
    if (!Number.isInteger(n) || n < min || n > max) throw new Error(`Invalid cron "${source}": ${raw} is outside ${min}-${max}`);
    return n;
  };
  for (const part of text.split(",")) {
    const [range, stepText] = part.split("/");
    const step = stepText === undefined ? 1 : Number(stepText);
    if (!Number.isInteger(step) || step < 1) throw new Error(`Invalid cron "${source}": step ${stepText}`);
    let from: number;
    let to: number;
    if (range === "*") {
      from = min;
      to = max;
    } else if (range!.includes("-")) {
      const [a, b] = range!.split("-");
      from = value(a!);
      to = value(b!);
      if (from > to) throw new Error(`Invalid cron "${source}": ${range}`);
    } else {
      from = value(range!);
      to = stepText === undefined ? from : max;
    }
    for (let n = from; n <= to; n += step) values.add(n);
  }
  return { values, any: text === "*" || text === "*/1" };
}

export function parseCron(expression: string): CronSchedule {
  const source = expression.trim();
  const fields = (MACROS[source.toLowerCase()] ?? source).split(/\s+/);
  if (fields.length !== 5) throw new Error(`Invalid cron "${source}": expected 5 fields (minute hour day month weekday)`);
  const minute = parseField(fields[0]!, 0, 59, undefined, source);
  const hour = parseField(fields[1]!, 0, 23, undefined, source);
  const dom = parseField(fields[2]!, 1, 31, undefined, source);
  const month = parseField(fields[3]!, 1, 12, MONTHS, source);
  const dow = parseField(fields[4]!, 0, 7, DAYS, source);
  // 7 juga berarti Minggu.
  if (dow.values.has(7)) dow.values.add(0);

  const dayMatches = (d: Date) => {
    const byDom = dom.values.has(d.getDate());
    const byDow = dow.values.has(d.getDay());
    if (dom.any && dow.any) return true;
    if (dom.any) return byDow;
    if (dow.any) return byDom;
    return byDom || byDow;
  };
  const matches = (d: Date) => minute.values.has(d.getMinutes()) && hour.values.has(d.getHours()) && month.values.has(d.getMonth() + 1) && dayMatches(d);

  return {
    source,
    matches,
    next(from = new Date()) {
      const d = new Date(from.getTime());
      d.setSeconds(0, 0);
      d.setMinutes(d.getMinutes() + 1);
      // Maju per hari/jam/menit yang tidak cocok; batas 5 tahun untuk jadwal yang mustahil (mis. 31 Februari).
      const limit = from.getTime() + 5 * 366 * 86_400_000;
      while (d.getTime() <= limit) {
        if (!month.values.has(d.getMonth() + 1)) {
          d.setMonth(d.getMonth() + 1, 1);
          d.setHours(0, 0, 0, 0);
          continue;
        }
        if (!dayMatches(d)) {
          d.setDate(d.getDate() + 1);
          d.setHours(0, 0, 0, 0);
          continue;
        }
        if (!hour.values.has(d.getHours())) {
          d.setHours(d.getHours() + 1, 0, 0, 0);
          continue;
        }
        if (!minute.values.has(d.getMinutes())) {
          d.setMinutes(d.getMinutes() + 1, 0, 0);
          continue;
        }
        return d;
      }
      throw new Error(`Cron "${source}" never runs`);
    },
  };
}
