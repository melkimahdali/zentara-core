import { getLocale, type Locale } from "../../i18n/index.js";
import * as enBooking from "./en/booking.js";
import * as enDashboard from "./en/dashboard.js";
import * as enLanding from "./en/landing.js";
import * as enProfile from "./en/profile.js";
import * as enStore from "./en/store.js";
import * as idBooking from "./id/booking.js";
import * as idDashboard from "./id/dashboard.js";
import * as idLanding from "./id/landing.js";
import * as idProfile from "./id/profile.js";
import * as idStore from "./id/store.js";

/**
 * Contoh halaman utuh yang bisa dibuka di /_zentara/ui/examples/<nama> saat pengembangan. Kodenya juga
 * masuk katalog (UI_EXAMPLES) sebagai rujukan Zentara AI dan `zentara ui --example`.
 */
const PAGES: Record<Locale, Record<string, { GET: () => string }>> = {
  id: { landing: idLanding, profile: idProfile, store: idStore, booking: idBooking, dashboard: idDashboard },
  en: { landing: enLanding, profile: enProfile, store: enStore, booking: enBooking, dashboard: enDashboard },
};

/** HTML lengkap satu contoh dalam bahasa aktif, atau undefined bila nama tidak dikenal. */
export function renderExample(name: string, locale: Locale = getLocale()): string | undefined {
  return Object.hasOwn(PAGES[locale], name) ? PAGES[locale][name]!.GET() : undefined;
}
