# Aplikasi Zusantara

Dibuat dengan `npm create zusantara@latest` (template **minimal**).

```bash
npx zusantara                                  # chat dengan Zusantara AI + server dev (tanya dulu)
npm run dev                                  # atau server saja: http://localhost:3000
npx zusantara make:route api/pesan --methods GET,POST
npx zusantara "buatkan halaman tentang kami"   # satu perintah AI (atur dulu: npx zusantara ai:setup)
npm run build && npm start                   # produksi
```

Butuh database dan login? Buat proyek baru dengan template **api**: `npm create zusantara@latest -- --template api`.

Dokumentasi: https://zusantara.morixa.id/
