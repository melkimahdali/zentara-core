import { Box, Static, Text, useApp, useInput, usePaste, useWindowSize } from "ink";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { BRAND, colorDepth, formatPreview, HOST_COMMANDS, terminalLogo, visibleWidth, type ApprovalAnswer, type HostStatus, type ReplHost, type Tone } from "../repl/host.js";
import type { Dialog, Item, Store } from "./store.js";

const TEAL = BRAND.teal;
const GOLD = BRAND.gold;
const SLATE = BRAND.slate;
const FRAMES = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];
const TONE_COLOR: Record<Tone, string | undefined> = { info: undefined, ok: "green", warn: "yellow", error: "red", dim: SLATE };

function Header({ host }: { host: ReplHost }) {
  const { columns } = useWindowSize();
  const status = host.status();
  const logo = useMemo(() => (columns >= 56 ? terminalLogo(colorDepth(process.stdout)) : []), [columns]);
  const aiLine = status.provider ? `${status.provider === "omniroute" ? "OmniRoute (gratis)" : status.provider} · ${status.mode === "auto" ? "mode otomatis" : "minta persetujuan"}` : "AI belum diatur · /setup";
  const logoWidth = logo.length ? Math.max(...logo.map(visibleWidth)) : 0;
  const sideBySide = logo.length > 0 && columns >= logoWidth + 4 + 44;
  const info = (
    <Box flexDirection="column" marginTop={logo.length ? 1 : 0} width={sideBySide ? columns - logoWidth - 6 : columns - 2}>
      <Text>
        <Text bold>Zentara </Text>
        <Text bold color={TEAL}>
          Core
        </Text>
        <Text color={SLATE}> v{host.info.version}</Text>
      </Text>
      <Text color={status.provider ? SLATE : "yellow"}>{aiLine}</Text>
      <Text color={SLATE} wrap="truncate-middle">
        {host.info.shortCwd}
      </Text>
    </Box>
  );
  return (
    <Box flexDirection={sideBySide ? "row" : "column"} paddingX={1} marginBottom={1} gap={sideBySide ? 3 : 1}>
      {logo.length ? <Text>{logo.join("\n")}</Text> : null}
      {info}
    </Box>
  );
}

function TranscriptItem({ item, host }: { item: Item; host: ReplHost }) {
  switch (item.kind) {
    case "header":
      return <Header host={host} />;
    case "user":
      return (
        <Box marginTop={1}>
          <Text color={SLATE}>❯ </Text>
          <Text>{item.text}</Text>
        </Box>
      );
    case "assistant":
      return (
        <Box flexDirection="column" marginTop={item.first ? 1 : 0}>
          {item.lines.map((line, i) => (
            <Text key={i}>
              {i === 0 && item.first ? <Text color={TEAL}>⏺ </Text> : "  "}
              {line}
            </Text>
          ))}
        </Box>
      );
    case "tool":
      return (
        <Text>
          <Text color={SLATE}>⏺ </Text>
          <Text bold>{item.title}</Text>
        </Text>
      );
    case "toolEnd":
      return (
        <Text>
          <Text color={SLATE}>{"  ⎿  "}</Text>
          <Text color={item.error ? "yellow" : SLATE}>{item.summary}</Text>
        </Text>
      );
    case "notice":
      return (
        <Box paddingLeft={2}>
          <Text color={TONE_COLOR[item.tone]} wrap="wrap">
            {item.text}
          </Text>
        </Box>
      );
  }
}

function Spinner({ label, since }: { label: string; since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(t);
  }, []);
  const frame = FRAMES[Math.floor(now / 120) % FRAMES.length];
  const seconds = Math.max(0, Math.floor((now - since) / 1000));
  return (
    <Box marginTop={1}>
      <Text color={TEAL}>{frame} </Text>
      <Text color={SLATE}>
        {label}… ({seconds}s · esc untuk berhenti)
      </Text>
    </Box>
  );
}

