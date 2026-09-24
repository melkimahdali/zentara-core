# Aplikasi Zentara

Dibuat dengan `npm create zentara@latest` (template **minimal**).

```bash
npx zentara                                  # chat dengan Zentara AI + server dev (tanya dulu)
npm run dev                                  # atau server saja: http://localhost:3000
npx zentara make:route api/produk --methods GET,POST
npx zentara "buatkan halaman tentang kami"   # satu perintah AI (atur dulu: npx zentara ai:setup)
npm run build && npm start                   # produksi
```

Butuh database dan login? Buat proyek baru dengan template **api**: `npm create zentara@latest -- --template api`.

Dokumentasi: https://github.com/melkimahdali/zentara-core
