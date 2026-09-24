<p align="center"><img src="assets/zentara-logo.png" alt="Zentara" width="160"></p>

# Zentara

Framework web TypeScript **AI-driven asal Nusantara**. Tulis apa yang Anda mau dalam bahasa sehari-hari, lalu Zentara AI yang mengerjakan langkah teknisnya, dengan persetujuan Anda dan selalu diverifikasi dengan test.

```bash
npm create zentara@latest toko-saya
cd toko-saya
npm run dev
npx zentara "tambahkan fitur keranjang belanja untuk user yang login"
```

Fitur utama:
- **Routing berbasis file** dan validasi input (zod/valibot/arktype).
- **Keamanan bawaan:** session terenkripsi, CSRF, CORS, dan rate limit.
- **Database** Drizzle ORM: SQLite tanpa instalasi, atau PostgreSQL.
- **Auth** dengan scrypt dan role.
- **Zentara AI** dengan fallback otomatis Claude → OmniRoute → Ollama.

## Paket di repo ini

| Paket | Keterangan |
|---|---|
| [`packages/zentara`](packages/zentara) | framework + CLI `zentara`. **Dokumentasi lengkap ada di sini.** |
| [`packages/create-zentara`](packages/create-zentara) | `npm create zentara` beserta template `api` dan `minimal` |

## Pengembangan framework

```bash
npm install          # memasang workspace
npm run build        # build kedua paket
npm test             # test kedua paket
npm run e2e          # simulasi publish: npm pack, buat proyek dari tarball, install, test, jalankan server
```

- Spesifikasi kontrak inti: [`CORE_SPEC.md`](CORE_SPEC.md).
- Cara merilis ke npm: [`PUBLISHING.md`](PUBLISHING.md).
- Riwayat perubahan: [`CHANGELOG.md`](CHANGELOG.md).

Lisensi [MIT](LICENSE).
