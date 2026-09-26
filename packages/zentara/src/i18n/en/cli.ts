import type { Messages } from "../id/index.js";

export const cli: Messages["cli"] = {
  dbDepsMissing: "drizzle-orm is not installed for this project. Run `npm install` in the project folder (the api template already includes drizzle-orm and drizzle-kit), or `npm install drizzle-orm drizzle-kit`.",
  help: `Zentara Core CLI

Running your app:
  zentara dev [--no-ai]                            Development server with auto-reload (src/app),
                                                   detailed error pages & Zentara AI chat in the browser
  zentara build                                    Compile TypeScript to dist/
  zentara start                                    Run the build (production, dist/app)

Talk to the AI (plain language):
  zentara                                          Interactive CLI: chat with the AI, dev server in the
                                                   background (asks first; --no-dev to skip)
  zentara --continue                               Continue the last conversation (or /resume inside the CLI)
  zentara --classic                                Classic interactive CLI (without the Ink interface)
  zentara "build a portfolio page with a list of projects"
  zentara ai "<request>" [--auto] [--dry-run] [--report <file>]
  zentara ai:status                                Check which AI providers are available
  zentara ai:setup [provider]                      Set up an AI provider (Claude, OpenAI, Gemini, Groq, DeepSeek,
                                                   OpenRouter, OmniRoute, Ollama): API key, model, connection test
  zentara undo [--yes]                             Undo the last AI change

  --auto      Apply regular changes right away; only critical actions ask first
  --dry-run   Show what would happen without changing files
  --report <file>  Write the AI task result (status, steps, tokens, tools) as JSON; default .zentara/ai-report.json

Manual commands:
  zentara routes [--json]                          List all routes
  zentara jobs [--json]                            List jobs and schedules (src/app/jobs)
  zentara jobs:run <name> [--data <json>]          Run one job now
  zentara db:generate [--name <name>]              Create a migration from schema changes
  zentara db:migrate                               Apply migrations to the database
  zentara db:seed                                  Insert initial data (app/db/seed.ts)
  zentara make:route <path> [--methods GET,POST]   Create a route file, e.g. api/events/[id]
  zentara make:middleware <name>                   Create a middleware file
  zentara make:job <name> [--schedule "<cron>"]    Create a job file, e.g. send-report
  zentara view <path> [--mobile] [--text "a,b"]   View a page and check its layout (in the browser when a tab is open)
  zentara ai:log [--limit 20] [--json]            Results of recent Zentara AI tasks (local journal)
  zentara lang [id|en]                             Show or change Zentara's language (saved globally)
  zentara help                                     Show this help
  zentara --version

Options:
  --force        Overwrite existing files
  --dir <path>   App folder (default: src/app)
`,
  viewUsage: "Usage: zentara view <path> [--mobile] [--url http://localhost:3000] [--text \"text1,text2\"] [--json]",
  aiLogEmpty: "No Zentara AI tasks recorded in this project yet (.zentara/ai-tasks.jsonl).",
  aiLogLine: (e) =>
    `${e.at.slice(0, 16).replace("T", " ")}  ${e.ok ? "✓" : "✗"} ${e.status.padEnd(19)} ${String(e.steps).padStart(2)} ${e.steps === 1 ? "step " : "steps"}` +
    `${e.checks.typecheck === undefined ? "" : ` · typecheck ${e.checks.typecheck ? "✓" : "✗"}`}${e.checks.test === undefined ? "" : ` · test ${e.checks.test ? "✓" : "✗"}`}` +
    `${e.checks.views.length ? ` · view_page ${e.checks.views.filter((v) => v.ok).length}/${e.checks.views.length}` : ""}${e.dryRun ? " · dry-run" : ""}  ${e.task}`,
  aiLogSummary: (n, ok) => `${n} ${n === 1 ? "task" : "tasks"}, ${ok} done (${Math.round((ok / n) * 100)}%). This data stays on your computer.`,
  viewFailed: (base: string, reason: string) => `Could not open the page from ${base || "the server"}: ${reason}. Make sure the server is running (npx zentara dev).`,
  fileExists: (file) => `File already exists: ${file} (use --force to overwrite)`,
  created: (file) => `Created: ${file}`,
  makeRouteUsage: "Usage: zentara make:route <path> [--methods GET,POST]",
  invalidRoutePath: (raw) => `Invalid route path: ${raw}`,
  invalidMethods: (invalid, choices) => `Invalid method: ${invalid || "(empty)"}. Choices: ${choices}`,
  makeMiddlewareUsage: "Usage: zentara make:middleware <name> (letters, digits, - or _)",
  middlewareTemplate: {
    before: "Before the handler: inspect/modify the request, or return a response to stop the chain.",
    after: "After the handler: e.g. add a header.",
  },
  registerMiddleware: (fn) => `Register it in src/app/middleware.ts or with \`export const middleware = [${fn}]\` in a route file.`,
  noRoutes: (dir) => `No routes in ${dir} yet`,
  aiReport: (file: string) => `AI report written to ${file}`,
  aiMode: (auto, dryRun) => `Zentara AI · mode: ${auto ? "auto (only critical actions ask first)" : "ask for approval"}${dryRun ? " · dry-run" : ""}`,
  nonInteractive: "Non-interactive terminal: actions that need approval will be declined (use --auto for regular changes).",
  aiNeedsTask: 'Write the request, e.g. zentara ai "create an /api/events endpoint"',
  chatMode: 'Chat mode. Type requests in plain language; "exit" to finish.',
  exitWords: ["exit", "quit", "keluar"],
  inkFailed: (reason) => `The Ink interface failed to load (${reason}); using the classic CLI.`,
  approvalMode: (mode) => `Approval mode: ${mode}`,
  providerOrder: "Provider order (the first one is tried first):",
  noProviderReady: "\nNo provider is ready yet. Run: zentara ai:setup",
  setupRunServer: (url, model) => `start its server (${url}, ${model})`,
  setupFillKey: (key, model, def) => `set ${key} (model: ${model}${def ? `, default ${def}` : ""})`,
  setupGuide: (rows) => `Zentara AI uses a provider chain: when one runs out of credits/quota or is down, it switches to the next one.

Easiest way (in an interactive terminal):  npx zentara ai:setup   or   npx zentara ai:setup openai

Or set them in .env directly. Providers with an API key are used automatically:
${rows}

Order: ZENTARA_AI_ORDER=openai,claude,ollama (other providers follow). Check: npx zentara ai:status`,
  nothingToUndo: "There is no AI change to undo.",
  lastChange: (at, task) => `Last change (${at}): ${task}`,
  undoDelete: "delete ",
  undoRestore: "restore ",
  rerunWithYes: "Run again with --yes to undo.",
  confirmUndo: "Undo this change? [y/n] > ",
  yesWords: ["y", "yes", "ya"],
  undone: "✓ Change undone.",
  noAppDir: "Folder src/app not found. Run this command in a Zentara project folder.",
  devtoolsOff: (reason) => `Zentara AI chat in the browser is off: ${reason}`,
  noTypescript: "TypeScript is not installed in this project. Run: npm install -D typescript",
  buildDone: "✓ Build finished. Run it with: zentara start",
  noDist: "dist/app not found. Run this first: zentara build",
  unknownCommand: (cmd) => `Unknown command: ${cmd}\n`,
  lang: {
    current: (name, source) => `Zentara language: ${name} (${source})`,
    sourceEnv: "from the ZENTARA_LANG env",
    sourceConfig: "from zentara.config.mjs",
    sourceSettings: "global preference",
    sourceDefault: "default",
    howTo: "Change it: zentara lang en  ·  zentara lang id  (or the ZENTARA_LANG env, or `locale` in zentara.config.mjs)",
    saved: (name, file) => `✓ Language changed to ${name}. Saved in ${file}`,
    invalid: (value) => `Unknown language: ${value}. Choices: id, en`,
    overridden: (name) => `Note: this project stays in ${name} (from the env or zentara.config.mjs).`,
  },
};
