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
 * Stylesheet kit UI Zentara (disajikan di /_zentara/ui.css). Semua warna berupa variabel CSS; tema dari
 * `ui` di zentara.config.mjs menimpanya lewat /_zentara/theme.css (lihat theme.ts). Mengikuti mode
 * gelap/terang sistem, atau mode yang dipaksa tema lewat `<html data-zu-mode>`.
 *
 * Arah desain: tenang dan presisi seperti alat developer. Zentara Teal satu-satunya aksen antarmuka
 * (emas hanya di logo), satu keluarga abu-abu kehijauan, skala sudut 6/10/16 px, font brand Plus
 * Jakarta Sans yang disajikan sendiri, dan gerak seperlunya (umpan balik tombol, pesan masuk).
 */
export const UI_CSS = `
@font-face{font-family:"Plus Jakarta Sans";font-style:normal;font-weight:200 800;font-display:swap;src:url(/_zentara/fonts/plus-jakarta-sans-latin-ext.woff2) format("woff2");unicode-range:${FONT_LATIN_EXT_RANGE}}
@font-face{font-family:"Plus Jakarta Sans";font-style:normal;font-weight:200 800;font-display:swap;src:url(/_zentara/fonts/plus-jakarta-sans-latin.woff2) format("woff2");unicode-range:${FONT_LATIN_RANGE}}
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
.zu-logo{display:inline-block;width:30px;height:30px;flex:none;background:url(/_zentara/logo.webp) center/contain no-repeat}
.zu a.zu-brand{display:inline-flex;align-items:center;gap:10px;font-weight:700;letter-spacing:-.01em;font-size:16px;color:var(--zu-text);white-space:nowrap}
.zu a.zu-brand:hover{text-decoration:none}
.zu-brand b{color:var(--zu-accent);font-weight:700}

/* Masuk & daftar: panel brand di kiri, formulir di kanan (panel brand disembunyikan di layar sempit) */
.zu-auth{min-height:100dvh;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr)}
.zu-auth-aside{position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:space-between;gap:48px;padding:40px 48px 44px;background:radial-gradient(640px 420px at 12% 108%,var(--zu-accent-soft),transparent 70%),var(--zu-surface-2);border-right:1px solid var(--zu-border)}
.zu-auth-aside::after{content:"";position:absolute;right:-120px;bottom:-140px;width:460px;height:460px;background:url(/_zentara/logo.webp) center/contain no-repeat;opacity:.07;pointer-events:none}
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

/* Gerak: hanya bila pengguna tidak meminta gerak dikurangi */
@media (prefers-reduced-motion:no-preference){
.zu-alert{animation:zu-in .28s var(--zu-ease) both}
.zu-main > *{animation:zu-rise .32s var(--zu-ease) both}
.zu-main > :nth-child(2){animation-delay:.03s}.zu-main > :nth-child(3){animation-delay:.06s}.zu-main > :nth-child(n+4){animation-delay:.09s}
@keyframes zu-in{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}
@keyframes zu-rise{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}}
@media (prefers-reduced-motion:reduce){html{scroll-behavior:auto}.zu *{transition:none!important}}
`;
