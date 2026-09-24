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

## C. Hubungkan GitHub untuk rilis otomatis (Trusted Publishing + staging)

Lakukan untuk **kedua** paket (`zentara` dan `create-zentara`):

1. Buka halaman paket di npmjs.com, lalu **Settings**.
2. Di bagian **Trusted Publisher**, pilih **GitHub Actions** dan isi:
   - Organization or user: `melkimahdali`
   - Repository: `zentara-core`
   - Workflow filename: `release.yml`
   - Environment: *(kosongkan)*
3. **Kosongkan** centang **"Allow npm publish"** (disarankan npm). Dengan begitu workflow hanya bisa **menitipkan** (*stage*) versi baru, dan versi itu baru tayang setelah Anda setujui dengan 2FA.
4. Di *Publishing access*, pilih **"Require two-factor authentication and disallow bypass 2fa tokens"**.

Dengan cara ini:
- tidak ada token npm yang disimpan di GitHub;
- setiap rilis punya tanda **provenance** (hanya bila repo GitHub **publik**; untuk repo private, workflow otomatis merilis tanpa provenance);
- walaupun repo GitHub dibobol, versi berbahaya tetap tertahan sampai Anda setujui.

## D. Rilis berikutnya

1. Naikkan versi kedua paket:
   ```bash
   node scripts/version.mjs 0.6.2       # patch: perbaikan bug; minor (0.7.0): fitur baru
   npm install                          # memperbarui package-lock.json
   ```
2. Tulis perubahan di `CHANGELOG.md`.
3. Commit, buat PR, tunggu CI hijau, lalu merge ke `main`.
4. Di GitHub, buka **Releases → Draft a new release**. Buat tag **`v0.6.2`** (harus sama persis dengan versi), isi catatan rilis, lalu **Publish release**.
5. Workflow **Release** di tab *Actions* akan menjalankan test dan simulasi publish, mencocokkan tag dengan versi, lalu **menitipkan** kedua paket di npm.
6. **Setujui** dari komputer Anda (di folder clone repo ini, setelah `git pull`):
   ```bash
   npm install -g npm@11                # sekali saja: "npm stage" butuh npm ≥ 11.16
   npm run release:approve              # diminta kode 2FA untuk tiap paket
   ```
   Perintah ini mengambil ID stage dari run Release terakhir (anotasi publik GitHub, atau log untuk run lama), melewati versi yang sudah tayang, lalu menjalankan `npm stage approve` dan mengecek registry sampai versi baru terlihat. `npm run release:approve -- --dry-run` hanya menampilkan apa yang akan disetujui.

   `npm stage list <paket>` bisa menampilkan data server npm yang tertinggal (versi yang sudah disetujui tetap berstatus `staged`, versi baru belum muncul), jadi jangan dijadikan patokan. ID juga tertera di ringkasan run Release (*Actions → Release → run terakhir*). Untuk memeriksa isi paket sebelum menyetujui, gunakan `npm stage download <stage-id>`. Kalau ada yang salah, tolak dengan `npm stage reject <stage-id>`, perbaiki, lalu buat rilis baru.

## Masalah umum

| Pesan | Penyebab & solusi |
|---|---|
| `ENEEDAUTH` / `E401` | belum login: `npm login` |
| `EOTP` | masukkan kode 2FA saat diminta (atau `--otp=123456`) |
| `E403 ... You do not have permission` | nama paket sudah dipakai orang lain, atau Anda bukan pemiliknya |
| `cannot publish over the previously published versions` | naikkan versi dulu (`node scripts/version.mjs ...`) |
| Workflow gagal `404`/`E403` saat stage publish | Trusted Publisher belum diatur untuk paket itu, atau nama repo/file workflow tidak sama persis |
| `422 ... Unsupported GitHub Actions source repository visibility: "private"` | provenance butuh repo publik. Workflow sekarang otomatis mematikan provenance untuk repo private; jadikan repo publik bila ingin provenance |
| `npm stage`: perintah tidak dikenal | perbarui npm: `npm install -g npm@11` |
| `EBADENGINE` saat memasang npm 12 | npm 12 butuh Node ≥ 24.15; pakai `npm install -g npm@11` atau perbarui Node |
| PowerShell: `The '<' operator is reserved` | `<stage-id>` hanya contoh isian; ganti dengan ID dari `npm stage list`, tanpa `<` `>` |
| Versi tidak muncul di npm setelah rilis | belum disetujui: `npm run release:approve` |
| `npm stage list` menampilkan versi lama / `approve` menjawab `E404 staged version not found` | daftar dari server npm tertinggal; pakai `npm run release:approve` (ID diambil dari run Release) |
| Workflow gagal: tag tidak cocok | tag rilis harus `v` + versi di `package.json`, mis. `v0.6.1` |

## Jika terlanjur salah publish

- **Dalam 72 jam:** `npm unpublish zentara@0.6.1`.
- **Lewat 72 jam:** tandai sebagai usang dengan `npm deprecate zentara@0.6.1 "Ada bug, pakai 0.6.2"`, lalu rilis versi perbaikan.
