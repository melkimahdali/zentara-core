import { and, count, eq, gte } from "drizzle-orm";
import { h, type ZenContext } from "zusantara";
import { Button, Card, EmptyState, List, Split, Stat, StatGroup } from "zusantara/ui";
import { db } from "../db/index.js";
import { notes, users, type User } from "../db/schema.js";
import { requireUserPage } from "../lib/auth.js";
import { listNotes } from "../lib/notes.js";
import { appPage, excerpt, relativeDate, today } from "../lib/ui.js";

export const middleware = [requireUserPage];

/** Example requests for Zusantara AI: this app can become anything. */
const IDEAS = [
  "build a booking schedule page for signed-in users",
  "add a blog with posts, categories, and public pages",
  "build an inventory API with validation",
];

export async function GET(ctx: ZenContext) {
  const user = ctx.state.user as User;
  const isAdmin = user.role === "admin";
  const weekAgo = new Date(Date.now() - 7 * 86_400_000);
  const [[mine], [thisWeek], [people], latest] = await Promise.all([
    db.select({ total: count() }).from(notes).where(eq(notes.userId, user.id)),
    db.select({ total: count() }).from(notes).where(and(eq(notes.userId, user.id), gte(notes.updatedAt, weekAgo))),
    db.select({ total: count() }).from(users),
    listNotes(user.id, { limit: 5 }),
  ]);
  const date = new Intl.DateTimeFormat("en-US", { dateStyle: "long" });

  return appPage(
    ctx,
    {
      title: "Dashboard",
      subtitle: `Hi, ${user.name.split(" ")[0]}. Today is ${today()}.`,
      active: "/dashboard",
      actions: h(Button, { href: "/notes?new=1", variant: "secondary" }, "Write a note"),
    },
    h(
      StatGroup,
      null,
      h(Stat, { label: "Notes", value: mine?.total ?? 0, hint: "yours" }),
      h(Stat, { label: "This week", value: thisWeek?.total ?? 0, hint: "notes created or edited" }),
      isAdmin ? h(Stat, { label: "Users", value: people?.total ?? 0, hint: "registered accounts" }) : null,
    ),
    h(
      Split,
      null,
      h(
        Card,
        { title: "Latest notes", actions: h("a", { class: "zu-link", href: "/notes" }, "All notes") },
        latest.length
          ? h(List, {
              items: latest.map((n) => [
                h("span", null, h("a", { href: `/notes/${n.id}` }, n.title), n.body ? h("small", { class: "zu-muted zu-block" }, excerpt(n.body, 70)) : null),
                h("span", { class: "zu-muted" }, relativeDate(n.updatedAt)),
              ]),
            })
          : h(EmptyState, { title: "No notes yet", text: "Notes you write will appear here.", action: h(Button, { href: "/notes?new=1", small: true }, "Write a note") }),
      ),
      h(
        "div",
        { class: "zu-stack" },
        h(
          Card,
          { title: "Your account" },
          h(List, {
            items: [
              [h("span", { class: "zu-muted" }, "Email"), user.email],
              [h("span", { class: "zu-muted" }, "Role"), isAdmin ? "Admin" : "User"],
              [h("span", { class: "zu-muted" }, "Joined"), date.format(user.createdAt)],
            ],
          }),
        ),
        isAdmin
          ? h(
              Card,
              { title: "Build anything" },
              h("p", { class: "zu-muted" }, "This app is a starting point, not a limit. Run ", h("code", null, "npx zusantara"), " in a terminal, then ask for example:"),
              h("ul", { class: "zu-bullets" }, IDEAS.map((idea) => h("li", null, `“${idea}”`))),
            )
          : null,
      ),
    ),
  );
}
