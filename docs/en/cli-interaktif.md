---
title: Interactive CLI
order: 2
group: Getting started
description: Chat with Zentara AI in the terminal, Claude Code style.
---

# Interactive CLI

Install it globally once so you can type `zentara` from any folder, just like Claude Code:

```bash
npm install -g zentara
zentara
```

(Without a global install: `npx zentara` in the project folder.)

The interface is built with [Ink](https://github.com/vadimdemedes/ink), in the style of Claude Code:
- AI responses stream in and are rendered as Markdown;
- an input box at the bottom with history (↑/↓) and command suggestions (type `/` then **Tab**);
- colored menus and approval dialogs;
- a mode line and server status.

## Full screen, like a chat room

When it opens, `zentara` clears the screen and takes over the terminal. The screen has three sections:

1. **A header pinned at the top:** the Zentara Core name and version, the active AI and mode, the dev server status, the project folder, and a divider. The header does not scroll.
2. **The conversation log in the middle:** new messages push old ones up. Scroll with **PgUp/PgDn**; while you read older messages, new ones don't pull the screen down. **Esc** jumps back to the latest message.
3. **Input at the bottom:** the input box, or menus and approval dialogs (↑/↓ + Enter).

Only changed lines are redrawn, so spinners and streaming text don't make the screen flicker. It uses standard ANSI codes, so it works in local terminals and cloud terminals alike (Codespaces, SSH, web terminals). When you exit, the whole conversation is printed to the terminal scrollback, so nothing is lost.

Terminals shorter than 12 rows, or output that isn't a terminal, automatically use the plain layout (history goes straight to the scrollback). To use the plain layout in any terminal:

```js
// zentara.config.mjs
export default {
  cli: { fullscreen: false },
};
```

Or just once: `ZENTARA_FULLSCREEN=off zentara`.

**Exit:** press **Esc** or **Ctrl+C** twice in a row, or type `/exit`. The first press shows a reminder, so the conversation never closes by accident. Esc and Ctrl+C first stop a running AI, close a dialog, or clear the input. The background dev server is stopped and the session is saved before the process ends. The same happens when the terminal is closed (`SIGHUP`) or the process is terminated (`SIGTERM`).

`zentara --classic` (or `ZENTARA_UI=classic`) uses the classic CLI without Ink.

On start, the Zentara Core logo plays a short animation (about 1 second): it sweeps along the Z stroke with a Pearl shimmer, then the gold motif follows. The animation is off automatically in CI. To turn it off:

```js
// zentara.config.mjs
export default {
  cli: { animation: false },
};
```

Or just once: `ZENTARA_ANIMATION=off zentara` (PowerShell: `$env:ZENTARA_ANIMATION="off"; zentara`).

After the animation, the header shows the version, the active AI, the mode, and the folder. The input field is at the bottom, with the mode line below it (**Shift+Tab** switches modes). Then:
- **No AI ready yet:** a welcome screen lets you choose how to reach a model: *OmniRoute (free)*, *Enter an API key*, *Custom provider*, or *Skip for now*. Pick with ↑/↓ + Enter, or type to search.
- **Outside a project folder:** you can choose *Create a new project* (runs `npm create zentara` and opens the project right away), *Chat in this folder*, or *Open the docs*.

Interactive session features:

- **Dev server in the background.** On start, Zentara asks *"Start the dev server (npm run dev) in the background?"*. If you say yes, there's no need for a second terminal; its log is kept (see it with `/logs`) and server errors show up in the status line. The AI can also read that log to find the cause of an error, and only starts the server after you approve. If `npm run dev` is already running in another terminal, Zentara uses it. Skip the question with `--no-dev`.
- **Streaming responses.** AI text appears line by line as it is written; no waiting for the full answer.
- **Ongoing, saved conversations.** Follow-up requests can refer to earlier ones ("make it blue"). Conversations are saved automatically in `.zentara/sessions/` (the latest 30, ignored by git), so after closing the terminal you can continue with `/resume` or `zentara --continue`.
- **Token savings.** `/compact` summarizes a long conversation into short notes. This also happens automatically once a conversation passes about 60k tokens (set with `ai.compactAt`), so provider tokens-per-minute limits (error 429) are hit less often.
- **Esc** or **Ctrl+C** stops the AI at any time. Press twice while the AI is idle to exit (the dev server is stopped too).
- **Approval menus** (↑/↓ then Enter, or a number): *Yes*, *Yes, and approve all regular changes*, or *No*. Changes are shown as a colored diff: only the changed lines plus 3 lines of context and line numbers (`@@ -12,7 +12,8 @@`).
- **Terminal commands.** The AI can run commands such as `git diff` or `npx eslint src`. See the [safety rules](zentara-ai.html#terminal-commands).
- **Slash commands:**

| Command | What it does |
|---|---|
| `/help` | help |
| `/mode ask` · `/mode auto` | change the approval mode |
| `/dev` · `/dev start` · `/dev stop` · `/dev restart` | control the dev server |
| `/logs` | the latest dev server log |
| `/open [path]` | open the app in the browser |
| `/undo` | undo the last AI change |
| `/resume` | continue an earlier conversation (pick from a list) |
| `/compact` | summarize the conversation to save tokens |
| `/status` · `/setup` (alias `/login`) | check or set up AI access; `/setup openai` goes straight to one provider |
| `/omniroute` | OmniRoute (free AI): status, `install`, `start`, `stop` |
| `/lang` | show the language; `/lang en` or `/lang id` to switch |
| `/clear` | start a new conversation (full screen: the log is cleared) |
| `/exit` | exit |
