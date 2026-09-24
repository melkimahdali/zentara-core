import readline from "node:readline/promises";
import { askSecret, type SetupPrompts } from "../ai/setup.js";
import { Keys, select } from "./widgets.js";

/**
 * Pertanyaan wizard dengan menu panah (↑/↓ + Enter), seperti Claude Code. Teks bebas (API key, nama
 * model lain, alamat server) memakai readline sementara yang langsung ditutup setelah dijawab.
 */
export function menuPrompts(keys: Keys = new Keys()): SetupPrompts {
  const withReadline = async <T>(fn: (rl: readline.Interface) => Promise<T>): Promise<T> => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    try {
      return await fn(rl);
    } finally {
      rl.close();
    }
  };
  return {
    choose: (question, choices, fallback) => select(keys, question, choices, fallback),
    ask: (question) => withReadline(async (rl) => (await rl.question(`  ${question}`)).trim()),
    secret: (question) => withReadline((rl) => askSecret(rl, `  ${question}`)),
    confirm: (question, defaultYes = true) =>
      select(keys, question, defaultYes ? [{ label: "Ya", value: true }, { label: "Tidak", value: false }] : [{ label: "Tidak", value: false }, { label: "Ya", value: true }], false),
  };
}
