import type { Messages } from "../id/index.js";
import { ai } from "./ai.js";
import { cli } from "./cli.js";
import { host } from "./host.js";

/** English catalog. Its shape is checked against the Indonesian one, so a missing key fails typecheck. */
export const en: Messages = { cli, host, ai };
