# create-zentara

**English** · [Bahasa Indonesia](#bahasa-indonesia)

Create a new [Zentara](https://www.npmjs.com/package/zentara) project with one command:

```bash
npm create zentara@latest my-app -- --lang en
```

| Template | Contents |
|---|---|
| `api` | sign-in/sign-up, SQLite database (Drizzle), a user-owned notes CRUD example, a welcome-email background job, rate limiting, tests |
| `minimal` | a simple page & API, no database |

Options: `--lang id|en`, `--template api|minimal`, `--no-install`, `--yes` (no questions). With npm, separate the options with `--`, e.g. `npm create zentara@latest site -- --template minimal --lang en`.

`create-zentara` writes a `.env` with a random `SESSION_SECRET`, installs dependencies, and (for the `api` template) runs the migrations and seed right away. The project is then ready for `npm run dev`. Documentation: https://zentara-core.morixa.id/en/

License: Business Source License 1.1 (BSL), see [LICENSE](https://github.com/melkimahdali/zentara-core/blob/main/LICENSE). Projects created with `create-zentara` are entirely yours.

## Bahasa Indonesia

```bash
npm create zentara@latest aplikasi-saya
```

| Template | Isi |
|---|---|
| `api` | login/register, database SQLite (Drizzle), contoh CRUD catatan milik user, job email sambutan, rate limit, test |
| `minimal` | halaman & API sederhana, tanpa database |

Opsi: `--lang id|en`, `--template api|minimal`, `--no-install`, `--yes` (tanpa pertanyaan). Bila memakai npm, pisahkan opsi dengan `--`, mis. `npm create zentara@latest situs -- --template minimal`.

`create-zentara` membuat `.env` dengan `SESSION_SECRET` acak, memasang dependency, dan (untuk template `api`) langsung menjalankan migrasi dan seed. Setelah itu proyek siap dijalankan dengan `npm run dev`. Dokumentasi: https://zentara-core.morixa.id/

Lisensi Business Source License 1.1 (BSL). Proyek yang dibuat dengan `create-zentara` adalah milik Anda sepenuhnya.
