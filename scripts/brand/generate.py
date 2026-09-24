"""Buat aset brand kecil untuk framework dari master PNG (tanpa desain ulang).

Pemakaian (butuh Python 3 + Pillow):
    python3 scripts/brand/generate.py assets/brand/master/zentara-logo-original.png

Menghasilkan packages/zentara/src/brand/assets.ts:
- LOGO_WEBP: logo 160 px (WebP, base64) untuk halaman bawaan;
- FAVICON_PNG: favicon 32 px (PNG, base64);
- LOGO_TERMINAL: logo flat 24 kolom untuk banner terminal (tanpa motif, garis emas dikunci ke grid).
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

# Logo terminal: versi flat sesuai pedoman (motif Nusantara dihapus pada ukuran mikro, tanpa gradasi).
# 1) Pada 512 px: teal flat, garis emas inti tetap emas, garis motif & emas motif menjadi teal.
S = 512
im = src.resize((S, S), Image.LANCZOS); p = im.load()
lum = lambda r, g, b: 0.2126 * r + 0.7152 * g + 0.0722 * b
isgold = lambda q: q[3] > 110 and q[0] > q[1] and q[0] > 120

def fit(points):
    n = len(points); my = sum(q[0] for q in points) / n; mx = sum(q[1] for q in points) / n
    b = sum((q[0] - my) * (q[1] - mx) for q in points) / sum((q[0] - my) ** 2 for q in points)
    return mx - b * my, b

pts = [(y, next(x for x in range(S) if isgold(p[x, y]))) for y in range(40, 470) if any(isgold(p[x, y]) for x in range(S))]
a, b = fit(pts)
a, b = fit([q for q in pts if abs(q[1] - (a + b * q[0])) < 25])
wid = sorted(max(xs) - min(xs) for y in range(100, 420, 20) if (xs := [x for x in range(S) if isgold(p[x, y]) and abs(x - (a + b * y)) < 40]))[4]
flat = [[0] * S for _ in range(S)]  # 0 kosong, 1 teal
for y in range(S):
    for x in range(S):
        q = p[x, y]
        if q[3] < 110: continue
        d = x - (a + b * y)
        motif = 205 <= x <= 455 and 165 <= y <= 350
        if isgold(q) or lum(*q[:3]) >= 70: flat[y][x] = 1
        elif motif and not (-14 <= d <= wid + 16): flat[y][x] = 1

# 2) Ke grid terminal 24x24: garis emas & celahnya dikunci ke diagonal sel agar tidak bergerigi.
N = 24; bw = S / N
s0 = round((a + b * 256 + wid / 2) / bw - 0.5 + 256 / bw - 0.5)
grid = []
for gy in range(N):
    row = ""
    for gx in range(N):
        cells = [(x, y) for y in range(int(gy * bw), int((gy + 1) * bw), 2) for x in range(int(gx * bw), int((gx + 1) * bw), 2)]
        k = gx + gy
        if abs(k - s0) <= 1:
            inside = sum(p[x, y][3] > 110 for x, y in cells) / len(cells) >= 0.5
        else:
            inside = sum(flat[y][x] for x, y in cells) / len(cells) >= 0.5
        row += "G" if k == s0 and inside else "." if abs(k - s0) == 1 else "T" if inside else "."
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
    "/** Logo terminal (versi flat): T = Zentara Teal, G = Heritage Gold, . = kosong. Satu baris teks = dua baris piksel. */\n"
    "export const LOGO_TERMINAL: readonly string[] = [\n" + "".join(f'  "{r}",\n' for r in rows) + "];\n"
)
print(out, out.stat().st_size, "byte")