/** Menu pilihan: ↑/↓ + Enter, angka untuk memilih langsung, ketik untuk mencari, Esc membatalkan. */
function ChooseDialog({ dialog, onDone }: { dialog: Extract<Dialog, { kind: "choose" }>; onDone: () => void }) {
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState("");
  const list = filter ? dialog.choices.filter((c) => `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(filter.toLowerCase())) : dialog.choices;
  const labelWidth = Math.max(...dialog.choices.map((c) => c.label.length)) + 3;
  const finish = (value: unknown) => {
    onDone();
    dialog.resolve(value);
  };
  useInput((input, key) => {
    if (key.upArrow) setIndex((i) => (i - 1 + Math.max(1, list.length)) % Math.max(1, list.length));
    else if (key.downArrow || key.tab) setIndex((i) => (i + 1) % Math.max(1, list.length));
    else if (key.return) {
      const choice = list[Math.min(index, list.length - 1)];
      if (choice) finish(choice.value);
    } else if (key.escape || (key.ctrl && input === "c")) finish(dialog.cancel);
    else if (key.backspace || key.delete) {
      setFilter((f) => f.slice(0, -1));
      setIndex(0);
    } else if (!filter && /^[1-9]$/.test(input) && Number(input) <= list.length) finish(list[Number(input) - 1]!.value);
    else if (input && !key.ctrl && !key.meta && /^[\p{L}\p{N} ]+$/u.test(input)) {
      setFilter((f) => f + input);
      setIndex(0);
    }
  });
  return (
    <Box flexDirection="column" marginTop={1} paddingX={1}>
      <Text bold>{dialog.question}</Text>
      {filter ? <Text color={SLATE}>Cari: {filter}</Text> : null}
      {list.length === 0 ? <Text color={SLATE}> (tidak ada yang cocok)</Text> : null}
      {list.map((choice, i) => {
        const active = i === Math.min(index, list.length - 1);
        return (
          <Text key={i}>
            <Text color={active ? TEAL : undefined}>{active ? "→ " : "  "}</Text>
            <Text color={active ? TEAL : undefined} bold={active}>
              {choice.label.padEnd(labelWidth)}
            </Text>
            {choice.hint ? <Text color={active ? undefined : SLATE}>{choice.hint}</Text> : null}
          </Text>
        );
      })}
      <Text color={SLATE}>↑/↓ pilih · Enter setuju · Esc batal · ketik untuk mencari</Text>
    </Box>
  );
}

function ApproveDialog({ dialog, onDone }: { dialog: Extract<Dialog, { kind: "approve" }>; onDone: () => void }) {
  const { action } = dialog;
  const critical = action.risk === "critical";
  const choices: { label: string; value: ApprovalAnswer }[] = [
    { label: "Ya", value: "yes" },
    ...(critical ? [] : [{ label: "Ya, dan setujui semua perubahan biasa di sesi ini", value: "all" as const }]),
    { label: "Tidak", value: "no" },
  ];
  const [index, setIndex] = useState(0);
  const preview = useMemo(() => formatPreview(action, 30), [action]);
  const finish = (value: ApprovalAnswer) => {
    onDone();
    dialog.resolve(value);
  };
  useInput((input, key) => {
    if (key.upArrow) setIndex((i) => (i - 1 + choices.length) % choices.length);
    else if (key.downArrow || key.tab) setIndex((i) => (i + 1) % choices.length);
    else if (key.return) finish(choices[index]!.value);
    else if (key.escape) finish("no");
    else if (/^[1-3]$/.test(input) && Number(input) <= choices.length) finish(choices[Number(input) - 1]!.value);
    else if (input === "y") finish("yes");
    else if (input === "n") finish("no");
  });
  return (
    <Box flexDirection="column" marginTop={1} borderStyle="round" borderColor={critical ? "red" : GOLD} paddingX={1}>
      <Text bold color={critical ? "red" : undefined}>
        {critical ? "⚠ AKSI KRUSIAL: " : "✎ "}
        {action.summary}
      </Text>
      {action.reason ? <Text color={critical ? "red" : SLATE}>Perlu persetujuan: {action.reason}</Text> : null}
      {preview.length ? (
        <Box flexDirection="column" marginY={1}>
          {preview.map((line, i) => (
            <Text key={i} wrap="truncate-end">
              {line}
            </Text>
          ))}
        </Box>
      ) : null}
      <Text bold>{critical ? "Izinkan aksi krusial ini?" : "Lanjutkan?"}</Text>
      {choices.map((choice, i) => (
        <Text key={choice.value} color={i === index ? TEAL : undefined}>
          {i === index ? "→ " : "  "}
          {i + 1}. {choice.label}
        </Text>
      ))}
    </Box>
  );
}

/** Kolom teks satu baris dengan kursor; dipakai untuk input utama dan pertanyaan. */
function useLineEditor(onSubmit: (text: string) => void, options: { history?: string[]; active: boolean }) {
  const [text, setText] = useState("");
  const [cursor, setCursor] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const insert = (s: string) => {
    const clean = s.replace(/\r\n?/g, "\n").replace(/\n/g, " ");
    setText((t) => t.slice(0, cursor) + clean + t.slice(cursor));
    setCursor((c) => c + clean.length);
  };
  usePaste((pasted) => insert(pasted), { isActive: options.active });
  const set = (value: string) => {
    setText(value);
    setCursor(value.length);
  };
  const handle = (input: string, key: Parameters<Parameters<typeof useInput>[0]>[1]): boolean => {
    if (key.return) {
      onSubmit(text);
      set("");
      setHistoryIndex(-1);
      return true;
    }
    if (key.leftArrow) return setCursor((c) => Math.max(0, c - 1)), true;
    if (key.rightArrow) return setCursor((c) => Math.min(text.length, c + 1)), true;
    if (key.home || (key.ctrl && input === "a")) return setCursor(0), true;
    if (key.end || (key.ctrl && input === "e")) return setCursor(text.length), true;
    if (key.ctrl && input === "u") return set(""), true;
    if (key.backspace || key.delete) {
      if (cursor > 0) {
        setText((t) => t.slice(0, cursor - 1) + t.slice(cursor));
        setCursor((c) => c - 1);
      }
      return true;
    }
    const history = options.history ?? [];
    if (key.upArrow && history.length) {
      const next = Math.min(history.length - 1, historyIndex + 1);
      setHistoryIndex(next);
      set(history[history.length - 1 - next]!);
      return true;
    }
    if (key.downArrow && history.length) {
      const next = historyIndex - 1;
      setHistoryIndex(Math.max(-1, next));
      set(next < 0 ? "" : history[history.length - 1 - next]!);
      return true;
    }
    if (input && !key.ctrl && !key.meta && !key.escape && !key.tab) {
      insert(input);
      return true;
    }
    return false;
  };
  return { text, cursor, set, handle };
}

function Line({ text, cursor, secret, placeholder, active }: { text: string; cursor: number; secret?: boolean; placeholder?: string; active: boolean }) {
  const shown = secret ? "•".repeat(text.length) : text;
  if (!shown && placeholder) {
    return (
      <Text>
        {active ? <Text inverse> </Text> : null}
        <Text color={SLATE}>{placeholder}</Text>
      </Text>
    );
  }
  return (
    <Text>
      {shown.slice(0, cursor)}
      {active ? <Text inverse>{shown[cursor] ?? " "}</Text> : shown[cursor] ?? ""}
      {shown.slice(cursor + 1)}
    </Text>
  );
}

function AskDialog({ dialog, onDone }: { dialog: Extract<Dialog, { kind: "ask" }>; onDone: () => void }) {
  const finish = (value: string | undefined) => {
    onDone();
    dialog.resolve(value);
  };
  const editor = useLineEditor((text) => finish(text), { active: true });
  useInput((input, key) => {
    if (key.escape) return finish(undefined);
    editor.handle(input, key);
  });
  return (
    <Box flexDirection="column" marginTop={1} paddingX={1}>
      <Text bold>{dialog.question}</Text>
      <Box borderStyle="round" borderColor={TEAL} paddingX={1}>
        <Line text={editor.text} cursor={editor.cursor} secret={dialog.secret} placeholder={dialog.placeholder} active />
      </Box>
      <Text color={SLATE}>Enter kirim · Esc batal{dialog.secret ? " · isi disembunyikan" : ""}</Text>
    </Box>
  );
}

function Footer({ status, hint }: { status: HostStatus; hint?: string }) {
  const { columns } = useWindowSize();
  const server =
    status.server.state === "running" || status.server.state === "external"
      ? { text: `● ${status.server.url}`, color: "green" }
      : status.server.state === "starting"
        ? { text: "● server dev dimulai...", color: "yellow" }
        : status.server.state === "crashed"
          ? { text: "● server dev berhenti (/logs)", color: "red" }
          : status.server.state === "stopped"
            ? { text: "○ server dev mati (/dev start)", color: SLATE }
            : { text: "○ di luar proyek Zentara", color: SLATE };
  const mode =
    status.mode === "auto" ? (
      <Text>
        <Text color={GOLD}>▸▸ mode otomatis</Text>
        <Text color={SLATE}> (shift+tab ganti)</Text>
      </Text>
    ) : (
      <Text color={SLATE}>▸ minta persetujuan (shift+tab ganti)</Text>
    );
  return (
    <Box paddingX={1} width={columns}>
      <Box flexGrow={1}>{hint ? <Text color="yellow">{hint}</Text> : mode}</Box>
      <Text color={server.color}>{server.text}</Text>
    </Box>
  );
}

export function App({ store, host, onExit }: { store: Store; host: ReplHost; onExit: (code: number) => void }) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const app = useApp();
  const [history, setHistory] = useState<string[]>([]);
  const [hint, setHint] = useState<string>();
  const [lastCtrlC, setLastCtrlC] = useState(0);
  const status = host.status();
  const running = status.busy;

  useEffect(() => {
    store.suspendTerminal = (fn) => app.suspendTerminal(fn);
  }, [app, store]);

  const submit = (text: string) => {
    const line = text.trim();
    if (!line) return;
    setHistory((h) => (h.at(-1) === line ? h : [...h, line].slice(-200)));
    if (!line.startsWith("/")) store.push({ kind: "user", text: line });
    else store.push({ kind: "notice", text: `❯ ${line}`, tone: "dim" });
    void host.submit(line).then(async (result) => {
      if (result === "exit") {
        await host.close();
        onExit(0);
      }
    });
  };

  const editor = useLineEditor(submit, { history, active: !state.dialog && !running });
  const suggestions = editor.text.startsWith("/") && !editor.text.includes(" ") ? HOST_COMMANDS.filter(([cmd]) => cmd.startsWith(editor.text)).slice(0, 6) : [];

  useInput((input, key) => {
    if (key.tab && key.shift) {
      host.toggleMode();
      store.changed();
      return;
    }
    if (key.ctrl && input === "c") {
      if (running) return host.interrupt();
      if (editor.text) return editor.set("");
      if (Date.now() - lastCtrlC < 2000) {
        void host.close().then(() => onExit(0));
        return;
      }
      setLastCtrlC(Date.now());
      setHint("Tekan Ctrl+C sekali lagi untuk keluar");
      setTimeout(() => setHint(undefined), 2000);
      return;
    }
    if (state.dialog) return;
    if (key.escape) {
      if (running) host.interrupt();
      return;
    }
    if (running) return;
    if (key.tab && suggestions.length) {
      editor.set(`${suggestions[0]![0]} `);
      return;
    }
    editor.handle(input, key);
  });

  const onDialogDone = () => store.closeDialog();
  const dialog = state.dialog;

  if (state.closing) return <Static items={state.items}>{(item) => <TranscriptItem key={item.id} item={item} host={host} />}</Static>;

  return (
    <>
      <Static items={state.items}>{(item) => <TranscriptItem key={item.id} item={item} host={host} />}</Static>
      {state.live ? (
        <Text>
          {"  "}
          {state.live}
        </Text>
      ) : null}
      {state.busy && !dialog ? <Spinner label={state.busy.label} since={state.busy.since} /> : null}
      {dialog?.kind === "choose" ? <ChooseDialog key={dialog.question} dialog={dialog} onDone={onDialogDone} /> : null}
      {dialog?.kind === "approve" ? <ApproveDialog dialog={dialog} onDone={onDialogDone} /> : null}
      {dialog?.kind === "ask" ? <AskDialog key={dialog.question} dialog={dialog} onDone={onDialogDone} /> : null}
      {!dialog ? (
        <Box flexDirection="column" marginTop={1}>
          <Box borderStyle="round" borderColor={running ? SLATE : TEAL} paddingX={1}>
            <Text color={TEAL}>❯ </Text>
            {running ? <Text color={SLATE}>Zentara AI sedang bekerja… (Esc untuk menghentikan)</Text> : <Line text={editor.text} cursor={editor.cursor} placeholder='Tulis permintaan, mis. "buatkan API produk" · /help' active />}
          </Box>
          {suggestions.length ? (
            <Box flexDirection="column" paddingX={2}>
              {suggestions.map(([cmd, desc], i) => (
                <Text key={cmd}>
                  <Text color={i === 0 ? TEAL : undefined}>{cmd.padEnd(11)}</Text>
                  <Text color={SLATE}>{desc}</Text>
                </Text>
              ))}
            </Box>
          ) : null}
          <Footer status={status} hint={hint} />
        </Box>
      ) : null}
    </>
  );
}
