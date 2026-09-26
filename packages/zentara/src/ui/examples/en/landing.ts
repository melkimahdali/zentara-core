/**
 * Bakery landing page
 * Front page for a small business: navigation, a hero with a photo, benefits, featured products,
 * testimonials, FAQ, a call to order, and a footer. No custom CSS.
 */
import { h } from "../../../core/view.js";
import { Button, Columns, Container, CTA, FAQ, FeatureGrid, Footer, Hero, Navbar, page, placeholder, ProductCard, Section, Stack, Testimonial } from "../../index.js";

// In a real app this data comes from the database.
const products = [
  { slug: "pandan-sponge-cake", name: "Pandan sponge cake", price: 12, original: 15, rating: 4.9, reviews: 212 },
  { slug: "baked-brownies", name: "Baked brownies", price: 10, rating: 4.8, reviews: 180 },
  { slug: "layer-cake", name: "Spiced layer cake", price: 28, rating: 5, reviews: 64 },
];

export function GET() {
  return page(
    { title: "Dusk Kitchen · Home bakery", description: "Fresh cakes without preservatives, baked every morning and delivered to your door." },
    h(Navbar, {
      appName: "Dusk Kitchen",
      links: [
        { href: "/", label: "Home" },
        { href: "/menu", label: "Menu" },
        { href: "/about", label: "About" },
      ],
      active: "/",
      actions: h(Button, { href: "/order", small: true }, "Order"),
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
            eyebrow: "Home bakery",
            title: "Fresh cakes, baked every morning",
            text: "No preservatives or artificial colouring. Order before 10 am and your cake arrives this afternoon.",
            actions: [h(Button, { href: "/menu" }, "See the menu"), h(Button, { href: "https://wa.me/6281234567890", variant: "secondary" }, "Ask on WhatsApp")],
            image: { src: placeholder("Chocolate cake", 800, 600), alt: "Chocolate cake topped with nuts on a wooden table" },
          }),
          h(FeatureGrid, {
            title: "Why Dusk Kitchen",
            features: [
              { icon: "🌾", title: "Local ingredients", text: "Flour, eggs, and butter from nearby farms." },
              { icon: "🚚", title: "Same-day delivery", text: "Free delivery in town for orders over $40." },
              { icon: "🎂", title: "Custom orders", text: "Lettering and decoration for birthdays and parties." },
            ],
          }),
          h(
            Section,
            { title: "Popular this week", actions: h(Button, { href: "/menu", variant: "secondary", small: true }, "Full menu") },
            h(
              Columns,
              { cols: 3 },
              products.map((p) =>
                h(ProductCard, {
                  name: p.name,
                  href: `/menu/${p.slug}`,
                  image: { src: placeholder(p.name, 600, 600), alt: p.name },
                  price: p.price,
                  original: p.original,
                  rating: p.rating,
                  reviews: p.reviews,
                }),
              ),
            ),
          ),
          h(
            Section,
            { title: "What customers say" },
            h(
              Columns,
              { cols: 2 },
              h(Testimonial, { quote: "Soft sponge with real pandan. The kids keep asking for more.", name: "Rina Wulandari", role: "Customer since 2024", rating: 5 }),
              h(Testimonial, { quote: "Ordered at 9, it arrived at 3 pm. Neatly packed for gifts.", name: "Budi Santoso", role: "Office party organiser", rating: 5 }),
            ),
          ),
          h(FAQ, {
            title: "Frequently asked questions",
            items: [
              { question: "How long do the cakes keep?", answer: "Three days at room temperature, one week in the fridge." },
              { question: "Do you ship out of town?", answer: "Cookies ship by courier. Fresh cakes are local delivery only." },
              { question: "How can I pay?", answer: "Bank transfer, QR payment, or cash on delivery in town." },
            ],
          }),
          h(CTA, {
            title: "Having a party this week?",
            text: "Order cake for 20 people or more and save 10%.",
            actions: h(Button, { href: "/order" }, "Order now"),
          }),
        ),
      ),
    ),
    h(Footer, {
      appName: "Dusk Kitchen",
      columns: [
        {
          title: "Shop",
          links: [
            { href: "/menu", label: "Menu" },
            { href: "/order", label: "How to order" },
          ],
        },
        {
          title: "About",
          links: [
            { href: "/about", label: "Our story" },
            { href: "/contact", label: "Contact" },
          ],
        },
      ],
    }),
  );
}
