import fs from "node:fs";
import { t } from "../i18n/index.js";
import path from "node:path";
import type readline from "node:readline/promises";
import { createProviders, type ProviderConfig } from "./config.js";
import { findPreset, PRESETS, presetBaseUrl, presetLabel, type ProviderPreset } from "./presets.js";
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

/** Cara wizard bertanya: menu panah (CLI interaktif) atau ketikan (readline). */
export interface SetupPrompts {
  choose<T>(question: string, choices: { label: string; value: T; hint?: string }[], fallback: T): Promise<T>;
  ask(question: string): Promise<string>;
  secret(question: string): Promise<string>;
  confirm(question: string, defaultYes?: boolean): Promise<boolean>;
}

/** Pertanyaan lewat ketikan (terminal tanpa dukungan menu, atau tes). */
export function readlinePrompts(rl: readline.Interface, io: Output): SetupPrompts {
  return {
    async choose(question, choices, fallback) {
      io.out(c.bold(question));
      choices.forEach((ch, i) => io.out(`  ${String(i + 1).padStart(2)}. ${ch.label}${ch.hint ? c.dim(`  ${ch.hint}`) : ""}`));
      const answer = (await rl.question(`${t().ai.setup.number} ${c.dim(t().ai.setup.enterIsOne)}: `)).trim() || "1";
      return choices[Number(answer) - 1]?.value ?? fallback;
    },
    ask: async (question) => (await rl.question(question)).trim(),
    secret: (question) => askSecret(rl, question),
    async confirm(question, defaultYes = true) {
      const a = (await rl.question(`${question} ${c.dim(defaultYes ? "(Y/n)" : "(y/N)")}: `)).trim().toLowerCase();
      return a === "" ? defaultYes : a.startsWith("y");
    },
  };
}

export interface SetupOptions {
  root: string;
  prompts: SetupPrompts;
  io: Output;
  env?: NodeJS.ProcessEnv;
  /** Nama preset yang dipilih langsung (mis. dari `zusantara ai:setup openai`). */
  preset?: string;
  /** Provider yang ditulis manual di zusantara.config.mjs (bila ada, env tidak dipakai). */
  configProviders?: ProviderConfig[];
}

