import fs from "node:fs";
import path from "node:path";
import type readline from "node:readline/promises";
import { createProviders, type ProviderConfig } from "./config.js";
import { findPreset, PRESETS, presetBaseUrl, type ProviderPreset } from "./presets.js";
import { BackgroundProcess, isServerUp, waitForUrl } from "../dev/server.js";
import { installOmniRoute, nodeSupportsOmniRoute, OMNIROUTE, OMNIROUTE_TIPS, omnirouteEnv, omnirouteInstalled } from "./omniroute.js";
import { OpenAICompatibleProvider, type ModelInfo } from "./providers/openai-compatible.js";
import { c, type Output } from "./terminal.js";
import { ProviderUnavailableError } from "./types.js";

/** Model yang jelas bukan untuk chat/coding (embedding, gambar, audio, dll.) disembunyikan dari saran. */
const NON_CHAT_MODEL = /embed|whisper|tts|dall-e|image|audio|moderation|transcri|realtime|search|davinci|babbage|guard|vision-preview|instruct|codex|computer-use|sora|rerank/i;

function formatEnvValue(value: string): string {
  return /^[\w@%+=:,./-]*$/.test(value) ? value : `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Tulis/perbarui variabel di file .env tanpa menyentuh baris lain.
 * Nilai `undefined` dilewati. File dibuat dengan izin 0600 bila belum ada.
 */
export function upsertEnvFile(file: string, values: Record<string, string | undefined>): void {
  const lines = fs.existsSync(file) ? fs.readFileSync(file, "utf8").split(/\r?\n/) : [];
  if (lines.length && lines.at(-1) === "") lines.pop();
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) continue;
    const line = `${key}=${formatEnvValue(value)}`;
    const index = lines.findIndex((l) => new RegExp(`^\\s*${key}\\s*=`).test(l));
    if (index === -1) lines.push(line);
    else lines[index] = line;
  }
  fs.writeFileSync(file, lines.join("\n") + "\n", { mode: 0o600 });
  // File yang sudah ada tidak berubah izinnya lewat writeFileSync; .env berisi rahasia, jadi batasi ke pemilik.
  try {
    fs.chmodSync(file, 0o600);
  } catch {
    // Windows / sistem file tanpa izin POSIX
  }
}

/** true bila .gitignore proyek mengabaikan file .env. */
export function isEnvIgnored(root: string): boolean {
  const file = path.join(root, ".gitignore");
  if (!fs.existsSync(file)) return false;
  return fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .some((l) => ["/.env", ".env", ".env*", ".env.*", "*.env"].includes(l.trim()));
}

/** Saran model: model chat dari server, model bawaan di urutan pertama. */
/**
 * Model yang disarankan: hanya model chat, yang terbaru di depan (menurut `created` bila server
 * melaporkannya, selain itu urutan nama menurun agar versi lebih baru muncul dulu), model pilihan paling depan.
 */
export function suggestModels(models: readonly (string | ModelInfo)[], preferred?: string, limit = 12): string[] {
  const infos = models.map((m) => (typeof m === "string" ? { id: m } : m)).filter((m) => !NON_CHAT_MODEL.test(m.id));
  infos.sort((a, b) => (b.created ?? 0) - (a.created ?? 0) || b.id.localeCompare(a.id, undefined, { numeric: true }));
  const chat = infos.map((m) => m.id);
  const ordered = preferred && chat.includes(preferred) ? [preferred, ...chat.filter((m) => m !== preferred)] : chat;
  return ordered.slice(0, limit);
}

/**
 * Pertanyaan yang jawabannya tidak ditampilkan di layar (untuk API key).
 * Selama jawaban diketik, semua tulisan ke output diredam kecuali baris baru.
 */
export async function askSecret(rl: readline.Interface, question: string, output: NodeJS.WriteStream = process.stdout): Promise<string> {
  const answer = rl.question(question); // prompt sudah tertulis sebelum output diredam
  const original = output.write;
  output.write = ((chunk: unknown, ...rest: unknown[]) => {
    const text = typeof chunk === "string" ? chunk : Buffer.isBuffer(chunk) ? chunk.toString() : "";
    const callback = rest.find((r) => typeof r === "function") as (() => void) | undefined;
    if (/[\r\n]/.test(text)) return (original as (s: string, cb?: () => void) => boolean).call(output, "\n", callback);
    callback?.();
    return true;
  }) as typeof output.write;
  try {
    return (await answer).trim();
  } finally {
    output.write = original;
  }
}

export interface SetupOptions {
  root: string;
  rl: readline.Interface;
  io: Output;
  env?: NodeJS.ProcessEnv;
  /** Nama preset yang dipilih langsung (mis. dari `zentara ai:setup openai`). */
  preset?: string;
  /** Provider yang ditulis manual di zentara.config.mjs (bila ada, env tidak dipakai). */
  configProviders?: ProviderConfig[];
}

/** Wizard interaktif: pilih provider, isi API key & model, tes koneksi, simpan ke .env. */
export async function interactiveSetup(options: SetupOptions): Promise<number> {
  const { root, rl, io } = options;
  const env = options.env ?? process.env;
  const envFile = path.join(root, ".env");

  let preset: ProviderPreset | undefined = options.preset ? findPreset(options.preset) : undefined;
  if (options.preset && !preset) {
    io.err(`Provider tidak dikenal: ${options.preset}. Pilihan: ${PRESETS.map((p) => p.name).join(", ")}`);
    return 1;
  }
  if (!preset) {
    io.out(c.bold("Pilih provider AI:"));
    PRESETS.forEach((p, i) => {
      const configured = p.keyEnv && !p.local ? (env[p.keyEnv] ? c.green(" ✓ sudah diatur") : "") : c.dim(" (lokal)");
      io.out(`  ${String(i + 1).padStart(2)}. ${p.label}${configured}`);
    });
    const answer = (await rl.question(`Nomor ${c.dim("(Enter = 1, OmniRoute gratis)")}: `)).trim() || "1";
    preset = PRESETS[Number(answer) - 1] ?? findPreset(answer.toLowerCase());
    if (!preset) {
      io.err("Pilihan tidak valid.");
      return 1;
    }
  }

  io.out(`\n${c.bold(preset.label)}${preset.signupUrl ? c.dim(`  ·  ${preset.signupUrl}`) : ""}`);
  const updates: Record<string, string | undefined> = {};

  // 1. API key (disembunyikan) atau alamat server lokal
  let apiKey = preset.keyEnv ? env[preset.keyEnv] : undefined;
  if (preset.local) {
    const current = presetBaseUrl(preset, env)!;
    const url = (await rl.question(`Alamat server ${c.dim(`(${current})`)}: `)).trim() || current;
    if (!/^https?:\/\//.test(url)) {
      io.err("Alamat harus diawali http:// atau https://");
      return 1;
    }
    if (url !== preset.baseUrl || env[preset.urlEnv!]) updates[preset.urlEnv!] = url;
    if (preset.keyEnv) {
      const hint = apiKey ? "Enter = pakai yang sudah ada" : "opsional, Enter = lewati";
      const typed = await askSecret(rl, `API key ${c.dim(`(${hint})`)}: `);
      if (typed) {
        apiKey = typed;
        updates[preset.keyEnv] = typed;
      }
    }
  } else if (preset.keyEnv) {
    const hint = apiKey ? c.dim(" (Enter = pakai yang sudah ada)") : "";
    const typed = await askSecret(rl, `API key${hint}: `);
    if (typed) apiKey = typed;
    if (!apiKey) {
      io.err("API key wajib diisi.");
      return 1;
    }
    if (typed) updates[preset.keyEnv] = typed;
  }

  // 2. Ambil daftar model dari akun (sekaligus menguji API key/koneksi)
  const baseUrl = presetBaseUrl(preset, { ...env, ...updates });
  let modelInfo: ModelInfo[] = [];
  const chosen: ProviderPreset = preset;
  let tempServer: BackgroundProcess | undefined;
  if (preset.name === "omniroute" && baseUrl && /^https?:\/\/(localhost|127\.0\.0\.1)[:/]/.test(baseUrl) && !(await isServerUp(`${baseUrl.replace(/\/+$/, "")}/models`))) {
    // OmniRoute (default, gratis): pasang & nyalakan langsung dari sini bila belum ada.
    const ready = await prepareOmniRoute(rl, io, `${baseUrl.replace(/\/+$/, "")}/models`);
    if (ready === false) return 1;
    tempServer = ready === true ? undefined : ready;
  }
  try {
    return await finishSetup();
  } finally {
    if (tempServer?.running) {
      await tempServer.stop();
      io.out(c.dim("OmniRoute sementara dihentikan. `npx zentara` akan menawarkan menjalankannya di latar belakang setiap kali dibuka."));
    }
  }

  async function finishSetup(): Promise<number> {
    const preset = chosen;
    if (preset.type === "openai-compatible") {
      io.out(c.dim("Mengecek koneksi & daftar model..."));
      try {
        modelInfo = await new OpenAICompatibleProvider({ name: preset.name, baseUrl: baseUrl!, apiKey }).listModelInfo();
      } catch (err) {
        const reason = err instanceof ProviderUnavailableError ? err.reason : (err as Error).message;
        if (preset.local && !apiKey && /\(401\)/.test(reason)) {
          // Server berjalan, tapi daftar model butuh API key (OmniRoute): lanjut dengan model bawaan.
          io.out(c.dim(`Server berjalan; daftar model butuh API key, jadi dipakai model "${env[preset.modelEnv] || preset.defaultModel || "auto"}".`));
        } else {
          io.err(c.red(`✗ Gagal terhubung ke ${preset.label}: ${reason}`));
          if (preset.local) {
            io.err(`Pastikan ${preset.label} sudah berjalan.`);
            if (preset.install) io.err(`Belum terpasang? ${c.cyan(preset.install)}  ${c.dim(`(${preset.signupUrl})`)}`);
            else io.err(c.dim(preset.signupUrl ?? ""));
          }
          return 1;
        }
      }
    }

    // 3. Pilih model
    const models = modelInfo.map((m) => m.id);
    const currentModel = env[preset.modelEnv] || preset.defaultModel || suggestModels(modelInfo)[0] || models[0];
    const suggestions = suggestModels(modelInfo, currentModel);
    if (suggestions.length) io.out(`Model tersedia: ${suggestions.join(", ")}${models.length > suggestions.length ? ", ..." : ""}`);
    const model = (await rl.question(`Model ${currentModel ? c.dim(`(${currentModel})`) : ""}: `)).trim() || currentModel;
    if (!model) {
      io.err("Model wajib diisi.");
      return 1;
    }
    if (models.length && !models.includes(model)) {
      io.out(c.yellow(`⚠ Model "${model}" tidak ada di daftar model akun ini.`));
      const go = (await rl.question("Tetap simpan? (y/N): ")).trim().toLowerCase();
      if (!go.startsWith("y")) return 1;
    }
    updates[preset.modelEnv] = model;

    // 4. Uji koneksi akhir dengan model terpilih
    const [provider] = createProviders([
      preset.type === "anthropic"
        ? { type: "anthropic", name: preset.name, apiKey, model }
        : { type: "openai-compatible", name: preset.name, baseUrl: baseUrl!, apiKey, model, tokenParam: preset.tokenParam },
    ]);
    try {
      io.out(c.green(`✓ ${preset.label}: ${await provider!.check()}`));
    } catch (err) {
      const reason = err instanceof ProviderUnavailableError ? err.reason : (err as Error).message;
      io.err(c.red(`✗ ${preset.label}: ${reason}`));
      return 1;
    }

    // 5. Urutan: jadikan utama?
    const primary = (await rl.question("Jadikan provider utama (dicoba paling awal)? (Y/n): ")).trim().toLowerCase();
    if (primary === "" || primary.startsWith("y")) {
      const rest = (env.ZENTARA_AI_ORDER ?? "").split(",").map((s) => s.trim()).filter((s) => s && s !== preset!.name);
      updates.ZENTARA_AI_ORDER = [preset.name, ...rest].join(",");
    }

    upsertEnvFile(envFile, updates);
    for (const [k, v] of Object.entries(updates)) if (v !== undefined) process.env[k] = v;
    io.out(c.green(`✓ Disimpan ke .env`) + c.dim(` (${Object.keys(updates).join(", ")})`));
    if (!isEnvIgnored(root)) io.out(c.yellow("⚠ .env belum ada di .gitignore. Tambahkan agar API key tidak ikut ter-commit!"));
    if (options.configProviders) {
      io.out(c.yellow("⚠ zentara.config.mjs mengisi ai.providers sendiri, jadi pengaturan dari .env tidak dipakai. Hapus ai.providers agar pengaturan ini berlaku."));
    }
    io.out(`\nCek rantai provider: ${c.cyan("npx zentara ai:status")}\nCoba: ${c.cyan("npx zentara")}`);
    return 0;
  }
}

/**
 * Pastikan OmniRoute terpasang dan berjalan: tawarkan `npm install -g omniroute`, lalu nyalakan
 * sementara untuk tes koneksi. Mengembalikan proses yang dinyalakan (untuk dihentikan setelahnya),
 * true bila sudah berjalan, atau false bila pengguna menolak/gagal.
 */
async function prepareOmniRoute(rl: readline.Interface, io: Output, modelsUrl: string): Promise<BackgroundProcess | boolean> {
  const yes = async (q: string) => {
    const a = (await rl.question(`${q} ${c.dim("(Y/n)")}: `)).trim().toLowerCase();
    return a === "" || a.startsWith("y");
  };
  if (!omnirouteInstalled()) {
    io.out(`OmniRoute belum terpasang. OmniRoute gratis dan tidak butuh API key ${c.dim(`(${OMNIROUTE.repo})`)}.`);
    if (!nodeSupportsOmniRoute()) {
      io.err(c.red(`OmniRoute butuh Node.js 22.22+ atau 24+ (Anda memakai ${process.version}). Perbarui Node.js dulu.`));
      return false;
    }
    if (!(await yes("Pasang sekarang dengan npm install -g omniroute?"))) {
      io.out(`Pasang nanti dengan: ${c.cyan("npm install -g omniroute")}`);
      return false;
    }
    if (!(await installOmniRoute()) || !omnirouteInstalled()) {
      io.err(c.red("Pemasangan gagal. Coba jalankan sendiri: npm install -g omniroute (di Windows mungkin perlu terminal Administrator)."));
      return false;
    }
    io.out(c.green("✓ OmniRoute terpasang."));
  }
  io.out(c.dim("Menyalakan OmniRoute untuk tes koneksi..."));
  const server = new BackgroundProcess(OMNIROUTE.command, [], { cwd: process.cwd(), env: omnirouteEnv(process.env) });
  server.start();
  if (!(await waitForUrl(modelsUrl, 90_000, () => server.running))) {
    io.err(c.red("OmniRoute tidak bisa dijalankan. Log terakhir:"));
    for (const line of server.logs(10)) io.err(c.dim(`  │ ${line}`));
    await server.stop();
    return false;
  }
  io.out(c.green(`✓ OmniRoute berjalan · dashboard ${OMNIROUTE.dashboard}`));
  for (const tip of OMNIROUTE_TIPS) io.out(c.dim(`  ${tip}`));
  return server;
}
