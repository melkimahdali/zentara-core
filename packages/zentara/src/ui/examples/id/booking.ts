/**
 * Jadwal booking
 * Halaman booking layanan: langkah pemesanan, kalender jadwal yang sudah terisi (daftar di ponsel), dan
 * formulir pilih tanggal, jam, dan layanan.
 */
import { h } from "../../../core/view.js";
import { Alert, Button, Calendar, Card, Container, Field, Footer, Form, FormActions, FormRow, Navbar, page, PageHeader, Select, Split, Stack, Steps } from "../../index.js";

// Di aplikasi nyata: booking dari database untuk bulan yang diminta (ctx.query.bulan).
const month = "2026-10";
const bookings = [
  { date: "2026-10-05", time: "10.00", title: "Potong rambut" },
  { date: "2026-10-05", time: "13.00", title: "Creambath" },
  { date: "2026-10-12", time: "09.00", title: "Potong rambut" },
  { date: "2026-10-19", time: "15.00", title: "Pewarnaan" },
];

export function GET() {
  return page(
    { title: "Booking · Salon Melati" },
    h(Navbar, {
      appName: "Salon Melati",
      links: [
        { href: "/", label: "Beranda" },
        { href: "/layanan", label: "Layanan" },
        { href: "/booking", label: "Booking" },
      ],
      active: "/booking",
    }),
    h(
      Container,
      { pad: true },
      h(
        "main",
        { id: "konten" },
        h(
          Stack,
          { gap: "lg" },
          h(PageHeader, { title: "Booking jadwal", description: "Pilih tanggal dan jam yang masih kosong. Kami konfirmasi lewat WhatsApp." }),
          h(Steps, { steps: ["Pilih jadwal", "Isi data", "Konfirmasi"], current: 1 }),
          h(
            Split,
            null,
            h(Calendar, { month, events: bookings, href: "/booking?bulan={month}", today: "2026-10-01" }),
            h(
              Card,
              { title: "Jadwal baru" },
              h(
                Form,
                { action: "/booking" },
                h(
                  Stack,
                  null,
                  h(Alert, null, "Jam yang sudah terisi tampil di kalender."),
                  h(Select, {
                    name: "layanan",
                    label: "Layanan",
                    placeholder: "Pilih layanan",
                    options: [
                      { value: "potong", label: "Potong rambut (45 menit)" },
                      { value: "creambath", label: "Creambath (60 menit)" },
                      { value: "warna", label: "Pewarnaan (120 menit)" },
                    ],
                    required: true,
                  }),
                  h(
                    FormRow,
                    null,
                    h(Field, { name: "tanggal", label: "Tanggal", type: "date", min: "2026-10-01", required: true }),
                    h(Field, { name: "jam", label: "Jam", type: "time", min: "09:00", max: "17:00", step: 1800, required: true }),
                  ),
                  h(Field, { name: "nama", label: "Nama", autocomplete: "name", required: true }),
                  h(Field, { name: "telepon", label: "Nomor WhatsApp", type: "tel", autocomplete: "tel", inputmode: "tel", required: true }),
                  h(FormActions, null, h(Button, { loading: "Menyimpan…" }, "Lanjut")),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    h(Footer, { appName: "Salon Melati" }),
  );
}
