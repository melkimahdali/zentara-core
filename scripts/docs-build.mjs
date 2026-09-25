// Bangun situs dokumentasi Zentara Core dari docs/*.md menjadi HTML statis di site-dist/.
//   npm run docs:build      (butuh `npm run build` lebih dulu: memakai brand & highlighter dari paket zentara)
//   npm run docs:serve      pratinjau lokal di http://localhost:4173
// Diterbitkan ke GitHub Pages oleh .github/workflows/docs.yml.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Marked } from "marked";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOCS = path.join(ROOT, "docs");
const OUT = path.join(ROOT, "site-dist");
const DIST = path.join(ROOT, "packages", "zentara", "dist");
const REPO = "https://github.com/melkimahdali/zentara-core";
const GROUPS = ["Memulai", "Zentara AI", "Dasar", "Front-End", "Data & Keamanan", "Referensi"];

const load = (rel) => import(pathToFileURL(path.join(DIST, rel)).href);
if (!fs.existsSync(path.join(DIST, "brand", "assets.js"))) {
  console.error("Paket zentara belum di-build. Jalankan dulu: npm run build");
  process.exit(1);
}
const { LOGO_WEBP, FAVICON_PNG } = await load("brand/assets.js");
const { BRAND, TAGLINE, DESCRIPTION, DOCS_URL } = await load("brand/index.js");
/** Domain kustom GitHub Pages (Cloudflare → GitHub Pages). */
const SITE = new URL(DOCS_URL);
const { BASE_CSS, highlight, ZENTARA_VERSION } = await load("core/devpage/theme.js");
const { escapeHtml } = await load("core/view.js");

// ── Baca halaman ─────────────────────────────────────────────────────────
function parse(file) {
  const raw = fs.readFileSync(file, "utf8");
  const m = /^---\n([\s\S]*?)\n---\n/.exec(raw);
  const meta = {};
  for (const line of (m?.[1] ?? "").split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { slug: path.basename(file, ".md"), title: meta.title, order: Number(meta.order ?? 99), group: meta.group, description: meta.description ?? "", body: raw.slice(m?.[0].length ?? 0) };
}
/**
 * Halaman "Catatan rilis" dibuat otomatis dari CHANGELOG.md, jadi situs selalu mengikuti versi terbaru
 * setiap kali perubahan (termasuk kenaikan versi) masuk ke main.
 */
function releaseNotes() {
  const raw = fs.readFileSync(path.join(ROOT, "CHANGELOG.md"), "utf8");
  const body = raw
    .replace(/^# Changelog\s*\n/, "")
    .replace(/^## \[([^\]]+)\]/gm, "## $1");
  return {
    slug: "rilis",
    title: "Catatan rilis",
    order: 99,
    group: "Referensi",
    description: `Perubahan di setiap versi Zentara Core. Versi terbaru: v${ZENTARA_VERSION}.`,
    body: `# Catatan rilis\n\nVersi terbaru: **v${ZENTARA_VERSION}**. Perbarui dengan \`npm install -g zentara@latest\` (CLI) dan \`npm install zentara@latest\` (proyek).\n\n${body}`,
    source: "CHANGELOG.md",
  };
}

const pages = [
  ...fs
    .readdirSync(DOCS)
    .filter((f) => f.endsWith(".md"))
    .map((f) => parse(path.join(DOCS, f))),
  releaseNotes(),
]
  .sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.order - b.order);
for (const p of pages) if (!GROUPS.includes(p.group)) throw new Error(`${p.slug}.md: group tidak dikenal "${p.group}"`);

// ── Markdown → HTML ──────────────────────────────────────────────────────
const slugify = (text) => text.toLowerCase().replace(/<[^>]+>/g, "").replace(/[`*]/g, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "");
function render(page) {
  const toc = [];
  const marked = new Marked({
    gfm: true,
    renderer: {
      heading({ tokens, depth }) {
        const inner = this.parser.parseInline(tokens);
        if (depth === 1) return `<h1>${inner}</h1>\n`;
        const id = slugify(inner);
        if (depth === 2) toc.push({ id, text: inner.replace(/<[^>]+>/g, "") });
        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-label="Tautan ke bagian ini">#</a>${inner}</h${depth}>\n`;
      },
      code({ text, lang }) {
        const code = ["ts", "js", "tsx", "javascript", "typescript"].includes(lang ?? "") ? highlight(text) : escapeHtml(text);
        return `<div class="code"><button class="copy" type="button">Salin</button><pre><code class="lang-${escapeHtml(lang ?? "")}">${code}</code></pre></div>\n`;
      },
      link({ href, title, tokens }) {
        const text = this.parser.parseInline(tokens);
        const external = /^https?:\/\//.test(href);
        return `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}${external ? ' target="_blank" rel="noopener"' : ""}>${text}</a>`;
      },
    },
  });
  // Tabel dibungkus agar bisa digeser di layar sempit.
  const html = marked.parse(page.body).replace(/<table>/g, '<div class="table-wrap"><table>').replace(/<\/table>/g, "</table></div>");
  return { html, toc };
}

