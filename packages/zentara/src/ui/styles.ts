import { BRAND } from "../brand/index.js";

/**
 * Stylesheet kit UI Zentara (disajikan di /_zentara/ui.css). Semua warna berupa variabel CSS, jadi
 * aplikasi bisa menyesuaikan tema dengan menimpa variabel di :root. Mengikuti mode gelap/terang sistem.
 */
export const UI_CSS = `
:root{color-scheme:light dark;--zu-bg:${BRAND.pearl};--zu-surface:#fff;--zu-surface-2:#eef2ef;--zu-border:#d5ddd8;--zu-text:${BRAND.obsidian};--zu-muted:#56686a;--zu-accent:#0b8a76;--zu-accent-hover:#08705f;--zu-on-accent:#fff;--zu-accent-soft:rgba(11,138,118,.1);--zu-gold:#9a7337;--zu-gold-soft:rgba(200,155,82,.16);--zu-danger:#c4321f;--zu-danger-soft:rgba(196,50,31,.08);--zu-ok:#0b8a4a;--zu-ok-soft:rgba(11,138,74,.1);--zu-warn:#a45c06;--zu-warn-soft:rgba(200,155,82,.16);--zu-glow:rgba(46,211,183,.16);--zu-glow-2:rgba(200,155,82,.1);--zu-shadow:0 1px 2px rgba(13,23,25,.05),0 8px 24px -8px rgba(13,23,25,.14);--zu-radius:14px;--zu-font:"Plus Jakarta Sans",ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;--zu-mono:"JetBrains Mono",ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
@media (prefers-color-scheme:dark){:root{--zu-bg:${BRAND.obsidian};--zu-surface:#112022;--zu-surface-2:#16292c;--zu-border:#223a3d;--zu-text:${BRAND.pearl};--zu-muted:${BRAND.slate};--zu-accent:${BRAND.teal};--zu-accent-hover:#5fe0c9;--zu-on-accent:${BRAND.obsidian};--zu-accent-soft:rgba(46,211,183,.12);--zu-gold:${BRAND.gold};--zu-danger:#f97066;--zu-danger-soft:rgba(249,112,102,.1);--zu-ok:#47cd89;--zu-ok-soft:rgba(71,205,137,.1);--zu-warn:#e0b573;--zu-warn-soft:rgba(200,155,82,.12);--zu-glow:rgba(46,211,183,.11);--zu-glow-2:rgba(200,155,82,.08);--zu-shadow:0 1px 2px rgba(0,0,0,.3),0 12px 32px -12px rgba(0,0,0,.6)}}
*,*::before,*::after{box-sizing:border-box}
html,body{margin:0}
body.zu{min-height:100vh;background:radial-gradient(1100px 480px at 6% -10%,var(--zu-glow),transparent 60%),radial-gradient(800px 380px at 106% -6%,var(--zu-glow-2),transparent 60%),var(--zu-bg);background-attachment:fixed;color:var(--zu-text);font:15px/1.6 var(--zu-font);-webkit-font-smoothing:antialiased}
.zu a{color:var(--zu-accent);text-decoration:none}.zu a:hover{text-decoration:underline}
.zu h1,.zu h2,.zu h3{letter-spacing:-.015em;line-height:1.25;margin:0}
.zu h1{font-size:24px}.zu h2{font-size:18px}.zu h3{font-size:15px}
.zu p{margin:0}
.zu code{font-family:var(--zu-mono);font-size:13px;background:var(--zu-surface-2);padding:1px 6px;border-radius:6px}
.zu-muted{color:var(--zu-muted)}
.zu-stack{display:flex;flex-direction:column;gap:16px}
.zu-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.zu-spacer{flex:1}
.zu-logo{display:inline-block;width:34px;height:34px;flex:none;background:url(/_zentara/logo.webp) center/contain no-repeat}
.zu a.zu-brand{display:flex;align-items:center;gap:10px;font-weight:700;letter-spacing:-.015em;font-size:17px;color:var(--zu-text)}
.zu a.zu-brand:hover{text-decoration:none}
.zu-brand b{color:var(--zu-accent);font-weight:700}

/* Halaman masuk/daftar */
.zu-auth{min-height:100vh;display:grid;place-items:center;padding:32px 16px}
.zu-auth-box{width:100%;max-width:420px}
.zu-auth-head{display:flex;flex-direction:column;align-items:center;text-align:center;gap:6px;margin-bottom:20px}
.zu-auth-head .zu-logo{width:52px;height:52px;margin-bottom:6px}
.zu-auth-foot{text-align:center;margin-top:18px;color:var(--zu-muted);font-size:14px}

/* Kerangka aplikasi: sidebar + konten */
.zu-shell{display:grid;grid-template-columns:248px 1fr;min-height:100vh}
.zu-side{position:sticky;top:0;height:100vh;display:flex;flex-direction:column;gap:18px;padding:20px 14px;border-right:1px solid var(--zu-border);background:color-mix(in srgb,var(--zu-surface) 70%,transparent);backdrop-filter:blur(8px)}
.zu-side .zu-brand{padding:4px 8px}
.zu-nav{display:flex;flex-direction:column;gap:2px}
.zu-nav a{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;color:var(--zu-text);font-weight:500}
.zu-nav a:hover{background:var(--zu-surface-2);text-decoration:none}
.zu-nav a[aria-current=page]{background:var(--zu-accent-soft);color:var(--zu-accent);font-weight:600}
.zu-nav-label{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--zu-muted);padding:10px 10px 4px}
.zu-side-foot{margin-top:auto;display:flex;flex-direction:column;gap:10px;padding:12px 8px 0;border-top:1px solid var(--zu-border)}
.zu-user{display:flex;align-items:center;gap:10px;min-width:0}
.zu-avatar{width:34px;height:34px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:700;font-size:14px;background:var(--zu-accent-soft);color:var(--zu-accent)}
.zu-user-text{min-width:0;line-height:1.3}
.zu-user-text b{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zu-user-text small{display:block;color:var(--zu-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zu-main{min-width:0;padding:28px 32px 64px}
.zu-main-inner{max-width:1080px;margin:0 auto;display:flex;flex-direction:column;gap:20px}
.zu-head{display:flex;align-items:flex-end;gap:12px;flex-wrap:wrap}
.zu-head > div:first-child{flex:1;min-width:0}
.zu-head p{color:var(--zu-muted);margin-top:4px}
@media (max-width:820px){.zu-shell{grid-template-columns:1fr}.zu-side{position:static;height:auto;flex-direction:row;flex-wrap:wrap;align-items:center;gap:8px;padding:12px}.zu-nav{flex-direction:row;flex-wrap:wrap}.zu-nav-label{display:none}.zu-side-foot{margin:0 0 0 auto;border:0;padding:0;flex-direction:row;align-items:center}.zu-user-text{display:none}.zu-main{padding:20px 16px 48px}}

/* Kartu, statistik, grid */
.zu-card{background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:var(--zu-radius);box-shadow:var(--zu-shadow);padding:22px}
.zu-card-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.zu-card-head h2{flex:1;font-size:16px}
.zu-card.flush{padding:0;overflow:hidden}.zu-card.flush .zu-card-head{padding:18px 22px 0}
.zu-grid{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}
.zu-stat{display:flex;flex-direction:column;gap:4px}
.zu-stat span{font-size:13px;color:var(--zu-muted);font-weight:500}
.zu-stat b{font-size:28px;letter-spacing:-.02em;line-height:1.1}
.zu-stat small{color:var(--zu-muted)}

/* Formulir */
.zu-form{display:flex;flex-direction:column;gap:14px}
.zu-field{display:flex;flex-direction:column;gap:6px}
.zu-field label{font-weight:600;font-size:14px}
.zu-field small{color:var(--zu-muted);font-size:13px}
.zu-field .zu-error{color:var(--zu-danger);font-size:13px}
.zu-input{width:100%;font:inherit;color:var(--zu-text);background:var(--zu-surface);border:1px solid var(--zu-border);border-radius:10px;padding:10px 12px;outline:none;transition:border-color .15s,box-shadow .15s}
.zu-input:focus{border-color:var(--zu-accent);box-shadow:0 0 0 3px var(--zu-accent-soft)}
.zu-input[aria-invalid=true]{border-color:var(--zu-danger)}
.zu-form-row{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(160px,1fr))}

/* Tombol */
.zu-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;font:inherit;font-weight:600;font-size:14px;line-height:1;padding:11px 16px;border-radius:10px;border:1px solid transparent;cursor:pointer;text-decoration:none;white-space:nowrap;transition:background .15s,border-color .15s,color .15s}
.zu a.zu-btn:hover{text-decoration:none}
.zu-btn.primary{background:var(--zu-accent);color:var(--zu-on-accent)}.zu-btn.primary:hover{background:var(--zu-accent-hover)}
.zu-btn.secondary{background:var(--zu-surface);color:var(--zu-text);border-color:var(--zu-border)}.zu-btn.secondary:hover{background:var(--zu-surface-2)}
.zu-btn.ghost{background:transparent;color:var(--zu-muted)}.zu-btn.ghost:hover{background:var(--zu-surface-2);color:var(--zu-text)}
.zu-btn.danger{background:transparent;color:var(--zu-danger);border-color:color-mix(in srgb,var(--zu-danger) 40%,transparent)}.zu-btn.danger:hover{background:var(--zu-danger-soft)}
.zu-btn.small{padding:7px 11px;font-size:13px}
.zu-btn.block{width:100%}
.zu-btn:focus-visible,.zu-nav a:focus-visible{outline:2px solid var(--zu-accent);outline-offset:2px}
.zu-inline{display:inline}

/* Pesan & label */
.zu-alert{border-radius:12px;padding:12px 14px;font-size:14px;border:1px solid transparent}
.zu-alert.info{background:var(--zu-accent-soft);color:var(--zu-text);border-color:color-mix(in srgb,var(--zu-accent) 25%,transparent)}
.zu-alert.success{background:var(--zu-ok-soft);color:var(--zu-ok);border-color:color-mix(in srgb,var(--zu-ok) 25%,transparent)}
.zu-alert.error{background:var(--zu-danger-soft);color:var(--zu-danger);border-color:color-mix(in srgb,var(--zu-danger) 25%,transparent)}
.zu-alert.warn{background:var(--zu-warn-soft);color:var(--zu-warn);border-color:color-mix(in srgb,var(--zu-warn) 25%,transparent)}
.zu-badge{display:inline-flex;align-items:center;font-size:12px;font-weight:600;padding:2px 9px;border-radius:999px;background:var(--zu-surface-2);color:var(--zu-muted)}
.zu-badge.accent{background:var(--zu-accent-soft);color:var(--zu-accent)}
.zu-badge.gold{background:var(--zu-gold-soft);color:var(--zu-gold)}
.zu-badge.danger{background:var(--zu-danger-soft);color:var(--zu-danger)}
.zu-badge.ok{background:var(--zu-ok-soft);color:var(--zu-ok)}

/* Tabel */
.zu-table-wrap{overflow-x:auto}
.zu-table{width:100%;border-collapse:collapse;font-size:14px}
.zu-table th{text-align:left;font-size:12px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--zu-muted);padding:10px 22px;border-bottom:1px solid var(--zu-border);white-space:nowrap}
.zu-table td{padding:12px 22px;border-bottom:1px solid var(--zu-border);vertical-align:middle}
.zu-table tr:last-child td{border-bottom:0}
.zu-table tbody tr:hover td{background:color-mix(in srgb,var(--zu-surface-2) 50%,transparent)}
.zu-table .num{text-align:right;font-variant-numeric:tabular-nums}
.zu-empty{text-align:center;padding:36px 20px;color:var(--zu-muted);display:flex;flex-direction:column;align-items:center;gap:8px}
.zu-empty b{color:var(--zu-text);font-size:16px}
`;
