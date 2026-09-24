// Uji ujung ke ujung "seolah sudah di-publish":
// build -> npm pack kedua paket -> periksa isi tarball -> create-zentara dari tarball
// -> npm install -> typecheck, test, build -> jalankan server produksi & dev lalu panggil API-nya.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const WORK = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-e2e-"));
const npm = "npm";
const isWindows = process.platform === "win32";

/** Sama dengan platformCommand di packages/zentara/src/process.ts: npm di Windows lewat shell, argumen dikutip. */
function platformCommand(command, args) {
  if (!isWindows || path.win32.isAbsolute(command) || path.posix.isAbsolute(command)) return { command, args, shell: false };
  const quote = (a) => (a !== "" && /^[\w@+=:,./\\-]+$/.test(a) ? a : `"${a.replace(/"/g, '""')}"`);
  return { command: [command, ...args].map(quote).join(" "), args: [], shell: true };
}
const templates = process.argv.slice(2).length ? process.argv.slice(2) : ["api", "minimal"];

function sh(cmd, args, cwd, extraEnv = {}) {
  console.log(`\n$ ${cmd} ${args.join(" ")}   (${path.relative(WORK, cwd) || cwd})`);
  const p = platformCommand(cmd, args);
  return execFileSync(p.command, p.args, { cwd, stdio: ["ignore", "pipe", "inherit"], env: { ...process.env, ...extraEnv }, shell: p.shell }).toString();
}

function check(condition, message) {
  if (!condition) throw new Error(`GAGAL: ${message}`);
  console.log(`  ✓ ${message}`);
}

async function waitFor(url, timeoutMs = 30_000) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return res;
    } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Server tidak merespons: ${url}`);
}

function startServer(cwd, args, port) {
  const child = spawn(process.execPath, [path.join(cwd, "node_modules", "zentara", "dist", "cli.js"), ...args], {
    cwd,
    env: { ...process.env, PORT: String(port), LOG_LEVEL: "warn" },
    stdio: ["ignore", "inherit", "inherit"],
    detached: !isWindows,
  });
  return () => {
    try {
      // Hentikan seluruh pohon proses (zentara dev menjalankan tsx watch + server sebagai proses anak).
      if (isWindows) execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else process.kill(-child.pid, "SIGTERM");
    } catch {}
  };
}

function pack(pkgDir) {
  const out = JSON.parse(sh(npm, ["pack", "--json", "--pack-destination", WORK], pkgDir));
  const info = out[0];
  const files = info.files.map((f) => f.path);
  console.log(`  ${info.filename}: ${files.length} file, ${(info.size / 1024).toFixed(0)} KB`);
  return { tarball: path.join(WORK, info.filename), files };
}

try {
  sh(npm, ["run", "build"], ROOT);

  const zentara = pack(path.join(ROOT, "packages", "zentara"));
  check(zentara.files.includes("dist/cli.js") && zentara.files.includes("dist/core/index.d.ts"), "paket zentara berisi dist + tipe");
  check(!zentara.files.some((f) => /^(src|test)\/|\.env$|\.db$/.test(f)), "paket zentara tanpa source/test/.env/database");
  check(zentara.files.includes("LICENSE") && zentara.files.includes("README.md"), "paket zentara berisi LICENSE & README");

  const create = pack(path.join(ROOT, "packages", "create-zentara"));
  check(create.files.includes("templates/api/_gitignore"), "template membawa _gitignore");
  check(create.files.includes("dist/index.js"), "paket create-zentara berisi dist/index.js");
  check(!create.files.some((f) => /^templates\/[^/]+\/(node_modules|dist|data)\/|\.env$|\.db$/.test(f)), "template tanpa node_modules/dist/data/.env/database");

  let port = 4400;
  for (const template of templates) {
    console.log(`\n=== Template ${template} ===`);
    const app = path.join(WORK, `app-${template}`);
    sh(npm, ["exec", "--yes", `--package=${create.tarball}`, "--", "create-zentara", app, "--template", template, "--no-install", "--yes", "--zentara-spec", `file:${zentara.tarball}`], WORK);
    check(fs.existsSync(path.join(app, ".gitignore")) && fs.existsSync(path.join(app, ".env")), "proyek dibuat dengan .gitignore dan .env");

    sh(npm, ["install", "--no-audit", "--no-fund"], app);
    sh(npm, ["run", "typecheck"], app);
    sh(npm, ["test"], app);
    sh(npm, ["run", "build"], app);
    check(fs.existsSync(path.join(app, "dist", "app", "routes", "index.js")), "zentara build menghasilkan dist/app");
    const cli = [path.join(app, "node_modules", "zentara", "dist", "cli.js")];
    check(sh(process.execPath, [...cli, "routes"], app).includes("/api/hello"), "zentara routes membaca route TypeScript");
    check(sh(process.execPath, [...cli, "--version"], app).trim() === JSON.parse(fs.readFileSync(path.join(ROOT, "packages", "zentara", "package.json"))).version, "zentara --version");

    if (template === "api") {
      sh(process.execPath, [...cli, "db:migrate"], app);
      check(sh(process.execPath, [...cli, "db:seed"], app).includes("Admin dibuat"), "db:migrate & db:seed");
    }

    // Produksi: zentara start (dist/app)
    const prodPort = port++;
    let stop = startServer(app, ["start"], prodPort);
    try {
      const home = await waitFor(`http://127.0.0.1:${prodPort}/`);
      check(home.status === 200 && (await home.text()).includes("Zentara"), "zentara start: halaman utama");
      const hello = await (await fetch(`http://127.0.0.1:${prodPort}/api/hello?name=Nusantara`)).json();
      check(hello.message === "Hello from Nusantara API", "zentara start: /api/hello");
      if (template === "api") {
        const products = await (await fetch(`http://127.0.0.1:${prodPort}/api/products`)).json();
        check(Array.isArray(products) && products.length === 3, "zentara start: /api/products dari database");
        check((await fetch(`http://127.0.0.1:${prodPort}/api/auth/me`)).status === 401, "zentara start: /api/auth/me butuh login");
      }
    } finally {
      stop();
    }

    // Pengembangan: zentara dev (src/app lewat tsx watch)
    const devPort = port++;
    stop = startServer(app, ["dev"], devPort);
    try {
      const res = await waitFor(`http://127.0.0.1:${devPort}/api/hello`);
      check(res.status === 200, "zentara dev: server TypeScript berjalan");
    } finally {
      stop();
    }
  }
  console.log(`\nSemua uji e2e lulus. (folder kerja: ${WORK})`);
  fs.rmSync(WORK, { recursive: true, force: true });
} catch (err) {
  console.error(`\n${err.message}\nFolder kerja disimpan untuk diperiksa: ${WORK}`);
  process.exitCode = 1;
}
