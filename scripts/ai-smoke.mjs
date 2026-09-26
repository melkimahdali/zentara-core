// Uji Zusantara AI dengan provider SUNGGUHAN (memakai kredit API!):
// build & pack -> buat proyek minimal dari tarball -> minta AI membuat route lewat bahasa biasa
// -> pastikan file dibuat, typecheck & test lulus, dan route-nya benar-benar merespons.
//
// Lalu (bila paket playwright tersedia) uji widget chat di Chromium: minta "tambah tombol di halaman ini"
// dari widget, setujui di browser, dan pastikan AI memeriksa hasilnya dengan view_page.
//
// Butuh minimal satu API key di env (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, ...).
// Pilih provider dengan ZUSANTARA_AI_ORDER, mis. ZUSANTARA_AI_ORDER=openai node scripts/ai-smoke.mjs
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEYS = ["ANTHROPIC_API_KEY", "OPENAI_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "DEEPSEEK_API_KEY", "OPENROUTER_API_KEY"];
const isWindows = process.platform === "win32";

if (!KEYS.some((k) => process.env[k])) {
  console.error(`Tidak ada API key. Isi salah satu: ${KEYS.join(", ")}`);
  process.exit(1);
}

function run(cmd, args, cwd, opts = {}) {
  console.log(`\n$ ${cmd} ${args.join(" ")}`);
  const quote = (a) => (a !== "" && /^[\w@+=:,./\\-]+$/.test(a) ? a : `"${a.replace(/"/g, '""')}"`);
  const viaShell = isWindows && !path.isAbsolute(cmd);
  return execFileSync(viaShell ? [cmd, ...args].map(quote).join(" ") : cmd, viaShell ? [] : args, {
    cwd,
    stdio: opts.inherit ? "inherit" : ["ignore", "pipe", "inherit"],
    shell: viaShell,
    env: { ...process.env, ...opts.env },
  })?.toString();
}

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "zusantara-ai-smoke-"));
const pack = (dir) => {
  const out = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", WORK], dir));
  const info = Array.isArray(out) ? out[0] : Object.values(out)[0];
  return path.join(WORK, info.filename);
};

