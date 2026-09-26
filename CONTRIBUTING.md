# Berkontribusi ke Zentara Core

[English](#english) · **Bahasa Indonesia**

Terima kasih sudah mau membantu. Panduan ini menjelaskan cara menyiapkan repo, aturan kerja yang dipakai proyek ini, dan apa yang diperiksa sebelum sebuah pull request (PR) digabung.

## Sebelum mulai

- **Laporan bug dan ide** masuk ke [Issues](https://github.com/melkimahdali/zentara-core/issues). Untuk celah keamanan, **jangan** buka issue publik: ikuti [SECURITY.md](SECURITY.md).
- **Perubahan besar** (fitur baru, perubahan API, perubahan kontrak di [`CORE_SPEC.md`](CORE_SPEC.md)) sebaiknya didiskusikan dulu di issue, supaya tidak bentrok dengan tahap yang sedang dikerjakan di [peta jalan](docs/peta-jalan.md).
- Gambaran besar kode ada di [dokumentasi arsitektur](docs/arsitektur.md).

## Menyiapkan repo

Butuh Node.js 22 atau lebih baru (CI menguji Node 22 dan 24, di Ubuntu dan Windows).

```bash
git clone https://github.com/melkimahdali/zentara-core.git
cd zentara-core
npm install          # memasang kedua workspace: packages/zentara dan packages/create-zentara
npm run build
npm run typecheck
npm test
```

| Perintah | Kegunaan |
|---|---|
| `npm run build` | build kedua paket (`tsc`) |
| `npm run typecheck` | cek tipe tanpa build |
| `npm test` | test unit/integrasi kedua paket (`node:test` + `tsx`) dan test skrip rilis |
| `npm run e2e` | simulasi publish: `npm pack`, buat proyek dari tarball, install, test, jalankan server, CLI global, tool Zentara AI, dan alur interaktif buat proyek |
| `npm run docs:build` / `npm run docs:serve` | bangun dan pratinjau situs dokumentasi (butuh `npm run build` lebih dulu) |
| `npm run ai-smoke` | uji Zentara AI dengan provider sungguhan; **memakai kredit API**, jadi hanya dijalankan manual |

Test PostgreSQL dilewati kecuali `ZENTARA_TEST_POSTGRES_URL` diisi (di CI disediakan lewat service container). Contoh lokal:

```bash
docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=zentara_test postgres:16
ZENTARA_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/zentara_test npm test
```

Test memakai folder `ZENTARA_HOME` sementara dan menghapus `ZENTARA_LANG` (lihat `packages/zentara/test/setup.mjs`), jadi preferensi `zentara lang` di komputer Anda tidak memengaruhi hasil.

## Aturan kerja

Aturan ini dipakai di semua perubahan dan diperiksa saat review:

1. **Satu tahap per PR.** Pekerjaan di peta jalan dikerjakan per tahap; satu PR tidak mencampur beberapa tahap. Perbaikan kecil di luar tahap boleh jadi PR tersendiri.
2. **Setiap bug dari pemakaian sungguhan masuk ke e2e.** Bila bug ditemukan saat memakai Zentara (bukan hanya dari test), tambahkan skenario yang mereproduksinya ke `scripts/e2e.mjs`, bukan hanya test unit.
3. **Setiap fitur tersedia lewat CLI dan Zentara AI, di terminal dan browser.** Perintah CLI baru juga harus bisa dijalankan AI (lihat tool `zentara` di `packages/zentara/src/ai/tools.ts`), dan berfungsi di CLI interaktif maupun chat browser.
4. **Bahasa Indonesia dan Bahasa Inggris selalu bersamaan.** Lihat [bagian di bawah](#dua-bahasa).
5. **Kontrak di `CORE_SPEC.md` hanya berubah dengan sengaja.** Perubahan perilaku yang tercantum di sana adalah *breaking change*: perbarui `CORE_SPEC.md` di PR yang sama dan sebutkan di CHANGELOG.
6. **Tidak ada merge tanpa persetujuan pemilik repo.**

## Dua bahasa

Semua teks yang dilihat pengguna ada dalam Bahasa Indonesia dan Bahasa Inggris:

- **Teks di kode** (CLI, halaman bawaan, pesan error, kit UI, instruksi AI) tidak ditulis langsung, tetapi lewat katalog di `packages/zentara/src/i18n/id/` dan `packages/zentara/src/i18n/en/`, lalu dipanggil dengan `t()`. Katalog Indonesia adalah sumber tipe (`Messages`), jadi kunci yang lupa diterjemahkan membuat `typecheck` gagal.
- **Template proyek:** `packages/create-zentara/templates/` berbahasa Indonesia; file pengganti Bahasa Inggris ada di `packages/create-zentara/locales/en/` dengan path yang sama.
- **Dokumentasi:** halaman `docs/<nama>.md` punya pasangan `docs/en/<nama>.md` dengan nama file (slug) yang sama.
- **CHANGELOG:** tulis entri di `CHANGELOG.md` dan `CHANGELOG.en.md`.
- **Dokumen di akar repo** (README, panduan ini) memuat kedua bahasa dalam satu file.

## Gaya kode

- TypeScript ESM (`"type": "module"`), import lokal memakai ekstensi `.js`.
- Tidak ada linter atau formatter terpisah: ikuti gaya file di sekitarnya, dan pastikan `npm run typecheck` bersih.
- Komentar dan pesan commit ditulis dalam Bahasa Indonesia, singkat, dan menjelaskan *mengapa*.
- Hindari dependensi baru di paket `zentara` kecuali benar-benar perlu; dependensi opsional (mis. `drizzle-orm`, `postgres`) dimuat hanya saat dipakai.
- Tampilan (kit UI, halaman bawaan, situs dokumentasi) mengikuti [pedoman brand](docs/brand.md) dan skill desain di `.claude/skills/`.

## Test

- Test ada di `packages/*/test/` dan dijalankan dengan `node:test`. Tambahkan test untuk setiap perilaku baru dan setiap bug yang diperbaiki.
- Test yang menyentuh AI memakai provider tiruan (lihat `packages/zentara/test/ai/`), tidak pernah API sungguhan.
- Perubahan pada aturan keamanan Zentara AI (path terlarang, risiko tool, persetujuan, sensor rahasia) wajib disertai test yang membuktikan aturan itu tetap berlaku.

## Pull request

1. Buat branch dari `main`.
2. Pastikan `npm run build`, `npm run typecheck`, dan `npm test` lulus di komputer Anda; jalankan `npm run e2e` bila perubahan menyentuh CLI, template, atau proses publish.
3. Perbarui dokumentasi (id dan en) dan CHANGELOG (id dan en) bila perubahan terlihat oleh pengguna.
4. Di deskripsi PR, jelaskan apa yang berubah bagi pengguna dan bagaimana Anda mengujinya.
5. CI (`.github/workflows/ci.yml`) menjalankan build, typecheck, test (Node 22 & 24, dengan PostgreSQL), build dokumentasi, dan e2e (Ubuntu & Windows). PR hanya digabung bila semuanya hijau dan pemilik repo menyetujuinya.

Versi dan rilis diurus pemilik repo (`node scripts/version.mjs <versi>` lalu GitHub Release); lihat [PUBLISHING.md](PUBLISHING.md). Kontributor tidak perlu menaikkan versi di PR.

---

## English

Thanks for helping out. This guide covers setting up the repo, the working rules this project follows, and what is checked before a pull request (PR) is merged.

### Before you start

- **Bugs and ideas** go to [Issues](https://github.com/melkimahdali/zentara-core/issues). For security vulnerabilities, **do not** open a public issue: follow [SECURITY.md](SECURITY.md).
- **Large changes** (new features, API changes, changes to the contract in [`CORE_SPEC.md`](CORE_SPEC.md)) should be discussed in an issue first, so they don't collide with the stage currently in progress on the [roadmap](docs/en/peta-jalan.md).
- The big picture of the code is in the [architecture docs](docs/en/arsitektur.md).

### Setting up the repo

Requires Node.js 22 or newer (CI tests Node 22 and 24, on Ubuntu and Windows).

```bash
git clone https://github.com/melkimahdali/zentara-core.git
cd zentara-core
npm install          # installs both workspaces: packages/zentara and packages/create-zentara
npm run build
npm run typecheck
npm test
```

| Command | Purpose |
|---|---|
| `npm run build` | build both packages (`tsc`) |
| `npm run typecheck` | type-check without building |
| `npm test` | unit/integration tests for both packages (`node:test` + `tsx`) and the release script tests |
| `npm run e2e` | publish simulation: `npm pack`, create a project from the tarballs, install, test, run the server, global CLI, Zentara AI tools, and the interactive create-project flow |
| `npm run docs:build` / `npm run docs:serve` | build and preview the documentation site (run `npm run build` first) |
| `npm run ai-smoke` | test Zentara AI against a real provider; **uses API credits**, so it only runs manually |

PostgreSQL tests are skipped unless `ZENTARA_TEST_POSTGRES_URL` is set (CI provides one through a service container). Locally:

```bash
docker run --rm -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=zentara_test postgres:16
ZENTARA_TEST_POSTGRES_URL=postgres://postgres:postgres@localhost:5432/zentara_test npm test
```

Tests use a temporary `ZENTARA_HOME` and unset `ZENTARA_LANG` (see `packages/zentara/test/setup.mjs`), so your own `zentara lang` preference does not affect the results.

### Working rules

These rules apply to every change and are checked in review:

1. **One stage per PR.** Roadmap work is done stage by stage; a PR does not mix stages. Small fixes outside a stage can be their own PR.
2. **Every bug found in real use goes into e2e.** If a bug shows up while using Zentara (not just in tests), add a scenario that reproduces it to `scripts/e2e.mjs`, not only a unit test.
3. **Every feature is available through the CLI and Zentara AI, in the terminal and the browser.** A new CLI command must also be runnable by the AI (see the `zentara` tool in `packages/zentara/src/ai/tools.ts`), and work in the interactive CLI and the browser chat.
4. **Indonesian and English always ship together.** See [below](#both-languages).
5. **The contract in `CORE_SPEC.md` only changes on purpose.** Changing a behavior listed there is a *breaking change*: update `CORE_SPEC.md` in the same PR and call it out in the CHANGELOG.
6. **Nothing is merged without the repo owner's approval.**

### Both languages

All user-facing text exists in Indonesian and English:

- **Text in code** (CLI, built-in pages, error messages, UI kit, AI instructions) is never written inline; it lives in the catalogs under `packages/zentara/src/i18n/id/` and `packages/zentara/src/i18n/en/` and is read with `t()`. The Indonesian catalog is the source of the `Messages` type, so a missing translation fails `typecheck`.
- **Project templates:** `packages/create-zentara/templates/` is Indonesian; English replacement files live in `packages/create-zentara/locales/en/` under the same paths.
- **Documentation:** every `docs/<name>.md` page has a `docs/en/<name>.md` counterpart with the same file name (slug).
- **CHANGELOG:** add entries to both `CHANGELOG.md` and `CHANGELOG.en.md`.
- **Root documents** (README, this guide) contain both languages in one file.

### Code style

- TypeScript ESM (`"type": "module"`); local imports use the `.js` extension.
- There is no separate linter or formatter: follow the style of the surrounding file and keep `npm run typecheck` clean.
- Code comments and commit messages are written in Indonesian, short, and explain *why*.
- Avoid new dependencies in the `zentara` package unless truly needed; optional dependencies (e.g. `drizzle-orm`, `postgres`) are loaded only when used.
- UI work (UI kit, built-in pages, docs site) follows the [brand guide](docs/en/brand.md) and the design skills in `.claude/skills/`.

### Tests

- Tests live in `packages/*/test/` and run with `node:test`. Add tests for every new behavior and every bug fix.
- Tests that involve the AI use fake providers (see `packages/zentara/test/ai/`), never a real API.
- Changes to Zentara AI's safety rules (forbidden paths, tool risk levels, approvals, secret redaction) must come with tests proving the rule still holds.

### Pull requests

1. Branch from `main`.
2. Make sure `npm run build`, `npm run typecheck`, and `npm test` pass locally; run `npm run e2e` when the change touches the CLI, templates, or publishing.
3. Update the docs (id and en) and the CHANGELOG (id and en) when the change is visible to users.
4. In the PR description, explain what changes for users and how you tested it.
5. CI (`.github/workflows/ci.yml`) runs build, typecheck, tests (Node 22 & 24, with PostgreSQL), the docs build, and e2e (Ubuntu & Windows). A PR is merged only when all of it is green and the repo owner approves.

Versions and releases are handled by the repo owner (`node scripts/version.mjs <version>` then a GitHub Release); see [PUBLISHING.md](PUBLISHING.md). Contributors don't need to bump versions in a PR.
