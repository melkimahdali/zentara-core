# create-zusantara

**English** · [Bahasa Indonesia](#bahasa-indonesia)

Create a new [Zusantara](https://www.npmjs.com/package/zusantara) project with one command:

```bash
npm create zusantara@latest my-app -- --lang en
```

| Template | Contents |
|---|---|
| `api` | sign-in/sign-up, SQLite database (Drizzle), a user-owned notes CRUD example, a welcome-email background job, rate limiting, tests |
| `minimal` | a simple page & API, no database |

Options: `--lang id|en`, `--template api|minimal`, `--no-install`, `--yes` (no questions). With npm, separate the options with `--`, e.g. `npm create zusantara@latest site -- --template minimal --lang en`.

`create-zusantara` writes a `.env` with a random `SESSION_SECRET`, installs dependencies, and (for the `api` template) runs the migrations and seed right away. The project is then ready for `npm run dev`. Documentation: https://zusantara.morixa.id/en/

License: MIT, see [LICENSE](https://github.com/melkimahdali/zusantara-core/blob/main/LICENSE). Projects created with `create-zusantara` are entirely yours.

## Bahasa Indonesia

```bash
npm create zusantara@latest aplikasi-saya
```

| Template | Isi |
|---|---|
| `api` | login/register, database SQLite (Drizzle), contoh CRUD catatan milik user, job email sambutan, rate limit, test |
| `minimal` | halaman & API sederhana, tanpa database |

Opsi: `--lang id|en`, `--template api|minimal`, `--no-install`, `--yes` (tanpa pertanyaan). Bila memakai npm, pisahkan opsi dengan `--`, mis. `npm create zusantara@latest situs -- --template minimal`.

`create-zusantara` membuat `.env` dengan `SESSION_SECRET` acak, memasang dependency, dan (untuk template `api`) langsung menjalankan migrasi dan seed. Setelah itu proyek siap dijalankan dengan `npm run dev`. Dokumentasi: https://zusantara.morixa.id/

Lisensi MIT. Proyek yang dibuat dengan `create-zusantara` adalah milik Anda sepenuhnya.