// ── Tampilan ─────────────────────────────────────────────────────────────
const CSS = `
${BASE_CSS}
.doc-top{position:sticky;top:0;z-index:20;display:flex;align-items:center;gap:14px;padding:12px 22px;background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(10px);border-bottom:1px solid var(--border)}
.doc-top .zx-logo{width:30px;height:30px}
.doc-top .brand{display:flex;align-items:center;gap:10px;color:var(--text);font-weight:700;font-size:17px}
.doc-top .brand:hover{text-decoration:none}
.doc-top .ver{font-size:12px;color:var(--muted);border:1px solid var(--border);border-radius:999px;padding:2px 8px}.doc-top a.ver:hover{color:var(--text);border-color:var(--accent);text-decoration:none}
.search{position:relative;flex:1;max-width:420px;margin-left:auto}
.search input{width:100%;border:1px solid var(--border);background:var(--surface);color:var(--text);border-radius:10px;padding:8px 12px;font:inherit;font-size:14px}
.search input:focus{outline:0;border-color:var(--accent);box-shadow:0 0 0 3px var(--accent-soft)}
.results{position:absolute;top:44px;left:0;right:0;background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:var(--shadow);max-height:60vh;overflow:auto;display:none}
.results a{display:block;padding:10px 14px;color:var(--text);border-bottom:1px solid var(--border)}
.results a:hover,.results a.on{background:var(--surface-2);text-decoration:none}
.results small{display:block;color:var(--muted);font-size:12.5px}
.doc-top .gh{color:var(--muted);font-size:14px}
.menu-btn{display:none}
.layout{display:grid;grid-template-columns:250px minmax(0,1fr) 200px;gap:36px;max-width:1280px;margin:0 auto;padding:28px 22px 80px}
.side{position:sticky;top:78px;align-self:start;max-height:calc(100vh - 100px);overflow:auto;font-size:14.5px}
.side h4{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:18px 0 6px}
.side a{display:block;padding:5px 10px;border-radius:8px;color:var(--text)}
.side a:hover{background:var(--surface-2);text-decoration:none}
.side a.on{background:var(--accent-soft);color:var(--accent);font-weight:600}
.content{min-width:0;font-size:16px;line-height:1.75}
.content h1{font-size:36px;letter-spacing:-.025em;line-height:1.15;margin:0 0 8px}
.content .lead{color:var(--muted);font-size:18px;margin:0 0 28px}
.content h2{font-size:24px;letter-spacing:-.015em;margin:44px 0 12px;padding-top:8px;border-top:1px solid var(--border)}
.content h3{font-size:19px;margin:30px 0 8px}
.content h2,.content h3{position:relative;scroll-margin-top:90px}
.anchor{position:absolute;left:-22px;color:var(--muted);opacity:0;text-decoration:none!important}
h2:hover .anchor,h3:hover .anchor{opacity:1}
.content code{background:var(--surface-2);border:1px solid var(--border);border-radius:6px;padding:1px 6px;font-size:.88em}
.code{position:relative;margin:16px 0}
.code pre{background:var(--code-bg);border:1px solid var(--border);border-radius:12px;padding:16px 18px;overflow:auto;margin:0;line-height:1.6}
.code pre code{background:none;border:0;padding:0;font-size:13.5px}
.copy{position:absolute;top:8px;right:8px;border:1px solid var(--border);background:var(--surface);color:var(--muted);border-radius:8px;font:inherit;font-size:12px;padding:3px 9px;cursor:pointer;opacity:0;transition:opacity .15s}
.code:hover .copy{opacity:1}
.table-wrap{overflow:auto;margin:16px 0;border:1px solid var(--border);border-radius:12px}
.content table{border-collapse:collapse;width:100%;font-size:14.5px}
.content th,.content td{padding:9px 14px;border-bottom:1px solid var(--border);text-align:left;vertical-align:top}
.content th{background:var(--surface-2);font-weight:600}
.content tr:last-child td{border-bottom:0}
.content blockquote{margin:16px 0;padding:10px 16px;border-left:3px solid var(--brand-gold);background:var(--warn-soft);border-radius:0 10px 10px 0}
.content img{max-width:100%}
.pager{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:56px}
.pager a{border:1px solid var(--border);border-radius:12px;padding:14px 16px;color:var(--text)}
.pager a:hover{border-color:var(--accent);text-decoration:none}
.pager small{display:block;color:var(--muted);font-size:12.5px}
.pager .next{text-align:right;grid-column:2}
.edit{margin-top:28px;font-size:14px}
.toc{position:sticky;top:78px;align-self:start;font-size:13.5px}
.toc h4{font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--muted);margin:0 0 8px}
.toc a{display:block;padding:3px 0;color:var(--muted)}
.toc a:hover{color:var(--text);text-decoration:none}
.hero{display:grid;grid-template-columns:1.1fr .9fr;gap:40px;align-items:center;max-width:1180px;margin:0 auto;padding:64px 22px 30px}
.hero .zx-logo.big{width:96px;height:96px;margin-bottom:22px}
.hero h1{font-size:clamp(40px,6vw,64px);line-height:1.02;letter-spacing:-.04em;margin:0 0 14px}
.hero h1 b{color:var(--brand-teal)}
.hero .tag{color:var(--accent-2);font-weight:600;font-size:18px;margin:0 0 14px}
.hero p.lead{font-size:19px;color:var(--muted);margin:0 0 26px;max-width:560px}
.cta{display:flex;gap:12px;flex-wrap:wrap}
.install{margin-top:22px;max-width:460px}
.term{background:#0b1416;color:#e6ece9;border:1px solid #1f3336;border-radius:16px;box-shadow:var(--shadow);font-family:var(--mono);font-size:13.5px;line-height:1.7;overflow:hidden}
.term .bar{display:flex;gap:7px;padding:11px 14px;border-bottom:1px solid #1f3336}
.term .bar i{width:11px;height:11px;border-radius:50%;background:#3a4b4e}
.term pre{margin:0;padding:16px 18px;white-space:pre-wrap}
.t-teal{color:${BRAND.teal}}.t-gold{color:${BRAND.gold}}.t-dim{color:${BRAND.slate}}.t-ok{color:#47cd89}
.features{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;max-width:1180px;margin:30px auto 0;padding:0 22px 80px}
.feature{padding:22px}
.feature h3{margin:0 0 6px;font-size:17px}
.feature p{margin:0;color:var(--muted);font-size:15px}
.feature .ic{font-size:22px;margin-bottom:8px}
.foot{border-top:1px solid var(--border);padding:26px 22px;text-align:center;color:var(--muted);font-size:13.5px}
@media (max-width:1100px){.layout{grid-template-columns:230px minmax(0,1fr)}.toc{display:none}}
@media (max-width:860px){.layout{grid-template-columns:1fr;padding-top:16px}.side{display:none;position:static;max-height:none}.side.open{display:block}.menu-btn{display:inline-flex}.hero{grid-template-columns:1fr;padding-top:36px}.features{grid-template-columns:1fr}.doc-top .gh,.doc-top .ver{display:none}.search{max-width:none}.doc-top .zx-word{display:none}.anchor{display:none}}
`;

