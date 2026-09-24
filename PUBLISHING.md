# Panduan publish ke npm

Panduan langkah demi langkah untuk merilis `zentara` dan `create-zentara`. Publish di npm **permanen**:
- nomor versi yang sudah dipakai tidak bisa dipakai ulang;
- paket hanya bisa ditarik (unpublish) dalam 72 jam pertama.

Karena itu, selalu jalankan pemeriksaan dulu.

## A. Persiapan (sekali saja)

1. **Buat akun** di https://www.npmjs.com/signup, lalu verifikasi email.
2. **Aktifkan 2FA** di *Account Settings → Two-Factor Authentication* (aplikasi authenticator atau passkey).
3. **Login dari terminal** di komputer Anda:
   ```bash
   npm login
   npm whoami        # harus menampilkan username Anda
   ```

## B. Publish pertama (manual, dari komputer Anda)

Trusted Publishing hanya bisa diatur untuk paket yang sudah ada, jadi rilis pertama dilakukan manual.

```bash
git clone https://github.com/melkimahdali/zentara-core.git   # atau: git checkout main && git pull
cd zentara-core
npm ci
npm test
npm run e2e          # WAJIB lulus: simulasi publish lengkap
```

Periksa isi paket. Pastikan tidak ada `.env`, `src/`, `test/`, atau file database:

```bash
npm pack --dry-run -w zentara
npm pack --dry-run -w create-zentara
```

Publish (npm akan meminta kode 2FA):

```bash
npm publish -w zentara --access public
npm publish -w create-zentara --access public
```

Lalu cek hasilnya:
- Buka https://www.npmjs.com/package/zentara dan https://www.npmjs.com/package/create-zentara.
- Coba dari folder lain:
  ```bash
  cd /tmp && npm create zentara@latest coba-zentara
  cd coba-zentara && npm run dev
  ```

## C. Hubungkan GitHub untuk rilis otomatis (Trusted Publishing)

Lakukan untuk **kedua** paket (`zentara` dan `create-zentara`):

1. Buka halaman paket di npmjs.com, lalu **Settings**.
2. Di bagian **Trusted Publisher**, pilih **GitHub Actions** dan isi:
   - Organization or user: `melkimahdali`
   - Repository: `zentara-core`
   - Workflow filename: `release.yml`
   - Environment: *(kosongkan)*
3. Simpan.
4. (Disarankan) Di *Publishing access*, pilih **Require two-factor authentication and disallow tokens**, supaya paket hanya bisa di-publish lewat 2FA atau workflow tepercaya.

Dengan cara ini tidak ada token npm yang disimpan di GitHub. Workflow membuktikan identitasnya ke npm lewat OIDC, dan setiap rilis mendapat tanda **provenance** (bukti paket dibangun dari repo ini).

## D. Rilis berikutnya

1. Naikkan versi kedua paket:
   ```bash
   node scripts/version.mjs 0.6.1       # patch: perbaikan bug; minor (0.7.0): fitur baru
   npm install                          # memperbarui package-lock.json
   ```
2. Tulis perubahan di `CHANGELOG.md`.
3. Commit, buat PR, tunggu CI hijau, lalu merge ke `main`.
4. Di GitHub, buka **Releases → Draft a new release**. Buat tag **`v0.6.1`** (harus sama persis dengan versi), isi catatan rilis, lalu **Publish release**.
5. Workflow **Release** di tab *Actions* akan menjalankan test dan simulasi publish, mencocokkan tag dengan versi, lalu mem-publish kedua paket. Versi yang sudah ada di npm dilewati, jadi aman dijalankan ulang.

## Masalah umum

| Pesan | Penyebab & solusi |
|---|---|
| `ENEEDAUTH` / `E401` | belum login: `npm login` |
| `EOTP` | masukkan kode 2FA saat diminta (atau `--otp=123456`) |
| `E403 ... You do not have permission` | nama paket sudah dipakai orang lain, atau Anda bukan pemiliknya |
| `cannot publish over the previously published versions` | naikkan versi dulu (`node scripts/version.mjs ...`) |
| Workflow gagal `404`/`E403` saat publish | Trusted Publisher belum diatur untuk paket itu, atau nama repo/file workflow tidak sama persis |
| Workflow gagal: tag tidak cocok | tag rilis harus `v` + versi di `package.json`, mis. `v0.6.1` |

## Jika terlanjur salah publish

- **Dalam 72 jam:** `npm unpublish zentara@0.6.1`.
- **Lewat 72 jam:** tandai sebagai usang dengan `npm deprecate zentara@0.6.1 "Ada bug, pakai 0.6.2"`, lalu rilis versi perbaikan.
