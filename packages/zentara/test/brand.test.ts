import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { FAVICON_PNG, LOGO_TERMINAL, LOGO_WEBP } from "../src/brand/assets.js";
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
    assert.ok(LOGO_TERMINAL.length >= 12 && LOGO_TERMINAL.every((r) => /^[TG.]+$/.test(r) && r.length === LOGO_TERMINAL[0]!.length));
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
    assert.ok(plain.length >= 12 && plain.length <= 20);
    assert.ok(plain.every((l) => !l.includes("\x1b")));
    assert.ok(Math.max(...plain.map(visibleWidth)) <= 48);
    assert.match(terminalLogo("truecolor").join(""), /38;2;\d+;\d+;\d+/);
  });

  it("banner: logo + teks berdampingan, logo di atas teks, teks saja, atau satu baris sesuai lebar terminal", () => {
    const wide = banner({ version: "0.8.0", columns: 120, depth: "none" }).map(strip);
    assert.ok(wide.some((l) => /▀|▄|█/.test(l) && l.includes("Zentara Core")));
    assert.ok(wide.some((l) => l.includes("Rooted here. Built for what's next.")));
    assert.ok(wide.every((l) => l.length <= 120));

    const medium = banner({ version: "0.8.0", columns: 80, depth: "none" }).map(strip);
    assert.ok(medium.some((l) => /▀|▄|█/.test(l)));
    assert.ok(medium.every((l) => l.length <= 80));
    assert.ok(!medium.some((l) => /▀|▄|█/.test(l) && l.includes("Zentara")), "teks di bawah logo");

    const small = banner({ version: "0.8.0", columns: 46, depth: "none" });
    assert.ok(small.every((l) => !/▀|▄|█/.test(l)));
    assert.ok(small.some((l) => l.includes("AI-driven TypeScript web framework from Indonesia")));

    assert.deepEqual(banner({ version: "0.8.0", columns: 30, depth: "none" }), ["Z> Zentara Core v0.8.0"]);
  });
});

describe("kotak header CLI", () => {
  it("lebar tetap, judul di garis atas, keterangan di garis bawah, teks panjang dipotong", async () => {
    const { box } = await import("../src/repl/widgets.js");
    const lines = box("◆ ZENTARA CORE  v1", ["~/proyek", "x".repeat(200)], "/help perintah", 60).map(strip);
    assert.ok(lines[0]!.startsWith("╭─ ◆ ZENTARA CORE  v1 ") && lines[0]!.endsWith("╮"));
    assert.ok(lines.at(-1)!.startsWith("╰─ /help perintah ") && lines.at(-1)!.endsWith("╯"));
    assert.ok(lines.every((l) => l.length === lines[0]!.length), "semua baris sama lebar");
    assert.ok(lines[2]!.includes("…"));
  });
});
