import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { unifiedDiff } from "../../src/ai/diff.js";

const lines = (n: number, prefix = "baris") => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1}`);

describe("unifiedDiff", () => {
  it("hanya baris yang berubah beserta 3 baris konteks", () => {
    const before = lines(20);
    const after = [...before];
    after[9] = "baris 10 (diubah)";
    assert.equal(
      unifiedDiff(before.join("\n"), after.join("\n")),
      ["@@ -7,7 +7,7 @@", " baris 7", " baris 8", " baris 9", "-baris 10", "+baris 10 (diubah)", " baris 11", " baris 12", " baris 13"].join("\n"),
    );
  });

  it("sisipan, penghapusan, dan perubahan yang berjauhan menjadi hunk terpisah", () => {
    const before = lines(30);
    const after = [...before];
    after.splice(2, 0, "baru");
    after.splice(after.indexOf("baris 25"), 1);
    const out = unifiedDiff(before.join("\n"), after.join("\n")).split("\n");
    assert.equal(out.filter((l) => l.startsWith("@@")).length, 2);
    assert.ok(out.includes("+baru"));
    assert.ok(out.includes("-baris 25"));
    assert.equal(out.filter((l) => l.startsWith("+") || l.startsWith("-")).length, 2);
  });

  it("teks sama -> kosong; file baru dari kosong -> semua baris +", () => {
    assert.equal(unifiedDiff("a\nb", "a\nb"), "");
    assert.deepEqual(unifiedDiff("", "x\ny").split("\n"), ["@@ -1,1 +1,2 @@", "-", "+x", "+y"]);
  });

  it("perubahan besar tetap cepat (awalan/akhiran sama dipangkas)", () => {
    const before = lines(50_000);
    const after = [...before];
    after[25_000] = "tengah";
    const started = Date.now();
    const out = unifiedDiff(before.join("\n"), after.join("\n"));
    assert.ok(Date.now() - started < 1000);
    assert.equal(out.split("\n").length, 9);
  });
});
