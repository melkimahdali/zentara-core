import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { render } from "ink-testing-library";
import type { HostStatus, ReplHost } from "zentara/host";
import { App } from "../src/app.js";
import { Store } from "../src/store.js";

const strip = (s: string | undefined) => (s ?? "").replace(/\x1b\[[0-9;]*m/g, "");
const tick = (ms = 30) => new Promise((r) => setTimeout(r, ms));

function fakeHost(overrides: Partial<ReplHost> = {}) {
  const submitted: string[] = [];
  let mode: HostStatus["mode"] = "ask";
  let busy = false;
  const host: ReplHost & { submitted: string[]; setBusy(v: boolean): void; interrupted: number } = {
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
    close: async () => {},
    submitted,
    interrupted: 0,
    setBusy(v) {
      busy = v;
    },
    ...overrides,
  };
  return host;
}

describe("tampilan Ink zentara-cli", () => {
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
});
