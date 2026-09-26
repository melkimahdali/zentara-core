# ZUSANTARA CORE: PAKET ASLI DARI GAMBAR TERPILIH

SUMBER TUNGGAL: file gambar yang Anda unggah (1254 × 1254 px), tanpa desain ulang, tracing yang mengubah bentuk, penggantian motif, atau rekonstruksi garis emas.

## Master
- `master/zusantara-logo-original.png`: salinan byte-for-byte dari gambar asli; bentuk dan semua detail persis sama.
- `master/zusantara-master-presisi.svg`: SVG yang meng-embed PNG asli di dalam elemen `<image>`; tampilan sama pada ukuran asli, tetapi BUKAN path vektor editable. Pembesaran di luar resolusi sumber akan tetap menghadapi keterbatasan gambar raster. Master vektor sejati yang identik memerlukan penelusuran path manual dari sumber.

## Favicon
- `favicon/zusantara-favicon.svg`: favicon SVG dengan gambar asli yang dikecilkan dan latar gelap.
- `favicon/zusantara-favicon.ico`: ICO multiukuran 16, 32, 48, 64 px.
- `favicon/zusantara-favicon-{16,32,48,64,180,192,512}.png`: sumber sama dengan padding kecil agar tidak menyentuh batas.
- Saat favicon 16 px, detail motif pasti berkurang secara optik karena jumlah piksel; artwork dasarnya tidak digambar ulang.

## Terminal / ASCII / ANSI
- `terminal/zusantara-ascii-source-original.png`: gambar asli untuk di-upload ke image-to-ASCII/ANSI converter.
- `terminal/zusantara-terminal-source-512.png`: versi diperkecil dari file yang sama.
- `terminal/zusantara-logo-ansi-truecolor.txt`: versi ANSI TrueColor dengan karakter Unicode half-block (▀); ini aproksimasi resolusi terminal, bukan SVG / rendering identik.
- `terminal/zusantara-logo-monochrome.txt`: fallback karakter Unicode satu warna.
- Untuk menampilkan ANSI di terminal, gunakan program yang mendukung VT/ANSI dan TrueColor. Catatan: aplikasi yang menghapus escape sequence akan menampilkan output tanpa warna.

Prinsip: artwork master selalu bersumber dari gambar yang dipilih, bukan gambar baru dari generator.
