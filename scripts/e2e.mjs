// Uji ujung ke ujung "seolah sudah di-publish":
// build -> npm pack kedua paket -> periksa isi tarball -> create-zentara dari tarball
// -> npm install -> typecheck, test, build -> jalankan server produksi & dev lalu panggil API-nya
// -> CLI global (npm install -g, tanpa drizzle-orm), tool Zentara AI, dan alur interaktif buat proyek.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

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
// "api", "minimal", atau dengan bahasa: "api:en" (template Bahasa Inggris, create-zentara --lang en).
const templates = process.argv.slice(2).length ? process.argv.slice(2) : ["api", "minimal", "api:en"];
/** Teks yang diharapkan di aplikasi hasil scaffold, per bahasa. */
const EXPECT = {
  id: { seeded: "Admin dibuat", home: "Aplikasi Anda", notFound: "Halaman tidak ditemukan", devRoutes: "Route yang tersedia", signIn: "Masuk" },
  en: { seeded: "Admin created", home: "Your app", notFound: "Page not found", devRoutes: "Available routes", signIn: "Sign in" },
};

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

function startServer(cwd, args, port, extraEnv = {}) {
  const child = spawn(process.execPath, [path.join(cwd, "node_modules", "zentara", "dist", "cli.js"), ...args], {
    cwd,
    env: { ...process.env, PORT: String(port), LOG_LEVEL: "warn", ...extraEnv },
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

/** Seperti sh(), tapi kode keluar bukan 0 tidak melempar error (mis. `zentara view` yang menemukan masalah). */
function shAny(cmd, args, cwd) {
  console.log(`\n$ ${cmd} ${args.join(" ")}   (${path.relative(WORK, cwd) || cwd})`);
  try {
    return { code: 0, out: execFileSync(cmd, args, { cwd, stdio: ["ignore", "pipe", "inherit"] }).toString() };
  } catch (err) {
    return { code: err.status ?? 1, out: String(err.stdout ?? "") };
  }
}

/** Chrome/Chromium untuk uji tampilan di browser sungguhan: CHROME_PATH, atau lokasi umum (runner GitHub punya Chrome). */
function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/opt/pw-browsers/chromium/chrome-linux/chrome",
    ...(fs.existsSync("/opt/pw-browsers") ? fs.readdirSync("/opt/pw-browsers").filter((d) => /^chromium-\d+$/.test(d)).map((d) => `/opt/pw-browsers/${d}/chrome-linux/chrome`) : []),
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ];
  return candidates.find((p) => p && fs.existsSync(p));
}

/** Buka `url` di Chrome headless (seperti tab developer). Mengembalikan fungsi untuk menutupnya. */
function openBrowser(chrome, url) {
  const profile = fs.mkdtempSync(path.join(WORK, "chrome-"));
  const child = spawn(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--no-first-run", "--no-default-browser-check", `--user-data-dir=${profile}`, "--window-size=1280,800", "--remote-debugging-port=0", url], {
    stdio: "ignore",
    detached: !isWindows,
  });
  return () => {
    try {
      if (isWindows) execFileSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      else process.kill(-child.pid, "SIGKILL");
    } catch {}
  };
}

/** Halaman contoh yang sengaja rusak untuk pemeriksaan tampilan view_page. */
const BROKEN_PAGE = `export const GET = () => \`<!doctype html><html><head><title>Rusak</title><style>.x{color:red}</style></head><body>
<div style="width:1600px;height:20px">Kotak terlalu lebar</div>
<p style="color:#bbb;background:#fff">Teks pucat</p>
<div style="position:relative;height:60px"><button style="position:absolute;left:0;top:0;width:120px;height:40px">Satu</button><button style="position:absolute;left:10px;top:5px;width:120px;height:40px">Dua</button></div>
<div style="width:80px;overflow:hidden;white-space:nowrap">Teks yang sangat panjang dan terpotong</div>
<img src="/tidak-ada.png" alt="rusak" width="40" height="40">
</body></html>\`;
`;

function kinds(out) {
  return new Set([...out.matchAll(/^- \[(\w+)\]/gm)].map((m) => m[1]));
}

function pack(pkgDir) {
  const out = JSON.parse(sh(npm, ["pack", "--json", "--pack-destination", WORK], pkgDir));
  // npm <= 11 mengembalikan array [{...}], npm >= 12 object { "<nama>": {...} }.
  const info = Array.isArray(out) ? out[0] : Object.values(out)[0];
  if (!info?.files) throw new Error(`Format output npm pack --json tidak dikenal: ${JSON.stringify(out).slice(0, 200)}`);
  const files = info.files.map((f) => f.path);
  console.log(`  ${info.filename}: ${files.length} file, ${(info.size / 1024).toFixed(0)} KB`);
  return { tarball: path.join(WORK, info.filename), files };
}

