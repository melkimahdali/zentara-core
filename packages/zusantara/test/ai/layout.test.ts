import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, it } from "node:test";
import { findLayout, layoutSnapshot, layoutWarning } from "../../src/ai/layout.js";
import { projectSnapshot, SYSTEM_PROMPT } from "../../src/ai/prompt.js";

let root: string;
const write = (rel: string, content: string) => {
  fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), content);
};

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-layout-"));
  write("package.json", JSON.stringify({ name: "demo" }));
});
afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

describe("layout proyek untuk Zusantara AI", () => {
  it("menemukan appPage di src/app/lib/ui.ts dan contoh halaman yang memakainya", () => {
    write("src/app/lib/ui.ts", "export const APP_NAME = 'X';\nfunction navFor() {}\nexport function appPage() {}\nexport async function flash() {}\n");
    write("src/app/routes/index.ts", "export const GET = () => 'hi';\n");
    write("src/app/routes/dashboard.ts", "return appPage(ctx, { title: 'Dasbor' });\n");
    assert.deepEqual(findLayout(root), { file: "src/app/lib/ui.ts", exports: ["APP_NAME", "appPage", "flash"], example: "src/app/routes/dashboard.ts" });
    const snapshot = projectSnapshot(root);
    assert.match(snapshot, /App layout: src\/app\/lib\/ui\.ts exports APP_NAME, appPage, flash\. Every signed-in page MUST use appPage/);
    assert.match(snapshot, /navFor\(\)/);
    assert.match(snapshot, /Example page to follow: src\/app\/routes\/dashboard\.ts/);
    assert.match(snapshot, /Routes: dashboard\.ts, index\.ts/);
  });

  it("tanpa layout: arahkan ke page() dari zusantara/ui; zenstyles lama ditandai", () => {
    write("zenstyles/app.zs.css", "body{}");
    const lines = layoutSnapshot(root);
    assert.match(lines[0]!, /none yet.*page\(\).*zusantara\/ui/);
    assert.ok(lines.some((l) => /zenstyles\/ is a legacy stylesheet/.test(l)));
  });

  it("route yang membuat dokumen HTML atau CSS sendiri diberi catatan untuk model", () => {
    write("src/app/lib/ui.ts", "export function appPage() {}\n");
    for (const content of ["return `<!DOCTYPE html><html><body>x</body></html>`;", "return `<style>body{color:red}</style>`;", 'h("style", null, css)', '<link rel="stylesheet" href="/app.css">']) {
      const note = layoutWarning(root, "src/app/routes/booking.ts", content);
      assert.match(note ?? "", /appPage\(ctx, \{ title, active \}, \.\.\.children\) from src\/app\/lib\/ui\.ts/, content);
    }
    assert.equal(layoutWarning(root, "src/app/routes/booking.ts", "return appPage(ctx, { title: 'Booking', active: '/booking' }, h(Card, null, 'x'));"), undefined);
    assert.equal(layoutWarning(root, "src/app/lib/email.ts", "<html></html>"), undefined, "hanya file route");
    fs.rmSync(path.join(root, "src/app/lib/ui.ts"));
    assert.match(layoutWarning(root, "src/app/routes/x.ts", "<html>") ?? "", /page\(\{ title \}, \.\.\.body\)/);
  });

  it("instruksi sistem mewajibkan layout yang ada dan melarang HTML/CSS buatan sendiri", () => {
    assert.match(SYSTEM_PROMPT, /reuse the app's existing layout, never invent a new one/);
    assert.match(SYSTEM_PROMPT, /Do NOT write your own <html>, <head>, <style>, CSS files/);
    assert.match(SYSTEM_PROMPT, /navFor\(\)/);
  });
});
