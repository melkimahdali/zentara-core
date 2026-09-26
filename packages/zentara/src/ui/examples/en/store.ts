/**
 * Online store with a cart
 * Store catalog: categories as tabs, product cards with an add button, a cart summary beside them,
 * and page numbers.
 */
import { h } from "../../../core/view.js";
import { Button, CartSummary, Columns, Container, Footer, Form, Navbar, page, PageHeader, Pagination, placeholder, ProductCard, QuantityInput, Split, Stack, Tabs } from "../../index.js";

// In a real app: products from the database, the cart from the session, the page from ctx.query.
const products = [
  { id: 1, slug: "gayo-coffee", name: "Gayo coffee 250 g", price: 18, original: 21, rating: 4.9, reviews: 320 },
  { id: 2, slug: "toraja-coffee", name: "Toraja coffee 250 g", price: 19.5, rating: 4.8, reviews: 210 },
  { id: 3, slug: "kintamani-coffee", name: "Kintamani coffee 250 g", price: 17, rating: 4.7, reviews: 150, soldOut: true },
  { id: 4, slug: "drip-bags", name: "Drip bags, pack of 10", price: 9.5, rating: 4.6, reviews: 98 },
];
const cart = [
  { name: "Gayo coffee 250 g", price: 18, qty: 2, note: "Coarse grind" },
  { name: "Drip bags, pack of 10", price: 9.5, qty: 1 },
];

export function GET() {
  return page(
    { title: "Coffee · Homeland Store" },
    h(Navbar, {
      appName: "Homeland Store",
      links: [
        { href: "/products", label: "Products" },
        { href: "/orders", label: "My orders" },
      ],
      active: "/products",
      actions: h(Button, { href: "/cart", small: true, variant: "secondary" }, `Cart (${cart.length})`),
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
          h(PageHeader, { title: "Coffee", description: "Beans from Indonesian farmers, roasted every Monday.", breadcrumb: [{ label: "Home", href: "/" }, { label: "Coffee" }] }),
          h(Tabs, {
            items: [
              { href: "/products?category=coffee", label: "Coffee", count: 12 },
              { href: "/products?category=tea", label: "Tea", count: 8 },
              { href: "/products?category=gear", label: "Brewing gear", count: 5 },
            ],
            active: "/products?category=coffee",
          }),
          h(
            Split,
            null,
            h(
              Stack,
              { gap: "lg" },
              h(
                Columns,
                { cols: 2 },
                products.map((p) =>
                  h(ProductCard, {
                    name: p.name,
                    href: `/products/${p.slug}`,
                    image: { src: placeholder(p.name, 600, 600), alt: p.name },
                    price: p.price,
                    original: p.original,
                    rating: p.rating,
                    reviews: p.reviews,
                    soldOut: p.soldOut,
                    action: h(Form, { action: `/cart/${p.id}` }, h(QuantityInput, { name: "qty", value: 1, max: 20, hideLabel: true }), h(Button, { small: true, loading: "Adding…" }, "Add")),
                  }),
                ),
              ),
              h(Pagination, { page: 1, pages: 3, href: "/products?category=coffee&page={page}" }),
            ),
            h(CartSummary, { items: cart, shipping: 0, discount: 2, action: h(Button, { href: "/checkout", block: true }, "Checkout") }),
          ),
        ),
      ),
    ),
    h(Footer, { appName: "Homeland Store" }),
  );
}
