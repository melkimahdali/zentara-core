import { Box, Static, Text, useApp, useInput, usePaste, useStdout, useWindowSize, type Key } from "ink";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { BRAND, colorDepth, formatPreview, HOST_COMMANDS, terminalLogo, terminalLogoFrame, visibleWidth, type ApprovalAnswer, type HostStatus, type ReplHost, type Tone } from "../repl/host.js";
import { CLEAR_SCREEN, frameHeight, logWindow, scrollDown, scrollUp } from "./layout.js";
import type { Dialog, Item, Store } from "./store.js";

const TEAL = BRAND.teal;
const GOLD = BRAND.gold;
const SLATE = BRAND.slate;
const FRAMES = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];
const TONE_COLOR: Record<Tone, string | undefined> = { info: undefined, ok: "green", warn: "yellow", error: "red", dim: SLATE };

/** Lama animasi logo pembuka dan jumlah frame-nya. */
const INTRO_MS = 1100;
const INTRO_FRAMES = 26;
/** Tinggi minimum agar animasi logo (18 baris + info) muat di layar penuh. */
const INTRO_MIN_ROWS = 24;
/** Jeda tekan-dua-kali untuk keluar (Esc/Ctrl+C). */
const EXIT_WINDOW_MS = 2000;

/**
 * - `fullscreen`: CLI mengambil alih terminal seperti ruang chat. Header terkunci di atas, log di
 *   tengah bisa digulir, input di bawah. Default untuk terminal interaktif.
 * - `inline`: riwayat dicetak ke scrollback terminal (<Static>), cocok untuk terminal yang sangat pendek.
 */
export type Layout = "fullscreen" | "inline";

type DialogOf<K extends Dialog["kind"]> = Extract<Dialog, { kind: K }>;

function aiLabel(status: HostStatus): string {
  if (!status.provider) return "AI belum diatur · /setup";
  const provider = status.provider === "omniroute" ? "OmniRoute (gratis)" : status.provider;
  return `${provider} · ${status.mode === "auto" ? "mode otomatis" : "minta persetujuan"}`;
}

function serverLabel(status: HostStatus): { text: string; color: string } {
  switch (status.server.state) {
    case "running":
    case "external":
      return { text: `● ${status.server.url}`, color: "green" };
    case "starting":
      return { text: "● server dev dimulai...", color: "yellow" };
    case "crashed":
      return { text: "● server dev berhenti (/logs)", color: "red" };
    case "stopped":
      return { text: "○ server dev mati (/dev start)", color: SLATE };
    default:
      return { text: "○ di luar proyek Zentara", color: SLATE };
  }
}

/** Nama produk dan versi, mis. "Zentara Core v0.10.3". */
function BrandName({ version }: { version: string }) {
  return (
    <Text>
      <Text bold>Zentara </Text>
      <Text bold color={TEAL}>
        Core
      </Text>
      <Text color={SLATE}> v{version}</Text>
    </Text>
  );
}

/**
 * Header besar: logo Zentara Core di kiri, info di kanan. Dipakai tata letak biasa, animasi pembuka,
 * dan rekap saat keluar. `progress` < 1 = frame animasi (logo tersapu muncul, info muncul di akhir).
 */
function Header({ host, progress = 1 }: { host: ReplHost; progress?: number }) {
  const { columns } = useWindowSize();
  const status = host.status();
  const depth = colorDepth(process.stdout);
  const full = useMemo(() => (columns >= 56 ? terminalLogo(depth) : []), [columns, depth]);
  const logo = progress < 1 && full.length ? terminalLogoFrame(depth, progress) : full;
  const logoWidth = full.length ? Math.max(...full.map(visibleWidth)) : 0;
  const sideBySide = full.length > 0 && columns >= logoWidth + 4 + 44;
  const info = (
    <Box flexDirection="column" marginTop={logo.length ? 1 : 0} width={sideBySide ? columns - logoWidth - 6 : columns - 2}>
      <BrandName version={host.info.version} />
      <Text color={status.provider ? SLATE : "yellow"}>{aiLabel(status)}</Text>
      <Text color={SLATE} wrap="truncate-middle">
        {host.info.shortCwd}
      </Text>
    </Box>
  );
  return (
    <Box flexDirection={sideBySide ? "row" : "column"} paddingX={1} marginBottom={1} gap={sideBySide ? 3 : 1}>
      {full.length ? (
        <Box width={logoWidth} height={full.length} flexShrink={0}>
          {/* Baris kosong diisi spasi agar Ink tidak memangkasnya (logo tetap di posisinya saat animasi). */}
          <Text>{logo.map((l) => l || " ").join("\n")}</Text>
        </Box>
      ) : null}
      {progress >= 0.7 ? info : null}
    </Box>
  );
}