const JS = `
(function(){
  document.querySelectorAll(".copy").forEach(function(b){ b.addEventListener("click", function(){ navigator.clipboard.writeText(b.nextElementSibling.textContent).then(function(){ b.textContent = "✓ Tersalin"; setTimeout(function(){ b.textContent = "Salin"; }, 1400); }); }); });
  var menu = document.querySelector(".menu-btn"), side = document.querySelector(".side");
  if (menu && side) menu.addEventListener("click", function(){ side.classList.toggle("open"); });
  var input = document.querySelector(".search input"), box = document.querySelector(".results"), index = null, sel = 0;
  function load(){ if (index) return Promise.resolve(index); return fetch("search-index.json").then(function(r){ return r.json(); }).then(function(j){ index = j; return j; }); }
  function esc(s){ return s.replace(/[&<>"]/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\\"":"&quot;"}[c]; }); }
  function search(q){
    q = q.trim().toLowerCase(); if (!q) { box.style.display = "none"; return; }
    load().then(function(items){
      var words = q.split(/\\s+/);
      var hits = items.map(function(it){
        var hay = (it.title + " " + it.headings.join(" ") + " " + it.text).toLowerCase(), score = 0;
        for (var i = 0; i < words.length; i++) { if (hay.indexOf(words[i]) < 0) return null; if (it.title.toLowerCase().indexOf(words[i]) >= 0) score += 5; if (it.headings.join(" ").toLowerCase().indexOf(words[i]) >= 0) score += 2; }
        return { it: it, score: score };
      }).filter(Boolean).sort(function(a, b){ return b.score - a.score; }).slice(0, 8);
      sel = 0;
      box.innerHTML = hits.length ? hits.map(function(h, i){ return '<a href="' + h.it.url + '"' + (i === 0 ? ' class="on"' : "") + '>' + esc(h.it.title) + '<small>' + esc(h.it.description) + '</small></a>'; }).join("") : '<a>Tidak ada hasil</a>';
      box.style.display = "block";
    });
  }
  if (input) {
    input.addEventListener("input", function(){ search(input.value); });
    input.addEventListener("keydown", function(e){
      var links = box.querySelectorAll("a[href]");
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); if (!links.length) return; links[sel] && links[sel].classList.remove("on"); sel = (sel + (e.key === "ArrowDown" ? 1 : links.length - 1)) % links.length; links[sel].classList.add("on"); }
      else if (e.key === "Enter" && links[sel]) location.href = links[sel].getAttribute("href");
      else if (e.key === "Escape") { box.style.display = "none"; input.blur(); }
    });
    document.addEventListener("keydown", function(e){ if (e.key === "/" && document.activeElement !== input) { e.preventDefault(); input.focus(); } });
    document.addEventListener("click", function(e){ if (!e.target.closest(".search")) box.style.display = "none"; });
  }
})();
`;

