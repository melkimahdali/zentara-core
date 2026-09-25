import assert from "node:assert/strict";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import {
  cache,
  configureMail,
  jobs,
  JobQueue,
  MemoryCache,
  MemoryJobStore,
  outbox,
  parseBytes,
  parseCron,
  parseDuration,
  sendMail,
  SqliteJobStore,
  ZenLogger,
} from "../src/core/index.js";
import { buildMessage, parseSmtpUrl } from "../src/backend/mail.js";
import { loadJobs, retryDelay } from "../src/backend/jobs.js";
import { FIXTURES, startServer } from "./helpers.js";

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jobLog = () => ((globalThis as { __jobLog?: { name: string; value?: string; attempt: number }[] }).__jobLog ??= []);

describe("durasi & ukuran", () => {
  it("parseDuration dan parseBytes", () => {
    assert.equal(parseDuration(250), 250);
    assert.equal(parseDuration("30s"), 30_000);
    assert.equal(parseDuration("5m"), 300_000);
    assert.equal(parseDuration("1h30m"), 5_400_000);
    assert.equal(parseDuration("2d"), 172_800_000);
    assert.throws(() => parseDuration("5 menit"), /Invalid duration/);
    assert.equal(parseBytes("512kb"), 524_288);
    assert.equal(parseBytes("10mb"), 10 * 1024 * 1024);
    assert.throws(() => parseBytes("banyak"), /Invalid size/);
  });
});

describe("cache", () => {
  it("TTL, LRU, clear(prefix), dan remember() menggabungkan permintaan bersamaan", async () => {
    const c = new MemoryCache({ max: 2 });
    c.set("a", 1);
    c.set("b", 2);
    c.get("a"); // a dipakai lagi, jadi b yang dibuang
    c.set("c", 3);
    assert.equal(c.get("b"), undefined);
    assert.equal(c.get("a"), 1);
    c.set("short", "x", 20);
    await tick(40);
    assert.equal(c.get("short"), undefined, "kedaluwarsa");

    const big = new MemoryCache();
    big.set("user:1:a", 1);
    big.set("user:1:b", 2);
    big.set("user:2:a", 3);
    big.clear("user:1:");
    assert.equal(big.size, 1);

    let calls = 0;
    const slow = () => new Promise<number>((r) => setTimeout(() => r(++calls), 20));
    const [x, y] = await Promise.all([big.remember("k", "1m", slow), big.remember("k", "1m", slow)]);
    assert.deepEqual([x, y, calls], [1, 1, 1]);
    assert.equal(await big.remember("k", "1m", slow), 1, "diambil dari cache");
    await assert.rejects(big.remember("err", undefined, () => Promise.reject(new Error("x"))), /x/);
    assert.equal(big.has("err"), false, "error tidak disimpan");
    assert.ok(cache instanceof MemoryCache);
  });
});

describe("cron", () => {
  it("mencocokkan dan menghitung waktu berikutnya", () => {
    const daily = parseCron("0 7 * * *");
    assert.equal(daily.matches(new Date(2026, 8, 25, 7, 0)), true);
    assert.equal(daily.matches(new Date(2026, 8, 25, 7, 1)), false);
    assert.deepEqual(daily.next(new Date(2026, 8, 25, 7, 0, 30)), new Date(2026, 8, 26, 7, 0));
    const every15 = parseCron("*/15 * * * *");
    assert.deepEqual(every15.next(new Date(2026, 8, 25, 10, 2)), new Date(2026, 8, 25, 10, 15));
    const weekdays = parseCron("30 9 * * mon-fri");
    assert.deepEqual(weekdays.next(new Date(2026, 8, 26, 12, 0)), new Date(2026, 8, 28, 9, 30), "Sabtu -> Senin");
    assert.equal(parseCron("@daily").matches(new Date(2026, 0, 1, 0, 0)), true);
    assert.equal(parseCron("0 0 * * 7").matches(new Date(2026, 8, 27, 0, 0)), true, "7 = Minggu");
    // Tanggal DAN hari dibatasi: cukup salah satu yang cocok.
    const either = parseCron("0 0 13 * fri");
    assert.equal(either.matches(new Date(2026, 8, 13, 0, 0)), true);
    assert.equal(either.matches(new Date(2026, 8, 25, 0, 0)), true);
    for (const bad of ["* * * *", "60 * * * *", "* * * 13 *", "*/0 * * * *", "5-1 * * * *"]) assert.throws(() => parseCron(bad), /Invalid cron/, bad);
    assert.throws(() => parseCron("0 0 31 2 *").next(), /never runs/);
  });
});