/** Wizard interaktif: pilih provider, isi API key & model, tes koneksi, simpan ke .env. */
export async function interactiveSetup(options: SetupOptions): Promise<number> {
  const { root, prompts, io } = options;
  const m = t().ai.setup;
  const env = options.env ?? process.env;
  const envFile = path.join(root, ".env");

  let preset: ProviderPreset | undefined = options.preset ? findPreset(options.preset) : undefined;
  if (options.preset && !preset) {
    io.err(m.unknownPreset(options.preset, PRESETS.map((p) => p.name).join(", ")));
    return 1;
  }
  if (!preset) {
    preset = await prompts.choose<ProviderPreset | undefined>(
      m.chooseProvider,
      PRESETS.map((p) => ({
        label: presetLabel(p).replace(/ \(.*\)$/, ""),
        value: p,
        hint: [presetLabel(p).match(/\((.*)\)$/)?.[1], p.keyEnv && !p.local && env[p.keyEnv] ? m.alreadySet : p.local ? m.local : ""].filter(Boolean).join(" · "),
      })),
      undefined,
    );
    if (!preset) {
      io.out(m.cancelled);
      return 1;
    }
  }

  io.out(`\n${c.bold(presetLabel(preset))}${preset.signupUrl ? c.dim(`  ·  ${preset.signupUrl}`) : ""}`);
  const updates: Record<string, string | undefined> = {};

  // 1. API key (disembunyikan) atau alamat server lokal
  let apiKey = preset.keyEnv ? env[preset.keyEnv] : undefined;
  if (preset.local) {
    const current = presetBaseUrl(preset, env)!;
    const url = (await prompts.ask(`${m.serverAddress} ${c.dim(m.enterIs(current))}: `)) || current;
    if (!/^https?:\/\//.test(url)) {
      io.err(m.badAddress);
      return 1;
    }
    if (url !== preset.baseUrl || env[preset.urlEnv!]) updates[preset.urlEnv!] = url;
    if (preset.keyEnv) {
      const hint = apiKey ? m.keepExisting : m.optionalKey;
      const typed = await prompts.secret(`API key ${c.dim(`(${hint})`)}: `);
      if (typed) {
        apiKey = typed;
        updates[preset.keyEnv] = typed;
      }
    }
  } else if (preset.keyEnv) {
    const hint = apiKey ? c.dim(` (${m.keepExisting})`) : "";
    const typed = await prompts.secret(`API key${hint}: `);
    if (typed) apiKey = typed;
    if (!apiKey) {
      io.err(m.keyRequired);
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
    const ready = await prepareOmniRoute(prompts, io, `${baseUrl.replace(/\/+$/, "")}/models`);
    if (ready === false) return 1;
    tempServer = ready === true ? undefined : ready;
  }
  try {
    return await finishSetup();
  } finally {
    if (tempServer?.running) {
      await tempServer.stop();
      io.out(c.dim(m.omnirouteStoppedForNow));
    }
  }

  async function finishSetup(): Promise<number> {
    const preset = chosen;
    const label = presetLabel(preset);
    if (preset.type === "openai-compatible") {
      io.out(c.dim(m.checking));
      try {
        modelInfo = await new OpenAICompatibleProvider({ name: preset.name, baseUrl: baseUrl!, apiKey }).listModelInfo();
      } catch (err) {
        const reason = err instanceof ProviderUnavailableError ? err.reason : (err as Error).message;
        if (preset.local && !apiKey && /\(401\)/.test(reason)) {
          // Server berjalan, tapi daftar model butuh API key (OmniRoute): lanjut dengan model bawaan.
          io.out(c.dim(m.listNeedsKey(env[preset.modelEnv] || preset.defaultModel || "auto")));
        } else {
          io.err(c.red(m.connectFailed(label, reason)));
          if (preset.local) {
            io.err(m.ensureRunning(label));
            if (preset.install) io.err(`${m.notInstalled} ${c.cyan(preset.install)}  ${c.dim(`(${preset.signupUrl})`)}`);
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
    let model: string | undefined;
    if (suggestions.length) {
      const OTHER = "\u0000lain";
      const picked = await prompts.choose(
        `${m.chooseModel}${models.length > suggestions.length ? c.dim(m.newestOf(suggestions.length, models.length)) : ""}`,
        [
          ...suggestions.map((id) => ({ label: id, value: id, hint: id === currentModel ? m.current : "" })),
          { label: m.otherModel, value: OTHER, hint: m.otherModelHint },
        ],
        currentModel ?? OTHER,
      );
      model = picked === OTHER ? (await prompts.ask(`${m.modelName}: `)) || currentModel : picked;
    } else {
      model = (await prompts.ask(`${m.model} ${currentModel ? c.dim(m.enterIs(currentModel)) : ""}: `)) || currentModel;
    }
    if (!model) {
      io.err(m.modelRequired);
      return 1;
    }
    if (models.length && !models.includes(model)) {
      io.out(c.yellow(m.modelNotListed(model)));
      if (!(await prompts.confirm(m.saveAnyway, false))) return 1;
    }
    updates[preset.modelEnv] = model;

    // 4. Uji koneksi akhir dengan model terpilih
    const [provider] = createProviders([
      preset.type === "anthropic"
        ? { type: "anthropic", name: preset.name, apiKey, model }
        : { type: "openai-compatible", name: preset.name, baseUrl: baseUrl!, apiKey, model, tokenParam: preset.tokenParam },
    ]);
    try {
      io.out(c.green(`✓ ${label}: ${await provider!.check()}`));
    } catch (err) {
      const reason = err instanceof ProviderUnavailableError ? err.reason : (err as Error).message;
      io.err(c.red(`✗ ${label}: ${reason}`));
      return 1;
    }

    // 5. Urutan: jadikan utama?
    if (await prompts.confirm(m.makePrimary)) {
      const rest = (env.ZUSANTARA_AI_ORDER ?? "").split(",").map((s) => s.trim()).filter((s) => s && s !== preset!.name);
      updates.ZUSANTARA_AI_ORDER = [preset.name, ...rest].join(",");
    }

    upsertEnvFile(envFile, updates);
    for (const [k, v] of Object.entries(updates)) if (v !== undefined) process.env[k] = v;
    io.out(c.green(m.saved) + c.dim(` (${Object.keys(updates).join(", ")})`));
    if (!isEnvIgnored(root)) io.out(c.yellow(m.envNotIgnored));
    if (options.configProviders) {
      io.out(c.yellow(m.configOverrides));
    }
    io.out(m.next(c.cyan("npx zusantara ai:status"), c.cyan("npx zusantara")));
    return 0;
  }
}

/**
 * Pastikan OmniRoute terpasang dan berjalan: tawarkan `npm install -g omniroute`, lalu nyalakan
 * sementara untuk tes koneksi. Mengembalikan proses yang dinyalakan (untuk dihentikan setelahnya),
 * true bila sudah berjalan, atau false bila pengguna menolak/gagal.
 */
async function prepareOmniRoute(prompts: SetupPrompts, io: Output, modelsUrl: string): Promise<BackgroundProcess | boolean> {
  const yes = (q: string) => prompts.confirm(q);
  const m = t().ai.setup;
  if (!omnirouteInstalled()) {
    io.out(m.omnirouteMissing(OMNIROUTE.repo));
    if (!nodeSupportsOmniRoute()) {
      io.err(c.red(m.omnirouteNeedsNode(process.version)));
      return false;
    }
    if (!(await yes(m.installNow))) {
      io.out(`${m.installLater} ${c.cyan("npm install -g omniroute")}`);
      return false;
    }
    if (!(await installOmniRoute()) || !omnirouteInstalled()) {
      io.err(c.red(m.installFailed));
      return false;
    }
    io.out(c.green(m.installed));
  }
  io.out(c.dim(m.startingForTest));
  const server = new BackgroundProcess(OMNIROUTE.command, [], { cwd: process.cwd(), env: omnirouteEnv(process.env) });
  server.start();
  if (!(await waitForUrl(modelsUrl, 90_000, () => server.running))) {
    io.err(c.red(m.cannotStart));
    for (const line of server.logs(10)) io.err(c.dim(`  │ ${line}`));
    await server.stop();
    return false;
  }
  io.out(c.green(m.running(OMNIROUTE.dashboard)));
  for (const tip of OMNIROUTE_TIPS()) io.out(c.dim(`  ${tip}`));
  return server;
}
