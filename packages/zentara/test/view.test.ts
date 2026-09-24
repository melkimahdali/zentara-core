import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Fragment, h, raw, renderToString, type Child } from "../src/core/index.js";

describe("renderToString", () => {
  it("merender elemen bersarang dan atribut", () => {
    assert.equal(renderToString(h("div", { class: "a" }, h("span", null, "hi"), 3)), '<div class="a"><span>hi</span>3</div>');
  });

  it("meng-escape teks dan nilai atribut (anti-XSS)", () => {
    const evil = `<script>alert("x")</script>'&`;
    assert.equal(
      renderToString(h("p", { title: evil }, evil)),
      "<p title=\"&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&#39;&amp;\">&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;&#39;&amp;</p>",
    );
  });

  it("merender void element tanpa tag penutup", () => {
    assert.equal(renderToString(h("img", { src: "/a.png", alt: "" })), '<img src="/a.png" alt="">');
    assert.equal(renderToString(h("br")), "<br>");
  });

  it("menangani atribut boolean, null, dan function", () => {
    assert.equal(
      renderToString(h("input", { disabled: true, checked: false, value: null, onclick: () => 1, className: "x" })),
      '<input disabled class="x">',
    );
  });

  it("mengabaikan null/undefined/boolean sebagai child dan meratakan array", () => {
    const items: Child[] = ["a", null, undefined, false, ["b", ["c"]]];
    assert.equal(renderToString(h("ul", null, items)), "<ul>abc</ul>");
  });

  it("raw() tidak di-escape", () => {
    assert.equal(renderToString(h("div", null, raw("<b>ok</b>"))), "<div><b>ok</b></div>");
  });

  it("mendukung komponen function dan Fragment", () => {
    const Greeting = ({ name, children }: { name: string; children: Child[] }) => h("p", null, `Halo ${name}`, children);
    assert.equal(renderToString(h(Greeting, { name: "<Budi>" }, "!")), "<p>Halo &lt;Budi&gt;!</p>");
    assert.equal(renderToString(h(Fragment, null, h("i", null, "a"), "b")), "<i>a</i>b");
  });

  it("menolak nama tag dan atribut berbahaya", () => {
    assert.throws(() => renderToString(h("div onload=alert(1)", null)), /tag tidak valid/);
    assert.throws(() => renderToString(h("div", { 'x" onclick="a': 1 })), /atribut tidak valid/);
  });
});