/**
 * Seksi 1 (layar penuh): header ringkas yang terkunci di atas. Isinya nama & versi, status AI dan
 * server dev, folder proyek, dan garis pembatas (berisi penanda bila ada pesan di atas layar).
 */
function PinnedHeader({ host, status, columns, above }: { host: ReplHost; status: HostStatus; columns: number; above: number }) {
  const server = serverLabel(status);
  const marker = above > 0 ? `── ↑ ${above} pesan sebelumnya · PgUp/PgDn untuk menggulir ` : "";
  return (
    <Box flexDirection="column" flexShrink={0} width={columns}>
      <Box paddingX={1} gap={2}>
        <Box flexGrow={1} flexShrink={1}>
          <Text wrap="truncate-end">
            <Text color={TEAL}>◆ </Text>
            <BrandName version={host.info.version} />
            <Text color={status.provider ? SLATE : "yellow"}>{"  "}{aiLabel(status)}</Text>
          </Text>
        </Box>
        <Box flexShrink={0}>
          <Text color={server.color}>{server.text}</Text>
        </Box>
      </Box>
      <Box paddingX={1}>
        <Text color={SLATE} wrap="truncate-middle">
          {"  "}
          {host.info.shortCwd}
        </Text>
      </Box>
      <Text color={SLATE} wrap="truncate-end">
        {marker}
        {"─".repeat(Math.max(0, columns - visibleWidth(marker)))}
      </Text>
    </Box>
  );
}

/** Animasi logo pembuka. Interval dibersihkan saat komponen dilepas; onDone dipanggil sekali. */
function Intro({ host, onDone }: { host: ReplHost; onDone: () => void }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setFrame((f) => Math.min(INTRO_FRAMES, f + 1)), INTRO_MS / INTRO_FRAMES);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (frame >= INTRO_FRAMES) onDone();
  }, [frame, onDone]);
  return <Header host={host} progress={Math.min(1, frame / INTRO_FRAMES)} />;
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