const LOGO = `<span class="zx-logo" role="img" aria-label="Zentara Core"></span>`;
function shell({ title, description, body, active, file }) {
  const url = new URL(file === "index.html" ? "" : file, SITE).href;
  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title><meta name="description" content="${escapeHtml(description)}">
<link rel="canonical" href="${url}"><meta property="og:url" content="${url}"><meta property="og:type" content="website">
<meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:image" content="https://raw.githubusercontent.com/melkimahdali/zentara-core/main/assets/brand/social/social-preview.jpg"><meta name="theme-color" content="${BRAND.obsidian}">
<link rel="icon" type="image/png" href="${FAVICON_PNG}"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
<link rel="stylesheet" href="style.css"></head><body>
<header class="doc-top"><button class="zx-btn small menu-btn" type="button" aria-label="Menu">☰</button><a class="brand" href="index.html">${LOGO}<span class="zx-word">Zentara <b>Core</b></span></a><a class="ver" href="rilis.html" title="Catatan rilis">v${escapeHtml(ZENTARA_VERSION)}</a>
<div class="search"><input type="search" placeholder="Cari dokumentasi…  ( / )" aria-label="Cari dokumentasi"><div class="results"></div></div>
<a class="gh" href="${REPO}" target="_blank" rel="noopener">GitHub</a><a class="gh" href="https://www.npmjs.com/package/zentara" target="_blank" rel="noopener">npm</a></header>
${body}
<footer class="foot">Zentara Core · ${escapeHtml(TAGLINE)} · Lisensi BSL 1.1 · <a href="${REPO}">GitHub</a></footer>
<script src="app.js"></script></body></html>`;
}

function sidebar(active) {
  return GROUPS.map((g) => `<h4>${escapeHtml(g)}</h4>${pages.filter((p) => p.group === g).map((p) => `<a href="${p.slug}.html"${p.slug === active ? ' class="on"' : ""}>${escapeHtml(p.title)}</a>`).join("")}`).join("");
}

// ── Tulis situs ──────────────────────────────────────────────────────────
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "style.css"), CSS);
fs.writeFileSync(path.join(OUT, "app.js"), JS);
fs.writeFileSync(path.join(OUT, ".nojekyll"), "");

const index = [];
pages.forEach((page, i) => {
  const { html, toc } = render(page);
  const prev = pages[i - 1];
  const next = pages[i + 1];
  const withLead = html.replace(/<\/h1>\n/, `</h1>\n${page.description ? `<p class="lead">${escapeHtml(page.description)}</p>` : ""}`);
  const body = `<div class="layout"><nav class="side" aria-label="Navigasi dokumentasi">${sidebar(page.slug)}</nav>
<main class="content">${withLead}
<div class="pager">${prev ? `<a class="prev" href="${prev.slug}.html"><small>← Sebelumnya</small>${escapeHtml(prev.title)}</a>` : ""}${next ? `<a class="next" href="${next.slug}.html"><small>Berikutnya →</small>${escapeHtml(next.title)}</a>` : ""}</div>
<p class="edit"><a href="${REPO}/edit/main/${page.source ?? `docs/${page.slug}.md`}" target="_blank" rel="noopener">Perbaiki halaman ini di GitHub</a></p></main>
<aside class="toc">${toc.length ? `<h4>Di halaman ini</h4>${toc.map((t) => `<a href="#${t.id}">${escapeHtml(t.text)}</a>`).join("")}` : ""}</aside></div>`;
  fs.writeFileSync(path.join(OUT, `${page.slug}.html`), shell({ title: `${page.title} · Zentara Core`, description: page.description, body, active: page.slug, file: `${page.slug}.html` }));
  index.push({
    url: `${page.slug}.html`,
    title: page.title,
    description: page.description,
    headings: toc.map((t) => t.text),
    text: page.body.replace(/```[\s\S]*?```/g, " ").replace(/[#*`|>\-\[\]()]/g, " ").replace(/\s+/g, " ").slice(0, 4000),
  });
});
fs.writeFileSync(path.join(OUT, "search-index.json"), JSON.stringify(index));

