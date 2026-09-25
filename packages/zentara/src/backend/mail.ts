import { randomBytes, randomUUID } from "node:crypto";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import tls from "node:tls";
import { ZenLogger } from "../core/logger.js";
import { t } from "../i18n/index.js";

/**
 * Kirim email dari aplikasi:
 *
 *   await sendMail({ to: user.email, subject: "Selamat datang", text: "Halo!", html: "<p>Halo!</p>" });
 *
 * Tujuan pengiriman diatur lewat env `MAIL_URL`:
 *   - smtp://user:pass@smtp.example.com:587  (STARTTLS bila server mendukung)
 *   - smtps://user:pass@smtp.example.com:465 (TLS langsung)
 *   - log     (bawaan saat pengembangan: email dicetak ke log dan disimpan di .zentara/mail/*.eml)
 *   - memory  (bawaan saat NODE_ENV=test: email dikumpulkan di `outbox` untuk diperiksa test)
 * Alamat pengirim: env `MAIL_FROM` (mis. "Toko Sari <halo@toko.id>") atau `from` di setiap pesan.
 * Di produksi tanpa MAIL_URL, sendMail() melempar error agar email tidak hilang diam-diam.
 */

export interface MailAttachment {
  filename: string;
  content: string | Uint8Array;
  contentType?: string;
}

export interface MailMessage {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  from?: string;
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: MailAttachment[];
  /** Header tambahan, mis. { "List-Unsubscribe": "<https://...>" }. */
  headers?: Record<string, string>;
}

export interface SentMail {
  id: string;
  transport: "smtp" | "log" | "memory";
  from: string;
  to: string[];
  subject: string;
  text?: string;
  html?: string;
  /** Pesan lengkap (format MIME/RFC 5322). */
  raw: string;
}

export interface MailConfig {
  /** Tujuan pengiriman: smtp://..., smtps://..., "log", atau "memory". */
  url?: string;
  from?: string;
  logger?: ZenLogger;
  /** Folder untuk email transport "log". Default: .zentara/mail. */
  logDir?: string;
}

let config: MailConfig = {};

/** Atur pengiriman email (dipanggil otomatis oleh ZenRuntime dari config `mail` dan env MAIL_URL/MAIL_FROM). */
export function configureMail(options: MailConfig): void {
  config = { ...config, ...options };
}

/** Email yang dikirim lewat transport "memory" (bawaan saat test). */
export const outbox: SentMail[] = [];

function list(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : value.split(",")).map((v) => v.trim()).filter(Boolean);
}

/** Header tidak boleh berisi baris baru (mencegah header injection). */
function headerValue(name: string, value: string): string {
  if (/[\r\n]/.test(value)) throw new Error(t().backend.mailHeaderInvalid(name));
  return value;
}

/** Alamat email dari "Nama <a@b.c>" atau "a@b.c". */
export function mailAddress(value: string): string {
  const match = /<([^<>]+)>\s*$/.exec(value);
  const address = (match ? match[1]! : value).trim();
  if (!/^[^\s@<>"]+@[^\s@<>"]+$/.test(address)) throw new Error(t().backend.mailAddressInvalid(value));
  return address;
}

/** RFC 2047: teks non-ASCII di header ditulis sebagai =?UTF-8?B?...?=. */
function encodeWord(text: string): string {
  return /^[\x20-\x7e]*$/.test(text) ? text : `=?UTF-8?B?${Buffer.from(text, "utf8").toString("base64")}?=`;
}

/** "Nama Ünicode <a@b.c>" dengan nama dikodekan bila perlu. */
function encodeAddress(value: string): string {
  const match = /^\s*"?([^"<]*?)"?\s*<([^<>]+)>\s*$/.exec(value);
  if (!match) return mailAddress(value);
  const name = match[1]!.trim();
  return name ? `${encodeWord(name)} <${mailAddress(match[2]!)}>` : `<${mailAddress(match[2]!)}>`;
}

function base64Lines(content: string | Uint8Array): string {
  const encoded = Buffer.from(content).toString("base64");
  return encoded.replace(/.{1,76}/g, "$&\r\n").trimEnd();
}

