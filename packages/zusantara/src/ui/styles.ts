import { BRAND } from "../brand/index.js";
import { FONT_LATIN_EXT_RANGE, FONT_LATIN_RANGE } from "./font.js";

/** Tekstur grain halus (SVG feTurbulence) untuk latar, dipasang di lapisan tetap yang tidak menerima klik. */
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

/** Variabel mode gelap: dipakai saat sistem memakai mode gelap, atau saat tema memaksa `mode: "dark"`. */
const DARK_VARS = `
--zu-bg:${BRAND.obsidian};--zu-surface:#111e20;--zu-surface-2:#162628;--zu-surface-3:#1c2f31;--zu-border:#213538;--zu-border-strong:#2c4548;
--zu-text:${BRAND.pearl};--zu-muted:#93a39f;--zu-faint:#6e807c;
--zu-accent:${BRAND.teal};--zu-accent-hover:#63e2cc;--zu-on-accent:${BRAND.obsidian};--zu-accent-soft:rgba(46,211,183,.11);--zu-accent-line:rgba(46,211,183,.4);
--zu-danger:#f97066;--zu-danger-soft:rgba(249,112,102,.1);--zu-ok:#47cd89;--zu-ok-soft:rgba(71,205,137,.1);--zu-warn:#f0b35e;--zu-warn-soft:rgba(240,179,94,.1);--zu-gold:${BRAND.gold};--zu-gold-soft:rgba(200,155,82,.12);
--zu-glow:rgba(46,211,183,.08);--zu-grain:.05;
--zu-shadow:0 1px 2px rgba(0,0,0,.3),0 8px 24px -12px rgba(0,0,0,.55);--zu-shadow-lift:0 1px 2px rgba(0,0,0,.35),0 16px 40px -14px rgba(0,0,0,.65)`;

/**
 * Stylesheet kit UI Zusantara (disajikan di /_zusantara/ui.css). Semua warna berupa variabel CSS; tema dari
 * `ui` di zusantara.config.mjs menimpanya lewat /_zusantara/theme.css (lihat theme.ts). Mengikuti mode
 * gelap/terang sistem, atau mode yang dipaksa tema lewat `<html data-zu-mode>`.
 *
 * Arah desain: tenang dan presisi seperti alat developer. Zusantara Teal satu-satunya aksen antarmuka
 * (emas hanya di logo), satu keluarga abu-abu kehijauan, skala sudut 6/10/16 px, font brand Plus
 * Jakarta Sans yang disajikan sendiri, dan gerak seperlunya (umpan balik tombol, pesan masuk).
 */