/** Widget chat di browser sungguhan: permintaan dari halaman, persetujuan di browser, lalu view_page desktop dan ponsel. */
async function widgetFlow(app) {
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.log("\n(playwright tidak terpasang: uji widget di browser dilewati. Pasang dengan: npm install --no-save playwright && npx playwright install chromium)");
    return;
  }
  const route = path.join(app, "src", "app", "routes", "halo.ts");
  fs.writeFileSync(route, 'import { h } from "zusantara";\nimport { page } from "zusantara/ui";\n\nexport const GET = () => page({ title: "Halo" }, h("main", null, h("h1", null, "Halo")));\n');
  let ready = false;
  for (let i = 0; i < 60 && !ready; i++) {
    await new Promise((r) => setTimeout(r, 500));
    ready = await fetch("http://127.0.0.1:4499/halo").then((r) => r.ok, () => false);
  }
  if (!ready) throw new Error("/halo tidak bisa dibuka");
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  try {
    const tab = await browser.newPage();
    await tab.goto("http://localhost:4499/halo");
    await tab.waitForSelector("#zusantara-dev-widget", { state: "attached" });
    const inWidget = (fn, arg) => tab.evaluate(([code, a]) => new Function("root", "arg", code)(document.querySelector("#zusantara-dev-widget").shadowRoot, a), [fn, arg]);
    await inWidget('root.querySelector(".zw-launch").click()');
    await inWidget('root.querySelector("textarea").value = arg; root.querySelector("form").requestSubmit()', 'Tambah tombol bertuliskan "Ekspor" di halaman ini.');
    console.log("\n→ widget: tambah tombol Ekspor di /halo");
    // Setujui setiap perubahan dari browser sampai AI selesai.
    const until = Date.now() + 5 * 60_000;
    let done = false;
    while (!done && Date.now() < until) {
      await new Promise((r) => setTimeout(r, 1000));
      done = await inWidget('var b = root.querySelector(".zc-approval:not(.done) [data-answer=yes]"); if (b) b.click(); return Boolean(root.querySelector(".zc-done"));');
    }
    const log = await inWidget('return root.querySelector(".zc-log").innerText');
    console.log(`--- chat widget ---\n${log}`);
    if (!done) throw new Error("AI tidak selesai dalam 5 menit");
    if (!/view page \/halo/.test(log)) throw new Error("AI tidak memeriksa halaman dengan view_page");
    // Journal lokal: tugas selesai dengan view_page yang lulus di desktop dan ponsel.
    const journal = fs.readFileSync(path.join(app, ".zusantara", "ai-tasks.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l));
    const last = journal.at(-1);
    const latest = new Map(last.checks.views.filter((v) => !v.unreachable).map((v) => [v.viewport, v]));
    if (!latest.get("desktop")?.ok || !latest.get("mobile")?.ok) throw new Error(`view_page tidak lulus di desktop dan ponsel: ${JSON.stringify(last.checks.views)}`);
    console.log(`✓ journal: ${last.status}, ${last.steps} langkah, view_page ${last.checks.views.map((v) => `${v.viewport}:${v.ok ? "ok" : "gagal"}`).join(" ")}`);
    // Verifikasi (typecheck & test) harus lulus walau server dev sedang berjalan di PORT yang sama dengan .env.
    if (!/✓ (Selesai|Done)/.test(log)) throw new Error("AI tidak selesai dengan verifikasi lulus");
    if (!fs.readFileSync(route, "utf8").includes("Ekspor")) throw new Error("src/app/routes/halo.ts tidak memuat tombol Ekspor");
    await tab.reload();
    await tab.getByRole("button", { name: "Ekspor" }).first().waitFor({ timeout: 20_000 });
    console.log("✓ widget: tombol Ekspor muncul dan AI memeriksanya dengan view_page");
  } finally {
    await browser.close();
  }
}

try {
  run("npm", ["run", "build"], ROOT);
  const zusantara = pack(path.join(ROOT, "packages", "zusantara"));
  const create = pack(path.join(ROOT, "packages", "create-zusantara"));
  const app = path.join(WORK, "app");
  run("npm", ["exec", "--yes", `--package=${create}`, "--", "create-zusantara", app, "--template", "minimal", "--no-install", "--yes", "--zusantara-spec", `file:${zusantara}`], WORK);
  run("npm", ["install", "--no-audit", "--no-fund"], app);

  const cli = path.join(app, "node_modules", "zusantara", "dist", "cli.js");
  run(process.execPath, [cli, "ai:status"], app, { inherit: true });
  const task =
    'Buat route baru di src/app/routes/api/ping.ts: GET mengembalikan JSON { "ok": true, "pesan": "pong" }. Jangan ubah file lain selain yang perlu.';
  // --auto: perubahan file biasa langsung dikerjakan; aksi krusial otomatis ditolak (tidak ada terminal).
  run(process.execPath, [cli, task, "--auto"], app, { inherit: true });

  const route = path.join(app, "src", "app", "routes", "api", "ping.ts");
  if (!fs.existsSync(route)) throw new Error("AI tidak membuat src/app/routes/api/ping.ts");
  console.log(`\n--- ${path.relative(app, route)} ---\n${fs.readFileSync(route, "utf8")}`);
  run("npm", ["run", "typecheck"], app);
  run("npm", ["test"], app);

  const server = spawn(process.execPath, [cli, "dev"], { cwd: app, env: { ...process.env, PORT: "4499" }, stdio: "ignore", detached: !isWindows });
  try {
    let body;
    for (let i = 0; i < 60 && !body; i++) {
      await new Promise((r) => setTimeout(r, 500));
      body = await fetch("http://127.0.0.1:4499/api/ping").then((r) => (r.ok ? r.json() : undefined), () => undefined);
    }
    if (!body || body.ok !== true) throw new Error(`/api/ping tidak merespons { ok: true }: ${JSON.stringify(body)}`);
    console.log(`\n✓ /api/ping -> ${JSON.stringify(body)}`);
    await widgetFlow(app);
  } finally {
    try {
      if (isWindows) execFileSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
      else process.kill(-server.pid, "SIGTERM");
    } catch {}
  }
  console.log("\nUji AI sungguhan lulus.");
  fs.rmSync(WORK, { recursive: true, force: true });
} catch (err) {
  console.error(`\n${err.message}\nFolder kerja: ${WORK}`);
  process.exitCode = 1;
}
