import { escapeHtml } from "../view.js";
import { CHAT_CSS, CHAT_JS } from "./chat.js";
import { appInfo, devtoolsClient } from "./info.js";
import { DESCRIPTION, DOCS_URL, TAGLINE } from "../../brand/index.js";
import { LOGO_SVG, renderPage, WORDMARK, ZENTARA_VERSION } from "./theme.js";

const WELCOME_CSS = `
.zw-hero{display:grid;grid-template-columns:1.05fr 1fr;gap:28px;align-items:stretch;margin-bottom:22px}
.zw-kicker{display:inline-flex;align-items:center;gap:8px;font-size:13px;color:var(--accent);background:var(--accent-soft);border-radius:999px;padding:4px 12px;font-weight:600}
.zw-title{font-size:clamp(34px,5vw,54px);line-height:1.05;letter-spacing:-.035em;margin:18px 0 14px;font-weight:800}
.zw-title span{background:linear-gradient(120deg,var(--brand-teal) 10%,var(--accent) 55%,var(--brand-gold));-webkit-background-clip:text;background-clip:text;color:transparent}
.zw-mark{width:76px!important;height:76px!important;margin-bottom:18px}
.zw-tagline{color:var(--accent-2);font-weight:600;letter-spacing:.01em;margin:0 0 20px}
.zw-lead{font-size:17px;color:var(--muted);max-width:520px;margin:0 0 22px}
.zw-stats{display:flex;gap:10px;flex-wrap:wrap}
.zw-chat{display:flex;flex-direction:column;padding:18px;min-height:420px;max-height:560px}
.zw-chat-head{display:flex;align-items:center;gap:10px;margin-bottom:12px}
.zw-chat-head .zx-logo{width:26px;height:26px}
.zw-chat-head strong{font-size:15px}
.zw-chat-body{flex:1;min-height:0}
.zw-cards{grid-template-columns:repeat(3,1fr)}
.zw-routes{display:grid;gap:6px;font-family:var(--mono);font-size:13px;max-height:240px;overflow:auto}
.zw-routes div{display:flex;gap:10px;align-items:baseline}
.zw-routes .m{color:var(--accent);min-width:74px;font-size:11.5px}
.zw-cmds{display:grid;gap:8px}
.zw-cmds p{margin:0 0 2px;font-size:13px;color:var(--muted)}
.zw-links{display:grid;gap:4px}
.zw-links a{display:flex;justify-content:space-between;align-items:center;padding:9px 10px;border-radius:10px;color:var(--text)}
.zw-links a:hover{background:var(--surface-2);text-decoration:none}
.zw-links a span{color:var(--muted);font-size:12.5px;white-space:nowrap;margin-left:12px}
@media (max-width:980px){.zw-hero,.zw-cards{grid-template-columns:1fr}}
`;

const WELCOME_JS = `
(function(){
  var data = JSON.parse(document.getElementById("zx-data").textContent);
  document.querySelectorAll(".zx-copy").forEach(function(b){ b.addEventListener("click", function(){ navigator.clipboard.writeText(b.previousElementSibling.textContent).then(function(){ b.textContent = "✓"; setTimeout(function(){ b.textContent = "Salin"; }, 1400); }); }); });
  var box = document.querySelector(".zw-chat-body");
  if (box && data.devtools) ZentaraChat.mount(box, { port: data.devtools.port, token: data.devtools.token, storageKey: "welcome", emptyText: "Ceritakan apa yang ingin Anda bangun. Zentara AI akan menjelaskan rencananya dan meminta persetujuan sebelum mengubah file.", suggestions: data.suggestions, placeholder: "Mis. buatkan halaman portofolio dengan daftar proyek" });
})();
`;

const SUGGESTIONS = [
  "Buatkan halaman tentang kami",
  "Buatkan blog sederhana dengan daftar artikel",
  "Tambahkan form kontak yang tersimpan di database",
  "Jelaskan struktur proyek ini",
];

function cmd(text: string): string {
  return `<div class="zx-cmd"><span>${escapeHtml(text)}</span><button type="button" class="zx-copy">Salin</button></div>`;
}

/**
 * Halaman sambutan bawaan Zentara. Pakai sebagai route awal:
 *
 *   // src/app/routes/index.ts
 *   export { welcomePage as GET } from "zentara";
 *
 * Saat pengembangan (lewat `zentara dev`) halaman ini memuat chat Zentara AI dan daftar route.
 * Di produksi hanya tampil sambutan tanpa detail internal. Ganti file index.ts untuk halaman Anda sendiri.
 */
