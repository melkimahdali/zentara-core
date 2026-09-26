/**
 * Business and team profile
 * Company profile page: a centered hero, key numbers, the team with photos, an office gallery,
 * client logos, and a contact form.
 */
import { h } from "../../../core/view.js";
import { Columns, ContactForm, Container, DescriptionList, Footer, Gallery, Hero, LogoCloud, Navbar, page, placeholder, Section, Stack, Split, Stat, StatGroup, TeamCard } from "../../index.js";

const team = [
  { name: "Sari Dewi", role: "Founder and architect", bio: "15 years designing energy-saving tropical homes.", photo: placeholder("SD", 400, 400) },
  { name: "Andi Pratama", role: "Project lead", bio: "Makes sure every project finishes on time.", photo: placeholder("AP", 400, 400) },
  { name: "Maya Lestari", role: "Interior designer", bio: "Loves local timber and natural light.", photo: placeholder("ML", 400, 400) },
];

export function GET() {
  return page(
    { title: "Room Studio · Tropical home architects", description: "An architecture studio designing energy-saving tropical homes and offices." },
    h(Navbar, {
      appName: "Room Studio",
      links: [
        { href: "/", label: "Home" },
        { href: "/projects", label: "Projects" },
        { href: "/about", label: "About" },
        { href: "#contact", label: "Contact" },
      ],
      active: "/about",
    }),
    h(
      "main",
      { id: "konten" },
      h(
        Container,
        null,
        h(
          Stack,
          { gap: "xl" },
          h(Hero, {
            eyebrow: "About us",
            title: "Homes that stay cool without air conditioning",
            text: "Since 2012 we have designed tropical homes and offices: cross ventilation, wide roofs, and local materials.",
            align: "center",
          }),
          h(StatGroup, null, h(Stat, { label: "Projects finished", value: "140+" }), h(Stat, { label: "Cities", value: 12 }), h(Stat, { label: "Founded", value: 2012 })),
          h(
            Section,
            { title: "Our team", description: "The people who will stay with your project from the first sketch to handover." },
            h(
              Columns,
              { cols: 3 },
              team.map((p) => h(TeamCard, p)),
            ),
          ),
          h(
            Section,
            { title: "Our studio" },
            h(Gallery, {
              images: [
                { src: placeholder("Workspace", 800, 600), alt: "Studio workspace with a long wooden table", caption: "Workspace" },
                { src: placeholder("Model", 800, 600), alt: "Cardboard model of a house", caption: "Project model" },
                { src: placeholder("Garden", 800, 600), alt: "Small garden in the middle of the studio", caption: "Inner garden" },
              ],
            }),
          ),
          h(LogoCloud, {
            title: "Trusted by",
            logos: ["Island Coffee", "Dusk Hotel", "Nature School"].map((name) => ({ src: placeholder(name, 200, 50), alt: name })),
          }),
          h(
            Section,
            { title: "Contact us", id: "contact", description: "Tell us about your plans. We reply within one working day." },
            h(
              Split,
              null,
              h(ContactForm, { action: "/contact", whatsapp: "081234567890" }),
              h(DescriptionList, {
                items: [
                  { label: "Address", value: "5 Kaliurang Road, Yogyakarta" },
                  { label: "Hours", value: "Monday to Friday, 9 am to 5 pm" },
                  { label: "Email", value: h("a", { href: "mailto:hello@roomstudio.id" }, "hello@roomstudio.id") },
                ],
              }),
            ),
          ),
        ),
      ),
    ),
    h(Footer, {
      appName: "Room Studio",
      links: [
        { href: "/projects", label: "Projects" },
        { href: "#contact", label: "Contact" },
      ],
    }),
  );
}