/** Susun pesan MIME: text/plain dan/atau text/html (multipart/alternative), plus lampiran (multipart/mixed). */
export function buildMessage(message: MailMessage, from: string, id: string): string {
  const to = list(message.to);
  if (!to.length) throw new Error(t().backend.mailNoRecipient);
  if (message.text === undefined && message.html === undefined) throw new Error(t().backend.mailNoBody);
  const domain = mailAddress(from).split("@")[1];
  const headers: string[] = [
    `From: ${encodeAddress(headerValue("from", from))}`,
    `To: ${to.map((a) => encodeAddress(headerValue("to", a))).join(", ")}`,
    ...(list(message.cc).length ? [`Cc: ${list(message.cc).map((a) => encodeAddress(headerValue("cc", a))).join(", ")}`] : []),
    ...(message.replyTo ? [`Reply-To: ${encodeAddress(headerValue("replyTo", message.replyTo))}`] : []),
    `Subject: ${encodeWord(headerValue("subject", message.subject))}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${id}@${domain}>`,
    "MIME-Version: 1.0",
    ...Object.entries(message.headers ?? {}).map(([k, v]) => {
      if (!/^[A-Za-z0-9-]+$/.test(k)) throw new Error(t().backend.mailHeaderInvalid(k));
      return `${k}: ${headerValue(k, v)}`;
    }),
  ];
  const part = (type: string, body: string) => [`Content-Type: ${type}; charset=utf-8`, "Content-Transfer-Encoding: base64", "", base64Lines(body)].join("\r\n");
  const boundary = () => `zentara-${randomBytes(12).toString("hex")}`;

  let body: string;
  if (message.text !== undefined && message.html !== undefined) {
    const b = boundary();
    body = [`Content-Type: multipart/alternative; boundary="${b}"`, "", `--${b}`, part("text/plain", message.text), `--${b}`, part("text/html", message.html), `--${b}--`].join("\r\n");
  } else {
    body = message.html !== undefined ? part("text/html", message.html) : part("text/plain", message.text!);
  }
  if (message.attachments?.length) {
    const b = boundary();
    const attachments = message.attachments.map((a) => {
      const name = encodeWord(headerValue("filename", a.filename).replace(/"/g, ""));
      return [`Content-Type: ${a.contentType ?? "application/octet-stream"}; name="${name}"`, "Content-Transfer-Encoding: base64", `Content-Disposition: attachment; filename="${name}"`, "", base64Lines(a.content)].join("\r\n");
    });
    body = [`Content-Type: multipart/mixed; boundary="${b}"`, "", `--${b}`, body, ...attachments.flatMap((a) => [`--${b}`, a]), `--${b}--`].join("\r\n");
  }
  return `${headers.join("\r\n")}\r\n${body}\r\n`;
}

// ── SMTP ────────────────────────────────────────────────────────────────────

interface SmtpTarget {
  host: string;
  port: number;
  secure: boolean;
  user?: string;
  pass?: string;
}

export function parseSmtpUrl(url: string): SmtpTarget {
  const u = new URL(url);
  if (u.protocol !== "smtp:" && u.protocol !== "smtps:") throw new Error(t().backend.mailBadUrl(url.replace(/\/\/[^@]*@/, "//***@")));
  const secure = u.protocol === "smtps:";
  return {
    host: u.hostname,
    port: u.port ? Number(u.port) : secure ? 465 : 587,
    secure,
    user: u.username ? decodeURIComponent(u.username) : undefined,
    pass: u.password ? decodeURIComponent(u.password) : undefined,
  };
}

/** Klien SMTP kecil: EHLO, STARTTLS, AUTH PLAIN/LOGIN, MAIL FROM, RCPT TO, DATA. */
async function smtpSend(target: SmtpTarget, from: string, recipients: string[], raw: string, options: { timeoutMs?: number; rejectUnauthorized?: boolean } = {}): Promise<void> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  let socket: net.Socket = target.secure
    ? tls.connect({ host: target.host, port: target.port, servername: target.host, rejectUnauthorized: options.rejectUnauthorized ?? true })
    : net.connect({ host: target.host, port: target.port });
  socket.setTimeout(timeoutMs);

  let buffer = "";
  let waiting: { resolve: (r: { code: number; lines: string[] }) => void; reject: (e: Error) => void } | undefined;
  let failure: Error | undefined;
  const pendingLines: string[] = [];
  const attach = (s: net.Socket) => {
    s.setEncoding("utf8");
    s.on("data", (chunk: string) => {
      buffer += chunk;
      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).replace(/\r$/, "");
        buffer = buffer.slice(nl + 1);
        pendingLines.push(line);
        // Balasan selesai pada baris "250 ..." (bukan "250-...").
        if (/^\d{3}(?: |$)/.test(line) && waiting) {
          const lines = pendingLines.splice(0);
          const w = waiting;
          waiting = undefined;
          w.resolve({ code: Number(line.slice(0, 3)), lines });
        }
      }
    });
    s.on("error", (err) => {
      failure = err;
      waiting?.reject(err);
    });
    s.on("timeout", () => {
      failure = new Error(t().backend.mailTimeout(target.host));
      waiting?.reject(failure);
      s.destroy();
    });
  };
  attach(socket);

  const read = (): Promise<{ code: number; lines: string[] }> =>
    new Promise((resolve, reject) => {
      if (failure) return reject(failure);
      const done = pendingLines.findIndex((l) => /^\d{3}(?: |$)/.test(l));
      if (done !== -1) {
        const lines = pendingLines.splice(0, done + 1);
        return resolve({ code: Number(lines.at(-1)!.slice(0, 3)), lines });
      }
      waiting = { resolve, reject };
    });
  const expect = async (codes: number[], step: string) => {
    const reply = await read();
    if (!codes.includes(reply.code)) throw new Error(t().backend.mailSmtpError(step, reply.lines.join(" ").slice(0, 300)));
    return reply;
  };
  const command = async (line: string, codes: number[], step = line.split(" ")[0]!) => {
    socket.write(`${line}\r\n`);
    return expect(codes, step);
  };

  try {
    await expect([220], "greeting");
    const hostname = os.hostname().replace(/[^A-Za-z0-9.-]/g, "") || "localhost";
    let ehlo = await command(`EHLO ${hostname}`, [250], "EHLO");
    if (!target.secure && ehlo.lines.some((l) => /STARTTLS/i.test(l))) {
      await command("STARTTLS", [220]);
      socket.removeAllListeners("data");
      socket = tls.connect({ socket, servername: target.host, rejectUnauthorized: options.rejectUnauthorized ?? true });
      await new Promise<void>((resolve, reject) => {
        socket.once("secureConnect", () => resolve());
        socket.once("error", reject);
      });
      socket.setTimeout(timeoutMs);
      attach(socket);
      ehlo = await command(`EHLO ${hostname}`, [250], "EHLO");
    }
    if (target.user) {
      const auth = ehlo.lines.join(" ").toUpperCase();
      if (auth.includes("PLAIN") || !auth.includes("LOGIN")) {
        await command(`AUTH PLAIN ${Buffer.from(`\0${target.user}\0${target.pass ?? ""}`).toString("base64")}`, [235], "AUTH");
      } else {
        await command("AUTH LOGIN", [334], "AUTH");
        await command(Buffer.from(target.user).toString("base64"), [334], "AUTH");
        await command(Buffer.from(target.pass ?? "").toString("base64"), [235], "AUTH");
      }
    }
    await command(`MAIL FROM:<${mailAddress(from)}>`, [250], "MAIL FROM");
    for (const rcpt of recipients) await command(`RCPT TO:<${mailAddress(rcpt)}>`, [250, 251], "RCPT TO");
    await command("DATA", [354]);
    // Titik di awal baris digandakan (dot-stuffing) agar tidak dianggap akhir pesan.
    socket.write(`${raw.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..")}\r\n.\r\n`);
    await expect([250], "DATA");
    socket.write("QUIT\r\n");
  } finally {
    socket.end();
  }
}

