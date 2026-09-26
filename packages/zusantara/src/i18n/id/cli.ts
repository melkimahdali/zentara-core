import type { TaskLogEntry } from "../../ai/task-log.js";
export const cli = {
  dbDepsMissing: "drizzle-orm belum terpasang untuk proyek ini. Jalankan `npm install` di folder proyek (template api sudah memuat drizzle-orm dan drizzle-kit), atau `npm install drizzle-orm drizzle-kit`.",
  help: `Zusantara Core CLI

Menjalankan aplikasi:
  zusantara dev [--no-ai]                          Server pengembangan dengan auto-reload (src/app),
                                                   halaman error lengkap & chat Zusantara AI di browser
  zusantara build                                  Kompilasi TypeScript ke dist/
  zusantara start                                  Jalankan hasil build (produksi, dist/app)

Bicara dengan AI (bahasa sehari-hari):
  zusantara                                        CLI interaktif: chat dengan AI, server dev di latar
                                                   belakang (ditanya dulu; --no-dev untuk melewati)
  zusantara --continue                             Lanjutkan percakapan terakhir (atau /resume di dalam CLI)
  zusantara --classic                              CLI interaktif klasik (tanpa tampilan Ink)
  zusantara "buatkan halaman portofolio dengan daftar proyek"
  zusantara ai "<perintah>" [--auto] [--dry-run] [--report <file>]
  zusantara ai:status                              Cek provider AI yang tersedia
  zusantara ai:setup [provider]                    Atur provider AI (Claude, OpenAI, Gemini, Groq, DeepSeek,
                                                   OpenRouter, OmniRoute, Ollama): API key, model, tes koneksi
  zusantara undo [--yes]                           Batalkan perubahan AI terakhir

  --auto      Perubahan biasa langsung dikerjakan; hanya aksi krusial yang ditanyakan
  --dry-run   Tampilkan apa yang akan dilakukan tanpa mengubah file
  --report <file>  Tulis hasil tugas AI (status, langkah, token, tool) sebagai JSON; default .zusantara/ai-report.json

Perintah manual:
  zusantara routes [--json]                        Tampilkan semua route
  zusantara jobs [--json]                          Tampilkan job dan jadwal (src/app/jobs)
  zusantara jobs:run <nama> [--data <json>]        Jalankan satu job sekarang
  zusantara db:generate [--name <nama>]            Buat file migrasi dari perubahan schema
  zusantara db:migrate                             Terapkan migrasi ke database
  zusantara db:seed                                Isi data awal (app/db/seed.ts)
  zusantara make:route <path> [--methods GET,POST] Buat file route baru, mis. api/events/[id]
  zusantara make:middleware <nama>                 Buat file middleware baru
  zusantara make:job <nama> [--schedule "<cron>"]  Buat file job baru, mis. kirim-laporan
  zusantara view <path> [--mobile|--tablet] [--dark] [--lang en] [--screenshot] [--text "a,b"]
                                                   Lihat halaman, periksa tampilan, dan beri skor (browser bila ada tab)
  zusantara requests [id] [--path /produk] [--json] Request terakhir di server dev: waktu, query, N+1, session, log
  zusantara ai:log [--limit 20] [--json]           Hasil tugas Zusantara AI terakhir (journal lokal)
  zusantara ui [Nama] [--group form] [--json]      Katalog komponen kit UI: kegunaan, props, dan contoh
  zusantara ui --example [nama]                    Contoh halaman utuh (landing, profil, toko, booking, dasbor)
  zusantara theme [--accent biru] [--radius lg] [--font system] [--mode dark] [--reset]
                                                   Lihat atau ubah tema kit UI (zusantara.config.mjs)
  zusantara migrate:zusantara                      Pindahkan proyek Zentara lama ke nama Zusantara
  zusantara lang [id|en]                           Lihat atau ganti bahasa Zusantara (disimpan global)
  zusantara help                                   Tampilkan bantuan ini
  zusantara --version

Opsi:
  --force        Timpa file yang sudah ada
  --dir <path>   Folder aplikasi (default: src/app)
`,
  viewUsage: "Pakai: zusantara view <path> [--mobile|--tablet] [--dark|--light] [--lang id|en] [--screenshot] [--min-score 80] [--url http://localhost:3000] [--text \"teks1,teks2\"] [--json]",
  requestsUnavailable: "Jejak request hanya ada saat aplikasi berjalan dengan `npx zusantara dev` (tidak ditemukan .zusantara/devtools.json).",
  aiLogEmpty: "Belum ada tugas Zusantara AI yang tercatat di proyek ini (.zusantara/ai-tasks.jsonl).",
  aiLogLine: (e: TaskLogEntry) =>
    `${e.at.slice(0, 16).replace("T", " ")}  ${e.ok ? "✓" : "✗"} ${e.status.padEnd(19)} ${String(e.steps).padStart(2)} langkah` +
    `${e.checks.typecheck === undefined ? "" : ` · typecheck ${e.checks.typecheck ? "✓" : "✗"}`}${e.checks.test === undefined ? "" : ` · test ${e.checks.test ? "✓" : "✗"}`}` +
    `${e.checks.views.length ? ` · view_page ${e.checks.views.filter((v) => v.ok).length}/${e.checks.views.length}` : ""}${e.dryRun ? " · dry-run" : ""}  ${e.task}`,
  aiLogSummary: (n: number, ok: number) => `${n} tugas, ${ok} selesai (${Math.round((ok / n) * 100)}%). Data ini hanya ada di komputer Anda.`,
  viewFailed: (base: string, reason: string) => `Tidak bisa membuka halaman dari ${base || "server"}: ${reason}. Pastikan server berjalan (npx zusantara dev).`,
  fileExists: (file: string) => `File sudah ada: ${file} (pakai --force untuk menimpa)`,
  created: (file: string) => `Dibuat: ${file}`,
  makeRouteUsage: "Pemakaian: zusantara make:route <path> [--methods GET,POST]",
  invalidRoutePath: (raw: string) => `Path route tidak valid: ${raw}`,
  invalidMethods: (invalid: string, choices: string) => `Method tidak valid: ${invalid || "(kosong)"}. Pilihan: ${choices}`,
  makeMiddlewareUsage: "Pemakaian: zusantara make:middleware <nama> (huruf, angka, - atau _)",
  middlewareTemplate: {
    before: "Sebelum handler: cek/ubah request, atau kembalikan respons untuk menghentikan rantai.",
    after: "Sesudah handler: mis. tambahkan header.",
  },
  registerMiddleware: (fn: string) => `Daftarkan di src/app/middleware.ts atau di \`export const middleware = [${fn}]\` pada file route.`,
  noRoutes: (dir: string) => `Belum ada route di ${dir}`,
  aiReport: (file: string) => `Laporan AI ditulis ke ${file}`,
  aiMode: (auto: boolean, dryRun: boolean) => `Zusantara AI · mode: ${auto ? "otomatis (hanya aksi krusial ditanyakan)" : "minta persetujuan"}${dryRun ? " · dry-run" : ""}`,
  nonInteractive: "Terminal non-interaktif: aksi yang butuh persetujuan akan ditolak (pakai --auto untuk perubahan biasa).",
  aiNeedsTask: 'Tulis perintahnya, mis. zusantara ai "buat endpoint /api/events"',
  chatMode: 'Mode obrolan. Ketik permintaan dalam bahasa biasa; "keluar" untuk selesai.',
  exitWords: ["keluar", "exit", "quit"],
  inkFailed: (reason: string) => `Tampilan Ink gagal dimuat (${reason}); memakai CLI klasik.`,
  approvalMode: (mode: string) => `Mode persetujuan: ${mode}`,
  providerOrder: "Urutan provider (yang pertama dicoba lebih dulu):",
  noProviderReady: "\nBelum ada provider yang siap. Jalankan: zusantara ai:setup",
  setupRunServer: (url: string, model: string) => `jalankan servernya (${url}, ${model})`,
  setupFillKey: (key: string, model: string, def?: string) => `isi ${key} (model: ${model}${def ? `, default ${def}` : ""})`,
  setupGuide: (rows: string) => `Zusantara AI memakai rantai provider: bila satu habis kredit/kuota atau mati, otomatis pindah ke berikutnya.

Cara termudah (di terminal interaktif):  npx zusantara ai:setup   atau   npx zusantara ai:setup openai

Atau isi langsung di .env. Provider dengan API key terisi otomatis dipakai:
${rows}

Urutan: ZUSANTARA_AI_ORDER=openai,claude,ollama (provider lain menyusul). Cek: npx zusantara ai:status`,
  nothingToUndo: "Tidak ada perubahan AI yang bisa dibatalkan.",
  lastChange: (at: string, task: string) => `Perubahan terakhir (${at}): ${task}`,
  undoDelete: "hapus  ",
  undoRestore: "pulihkan",
  rerunWithYes: "Jalankan ulang dengan --yes untuk membatalkan.",
  confirmUndo: "Batalkan perubahan ini? [y/n] > ",
  yesWords: ["y", "ya", "yes"],
  undone: "✓ Perubahan dibatalkan.",
  noAppDir: "Folder src/app tidak ditemukan. Jalankan perintah ini di folder proyek Zusantara.",
  migrateName: {
    nothing: "Tidak ada yang perlu diubah: proyek ini sudah memakai nama Zusantara.",
    done: (n: number) => `✓ ${n} perubahan. Jalankan \`npm install\` untuk memasang paket zusantara, lalu \`npm run dev\`.`,
  },
  legacyMoved: (what: string) => `Zentara kini bernama Zusantara: data lokal dipindah (${what}).`,
  devtoolsOff: (reason: string) => `Chat Zusantara AI di browser tidak aktif: ${reason}`,
  noTypescript: "TypeScript belum dipasang di proyek ini. Jalankan: npm install -D typescript",
  buildDone: "✓ Build selesai. Jalankan dengan: zusantara start",
  noDist: "dist/app tidak ditemukan. Jalankan dulu: zusantara build",
  unknownCommand: (cmd: string) => `Perintah tidak dikenal: ${cmd}\n`,
  ui: {
    intro: (n: number) => `Kit UI zusantara/ui: ${n} komponen dan fungsi. Semuanya dirender di server, mengikuti tema, dan berfungsi tanpa JavaScript.`,
    more: "Detail props dan contoh: zusantara ui <Nama> (mis. zusantara ui Select). Galeri hidup: /_zusantara/ui saat zusantara dev berjalan.",
    notFound: (name: string, similar: string[]) => `Komponen tidak ditemukan: ${name}.${similar.length ? ` Mungkin maksud Anda: ${similar.join(", ")}.` : ""} Lihat semua dengan: zusantara ui`,
    badGroup: (group: string, groups: string) => `Kelompok tidak dikenal: ${group}. Pilihan: ${groups}`,
    examples: "Contoh halaman utuh (kode route lengkap yang hanya memakai komponen kit):",
    examplesMore: "Kode lengkap: zusantara ui --example <nama>. Lihat hasilnya di /_zusantara/ui/examples/<nama> saat zusantara dev berjalan.",
    examplesHint: "Contoh halaman utuh (landing, profil, toko, booking, dasbor): zusantara ui --example",
    exampleNotFound: (name: string, names: string) => `Contoh tidak ditemukan: ${name}. Pilihan: ${names}`,
    exampleOpen: (name: string) => `Lihat hasilnya di /_zusantara/ui/examples/${name} saat zusantara dev berjalan.`,
  },
  theme: {
    title: (file: string) => `Tema kit UI (${file})`,
    isDefault: "bawaan",
    colors: (list: string) => `Warna: ${list}, atau hex #rrggbb. Nama Indonesia juga bisa: biru, merah, hijau, ungu, oranye, kuning, emas, abu, toska.`,
    change: "Ubah:  zusantara theme --accent biru --radius lg --font system --mode dark",
    reset: "Kembali ke bawaan: zusantara theme --reset",
    gallery: "Lihat semua komponen dengan tema ini di /_zusantara/ui saat zusantara dev berjalan.",
    needValue: (flag: string) => `--${flag} butuh nilai, mis. --${flag} ${flag === "accent" ? "blue" : flag === "radius" ? "lg" : flag === "font" ? "system" : "dark"}`,
    saved: (file: string, summary: string) => `✓ Tema disimpan di ${file}: ${summary}`,
    resetDone: (file: string) => `✓ Tema kembali ke bawaan (ui dihapus dari ${file}).`,
    unchanged: "Tema tidak berubah.",
    reload: "Server dev memuat ulang config sendiri; muat ulang halaman di browser untuk melihatnya.",
    manual: (file: string, ui: string) => `${file} memakai bentuk ui yang tidak bisa diubah otomatis. Ubah sendiri menjadi:\n  ui: ${ui},`,
    noExport: (file: string, ui: string) => `Tidak menemukan \`export default {\` di ${file}. Tambahkan sendiri:\n  ui: ${ui},`,
  },
  lang: {
    current: (name: string, source: string) => `Bahasa Zusantara: ${name} (${source})`,
    sourceEnv: "dari env ZUSANTARA_LANG",
    sourceConfig: "dari zusantara.config.mjs",
    sourceSettings: "preferensi global",
    sourceDefault: "bawaan",
    howTo: "Ganti: zusantara lang en  ·  zusantara lang id  (atau env ZUSANTARA_LANG, atau `locale` di zusantara.config.mjs)",
    saved: (name: string, file: string) => `✓ Bahasa diganti ke ${name}. Disimpan di ${file}`,
    invalid: (value: string) => `Bahasa tidak dikenal: ${value}. Pilihan: id, en`,
    overridden: (name: string) => `Catatan: bahasa proyek ini tetap ${name} (dari env atau zusantara.config.mjs).`,
  },
};
