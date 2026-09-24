# create-zentara

Buat proyek [Zentara](https://www.npmjs.com/package/zentara) baru dengan satu perintah:

```bash
npm create zentara@latest toko-saya
```

Pilih template:

| Template | Isi |
|---|---|
| `api` | login/register, database SQLite (Drizzle), CRUD produk, rate limit, test |
| `minimal` | halaman & API sederhana, tanpa database |

Opsi: `--template api|minimal`, `--no-install`, `--yes` (tanpa pertanyaan). Bila memakai npm, pisahkan opsi dengan `--`, mis. `npm create zentara@latest toko -- --template minimal`.

`create-zentara` membuat `.env` dengan `SESSION_SECRET` acak, memasang dependency, dan (untuk template `api`) langsung menjalankan migrasi dan seed. Setelah itu proyek siap dijalankan dengan `npm run dev`.

Lisensi Business Source License 1.1 (BSL), lihat [LICENSE](https://github.com/melkimahdali/zentara-core/blob/main/LICENSE). Proyek yang dibuat dengan `create-zentara` adalah milik Anda sepenuhnya.