export function welcomePage(): string {
  const info = appInfo();
  const devtools = devtoolsClient();
  const debug = info.debug;

  const chat = devtools
    ? `<section class="zx-card zw-chat"><div class="zw-chat-head">${LOGO_SVG}<strong>Zentara AI</strong><span class="zx-muted" style="font-size:13px">asisten pengembang Anda</span></div><div class="zw-chat-body"></div></section>`
    : `<section class="zx-card zx-pad zw-chat" style="justify-content:center"><div class="zw-chat-head">${LOGO_SVG}<strong>Bangun dengan Zentara AI</strong></div>
<p class="zx-muted" style="margin:0 0 14px">Tulis apa yang ingin dibuat dalam bahasa sehari-hari, Zentara AI yang mengerjakannya. ${debug ? "Jalankan server lewat Zentara agar bisa chat langsung dari halaman ini:" : "Mulai dari terminal di folder proyek:"}</p>
<div class="zw-cmds">${cmd("npx zentara")}${cmd("npx zentara ai:setup")}${debug ? cmd("npx zentara dev") : ""}</div></section>`;

  const routes = debug
    ? `<section class="zx-card zx-pad"><h2>Route aplikasi</h2>${
        info.routes.length
          ? `<div class="zw-routes">${info.routes.map((r) => `<div><span class="m">${escapeHtml(r.methods.join(" "))}</span><a href="${escapeHtml(/[:*]/.test(r.pattern) ? "#" : r.pattern)}">${escapeHtml(r.pattern)}</a></div>`).join("")}</div>`
          : `<p class="zx-muted">Belum ada route.</p>`
      }<p class="zx-muted" style="font-size:13px;margin:12px 0 0">Setiap file di <code>src/app/routes/</code> menjadi satu route.</p></section>`
    : "";

  const body = `<div class="zx-wrap">
<header class="zx-top">${LOGO_SVG}<div class="zx-brand">${WORDMARK}<small>${escapeHtml(info.appName)}</small></div><div class="zx-spacer"></div>${debug ? `<span class="zx-badge"><span class="dot"></span>${escapeHtml(info.env)}</span>` : ""}<span class="zx-badge off"><span class="dot"></span>v${escapeHtml(ZENTARA_VERSION)}</span></header>
<div class="zw-hero"><section style="padding:18px 4px">${LOGO_SVG.replace('class="zx-logo"', 'class="zx-logo zw-mark"')}<br><span class="zw-kicker">✦ ${escapeHtml(DESCRIPTION)}</span>
<h1 class="zw-title">Aplikasi Anda <span>sudah berjalan.</span></h1>
<p class="zw-tagline">${escapeHtml(TAGLINE)}</p>
<p class="zw-lead">Cukup ceritakan apa yang ingin Anda bangun. Zentara AI menyusun rencana, meminta persetujuan, menulis kodenya, lalu mengeceknya untuk Anda.</p>
<div class="zw-stats"><span class="zx-badge"><span class="dot"></span>Server aktif</span><span class="zx-badge off"><span class="dot"></span>Node ${escapeHtml(process.version)}</span>${debug ? `<span class="zx-badge off"><span class="dot"></span>${info.routes.length} route</span>` : ""}</div></section>
${chat}</div>
<div class="zx-grid zw-cards">${routes}
<section class="zx-card zx-pad"><h2>Perintah penting</h2><div class="zw-cmds"><p>Chat dengan AI di terminal</p>${cmd("npx zentara")}<p>Atur provider AI (Claude, OpenAI, Gemini, ...)</p>${cmd("npx zentara ai:setup")}<p>Batalkan perubahan AI terakhir</p>${cmd("npx zentara undo")}</div></section>
<section class="zx-card zx-pad"><h2>Pelajari</h2><div class="zw-links">
<a href="${DOCS_URL}" target="_blank" rel="noopener">Dokumentasi <span>situs resmi →</span></a>
<a href="${DOCS_URL}mulai-cepat.html" target="_blank" rel="noopener">Mulai cepat <span>panduan →</span></a>
<a href="https://www.npmjs.com/package/zentara" target="_blank" rel="noopener">Paket npm <span>zentara →</span></a>
<a href="https://github.com/melkimahdali/zentara-core/issues" target="_blank" rel="noopener">Laporkan masalah <span>GitHub →</span></a></div></section></div>
<p class="zx-foot">Ganti halaman ini di <code>src/app/routes/index.ts</code> · Zentara Core — Rooted here. Built for what&#39;s next.</p></div>`;

  return renderPage({
    title: info.appName === "Zentara App" ? "Zentara" : info.appName,
    body,
    css: WELCOME_CSS + (devtools ? CHAT_CSS : ""),
    data: { devtools: devtools ?? null, suggestions: SUGGESTIONS },
    script: (devtools ? CHAT_JS : "") + WELCOME_JS,
  });
}
