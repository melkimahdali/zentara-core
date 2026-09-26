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
  zentara ai "<perintah>" [--auto] [--dry-run]
  zentara ai:status                                Cek provider AI yang tersedia
  zentara ai:setup [provider]                      Atur provider AI (Claude, OpenAI, Gemini, Groq, DeepSeek,
                                                   OpenRouter, OmniRoute, Ollama): API key, model, tes koneksi
  zentara undo [--yes]                             Batalkan perubahan AI terakhir

  --auto      Perubahan biasa langsung dikerjakan; hanya aksi krusial yang ditanyakan
  --dry-run   Tampilkan apa yang akan dilakukan tanpa mengubah file

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
  zentara view <path> [--text "a,b"] [--json]     Lihat versi teks halaman dari server yang berjalan
  zentara lang [id|en]                             Lihat atau ganti bahasa Zentara (disimpan global)
  zentara help                                     Tampilkan bantuan ini
  zentara --version

Opsi:
  --force        Timpa file yang sudah ada
  --dir <path>   Folder aplikasi (default: src/app)
`,
  viewUsage: "Pakai: zentara view <path> [--url http://localhost:3000] [--text \"teks1,teks2\"] [--json]",
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
