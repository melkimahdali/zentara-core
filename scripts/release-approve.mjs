// Setujui rilis terbaru langsung dari CLI, tanpa bergantung pada `npm stage list`
// (daftar dari server npm bisa tertinggal):
//
//   npm run release:approve              menyetujui versi yang dititipkan oleh run Release terakhir
//   npm run release:approve -- --dry-run tampilkan saja apa yang akan disetujui
//
// ID stage diambil dari run workflow Release terakhir yang berhasil (anotasi publik, atau log
// untuk run lama), versi yang sudah tayang dilewati, lalu `npm stage approve <id>` dijalankan
// (npm meminta kode 2FA Anda).
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = process.env.ZUSANTARA_REPO ?? "melkimahdali/zusantara-core";
const API = "https://api.github.com";
const REGISTRY = "https://registry.npmjs.org";
const isWindows = process.platform === "win32";

/** Ambil pasangan paket/versi/ID dari anotasi `pkg@versi stage-id=<id>` atau baris log `+ pkg@versi (staged with id <id>)`. */
export function parseStagedIds(text) {
  const found = new Map();
  const patterns = [
    /([@\w./-]+)@(\d+\.\d+\.\d+(?:-[\w.]+)?) stage-id=([0-9a-f-]{36})/g,
    /\+ ([@\w./-]+)@(\d+\.\d+\.\d+(?:-[\w.]+)?) \(staged with id ([0-9a-f-]{36})\)/g,
  ];
  for (const re of patterns) {
    for (const m of text.matchAll(re)) found.set(`${m[1]}@${m[2]}`, { name: m[1], version: m[2], id: m[3] });
  }
  return [...found.values()];
}

/** true bila npm >= 11.16 (versi pertama yang punya `npm stage`). */
export function supportsStage(version) {
  const [major, minor] = version.split(".").map(Number);
  return major > 11 || (major === 11 && minor >= 16);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "zusantara-release-approve" } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

async function publishedVersions(name) {
  const res = await fetch(`${REGISTRY}/${name}`, { headers: { "Cache-Control": "no-cache" } });
  if (res.status === 404) return new Set();
  const data = await res.json();
  return new Set(Object.keys(data.versions ?? {}));
}

async function findStaged() {
  const runs = await getJson(`${API}/repos/${REPO}/actions/workflows/release.yml/runs?status=success&per_page=1`);
  const run = runs.workflow_runs?.[0];
  if (!run) throw new Error("Belum ada run workflow Release yang berhasil.");
  const jobs = await getJson(`${API}/repos/${REPO}/actions/runs/${run.id}/jobs`);
  const job = jobs.jobs?.find((j) => j.name === "publish") ?? jobs.jobs?.[0];
  if (!job) throw new Error(`Run ${run.id} tidak punya job.`);
  console.log(`Run Release terakhir: #${run.run_number} (${run.head_sha.slice(0, 7)}, ${run.created_at})\n  ${run.html_url}`);

  const annotations = await getJson(`${API}/repos/${REPO}/check-runs/${job.id}/annotations`);
  let staged = parseStagedIds(annotations.map((a) => a.message).join("\n"));
  if (staged.length === 0) {
    // Run lama belum menulis ID di anotasi: baca dari log job. GitHub hanya memberikan log kepada
    // pengguna yang login, jadi pakai GITHUB_TOKEN bila ada.
    const headers = { "User-Agent": "zusantara-release-approve" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    let res;
    try {
      res = await fetch(`${API}/repos/${REPO}/actions/jobs/${job.id}/logs`, { headers });
    } catch (err) {
      throw new Error(`Gagal membaca log run Release (${err.message}). ${manualHint(job)}`);
    }
    if (!res.ok) {
      const why = res.status === 401 || res.status === 403 || res.status === 404 ? "GitHub hanya memberikan log kepada pengguna yang login" : `HTTP ${res.status}`;
      throw new Error(`ID stage tidak ada di anotasi run ini dan log-nya tidak bisa dibaca (${why}). ${manualHint(job)}`);
    }
    staged = parseStagedIds(await res.text());
  }
  return staged;
}

function manualHint(job) {
  return `Buka ${job.html_url}, cari baris "staged with id <id>", lalu jalankan: npm stage approve <id>. (Atau set GITHUB_TOKEN lalu ulangi.)`;
}

function run(cmd, args) {
  // npm di Windows adalah npm.cmd: jalankan lewat shell dengan argumen dikutip (ID stage aman dari karakter khusus).
  return isWindows
    ? spawnSync([cmd, ...args].join(" "), { stdio: "inherit", shell: true })
    : spawnSync(cmd, args, { stdio: "inherit" });
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const npmVersion = spawnSync(isWindows ? "npm --version" : "npm", isWindows ? [] : ["--version"], { encoding: "utf8", shell: isWindows }).stdout?.trim() ?? "";
  if (!dryRun && !supportsStage(npmVersion)) {
    console.error(`npm ${npmVersion || "?"} belum punya perintah "npm stage". Jalankan: npm install -g npm@11`);
    return 1;
  }

  const staged = await findStaged();
  if (staged.length === 0) {
    console.log("Tidak ada ID stage di run terakhir. Mungkin semua versi sudah tayang, atau workflow Release belum dijalankan.");
    return 0;
  }

  let failed = 0;
  for (const s of staged) {
    const label = `${s.name}@${s.version}`;
    if ((await publishedVersions(s.name)).has(s.version)) {
      console.log(`✓ ${label} sudah tayang, dilewati`);
      continue;
    }
    console.log(`\n→ Menyetujui ${label} (stage ${s.id})`);
    if (dryRun) {
      console.log(`  [dry-run] npm stage approve ${s.id}`);
      continue;
    }
    const result = run("npm", ["stage", "approve", s.id]);
    if (result.status !== 0) {
      failed++;
      console.error(`✗ Gagal menyetujui ${label}`);
    }
  }

  if (!dryRun && failed === 0) {
    console.log("\nMengecek registry npm...");
    for (const s of staged) {
      let live = false;
      for (let i = 0; i < 20 && !live; i++) {
        live = (await publishedVersions(s.name)).has(s.version);
        if (!live) await new Promise((r) => setTimeout(r, 3000));
      }
      console.log(live ? `✓ ${s.name}@${s.version} tayang: https://www.npmjs.com/package/${s.name}` : `… ${s.name}@${s.version} belum terlihat, cek lagi beberapa menit lagi`);
    }
  }
  return failed ? 1 : 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().then(
    (code) => (process.exitCode = code),
    (err) => {
      console.error(err.message);
      process.exitCode = 1;
    },
  );
}