describe("job latar belakang", () => {
  afterEach(() => jobLog().splice(0));

  it("antrean: berhasil, dicoba ulang dengan jeda, lalu gagal setelah batas", async () => {
    const silent = new ZenLogger("silent");
    const q = new JobQueue().configure({ store: new MemoryJobStore(), logger: silent });
    let runs = 0;
    q.define("ok", (data: { n: number }) => {
      runs += data.n;
    });
    q.define("boom", () => {
      throw new Error("rusak");
    }, { retries: 1 });
    await q.enqueue("ok", { n: 2 });
    await q.enqueue("ok", { n: 3 }, { delay: "1h" });
    const failing = await q.enqueue("boom");
    await q.drain();
    assert.equal(runs, 2, "job tertunda belum jalan");
    let boom = q.list().find((j) => j.id === failing)!;
    assert.equal(boom.status, "queued");
    assert.equal(boom.attempts, 1);
    assert.match(boom.lastError!, /rusak/);
    assert.ok(boom.runAt > Date.now() + 5_000, "percobaan ulang ditunda");
    await assert.rejects(q.enqueue("tidak-ada"), /Job tidak dikenal: tidak-ada/);
    assert.deepEqual([retryDelay(1), retryDelay(2), retryDelay(30)], [10_000, 20_000, 3_600_000]);

    // Majukan waktu: percobaan kedua juga gagal -> status failed.
    const store = new MemoryJobStore();
    const q2 = new JobQueue().configure({ store, logger: silent }).define("boom", () => {
      throw new Error("rusak");
    }, { retries: 1 });
    const id = await q2.enqueue("boom");
    await q2.drain();
    store.retry(id, Date.now() - 1, "rusak");
    await q2.drain();
    boom = q2.list().find((j) => j.id === id)!;
    assert.equal(boom.status, "failed");
    assert.equal(boom.attempts, 2);
    assert.deepEqual(q2.counts(), { queued: 0, running: 0, done: 0, failed: 1 });
  });

  it("SQLite: tahan restart, satu job tidak diambil dua proses, jadwal diklaim sekali per menit", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-jobs-"));
    const file = path.join(dir, "jobs.db");
    const a = new SqliteJobStore(file);
    const now = Date.now();
    for (const id of ["1", "2"]) a.add({ id, name: "x", data: "null", status: "queued", attempts: 0, maxAttempts: 1, runAt: now, lockedUntil: 0, lastError: null, createdAt: now, finishedAt: null });
    a.close();
    const b = new SqliteJobStore(file);
    const c = new SqliteJobStore(file);
    const first = b.claim(now, 60_000);
    const second = c.claim(now, 60_000);
    assert.ok(first && second && first.id !== second.id, "dua proses mendapat job berbeda");
    assert.equal(b.claim(now, 60_000), undefined);
    assert.equal(c.claim(now + 120_000, 60_000)?.id !== undefined, true, "kunci kedaluwarsa -> job diambil ulang");
    b.complete(first.id, now);
    assert.equal(b.counts().done, 1);
    assert.equal(b.claimSchedule("daily", 100), true);
    assert.equal(c.claimSchedule("daily", 100), false, "menit yang sama tidak dijalankan dua kali");
    assert.equal(c.claimSchedule("daily", 101), true);
    assert.equal(b.prune(now + 1), 1);
    b.close();
    c.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it("file di folder jobs: nama dari path, retries, dan schedule", async () => {
    const defs = await loadJobs(path.join(FIXTURES, "backend", "jobs"));
    assert.deepEqual(
      defs.map((d) => [d.name, d.retries, d.schedule?.source ?? null]),
      [["flaky", 2, null], ["record", 0, null], ["reports/daily", 1, "0 7 * * *"]],
    );
  });

  it("runtime memuat jobs/, route memasukkan job, pekerja menjalankannya (juga percobaan ulang)", async () => {
    const { base, close } = await startServer({ routesDir: path.join(FIXTURES, "backend", "routes"), jobs: { store: "memory", pollMs: 20 } });
    try {
      const res = await fetch(`${base}/enqueue?value=halo`, { method: "POST" });
      assert.equal(res.status, 200);
      for (let i = 0; i < 50 && !jobLog().length; i++) await tick(20);
      assert.deepEqual(jobLog(), [{ name: "record", value: "halo", attempt: 1 }]);
      const flakyId = await jobs.enqueue("flaky");
      await tick(60);
      // Percobaan ulang ditunda 10 detik; majukan agar test cepat.
      const job = jobs.list().find((j) => j.id === flakyId)!;
      assert.equal(job.status, "queued");
      await jobs.drain();
      (jobs as unknown as { store: MemoryJobStore }).store.retry(flakyId, Date.now() - 1, "x");
      await jobs.drain();
      assert.equal(jobs.list().find((j) => j.id === flakyId)!.status, "done");
      assert.deepEqual(jobLog().filter((l) => l.name === "flaky").map((l) => l.attempt), [1, 2]);
    } finally {
      await close();
    }
  });
});

describe("email", () => {
  afterEach(() => {
    outbox.splice(0);
    configureMail({ url: undefined, from: undefined });
  });

  it("pesan MIME: multipart, header UTF-8, lampiran; header injection ditolak", () => {
    const raw = buildMessage(
      { to: ["Budi <budi@mail.test>", "sari@mail.test"], subject: "Halo 👋", text: "Teks", html: "<p>HTML</p>", attachments: [{ filename: "a.txt", content: "isi" }] },
      "Aplikasi Ünik <app@mail.test>",
      "id-1",
    );
    assert.match(raw, /^From: =\?UTF-8\?B\?[^?]+\?= <app@mail\.test>\r\n/);
    assert.match(raw, /^To: Budi <budi@mail\.test>, sari@mail\.test\r$/m);
    assert.match(raw, /^Subject: =\?UTF-8\?B\?SGFsbyDwn5GL\?=\r$/m);
    assert.match(raw, /^Message-ID: <id-1@mail\.test>\r$/m);
    assert.match(raw, /multipart\/mixed/);
    assert.match(raw, /multipart\/alternative/);
    assert.ok(raw.includes(Buffer.from("<p>HTML</p>").toString("base64")));
    assert.match(raw, /filename="a\.txt"/);
    assert.throws(() => buildMessage({ to: "a@b.test", subject: "x\r\nBcc: korban@x.test", text: "x" }, "a@b.test", "1"), /subject/);
    assert.throws(() => buildMessage({ to: "bukan-email", subject: "x", text: "x" }, "a@b.test", "1"), /tidak valid/);
    assert.throws(() => buildMessage({ to: "a@b.test", subject: "x" }, "a@b.test", "1"), /text atau html/);
    assert.deepEqual(parseSmtpUrl("smtps://user%40x:p%3Ass@smtp.test"), { host: "smtp.test", port: 465, secure: true, user: "user@x", pass: "p:ss" });
    assert.equal(parseSmtpUrl("smtp://smtp.test").port, 587);
  });

  it("transport memory dan log", async () => {
    configureMail({ url: "memory", from: "app@mail.test" });
    const sent = await sendMail({ to: "a@mail.test", subject: "Tes", text: "Isi" });
    assert.equal(sent.transport, "memory");
    assert.equal(outbox.length, 1);
    assert.equal(outbox[0]!.subject, "Tes");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-mail-"));
    configureMail({ url: "log", logDir: dir });
    assert.equal((await sendMail({ to: "a@mail.test", subject: "Log", text: "Isi" })).transport, "log");
    assert.equal(fs.readdirSync(dir).filter((f) => f.endsWith(".eml")).length, 1);
    fs.rmSync(dir, { recursive: true, force: true });
    configureMail({ url: undefined, from: undefined });
    const prev = process.env.MAIL_FROM;
    delete process.env.MAIL_FROM;
    await assert.rejects(sendMail({ to: "a@mail.test", subject: "x", text: "x" }), /MAIL_FROM/);
    if (prev !== undefined) process.env.MAIL_FROM = prev;
  });

  it("SMTP: EHLO, AUTH PLAIN, MAIL/RCPT (termasuk bcc), DATA dengan dot-stuffing", async () => {
    const commands: string[] = [];
    let data = "";
    const server = net.createServer((socket) => {
      let inData = false;
      let buf = "";
      socket.write("220 fake ESMTP\r\n");
      socket.on("data", (chunk) => {
        buf += chunk.toString();
        let nl: number;
        while ((nl = buf.indexOf("\r\n")) !== -1) {
          const line = buf.slice(0, nl);
          buf = buf.slice(nl + 2);
          if (inData) {
            if (line === ".") {
              inData = false;
              socket.write("250 OK queued\r\n");
            } else data += line + "\n";
            continue;
          }
          commands.push(line);
          if (line.startsWith("EHLO")) socket.write("250-fake\r\n250-AUTH PLAIN LOGIN\r\n250 SIZE 1000000\r\n");
          else if (line.startsWith("AUTH PLAIN")) socket.write("235 ok\r\n");
          else if (line === "DATA") {
            inData = true;
            socket.write("354 go\r\n");
          } else if (line === "QUIT") socket.end("221 bye\r\n");
          else socket.write("250 ok\r\n");
        }
      });
    });
    await new Promise<void>((r) => server.listen(0, "127.0.0.1", () => r()));
    const { port } = server.address() as net.AddressInfo;
    try {
      configureMail({ url: `smtp://user:rahasia@127.0.0.1:${port}`, from: "app@mail.test" });
      const sent = await sendMail({ to: "a@mail.test", bcc: "b@mail.test", subject: "SMTP", text: "baris 1\n.baris dengan titik" });
      assert.equal(sent.transport, "smtp");
      assert.ok(commands.includes(`AUTH PLAIN ${Buffer.from("\0user\0rahasia").toString("base64")}`));
      assert.deepEqual(commands.filter((c) => /^(MAIL|RCPT)/.test(c)), ["MAIL FROM:<app@mail.test>", "RCPT TO:<a@mail.test>", "RCPT TO:<b@mail.test>"]);
      assert.doesNotMatch(data, /b@mail\.test/, "bcc tidak muncul di header");
      assert.match(data, /Subject: SMTP/);
    } finally {
      server.close();
    }
  });
});

describe("unggah file", () => {
  let dir: string;
  let base: string;
  let close: () => Promise<void>;
  before(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-upload-"));
    process.env.UPLOAD_TEST_DIR = dir;
    ({ base, close } = await startServer({ routesDir: path.join(FIXTURES, "backend", "routes"), jobs: { store: "memory" } }));
  });
  after(async () => {
    await close();
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const PNG = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
  const upload = (file: File, extra: Record<string, string> = {}) => {
    const form = new FormData();
    form.append("file", file);
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
    return fetch(`${base}/upload`, { method: "POST", body: form });
  };

  it("menyimpan file dengan nama acak dan tipe dari ekstensi", async () => {
    const res = await upload(new File([PNG], "../../foto saya.PNG", { type: "text/html" }), { title: "Profil" });
    assert.equal(res.status, 200);
    const body = (await res.json()) as { name: string; size: number; type: string; title: string; originalName: string };
    assert.match(body.name, /^[0-9a-f-]{36}\.png$/);
    assert.equal(body.type, "image/png", "tipe dari ekstensi, bukan klaim browser");
    assert.equal(body.originalName, "foto saya.PNG");
    assert.equal(body.title, "Profil");
    assert.equal(fs.readFileSync(path.join(dir, "uploads", body.name)).length, PNG.length);
  });

  it("menolak ekstensi berbahaya, isi palsu, tipe di luar daftar, dan ukuran berlebih", async () => {
    for (const [file, status, pattern] of [
      [new File(["<script>alert(1)</script>"], "x.html"), 422, /\.html tidak diizinkan/],
      [new File(["<svg/>"], "x.svg"), 422, /\.svg tidak diizinkan/],
      [new File(["bukan png"], "palsu.png"), 422, /tidak sesuai/],
      [new File(["%PDF-1.7"], "a.pdf"), 422, /\.pdf tidak diizinkan/],
      [new File([new Uint8Array(1.5 * 1024 * 1024)], "besar.txt"), 413, /terlalu besar/],
    ] as const) {
      const res = await upload(file);
      assert.equal(res.status, status, file.name);
      assert.match(await res.text(), pattern, file.name);
    }
    const huge = await upload(new File([new Uint8Array(3 * 1024 * 1024)], "a.txt"));
    assert.equal(huge.status, 413, "melebihi batas body readForm");
  });

  it("readInput membaca multipart: field teks dan file", async () => {
    const form = new FormData();
    form.append("name", "Sari");
    form.append("tag", "a");
    form.append("tag", "b");
    form.append("doc", new File(["abc"], "catatan.txt"));
    const body = await (await fetch(`${base}/input`, { method: "POST", body: form })).json();
    assert.deepEqual(body, { name: "Sari", tag: ["a", "b"], doc: "file:catatan.txt:3" });
  });
});

describe("CLI: make:job, jobs, jobs:run", () => {
  it("membuat job, menampilkan jadwal, dan menjalankan job sekarang", async () => {
    const { run } = await import("../src/cli.js");
    const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "zentara-cli-jobs-"));
    fs.mkdirSync(path.join(cwd, "src", "app", "routes"), { recursive: true });
    const out: string[] = [];
    const io = { cwd, out: (l: string) => out.push(l), err: (l: string) => out.push(l) };
    assert.equal(await run(["make:job", "laporan-harian", "--schedule", "0 7 * * *"], io), 0);
    const file = fs.readFileSync(path.join(cwd, "src", "app", "jobs", "laporan-harian.ts"), "utf8");
    assert.match(file, /export const schedule = "0 7 \* \* \*";/);
    assert.equal(await run(["make:job", "kirim-sambutan"], io), 0);
    assert.match(out.at(-1)!, /enqueue\("kirim-sambutan"/);
    assert.equal(await run(["make:job", "x", "--schedule", "99 * * * *"], io), 1);
    out.length = 0;
    assert.equal(await run(["jobs", "--json"], io), 0);
    const listed = JSON.parse(out.join("\n")) as { jobs: { name: string; schedule: string | null; next: string | null }[] };
    assert.deepEqual(listed.jobs.map((j) => [j.name, j.schedule]), [["kirim-sambutan", null], ["laporan-harian", "0 7 * * *"]]);
    assert.ok(listed.jobs[1]!.next);
    out.length = 0;
    assert.equal(await run(["jobs:run", "kirim-sambutan", "--data", '{"id":1}'], io), 0);
    assert.match(out.join("\n"), /Job kirim-sambutan selesai/);
    assert.equal(await run(["jobs:run", "tidak-ada"], io), 1);
    assert.equal(await run(["jobs:run", "kirim-sambutan", "--data", "{rusak"], io), 1);
    fs.rmSync(cwd, { recursive: true, force: true });
  });
});
