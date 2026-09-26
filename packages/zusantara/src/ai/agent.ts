import type { Risk } from "./approval.js";
import type { ProviderChain } from "./chain.js";
import { t } from "../i18n/index.js";
import type { AgentTool, CommandResult, ToolContext, ViewRecord } from "./tools.js";
import { ToolError } from "./tools.js";
import { AbortedError, type ChatMessage, type ToolCall, type ToolImage, type ToolResult } from "./types.js";

export interface AgentUI {
  thinking(provider: string): void;
  /**
   * Potongan jawaban yang sedang dialirkan (streaming). Opsional: tanpa ini jawaban hanya muncul utuh
   * lewat assistant(). assistant() tetap dipanggil di akhir dengan teks lengkap.
   */
  assistantDelta?(delta: string): void;
  assistant(text: string, provider: string): void;
  toolStart(call: ToolCall): void;
  toolEnd(call: ToolCall, result: ToolResult): void;
  info(message: string): void;
}

export interface AgentOptions {
  chain: ProviderChain;
  tools: AgentTool[];
  context: ToolContext;
  system: string;
  ui: AgentUI;
  maxSteps?: number;
  /** Berapa kali agen boleh mencoba memperbaiki kegagalan verifikasi otomatis. */
  maxFixAttempts?: number;
  /** Verifikasi akhir setelah ada perubahan file (default: typecheck lalu test). */
  verify?: () => Promise<CommandResult>;
}

export interface AgentResult {
  status: "done" | "incomplete" | "refused" | "verification_failed" | "interrupted";
  changedFiles: string[];
  steps: number;
  providersUsed: string[];
  /** Model yang benar-benar menjawab (bisa berbeda karena fallback), bila provider melaporkannya. */
  models: string[];
  /** Jumlah token dari semua langkah; `unreported` = langkah yang providernya tidak melaporkan usage. */
  usage: { inputTokens: number; outputTokens: number; unreported: number };
  /** Berapa kali agen mencoba memperbaiki kegagalan verifikasi otomatis (typecheck/test). */
  fixAttempts: number;
  /** Urutan tool yang dipanggil dan apakah berhasil. */
  toolCalls: { name: string; ok: boolean }[];
  /** Aksi yang tidak disetujui (ditolak pengguna, atau otomatis ditolak di mode --auto/non-interaktif). */
  denied: { tool: string; risk: Risk; summary: string }[];
  durationMs: number;
  /**
   * Hasil pemeriksaan otomatis: `verify` = typecheck/test terakhir (kosong bila tidak dijalankan),
   * `views` = setiap `view_page` dalam tugas ini, `viewAttempts` = permintaan cek/perbaikan tampilan.
   */
  checks: { verify: { name: string; ok: boolean }[]; views: ViewRecord[]; viewAttempts: number };
}

