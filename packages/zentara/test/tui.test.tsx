import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "ink-testing-library";
import type { HostStatus, ReplHost } from "../src/repl/host.js";
import { App } from "../src/tui/app.js";
import { fullscreenEnabled } from "../src/tui/index.js";
import { ENTER_ALT_SCREEN, frameHeight, headerLayout, LEAVE_ALT_SCREEN, RESTORE_TITLE, setTitle, itemHeight, logWindow, scrollDown, scrollUp, wrappedLines } from "../src/tui/layout.js";
import { Store, type Item } from "../src/tui/store.js";

const strip = (s: string | undefined) => (s ?? "").replace(/\x1b\[[0-9;]*m/g, "");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

function fakeHost(overrides: Partial<ReplHost> = {}) {
  const submitted: string[] = [];
  let mode: HostStatus["mode"] = "ask";
  let busy = false;
  const host: ReplHost & { submitted: string[]; setBusy(v: boolean): void; interrupted: number; closed: number } = {
    info: { version: "9.9.9", cwd: "/p", shortCwd: "~/proyek", isProject: true, dryRun: false },
    status: () => ({ server: { state: "running", url: "http://localhost:3000" }, mode, provider: "omniroute", tokens: 0, busy }),
    startup: async () => undefined,
    submit: async (line) => {
      submitted.push(line);
      return line === "/exit" ? "exit" : undefined;
    },
    interrupt() {
      host.interrupted++;
    },
    toggleMode() {
      mode = mode === "ask" ? "auto" : "ask";
    },
    close: async () => {
      host.closed++;
    },
    closed: 0,
    submitted,
    interrupted: 0,
    setBusy(v) {
      busy = v;
    },
    ...overrides,
  };
  return host;
}

describe("tampilan Ink (CLI interaktif)", () => {
  it("header, input, dan baris status tampil", async () => {
    const store = new Store();
    const host = fakeHost();
    const ui = render(<App store={store} host={host} onExit={() => {}} />);
    await tick();
    const frame = strip(ui.lastFrame());
    assert.match(frame, /Zentara Core v9\.9\.9/);
    assert.match(frame, /OmniRoute \(gratis\) · minta persetujuan/);
    assert.match(frame, /~\/proyek/);
    assert.match(frame, /Tulis permintaan/);
    assert.match(frame, /● http:\/\/localhost:3000/);
    ui.unmount();
  });

  it("tata letak biasa: animasi logo pembuka, lalu header masuk ke riwayat", async () => {
    const store = new Store();
    store.ui.notice("pemberitahuan awal");
    const ui = render(<App store={store} host={fakeHost()} onExit={() => {}} intro layout="inline" />);
    await tick(60);
    assert.doesNotMatch(strip(ui.lastFrame()), /Zentara Core v9/, "info belum tampil di awal animasi");
    assert.doesNotMatch(strip(ui.lastFrame()), /pemberitahuan awal/, "riwayat menunggu animasi selesai");
    await tick(1400);
    const frame = strip(ui.lastFrame());
    assert.match(frame, /Zentara Core v9\.9\.9/);
    assert.match(frame, /pemberitahuan awal/);
    assert.equal(frame.match(/Zentara Core v9/g)?.length, 1, "header tidak tergambar dua kali");
    ui.unmount();
  });

  it("mengetik lalu Enter mengirim ke host; saran perintah garis miring; Esc & Shift+Tab", async () => {
    const store = new Store();
    const host = fakeHost();
    let exitCode: number | undefined;
    const ui = render(<App store={store} host={host} onExit={(c) => (exitCode = c)} />);
    await tick();
    ui.stdin.write("buat API produk");
    await tick();
    assert.match(strip(ui.lastFrame()), /❯ buat API produk/);
    ui.stdin.write("\r");
    await tick();
    assert.deepEqual(host.submitted, ["buat API produk"]);
    assert.match(strip(ui.lastFrame()), /❯ buat API produk/, "permintaan tercatat di riwayat");

    ui.stdin.write("/re");
    await tick();
    const frame = strip(ui.lastFrame());
    assert.match(frame, /\/resume\s+Lanjutkan percakapan/);
    ui.stdin.write("\t");
    await tick();
    assert.match(strip(ui.lastFrame()), /❯ \/resume /, "Tab melengkapi perintah");
    ui.stdin.write("\x15");
    await tick();

    ui.stdin.write("\x1b[Z");
    await tick();
    assert.match(strip(ui.lastFrame()), /mode otomatis/);

    host.setBusy(true);
    store.changed();
    await tick();
    assert.match(strip(ui.lastFrame()), /sedang bekerja/);
    ui.stdin.write("\x1b");
    await tick(80);
    assert.equal(host.interrupted, 1);
    host.setBusy(false);
    store.changed();
    await tick();

    ui.stdin.write("/exit");
    await tick();
    ui.stdin.write("\r");
    await tick(50);
    assert.equal(exitCode, 0);
    ui.unmount();
  });

  it("jawaban AI mengalir per baris, lalu dirender sebagai Markdown", async () => {
    const store = new Store();
    const ui = render(<App store={store} host={fakeHost()} onExit={() => {}} />);
    store.ui.thinking();
    await tick();
    assert.match(strip(ui.lastFrame()), /Berpikir…/);
    store.ui.delta("Rencana:\n- buat `a.ts`\n- tes");
    await tick();
    let frame = strip(ui.lastFrame());
    assert.match(frame, /⏺ Rencana:/);
    assert.match(frame, /• buat a\.ts/);
    assert.match(frame, /- tes/, "baris terakhir masih mentah saat dialirkan");
    assert.match(frame, /Menulis…/);
    store.ui.assistant("Rencana:\n- buat `a.ts`\n- tes", "");
    store.ui.busy(undefined);
    await tick();
    frame = strip(ui.lastFrame());
    assert.match(frame, /• tes/);
    assert.equal(frame.match(/Rencana:/g)?.length, 1, "tidak dicetak dua kali");
    ui.unmount();
  });

  it("menu pilihan (↑/↓ Enter, Esc) dan persetujuan aksi krusial", async () => {
    const store = new Store();
    const ui = render(<App store={store} host={fakeHost()} onExit={() => {}} />);
    await tick();
    const choice = store.ui.choose("Jalankan server dev?", [{ label: "Ya", value: true }, { label: "Tidak", value: false }], false);
    await tick();
    assert.match(strip(ui.lastFrame()), /→ Ya/);
    ui.stdin.write("\x1b[B");
    await tick();
    assert.match(strip(ui.lastFrame()), /→ Tidak/);
    ui.stdin.write("\r");
    assert.equal(await choice, false);

    const cancelled = store.ui.choose("Pilih", [{ label: "A", value: "a" }], "batal");
    await tick();
    ui.stdin.write("\x1b");
    assert.equal(await cancelled, "batal");

    const approval = store.ui.approve({ tool: "run_command", risk: "critical", summary: "Jalankan: npx eslint src", reason: "menjalankan perintah terminal", preview: "$ npx eslint src", previewKind: "command" });
    await tick();
    const frame = strip(ui.lastFrame());
    assert.match(frame, /⚠ AKSI KRUSIAL: Jalankan: npx eslint src/);
    assert.match(frame, /\$ npx eslint src/);
    assert.doesNotMatch(frame, /setujui semua/, "aksi krusial tidak bisa disetujui sekaligus");
    ui.stdin.write("\r");
    assert.equal(await approval, "yes");

    const secret = store.ui.ask("API key", { secret: true });
    await tick();
    ui.stdin.write("sk-rahasia");
    await tick();
    assert.doesNotMatch(strip(ui.lastFrame()), /sk-rahasia/, "isi rahasia tidak ditampilkan");
    ui.stdin.write("\r");
    assert.equal(await secret, "sk-rahasia");
    ui.unmount();
  });

  /** Ukuran terminal palsu yang pasti (ink-testing-library tidak punya jumlah baris). */
  function resize(ui: ReturnType<typeof render>, rows: number) {
    Object.defineProperty(ui.stdout, "rows", { value: rows, configurable: true });
    ui.stdout.emit("resize");
  }

  it("layar penuh: header terkunci di atas, log bisa digulir, input di bawah", async () => {
    const store = new Store({ fullscreen: true });
    const ui = render(<App store={store} host={fakeHost()} onExit={() => {}} />);
    resize(ui, 24);
    for (let i = 1; i <= 30; i++) store.push({ kind: "user", text: `pesan ${i}` }, { kind: "notice", text: `balasan ${i}`, tone: "info" });
    await tick();
    let lines = strip(ui.lastFrame()).split("\n");
    assert.equal(lines.length, 23, "frame satu baris lebih pendek dari terminal (tanpa kedip)");
    // Header berbingkai dengan logo kecil (6 baris) di kiri dan info di sampingnya.
    assert.match(lines[0]!, /^╭─+╮$/);
    assert.match(lines[7]!, /^╰─+╯$/);
    const header = lines.slice(1, 7).join("\n");
    for (const re of [/Zentara Core v9\.9\.9/, /Rooted here\. Built for what's next\./, /OmniRoute \(gratis\) · minta persetujuan/, /~\/proyek/, /● http:\/\/localhost:3000/]) assert.match(header, re);
    assert.match(lines[1]!, /[▀▄█]/, "logo kecil di header");
    assert.match(lines[8]!, /↑ \d+ pesan sebelumnya · PgUp\/PgDn/);
    assert.match(lines.at(-1)!, /minta persetujuan .*PgUp\/PgDn gulir · Esc keluar/);
    assert.ok(lines.some((l) => /❯ pesan 30/.test(l)) && !lines.some((l) => /❯ pesan 1$/.test(l)), "pesan terbaru di bawah, yang lama di luar layar");

    ui.stdin.write("\x1b[5~"); // PgUp
    await tick();
    let frame = strip(ui.lastFrame());
    assert.doesNotMatch(frame, /pesan 30/);
    assert.match(frame, /↓ \d+ pesan lebih baru/);
    lines = frame.split("\n");
    assert.match(lines.slice(0, 8).join("\n"), /Zentara Core/, "header tetap di tempatnya saat menggulir");

    // Pesan baru saat menggulir tidak menarik layar ke bawah; Esc kembali ke pesan terbaru.
    store.push({ kind: "notice", text: "pesan baru", tone: "info" });
    await tick();
    assert.doesNotMatch(strip(ui.lastFrame()), /pesan baru/);
    ui.stdin.write("\x1b");
    await tick(80);
    frame = strip(ui.lastFrame());
    assert.match(frame, /pesan baru/);
    assert.doesNotMatch(frame, /pesan lebih baru/);
    ui.unmount();
  });

  it("layar penuh di terminal pendek: header ringkas dua baris dalam bingkai", async () => {
    const store = new Store({ fullscreen: true });
    const ui = render(<App store={store} host={fakeHost()} onExit={() => {}} />);
    resize(ui, 20);
    store.push({ kind: "notice", text: "halo", tone: "info" });
    await tick();
    const lines = strip(ui.lastFrame()).split("\n");
    assert.equal(lines.length, 19);
    assert.match(lines[1]!, /◆ Zentara Core v9\.9\.9 {2}OmniRoute \(gratis\) · minta persetujuan +● http:\/\/localhost:3000/);
    assert.match(lines[2]!, /~\/proyek/);
    assert.match(lines[3]!, /^╰─+╯$/);
    ui.unmount();
  });

  it("Esc atau Ctrl+C dua kali keluar dengan anggun (host ditutup sekali)", async () => {
    const store = new Store({ fullscreen: true });
    const host = fakeHost();
    const exits: number[] = [];
    const ui = render(<App store={store} host={host} onExit={(c) => exits.push(c)} />);
    await tick();
    ui.stdin.write("teks");
    await tick();
    ui.stdin.write("\x1b");
    await tick(80);
    assert.doesNotMatch(strip(ui.lastFrame()), /❯ teks/, "Esc pertama mengosongkan input");
    assert.deepEqual(exits, []);
    ui.stdin.write("\x1b");
    await tick(80);
    assert.match(strip(ui.lastFrame()), /Tekan Esc sekali lagi untuk keluar/);
    ui.stdin.write("\x03");
    await tick(80);
    assert.deepEqual(exits, [], "Esc lalu Ctrl+C bukan tekan-dua-kali");
    ui.stdin.write("\x1b");
    await tick(80);
    ui.stdin.write("\x1b");
    await tick(80);
    ui.stdin.write("\x1b");
    await tick(80);
    assert.deepEqual(exits, [0]);
    assert.equal(host.closed, 1, "host ditutup tepat sekali meski tombol keluar ditekan lagi");
    ui.unmount();

    const other = new Store({ fullscreen: true });
    const exits2: number[] = [];
    const ui2 = render(<App store={other} host={fakeHost()} onExit={(c) => exits2.push(c)} />);
    await tick();
    ui2.stdin.write("\x03");
    await tick();
    assert.match(strip(ui2.lastFrame()), /Tekan Ctrl\+C sekali lagi untuk keluar/);
    ui2.stdin.write("\x03");
    await tick(50);
    assert.deepEqual(exits2, [0]);
    ui2.unmount();
  });

  it("/clear mengosongkan log di layar penuh; error dari host tampil sebagai pesan", async () => {
    const store = new Store({ fullscreen: true });
    const host = fakeHost({
      submit: async (line) => {
        if (line === "gagal") throw new Error("provider mati");
        return undefined;
      },
    });
    const ui = render(<App store={store} host={host} onExit={() => {}} />);
    store.ui.notice("isi lama");
    store.ui.clear?.();
    store.ui.notice("Percakapan baru dimulai.");
    await tick();
    let frame = strip(ui.lastFrame());
    assert.doesNotMatch(frame, /isi lama/);
    assert.match(frame, /Percakapan baru dimulai/);
    ui.stdin.write("gagal");
    await tick();
    ui.stdin.write("\r");
    await tick(50);
    frame = strip(ui.lastFrame());
    assert.match(frame, /✗ provider mati/);
    ui.unmount();

    // Tata letak biasa mencetak riwayat lewat <Static>, jadi /clear tidak menghapusnya.
    const inline = new Store();
    inline.ui.notice("tetap ada");
    inline.ui.clear?.();
    assert.ok(inline.get().items.some((i) => i.kind === "notice" && i.text === "tetap ada"));
  });

  it("menu panjang ditampilkan sebagai jendela yang mengikuti pilihan", async () => {
    const store = new Store({ fullscreen: true });
    const ui = render(<App store={store} host={fakeHost()} onExit={() => {}} />);
    resize(ui, 24);
    const models = Array.from({ length: 40 }, (_, i) => ({ label: `model-${i + 1}`, value: i + 1 }));
    const picked = store.ui.choose("Pilih model", models, 0);
    await tick();
    let frame = strip(ui.lastFrame());
    assert.match(frame, /→ model-1$/m);
    assert.match(frame, /↓ \d+ lainnya/);
    assert.ok(frame.split("\n").length <= 23, "menu tidak melebihi layar");
    for (let i = 0; i < 20; i++) ui.stdin.write("\x1b[B");
    await tick();
    frame = strip(ui.lastFrame());
    assert.match(frame, /→ model-21$/m);
    assert.match(frame, /↑ \d+ lainnya/);
    ui.stdin.write("\r");
    assert.equal(await picked, 21);
    ui.unmount();
  });
});

describe("tata letak layar penuh (fungsi murni)", () => {
  const item = (id: number, text: string): Item => ({ id, kind: "notice", text, tone: "info" });

  it("tinggi frame, tinggi item, dan pembungkusan baris", () => {
    assert.equal(frameHeight(40), 39);
    assert.equal(frameHeight(5), 11, "minimal tetap bisa digunakan");
    assert.equal(wrappedLines("abc", 10), 1);
    assert.equal(wrappedLines("a".repeat(25), 10), 3);
    assert.equal(wrappedLines("\x1b[31mmerah\x1b[0m\nb", 10), 2, "kode warna tidak dihitung");
    assert.equal(itemHeight({ id: 1, kind: "user", text: "hai" }, 80), 2, "termasuk margin atas");
    assert.equal(itemHeight({ id: 1, kind: "assistant", lines: ["a", "b"], first: true }, 80), 3);
    assert.equal(itemHeight({ id: 0, kind: "header" }, 80), 0);
  });

  it("jendela log hanya berisi item yang muat; PgUp/PgDn menggeser jendela", () => {
    const items: Item[] = [{ id: 0, kind: "header" }, ...Array.from({ length: 20 }, (_, i) => item(i + 1, `baris ${i + 1}`))];
    const win = logWindow(items, { height: 5, columns: 80 });
    assert.deepEqual(win, { start: 16, end: 21, above: 15, below: 0 });
    const up = scrollUp(items, { height: 5, columns: 80 });
    assert.ok(up !== undefined && up < 21 && up >= 17);
    const upWin = logWindow(items, { height: 5, columns: 80, end: up });
    assert.ok(upWin.below > 0);
    assert.equal(scrollDown(items, { height: 5, columns: 80, end: up }), undefined, "kembali mengikuti pesan terbaru");
    assert.equal(scrollDown(items, { height: 5, columns: 80 }), undefined);
    const top = logWindow(items, { height: 50, columns: 80 });
    assert.equal(top.above, 0);
    assert.equal(scrollUp(items, { height: 50, columns: 80 }), undefined, "tidak bisa naik lagi");
    // Item raksasa yang lebih tinggi dari layar tetap bisa dilewati.
    const huge: Item[] = [item(1, "a"), item(2, "x\n".repeat(40)), item(3, "b")];
    assert.equal(scrollUp(huge, { height: 5, columns: 80, end: 2 }), 1);
  });

  it("layar penuh hanya untuk terminal interaktif yang cukup tinggi", () => {
    assert.equal(fullscreenEnabled(undefined, { isTTY: true, rows: 40 }, {}), true);
    assert.equal(fullscreenEnabled(false, { isTTY: true, rows: 40 }, {}), false);
    assert.equal(fullscreenEnabled(undefined, { isTTY: true, rows: 40 }, { ZENTARA_FULLSCREEN: "off" }), false);
    assert.equal(fullscreenEnabled(false, { isTTY: true, rows: 40 }, { ZENTARA_FULLSCREEN: "on" }), true);
    assert.equal(fullscreenEnabled(undefined, { isTTY: false, rows: 40 }, {}), false, "bukan TTY (pipa, CI)");
    assert.equal(fullscreenEnabled(undefined, { isTTY: true, rows: 8 }, {}), false, "terminal terlalu pendek");
  });

  it("header dengan logo hanya di terminal yang cukup besar; layar alternatif & judul tab", () => {
    assert.deepEqual(headerLayout(30, 120), { logo: true, height: 9 });
    assert.deepEqual(headerLayout(20, 120), { logo: false, height: 5 });
    assert.deepEqual(headerLayout(30, 50), { logo: false, height: 5 });
    assert.equal(ENTER_ALT_SCREEN, "\u001b[?1049h\u001b[2J\u001b[H", "masuk layar alternatif lalu bersihkan");
    assert.equal(LEAVE_ALT_SCREEN, "\u001b[?1049l");
    assert.equal(setTitle("zentara\u0007\u001b"), "\u001b]0;zentara\u0007", "karakter kontrol dibuang");
    assert.ok(RESTORE_TITLE.endsWith("\u001b[23;0t"));
  });
});