export const UI_CSS = `
@font-face{font-family:"Plus Jakarta Sans";font-style:normal;font-weight:200 800;font-display:swap;src:url(/_zusantara/fonts/plus-jakarta-sans-latin-ext.woff2) format("woff2");unicode-range:${FONT_LATIN_EXT_RANGE}}
@font-face{font-family:"Plus Jakarta Sans";font-style:normal;font-weight:200 800;font-display:swap;src:url(/_zusantara/fonts/plus-jakarta-sans-latin.woff2) format("woff2");unicode-range:${FONT_LATIN_RANGE}}
:root{color-scheme:light dark;
--zu-bg:#f3f5f3;--zu-surface:#fff;--zu-surface-2:#eef2ef;--zu-surface-3:#e4eae6;--zu-border:#dde4e0;--zu-border-strong:#c7d1cc;
--zu-text:${BRAND.obsidian};--zu-muted:#56686a;--zu-faint:#7d8d8a;
--zu-accent:#097e6b;--zu-accent-hover:#08705f;--zu-on-accent:#fff;--zu-accent-soft:rgba(9,126,107,.1);--zu-accent-line:rgba(9,126,107,.35);
--zu-danger:#b42318;--zu-danger-soft:rgba(180,35,24,.08);--zu-ok:#067647;--zu-ok-soft:rgba(6,118,71,.09);--zu-warn:#a15c07;--zu-warn-soft:rgba(200,155,82,.16);--zu-gold:#7a5b28;--zu-gold-soft:rgba(200,155,82,.16);
--zu-glow:rgba(46,211,183,.14);--zu-grain:.035;
--zu-shadow:0 1px 2px rgba(13,23,25,.04),0 6px 20px -10px rgba(13,40,36,.16);--zu-shadow-lift:0 1px 2px rgba(13,23,25,.06),0 14px 34px -14px rgba(13,40,36,.24);
--zu-r-sm:6px;--zu-r-md:10px;--zu-r-lg:16px;
--zu-ease:cubic-bezier(.2,.8,.2,1);
--zu-font:"Plus Jakarta Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--zu-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;
--zu-z-nav:20;--zu-z-grain:30}
@media (prefers-color-scheme:dark){:root:not([data-zu-mode=light]){${DARK_VARS}}}
:root[data-zu-mode=dark]{color-scheme:dark;${DARK_VARS}}
:root[data-zu-mode=light]{color-scheme:light}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;scroll-behavior:smooth}
html,body{margin:0}
body.zu{min-height:100dvh;background:radial-gradient(900px 420px at 0% -8%,var(--zu-glow),transparent 62%),var(--zu-bg);background-attachment:fixed;color:var(--zu-text);font:400 15px/1.6 var(--zu-font);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
body.zu::before{content:"";position:fixed;inset:0;z-index:var(--zu-z-grain);pointer-events:none;opacity:var(--zu-grain);background-image:${GRAIN};mix-blend-mode:overlay}
.zu a{color:var(--zu-accent);text-decoration:none;text-underline-offset:3px}.zu a:hover{text-decoration:underline}
.zu h1,.zu h2,.zu h3{margin:0;font-weight:650;letter-spacing:-.02em;line-height:1.2;text-wrap:balance}
.zu h1{font-size:clamp(24px,2.4vw,30px);letter-spacing:-.022em}.zu h2{font-size:16px;letter-spacing:-.012em}.zu h3{font-size:15px}
.zu p{margin:0;text-wrap:pretty}
.zu code{font-family:var(--zu-mono);font-size:.86em;overflow-wrap:anywhere;background:var(--zu-surface-2);padding:1px 6px;border-radius:var(--zu-r-sm)}
.zu :focus-visible{outline:2px solid var(--zu-accent);outline-offset:2px;border-radius:var(--zu-r-sm)}
.zu-muted{color:var(--zu-muted)}
.zu-stack{display:flex;flex-direction:column;gap:16px}
.zu-spacer{flex:1}
.zu-block{display:block;overflow:hidden;text-overflow:ellipsis}
.zu-bullets{margin:10px 0 0;padding-left:18px;display:grid;gap:6px;font-size:14px}
.zu-bullets li::marker{color:var(--zu-accent)}
.zu-num{font-variant-numeric:tabular-nums}
.zu-skip{position:absolute;left:12px;top:-60px;z-index:calc(var(--zu-z-grain) + 1);background:var(--zu-text);color:var(--zu-bg)!important;padding:8px 12px;border-radius:var(--zu-r-md);font-weight:600;transition:top .15s var(--zu-ease)}
.zu-skip:focus{top:12px}

/* Logo & nama aplikasi */
.zu-logo{display:inline-block;width:30px;height:30px;flex:none;background:url(/_zusantara/logo.webp) center/contain no-repeat}
.zu a.zu-brand{display:inline-flex;align-items:center;gap:10px;font-weight:700;letter-spacing:-.01em;font-size:16px;color:var(--zu-text);white-space:nowrap}
.zu a.zu-brand:hover{text-decoration:none}
.zu-brand b{color:var(--zu-accent-hover);font-weight:700}

/* Masuk & daftar: panel brand di kiri, formulir di kanan (panel brand disembunyikan di layar sempit) */
.zu-auth{min-height:100dvh;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr)}
.zu-auth-aside{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;gap:48px;padding:40px 48px 44px;background:radial-gradient(640px 420px at 12% 108%,var(--zu-accent-soft),transparent 70%),var(--zu-surface-2);border-right:1px solid var(--zu-border)}
.zu-auth-aside::after{content:"";position:absolute;right:-120px;bottom:-140px;width:460px;height:460px;background:url(/_zusantara/logo.webp) center/contain no-repeat;opacity:.07;pointer-events:none}
.zu-auth-aside h2{font-size:clamp(26px,2.6vw,34px);font-weight:650;letter-spacing:-.024em;line-height:1.15;max-width:18ch}
.zu-auth-aside p{margin-top:14px;color:var(--zu-muted);max-width:40ch}
.zu-auth-main{display:flex;align-items:center;justify-content:center;padding:40px 24px}
.zu-auth-box{width:100%;max-width:380px}
.zu-auth-head{margin-bottom:28px}
.zu-auth-head .zu-logo{display:none;width:40px;height:40px;margin-bottom:20px}
.zu-auth-head p{margin-top:8px;color:var(--zu-muted)}
.zu-auth-foot{margin-top:22px;color:var(--zu-muted);font-size:14px}
@media (max-width:900px){.zu-auth{grid-template-columns:1fr}.zu-auth-aside{display:none}.zu-auth-head .zu-logo{display:block}.zu-auth-main{align-items:flex-start;padding-top:56px}}

/* Kerangka aplikasi: navigasi atas + konten */
.zu-top{position:sticky;top:0;z-index:var(--zu-z-nav);background:color-mix(in srgb,var(--zu-bg) 82%,transparent);backdrop-filter:saturate(140%) blur(12px);-webkit-backdrop-filter:saturate(140%) blur(12px);border-bottom:1px solid var(--zu-border)}
.zu-top-in{max-width:1180px;margin:0 auto;height:64px;padding:0 24px;display:flex;align-items:center;gap:28px}
.zu-nav{display:flex;align-items:stretch;align-self:stretch;gap:4px;min-width:0;overflow-x:auto;scrollbar-width:none}
.zu-nav::-webkit-scrollbar{display:none}
.zu .zu-nav a{display:flex;align-items:center;padding:0 12px;color:var(--zu-muted);font-weight:550;font-size:14px;white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px;transition:color .15s var(--zu-ease),border-color .15s var(--zu-ease);border-radius:0}
.zu .zu-nav a:hover{color:var(--zu-text);text-decoration:none}
.zu .zu-nav a[aria-current=page]{color:var(--zu-text);border-bottom-color:var(--zu-accent)}
.zu-nav-sep{width:1px;margin:20px 6px;background:var(--zu-border)}
.zu-user{margin-left:auto;display:flex;align-items:center;gap:10px;min-width:0}
.zu-user-text{min-width:0;line-height:1.25;text-align:right}
.zu-user-text b{display:block;font-size:14px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
.zu-user-text small{display:block;font-size:12px;color:var(--zu-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px}
.zu-avatar{width:32px;height:32px;border-radius:9px;flex:none;display:grid;place-items:center;font-weight:700;font-size:13px;letter-spacing:.02em;background:var(--zu-surface-3);color:var(--zu-text);border:1px solid var(--zu-border)}
.zu-main{max-width:1180px;margin:0 auto;padding:36px 24px 72px}
.zu-main > * + *{margin-top:24px}
.zu-head{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap}
.zu-head > div:first-child{flex:1;min-width:min(100%,280px)}
.zu-head p{color:var(--zu-muted);margin-top:6px}
@media (max-width:720px){.zu-top-in{height:auto;flex-wrap:wrap;gap:0 16px;padding:10px 16px 0}.zu-nav{order:3;flex-basis:100%;height:44px;margin:0 -12px}.zu-user-text{display:none}.zu-nav-sep{display:none}.zu-main{padding:24px 16px 56px}}

/* Panel (kartu) dan tata letak */
.zu-card{background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow);padding:22px 24px 24px}
.zu-card-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:16px}
.zu-card-head h2{flex:1}
.zu-card.flush{padding:0;overflow:hidden}.zu-card.flush > .zu-card-head{padding:18px 24px 0}
.zu-card.flush > .zu-card-head + *{margin-top:0}
.zu-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(220px,1fr))}
.zu-split{display:grid;gap:24px;grid-template-columns:minmax(0,2fr) minmax(0,1fr);align-items:start}
@media (max-width:900px){.zu-split{grid-template-columns:1fr}}

/* Angka ringkasan: satu strip bersekat, bukan deretan kartu kembar */
.zu-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow);overflow:hidden}
.zu-stat{display:flex;flex-direction:column;gap:6px;padding:20px 24px 22px;min-width:0}
.zu-stats > .zu-stat + .zu-stat{border-left:1px solid var(--zu-border)}
.zu-grid > .zu-stat{background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow)}
.zu-stat span{font-size:13px;color:var(--zu-muted);font-weight:500}
.zu-stat b{font-size:30px;font-weight:650;letter-spacing:-.03em;line-height:1.05;font-variant-numeric:tabular-nums}
.zu-stat small{font-size:13px;color:var(--zu-muted)}
@media (max-width:640px){.zu-stats > .zu-stat + .zu-stat{border-left:0;border-top:1px solid var(--zu-border)}}

/* Formulir */
.zu-form{display:flex;flex-direction:column;gap:16px}
.zu-field{display:flex;flex-direction:column;gap:6px}
.zu-field label{font-weight:600;font-size:14px}
.zu-field small{color:var(--zu-muted);font-size:13px}
.zu-field .zu-error{color:var(--zu-danger);font-size:13px;font-weight:500}
.zu-input{width:100%;height:42px;font:inherit;font-size:15px;color:var(--zu-text);background:var(--zu-surface);border:1px solid var(--zu-border-strong);border-radius:var(--zu-r-md);padding:0 12px;outline:none;transition:border-color .15s var(--zu-ease),box-shadow .15s var(--zu-ease)}
.zu-textarea{height:auto;min-height:96px;padding:10px 12px;line-height:1.55;resize:vertical}
.zu-input::placeholder{color:var(--zu-faint)}
.zu-input:hover{border-color:var(--zu-faint)}
.zu-input:focus{border-color:var(--zu-accent);box-shadow:0 0 0 3px var(--zu-accent-soft)}
.zu-input[aria-invalid=true]{border-color:var(--zu-danger)}
.zu-input[aria-invalid=true]:focus{box-shadow:0 0 0 3px var(--zu-danger-soft)}
.zu-form-row{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.zu-form-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap}

/* Pencarian */
.zu-search{display:flex;align-items:center;gap:8px;min-width:min(100%,260px)}
.zu-search .zu-input{height:36px;font-size:14px}

/* Tombol */
.zu-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;height:40px;font:inherit;font-weight:600;font-size:14px;line-height:1;padding:0 16px;border-radius:var(--zu-r-md);border:1px solid transparent;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background-color .15s var(--zu-ease),border-color .15s var(--zu-ease),color .15s var(--zu-ease),transform .1s var(--zu-ease),box-shadow .15s var(--zu-ease)}
.zu a.zu-btn:hover{text-decoration:none}
.zu-btn:active{transform:translateY(1px)}
.zu-btn.primary{background:var(--zu-accent);color:var(--zu-on-accent);box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 1px 2px rgba(13,40,36,.2)}.zu-btn.primary:hover{background:var(--zu-accent-hover)}
.zu-btn.secondary{background:var(--zu-surface);color:var(--zu-text);border-color:var(--zu-border-strong)}.zu-btn.secondary:hover{background:var(--zu-surface-2)}
.zu-btn.ghost{background:transparent;color:var(--zu-muted)}.zu-btn.ghost:hover{background:var(--zu-surface-2);color:var(--zu-text)}
.zu-btn.danger{background:transparent;color:var(--zu-danger);border-color:color-mix(in srgb,var(--zu-danger) 45%,transparent)}.zu-btn.danger:hover{background:var(--zu-danger-soft)}
.zu-btn.small{height:32px;padding:0 12px;font-size:13px}
.zu-btn.block{width:100%;height:44px}
.zu-btn[aria-busy=true]{cursor:progress;opacity:.72}
.zu-inline{display:inline}
.zu .zu-link{font-weight:600;font-size:14px}

/* Pesan & label */
.zu-alert{position:relative;border-radius:var(--zu-r-md);padding:12px 14px 12px 16px;font-size:14px;font-weight:500;background:var(--zu-surface);border:1px solid var(--zu-border);box-shadow:var(--zu-shadow)}
.zu-alert::before{content:"";position:absolute;left:0;top:10px;bottom:10px;width:3px;border-radius:0 3px 3px 0;background:var(--zu-accent)}
.zu-alert.success::before{background:var(--zu-ok)}.zu-alert.error::before{background:var(--zu-danger)}.zu-alert.warn::before{background:var(--zu-warn)}
.zu-alert.error{color:var(--zu-danger);background:var(--zu-danger-soft);box-shadow:none;border-color:color-mix(in srgb,var(--zu-danger) 25%,transparent)}
.zu-badge{display:inline-flex;align-items:center;height:22px;font-size:12px;font-weight:600;padding:0 8px;border-radius:var(--zu-r-sm);background:var(--zu-surface-2);color:var(--zu-muted);white-space:nowrap}
.zu-badge.accent{background:var(--zu-accent-soft);color:var(--zu-accent-hover)}
.zu-badge.gold{background:var(--zu-gold-soft);color:var(--zu-gold)}
.zu-badge.danger{background:var(--zu-danger-soft);color:var(--zu-danger)}
.zu-badge.ok{background:var(--zu-ok-soft);color:var(--zu-ok)}
.zu-badge.warn{background:var(--zu-warn-soft);color:var(--zu-warn)}

/* Tabel */
.zu-table-wrap{overflow-x:auto}
.zu-table{width:100%;border-collapse:collapse;font-size:14px}
.zu-table th{text-align:left;font-size:13px;font-weight:500;color:var(--zu-muted);padding:12px 24px;border-bottom:1px solid var(--zu-border);white-space:nowrap}
.zu-table td{padding:13px 24px;border-bottom:1px solid var(--zu-border);vertical-align:middle}
.zu-table tbody tr:last-child td{border-bottom:0}
.zu-table tbody tr{transition:background-color .12s var(--zu-ease)}
.zu-table tbody tr:hover{background:color-mix(in srgb,var(--zu-surface-2) 60%,transparent)}
.zu-table td:first-child{font-weight:550}
.zu-table .num{text-align:right;font-variant-numeric:tabular-nums}
.zu-table .end{text-align:right;width:1%;white-space:nowrap}
.zu-cell-user{display:flex;align-items:center;gap:10px}

/* Daftar ringkas (mis. info akun) */
.zu-list{list-style:none;margin:0;padding:0}
.zu-list li{display:flex;align-items:center;gap:12px;padding:10px 0;font-size:14px}
.zu-list li + li{border-top:1px solid var(--zu-border)}
.zu-list li > :first-child{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* Isi yang dibuka-tutup (formulir tambah, detail) */
.zu-disclosure{background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow)}
.zu-disclosure > summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:10px;padding:16px 24px;font-weight:600;border-radius:var(--zu-r-lg)}
.zu-disclosure > summary::-webkit-details-marker{display:none}
.zu-disclosure > summary::before{content:"";width:8px;height:8px;border-right:2px solid var(--zu-muted);border-bottom:2px solid var(--zu-muted);transform:rotate(-45deg);transition:transform .15s var(--zu-ease);margin-right:4px}
.zu-disclosure[open] > summary::before{transform:rotate(45deg)}
.zu-disclosure > summary:hover{color:var(--zu-accent)}
.zu-disclosure > div{padding:4px 24px 24px}

/* Keadaan kosong */
.zu-empty{display:flex;flex-direction:column;align-items:flex-start;gap:8px;padding:36px 24px;border:1px dashed var(--zu-border-strong);border-radius:var(--zu-r-lg);margin:16px 24px 24px}
.zu-card:not(.flush) > .zu-empty{margin:0}
.zu-empty b{font-size:15px;font-weight:600}
.zu-empty p{color:var(--zu-muted);max-width:52ch}
.zu-empty > :last-child:not(b):not(p){margin-top:8px}

/* Tata letak: jarak dan perataan lewat kelas bernilai terbatas */
.zu-container{width:100%;max-width:1180px;margin-inline:auto;padding-inline:24px}
.zu-container.sm{max-width:640px}.zu-container.md{max-width:880px}.zu-container.full{max-width:none}
.zu-container.pad{padding-block:40px 64px}
@media (max-width:720px){.zu-container{padding-inline:16px}.zu-container.pad{padding-block:24px 56px}}
.zu-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
.zu-row.nowrap{flex-wrap:nowrap}.zu-row.nowrap > *{min-width:0}
.zu-cols{display:grid;gap:16px;grid-template-columns:repeat(var(--zu-cols,2),minmax(0,1fr))}
.zu-cols.c2{--zu-cols:2}.zu-cols.c3{--zu-cols:3}.zu-cols.c4{--zu-cols:4}
@media (max-width:900px){.zu-cols.c3,.zu-cols.c4{--zu-cols:2}}
@media (max-width:640px){.zu-cols{--zu-cols:1!important}}
.zu-gap-none{gap:0}.zu-gap-xs{gap:4px}.zu-gap-sm{gap:8px}.zu-gap-md{gap:16px}.zu-gap-lg{gap:24px}.zu-gap-xl{gap:40px}
.zu-align-start{align-items:flex-start}.zu-align-center{align-items:center}.zu-align-end{align-items:flex-end}.zu-align-baseline{align-items:baseline}.zu-align-stretch{align-items:stretch}
.zu-justify-start{justify-content:flex-start}.zu-justify-center{justify-content:center}.zu-justify-end{justify-content:flex-end}.zu-justify-between{justify-content:space-between}
.zu-section{display:flex;flex-direction:column;gap:16px}
.zu-section + .zu-section{margin-top:16px}
.zu-section-head{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
.zu-section-head > div{flex:1;min-width:min(100%,240px)}
.zu-section-head h2{font-size:18px}
.zu-section-head p{margin-top:4px;color:var(--zu-muted);font-size:14px}
.zu-divider{border:0;border-top:1px solid var(--zu-border);margin:8px 0;width:100%}
.zu-divider-label{display:flex;align-items:center;gap:12px;color:var(--zu-muted);font-size:13px;font-weight:500;margin:8px 0}
.zu-divider-label::before,.zu-divider-label::after{content:"";flex:1;border-top:1px solid var(--zu-border)}
.zu-page-head{display:flex;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:24px}
.zu-page-head > div{flex:1;min-width:min(100%,280px)}
.zu-page-head p{color:var(--zu-muted);margin-top:6px;max-width:68ch}
.zu-crumbs ol{list-style:none;margin:0 0 10px;padding:0;display:flex;flex-wrap:wrap;gap:4px 8px;font-size:13px;color:var(--zu-muted)}
.zu-crumbs li{display:flex;align-items:center;gap:8px;min-width:0}
.zu-crumbs li + li::before{content:"/";color:var(--zu-faint)}
.zu .zu-crumbs a{color:var(--zu-muted)}.zu .zu-crumbs a:hover{color:var(--zu-text)}
.zu-crumbs [aria-current]{color:var(--zu-text);font-weight:550}

/* Formulir lengkap: pilihan, centang, sakelar, file, awalan/akhiran */
.zu-select{appearance:none;-webkit-appearance:none;padding-right:36px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' fill='none' stroke='%237d8d8a' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M1 1.5l5 5 5-5'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 12px center;cursor:pointer}
.zu-select[multiple]{height:auto;min-height:42px;padding:6px 8px;background-image:none}
.zu-fieldset{border:0;margin:0;padding:0;min-width:0;display:flex;flex-direction:column;gap:10px}
.zu-fieldset > legend{padding:0;margin-bottom:4px;font-weight:600;font-size:14px}
.zu-fieldset > small{color:var(--zu-muted);font-size:13px;margin-top:-6px}
.zu-fieldset .zu-error{color:var(--zu-danger);font-size:13px;font-weight:500}
.zu-fieldset.box{border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);padding:16px 20px 20px}
.zu-fieldset.box > legend{padding:0 6px;margin-left:-6px}
.zu-choices{display:flex;flex-direction:column;gap:8px}
.zu-choices.inline{flex-direction:row;flex-wrap:wrap;gap:8px 20px}
.zu-check{display:flex;align-items:flex-start;gap:10px;font-size:15px;cursor:pointer;line-height:1.45}
.zu-check input{flex:none;width:18px;height:18px;margin:2px 0 0;accent-color:var(--zu-accent);cursor:pointer}
.zu-check small{display:block;color:var(--zu-muted);font-size:13px}
.zu-check.disabled{cursor:not-allowed;color:var(--zu-muted)}
.zu-switch{display:flex;align-items:center;gap:12px;cursor:pointer;font-size:15px;line-height:1.45}
.zu-switch input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
.zu-switch-track{position:relative;flex:none;width:40px;height:24px;border-radius:999px;background:var(--zu-surface-3);border:1px solid var(--zu-border-strong);transition:background-color .15s var(--zu-ease),border-color .15s var(--zu-ease)}
.zu-switch-track::after{content:"";position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:var(--zu-surface);box-shadow:0 1px 2px rgba(13,23,25,.25);transition:transform .15s var(--zu-ease)}
.zu-switch input:checked + .zu-switch-track{background:var(--zu-accent);border-color:var(--zu-accent)}
.zu-switch input:checked + .zu-switch-track::after{transform:translateX(16px);background:var(--zu-on-accent)}
.zu-switch input:focus-visible + .zu-switch-track{outline:2px solid var(--zu-accent);outline-offset:2px}
.zu-switch input:disabled + .zu-switch-track{opacity:.5}
.zu-switch small{display:block;color:var(--zu-muted);font-size:13px}
.zu-affix{display:flex;align-items:stretch;width:100%;background:var(--zu-surface);border:1px solid var(--zu-border-strong);border-radius:var(--zu-r-md);transition:border-color .15s var(--zu-ease),box-shadow .15s var(--zu-ease)}
.zu-affix:hover{border-color:var(--zu-faint)}
.zu-affix:focus-within{border-color:var(--zu-accent);box-shadow:0 0 0 3px var(--zu-accent-soft)}
.zu-affix.invalid{border-color:var(--zu-danger)}
.zu-affix .zu-input{border:0;box-shadow:none;background:transparent;min-width:0;flex:1}
.zu-affix .zu-input:focus{box-shadow:none}
.zu-affix > span{display:flex;align-items:center;padding:0 12px;color:var(--zu-muted);font-size:14px;font-weight:500;white-space:nowrap;background:var(--zu-surface-2)}
.zu-affix > span:first-child{border-right:1px solid var(--zu-border);border-radius:var(--zu-r-md) 0 0 var(--zu-r-md)}
.zu-affix > span:last-child{border-left:1px solid var(--zu-border);border-radius:0 var(--zu-r-md) var(--zu-r-md) 0}
.zu-affix > .zu-reveal{flex:none;border:0;border-left:1px solid var(--zu-border);background:transparent;color:var(--zu-muted);font:inherit;font-size:13px;font-weight:600;padding:0 12px;cursor:pointer;border-radius:0 var(--zu-r-md) var(--zu-r-md) 0}
.zu-affix > .zu-reveal:hover{color:var(--zu-text);background:var(--zu-surface-2)}
.zu-affix > .zu-reveal[hidden]{display:none}
.zu-range{height:auto;padding:0;border:0;background:transparent;accent-color:var(--zu-accent);box-shadow:none!important}
.zu-color{width:64px;padding:4px;cursor:pointer}
.zu-file{display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.zu-file-input{height:auto;padding:8px;font-size:14px;cursor:pointer;flex:1;min-width:0}
.zu-file-input::file-selector-button{font:inherit;font-weight:600;font-size:13px;margin-right:12px;padding:6px 12px;border-radius:var(--zu-r-sm);border:1px solid var(--zu-border-strong);background:var(--zu-surface-2);color:var(--zu-text);cursor:pointer}
.zu-file-preview{width:72px;height:72px;flex:none;object-fit:cover;border-radius:var(--zu-r-md);border:1px solid var(--zu-border);background:var(--zu-surface-2)}
.zu-file-preview[hidden]{display:none}

/* Navigasi publik: bilah atas dengan menu ponsel (<details>), tanpa JavaScript */
.zu-navbar{position:sticky;top:0;z-index:var(--zu-z-nav);background:color-mix(in srgb,var(--zu-bg) 84%,transparent);backdrop-filter:saturate(140%) blur(12px);-webkit-backdrop-filter:saturate(140%) blur(12px);border-bottom:1px solid var(--zu-border)}
.zu-navbar-in{position:relative;max-width:1180px;margin:0 auto;height:64px;padding:0 24px;display:flex;align-items:center;gap:24px}
.zu-navbar-links{display:flex;align-items:center;gap:4px;min-width:0}
.zu .zu-navbar-links a{padding:8px 12px;border-radius:var(--zu-r-md);color:var(--zu-muted);font-weight:550;font-size:14px;white-space:nowrap}
.zu .zu-navbar-links a:hover{color:var(--zu-text);background:var(--zu-surface-2);text-decoration:none}
.zu .zu-navbar-links a[aria-current=page]{color:var(--zu-text);background:var(--zu-surface-2)}
.zu-navbar-actions{margin-left:auto;display:flex;align-items:center;gap:8px}
.zu-navbar-menu{display:none;margin-left:auto}
.zu-navbar-menu > summary{list-style:none;display:flex;align-items:center;gap:8px;height:40px;padding:0 12px;border:1px solid var(--zu-border-strong);border-radius:var(--zu-r-md);font-weight:600;font-size:14px;cursor:pointer;background:var(--zu-surface)}
.zu-navbar-menu > summary::-webkit-details-marker{display:none}
.zu-burger,.zu-burger::before,.zu-burger::after{display:block;width:16px;height:2px;border-radius:2px;background:currentColor}
.zu-burger{position:relative}.zu-burger::before,.zu-burger::after{content:"";position:absolute;left:0}.zu-burger::before{top:-5px}.zu-burger::after{top:5px}
.zu-navbar-panel{position:absolute;left:0;right:0;top:100%;background:var(--zu-surface);border-bottom:1px solid var(--zu-border);box-shadow:var(--zu-shadow-lift);padding:8px 16px 16px;display:flex;flex-direction:column;gap:12px}
.zu-navbar-mobile{display:flex;flex-direction:column}
.zu .zu-navbar-mobile a{padding:12px 4px;color:var(--zu-text);font-weight:550;border-bottom:1px solid var(--zu-border)}
.zu .zu-navbar-mobile a[aria-current=page]{color:var(--zu-accent)}
.zu-navbar-panel-actions{display:flex;flex-wrap:wrap;gap:8px}
@media (max-width:720px){.zu-navbar-in{padding:0 16px;gap:12px}.zu-navbar-links,.zu-navbar-actions{display:none}.zu-navbar-menu{display:block}}

/* Tab, nomor halaman, dan langkah */
.zu-tabs{display:flex;gap:4px;border-bottom:1px solid var(--zu-border);overflow-x:auto;scrollbar-width:none}
.zu-tabs::-webkit-scrollbar{display:none}
.zu .zu-tabs a{display:inline-flex;align-items:center;gap:8px;padding:10px 14px;color:var(--zu-muted);font-weight:550;font-size:14px;white-space:nowrap;border-bottom:2px solid transparent;margin-bottom:-1px}
.zu .zu-tabs a:hover{color:var(--zu-text);text-decoration:none}
.zu .zu-tabs a[aria-current=page]{color:var(--zu-text);border-bottom-color:var(--zu-accent)}
.zu-tab-count{display:inline-grid;place-items:center;min-width:22px;height:20px;padding:0 6px;border-radius:999px;background:var(--zu-surface-2);color:var(--zu-muted);font-size:12px;font-weight:600}
.zu-tabs a[aria-current=page] .zu-tab-count{background:var(--zu-accent-soft);color:var(--zu-accent-hover)}
.zu-pagination{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.zu-pagination ol{list-style:none;margin:0;padding:0;display:flex;gap:4px}
.zu-page{display:inline-grid;place-items:center;min-width:36px;height:36px;padding:0 10px;border-radius:var(--zu-r-md);font-weight:600;font-size:14px;color:var(--zu-text);border:1px solid transparent;font-variant-numeric:tabular-nums}
.zu a.zu-page{color:var(--zu-text)}.zu a.zu-page:hover{background:var(--zu-surface-2);text-decoration:none}
.zu-page[aria-current=page]{background:var(--zu-accent);color:var(--zu-on-accent)}
.zu-page.edge{border-color:var(--zu-border-strong);background:var(--zu-surface)}
.zu-page[aria-disabled=true]{color:var(--zu-muted);background:transparent;border-color:var(--zu-border)}
.zu-page.gap{min-width:24px;padding:0;color:var(--zu-muted)}
.zu-page-label{display:none;color:var(--zu-muted);font-size:14px}
@media (max-width:640px){.zu-pagination{justify-content:space-between}.zu-pagination ol{display:none}.zu-page-label{display:inline}}
.zu-steps{list-style:none;margin:0;padding:0;display:flex;gap:12px;counter-reset:step}
.zu-steps li{flex:1;display:flex;align-items:flex-start;gap:10px;min-width:0;padding-top:12px;border-top:3px solid var(--zu-border)}
.zu-steps li.done,.zu-steps li.current{border-top-color:var(--zu-accent)}
.zu-step-dot{flex:none;display:grid;place-items:center;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:700;background:var(--zu-surface-2);color:var(--zu-muted);border:1px solid var(--zu-border-strong)}
.zu-steps li.current .zu-step-dot{background:var(--zu-accent);color:var(--zu-on-accent);border-color:var(--zu-accent)}
.zu-steps li.done .zu-step-dot{background:var(--zu-accent-soft);color:var(--zu-accent-hover);border-color:var(--zu-accent-line)}
.zu-step-text{display:flex;flex-direction:column;min-width:0;line-height:1.35}
.zu-step-text b{font-size:14px;font-weight:600}
.zu-steps li.todo .zu-step-text b{color:var(--zu-muted);font-weight:550}
.zu-step-text small{font-size:13px;color:var(--zu-muted)}
@media (max-width:640px){.zu-steps{flex-direction:column;gap:0}.zu-steps li{border-top:0;border-left:3px solid var(--zu-border);padding:8px 0 8px 12px}.zu-steps li.done,.zu-steps li.current{border-left-color:var(--zu-accent)}}

/* Menu tarik-turun */
.zu-dropdown{position:relative;display:inline-block}
.zu-dropdown > summary{list-style:none}
.zu-dropdown > summary::-webkit-details-marker{display:none}
.zu-caret{width:7px;height:7px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:translateY(-2px) rotate(45deg)}
.zu-menu{position:absolute;left:0;top:calc(100% + 6px);z-index:calc(var(--zu-z-nav) - 1);min-width:190px;padding:6px;background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-md);box-shadow:var(--zu-shadow-lift);display:flex;flex-direction:column}
.zu-dropdown.end .zu-menu{left:auto;right:0}
.zu-menu form{display:block;margin:0}
.zu .zu-menu-item{display:block;width:100%;text-align:left;padding:9px 12px;border:0;border-radius:var(--zu-r-sm);background:transparent;font:inherit;font-size:14px;font-weight:500;color:var(--zu-text);cursor:pointer;white-space:nowrap}
.zu .zu-menu-item:hover,.zu .zu-menu-item:focus-visible{background:var(--zu-surface-2);text-decoration:none}
.zu .zu-menu-item.danger{color:var(--zu-danger)}

/* Navigasi bawah (ponsel) dan kaki halaman */
.zu-bottomnav{display:none}
@media (max-width:720px){
body.zu:has(.zu-bottomnav){padding-bottom:calc(64px + env(safe-area-inset-bottom))}
.zu-bottomnav{position:fixed;left:0;right:0;bottom:0;z-index:var(--zu-z-nav);display:flex;background:var(--zu-surface);border-top:1px solid var(--zu-border);padding-bottom:env(safe-area-inset-bottom)}}
.zu .zu-bottomnav a{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;height:64px;color:var(--zu-muted);font-size:12px;font-weight:600}
.zu .zu-bottomnav a:hover{text-decoration:none;color:var(--zu-text)}
.zu .zu-bottomnav a[aria-current=page]{color:var(--zu-accent)}
.zu-bottomnav-icon{font-size:20px;line-height:1}
.zu-footer{margin-top:64px;border-top:1px solid var(--zu-border);background:var(--zu-surface-2)}
.zu-footer-in{max-width:1180px;margin:0 auto;padding:40px 24px 28px;display:flex;flex-direction:column;gap:28px}
.zu-footer-cols{display:grid;gap:28px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}
.zu-footer h2{font-size:13px;font-weight:650;color:var(--zu-text);margin-bottom:10px}
.zu-footer ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}
.zu .zu-footer a{color:var(--zu-muted);font-size:14px}.zu .zu-footer a:hover{color:var(--zu-text)}
.zu-footer-base{display:flex;align-items:center;justify-content:space-between;gap:12px 24px;flex-wrap:wrap;font-size:13px;color:var(--zu-muted)}
.zu-footer-base nav{display:flex;gap:16px;flex-wrap:wrap}
@media (max-width:720px){.zu-footer-in{padding:32px 16px 24px}}

/* Lapisan: dialog, laci, popover, tooltip (atribut popover bawaan browser) */
.zu-dialog,.zu-drawer{padding:0;border:1px solid var(--zu-border);background:var(--zu-surface);color:var(--zu-text);box-shadow:0 24px 60px -20px rgba(13,23,25,.45)}
.zu-dialog{width:min(560px,calc(100vw - 32px));max-height:calc(100dvh - 48px);border-radius:var(--zu-r-lg);overflow:auto}
.zu-dialog.sm{width:min(420px,calc(100vw - 32px))}.zu-dialog.lg{width:min(820px,calc(100vw - 32px))}
.zu-dialog::backdrop,.zu-drawer::backdrop{background:rgba(9,16,18,.5);backdrop-filter:blur(2px)}
.zu-dialog-head{display:flex;align-items:center;gap:12px;padding:18px 20px 0 24px}
.zu-dialog-head h2{flex:1;font-size:17px}
.zu-dialog-body{padding:14px 24px 20px;display:flex;flex-direction:column;gap:12px}
.zu-dialog-body > p{color:var(--zu-muted)}
.zu-dialog-foot{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;padding:14px 24px 20px;border-top:1px solid var(--zu-border);margin:0}
.zu-close{flex:none;display:grid;place-items:center;width:32px;height:32px;border:0;border-radius:var(--zu-r-sm);background:transparent;color:var(--zu-muted);font:inherit;font-size:22px;line-height:1;cursor:pointer}
.zu-close:hover{background:var(--zu-surface-2);color:var(--zu-text)}
.zu-drawer{margin:0;height:100dvh;max-height:100dvh;width:min(400px,calc(100vw - 40px));top:0;bottom:0;inset-inline-start:auto;inset-inline-end:0;display:none;flex-direction:column}
.zu-drawer:popover-open{display:flex}
.zu-drawer.left{inset-inline-start:0;inset-inline-end:auto}
.zu-drawer.bottom{top:auto;inset-inline:0;width:100%;height:auto;max-height:85dvh;border-radius:var(--zu-r-lg) var(--zu-r-lg) 0 0}
.zu-drawer-body{flex:1;overflow:auto;padding:14px 24px 20px;display:flex;flex-direction:column;gap:12px}
.zu-popover-wrap{display:inline-block}
.zu-popover{margin:0;padding:14px 16px;width:min(320px,calc(100vw - 32px));border:1px solid var(--zu-border);border-radius:var(--zu-r-md);background:var(--zu-surface);color:var(--zu-text);box-shadow:var(--zu-shadow-lift);font-size:14px;inset:auto;top:50%;left:50%;translate:-50% -50%}
@supports (position-area:bottom){.zu-popover{inset:auto;translate:none;position-area:bottom span-right;position-try-fallbacks:flip-block,flip-inline;margin-top:6px}}
.zu-tip{position:relative;display:inline-flex}
.zu-tip-text{display:none;position:absolute;left:50%;bottom:calc(100% + 8px);transform:translateX(-50%);z-index:calc(var(--zu-z-nav) + 1);width:max-content;max-width:240px;padding:6px 10px;border-radius:var(--zu-r-sm);background:var(--zu-text);color:var(--zu-bg);font-size:13px;font-weight:500;line-height:1.4;pointer-events:none}
.zu-tip:hover .zu-tip-text,.zu-tip:focus-within .zu-tip-text{display:block}
@media (prefers-reduced-motion:no-preference){.zu-dialog:popover-open{animation:zu-pop .18s var(--zu-ease)}.zu-drawer:popover-open{animation:zu-slide .22s var(--zu-ease)}.zu-drawer.left:popover-open{animation-name:zu-slide-left}.zu-drawer.bottom:popover-open{animation-name:zu-slide-up}
@keyframes zu-pop{from{opacity:0;transform:scale(.97)}}@keyframes zu-slide{from{transform:translateX(24px);opacity:.6}}@keyframes zu-slide-left{from{transform:translateX(-24px);opacity:.6}}@keyframes zu-slide-up{from{transform:translateY(24px);opacity:.6}}}

/* Umpan balik: toast, progres, spinner, skeleton */
.zu-toasts{position:fixed;right:20px;bottom:20px;z-index:calc(var(--zu-z-grain) + 2);display:flex;flex-direction:column;gap:8px;max-width:min(420px,calc(100vw - 32px))}
.zu-toast{display:flex;align-items:center;gap:10px;padding:12px 8px 12px 16px;border-radius:var(--zu-r-md);background:var(--zu-text);color:var(--zu-bg);box-shadow:var(--zu-shadow-lift);font-size:14px;font-weight:550}
.zu-toast > span{flex:1}
.zu-toast::before{content:"";flex:none;width:8px;height:8px;border-radius:50%;background:var(--zu-accent-line)}
.zu-toast.success::before{background:#47cd89}.zu-toast.warn::before{background:#f0b35e}.zu-toast.error::before{background:#f97066}
.zu-toast .zu-close{color:inherit;opacity:.75}.zu-toast .zu-close:hover{background:transparent;opacity:1}
.zu-toast.hide{opacity:0;transform:translateY(8px);transition:opacity .2s var(--zu-ease),transform .2s var(--zu-ease)}
@media (max-width:640px){.zu-toasts{left:16px;right:16px;bottom:16px;max-width:none}body.zu:has(.zu-bottomnav) .zu-toasts{bottom:80px}}
.zu-progress{display:flex;flex-direction:column;gap:6px}
.zu-progress-head{display:flex;justify-content:space-between;gap:12px;font-size:14px;font-weight:550}
.zu-progress-head small{color:var(--zu-muted);font-weight:500;font-variant-numeric:tabular-nums}
.zu-progress progress{appearance:none;-webkit-appearance:none;width:100%;height:8px;border:0;border-radius:999px;background:var(--zu-surface-3);overflow:hidden;accent-color:var(--zu-accent)}
.zu-progress progress::-webkit-progress-bar{background:var(--zu-surface-3);border-radius:999px}
.zu-progress progress::-webkit-progress-value{background:var(--zu-accent);border-radius:999px}
.zu-progress progress::-moz-progress-bar{background:var(--zu-accent);border-radius:999px}
.zu-spinner{display:inline-flex;align-items:center;gap:10px;color:var(--zu-muted);font-size:14px}
.zu-spinner-ring{width:20px;height:20px;border-radius:50%;border:2.5px solid var(--zu-surface-3);border-top-color:var(--zu-accent);animation:zu-spin .8s linear infinite}
.zu-spinner.sm .zu-spinner-ring{width:14px;height:14px;border-width:2px}.zu-spinner.lg .zu-spinner-ring{width:32px;height:32px;border-width:3px}
@keyframes zu-spin{to{transform:rotate(360deg)}}
.zu-skeleton{display:flex;flex-wrap:wrap;align-items:flex-start;gap:14px}
.zu-skel-lines{flex:1;min-width:160px;display:flex;flex-direction:column;gap:10px;padding-top:4px}
.zu-skel-line,.zu-skel-avatar,.zu-skel-block{display:block;background:var(--zu-surface-3);border-radius:var(--zu-r-sm)}
.zu-skel-line{height:12px}.zu-skel-line.short{width:60%}
.zu-skel-avatar{width:40px;height:40px;border-radius:50%;flex:none}
.zu-skel-block{width:100%;height:140px;border-radius:var(--zu-r-md)}
@media (prefers-reduced-motion:no-preference){.zu-skel-line,.zu-skel-avatar,.zu-skel-block{animation:zu-pulse 1.4s ease-in-out infinite}@keyframes zu-pulse{50%{opacity:.5}}}

/* Tampilan data: detail, akordeon, linimasa, tag, avatar, rating, kode, kalender */
.zu-dl{margin:0;display:grid;grid-template-columns:1fr}
.zu-dl > div{display:grid;grid-template-columns:minmax(120px,1fr) 2fr;gap:4px 16px;padding:11px 0;border-bottom:1px solid var(--zu-border);font-size:14px}
.zu-dl > div:last-child{border-bottom:0}
.zu-dl dt{color:var(--zu-muted);font-weight:500}
.zu-dl dd{margin:0;min-width:0;overflow-wrap:anywhere}
.zu-dl.c2{grid-template-columns:1fr 1fr;column-gap:32px}
.zu-dl.c2 > div:nth-last-child(2):nth-child(odd){border-bottom:0}
@media (max-width:640px){.zu-dl.c2{grid-template-columns:1fr}.zu-dl.c2 > div:nth-last-child(2):nth-child(odd){border-bottom:1px solid var(--zu-border)}.zu-dl > div{grid-template-columns:1fr}}
.zu-accordion{background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow)}
.zu-accordion details + details{border-top:1px solid var(--zu-border)}
.zu-accordion summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:15px 20px;font-weight:600}
.zu-accordion summary::-webkit-details-marker{display:none}
.zu-accordion summary::after{content:"";flex:none;width:8px;height:8px;border-right:2px solid var(--zu-muted);border-bottom:2px solid var(--zu-muted);transform:rotate(45deg);transition:transform .15s var(--zu-ease)}
.zu-accordion details[open] > summary::after{transform:rotate(-135deg)}
.zu-accordion summary:hover{color:var(--zu-accent)}
.zu-accordion details > div{padding:0 20px 18px;color:var(--zu-muted)}
.zu-timeline{list-style:none;margin:0;padding:0}
.zu-timeline li{position:relative;padding:0 0 20px 26px}
.zu-timeline li::before{content:"";position:absolute;left:4px;top:7px;width:10px;height:10px;border-radius:50%;background:var(--zu-surface);border:2px solid var(--zu-border-strong)}
.zu-timeline li::after{content:"";position:absolute;left:9px;top:21px;bottom:2px;width:2px;background:var(--zu-border)}
.zu-timeline li:last-child{padding-bottom:0}.zu-timeline li:last-child::after{display:none}
.zu-timeline li.accent::before{border-color:var(--zu-accent);background:var(--zu-accent)}.zu-timeline li.ok::before{border-color:var(--zu-ok);background:var(--zu-ok)}.zu-timeline li.warn::before{border-color:var(--zu-warn);background:var(--zu-warn)}.zu-timeline li.danger::before{border-color:var(--zu-danger);background:var(--zu-danger)}
.zu-timeline-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;flex-wrap:wrap}
.zu-timeline-head b{font-weight:600;font-size:14px}
.zu-timeline time{color:var(--zu-muted);font-size:13px;font-variant-numeric:tabular-nums}
.zu-timeline-text{margin-top:2px;color:var(--zu-muted);font-size:14px}
.zu-tag{display:inline-flex;align-items:center;height:28px;padding:0 12px;border-radius:999px;border:1px solid var(--zu-border-strong);background:var(--zu-surface);color:var(--zu-text);font-size:13px;font-weight:550;white-space:nowrap}
.zu a.zu-tag{color:var(--zu-text)}.zu a.zu-tag:hover{text-decoration:none;border-color:var(--zu-accent-line);background:var(--zu-accent-soft)}
.zu .zu-tag.active{background:var(--zu-accent);border-color:var(--zu-accent);color:var(--zu-on-accent)}
.zu-avatars{display:inline-flex;align-items:center}
.zu-avatars > .zu-avatar{box-shadow:0 0 0 2px var(--zu-surface)}
.zu-avatars > .zu-avatar + .zu-avatar{margin-left:-6px}
.zu-avatar.more{background:var(--zu-surface-2);color:var(--zu-muted);font-size:12px}
.zu-rating{display:inline-flex;align-items:center;gap:6px;font-size:14px}
.zu-stars{letter-spacing:1px;color:var(--zu-muted);font-size:16px;line-height:1}
.zu-stars .on{color:var(--zu-gold)}
.zu-rating b{font-weight:650}.zu-rating small{color:var(--zu-muted)}
.zu-rating-input{border:0;margin:0;padding:0;min-width:0}
.zu-rating-input legend{padding:0;margin-bottom:6px;font-weight:600;font-size:14px}
.zu-stars-input{display:inline-flex;flex-direction:row-reverse;justify-content:flex-end;gap:2px}
.zu-stars-input input{position:absolute;opacity:0;width:1px;height:1px;margin:0}
.zu-stars-input label{cursor:pointer;font-size:28px;line-height:1;padding:2px;color:var(--zu-faint);transition:color .12s var(--zu-ease)}
.zu-stars-input input:checked ~ label,.zu-stars-input label:hover,.zu-stars-input label:hover ~ label{color:var(--zu-gold)}
.zu-stars-input input:focus-visible + label{outline:2px solid var(--zu-accent);outline-offset:1px;border-radius:var(--zu-r-sm)}
.zu-code{margin:0;border:1px solid var(--zu-border);border-radius:var(--zu-r-md);background:var(--zu-surface-2);overflow:hidden}
.zu-code figcaption{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:6px 8px 6px 14px;border-bottom:1px solid var(--zu-border);font-size:12px;font-weight:600;color:var(--zu-muted)}
.zu-copy{border:1px solid var(--zu-border-strong);background:var(--zu-surface);color:var(--zu-text);font:inherit;font-size:12px;font-weight:600;padding:3px 10px;border-radius:var(--zu-r-sm);cursor:pointer}
.zu-copy[hidden]{display:none}
.zu-code pre{margin:0;padding:14px 16px;overflow-x:auto;font-family:var(--zu-mono);font-size:13px;line-height:1.6}
.zu-code pre code{background:none;padding:0;font-size:inherit;overflow-wrap:normal}
.zu-calendar{background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow);overflow:hidden}
.zu-cal-head{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px 14px 20px;border-bottom:1px solid var(--zu-border)}
.zu-cal-head h2{text-transform:capitalize}
.zu-cal-nav{display:flex;gap:4px}.zu-cal-nav .zu-btn{font-size:18px;min-width:36px}
.zu-cal-grid table{width:100%;border-collapse:collapse;table-layout:fixed}
.zu-cal-grid th{padding:8px;font-size:12px;font-weight:600;color:var(--zu-muted);text-align:left;text-transform:capitalize;border-bottom:1px solid var(--zu-border)}
.zu-cal-grid td{height:104px;vertical-align:top;padding:6px;border-right:1px solid var(--zu-border);border-bottom:1px solid var(--zu-border)}
.zu-cal-grid td:last-child{border-right:0}.zu-cal-grid tr:last-child td{border-bottom:0}
.zu-cal-grid td.out{background:var(--zu-surface-2)}
.zu-cal-day{display:inline-grid;place-items:center;width:26px;height:26px;border-radius:50%;font-size:13px;font-weight:600;font-variant-numeric:tabular-nums}
.zu-cal-day[aria-current=date]{background:var(--zu-accent);color:var(--zu-on-accent)}
.zu-cal-event{display:block;margin-top:4px;padding:2px 6px;border-radius:var(--zu-r-sm);background:var(--zu-accent-soft);color:var(--zu-text);font-size:12px;font-weight:550;line-height:1.35;overflow-wrap:anywhere}
.zu a.zu-cal-event{color:var(--zu-text)}.zu a.zu-cal-event:hover{text-decoration:none;background:var(--zu-accent-line)}
.zu-cal-event.ok{background:var(--zu-ok-soft)}.zu-cal-event.warn{background:var(--zu-warn-soft)}.zu-cal-event.danger{background:var(--zu-danger-soft)}
.zu-cal-time{color:var(--zu-muted);font-variant-numeric:tabular-nums}
.zu-cal-list{list-style:none;margin:0;padding:0;display:none}
.zu-cal-list li{display:grid;grid-template-columns:minmax(120px,1fr) 2fr;gap:4px 16px;padding:12px 20px;border-bottom:1px solid var(--zu-border)}
.zu-cal-list li:last-child{border-bottom:0}
.zu-cal-list li b{font-size:14px;font-weight:600;text-transform:capitalize}
.zu-cal-list li.today b{color:var(--zu-accent)}
.zu-cal-list .zu-cal-event{margin:0 0 4px}
.zu-cal-empty{display:none;padding:20px;color:var(--zu-muted);font-size:14px}
.zu-calendar.list .zu-cal-list,.zu-calendar.list .zu-cal-empty{display:block}
@media (max-width:640px){.zu-cal-grid{display:none}.zu-cal-list,.zu-cal-empty{display:block}.zu-cal-list li{grid-template-columns:1fr}}

/* Angka ringkasan dengan tren */
.zu-trend{font-weight:650}
.zu-trend.good{color:var(--zu-ok)}.zu-trend.bad{color:var(--zu-danger)}.zu-trend.flat{color:var(--zu-muted)}

/* Halaman status (403, 404, 500) */
.zu-status{min-height:100dvh;display:grid;place-items:center;padding:40px 24px}
.zu-status-box{max-width:460px;display:flex;flex-direction:column;align-items:flex-start;gap:12px}
.zu-status-box .zu-brand{margin-bottom:20px}
.zu-status-code{font-size:64px;font-weight:700;letter-spacing:-.04em;line-height:1;color:var(--zu-accent);font-variant-numeric:tabular-nums}
.zu-status-box h1{font-size:26px}
.zu-status-box > p:not(.zu-status-code){color:var(--zu-muted);margin-bottom:12px}

/* Halaman publik */
.zu-stretch{color:inherit;text-decoration:none}
.zu-stretch::after{content:"";position:absolute;inset:0;border-radius:inherit}
.zu-stretch:focus-visible{outline:none}.zu-stretch:focus-visible::after{outline:2px solid var(--zu-accent);outline-offset:2px}
.zu-hero{display:grid;gap:40px;align-items:center;padding:48px 0}
.zu-hero.media{grid-template-columns:1.1fr 1fr}
.zu-hero.center{text-align:center;justify-items:center}.zu-hero.center .zu-hero-text{max-width:720px;align-items:center}
.zu-hero-text{display:flex;flex-direction:column;align-items:flex-start;gap:16px;min-width:0}
.zu .zu-hero h1{font-size:clamp(32px,5vw,52px);line-height:1.08;letter-spacing:-.035em}
.zu-eyebrow{font-size:13px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--zu-accent-hover)}
.zu-hero-lead{font-size:18px;color:var(--zu-muted);max-width:560px}
.zu-hero-actions{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
.zu-hero.center .zu-hero-actions{justify-content:center}
.zu-hero-media img{display:block;width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow-lift);background:var(--zu-surface-2)}
@media (max-width:820px){.zu-hero{padding:24px 0}.zu-hero.media{grid-template-columns:1fr;gap:28px}.zu-hero-lead{font-size:16px}}
.zu-block-section{display:grid;gap:24px}
.zu-block-head{display:grid;gap:8px;max-width:640px}
.zu .zu-block-head h2,.zu .zu-cta h2{font-size:clamp(22px,3vw,30px);letter-spacing:-.025em}
.zu-block-head p{color:var(--zu-muted)}
.zu-features{display:grid;gap:16px;grid-template-columns:repeat(var(--zu-cols,3),minmax(0,1fr))}
.zu-features.c2{--zu-cols:2}.zu-features.c4{--zu-cols:4}
.zu-feature{display:grid;align-content:start;gap:8px;padding:20px;background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg)}
.zu-feature-icon{width:40px;height:40px;display:grid;place-items:center;font-size:20px;border-radius:var(--zu-r-md);background:var(--zu-accent-soft);color:var(--zu-accent-hover)}
.zu-feature p{color:var(--zu-muted);font-size:14px}
@media (max-width:900px){.zu-features.c3,.zu-features.c4{--zu-cols:2}}
@media (max-width:640px){.zu-features{--zu-cols:1!important}}
.zu-media-card{position:relative;display:flex;flex-direction:column;background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow);overflow:hidden;transition:box-shadow .15s var(--zu-ease)}
.zu-media-card:has(.zu-stretch):hover{box-shadow:var(--zu-shadow-lift)}
.zu-media-card > img{display:block;width:100%;height:auto;aspect-ratio:16/10;object-fit:cover;background:var(--zu-surface-2)}
.zu-media-body{display:grid;gap:6px;padding:16px 18px 18px}
.zu-media-body small{color:var(--zu-muted);font-size:13px}
.zu-media-body p{color:var(--zu-muted);font-size:14px}
.zu-media-actions{position:relative;z-index:1;display:flex;flex-wrap:wrap;gap:8px;margin-top:6px}
.zu-gallery{display:grid;gap:12px;grid-template-columns:repeat(var(--zu-cols,3),minmax(0,1fr))}
.zu-gallery.c2{--zu-cols:2}.zu-gallery.c4{--zu-cols:4}
.zu-gallery figure{margin:0;display:grid;gap:6px}
.zu-gallery a{display:block;border-radius:var(--zu-r-md)}
.zu-gallery img{display:block;width:100%;height:auto;object-fit:cover;border-radius:var(--zu-r-md);background:var(--zu-surface-2);aspect-ratio:4/3}
.zu-gallery.square img{aspect-ratio:1}.zu-gallery.portrait img{aspect-ratio:3/4}
.zu-gallery figcaption{font-size:13px;color:var(--zu-muted)}
@media (max-width:900px){.zu-gallery.c3,.zu-gallery.c4{--zu-cols:2}}
.zu-pricing{display:grid;gap:16px;grid-template-columns:repeat(var(--zu-cols,3),minmax(0,1fr));align-items:stretch}
.zu-pricing.n1{--zu-cols:1;max-width:400px}.zu-pricing.n2{--zu-cols:2;max-width:820px}.zu-pricing.n4{--zu-cols:4}
.zu-plan{position:relative;display:flex;flex-direction:column;gap:12px;padding:24px;background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow)}
.zu-plan.featured{border-color:var(--zu-accent);box-shadow:0 0 0 1px var(--zu-accent),var(--zu-shadow-lift)}
.zu-plan-badge{align-self:flex-start;font-size:12px;font-weight:650;padding:3px 10px;border-radius:999px;background:var(--zu-accent);color:var(--zu-on-accent)}
.zu-plan-desc{color:var(--zu-muted);font-size:14px}
.zu-plan-price{display:flex;align-items:baseline;flex-wrap:wrap;gap:4px}
.zu-plan-price b{font-size:32px;font-weight:700;letter-spacing:-.03em;font-variant-numeric:tabular-nums}
.zu-plan-price span{color:var(--zu-muted)}
.zu-plan ul{list-style:none;margin:4px 0 8px;padding:0;display:grid;gap:8px;flex:1;align-content:start}
.zu-plan li{display:flex;gap:10px;font-size:14px}
.zu-plan li::before{content:"";flex:none;width:6px;height:11px;margin:3px 3px 0;border-right:2px solid var(--zu-accent);border-bottom:2px solid var(--zu-accent);transform:rotate(45deg)}
@media (max-width:900px){.zu-pricing.n3,.zu-pricing.n4{--zu-cols:2}}
@media (max-width:640px){.zu-pricing{--zu-cols:1!important}}
.zu-testimonial{margin:0;display:grid;gap:14px;align-content:start;padding:22px;background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg)}
.zu-testimonial blockquote{margin:0;font-size:16px;line-height:1.6}
.zu-testimonial figcaption{display:flex;align-items:center;gap:10px}
.zu-testimonial figcaption > span:last-child{display:grid}
.zu-testimonial small{color:var(--zu-muted);font-size:13px}
.zu-photo{width:40px;height:40px;border-radius:999px;object-fit:cover;background:var(--zu-surface-2)}
.zu-cta{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:20px 32px;padding:32px;border-radius:var(--zu-r-lg);background:var(--zu-accent-soft);border:1px solid var(--zu-accent-line)}
.zu-cta > div:first-child{display:grid;gap:8px;max-width:620px}
.zu-cta p{color:var(--zu-muted)}
.zu-cta-actions{display:flex;flex-wrap:wrap;gap:12px}
@media (max-width:640px){.zu-cta{padding:24px}}
.zu-logos{display:grid;gap:16px;justify-items:center}
.zu-logos > p{font-size:13px;font-weight:600;color:var(--zu-muted)}
.zu-logos ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:20px 40px}
.zu-logos img{display:block;height:32px;width:auto;max-width:140px;object-fit:contain;filter:grayscale(1);opacity:.75;transition:opacity .15s var(--zu-ease),filter .15s var(--zu-ease)}
.zu-logos a:hover img{filter:none;opacity:1}
.zu-team{display:grid;gap:6px;justify-items:center;text-align:center;padding:20px;background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg)}
.zu-team-photo{width:112px;height:112px;border-radius:999px;object-fit:cover;background:var(--zu-surface-2);margin-bottom:8px}
.zu-team-photo.initials{display:grid;place-items:center}
.zu-team-photo.initials .zu-avatar{width:100%;height:100%;border-radius:999px;font-size:32px}
.zu-team-role{color:var(--zu-accent-hover);font-size:14px;font-weight:600}
.zu-team > p:not(.zu-team-role):not(.zu-team-links){color:var(--zu-muted);font-size:14px}
.zu-team-links{display:flex;flex-wrap:wrap;justify-content:center;gap:4px 14px;font-size:14px;margin-top:4px}

/* Toko dan usaha */
.zu-price{display:inline-flex;align-items:baseline;flex-wrap:wrap;gap:4px 8px;font-variant-numeric:tabular-nums}
.zu-price b{font-weight:700;font-size:16px}
.zu-price.large b{font-size:28px;letter-spacing:-.02em}
.zu-price span{color:var(--zu-muted);font-size:14px}
.zu-price del{color:var(--zu-muted);font-size:13px}
.zu-product{position:relative;display:flex;flex-direction:column;background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow);overflow:hidden;transition:box-shadow .15s var(--zu-ease)}
.zu-product:has(.zu-stretch):hover{box-shadow:var(--zu-shadow-lift)}
.zu-product-photo{display:block;width:100%;height:auto;aspect-ratio:1;object-fit:cover;background:var(--zu-surface-2)}
.zu-product.sold-out .zu-product-photo{filter:grayscale(1);opacity:.6}
.zu-product-body{display:flex;flex-direction:column;align-items:flex-start;gap:6px;padding:14px 16px 16px;flex:1}
.zu-product-body h3{font-size:15px;font-weight:600;line-height:1.35}
.zu-product-rating{font-size:13px;color:var(--zu-text)}
.zu-product-rating > span:first-child{color:var(--zu-gold)}
.zu-product-rating small{color:var(--zu-muted)}
.zu-product-action{position:relative;z-index:1;margin-top:auto;padding-top:8px;align-self:stretch;display:flex;gap:8px}
.zu-product-action .zu-inline,.zu-product-action > .zu-btn{flex:1}
.zu-product-action .zu-inline .zu-btn{width:100%}
.zu-qty-field{display:grid;gap:6px}
.zu-qty-field label{font-weight:600;font-size:14px}
.zu-qty{display:inline-flex;align-items:stretch;width:max-content;border:1px solid var(--zu-border-strong);border-radius:var(--zu-r-md);background:var(--zu-surface);overflow:hidden}
.zu-qty .zu-input{width:64px;border:0;border-radius:0;text-align:center;box-shadow:none;-moz-appearance:textfield;appearance:textfield}
.zu-qty .zu-input::-webkit-inner-spin-button,.zu-qty .zu-input::-webkit-outer-spin-button{-webkit-appearance:none;margin:0}
.zu-qty:focus-within{border-color:var(--zu-accent);box-shadow:0 0 0 3px var(--zu-accent-soft)}
.zu-qty button{width:40px;border:0;background:var(--zu-surface-2);color:var(--zu-text);font:inherit;font-size:18px;cursor:pointer}
.zu-qty button:hover{background:var(--zu-surface-3)}
.zu-qty button:focus-visible{outline:2px solid var(--zu-accent);outline-offset:-2px}
.zu-cart{display:grid;gap:16px;padding:22px 24px 24px;background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-r-lg);box-shadow:var(--zu-shadow)}
.zu-cart-empty{color:var(--zu-muted)}
.zu-cart-items{list-style:none;margin:0;padding:0;display:grid}
.zu-cart-items li{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:6px 14px;padding:12px 0;border-bottom:1px solid var(--zu-border)}
.zu-cart-items li:not(:has(img)){grid-template-columns:minmax(0,1fr) auto}
.zu-cart-items img{width:56px;height:56px;border-radius:var(--zu-r-md);object-fit:cover;background:var(--zu-surface-2)}
.zu-cart-name{display:grid;gap:2px;min-width:0}
.zu-cart-name small{color:var(--zu-muted);font-size:13px}
.zu-cart-line{font-variant-numeric:tabular-nums;white-space:nowrap}
.zu-cart-actions{grid-column:1 / -1;display:flex;flex-wrap:wrap;align-items:center;gap:8px}
.zu-cart-totals{margin:0;display:grid;gap:8px}
.zu-cart-totals > div{display:flex;justify-content:space-between;gap:16px}
.zu-cart-totals dt{color:var(--zu-muted)}
.zu-cart-totals dd{margin:0;font-variant-numeric:tabular-nums}
.zu-cart-totals .good dd{color:var(--zu-ok)}
.zu-cart-totals .total{padding-top:10px;border-top:1px solid var(--zu-border);font-weight:700;font-size:18px}
.zu-cart-totals .total dt{color:var(--zu-text)}

.zu-gallery-demo img.zu-demo-img{display:block;max-width:100%;height:auto;border-radius:var(--zu-r-md)}
/* Galeri: komponen yang biasanya melayang ditampilkan di tempat */
.zu-gallery-demo .zu-toasts,.zu-gallery-demo .zu-bottomnav{position:static;display:flex}
.zu-gallery-demo .zu-toasts{max-width:none}
.zu-gallery-demo .zu-navbar{position:static}.zu-gallery-demo .zu-footer{margin-top:0}.zu-gallery-demo .zu-status{min-height:0;padding:8px 0;place-items:start}

/* Gerak: hanya bila pengguna tidak meminta gerak dikurangi */
@media (prefers-reduced-motion:no-preference){
.zu-alert{animation:zu-in .28s var(--zu-ease) both}
.zu-main > *{animation:zu-rise .32s var(--zu-ease) both}
.zu-main > :nth-child(2){animation-delay:.03s}.zu-main > :nth-child(3){animation-delay:.06s}.zu-main > :nth-child(n+4){animation-delay:.09s}
@keyframes zu-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@keyframes zu-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.zu *{transition:none!important}}
`;