/** File yang menentukan tampilan halaman (bukan route API, test, database, atau job). */
export function isPageFile(rel: string): boolean {
  const p = rel.replace(/\\/g, "/").replace(/^\.\//, "");
  if (/\.(test|spec)\.[cm]?[jt]sx?$/.test(p)) return false;
  if (/^src\/app\/routes\//.test(p)) return !/^src\/app\/routes\/api\//.test(p) && /\.[cm]?[jt]sx?$/.test(p);
  return /^src\/app\/(views?|components?|layouts?|ui|pages)\//.test(p);
}

const COMPACT_PROMPT =
  "You summarize a conversation between a developer and Zusantara AI (a coding assistant working inside the developer's Zusantara Core project) so the conversation can continue with a much shorter history. Reply in the developer's language.";
const COMPACT_REQUEST = `Ringkas seluruh percakapan di atas untuk melanjutkan pekerjaan nanti. Jangan memanggil tool. Tulis dalam poin singkat:
- Tujuan dan permintaan pengguna (termasuk yang belum selesai).
- Keputusan penting, dan hal yang pengguna tolak atau tidak setujui.
- File yang dibuat/diubah beserta isi penting singkatnya (nama route, tabel, fungsi).
- Status terakhir: apa yang sudah berhasil, error yang tersisa, langkah berikutnya.
Jangan sertakan isi rahasia atau kode panjang.`;

const WRITE_TOOLS = new Set(["write_file", "edit_file", "delete_file", "install_package", "database"]);

/** Loop agen: kirim percakapan ke model, jalankan tool yang diminta, ulangi sampai selesai. */
export class Agent {
  /** Lupakan percakapan sebelumnya (mis. perintah /clear). */
  reset(): void {
    this.messages.length = 0;
  }

  /** Salinan riwayat percakapan (untuk disimpan). */
  get history(): ChatMessage[] {
    return structuredClone(this.messages);
  }

  /** Ganti riwayat dengan percakapan tersimpan (perintah /resume). */
  load(messages: readonly ChatMessage[]): void {
    this.messages.splice(0, this.messages.length, ...structuredClone(messages as ChatMessage[]));
  }

  /**
   * Ringkas percakapan menjadi satu catatan agar hemat token (perintah /compact, atau otomatis saat
   * percakapan terlalu panjang). Mengembalikan false bila tidak ada yang bisa diringkas.
   */
  async compact(options: { signal?: AbortSignal } = {}): Promise<boolean> {
    if (this.messages.length < 2) return false;
    const turn = await this.options.chain.complete({
      system: COMPACT_PROMPT,
      messages: [...this.messages, { role: "user", text: COMPACT_REQUEST }],
      tools: [],
      signal: options.signal,
    });
    const summary = turn.text.trim();
    if (!summary) throw new Error(t().ai.agent.noSummary);
    this.messages.splice(
      0,
      this.messages.length,
      { role: "user", text: `<${t().ai.agent.summaryTag}>\n${summary}\n</${t().ai.agent.summaryTag}>\n\n${t().ai.agent.continueFromSummary}` },
      { role: "assistant", text: t().ai.agent.understood, toolCalls: [] },
    );
    return true;
  }

  private readonly messages: ChatMessage[] = [];
  private readonly toolMap: Map<string, AgentTool>;

  constructor(private readonly options: AgentOptions) {
    this.toolMap = new Map(options.tools.map((t) => [t.spec.name, t]));
  }

  /** Percakapan dipertahankan antar pemanggilan, jadi permintaan lanjutan bisa merujuk tugas sebelumnya. */
  async run(task: string, options: { signal?: AbortSignal } = {}): Promise<AgentResult> {
    const { chain, ui, context } = this.options;
    const { signal } = options;
    context.signal = signal;
    const maxSteps = this.options.maxSteps ?? 40;
    const maxFix = this.options.maxFixAttempts ?? 2;
    const verify = this.options.verify ?? (() => defaultVerify(context));
    const providersUsed = new Set<string>();
    const models = new Set<string>();
    const usage = { inputTokens: 0, outputTokens: 0, unreported: 0 };
    const toolCalls: AgentResult["toolCalls"] = [];
    const changedBefore = new Set(context.journal.changedFiles);
    const deniedBefore = context.approval.denied.length;
    const startedAt = Date.now();
    let dirty = false;
    let fixAttempts = 0;
    // Pemeriksaan tampilan wajib: setelah halaman berubah, view_page desktop dan ponsel harus lulus.
    context.views ??= [];
    const views = context.views;
    const viewsBefore = views.length;
    let pageMark = -1;
    let viewAttempts = 0;
    let mutations = 0;
    let verifiedAt = -1;
    let lastVerify: { name: string; ok: boolean }[] = [];
    const finish = (status: AgentResult["status"], steps: number): AgentResult => ({
      status,
      steps,
      providersUsed: [...providersUsed],
      changedFiles: context.journal.changedFiles.filter((f) => !changedBefore.has(f)),
      models: [...models],
      usage: { ...usage },
      fixAttempts,
      toolCalls: [...toolCalls],
      denied: context.approval.denied.slice(deniedBefore),
      durationMs: Date.now() - startedAt,
      checks: { verify: [...lastVerify], views: views.slice(viewsBefore), viewAttempts },
    });

    this.messages.push({ role: "user", text: task });

    for (let step = 1; step <= maxSteps; step++) {
      const result = (status: AgentResult["status"]): AgentResult => finish(status, step);
      const interrupted = () => {
        // Model harus tahu tugas sebelumnya berhenti di tengah jalan saat pengguna menulis lagi.
        this.messages.push({ role: "user", text: t().ai.agent.userStopped });
        this.messages.push({ role: "assistant", text: t().ai.agent.stopped, toolCalls: [] });
        return result("interrupted");
      };
      if (signal?.aborted) return interrupted();

      ui.thinking(chain.current?.name ?? "?");
      let turn;
      try {
        turn = await chain.complete({
          system: this.options.system,
          messages: this.messages,
          tools: this.options.tools.map((t) => t.spec),
          signal,
          onText: ui.assistantDelta ? (delta) => ui.assistantDelta!(delta) : undefined,
        });
      } catch (err) {
        if (err instanceof AbortedError || signal?.aborted) return interrupted();
        throw err;
      }
      providersUsed.add(turn.provider);
      if (turn.model) models.add(turn.model);
      if (turn.usage) {
        usage.inputTokens += turn.usage.inputTokens;
        usage.outputTokens += turn.usage.outputTokens;
      } else usage.unreported++;
      this.messages.push({ role: "assistant", text: turn.text, toolCalls: turn.toolCalls, native: turn.native });
      if (turn.text.trim()) ui.assistant(turn.text.trim(), turn.provider);

      if (turn.stop === "refusal") {
        ui.info(t().ai.agent.refused);
        return result("refused");
      }

      if (turn.toolCalls.length === 0) {
        if (turn.stop === "max_tokens") {
          this.messages.push({ role: "user", text: t().ai.agent.truncated });
          continue;
        }
        if (!dirty || context.dryRun) return result("done");

        let check: CommandResult = { ok: true, output: "" };
        if (verifiedAt !== mutations) {
          ui.info(t().ai.agent.verifying);
          check = await verify();
          if (signal?.aborted) return interrupted();
          lastVerify = check.steps ?? [{ name: "verify", ok: check.ok }];
          if (check.ok) {
            verifiedAt = mutations;
            ui.info(t().ai.agent.verified);
          }
        }
        if (check.ok) {
          const pending = pageMark >= 0 ? pendingViews(views.slice(pageMark)) : undefined;
          if (!pending) return result("done");
          if (viewAttempts >= maxFix) {
            ui.info(t().ai.agent.viewStillFailing(pending.problems.join("; ")));
            return result("verification_failed");
          }
          viewAttempts++;
          ui.info(t().ai.agent.viewChecking(viewAttempts, maxFix));
          this.messages.push({ role: "user", text: pending.problems.length ? t().ai.agent.viewFixRequest(pending.problems.join("\n")) : t().ai.agent.viewRequest });
          continue;
        }
        if (fixAttempts >= maxFix) {
          ui.info(t().ai.agent.stillFailing);
          return result("verification_failed");
        }
        fixAttempts++;
        ui.info(t().ai.agent.fixing(fixAttempts, maxFix));
        this.messages.push({
          role: "user",
          text: t().ai.agent.fixRequest(check.output.slice(-5000)),
        });
        continue;
      }

      const results: ToolResult[] = [];
      for (const call of turn.toolCalls) {
        ui.toolStart(call);
        let res: ToolResult;
        if (signal?.aborted) {
          res = { id: call.id, isError: true, content: t().ai.tools.aborted };
        } else if (turn.stop === "max_tokens") {
          res = { id: call.id, isError: true, content: t().ai.agent.inputTruncated };
        } else {
          res = await this.execute(call);
          if (!res.isError && !context.dryRun && this.mutates(call)) {
            dirty = true;
            mutations++;
            const input = call.input as Record<string, unknown> | undefined;
            // Halaman yang dihapus tidak perlu (dan tidak bisa) diperiksa.
            if (call.name !== "delete_file" && typeof input?.path === "string" && isPageFile(input.path)) pageMark = views.length;
          }
        }
        ui.toolEnd(call, res);
        toolCalls.push({ name: call.name, ok: !res.isError });
        results.push(res);
      }
      if (results.some((r) => r.images)) dropOlderImages(this.messages);
      this.messages.push({ role: "tool_results", results });
      if (signal?.aborted) return interrupted();
    }

    ui.info(t().ai.agent.stepLimit(maxSteps));
    return finish("incomplete", maxSteps);
  }

  private mutates(call: ToolCall): boolean {
    if (WRITE_TOOLS.has(call.name)) return true;
    const tool = this.toolMap.get(call.name);
    const input = call.input;
    if (!tool?.mutates || typeof input !== "object" || input === null || Array.isArray(input)) return false;
    return tool.mutates(input as Record<string, unknown>, this.options.context);
  }

  private async execute(call: ToolCall): Promise<ToolResult> {
    const tool = this.toolMap.get(call.name);
    if (!tool) return { id: call.id, isError: true, content: t().ai.agent.unknownTool(call.name) };
    const input = call.input;
    if (typeof input !== "object" || input === null || Array.isArray(input) || "__invalid_json__" in input) {
      return { id: call.id, isError: true, content: t().ai.agent.badInput };
    }
    const images: ToolImage[] = [];
    this.options.context.images = images;
    try {
      const content = await tool.run(input as Record<string, unknown>, this.options.context);
      return images.length ? { id: call.id, content, images } : { id: call.id, content };
    } catch (err) {
      if (err instanceof ToolError) return { id: call.id, isError: true, content: err.message };
      return { id: call.id, isError: true, content: t().ai.agent.internalError((err as Error).message) };
    }
  }
}

/** Hanya gambar terbaru yang dikirim ulang ke model: gambar lama di riwayat diganti catatan teks. */
function dropOlderImages(messages: ChatMessage[]): void {
  for (const m of messages) {
    if (m.role !== "tool_results") continue;
    for (const r of m.results) if (r.images) delete r.images;
  }
}

async function defaultVerify(context: ToolContext): Promise<CommandResult> {
  const outputs: string[] = [];
  const steps: { name: string; ok: boolean }[] = [];
  for (const script of ["typecheck", "test"]) {
    const r = await context.runScript(script, [], context.signal);
    outputs.push(`$ npm run ${script}\n${r.output}`);
    steps.push({ name: script, ok: r.ok });
    if (!r.ok) return { ok: false, output: outputs.join("\n\n"), steps };
  }
  return { ok: true, output: outputs.join("\n\n"), steps };
}

/**
 * Apa yang masih kurang dari pemeriksaan tampilan sejak halaman terakhir diubah. undefined = selesai:
 * desktop dan ponsel sudah dilihat dan lulus, atau server aplikasi tidak bisa dihubungi sama sekali
 * (mis. tugas dari `zusantara ai` tanpa server dev), jadi tidak ada yang bisa diperiksa.
 */
export function pendingViews(since: ViewRecord[]): { problems: string[] } | undefined {
  const reachable = since.filter((v): v is Exclude<ViewRecord, { unreachable: true }> => !v.unreachable);
  if (since.length > 0 && reachable.length === 0) return undefined;
  const latest = new Map<string, (typeof reachable)[number]>();
  for (const v of reachable) latest.set(`${v.path} ${v.viewport} ${v.theme ?? ""} ${v.lang ?? ""}`, v);
  const seen = new Set([...latest.values()].map((v) => v.viewport));
  if (!seen.has("desktop") || !seen.has("mobile")) return { problems: [] };
  const problems = [...latest.values()]
    .filter((v) => !v.ok)
    .map((v) => `${v.path} (${v.viewport}): ${[v.issues ? `${v.issues} layout` : "", v.errors ? `${v.errors} errors` : "", v.failedChecks ? `${v.failedChecks} FAIL` : ""].filter(Boolean).join(", ")}`);
  return problems.length ? { problems } : undefined;
}
