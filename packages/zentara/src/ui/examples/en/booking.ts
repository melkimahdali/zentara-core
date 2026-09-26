/**
 * Booking schedule
 * Service booking page: booking steps, a calendar of taken slots (a list on phones), and a form to
 * pick the date, time, and service.
 */
import { h } from "../../../core/view.js";
import { Alert, Button, Calendar, Card, Container, Field, Footer, Form, FormActions, FormRow, Navbar, page, PageHeader, Select, Split, Stack, Steps } from "../../index.js";

// In a real app: bookings from the database for the requested month (ctx.query.month).
const month = "2026-10";
const bookings = [
  { date: "2026-10-05", time: "10:00", title: "Haircut" },
  { date: "2026-10-05", time: "13:00", title: "Hair spa" },
  { date: "2026-10-12", time: "09:00", title: "Haircut" },
  { date: "2026-10-19", time: "15:00", title: "Colouring" },
];

export function GET() {
  return page(
    { title: "Booking · Jasmine Salon" },
    h(Navbar, {
      appName: "Jasmine Salon",
      links: [
        { href: "/", label: "Home" },
        { href: "/services", label: "Services" },
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
          h(PageHeader, { title: "Book an appointment", description: "Pick a free date and time. We confirm on WhatsApp." }),
          h(Steps, { steps: ["Pick a time", "Your details", "Confirmation"], current: 1 }),
          h(
            Split,
            null,
            h(Calendar, { month, events: bookings, href: "/booking?month={month}", today: "2026-10-01" }),
            h(
              Card,
              { title: "New booking" },
              h(
                Form,
                { action: "/booking" },
                h(
                  Stack,
                  null,
                  h(Alert, null, "Taken slots are shown on the calendar."),
                  h(Select, {
                    name: "service",
                    label: "Service",
                    placeholder: "Choose a service",
                    options: [
                      { value: "haircut", label: "Haircut (45 minutes)" },
                      { value: "spa", label: "Hair spa (60 minutes)" },
                      { value: "colour", label: "Colouring (120 minutes)" },
                    ],
                    required: true,
                  }),
                  h(
                    FormRow,
                    null,
                    h(Field, { name: "date", label: "Date", type: "date", min: "2026-10-01", required: true }),
                    h(Field, { name: "time", label: "Time", type: "time", min: "09:00", max: "17:00", step: 1800, required: true }),
                  ),
                  h(Field, { name: "name", label: "Name", autocomplete: "name", required: true }),
                  h(Field, { name: "phone", label: "WhatsApp number", type: "tel", autocomplete: "tel", inputmode: "tel", required: true }),
                  h(FormActions, null, h(Button, { loading: "Saving…" }, "Continue")),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
    h(Footer, { appName: "Jasmine Salon" }),
  );
}