/** Indikator kerja dengan waktu berjalan. Interval dibersihkan saat komponen dilepas. */
function Spinner({ label, since }: { label: string; since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 120);
    return () => clearInterval(timer);
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

interface DialogProps<K extends Dialog["kind"]> {
  dialog: DialogOf<K>;
  onDone: () => void;
  /** Batas tinggi isi dialog (layar penuh); undefined = tanpa batas. */
  maxLines?: number;
}

/** Menu pilihan: ↑/↓ + Enter, angka untuk memilih langsung, ketik untuk mencari, Esc membatalkan. */
function ChooseDialog({ dialog, onDone, maxLines }: DialogProps<"choose">) {
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState("");
  const list = filter ? dialog.choices.filter((c) => `${c.label} ${c.hint ?? ""}`.toLowerCase().includes(filter.toLowerCase())) : dialog.choices;
  const labelWidth = Math.max(...dialog.choices.map((c) => c.label.length)) + 3;
  const active = Math.min(index, Math.max(0, list.length - 1));
  // Daftar panjang (mis. model AI) ditampilkan sebagai jendela yang mengikuti pilihan aktif.
  const visible = maxLines ? Math.max(3, maxLines) : list.length;
  const offset = Math.min(Math.max(0, active - Math.floor(visible / 2)), Math.max(0, list.length - visible));
  const finish = (value: unknown) => {
    onDone();
    dialog.resolve(value);
  };
  useInput((input, key) => {
    const size = Math.max(1, list.length);
    if (key.upArrow) setIndex((i) => (i - 1 + size) % size);
    else if (key.downArrow || key.tab) setIndex((i) => (i + 1) % size);
    else if (key.return) {
      const choice = list[active];
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
      {offset > 0 ? <Text color={SLATE}> ↑ {offset} lainnya</Text> : null}
      {list.slice(offset, offset + visible).map((choice, i) => {
        const on = offset + i === active;
        return (
          <Text key={offset + i}>
            <Text color={on ? TEAL : undefined}>{on ? "→ " : "  "}</Text>
            <Text color={on ? TEAL : undefined} bold={on}>
              {choice.label.padEnd(labelWidth)}
            </Text>
            {choice.hint ? <Text color={on ? undefined : SLATE}>{choice.hint}</Text> : null}
          </Text>
        );
      })}
      {offset + visible < list.length ? <Text color={SLATE}> ↓ {list.length - offset - visible} lainnya</Text> : null}
      <Text color={SLATE}>↑/↓ pilih · Enter setuju · Esc batal · ketik untuk mencari</Text>
    </Box>
  );
}

function ApproveDialog({ dialog, onDone, maxLines }: DialogProps<"approve">) {
  const { action } = dialog;
  const critical = action.risk === "critical";
  const choices: { label: string; value: ApprovalAnswer }[] = [
    { label: "Ya", value: "yes" },
    ...(critical ? [] : [{ label: "Ya, dan setujui semua perubahan biasa di sesi ini", value: "all" as const }]),
    { label: "Tidak", value: "no" },
  ];
  const [index, setIndex] = useState(0);
  const preview = useMemo(() => formatPreview(action, Math.max(3, Math.min(30, maxLines ?? 30))), [action, maxLines]);
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

interface LineEditor {
  text: string;
  cursor: number;
  set(value: string): void;
  /** Proses satu tombol; true bila tombol dipakai editor. */
  handle(input: string, key: Key): boolean;
}

/** Kolom teks satu baris dengan kursor; dipakai untuk input utama dan pertanyaan. */
function useLineEditor(onSubmit: (text: string) => void, options: { history?: readonly string[]; active: boolean }): LineEditor {
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
  const handle = (input: string, key: Key): boolean => {
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

function AskDialog({ dialog, onDone }: DialogProps<"ask">) {
  const finish = (value: string | undefined) => {
    onDone();
    dialog.resolve(value);
  };
  const editor = useLineEditor((text) => finish(text), { active: true });
  useInput((input, key) => {
    if (key.escape || (key.ctrl && input === "c")) return finish(undefined);
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

/** Baris paling bawah: mode persetujuan (atau petunjuk sementara) dan, di tata letak biasa, status server. */
function Footer({ status, hint, keys, showServer }: { status: HostStatus; hint?: string; keys?: string; showServer: boolean }) {
  const { columns } = useWindowSize();
  const server = serverLabel(status);
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
    <Box paddingX={1} width={columns} gap={2}>
      <Box flexGrow={1} flexShrink={1}>
        {hint ? <Text color="yellow">{hint}</Text> : mode}
      </Box>
      {showServer ? <Text color={server.color}>{server.text}</Text> : keys ? <Text color={SLATE}>{keys}</Text> : null}
    </Box>
  );
}

export interface AppProps {
  store: Store;
  host: ReplHost;
  /** Dipanggil sekali saat pengguna keluar (setelah host ditutup). */
  onExit: (code: number) => void;
  /** Putar animasi logo pembuka. */
  intro?: boolean;
  layout?: Layout;
}

export function App({ store, host, onExit, intro = false, layout = "fullscreen" }: AppProps) {
  const state = useSyncExternalStore(store.subscribe, store.get);
  const app = useApp();
  const { stdout } = useStdout();
  const { columns, rows } = useWindowSize();
  const fullscreen = layout === "fullscreen";
  const height = frameHeight(rows);
  // Animasi pembuka hanya bila logo besar muat di layar.
  const [introDone, setIntroDone] = useState(!intro || (fullscreen && (rows < INTRO_MIN_ROWS || columns < 56)));
  const finishIntro = useCallback(() => setIntroDone(true), []);
  const [history, setHistory] = useState<string[]>([]);
  const [hint, setHint] = useState<string>();
  /** Posisi akhir jendela log saat pengguna menggulir ke atas; undefined = mengikuti pesan terbaru. */
  const [scrollEnd, setScrollEnd] = useState<number>();
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const exitArmed = useRef({ at: 0, label: "" });
  const exiting = useRef(false);
  const status = host.status();
  const running = status.busy;
  const dialog = state.dialog;

  // Serahkan terminal ke proses lain (npm create, npm install -g); layar penuh digambar ulang setelahnya.
  useEffect(() => {
    store.suspendTerminal = (fn) =>
      app.suspendTerminal(async () => {
        await fn();
        if (fullscreen) stdout.write(CLEAR_SCREEN);
      });
    return () => {
      store.suspendTerminal = undefined;
    };
  }, [app, store, stdout, fullscreen]);

  // Timer petunjuk dibersihkan saat komponen dilepas agar tidak ada setState setelah unmount.
  useEffect(() => () => clearTimeout(hintTimer.current), []);

  const showHint = (text: string) => {
    clearTimeout(hintTimer.current);
    setHint(text);
    hintTimer.current = setTimeout(() => setHint(undefined), EXIT_WINDOW_MS);
  };

  /** Keluar dengan anggun: tutup host (server dev, sesi), lalu beri tahu pemanggil. Aman dipanggil berulang. */
  const exit = () => {
    if (exiting.current) return;
    exiting.current = true;
    void host
      .close()
      .catch(() => undefined)
      .finally(() => onExit(0));
  };

  /** Tombol keluar (Esc atau Ctrl+C) harus ditekan dua kali berturut-turut agar tidak keluar tanpa sengaja. */
  const requestExit = (label: string) => {
    const armed = exitArmed.current;
    if (armed.label === label && Date.now() - armed.at < EXIT_WINDOW_MS) return exit();
    exitArmed.current = { at: Date.now(), label };
    showHint(`Tekan ${label} sekali lagi untuk keluar`);
  };

  const submit = (text: string) => {
    const line = text.trim();
    if (!line) return;
    setScrollEnd(undefined);
    setHistory((h) => (h.at(-1) === line ? h : [...h, line].slice(-200)));
    if (!line.startsWith("/")) store.push({ kind: "user", text: line });
    else store.push({ kind: "notice", text: `❯ ${line}`, tone: "dim" });
    host.submit(line).then(
      (result) => {
        if (result === "exit") exit();
      },
      (err: unknown) => store.ui.notice(`✗ ${err instanceof Error ? err.message : String(err)}`, "error"),
    );
  };

  const editor = useLineEditor(submit, { history, active: !dialog && !running && !state.closing });
  const suggestions = editor.text.startsWith("/") && !editor.text.includes(" ") ? HOST_COMMANDS.filter(([cmd]) => cmd.startsWith(editor.text)).slice(0, 6) : [];
  // Tinggi seksi log = frame - header (3 baris) - seksi input (kotak 4 + status 1 + saran, atau dialog).
  const bottomRows = dialog ? Math.min(height - 6, dialog.kind === "ask" ? 5 : height / 2) : 5 + suggestions.length;
  const windowOptions = { height: Math.max(1, Math.floor(height - 3 - bottomRows - (scrollEnd === undefined ? 0 : 1))), columns, end: scrollEnd };

  useInput(
    (input, key) => {
      if (key.tab && key.shift) {
        host.toggleMode();
        store.changed();
        return;
      }
      if (key.ctrl && input === "c") {
        // AI bekerja: hentikan (dialog persetujuan ikut tertutup). Menu dan pertanyaan menangani Ctrl+C sendiri.
        if (running) return host.interrupt();
        if (dialog) return;
        if (editor.text) return editor.set("");
        return requestExit("Ctrl+C");
      }
      if (dialog) return;
      if (fullscreen && key.pageUp) return setScrollEnd(scrollUp(state.items, windowOptions));
      if (fullscreen && key.pageDown) return setScrollEnd(scrollDown(state.items, windowOptions));
      if (key.escape) {
        if (running) return host.interrupt();
        if (scrollEnd !== undefined) return setScrollEnd(undefined);
        if (editor.text) return editor.set("");
        return requestExit("Esc");
      }
      if (running) return;
      if (key.tab && suggestions.length) {
        editor.set(`${suggestions[0]![0]} `);
        return;
      }
      editor.handle(input, key);
    },
    { isActive: !state.closing },
  );

  const onDialogDone = () => store.closeDialog();
  // Batas isi dialog di layar penuh: header (3) + bingkai dialog, sisakan beberapa baris log.
  const menuLines = fullscreen ? Math.max(3, height - 12) : undefined;
  const previewLines = fullscreen ? Math.max(3, height - 16) : undefined;
  const dialogs = (
    <>
      {dialog?.kind === "choose" ? <ChooseDialog key={dialog.question} dialog={dialog} onDone={onDialogDone} maxLines={menuLines} /> : null}
      {dialog?.kind === "approve" ? <ApproveDialog dialog={dialog} onDone={onDialogDone} maxLines={previewLines} /> : null}
      {dialog?.kind === "ask" ? <AskDialog key={dialog.question} dialog={dialog} onDone={onDialogDone} /> : null}
    </>
  );
  const inputBox = !dialog ? (
    <Box flexDirection="column" marginTop={1} flexShrink={0}>
      <Box borderStyle="round" borderColor={running ? SLATE : TEAL} paddingX={1}>
        <Text color={TEAL}>❯ </Text>
        {running ? <Text color={SLATE}>Zentara AI sedang bekerja… (Esc untuk menghentikan)</Text> : <Line text={editor.text} cursor={editor.cursor} placeholder='Tulis permintaan, mis. "buatkan halaman portofolio" · /help' active />}
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
      <Footer status={status} hint={hint} showServer={!fullscreen} keys={fullscreen ? "PgUp/PgDn gulir · Esc keluar" : undefined} />
    </Box>
  ) : null;
  const liveAndSpinner = (
    <>
      {state.live ? (
        <Text>
          {"  "}
          {state.live}
        </Text>
      ) : null}
      {state.busy && !dialog ? <Spinner label={state.busy.label} since={state.busy.since} /> : null}
    </>
  );

  // Keluar: seluruh percakapan dicetak ke scrollback terminal, jadi tidak ada yang hilang.
  if (state.closing) {
    const recap = fullscreen ? state.items.filter((item) => item.kind !== "header") : state.items;
    return <Static items={recap}>{(item) => <TranscriptItem key={item.id} item={item} host={host} />}</Static>;
  }

  if (!fullscreen) {
    // Tata letak biasa: selama animasi pembuka, header digambar di bagian dinamis; riwayat menyusul.
    return (
      <>
        <Static items={introDone ? state.items : []}>{(item) => <TranscriptItem key={item.id} item={item} host={host} />}</Static>
        {!introDone ? <Intro host={host} onDone={finishIntro} /> : null}
        {liveAndSpinner}
        {dialogs}
        {inputBox}
      </>
    );
  }

  if (!introDone) {
    return (
      <Box flexDirection="column" height={height} width={columns} justifyContent="center">
        <Intro host={host} onDone={finishIntro} />
      </Box>
    );
  }

  const win = logWindow(state.items, windowOptions);
  const visible = state.items.slice(win.start, win.end).filter((item) => item.kind !== "header");
  const following = scrollEnd === undefined;
  return (
    <Box flexDirection="column" height={height} width={columns}>
      {/* Seksi 1: header terkunci. */}
      <PinnedHeader host={host} status={status} columns={columns} above={win.above} />
      {/* Seksi 2: log percakapan. Hanya item yang terlihat dirender; bagian atas yang berlebih dipangkas. */}
      <Box flexDirection="column" flexGrow={1} flexShrink={1} flexBasis={0} overflow="hidden" justifyContent="flex-end">
        <Box flexDirection="column" flexShrink={0}>
          {visible.map((item) => (
            // flexShrink 0: item tidak boleh dipadatkan (margin antarpesan tetap), kelebihan di atas dipangkas.
            <Box key={item.id} flexDirection="column" flexShrink={0}>
              <TranscriptItem item={item} host={host} />
            </Box>
          ))}
          {following ? liveAndSpinner : null}
        </Box>
      </Box>
      {!following ? (
        <Text color={GOLD}>
          {"  "}↓ {win.below} pesan lebih baru · PgDn atau Esc untuk kembali ke bawah
        </Text>
      ) : null}
      {/* Seksi 3: input interaktif (kotak input atau dialog) dan baris status. */}
      <Box flexDirection="column" flexShrink={0}>
        {dialogs}
        {inputBox}
      </Box>
    </Box>
  );
}
