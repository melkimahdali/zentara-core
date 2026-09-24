import type { ApprovalMode } from "./config.js";

export type Risk = "read" | "write" | "critical";

export interface PendingAction {
  tool: string;
  risk: Risk;
  /** Ringkasan satu baris, mis. "Buat src/app/routes/api/produk.ts". */
  summary: string;
  /** Pratinjau isi/diff yang ditampilkan saat meminta persetujuan. */
  preview?: string;
  /** "diff" = format unified (@@, +, -), "file" = isi file baru, "command" = perintah shell. */
  previewKind?: "diff" | "file" | "command";
  /** Alasan aksi dianggap krusial. */
  reason?: string;
}

/** "all" = setujui semua perubahan biasa berikutnya dalam sesi ini (aksi krusial tetap ditanyakan). */
export type ApprovalAnswer = "yes" | "no" | "all";
export type Prompter = (action: PendingAction, signal?: AbortSignal) => Promise<ApprovalAnswer>;

/**
 * Kebijakan persetujuan:
 * - read: tidak pernah ditanyakan.
 * - write: ditanyakan di mode "ask"; otomatis di mode "auto" atau setelah pengguna memilih "semua".
 * - critical: selalu ditanyakan, di mode apa pun.
 */
export class ApprovalPolicy {
  private approveAllWrites: boolean;
  private currentMode: ApprovalMode;

  constructor(mode: ApprovalMode, private readonly prompter: Prompter) {
    this.currentMode = mode;
    this.approveAllWrites = mode === "auto";
  }

  get mode(): ApprovalMode {
    return this.currentMode;
  }

  /** Ganti mode di tengah sesi (perintah /mode). */
  setMode(mode: ApprovalMode): void {
    this.currentMode = mode;
    this.approveAllWrites = mode === "auto";
  }

  async approve(action: PendingAction, signal?: AbortSignal): Promise<boolean> {
    if (action.risk === "read") return true;
    if (action.risk === "write" && this.approveAllWrites) return true;
    if (signal?.aborted) return false;
    const answer = await this.prompter(action, signal);
    if (answer === "all") {
      this.approveAllWrites = true;
      return true;
    }
    return answer === "yes";
  }
}

/** Prompter untuk lingkungan non-interaktif (CI, pipe): tolak semua yang butuh persetujuan. */
export const denyPrompter: Prompter = async () => "no";
