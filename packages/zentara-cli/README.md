# zentara-cli

Tampilan terminal **Zentara Core** berbasis [Ink](https://github.com/vadimdemedes/ink): chat dengan Zentara AI bergaya Claude Code, dengan:
- logo dan info di atas;
- jawaban yang mengalir;
- kotak input di bawah dengan saran perintah garis miring;
- dialog persetujuan berwarna;
- baris status server dev dan mode.

Paket ini opsional. Perintah `zentara` memakainya otomatis bila terpasang di tempat yang sama. Tanpa paket ini, `zentara` memakai CLI bawaannya.

```bash
npm install -g zentara zentara-cli
zentara
```

- `zentara --classic` (atau `ZENTARA_UI=classic`) memaksa CLI bawaan.
- Versi `zentara-cli` harus sama dengan `zentara`. Perbarui keduanya bersamaan: `npm install -g zentara@latest zentara-cli@latest`.

Dipisah dari paket `zentara` agar proyek yang memakai framework tidak ikut memasang Ink dan React (±25 MB), karena tampilan ini hanya dibutuhkan di terminal pengembang.

Dokumentasi: https://melkimahdali.github.io/zentara-core/cli-interaktif.html

Lisensi Business Source License 1.1, lihat [LICENSE](LICENSE).