try {
  sh(npm, ["run", "build"], ROOT);

  const zentara = pack(path.join(ROOT, "packages", "zentara"));
  check(zentara.files.includes("dist/cli.js") && zentara.files.includes("dist/core/index.d.ts"), "paket zentara berisi dist + tipe");
  check(zentara.files.includes("dist/tui/index.js") && zentara.files.includes("dist/ui/index.js"), "paket zentara berisi tampilan Ink (tui) & kit UI");
  check(!zentara.files.some((f) => /^(src|test)\/|\.env$|\.db$/.test(f)), "paket zentara tanpa source/test/.env/database");
  check(zentara.files.includes("LICENSE") && zentara.files.includes("README.md"), "paket zentara berisi LICENSE & README");

  const create = pack(path.join(ROOT, "packages", "create-zentara"));
  check(create.files.includes("templates/api/_gitignore"), "template membawa _gitignore");
  check(create.files.includes("dist/index.js"), "paket create-zentara berisi dist/index.js");
  check(!create.files.some((f) => /^templates\/[^/]+\/(node_modules|dist|data)\/|\.env$|\.db$/.test(f)), "template tanpa node_modules/dist/data/.env/database");

  let port = 4400;
  for (const entry of templates) {
    const [template, lang = "id"] = entry.split(":");
    const expect = EXPECT[lang];
    console.log(`\n=== Template ${template} (${lang}) ===`);
    const app = path.join(WORK, `app-${template}-${lang}`);
    sh(npm, ["exec", "--yes", `--package=${create.tarball}`, "--", "create-zentara", app, "--template", template, "--lang", lang, "--no-install", "--yes", "--zentara-spec", `file:${zentara.tarball}`], WORK);
    check(fs.existsSync(path.join(app, ".gitignore")) && fs.existsSync(path.join(app, ".env")), "proyek dibuat dengan .gitignore dan .env");
    const favicon = path.join(app, "public", "favicon.ico");
    check(fs.existsSync(favicon) && fs.statSync(favicon).size > 1000 && fs.existsSync(path.join(app, "public", "apple-touch-icon.png")), "favicon & apple-touch-icon brand Zentara");

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
      check(sh(process.execPath, [...cli, "db:seed"], app).includes(expect.seeded), "db:migrate & db:seed");
      check(/No schema changes/.test(sh(process.execPath, [...cli, "db:generate"], app)), "db:generate (drizzle-kit) berjalan");
    }

    // Produksi: zentara start (dist/app). Env server pengembangan sengaja "terbawa": widget chat tetap tidak boleh muncul.
    const LEAKED_DEV_ENV = { ZENTARA_DEV: "1", ZENTARA_DEVTOOLS_PORT: "4999", ZENTARA_DEVTOOLS_TOKEN: "bocor" };
    const noWidget = (html) => !html.includes("/_zentara/dev/") && !html.includes("zentara-dev-widget") && !html.includes("bocor");
    const prodPort = port++;
    let stop = startServer(app, ["start"], prodPort, LEAKED_DEV_ENV);
    try {
      const home = await waitFor(`http://127.0.0.1:${prodPort}/`);
      const homeHtml = await home.text();
      check(home.status === 200 && homeHtml.includes(expect.home) && !homeHtml.includes("window.ZentaraChat") && noWidget(homeHtml), "zentara start: halaman sambutan tanpa chat AI dan tanpa widget");
      for (const asset of ["widget.js", "probe.js", "requests"]) check((await fetch(`http://127.0.0.1:${prodPort}/_zentara/dev/${asset}`, { headers: { "X-Zentara-Token": "bocor" } })).status === 404, `zentara start: /_zentara/dev/${asset} tidak ada (404)`);
      check(!(await fetch(`http://127.0.0.1:${prodPort}/`)).headers.has("x-zentara-request") && !homeHtml.includes("data-zsrc"), "zentara start: tanpa jejak request dan tanpa data-zsrc");
      check((await fetch(`http://127.0.0.1:${prodPort}/_zentara/ui`)).status === 404, "zentara start: galeri /_zentara/ui tidak ada di produksi (404)");
      const missing = await fetch(`http://127.0.0.1:${prodPort}/tidak-ada`, { headers: { accept: "text/html" } });
      const missingHtml = await missing.text();
      check(missing.status === 404 && missingHtml.includes(expect.notFound) && !missingHtml.includes(expect.devRoutes) && noWidget(missingHtml), "zentara start: halaman 404 tanpa detail internal dan tanpa widget");
      check(missingHtml.includes('<body class="zu">') && missingHtml.includes('<p class="zu-status-code">404</p>') && missingHtml.includes("/_zentara/ui.css"), "zentara start: halaman 404 memakai kit UI dan tema aplikasi");
      const hello = await (await fetch(`http://127.0.0.1:${prodPort}/api/hello?name=Nusantara`)).json();
      check(hello.message === "Hello from Nusantara API", "zentara start: /api/hello");
      if (template === "api") {
        const auth = { "content-type": "application/json" };
        const signin = await fetch(`http://127.0.0.1:${prodPort}/api/auth/login`, { method: "POST", headers: auth, body: JSON.stringify({ email: "admin@zentara.test", password: "admin12345" }) });
        const cookie = signin.headers.getSetCookie()[0]?.split(";")[0] ?? "";
        const notes = await (await fetch(`http://127.0.0.1:${prodPort}/api/notes`, { headers: { cookie } })).json();
        check(signin.status === 200 && Array.isArray(notes) && notes.length === 2, "zentara start: login + /api/notes dari database");
        check((await fetch(`http://127.0.0.1:${prodPort}/api/auth/me`)).status === 401, "zentara start: /api/auth/me butuh login");
        const login = await fetch(`http://127.0.0.1:${prodPort}/login`);
        const loginHtml = await login.text();
        check(login.status === 200 && loginHtml.includes('href="/_zentara/ui.css') && loginHtml.includes(`<h1>${expect.signIn}</h1>`), `zentara start: halaman /login dengan kit UI (${lang})`);
        const css = await fetch(`http://127.0.0.1:${prodPort}/_zentara/ui.css`);
        check(css.status === 200 && /text\/css/.test(css.headers.get("content-type") ?? ""), "zentara start: /_zentara/ui.css");
        const dash = await fetch(`http://127.0.0.1:${prodPort}/dashboard`, { redirect: "manual" });
        check(dash.status === 303 && dash.headers.get("location") === "/login?next=%2Fdashboard", "zentara start: /dashboard mengarahkan tamu ke /login");
        const dashboard = await fetch(`http://127.0.0.1:${prodPort}/dashboard`, { headers: { cookie } });
        check(dashboard.status === 200 && noWidget(loginHtml) && noWidget(await dashboard.text()), "zentara start: /login dan /dashboard (login) tanpa widget chat");
      }
    } finally {
      stop();
    }
    check(!fs.readdirSync(path.join(app, "dist"), { recursive: true }).some((f) => /\.js$/.test(f) && fs.readFileSync(path.join(app, "dist", f), "utf8").includes("_zentara/dev")), "zentara build: dist/ tidak memuat widget chat");

    // Produksi dengan ZENTARA_DEBUG=1 (halaman error lengkap) + env pengembangan yang terbawa: tetap tanpa widget.
    const debugPort = port++;
    stop = startServer(app, ["start"], debugPort, { ...LEAKED_DEV_ENV, ZENTARA_DEBUG: "1" });
    try {
      const debugHome = await (await waitFor(`http://127.0.0.1:${debugPort}/`)).text();
      const debugMissing = await (await fetch(`http://127.0.0.1:${debugPort}/tidak-ada`, { headers: { accept: "text/html" } })).text();
      check(noWidget(debugHome) && noWidget(debugMissing) && !debugMissing.includes("window.ZentaraChat"), "zentara start + ZENTARA_DEBUG=1: tetap tanpa chat dan widget");
      check((await fetch(`http://127.0.0.1:${debugPort}/_zentara/dev/widget.js`)).status === 404, "zentara start + ZENTARA_DEBUG=1: /_zentara/dev/widget.js 404");
    } finally {
      stop();
    }

    // Pengembangan: zentara dev (src/app lewat tsx watch)
    const devPort = port++;
    stop = startServer(app, ["dev"], devPort);
    try {
      const res = await waitFor(`http://127.0.0.1:${devPort}/api/hello`);
      check(res.status === 200, "zentara dev: server TypeScript berjalan");
      const welcome = await (await fetch(`http://127.0.0.1:${devPort}/`)).text();
      const devtools = JSON.parse(welcome.match(/<script type="application\/json" id="zx-data">(.*?)<\/script>/)?.[1] ?? "{}").devtools;
      check(welcome.includes("window.ZentaraChat") && devtools?.port > 0, "zentara dev: halaman sambutan dengan chat Zentara AI");
      const status = await fetch(`http://127.0.0.1:${devtools.port}/status`, { headers: { "X-Zentara-Token": devtools.token } });
      check(status.status === 200 && Array.isArray((await status.json()).providers), "zentara dev: server devtools (chat AI) menjawab");
      const notFound = await (await fetch(`http://127.0.0.1:${devPort}/belum-ada`, { headers: { accept: "text/html" } })).text();
      check(notFound.includes(expect.devRoutes) && notFound.includes("/api/hello"), "zentara dev: halaman 404 pengembangan");
      // Widget chat: halaman yang sudah punya chat hanya mendapat kanal halaman, halaman lain tombol mengambang.
      check(/\/_zentara\/dev\/widget\.js[^>]*data-ui="off"/.test(welcome) && welcome.includes("/_zentara/dev/probe.js"), "zentara dev: halaman sambutan terhubung ke kanal halaman (tanpa widget ganda)");
      const widgetJs = await fetch(`http://127.0.0.1:${devPort}/_zentara/dev/widget.js`);
      check(widgetJs.status === 200 && (await widgetJs.text()).includes("zentara-dev-widget"), "zentara dev: /_zentara/dev/widget.js tersedia");
      const cliView = [path.join(app, "node_modules", "zentara", "dist", "cli.js"), "view", "/api/hello?name=Nusantara", "--url", `http://127.0.0.1:${devPort}`, "--text", "Nusantara"];
      check(sh(process.execPath, cliView, app).includes("(HTTP 200)"), "zentara view: versi teks halaman dari server dev");
      if (template === "api") {
        const devLogin = await (await fetch(`http://127.0.0.1:${devPort}/login`)).text();
        check(/\/_zentara\/dev\/widget\.js[^>]*data-ui="on"/.test(devLogin) && /<head[^>]*><script src="\/_zentara\/dev\/probe\.js"/.test(devLogin), "zentara dev: /login memuat probe dan widget chat mengambang");
        check(/data-route="src\/app\/routes\/login\.ts"/.test(devLogin), "zentara dev: widget tahu file route halaman ini");
        const cli = path.join(app, "node_modules", "zentara", "dist", "cli.js");
        const view = (target, ...extra) => shAny(process.execPath, [cli, "view", target, "--url", `http://127.0.0.1:${devPort}`, ...extra], app);
        const loginView = view("/login", "--text", expect.signIn);
        check(loginView.code === 0 && loginView.out.includes(`- h1 "${expect.signIn}"`), "zentara view /login: heading halaman terbaca, tanpa temuan");
        check(view("/login", "--mobile").code === 0, "zentara view /login --mobile: tanpa temuan (versi teks)");
        // Katalog kit UI dari CLI (sama dengan tool ui_catalog Zentara AI).
        const catalog = sh(process.execPath, [cli, "ui"], app);
        check(catalog.includes("Select") && catalog.includes("PageHeader"), "zentara ui: katalog komponen kit UI");
        check(sh(process.execPath, [cli, "ui", "FileInput"], app).includes("maxBytes"), "zentara ui FileInput: props dan contoh");
        const example = sh(process.execPath, [cli, "ui", "--example", "landing"], app);
        check(example.includes('from "zentara/ui"') && example.includes("h(Hero, {") && !example.includes('from "../'), "zentara ui --example landing: kode route lengkap dari zentara/ui");
        const placeholderRes = await fetch(`http://127.0.0.1:${devPort}/_zentara/placeholder.svg?text=Kue&w=400&h=300`);
        check(placeholderRes.status === 200 && (await placeholderRes.text()).includes(">Kue</text>"), "/_zentara/placeholder.svg: gambar contoh bawaan");
        // Halaman yang sengaja rusak: temuan versi teks (tanpa browser).
        fs.writeFileSync(path.join(app, "src", "app", "routes", "rusak.ts"), BROKEN_PAGE);
        await waitFor(`http://127.0.0.1:${devPort}/rusak`);
        let broken = view("/rusak");
        for (let i = 0; i < 20 && !broken.out.includes("[kit]"); i++) {
          await new Promise((r) => setTimeout(r, 500));
          broken = view("/rusak");
        }
        const textKinds = kinds(broken.out);
        check(broken.code === 1 && ["kit", "meta", "style", "image"].every((k) => textKinds.has(k)), `zentara view /rusak: temuan versi teks benar (${[...textKinds].join(", ")})`);

        // Alat pengembang 12e: jejak request (waktu, query, N+1, session, log), varian, sumber elemen, muat ulang.
        const devInfo = JSON.parse(fs.readFileSync(path.join(app, ".zentara", "devtools.json"), "utf8"));
        const loginRes = await fetch(`http://127.0.0.1:${devPort}/login`);
        const loginHtml = await loginRes.text();
        const requestId = loginRes.headers.get("x-zentara-request") ?? "";
        check(/^[\w-]+$/.test(requestId) && loginHtml.includes(`data-request="${requestId}"`), "zentara dev: setiap request punya id jejak (header dan probe)");
        check(/data-zsrc="src\/app\/routes\/login\.ts:\d+"/.test(loginHtml), "zentara dev: elemen halaman ditandai file:baris pembuatnya (mode inspeksi)");
        check((await fetch(`http://127.0.0.1:${devPort}/_zentara/dev/requests`)).status === 401, "zentara dev: /_zentara/dev/requests butuh token devtools");
        fs.writeFileSync(
          path.join(app, "src", "app", "routes", "n1.ts"),
          'import { eq } from "drizzle-orm";\nimport { db } from "../db/index.js";\nimport { notes } from "../db/schema.js";\nexport async function GET() {\n  console.log("memuat catatan");\n  for (const id of [1, 2, 3]) await db.select().from(notes).where(eq(notes.id, id));\n  return { ok: true };\n}\n',
        );
        await waitFor(`http://127.0.0.1:${devPort}/n1`);
        let n1Id = "";
        for (let i = 0; i < 40 && !n1Id; i++) {
          // Server dev bisa sedang dimulai ulang setelah file baru ditulis.
          const r = await fetch(`http://127.0.0.1:${devPort}/n1`).catch(() => undefined);
          if (r?.status === 200) n1Id = r.headers.get("x-zentara-request") ?? "";
          else await new Promise((res) => setTimeout(res, 500));
        }
        const requests = shAny(process.execPath, [cli, "requests", n1Id], app);
        check(requests.code === 0 && /3 query/.test(requests.out) && /3x SELECT/i.test(requests.out) && requests.out.includes("memuat catatan"), `zentara requests <id>: query, N+1, dan log request\n${requests.out}`);
        const list = JSON.parse(sh(process.execPath, [cli, "requests", "--json", "--path", "/n1"], app));
        check(list.length > 0 && list[0].repeated[0]?.count === 3 && list[0].route === "src/app/routes/n1.ts", "zentara requests --json: daftar request dengan tanda N+1 dan file route");
        const variant = await (await waitFor(`http://127.0.0.1:${devPort}/login?__zentara_mode=dark&__zentara_lang=en`)).text();
        check(/<html lang="en" data-zu-mode="dark"/.test(variant) && variant.includes("<h1") && !variant.includes("__zentara_"), "zentara dev: varian gelap + en untuk satu request");
        const scored = view("/login", "--lang", "en", "--dark", "--json");
        const scoredResult = JSON.parse(scored.out);
        check(scoredResult.summary.theme === "dark" && scoredResult.summary.lang === "en" && scoredResult.summary.score >= 80 && /(Page score|Skor halaman): \d+\/100/.test(scoredResult.text), `zentara view --dark --lang en: varian dan skor halaman\n${scoredResult.text}`);
        // Muat ulang otomatis: setelah file berubah dan server dev mulai ulang, tab menerima perintah reload.
        const channel = await fetch(`http://127.0.0.1:${devInfo.port}/page-channel?url=e2e`, { headers: { "X-Zentara-Token": devInfo.token } });
        const reader = channel.body.getReader();
        const decoder = new TextDecoder();
        let events = "";
        const gotReload = (async () => {
          // Satu read() yang menunggu dipakai ulang: read() yang ditinggal akan menelan potongan data.
          const deadline = Date.now() + 30_000;
          let pending = reader.read();
          while (Date.now() < deadline && !events.includes('"reload"')) {
            const next = await Promise.race([pending, new Promise((r) => setTimeout(() => r(undefined), 1000))]);
            if (!next) continue;
            if (next.done) break;
            events += decoder.decode(next.value, { stream: true });
            pending = reader.read();
          }
          return events.includes('"reload"');
        })();
        fs.writeFileSync(path.join(app, "src", "app", "routes", "n1.ts"), 'export const GET = () => ({ ok: "baru" });\n');
        check(await gotReload, "zentara dev: tab yang terhubung dimuat ulang otomatis setelah file berubah");
        await reader.cancel().catch(() => {});
        fs.rmSync(path.join(app, "src", "app", "routes", "n1.ts"), { force: true });

        // Browser sungguhan (Chrome headless sebagai tab developer): pemeriksaan posisi, tumpang tindih, dan kontras.
        const chrome = findChrome();
        if (!chrome) console.log("  - Chrome tidak ditemukan (CHROME_PATH): uji tampilan di browser dilewati");
        else {
          // Tab dibuka setelah /login pasti menjawab: halaman galat Chrome (server sedang dimulai ulang) tidak
          // pernah terhubung. Bila tab belum terhubung juga (Chrome pertama kali di CI lambat), buka ulang sekali.
          await waitFor(`http://127.0.0.1:${devPort}/login`);
          let closeBrowser = openBrowser(chrome, `http://127.0.0.1:${devPort}/login`);
          try {
            let login = view("/login", "--json");
            for (let i = 0; i < 80 && !login.out.includes('"mode": "browser"'); i++) {
              if (i === 30) {
                closeBrowser();
                closeBrowser = openBrowser(chrome, `http://127.0.0.1:${devPort}/login`);
              }
              await new Promise((r) => setTimeout(r, 500));
              login = view("/login", "--json");
            }
            const loginResult = JSON.parse(login.out);
            check(loginResult.mode === "browser", `zentara view lewat tab browser yang terhubung ke devtools${loginResult.mode === "browser" ? "" : `\n${loginResult.text}`}`);
            check(loginResult.ok === true, `zentara view /login di browser: tanpa temuan\n${loginResult.ok ? "" : loginResult.text}`);
            check(/← src\/app\/routes\/login\.ts:\d+/.test(loginResult.text) && typeof loginResult.summary.score === "number", `zentara view /login di browser: sumber elemen dan skor halaman\n${loginResult.text}`);
            const tablet = JSON.parse(view("/login", "--tablet", "--json").out);
            check(tablet.mode === "browser" && /768x1024/.test(tablet.text) && tablet.ok === true, `zentara view /login --tablet: layar 768px tanpa temuan\n${tablet.ok ? "" : tablet.text}`);
            const dark = JSON.parse(view("/login", "--dark", "--json").out);
            check(dark.mode === "browser" && dark.ok === true, `zentara view /login --dark: mode gelap tanpa temuan\n${dark.ok ? "" : dark.text}`);
            const pictured = JSON.parse(view("/login", "--screenshot", "--json").out);
            const png = pictured.summary.screenshot ? fs.readFileSync(path.join(app, pictured.summary.screenshot)) : Buffer.alloc(0);
            check(png.subarray(1, 4).toString() === "PNG" && png.length > 5000, `zentara view --screenshot: gambar PNG halaman tersimpan (${pictured.summary.screenshot ?? pictured.text.slice(-300)})`);
            const mobile = JSON.parse(view("/login", "--mobile", "--json").out);
            check(mobile.mode === "browser" && mobile.summary.viewport === "mobile" && /390x844/.test(mobile.text), "zentara view /login --mobile: dilihat di layar 390px");
            check(mobile.ok === true, `zentara view /login --mobile di browser: tanpa temuan\n${mobile.ok ? "" : mobile.text}`);
            const shot = view("/rusak");
            const browserKinds = kinds(shot.out);
            const want = ["overflow", "overlap", "truncated", "image", "contrast", "style", "kit", "meta"];
            check(shot.code === 1 && want.every((k) => browserKinds.has(k)), `zentara view /rusak di browser: semua jenis temuan (${[...browserKinds].join(", ")})`);

            // Galeri kit UI dan contoh halaman utuh: setiap komponen katalog dan setiap contoh (landing, profil,
            // toko, booking, dasbor) lolos pemeriksaan tampilan di desktop dan ponsel.
            const gallery = (label) => {
              for (const page of ["/_zentara/ui", ...["landing", "profile", "store", "booking", "dashboard"].map((n) => `/_zentara/ui/examples/${n}`)]) {
                for (const extra of [[], ["--mobile"]]) {
                  const g = JSON.parse(view(page, ...extra, "--json").out);
                  check(g.mode === "browser" && g.ok === true, `zentara view ${page}${extra.length ? " --mobile" : ""} (${label}): tanpa temuan\n${g.ok ? "" : g.text}`);
                }
              }
            };
            gallery("tema bawaan");
            // Tema dari config: zentara theme menulis zentara.config.mjs, server dev memuat ulang, halaman memuat theme.css.
            const configFile = path.join(app, "zentara.config.mjs");
            const themed = sh(process.execPath, [cli, "theme", "--accent", "biru", "--radius", "lg", "--mode", "dark"], app);
            check(themed.includes("accent blue") && /\n {2}ui: \{ accent: "blue", radius: "lg", mode: "dark" \},/.test(fs.readFileSync(configFile, "utf8")), "zentara theme --accent biru: tema tersimpan di zentara.config.mjs");
            const themedLogin = async (want) => {
              for (let i = 0; i < 120; i++) {
                const body = await fetch(`http://127.0.0.1:${devPort}/login`).then((r) => r.text(), () => "");
                if (body.includes("<html") && body.includes("/_zentara/theme.css") === want) return body;
                await new Promise((r) => setTimeout(r, 500));
              }
              return "";
            };
            const withTheme = await themedLogin(true);
            check(/<html lang="\w+" data-zu-mode="dark">/.test(withTheme), "zentara dev: config baru dimuat ulang, halaman memakai tema (mode gelap)");
            const themeHref = withTheme.match(/href="(\/_zentara\/theme\.css\?v=\w+)"/)?.[1] ?? "";
            const themeCss = await (await fetch(`http://127.0.0.1:${devPort}${themeHref}`)).text();
            check(/--zu-accent:#[0-9a-f]{6}/.test(themeCss) && themeCss.includes("--zu-r-lg:22px"), "/_zentara/theme.css: warna aksen dan radius dari tema");
            gallery("accent blue, radius lg, mode dark");
            sh(process.execPath, [cli, "theme", "--reset"], app);
            check(!/^\s*ui:/m.test(fs.readFileSync(configFile, "utf8")) && (await themedLogin(false)) !== "", "zentara theme --reset: kembali ke tema bawaan");
          } finally {
            closeBrowser();
          }
        }
        const signin = await fetch(`http://127.0.0.1:${devPort}/api/auth/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "admin@zentara.test", password: "admin12345" }) });
        const cookie = signin.headers.getSetCookie()[0]?.split(";")[0] ?? "";
        const devDash = await (await fetch(`http://127.0.0.1:${devPort}/dashboard`, { headers: { cookie } })).text();
        check(devDash.includes('data-ui="on"'), "zentara dev: /dashboard (login) memuat widget chat");
        fs.rmSync(path.join(app, "src", "app", "routes", "rusak.ts"), { force: true });
      }
    } finally {
      stop();
    }
  }
  // ── Pemakaian sungguhan: CLI global + proyek, tool Zentara AI, dan alur interaktif ──────────────
  const apiApp = path.join(WORK, "app-api-id");
  if (fs.existsSync(apiApp)) {
    console.log("\n=== CLI global (npm install -g) ===");
    // Seperti `npm install -g zentara` di komputer developer: tanpa drizzle-orm milik proyek.
    const prefix = path.join(WORK, "global");
    sh(npm, ["install", "-g", "--prefix", prefix, zentara.tarball, "--no-audit", "--no-fund"], WORK);
    const globalPkg = isWindows ? path.join(prefix, "node_modules", "zentara") : path.join(prefix, "lib", "node_modules", "zentara");
    const globalCli = path.join(globalPkg, "dist", "cli.js");
    check(fs.existsSync(globalCli) && !fs.existsSync(path.join(globalPkg, "node_modules", "drizzle-orm")), "zentara global terpasang tanpa drizzle-orm");
    const global = (args) => sh(process.execPath, [globalCli, ...args], apiApp);

    // Tabel & route baru, lalu migrasi lewat CLI global (kasus "bookings").
    fs.appendFileSync(path.join(apiApp, "src", "app", "db", "schema.ts"), '\nexport const e2eTrips = sqliteTable("e2e_trips", { id: integer("id").primaryKey({ autoIncrement: true }), origin: text("origin").notNull() });\n');
    fs.writeFileSync(path.join(apiApp, "src", "app", "routes", "e2e-trips.ts"), 'import { db } from "../db/index.js";\nimport { e2eTrips } from "../db/schema.js";\nexport const GET = () => db.select().from(e2eTrips);\n');
    check(/\.sql/.test(global(["db:generate"])), "CLI global: db:generate memakai zentara proyek (drizzle-kit)");
    global(["db:migrate"]);
    check(global(["routes"]).includes("/e2e-trips"), "CLI global: routes membaca route & schema baru");
    check(global(["jobs"]).includes("welcome-email"), "CLI global: jobs");

    console.log("\n=== Tool Zentara AI (dari instalasi global) ===");
    const tools = await import(pathToFileURL(path.join(globalPkg, "dist", "ai", "tools.js")).href);
    const { Journal } = await import(pathToFileURL(path.join(globalPkg, "dist", "ai", "journal.js")).href);
    const { ApprovalPolicy } = await import(pathToFileURL(path.join(globalPkg, "dist", "ai", "approval.js")).href);
    const ctx = { root: apiApp, approval: new ApprovalPolicy("auto", async () => "yes"), journal: new Journal(apiApp, "e2e"), dryRun: false, runScript: async () => ({ ok: true, output: "" }), runDb: tools.createDbRunner(apiApp) };
    const tool = (name, input) => tools.agentTools.find((t) => t.spec.name === name).run(input, ctx);
    // Proses yang sama tetap membaca schema terbaru (tanpa cache modul lama).
    fs.appendFileSync(path.join(apiApp, "src", "app", "db", "schema.ts"), '\nexport const e2eStops = sqliteTable("e2e_stops", { id: integer("id").primaryKey({ autoIncrement: true }) });\n');
    fs.writeFileSync(path.join(apiApp, "src", "app", "routes", "e2e-stops.ts"), 'import { e2eStops } from "../db/schema.js";\nexport const GET = () => ({ table: String(Boolean(e2eStops)) });\n');
    check((await tool("list_routes", {})).includes("/e2e-stops"), "AI list_routes: route & export schema baru langsung terbaca");
    check(/^(BERHASIL|OK): db:generate/.test(await tool("database", { action: "generate" })), "AI database generate lewat zentara proyek");
    check(/^(BERHASIL|OK): db:migrate/.test(await tool("database", { action: "migrate" })), "AI database migrate lewat zentara proyek");
    check(/welcome-email/.test(await tool("zentara", { command: "jobs" })), "AI tool zentara: jobs");

    console.log("\n=== Alur interaktif: pertama kali dibuka & buat proyek ===");
    const home = path.join(WORK, "zentara-home");
    const outside = path.join(WORK, "belum-ada-proyek");
    fs.mkdirSync(outside, { recursive: true });
    const saved = { home: process.env.ZENTARA_HOME, pkg: process.env.ZENTARA_CREATE_PACKAGE, args: process.env.ZENTARA_CREATE_ARGS, lang: process.env.ZENTARA_LANG };
    Object.assign(process.env, { ZENTARA_HOME: home, ZENTARA_CREATE_PACKAGE: create.tarball, ZENTARA_CREATE_ARGS: `--zentara-spec file:${zentara.tarball}` });
    delete process.env.ZENTARA_LANG;
    try {
      const { createReplHost } = await import(pathToFileURL(path.join(globalPkg, "dist", "repl", "host.js")).href);
      const { resolveAiConfig } = await import(pathToFileURL(path.join(globalPkg, "dist", "ai", "config.js")).href);
      const asked = [];
      const answers = [["Bahasa / Language", "en"], ["start", "create"], ["language", "en"], ["template", "api"]];
      const noop = () => {};
      const ui = {
        thinking: noop, delta: noop, assistant: noop, toolStart: noop, toolEnd: noop, notice: noop, busy: noop, changed: noop,
        approve: async () => "yes",
        choose: async (question, choices, cancel) => {
          asked.push(question);
          const hit = answers.find(([key]) => question.toLowerCase().includes(key.toLowerCase()));
          return hit ? choices.find((c) => c.value === hit[1])?.value ?? cancel : cancel;
        },
        ask: async (question) => (asked.push(question), "My E2E App"),
        // Membuka Zentara di proyek baru (proses interaktif) dilewati di e2e.
        suspend: async () => 0,
      };
      const host = await createReplHost({
        cwd: outside, version: "e2e", loadConfig: async () => resolveAiConfig({}), serverEnv: process.env,
        fallbackDev: { command: process.execPath, args: [globalCli, "dev"] }, appPort: 4999, offerDevServer: false,
        runSetup: async () => 0, askLanguage: true,
      }, ui);
      const code = await host.startup();
      await host.close();
      check(asked[0] === "Bahasa / Language", "pertama kali dibuka: bahasa ditanyakan lebih dulu");
      check(JSON.parse(fs.readFileSync(path.join(home, "settings.json"), "utf8")).locale === "en", "pilihan bahasa disimpan ke settings.json");
      const created = path.join(outside, "my-e2e-app");
      check(code === 0 && fs.existsSync(path.join(created, "src", "app")) && fs.existsSync(path.join(created, "node_modules", "zentara")), "buat proyek dari CLI: folder aman (my-e2e-app), dependency terpasang");
      check(fs.readFileSync(path.join(created, "README.md"), "utf8").includes("Start from a blank canvas"), "buat proyek dari CLI: bahasa aplikasi en");
    } finally {
      for (const [key, value] of [["ZENTARA_HOME", saved.home], ["ZENTARA_CREATE_PACKAGE", saved.pkg], ["ZENTARA_CREATE_ARGS", saved.args], ["ZENTARA_LANG", saved.lang]]) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }

  console.log(`\nSemua uji e2e lulus. (folder kerja: ${WORK})`);
  fs.rmSync(WORK, { recursive: true, force: true });
} catch (err) {
  console.error(`\n${err.message}\nFolder kerja disimpan untuk diperiksa: ${WORK}`);
  process.exitCode = 1;
}
