// Uji Zentara AI dengan provider SUNGGUHAN (memakai kredit API!):
// build & pack -> buat proyek minimal dari tarball -> minta AI membuat route lewat bahasa biasa
// -> pastikan file dibuat, typecheck & test lulus, dan route-nya benar-benar merespons.
//
// Butuh minimal satu API key di env (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY, ...).
// Pilih provider dengan ZENTARA_AI_ORDER, mis. ZENTARA_AI_ORDER=openai node scripts/ai-smoke.mjs
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

const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-ai-smoke-"));
const pack = (dir) => {
  const out = JSON.parse(run("npm", ["pack", "--json", "--pack-destination", WORK], dir));
  const info = Array.isArray(out) ? out[0] : Object.values(out)[0];
  return path.join(WORK, info.filename);
};

try {
  run("npm", ["run", "build"], ROOT);
  const zentara = pack(path.join(ROOT, "packages", "zentara"));
  const create = pack(path.join(ROOT, "packages", "create-zentara"));
  const app = path.join(WORK, "app");
  run("npm", ["exec", "--yes", `--package=${create}`, "--", "create-zentara", app, "--template", "minimal", "--no-install", "--yes", "--zentara-spec", `file:${zentara}`], WORK);
  run("npm", ["install", "--no-audit", "--no-fund"], app);

  const cli = path.join(app, "node_modules", "zentara", "dist", "cli.js");
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
