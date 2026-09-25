import { ai } from "./ai.js";
import { cli } from "./cli.js";
import { core } from "./core.js";
import { dev } from "./dev.js";
import { host } from "./host.js";
import { tui } from "./tui.js";
import { ui } from "./ui.js";

/** Katalog Bahasa Indonesia: sumber bentuk (tipe) semua katalog lain. */
export const id = { cli, host, ai, tui, dev, core, ui };

export type Messages = typeof id;