// ── Kirim ───────────────────────────────────────────────────────────────────

function transportUrl(): string {
  const url = config.url ?? process.env.MAIL_URL;
  if (url) return url;
  if (process.env.NODE_ENV === "test") return "memory";
  if (process.env.NODE_ENV === "production") throw new Error(t().backend.mailNotConfigured);
  return "log";
}

export async function sendMail(message: MailMessage): Promise<SentMail> {
  const from = message.from ?? config.from ?? process.env.MAIL_FROM;
  if (!from) throw new Error(t().backend.mailNoFrom);
  const id = randomUUID();
  const raw = buildMessage(message, from, id);
  const to = list(message.to);
  const recipients = [...to, ...list(message.cc), ...list(message.bcc)];
  const url = transportUrl();
  const sent = (transport: SentMail["transport"]): SentMail => ({ id, transport, from, to, subject: message.subject, text: message.text, html: message.html, raw });

  if (url === "memory") {
    const mail = sent("memory");
    outbox.push(mail);
    return mail;
  }
  if (url === "log") {
    const dir = path.resolve(config.logDir ?? path.join(".zentara", "mail"));
    let file = "";
    try {
      fs.mkdirSync(dir, { recursive: true });
      file = path.join(dir, `${new Date().toISOString().replace(/[:.]/g, "-")}-${id.slice(0, 8)}.eml`);
      fs.writeFileSync(file, raw);
    } catch {
      file = "";
    }
    (config.logger ?? new ZenLogger("info")).info(t().backend.mailLogged(to.join(", "), message.subject, file ? path.relative(process.cwd(), file) : "-"));
    return sent("log");
  }
  await smtpSend(parseSmtpUrl(url), from, recipients, raw, { rejectUnauthorized: process.env.MAIL_TLS_INSECURE !== "1" });
  return sent("smtp");
}
