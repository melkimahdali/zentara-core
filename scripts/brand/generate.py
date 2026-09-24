"""Buat aset brand kecil untuk framework dari master PNG (tanpa desain ulang).

Pemakaian (butuh Python 3 + Pillow):
    python3 scripts/brand/generate.py assets/brand/master/zentara-logo-original.png

Menghasilkan packages/zentara/src/brand/assets.ts:
- LOGO_WEBP: logo 160 px (WebP, base64) untuk halaman bawaan;
- FAVICON_PNG: favicon 32 px (PNG, base64);
- LOGO_PIXELS: logo 32x32 px (hex per piksel, "." = transparan) untuk banner terminal.
"""
import base64, io, sys
from pathlib import Path
from PIL import Image

src = Image.open(sys.argv[1]).convert("RGBA")
root = Path(__file__).resolve().parents[2]

def encode(img, fmt, **kw):
    buf = io.BytesIO(); img.save(buf, fmt, **kw); return base64.b64encode(buf.getvalue()).decode()

logo = encode(src.resize((160, 160), Image.LANCZOS), "WEBP", quality=90, method=6)
fav_src = Image.open(sys.argv[2]).convert("RGBA") if len(sys.argv) > 2 else src.resize((32, 32), Image.LANCZOS)
favicon = encode(fav_src, "PNG", optimize=True)

px = src.resize((32, 32), Image.LANCZOS).load()
rows = []
for y in range(32):
    row = []
    for x in range(32):
        r, g, b, a = px[x, y]
        row.append("." if a < 110 else f"{r:02x}{g:02x}{b:02x}")
    rows.append(" ".join(row))

out = root / "packages/zentara/src/brand/assets.ts"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(
    "// Dibuat oleh scripts/brand/generate.py dari master logo Zentara Core. Jangan diedit manual.\n"
    f'export const LOGO_WEBP = "data:image/webp;base64,{logo}";\n'
    f'export const FAVICON_PNG = "data:image/png;base64,{favicon}";\n'
    "/** Logo 32x32 px untuk terminal: hex RGB per piksel, \".\" = transparan. */\n"
    "export const LOGO_PIXELS: readonly string[] = [\n" + "".join(f'  "{r}",\n' for r in rows) + "];\n"
)
print(out, out.stat().st_size, "byte")
