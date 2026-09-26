---
title: AI providers & OmniRoute
order: 2
group: Zusantara AI
description: Free OmniRoute by default, plus Claude, OpenAI, Gemini, and more.
---

# AI providers & OmniRoute

**Default: [OmniRoute](https://github.com/diegosouzapw/OmniRoute), free with no API key.** OmniRoute is a local AI gateway to hundreds of providers, many of them free. The `auto` model picks a free provider that is currently healthy.

## Tutorial: using OmniRoute

Zusantara can install and run OmniRoute for you. No need to open another terminal.

1. **Install.** Pick one:
   - during `npm create zusantara@latest`, answer **Y** to *"Install OmniRoute now?"*;
   - in the interactive CLI (`npx zusantara`), accept the offer to install it, or type `/omniroute install`;
   - through the wizard: `npx zusantara ai:setup omniroute`;
   - or manually: `npm install -g omniroute`.

   OmniRoute needs Node.js 22.22+ or 24+, and you only install it once for all projects.
2. **Run.** `npx zusantara` offers to start OmniRoute in the background and stops it again when you exit. Other commands:
   - `/omniroute`: check the status;
   - `/omniroute start` / `/omniroute stop`: start or stop it.
3. **Use.** Write your requests as usual. The `auto` model works right away without an API key.
4. **(Optional) Add free providers** in the OmniRoute dashboard at http://localhost:20128, under **Providers**, e.g. *OpenCode Free* (no sign-in) or *Kiro*. If the dashboard asks for an endpoint API key, copy it from **Endpoints** and save it with `npx zusantara ai:setup omniroute`.

If OmniRoute isn't running, Zusantara automatically uses the next provider in the chain (e.g. OpenAI or Claude if their API keys are set).

To choose another provider:

```bash
npx zusantara ai:setup            # menu: pick a provider, type the API key (hidden), pick a model, test the connection
npx zusantara ai:setup openai     # go straight to one provider
npx zusantara ai:status           # show the active provider chain
```

The result is saved to `.env` (mode 0600, never committed), not to the config file.

Zusantara tries providers **in order**. If one runs out of credit (402), hits a quota limit (429), is down, or isn't configured, Zusantara moves on to the next one without losing the conversation. Cloud providers **join automatically** as soon as their API key is in `.env`:

| Provider | API key | Model (default) | Notes |
|---|---|---|---|
| [OmniRoute](https://github.com/diegosouzapw/OmniRoute) (default) | `OMNIROUTE_API_KEY` (optional) | `OMNIROUTE_MODEL` (`auto`) | free, local at `localhost:20128`, tried first; skipped if not running |
| Claude | `ANTHROPIC_API_KEY` | `ZUSANTARA_CLAUDE_MODEL` (`claude-opus-5`) | always in the chain; skipped if the key is empty |
| OpenAI | `OPENAI_API_KEY` | `OPENAI_MODEL` (`gpt-4.1`) | uses `max_completion_tokens` automatically |
| Google Gemini | `GEMINI_API_KEY` | `GEMINI_MODEL` (`gemini-2.5-flash`) | |
| Groq | `GROQ_API_KEY` | `GROQ_MODEL` (`llama-3.3-70b-versatile`) | |
| DeepSeek | `DEEPSEEK_API_KEY` | `DEEPSEEK_MODEL` (`deepseek-chat`) | |
| OpenRouter | `OPENROUTER_API_KEY` | `OPENROUTER_MODEL` (`openai/gpt-4.1`) | many models with one key |
| Ollama | – | `OLLAMA_MODEL` | local & offline at `localhost:11434` |

Other settings:
- **Order:** by default OmniRoute → Claude → cloud providers with a key → Ollama. Change it with `ZUSANTARA_AI_ORDER=openai,omniroute,claude` (other active providers follow), or answer "Yes" to "Make it the primary provider?" in `ai:setup`.
- **API addresses** (proxies or gateways): `OPENAI_BASE_URL`, `GEMINI_BASE_URL`, `GROQ_BASE_URL`, `DEEPSEEK_BASE_URL`, `OPENROUTER_BASE_URL`, `OMNIROUTE_URL`, `OLLAMA_URL`.
- **Default models can go stale.** Change them with the `*_MODEL` variables, or pick from your account's model list in `ai:setup`.

For full control, write the chain yourself in `zusantara.config.mjs`. When set, the `.env` settings above are not used:

```js
ai: {
  mode: "ask",
  providers: [
    { type: "openai-compatible", name: "openai", baseUrl: "https://api.openai.com/v1", model: "gpt-4.1", apiKey: process.env.OPENAI_API_KEY },
    { type: "anthropic", name: "claude" },
    { type: "openai-compatible", name: "ollama", baseUrl: "http://localhost:11434/v1", model: "qwen3-coder" },
  ],
},
```

Notes:
- Claude is called with *server-side fallback* (`fallbacks: "default"`). If the main model declines a request for safety-policy reasons, the API retries it on a fallback model automatically.
- Project code is sent to the provider you choose. The output always shows which provider was used.
- Responses are streamed on every provider. OpenAI-compatible servers that don't support streaming are detected automatically and used without streaming.
