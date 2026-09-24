"""Buat aset brand kecil untuk framework dari master PNG (tanpa desain ulang).

Pemakaian (butuh Python 3 + Pillow):
    python3 scripts/brand/generate.py assets/brand/master/zentara-logo-original.png

Menghasilkan packages/zentara/src/brand/assets.ts:
- LOGO_WEBP: logo 160 px (WebP, base64) untuk halaman bawaan;
- FAVICON_PNG: favicon 32 px (PNG, base64);
- LOGO_TERMINAL: logo 48 kolom untuk banner terminal (lengkap dengan motif, warna brand flat per sel).
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

# Logo terminal: logo asli lengkap dengan motif, diposterisasi ke warna brand flat (teal / emas / kosong)
# per sel. Tanpa gradasi (sumber "kotor" di ukuran kecil) dan tanpa latar gelap (rapi di terminal terang).
S = 1024
big = src.resize((S, S), Image.LANCZOS); p = big.load()
lum = lambda r, g, b: 0.2126 * r + 0.7152 * g + 0.0722 * b

def kind(q):
    if q[3] < 110: return "."
    if q[0] > q[1] and q[0] > 120: return "G"
    return "." if lum(*q[:3]) < 70 else "T"

N = 48; bw = S / N
grid = []
for gy in range(N):
    row = ""
    for gx in range(N):
        cnt = {".": 0, "T": 0, "G": 0}
        for y in range(int(gy * bw), int((gy + 1) * bw), 2):
            for x in range(int(gx * bw), int((gx + 1) * bw), 2):
                cnt[kind(p[x, y])] += 1
        n = sum(cnt.values())
        row += "G" if cnt["G"] / n >= 0.3 else "T" if cnt["T"] / n >= 0.45 else "."
    grid.append(row)
while grid and set(grid[0]) == {"."}: grid.pop(0)
while grid and set(grid[-1]) == {"."}: grid.pop()
if len(grid) % 2: grid.append("." * N)
rows = grid

out = root / "packages/zentara/src/brand/assets.ts"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(
    "// Dibuat oleh scripts/brand/generate.py dari master logo Zentara Core. Jangan diedit manual.\n"
    f'export const LOGO_WEBP = "data:image/webp;base64,{logo}";\n'
    f'export const FAVICON_PNG = "data:image/png;base64,{favicon}";\n'
    "/** Logo terminal (motif lengkap, warna flat): T = Zentara Teal, G = Heritage Gold, . = kosong. Satu baris teks = dua baris piksel. */\n"
    "export const LOGO_TERMINAL: readonly string[] = [\n" + "".join(f'  "{r}",\n' for r in rows) + "];\n"
)
print(out, out.stat().st_size, "byte")
