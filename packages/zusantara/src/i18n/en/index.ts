import type { Messages } from "../id/index.js";
import { ai } from "./ai.js";
import { backend } from "./backend.js";
import { cli } from "./cli.js";
import { core } from "./core.js";
import { dev } from "./dev.js";
import { host } from "./host.js";
import { tui } from "./tui.js";
import { ui } from "./ui.js";

/** English catalog. Its shape is checked against the Indonesian one, so a missing key fails typecheck. */
export const en: Messages = { cli, host, ai, tui, dev, core, ui, backend };
