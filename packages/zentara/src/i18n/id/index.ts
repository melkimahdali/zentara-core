import { ai } from "./ai.js";
import { cli } from "./cli.js";
import { host } from "./host.js";

/** Katalog Bahasa Indonesia: sumber bentuk (tipe) semua katalog lain. */
export const id = { cli, host, ai };

export type Messages = typeof id;