// Beranda
const feature = (ic, title, text) => `<div class="zx-card feature"><div class="ic">${ic}</div><h3>${title}</h3><p>${text}</p></div>`;
const home = `<section class="hero"><div>${LOGO.replace('class="zx-logo"', 'class="zx-logo big"')}
<h1>Zentara <b>Core</b></h1><p class="tag">${escapeHtml(TAGLINE)}</p>
<p class="lead">${escapeHtml(DESCRIPTION)}. Ceritakan apa yang ingin dibangun dalam bahasa sehari-hari; Zentara AI menyusun rencana, meminta persetujuan, menulis kode, lalu mengeceknya.</p>
<div class="cta"><a class="zx-btn primary" href="mulai-cepat.html">Mulai cepat →</a><a class="zx-btn" href="${REPO}" target="_blank" rel="noopener">GitHub</a></div>
<div class="zx-cmd install"><span>npm install -g zentara</span><button type="button" class="zx-copy" onclick="navigator.clipboard.writeText('npm install -g zentara');this.textContent='✓'">Salin</button></div></div>
<div class="term"><div class="bar"><i></i><i></i><i></i></div><pre><span class="t-dim">~/toko $</span> zentara
<span class="t-teal">◆ Zentara Core</span> <span class="t-dim">v${escapeHtml(ZENTARA_VERSION)}</span>
<span class="t-dim">OmniRoute (gratis) · minta persetujuan</span>

<span class="t-teal">❯</span> buatkan API produk dengan nama dan harga

<span class="t-teal">⏺</span> Rencana: buat src/app/routes/api/produk.ts
  dengan validasi, lalu cek typecheck &amp; test.
<span class="t-dim">⏺</span> <b>Tulis</b>(src/app/routes/api/produk.ts)
  <span class="t-dim">⎿  Dibuat</span>
<span class="t-dim">⏺</span> <b>Cek</b>(typecheck)
  <span class="t-dim">⎿  BERHASIL</span>

<span class="t-ok">✓ Selesai</span> <span class="t-dim">· 4 langkah · 1 file berubah</span></pre></div></section>
<section class="features">
${feature("✦", "Zentara AI", "CLI interaktif gaya Claude Code dan chat di browser. Setiap perubahan ditampilkan sebagai diff dan bisa di-undo.")}
${feature("◎", "AI gratis siap pakai", "OmniRoute sebagai default tanpa API key, dengan fallback otomatis ke Claude, OpenAI, Gemini, Groq, dan lainnya.")}
${feature("⌁", "Routing berbasis file", "File di src/app/routes menjadi URL. Validasi input dengan zod, valibot, atau arktype.")}
${feature("⛁", "Database & auth", "Drizzle ORM (SQLite tanpa instalasi atau PostgreSQL), login dengan scrypt, role, dan rate limit.")}
${feature("⛨", "Aman sejak awal", "Session terenkripsi, CSRF, CORS, halaman error yang tidak membocorkan detail di produksi.")}
${feature("❖", "Halaman error yang membantu", "Stack trace dengan potongan kode dan tombol \"Tanya Zentara AI\" untuk memperbaikinya.")}
</section>`;
fs.writeFileSync(path.join(OUT, "index.html"), shell({ title: `Zentara Core · ${DESCRIPTION}`, description: `${DESCRIPTION}. ${TAGLINE}`, body: home, file: "index.html" }));

// Domain kustom & mesin pencari. CNAME ikut diterbitkan agar domain tidak hilang saat deploy.
fs.writeFileSync(path.join(OUT, "CNAME"), `${SITE.hostname}\n`);
const today = new Date().toISOString().slice(0, 10);
const urls = ["", ...pages.map((p) => `${p.slug}.html`)].map((f) => `  <url><loc>${new URL(f, SITE).href}</loc><lastmod>${today}</lastmod></url>`);
fs.writeFileSync(path.join(OUT, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join("\n")}\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${new URL("sitemap.xml", SITE).href}\n`);
console.log(`Dokumentasi: ${pages.length} halaman + beranda → ${path.relative(ROOT, OUT)}/`);
