# Kebijakan keamanan

[English](#english) · **Bahasa Indonesia**

## Versi yang didukung

Zentara Core masih di versi 0.x. Perbaikan keamanan hanya dirilis untuk **versi minor terbaru** (saat ini 0.12.x), sebagai versi patch baru. Perbarui dengan:

```bash
npm install -g zentara@latest   # CLI global
npm install zentara@latest      # di proyek Anda
```

| Versi | Didukung |
|---|---|
| 0.12.x | ✅ |
| < 0.12 | ❌ |

## Melaporkan celah keamanan

**Jangan laporkan celah keamanan lewat issue, diskusi, atau PR publik.**

Laporkan secara privat lewat GitHub: buka tab **Security** di repo ini, lalu **Report a vulnerability** ([tautan langsung](https://github.com/melkimahdali/zentara-core/security/advisories/new)). Bila formulir itu tidak tersedia, buka issue yang **hanya** meminta kontak privat, tanpa detail celahnya.

Sertakan sebisanya:
- versi `zentara` / `create-zentara`, versi Node.js, dan sistem operasi;
- komponen yang terdampak (mis. session, CSRF, unggah file, Zentara AI, server devtools);
- langkah reproduksi atau proof of concept sekecil mungkin;
- dampak yang Anda perkirakan.

Kami akan mengonfirmasi laporan, menilai dampaknya, dan mengabari perkembangan perbaikannya. Setelah versi perbaikan dirilis, celah diumumkan lewat GitHub Security Advisory dan CHANGELOG, dengan nama pelapor bila Anda bersedia. Mohon tidak mempublikasikan detail celah sebelum perbaikan dirilis.

## Cakupan

Yang termasuk (contoh):

- **Runtime framework** (`packages/zentara`): session terenkripsi, cookie, `csrf()`, `cors()`, `rateLimit()`, validasi, file statis (path traversal, dotfile), unggah file (`saveUpload()`), escape HTML di `renderToString`, auth (`hashPassword`, `login`, `requireAuth`), dan halaman error yang membocorkan detail di produksi.
- **Pagar pengaman Zentara AI**, termasuk bila dipicu *prompt injection* dari isi file atau halaman:
  - membaca atau mengubah `.env*` (selain `.env.example`) atau file database;
  - menulis ke luar folder proyek (termasuk lewat symlink), atau ke `.git/`, `node_modules/`, `.zentara/`, `dist/`;
  - aksi krusial (hapus file, pasang paket, migrasi/seed database, perintah terminal di luar daftar baca-saja, penulisan ke `package*.json` dan config) yang berjalan **tanpa** persetujuan;
  - lolos dari aturan `run_command` (operator shell, shell bersarang, perintah kredensial);
  - nilai rahasia yang tidak tersensor sebelum dikirim ke provider AI.
- **Server devtools** yang dipakai chat Zentara AI di browser: akses dari origin selain localhost, lolos pemeriksaan token atau Host (DNS rebinding), atau server yang mendengar di selain `127.0.0.1`.
- **OmniRoute yang dijalankan Zentara** mendengar di selain `127.0.0.1`.
- **`create-zentara` dan template proyek**: pengaturan bawaan yang tidak aman di proyek hasil scaffold.
- **Rantai rilis**: workflow GitHub Actions dan isi paket npm yang terbit (mis. file rahasia ikut ter-publish).

Yang tidak termasuk:

- Kode aplikasi yang Anda tulis sendiri di atas Zentara, termasuk kode yang dibuat Zentara AI lalu Anda setujui.
- Mode debug (`debug: true` / `ZENTARA_DEBUG`) yang sengaja diaktifkan di produksi; dokumentasi melarangnya.
- Aksi yang Anda setujui sendiri di prompt persetujuan, atau mode `auto` untuk aksi yang memang tidak krusial.
- Perilaku atau kebocoran di sisi provider AI pihak ketiga, serta celah di dependensi yang sudah diperbaiki upstream (laporkan ke proyek tersebut; kami akan memperbarui versinya).
- Serangan yang mensyaratkan penyerang sudah punya akses tulis ke folder proyek atau akun pengguna di komputer Anda.

Rincian pertahanan bawaan ada di [CSRF, CORS & keamanan](docs/keamanan.md) dan [Zentara AI](docs/zentara-ai.md); kontrak persisnya di [`CORE_SPEC.md`](CORE_SPEC.md).

---

## English

### Supported versions

Zentara Core is still at 0.x. Security fixes are released only for the **latest minor version** (currently 0.12.x), as a new patch release. Update with:

```bash
npm install -g zentara@latest   # global CLI
npm install zentara@latest      # in your project
```

| Version | Supported |
|---|---|
| 0.12.x | ✅ |
| < 0.12 | ❌ |

### Reporting a vulnerability

**Do not report vulnerabilities through public issues, discussions, or pull requests.**

Report privately through GitHub: open this repo's **Security** tab, then **Report a vulnerability** ([direct link](https://github.com/melkimahdali/zentara-core/security/advisories/new)). If that form is not available, open an issue that **only** asks for a private contact, without any details of the vulnerability.

Please include as much as you can:
- `zentara` / `create-zentara` version, Node.js version, and operating system;
- the affected component (e.g. sessions, CSRF, file uploads, Zentara AI, the devtools server);
- steps to reproduce or a minimal proof of concept;
- the impact you expect.

We will acknowledge the report, assess its impact, and keep you updated on the fix. Once a fixed version is released, the vulnerability is announced through a GitHub Security Advisory and the CHANGELOG, crediting you if you wish. Please do not publish details before the fix is released.

### Scope

In scope (examples):

- **The framework runtime** (`packages/zentara`): encrypted sessions, cookies, `csrf()`, `cors()`, `rateLimit()`, validation, static files (path traversal, dotfiles), file uploads (`saveUpload()`), HTML escaping in `renderToString`, auth (`hashPassword`, `login`, `requireAuth`), and error pages leaking details in production.
- **Zentara AI's guardrails**, including when triggered by *prompt injection* from file or page content:
  - reading or changing `.env*` (other than `.env.example`) or database files;
  - writing outside the project folder (including through symlinks), or into `.git/`, `node_modules/`, `.zentara/`, `dist/`;
  - critical actions (deleting files, installing packages, database migrate/seed, terminal commands outside the read-only list, writes to `package*.json` and config) running **without** approval;
  - escaping the `run_command` rules (shell operators, nested shells, credential commands);
  - secret values sent to an AI provider without being redacted.
- **The devtools server** behind Zentara AI's browser chat: access from a non-localhost origin, bypassing the token or Host check (DNS rebinding), or the server listening on anything other than `127.0.0.1`.
- **OmniRoute started by Zentara** listening on anything other than `127.0.0.1`.
- **`create-zentara` and the project templates**: insecure defaults in a scaffolded project.
- **The release pipeline**: GitHub Actions workflows and the contents of published npm packages (e.g. secret files being published).

Out of scope:

- Application code you write on top of Zentara, including code Zentara AI generated and you approved.
- Debug mode (`debug: true` / `ZENTARA_DEBUG`) deliberately enabled in production; the docs forbid it.
- Actions you approved yourself at an approval prompt, or `auto` mode for actions that are not critical.
- Behavior or leaks on the side of third-party AI providers, and vulnerabilities in dependencies already fixed upstream (report those to that project; we will update the version).
- Attacks that require the attacker to already have write access to the project folder or your user account.

The built-in defenses are described in [CSRF, CORS & security](docs/en/keamanan.md) and [Zentara AI](docs/en/zentara-ai.md); the exact contract is in [`CORE_SPEC.md`](CORE_SPEC.md).
