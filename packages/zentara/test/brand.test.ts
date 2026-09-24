import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FAVICON_PNG, LOGO_PIXELS, LOGO_WEBP } from "../src/brand/assets.js";
import { banner, BRAND, colorDepth, terminalLogo, to256, visibleWidth } from "../src/brand/index.js";

const strip = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, "");
const tty = (depth: number) => ({ isTTY: true, getColorDepth: () => depth }) as unknown as NodeJS.WriteStream;

describe("brand Zentara Core", () => {
  it("token warna sesuai pedoman brand", () => {
    assert.deepEqual(BRAND, { teal: "#2ED3B7", gold: "#C89B52", obsidian: "#0D1719", pearl: "#F2F4F0", slate: "#829490" });
  });

  it("aset logo tersedia dan ringan", () => {
    assert.match(LOGO_WEBP, /^data:image\/webp;base64,/);
    assert.match(FAVICON_PNG, /^data:image\/png;base64,/);
    assert.ok(LOGO_WEBP.length < 20_000);
    assert.equal(LOGO_PIXELS.length, 32);
  });

  it("colorDepth menghormati NO_COLOR dan non-TTY", () => {
    assert.equal(colorDepth(tty(24), { NO_COLOR: "1" }), "none");
    assert.equal(colorDepth({ isTTY: false } as NodeJS.WriteStream, {}), "none");
    assert.equal(colorDepth(tty(24), {}), "truecolor");
    assert.equal(colorDepth(tty(8), {}), "256");
    assert.equal(colorDepth(tty(4), {}), "basic");
  });

  it("to256 memetakan warna brand ke palet xterm", () => {
    assert.ok(to256([46, 211, 183]) >= 16 && to256([46, 211, 183]) < 232);
  });

  it("logo terminal: tanpa warna tidak ada kode ANSI, dengan truecolor memakai warna brand", () => {
    const plain = terminalLogo("none");
    assert.ok(plain.length >= 10 && plain.length <= 16);
    assert.ok(plain.every((l) => !l.includes("\x1b")));
    assert.ok(Math.max(...plain.map(visibleWidth)) <= 32);
    assert.match(terminalLogo("truecolor").join(""), /38;2;\d+;\d+;\d+/);
  });

  it("banner: logo + teks di terminal lebar, teks saja di terminal sedang, satu baris di terminal sempit", () => {
    const wide = banner({ version: "0.8.0", columns: 100, depth: "none" }).map(strip);
    assert.ok(wide.some((l) => /▀|▄|█/.test(l) && l.includes("Zentara Core")));
    assert.ok(wide.some((l) => l.includes("Rooted here. Built for what's next.")));
    assert.ok(wide.every((l) => l.length <= 100));

    const medium = banner({ version: "0.8.0", columns: 60, depth: "none" });
    assert.ok(medium.every((l) => !/▀|▄|█/.test(l)));
    assert.ok(medium.some((l) => l.includes("AI-driven TypeScript web framework from Indonesia")));

    assert.deepEqual(banner({ version: "0.8.0", columns: 30, depth: "none" }), ["Z> Zentara Core v0.8.0"]);
  });
});
