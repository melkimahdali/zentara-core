import type { TaskLogEntry } from "../../ai/task-log.js";
export const cli = {
  dbDepsMissing: "drizzle-orm belum terpasang untuk proyek ini. Jalankan `npm install` di folder proyek (template api sudah memuat drizzle-orm dan drizzle-kit), atau `npm install drizzle-orm drizzle-kit`.",
  help: `Zentara Core CLI

Menjalankan aplikasi:
  zentara dev [--no-ai]                            Server pengembangan dengan auto-reload (src/app),
                                                   halaman error lengkap & chat Zentara AI di browser
  zentara build                                    Kompilasi TypeScript ke dist/
  zentara start                                    Jalankan hasil build (produksi, dist/app)

Bicara dengan AI (bahasa sehari-hari):
  zentara                                          CLI interaktif: chat dengan AI, server dev di latar
                                                   belakang (ditanya dulu; --no-dev untuk melewati)
  zentara --continue                               Lanjutkan percakapan terakhir (atau /resume di dalam CLI)
  zentara --classic                                CLI interaktif klasik (tanpa tampilan Ink)
  zentara "buatkan halaman portofolio dengan daftar proyek"
  zentara ai "<perintah>" [--auto] [--dry-run] [--report <file>]
  zentara ai:status                                Cek provider AI yang tersedia
  zentara ai:setup [provider]                      Atur provider AI (Claude, OpenAI, Gemini, Groq, DeepSeek,
                                                   OpenRouter, OmniRoute, Ollama): API key, model, tes koneksi
  zentara undo [--yes]                             Batalkan perubahan AI terakhir

  --auto      Perubahan biasa langsung dikerjakan; hanya aksi krusial yang ditanyakan
  --dry-run   Tampilkan apa yang akan dilakukan tanpa mengubah file
  --report <file>  Tulis hasil tugas AI (status, langkah, token, tool) sebagai JSON; default .zentara/ai-report.json

Perintah manual:
  zentara routes [--json]                          Tampilkan semua route
  zentara jobs [--json]                            Tampilkan job dan jadwal (src/app/jobs)
  zentara jobs:run <nama> [--data <json>]          Jalankan satu job sekarang
  zentara db:generate [--name <nama>]              Buat file migrasi dari perubahan schema
  zentara db:migrate                               Terapkan migrasi ke database
  zentara db:seed                                  Isi data awal (app/db/seed.ts)
  zentara make:route <path> [--methods GET,POST]   Buat file route baru, mis. api/events/[id]
  zentara make:middleware <nama>                   Buat file middleware baru
  zentara make:job <nama> [--schedule "<cron>"]    Buat file job baru, mis. kirim-laporan
  zentara view <path> [--mobile|--tablet] [--dark] [--lang en] [--screenshot] [--text "a,b"]
                                                   Lihat halaman, periksa tampilan, dan beri skor (browser bila ada tab)
  zentara requests [id] [--path /produk] [--json]  Request terakhir di server dev: waktu, query, N+1, session, log
  zentara ai:log [--limit 20] [--json]            Hasil tugas Zentara AI terakhir (journal lokal)
  zentara ui [Nama] [--group form] [--json]        Katalog komponen kit UI: kegunaan, props, dan contoh
  zentara ui --example [nama]                      Contoh halaman utuh (landing, profil, toko, booking, dasbor)
  zentara theme [--accent biru] [--radius lg] [--font system] [--mode dark] [--reset]
                                                   Lihat atau ubah tema kit UI (zentara.config.mjs)
  zentara lang [id|en]                             Lihat atau ganti bahasa Zentara (disimpan global)
  zentara help                                     Tampilkan bantuan ini
  zentara --version

Opsi:
  --force        Timpa file yang sudah ada
  --dir <path>   Folder aplikasi (default: src/app)
`,
  viewUsage: "Pakai: zentara view <path> [--mobile|--tablet] [--dark|--light] [--lang id|en] [--screenshot] [--min-score 80] [--url http://localhost:3000] [--text \"teks1,teks2\"] [--json]",
  requestsUnavailable: "Jejak request hanya ada saat aplikasi berjalan dengan `npx zentara dev` (tidak ditemukan .zentara/devtools.json).",
  aiLogEmpty: "Belum ada tugas Zentara AI yang tercatat di proyek ini (.zentara/ai-tasks.jsonl).",
  aiLogLine: (e: TaskLogEntry) =>
    `${e.at.slice(0, 16).replace("T", " ")}  ${e.ok ? "✓" : "✗"} ${e.status.padEnd(19)} ${String(e.steps).padStart(2)} langkah` +
    `${e.checks.typecheck === undefined ? "" : ` · typecheck ${e.checks.typecheck ? "✓" : "✗"}`}${e.checks.test === undefined ? "" : ` · test ${e.checks.test ? "✓" : "✗"}`}` +
    `${e.checks.views.length ? ` · view_page ${e.checks.views.filter((v) => v.ok).length}/${e.checks.views.length}` : ""}${e.dryRun ? " · dry-run" : ""}  ${e.task}`,
  aiLogSummary: (n: number, ok: number) => `${n} tugas, ${ok} selesai (${Math.round((ok / n) * 100)}%). Data ini hanya ada di komputer Anda.`,
  viewFailed: (base: string, reason: string) => `Tidak bisa membuka halaman dari ${base || "server"}: ${reason}. Pastikan server berjalan (npx zentara dev).`,
  fileExists: (file: string) => `File sudah ada: ${file} (pakai --force untuk menimpa)`,
  created: (file: string) => `Dibuat: ${file}`,
  makeRouteUsage: "Pemakaian: zentara make:route <path> [--methods GET,POST]",
  invalidRoutePath: (raw: string) => `Path route tidak valid: ${raw}`,
  invalidMethods: (invalid: string, choices: string) => `Method tidak valid: ${invalid || "(kosong)"}. Pilihan: ${choices}`,
  makeMiddlewareUsage: "Pemakaian: zentara make:middleware <nama> (huruf, angka, - atau _)",
  middlewareTemplate: {
    before: "Sebelum handler: cek/ubah request, atau kembalikan respons untuk menghentikan rantai.",
    after: "Sesudah handler: mis. tambahkan header.",
  },
  registerMiddleware: (fn: string) => `Daftarkan di src/app/middleware.ts atau di \`export const middleware = [${fn}]\` pada file route.`,
  noRoutes: (dir: string) => `Belum ada route di ${dir}`,
  aiReport: (file: string) => `Laporan AI ditulis ke ${file}`,
  aiMode: (auto: boolean, dryRun: boolean) => `Zentara AI · mode: ${auto ? "otomatis (hanya aksi krusial ditanyakan)" : "minta persetujuan"}${dryRun ? " · dry-run" : ""}`,
  nonInteractive: "Terminal non-interaktif: aksi yang butuh persetujuan akan ditolak (pakai --auto untuk perubahan biasa).",
  aiNeedsTask: 'Tulis perintahnya, mis. zentara ai "buat endpoint /api/events"',
  chatMode: 'Mode obrolan. Ketik permintaan dalam bahasa biasa; "keluar" untuk selesai.',
  exitWords: ["keluar", "exit", "quit"],
  inkFailed: (reason: string) => `Tampilan Ink gagal dimuat (${reason}); memakai CLI klasik.`,
  approvalMode: (mode: string) => `Mode persetujuan: ${mode}`,
  providerOrder: "Urutan provider (yang pertama dicoba lebih dulu):",
  noProviderReady: "\nBelum ada provider yang siap. Jalankan: zentara ai:setup",
  setupRunServer: (url: string, model: string) => `jalankan servernya (${url}, ${model})`,
  setupFillKey: (key: string, model: string, def?: string) => `isi ${key} (model: ${model}${def ? `, default ${def}` : ""})`,
  setupGuide: (rows: string) => `Zentara AI memakai rantai provider: bila satu habis kredit/kuota atau mati, otomatis pindah ke berikutnya.

Cara termudah (di terminal interaktif):  npx zentara ai:setup   atau   npx zentara ai:setup openai

Atau isi langsung di .env. Provider dengan API key terisi otomatis dipakai:
${rows}

Urutan: ZENTARA_AI_ORDER=openai,claude,ollama (provider lain menyusul). Cek: npx zentara ai:status`,
  nothingToUndo: "Tidak ada perubahan AI yang bisa dibatalkan.",
  lastChange: (at: string, task: string) => `Perubahan terakhir (${at}): ${task}`,
  undoDelete: "hapus  ",
  undoRestore: "pulihkan",
  rerunWithYes: "Jalankan ulang dengan --yes untuk membatalkan.",
  confirmUndo: "Batalkan perubahan ini? [y/n] > ",
  yesWords: ["y", "ya", "yes"],
  undone: "✓ Perubahan dibatalkan.",
  noAppDir: "Folder src/app tidak ditemukan. Jalankan perintah ini di folder proyek Zentara.",
  devtoolsOff: (reason: string) => `Chat Zentara AI di browser tidak aktif: ${reason}`,
  noTypescript: "TypeScript belum dipasang di proyek ini. Jalankan: npm install -D typescript",
  buildDone: "✓ Build selesai. Jalankan dengan: zentara start",
  noDist: "dist/app tidak ditemukan. Jalankan dulu: zentara build",
  unknownCommand: (cmd: string) => `Perintah tidak dikenal: ${cmd}\n`,
  ui: {
    intro: (n: number) => `Kit UI zentara/ui: ${n} komponen dan fungsi. Semuanya dirender di server, mengikuti tema, dan berfungsi tanpa JavaScript.`,
    more: "Detail props dan contoh: zentara ui <Nama> (mis. zentara ui Select). Galeri hidup: /_zentara/ui saat zentara dev berjalan.",
    notFound: (name: string, similar: string[]) => `Komponen tidak ditemukan: ${name}.${similar.length ? ` Mungkin maksud Anda: ${similar.join(", ")}.` : ""} Lihat semua dengan: zentara ui`,
    badGroup: (group: string, groups: string) => `Kelompok tidak dikenal: ${group}. Pilihan: ${groups}`,
    examples: "Contoh halaman utuh (kode route lengkap yang hanya memakai komponen kit):",
    examplesMore: "Kode lengkap: zentara ui --example <nama>. Lihat hasilnya di /_zentara/ui/examples/<nama> saat zentara dev berjalan.",
    examplesHint: "Contoh halaman utuh (landing, profil, toko, booking, dasbor): zentara ui --example",
    exampleNotFound: (name: string, names: string) => `Contoh tidak ditemukan: ${name}. Pilihan: ${names}`,
    exampleOpen: (name: string) => `Lihat hasilnya di /_zentara/ui/examples/${name} saat zentara dev berjalan.`,
  },
  theme: {
    title: (file: string) => `Tema kit UI (${file})`,
    isDefault: "bawaan",
    colors: (list: string) => `Warna: ${list}, atau hex #rrggbb. Nama Indonesia juga bisa: biru, merah, hijau, ungu, oranye, kuning, emas, abu, toska.`,
    change: "Ubah:  zentara theme --accent biru --radius lg --font system --mode dark",
    reset: "Kembali ke bawaan: zentara theme --reset",
    gallery: "Lihat semua komponen dengan tema ini di /_zentara/ui saat zentara dev berjalan.",
    needValue: (flag: string) => `--${flag} butuh nilai, mis. --${flag} ${flag === "accent" ? "blue" : flag === "radius" ? "lg" : flag === "font" ? "system" : "dark"}`,
    saved: (file: string, summary: string) => `✓ Tema disimpan di ${file}: ${summary}`,
    resetDone: (file: string) => `✓ Tema kembali ke bawaan (ui dihapus dari ${file}).`,
    unchanged: "Tema tidak berubah.",
    reload: "Server dev memuat ulang config sendiri; muat ulang halaman di browser untuk melihatnya.",
    manual: (file: string, ui: string) => `${file} memakai bentuk ui yang tidak bisa diubah otomatis. Ubah sendiri menjadi:\n  ui: ${ui},`,
    noExport: (file: string, ui: string) => `Tidak menemukan \`export default {\` di ${file}. Tambahkan sendiri:\n  ui: ${ui},`,
  },
  lang: {
    current: (name: string, source: string) => `Bahasa Zentara: ${name} (${source})`,
    sourceEnv: "dari env ZENTARA_LANG",
    sourceConfig: "dari zentara.config.mjs",
    sourceSettings: "preferensi global",
    sourceDefault: "bawaan",
    howTo: "Ganti: zentara lang en  ·  zentara lang id  (atau env ZENTARA_LANG, atau `locale` di zentara.config.mjs)",
    saved: (name: string, file: string) => `✓ Bahasa diganti ke ${name}. Disimpan di ${file}`,
    invalid: (value: string) => `Bahasa tidak dikenal: ${value}. Pilihan: id, en`,
    overridden: (name: string) => `Catatan: bahasa proyek ini tetap ${name} (dari env atau zentara.config.mjs).`,
  },
};
