# Aplikasi Zentara

Dibuat dengan `npm create zentara@latest` (template **minimal**).

```bash
npm run dev                                  # http://localhost:3000
npx zentara make:route api/produk --methods GET,POST
npx zentara "buatkan halaman tentang kami"   # minta Zentara AI (lihat: npx zentara ai:setup)
npm run build && npm start                   # produksi
```

Butuh database dan login? Buat proyek baru dengan template **api**: `npm create zentara@latest -- --template api`.

Dokumentasi: https://github.com/melkimahdali/zentara-core
