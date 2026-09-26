import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { projectSlug } from "../src/repl/host.js";

describe("buat proyek dari CLI interaktif", () => {
  it("nama folder proyek dibuat aman (spasi dan karakter lain menjadi -)", () => {
    assert.equal(projectSlug("hub tiket transportasi indonesia"), "hub-tiket-transportasi-indonesia");
    assert.equal(projectSlug("  Toko Sari!  "), "toko-sari");
    assert.equal(projectSlug("app_v2.1"), "app_v2.1");
    assert.equal(projectSlug("../../etc"), "etc", "tidak bisa keluar folder");
    assert.equal(projectSlug("   "), "");
  });
});
