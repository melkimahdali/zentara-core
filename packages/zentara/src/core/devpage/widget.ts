import type { IncomingMessage, ServerResponse } from "node:http";
import { t } from "../../i18n/index.js";
import { escapeHtml } from "../view.js";
import { CHAT_CSS, CHAT_JS } from "./chat.js";
import { devtoolsClient } from "./info.js";
import { BASE_CSS, jsonForScript } from "./theme.js";

/**
 * Widget chat Zentara AI di setiap halaman aplikasi, hanya saat pengembangan.
 *
 * Server aplikasi menyisipkan dua script ke setiap respons HTML bila `devtoolsClient()` ada (mode debug,
 * dijalankan oleh `zentara dev`/CLI interaktif, bukan produksi):
 * - `/_zentara/dev/probe.js` di awal <head>: mencatat error console dan request yang gagal, dan
 *   menyediakan `snapshot()` (elemen yang terlihat beserta posisi dan ukurannya) untuk AI;
 * - `/_zentara/dev/widget.js` sebelum </body>: tombol chat mengambang dan kanal ke server devtools,
 *   sehingga tool `view_page` bisa membuka halaman di tab ini.
 * Di luar itu kedua file menjawab 404, dan HTML tidak diubah sama sekali.
 */

export const PROBE_JS = String.raw`
(function(){
  "use strict";
  if (window.__zentaraDev) return;
  var me = document.currentScript;
  var port = me && me.getAttribute("data-port");
  var own = port ? new RegExp("^https?://(127\\.0\\.0\\.1|localhost):" + port + "/") : null;
  var MAX = 50;
  var dev = window.__zentaraDev = { errors: [], failed: [], route: me && me.getAttribute("data-route") || undefined, request: me && me.getAttribute("data-request") || undefined };
  function push(list, item){ if (list.length < MAX) list.push(item); }
  function str(v){
    try { if (v instanceof Error) return v.name + ": " + v.message; if (v && typeof v === "object") return JSON.stringify(v); } catch (e) {}
    return String(v);
  }
  function clip(s, n){ s = String(s == null ? "" : s).replace(/\s+/g, " ").trim(); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function skip(url){ return own && own.test(String(url)); }
  var origError = console.error;
  console.error = function(){
    try { push(dev.errors, { kind: "console", message: clip(Array.prototype.map.call(arguments, str).join(" "), 500) }); } catch (e) {}
    return origError.apply(console, arguments);
  };
  window.addEventListener("error", function(ev){
    var t = ev.target;
    if (t && t !== window && t.tagName) {
      var src = t.currentSrc || t.src || t.href;
      if (src) push(dev.failed, { method: "GET", url: String(src), status: 0, statusText: t.tagName.toLowerCase() + " failed to load" });
      return;
    }
    push(dev.errors, { kind: "error", message: clip(ev.message || "Error", 500), source: ev.filename ? ev.filename + ":" + ev.lineno + ":" + ev.colno : undefined });
  }, true);
  window.addEventListener("unhandledrejection", function(ev){ push(dev.errors, { kind: "rejection", message: clip(str(ev.reason), 500) }); });
  if (window.fetch) {
    var origFetch = window.fetch;
    window.fetch = function(input, init){
      var method = String((init && init.method) || (input && input.method) || "GET").toUpperCase();
      var url = typeof input === "string" ? input : (input && input.url) || String(input);
      var p = origFetch.apply(this, arguments);
      if (!skip(url)) p.then(function(res){ if (res.status >= 400) push(dev.failed, { method: method, url: url, status: res.status, statusText: res.statusText }); }, function(err){ if (!err || err.name !== "AbortError") push(dev.failed, { method: method, url: url, status: 0, statusText: str(err) }); });
      return p;
    };
  }
  if (window.XMLHttpRequest) {
    var XO = XMLHttpRequest.prototype.open, XS = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function(m, u){ this.__zd = { method: String(m).toUpperCase(), url: String(u) }; return XO.apply(this, arguments); };
    XMLHttpRequest.prototype.send = function(){
      var x = this;
      x.addEventListener("loadend", function(){ if (x.__zd && !skip(x.__zd.url) && (x.status >= 400 || x.status === 0)) push(dev.failed, { method: x.__zd.method, url: x.__zd.url, status: x.status, statusText: x.statusText }); });
      return XS.apply(this, arguments);
    };
  }
  // Rekaman langkah pengguna (30 terakhir, per tab) untuk dilampirkan saat bertanya ke AI tentang error.
  var STEPS = "__zentara_steps", PRIVATE_STEP = /pass|token|secret|card|cvv|cvc|pin|otp/i;
  function readSteps(){ try { var l = JSON.parse(sessionStorage.getItem(STEPS) || "[]"); return Array.isArray(l) ? l : []; } catch (e) { return []; } }
  function step(s){
    if (window.name === "zentara-view") return;
    try { var l = readSteps(); s.t = Date.now(); l.push(s); if (l.length > 30) l = l.slice(-30); sessionStorage.setItem(STEPS, JSON.stringify(l)); } catch (e) {}
  }
  function label(el){
    var tag = el.tagName.toLowerCase(), n = el.getAttribute("name");
    var tx = clip(el.getAttribute("aria-label") || (tag === "input" || tag === "select" || tag === "textarea" ? "" : el.textContent) || el.getAttribute("placeholder") || el.getAttribute("title") || "", 50);
    return tag + (n ? "[name=" + n + "]" : "") + (tx ? " " + JSON.stringify(tx) : "") + (el.getAttribute("data-zsrc") ? " @" + el.getAttribute("data-zsrc") : "");
  }
  dev.steps = readSteps;
  step({ kind: "load", url: location.pathname + location.search, request: dev.request });
  document.addEventListener("click", function(ev){
    var el = ev.target && ev.target.closest ? ev.target.closest("a,button,summary,label,[role=button],input[type=checkbox],input[type=radio],input[type=submit]") : null;
    if (el && !window.__zentaraInspecting && !(el.closest && el.closest("#zentara-dev-widget"))) step({ kind: "click", target: label(el) });
  }, true);
  document.addEventListener("change", function(ev){
    var el = ev.target;
    if (!el || !/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName) || el.type === "checkbox" || el.type === "radio") return;
    var secret = el.type === "password" || el.type === "hidden" || el.hasAttribute("data-private") || PRIVATE_STEP.test(el.name || "") || PRIVATE_STEP.test(el.autocomplete || "");
    var value = el.tagName === "SELECT" && el.selectedIndex >= 0 ? el.options[el.selectedIndex].text : el.type === "file" ? (el.files ? el.files.length + " file" : "") : el.value;
    step({ kind: "input", target: label(el), value: secret ? "•••" : clip(value, 40) });
  }, true);
  document.addEventListener("submit", function(ev){
    var f = ev.target;
    if (f && f.tagName === "FORM") step({ kind: "submit", target: (f.getAttribute("method") || "get").toUpperCase() + " " + (f.getAttribute("action") || location.pathname) });
  }, true);

  // Fakta untuk skor halaman (dinilai di server, lihat pageScore di dev/view.ts).
  function audit(){
    var doc = document, out = { imgNoAlt: [], unlabeled: [], unnamed: [] };
    var nav = performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
    var res = performance.getEntriesByType ? performance.getEntriesByType("resource") : [];
    var bytes = nav ? nav.transferSize || nav.encodedBodySize || 0 : 0;
    for (var r = 0; r < res.length; r++) if (!skip(res[r].name)) bytes += res[r].transferSize || res[r].encodedBodySize || 0;
    out.load = Math.round(nav && nav.loadEventEnd > 0 ? nav.loadEventEnd - nav.startTime : performance.now());
    out.bytes = bytes;
    out.requests = 1 + res.filter(function(e){ return !skip(e.name) && !/\/_zentara\/dev\//.test(e.name); }).length;
    out.title = !!doc.title.trim();
    out.description = !!doc.querySelector('meta[name="description"][content]:not([content=""])');
    out.lang = !!doc.documentElement.getAttribute("lang");
    out.h1 = doc.querySelectorAll("h1").length;
    function visible(el){ return !(el.closest && el.closest("#zentara-dev-widget")) && el.getClientRects().length > 0; }
    doc.querySelectorAll("img:not([alt])").forEach(function(el){ if (out.imgNoAlt.length < 10) out.imgNoAlt.push(clip(el.getAttribute("src"), 80) + (el.getAttribute("data-zsrc") ? " @" + el.getAttribute("data-zsrc") : "")); });
    doc.querySelectorAll("input:not([type=hidden]):not([type=submit]):not([type=button]),select,textarea").forEach(function(el){
      if (!visible(el) || out.unlabeled.length >= 10) return;
      var named = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title") || (el.labels && el.labels.length);
      if (!named) out.unlabeled.push(label(el));
    });
    doc.querySelectorAll("a[href],button").forEach(function(el){
      if (!visible(el) || out.unnamed.length >= 10) return;
      var name = (el.textContent || "").trim() || el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || el.getAttribute("title") || (el.querySelector("img[alt]:not([alt=''])") ? "img" : "");
      if (!name) out.unnamed.push(label(el));
    });
    return out;
  }

  var KEEP = /^(H[1-6]|A|BUTTON|INPUT|SELECT|TEXTAREA|LABEL|IMG|TABLE|FORM|NAV|HEADER|FOOTER|MAIN|ASIDE|DIALOG|LI|P|SUMMARY|TD|TH|VIDEO|CANVAS|IFRAME)$/;
  var SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|META|LINK|BR|HEAD|TITLE)$/;
  var PRIVATE = /pass|token|secret|card|cvv|cvc|pin/i;
  dev.snapshot = function(opts){
    opts = opts || {};
    var doc = document, win = window;
    var sx = win.scrollX || 0, sy = win.scrollY || 0, vw = win.innerWidth, vh = win.innerHeight;
    var out = [], LIMIT = 250, i = 0;
    function ownText(el){ var s = ""; for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) s += n.nodeValue; return s.replace(/\s+/g, " ").trim(); }
    var all = doc.body ? doc.body.getElementsByTagName("*") : [];
    for (; i < all.length && out.length < LIMIT; i++) {
      var el = all[i], tag = String(el.tagName).toUpperCase();
      if (el.id === "zentara-dev-widget" || SKIP.test(tag) || (el.closest && el.closest("svg") && tag !== "SVG")) continue;
      var role = el.getAttribute("role");
      var own = ownText(el);
      if (!KEEP.test(tag) && !role && own.length < 2) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      var cs = win.getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.02) continue;
      var item = { tag: tag.toLowerCase(), x: Math.round(r.left + sx), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) };
      if (role) item.role = role;
      if (r.bottom < 0 || r.top > vh || r.right < 0 || r.left > vw) item.off = true;
      var a = {}, has = false;
      if (tag === "A") { a.href = el.getAttribute("href") || ""; item.text = clip(el.textContent || el.getAttribute("aria-label"), 80); }
      else if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA") {
        a.type = el.type || tag.toLowerCase();
        if (el.name) a.name = el.name;
        if (el.placeholder) a.placeholder = clip(el.placeholder, 60);
        var secret = el.type === "password" || el.type === "hidden" || el.hasAttribute("data-private") || PRIVATE.test(el.name || "") || PRIVATE.test(el.autocomplete || "");
        if (!secret && el.value && el.type !== "checkbox" && el.type !== "radio") a.value = clip(el.value, 40);
        if (el.checked) a.checked = "true";
        if (el.disabled) a.disabled = "true";
        if (el.required) a.required = "true";
        if (tag === "SELECT" && el.selectedIndex >= 0 && el.options[el.selectedIndex]) a.selected = clip(el.options[el.selectedIndex].text, 40);
      }
      else if (tag === "IMG") { a.alt = el.getAttribute("alt") || ""; a.src = clip(el.getAttribute("src"), 80); if (el.complete && el.naturalWidth === 0) a.broken = "true"; }
      else if (tag === "TABLE") {
        var rows = 0; for (var b = 0; b < el.tBodies.length; b++) rows += el.tBodies[b].rows.length;
        item.rows = el.tBodies.length ? rows : el.rows.length;
        var hs = el.querySelectorAll("th");
        if (hs.length) item.text = Array.prototype.slice.call(hs, 0, 12).map(function(h){ return clip(h.textContent, 30); }).join(" | ");
      }
      else if (tag === "FORM") { a.action = el.getAttribute("action") || ""; a.method = (el.getAttribute("method") || "get").toLowerCase(); }
      else if (/^(H[1-6]|BUTTON|LABEL|SUMMARY|LI|P|TD|TH)$/.test(tag)) item.text = clip(el.textContent || el.getAttribute("aria-label"), tag === "P" ? 160 : 80);
      else if (own) item.text = clip(own, 80);
      if (el.id) a.id = el.id;
      var zsrc = el.getAttribute("data-zsrc"); if (zsrc) item.at = zsrc;
      for (var k in a) { has = true; break; }
      if (has) item.attrs = a;
      out.push(item);
    }
    var matches;
    if (opts.selectors && opts.selectors.length) {
      matches = {};
      opts.selectors.forEach(function(s){ try { matches[s] = doc.querySelectorAll(s).length; } catch (e) { matches[s] = -1; } });
    }
    var nav = win.performance && performance.getEntriesByType ? performance.getEntriesByType("navigation")[0] : null;
    var layout; try { layout = measure(); } catch (e) { layout = undefined; }
    var facts; try { facts = audit(); } catch (e) { facts = undefined; }
    return {
      url: location.href, title: doc.title, status: nav && nav.responseStatus ? nav.responseStatus : undefined, route: dev.route,
      viewport: { w: vw, h: vh }, docHeight: doc.documentElement.scrollHeight,
      elements: out, truncated: i < all.length, text: clip(doc.body ? doc.body.innerText : "", 4000),
      errors: dev.errors.slice(), failed: dev.failed.slice(), matches: matches, layout: layout,
      request: dev.request, audit: facts, steps: window.name === "zentara-view" ? undefined : readSteps()
    };
  };

  // Data mentah untuk pemeriksaan tampilan (dianalisis di server, lihat layoutIssues di dev/view.ts).
  var BOX = /^(IMG|INPUT|SELECT|TEXTAREA|BUTTON|A|VIDEO|CANVAS|SVG|IFRAME)$/;
  var canvas, ctx2d, colors = {};
  function rgba(css){
    if (css in colors) return colors[css];
    var v = null, m = /^rgba?\(([^)]*)\)$/.exec(css);
    if (m) {
      var p = m[1].split(/[\s,\/]+/).filter(Boolean);
      v = [parseFloat(p[0]), parseFloat(p[1]), parseFloat(p[2]), p.length > 3 ? (p[3].slice(-1) === "%" ? parseFloat(p[3]) / 100 : parseFloat(p[3])) : 1];
    } else {
      try {
        canvas = canvas || document.createElement("canvas"); canvas.width = canvas.height = 1;
        ctx2d = ctx2d || canvas.getContext("2d", { willReadFrequently: true });
        ctx2d.clearRect(0, 0, 1, 1); ctx2d.fillStyle = "#000"; ctx2d.fillStyle = css; ctx2d.fillRect(0, 0, 1, 1);
        var d = ctx2d.getImageData(0, 0, 1, 1).data; v = [d[0], d[1], d[2], d[3] / 255];
      } catch (e) { v = null; }
    }
    return (colors[css] = v);
  }
  function describe(el){
    var s = el.tagName.toLowerCase();
    if (el.id) s += "#" + el.id;
    var cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 2) : [];
    if (cls.length) s += "." + cls.join(".");
    var tx = clip(el.getAttribute("aria-label") || el.getAttribute("alt") || el.textContent || el.getAttribute("placeholder") || "", 40);
    return tx ? s + " " + JSON.stringify(tx) : s;
  }
  function measure(){
    var doc = document, win = window, root = doc.documentElement, body = doc.body;
    if (!body) return undefined;
    var width = root.clientWidth, sx = win.scrollX || 0, sy = win.scrollY || 0;
    var index = new Map(), memo = new Map(), bgMemo = new Map(), boxes = [], LIMIT = 600;
    function flags(el){
      // Warisan dari leluhur: di dalam elemen fixed/sticky, atau di dalam area gulir mendatar.
      if (!el || el === body || el === root) return { fx: false, sc: false };
      if (memo.has(el)) return memo.get(el);
      var up = flags(el.parentElement), cs = win.getComputedStyle(el);
      var f = { fx: up.fx || cs.position === "fixed" || cs.position === "sticky", sc: up.sc || cs.overflowX === "auto" || cs.overflowX === "scroll" };
      memo.set(el, f);
      return f;
    }
    function background(el){
      if (!el || el.nodeType !== 1) return [255, 255, 255, 1];
      if (bgMemo.has(el)) return bgMemo.get(el);
      var cs = win.getComputedStyle(el), v;
      if (cs.backgroundImage && cs.backgroundImage !== "none") v = null;
      else {
        var own = rgba(cs.backgroundColor), under = background(el.parentElement);
        if (!own || own[3] >= 1 || under === null) v = own && own[3] >= 1 ? own : under;
        else v = [0, 1, 2].map(function(k){ return own[k] * own[3] + under[k] * (1 - own[3]); }).concat([1]);
      }
      bgMemo.set(el, v);
      return v;
    }
    var all = body.getElementsByTagName("*");
    for (var i = 0; i < all.length && boxes.length < LIMIT; i++) {
      var el = all[i], tag = String(el.tagName).toUpperCase();
      if (SKIP.test(tag) || el.id === "zentara-dev-widget" || el.name === "zentara-view" || (el.closest && el.closest("svg") && tag !== "SVG")) continue;
      var own = "";
      for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3) own += n.nodeValue;
      own = own.replace(/\s+/g, " ").trim();
      if (!own && !BOX.test(tag)) continue;
      var r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      var cs = win.getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || Number(cs.opacity) < 0.02) continue;
      // Isi <details> yang tertutup (dan subtree content-visibility:hidden lain) tidak terlihat, walau
      // getBoundingClientRect masih memberi ukuran.
      var shut = el.parentElement && el.parentElement.closest ? el.parentElement.closest("details:not([open])") : null;
      if (shut && !(el.closest("summary") && el.closest("summary").parentElement === shut)) continue;
      if (el.checkVisibility && !el.checkVisibility()) continue;
      var parent = -1;
      for (var up = el.parentElement; up && up !== body; up = up.parentElement) if (index.has(up)) { parent = index.get(up); break; }
      var f = flags(el);
      var b = { p: parent, tag: tag.toLowerCase(), d: describe(el), x: Math.round(r.left + sx), y: Math.round(r.top + sy), w: Math.round(r.width), h: Math.round(r.height) };
      if (f.fx) b.fx = 1;
      if (f.sc) b.sc = 1;
      if (cs.display === "inline" && el.getClientRects().length > 1) b.ml = 1;
      if (own) {
        b.txt = 1;
        b.fg = rgba(cs.color); b.bg = background(el);
        b.fs = parseFloat(cs.fontSize) || 16; b.fw = parseInt(cs.fontWeight, 10) || 400;
        var hiddenX = /hidden|clip/.test(cs.overflowX), hiddenY = /hidden|clip/.test(cs.overflowY);
        if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
          if (cs.textOverflow === "ellipsis") { if (!el.getAttribute("title")) b.clip = "ellipsis"; }
          else if (hiddenX) b.clip = "x";
        }
        if (!b.clip && hiddenY && el.clientHeight > 0 && el.scrollHeight > el.clientHeight + 2) b.clip = "y";
      }
      if (el.disabled || el.getAttribute("aria-disabled") === "true" || (el.closest && el.closest("fieldset:disabled"))) b.dis = 1;
      if (tag === "IMG" && el.complete && el.naturalWidth === 0 && el.getAttribute("src")) b.br = 1;
      index.set(el, boxes.length);
      boxes.push(b);
    }
    var styled = [];
    body.querySelectorAll("[style]").forEach(function(el){
      if (el.id === "zentara-dev-widget" || el.name === "zentara-view" || !String(el.getAttribute("style")).trim()) return;
      styled.push(describe(el));
    });
    var sheets = [];
    doc.querySelectorAll("link[rel~=stylesheet]").forEach(function(l){ var href = l.getAttribute("href") || ""; if (!/^\/_zentara\//.test(href)) sheets.push(href); });
    var widget = doc.querySelector('script[src^="/_zentara/dev/widget.js"]');
    return {
      docWidth: root.scrollWidth, width: width, boxes: boxes, styled: styled,
      styleTags: doc.querySelectorAll("style").length, sheets: sheets,
      kit: body.classList.contains("zu") && !!doc.querySelector('link[href^="/_zentara/ui.css"]'),
      viewportMeta: !!doc.querySelector("meta[name=viewport]"),
      framework: !!(widget && widget.getAttribute("data-ui") === "off")
    };
  }
})();
`;

const WIDGET_CSS = `
:host{all:initial}
.zw{position:fixed;right:18px;bottom:18px;z-index:2147483000;font:14.5px/1.6 var(--sans);color:var(--text)}
.zw-launch{white-space:nowrap;display:flex;align-items:center;gap:8px;background:var(--brand-teal);color:var(--on-accent);border:0;border-radius:999px;padding:10px 16px 10px 12px;font:600 14px/1 var(--sans);box-shadow:var(--shadow);cursor:pointer}
.zw-launch:hover{filter:brightness(1.06)}
.zw-launch .zx-logo{width:20px;height:20px}
.zw-launch .n{background:var(--danger);color:#fff;border-radius:999px;font-size:11px;padding:3px 7px;line-height:1}
.zw-panel{position:fixed;right:18px;bottom:76px;width:min(420px,calc(100vw - 36px));height:min(620px,calc(100vh - 100px));display:flex;flex-direction:column;background:var(--surface);border:1px solid var(--border);border-radius:16px;box-shadow:var(--shadow);overflow:hidden}
.zw-head{display:flex;align-items:center;gap:10px;padding:12px 14px;border-bottom:1px solid var(--border)}
.zw-head .zx-logo{width:24px;height:24px}
.zw-head .tt{display:flex;flex-direction:column;min-width:0;flex:1}
.zw-head strong{font-size:14.5px}
.zw-head .sub{font-size:11.5px;color:var(--muted);font-family:var(--mono);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zw-head .x{border:0;background:none;color:var(--muted);font-size:22px;cursor:pointer;line-height:1;padding:0 4px}
.zw-head .x:hover{color:var(--text)}
.zw-body{flex:1;min-height:0;padding:12px 14px}
.zw-bar{display:flex;align-items:center;gap:8px}
.zw-tool{white-space:nowrap;display:flex;align-items:center;gap:6px;height:36px;background:var(--surface);color:var(--text);border:1px solid var(--border);border-radius:999px;padding:0 12px;font:500 12.5px/1 var(--mono);box-shadow:var(--shadow);cursor:pointer}
.zw-tool:hover,.zw-tool[aria-pressed=true]{border-color:var(--brand-teal)}
.zw-tool .w{color:var(--danger);font-weight:700}
.zw-req{position:fixed;right:18px;bottom:76px;width:min(460px,calc(100vw - 36px));max-height:min(520px,calc(100vh - 100px));overflow:auto;background:var(--surface);border:1px solid var(--border);border-radius:14px;box-shadow:var(--shadow);padding:12px 14px;font-size:13px}
.zw-req h3{margin:10px 0 4px;font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted)}
.zw-req h3:first-child{margin-top:0}
.zw-req ul{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:4px}
.zw-req li{font-family:var(--mono);font-size:12px;word-break:break-word;border-left:2px solid var(--border);padding-left:8px}
.zw-req li.warn{border-left-color:var(--danger)}
.zw-req .ms{color:var(--muted)}
.zw-hl{position:fixed;pointer-events:none;z-index:2147483001;outline:2px solid var(--brand-teal);background:rgba(46,211,183,.12);border-radius:3px}
.zw-hl-label{position:fixed;pointer-events:none;z-index:2147483002;background:var(--text);color:var(--surface);font:500 12px/1.4 var(--mono);padding:3px 7px;border-radius:6px;max-width:80vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.zw-toast{position:fixed;right:18px;bottom:76px;background:var(--surface);border:1px solid var(--border);border-radius:10px;box-shadow:var(--shadow);padding:8px 12px;font-size:13px;max-width:320px}
@media (max-width:520px){.zw-panel,.zw-req{right:8px;left:8px;width:auto;bottom:72px}.zw{right:10px;bottom:10px}.zw-tool .l,.zw-tool .q{display:none}}
`;

const WIDGET_JS = String.raw`
(function(C){
  "use strict";
  var me = document.currentScript;
  if (!me || window.name === "zentara-view" || window.__zentaraWidget) return;
  window.__zentaraWidget = true;
  var port = me.getAttribute("data-port"), token = me.getAttribute("data-token"), showUi = me.getAttribute("data-ui") !== "off";
  var host = location.hostname;
  if (!(host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1")) return;
  var base = "http://127.0.0.1:" + port;
  var pageId = null;
  function post(path, body){
    return fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Zentara-Token": token }, body: JSON.stringify(body || {}) });
  }
  function snapshot(opts){
    var d = window.__zentaraDev;
    return d && d.snapshot ? d.snapshot(opts) : { url: location.href, title: document.title, viewport: { w: innerWidth, h: innerHeight }, elements: [], text: "", errors: [], failed: [] };
  }

  // Kanal halaman: server devtools tahu tab mana yang terbuka dan bisa meminta tab ini "melihat" halaman.
  function view(ev){
    var frame = document.createElement("iframe");
    frame.name = "zentara-view";
    frame.setAttribute("aria-hidden", "true");
    frame.tabIndex = -1;
    var size = ev.size || { w: innerWidth, h: innerHeight };
    frame.style.cssText = "position:fixed;left:-30000px;top:0;width:" + size.w + "px;height:" + size.h + "px;border:0;opacity:0;pointer-events:none";
    var done = false;
    function finish(body){
      if (done) return;
      done = true; clearTimeout(timer);
      body.id = ev.id;
      post("/view-result", body).catch(function(){});
      setTimeout(function(){ frame.remove(); }, 0);
    }
    var timer = setTimeout(function(){ finish({ error: "timeout" }); }, 12000);
    frame.onload = function(){
      setTimeout(function(){
        try {
          var w = frame.contentWindow, d = frame.contentDocument;
          if (w.__zentaraDev && w.__zentaraDev.snapshot) finish({ snapshot: w.__zentaraDev.snapshot({ selectors: ev.selectors }) });
          else finish({ snapshot: { url: w.location.href, title: d.title, viewport: { w: size.w, h: size.h }, elements: [], text: d.body ? d.body.innerText.slice(0, 4000) : "", errors: [], failed: [], note: "no-probe" } });
        } catch (e) { finish({ error: String((e && e.message) || e) }); }
      }, ev.settle || 800);
    };
    frame.src = ev.path;
    (document.body || document.documentElement).appendChild(frame);
  }
  function channel(delay){
    fetch(base + "/page-channel?url=" + encodeURIComponent(location.href), { headers: { "X-Zentara-Token": token } }).then(function(res){
      if (res.status === 401 || res.status === 403) { delay = -1; throw new Error("denied"); }
      if (!res.ok || !res.body) throw new Error("HTTP " + res.status);
      delay = 1000;
      var reader = res.body.getReader(), dec = new TextDecoder(), buf = "";
      function pump(){
        return reader.read().then(function(r){
          if (r.done) throw new Error("closed");
          buf += dec.decode(r.value, { stream: true });
          var lines = buf.split("\n"); buf = lines.pop();
          lines.forEach(function(l){
            if (!l.trim()) return;
            var ev; try { ev = JSON.parse(l); } catch (e) { return; }
            if (ev.type === "hello") pageId = ev.id;
            else if (ev.type === "view") view(ev);
            else if (ev.type === "reload") autoReload();
          });
          return pump();
        });
      }
      return pump();
    }).catch(function(){
      pageId = null;
      if (delay < 0) return;
      setTimeout(function(){ channel(Math.min((delay || 1000) * 2, 30000)); }, delay || 1000);
    });
  }
  // Muat ulang otomatis setelah kode berubah, kecuali ada isian formulir yang belum dikirim.
  var dirty = false;
  document.addEventListener("input", function(e){ var t = e.target; if (t && t.form && !(t.closest && t.closest("#zentara-dev-widget"))) dirty = true; }, true);
  document.addEventListener("submit", function(){ dirty = false; }, true);
  function autoReload(){
    if (dirty) { if (window.__zentaraToast) window.__zentaraToast(C.reloadSkipped); return; }
    location.reload();
  }
  function focused(){ if (pageId && document.visibilityState === "visible") post("/page-focus", { id: pageId, url: location.href }).catch(function(){}); }
  window.addEventListener("focus", focused);
  document.addEventListener("visibilitychange", focused);
  channel(1000);
  if (!showUi) return;

  var OPEN_KEY = "zentara-widget-open:" + port;
  var root = document.createElement("div");
  root.id = "zentara-dev-widget";
  var shadow = root.attachShadow({ mode: "open" });
  var style = document.createElement("style");
  style.textContent = C.css;
  shadow.appendChild(style);
  var wrap = document.createElement("div");
  wrap.className = "zw";
  var logo = '<span class="zx-logo" role="img" aria-label="Zentara Core"></span>';
  var esc = function(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); };
  wrap.innerHTML =
    '<div class="zw-panel" hidden><div class="zw-head">' + logo + '<div class="tt"><strong>' + esc(C.title) + '</strong><span class="sub"></span></div>' +
    '<button type="button" class="x" aria-label="' + esc(C.close) + '">×</button></div><div class="zw-body"></div></div>' +
    '<div class="zw-req" hidden></div><div class="zw-toast" role="status" hidden></div>' +
    '<div class="zw-bar"><button type="button" class="zw-tool zw-reqbtn" aria-expanded="false" hidden></button>' +
    '<button type="button" class="zw-tool zw-inspect" aria-pressed="false" title="' + esc(C.inspectHint) + '"><span aria-hidden="true">⌖</span><span class="l">' + esc(C.inspect) + '</span></button>' +
    '<button type="button" class="zw-launch" aria-expanded="false">' + logo + '<span>' + esc(C.launcher) + '</span><span class="n" hidden></span></button></div>';
  shadow.appendChild(wrap);
  (document.body || document.documentElement).appendChild(root);

  var panel = wrap.querySelector(".zw-panel"), launch = wrap.querySelector(".zw-launch"), badge = wrap.querySelector(".n");
  wrap.querySelector(".sub").textContent = location.pathname + location.search;
  var chat = null;
  function setOpen(on){
    panel.hidden = !on;
    if (on && toast) toast.hidden = true;
    if (on && reqPanel) { reqPanel.hidden = true; reqBtn.setAttribute("aria-expanded", "false"); }
    launch.setAttribute("aria-expanded", on ? "true" : "false");
    try { sessionStorage.setItem(OPEN_KEY, on ? "1" : ""); } catch (e) {}
    if (on && !chat) {
      chat = window.ZentaraChat.mount(wrap.querySelector(".zw-body"), {
        port: port, token: token, storageKey: "widget", emptyText: C.emptyText, suggestions: C.suggestions, placeholder: C.placeholder, t: C.chat,
        logo: logo, attachLabel: C.pageAttached, getPage: function(){ return snapshot(); }, pageId: function(){ return pageId; }
      });
    }
    if (on && chat && chat.focus) chat.focus();
  }
  launch.addEventListener("click", function(){ setOpen(panel.hidden); });
  wrap.querySelector(".x").addEventListener("click", function(){ setOpen(false); });
  try { if (sessionStorage.getItem(OPEN_KEY) === "1") setOpen(true); } catch (e) {}
  var toast = wrap.querySelector(".zw-toast"), toastTimer;
  window.__zentaraToast = function(text){ toast.textContent = text; toast.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(function(){ toast.hidden = true; }, 5000); };

  // Toolbar request: waktu proses server, jumlah query (dengan tanda N+1), session, dan log request halaman ini.
  var reqBtn = wrap.querySelector(".zw-reqbtn"), reqPanel = wrap.querySelector(".zw-req");
  var requestId = window.__zentaraDev && window.__zentaraDev.request;
  function li(text, cls){ return '<li' + (cls ? ' class="' + cls + '"' : "") + ">" + text + "</li>"; }
  function showTrace(tr){
    var db = 0; tr.queries.forEach(function(q){ db += q.ms || 0; });
    reqBtn.innerHTML = "<span>" + esc(Math.round(tr.ms || 0)) + " ms</span><span class=\"q\">· " + esc(C.queries.replace("{n}", tr.queries.length)) + "</span>" + (tr.repeated.length ? '<span class="w">· N+1</span>' : "");
    reqBtn.title = C.requestTitle;
    reqBtn.hidden = false;
    var html = "<h3>" + esc(tr.method + " " + tr.path + " → " + tr.status) + "</h3><ul>" + li(esc(C.serverTime.replace("{ms}", tr.ms).replace("{db}", Math.round(db * 10) / 10))) + (tr.route ? li(esc(tr.route)) : "") + "</ul>";
    if (tr.repeated.length) html += "<h3>" + esc(C.nPlusOne) + "</h3><ul>" + tr.repeated.map(function(r){ return li(esc(r.count + "× " + r.sql), "warn"); }).join("") + "</ul>";
    html += "<h3>" + esc(C.queries.replace("{n}", tr.queries.length)) + "</h3><ul>" + (tr.queries.length ? tr.queries.map(function(q){ return li((q.ms != null ? '<span class="ms">' + esc(q.ms) + " ms</span> " : "") + esc(q.sql)); }).join("") : li(esc(C.none))) + "</ul>";
    if (tr.session) { var keys = Object.keys(tr.session); html += "<h3>Session</h3><ul>" + (keys.length ? keys.map(function(k){ return li(esc(k + ": " + tr.session[k])); }).join("") : li(esc(C.none))) + "</ul>"; }
    html += "<h3>" + esc(C.logs) + "</h3><ul>" + (tr.logs.length ? tr.logs.map(function(l){ return li(esc("[" + l.level + "] " + l.message), l.level === "error" || l.level === "warn" ? "warn" : ""); }).join("") : li(esc(C.none))) + "</ul>";
    reqPanel.innerHTML = html;
  }
  function loadTrace(attempt){
    if (!requestId) return;
    fetch("/_zentara/dev/requests/" + encodeURIComponent(requestId), { headers: { "X-Zentara-Token": token }, cache: "no-store" }).then(function(r){
      if (r.status === 404 && attempt < 3) { setTimeout(function(){ loadTrace(attempt + 1); }, 300); return; }
      if (r.ok) return r.json().then(showTrace);
    }).catch(function(){});
  }
  loadTrace(0);
  reqBtn.addEventListener("click", function(){
    var open = reqPanel.hidden;
    if (open) { setOpen(false); toast.hidden = true; }
    reqPanel.hidden = !open; reqBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  // Mode inspeksi: sorot elemen beserta file:baris yang membuatnya; klik untuk bertanya ke AI tentang elemen itu.
  var inspectBtn = wrap.querySelector(".zw-inspect"), inspecting = false, hl, hlLabel, current;
  function describeEl(el){
    var tag = el.tagName.toLowerCase();
    var tx = (el.getAttribute("aria-label") || el.getAttribute("alt") || el.textContent || el.getAttribute("placeholder") || "").replace(/\s+/g, " ").trim();
    return tag + (tx ? ' "' + (tx.length > 50 ? tx.slice(0, 49) + "…" : tx) + '"' : "");
  }
  function target(ev){
    var el = ev.target;
    if (!el || el === root || !el.closest || el.closest("#zentara-dev-widget")) return null;
    return el.closest("[data-zsrc]") || el;
  }
  function onMove(ev){
    var el = target(ev);
    current = el;
    if (!el) { hl.hidden = hlLabel.hidden = true; return; }
    var r = el.getBoundingClientRect();
    hl.hidden = hlLabel.hidden = false;
    hl.style.left = r.left + "px"; hl.style.top = r.top + "px"; hl.style.width = r.width + "px"; hl.style.height = r.height + "px";
    hlLabel.textContent = (el.getAttribute("data-zsrc") || C.noSource) + " · " + describeEl(el);
    hlLabel.style.left = Math.max(4, Math.min(r.left, innerWidth - 320)) + "px";
    hlLabel.style.top = (r.top > 28 ? r.top - 26 : Math.min(innerHeight - 26, r.bottom + 4)) + "px";
  }
  function onClick(ev){
    var el = target(ev);
    if (!el) return;
    ev.preventDefault(); ev.stopPropagation();
    setInspect(false);
    var src = el.getAttribute("data-zsrc");
    if (src && navigator.clipboard) navigator.clipboard.writeText(src).catch(function(){});
    setOpen(true);
    if (chat && chat.prefill) chat.prefill(C.aboutElement.replace("{el}", describeEl(el)).replace("{src}", src || C.noSource));
  }
  function onKey(ev){ if (ev.key === "Escape") setInspect(false); }
  function setInspect(on){
    inspecting = on;
    window.__zentaraInspecting = on;
    inspectBtn.setAttribute("aria-pressed", on ? "true" : "false");
    if (on && !hl) {
      hl = document.createElement("div"); hl.className = "zw-hl"; hl.hidden = true;
      hlLabel = document.createElement("div"); hlLabel.className = "zw-hl-label"; hlLabel.hidden = true;
      shadow.appendChild(hl); shadow.appendChild(hlLabel);
    }
    var m = on ? "addEventListener" : "removeEventListener";
    document[m]("mousemove", onMove, true);
    document[m]("click", onClick, true);
    document[m]("keydown", onKey, true);
    if (!on && hl) hl.hidden = hlLabel.hidden = true;
    if (on) window.__zentaraToast(C.inspectHint);
  }
  inspectBtn.addEventListener("click", function(ev){ ev.stopPropagation(); setInspect(!inspecting); });

  function problems(){
    var d = window.__zentaraDev; var n = d ? d.errors.length + d.failed.length : 0;
    badge.hidden = !n; badge.textContent = String(n); launch.title = n ? C.problems.replace("{n}", n) : "";
  }
  problems();
  setInterval(problems, 2000);
})
`;

/** Pastikan HTML berupa dokumen utuh (bukan potongan untuk htmx/fetch). */
function isDocument(html: string): boolean {
  return /<html[\s>]|<body[\s>]|<!doctype html/i.test(html.slice(0, 4096)) || /<\/body\s*>/i.test(html);
}

/**
 * Sisipkan probe dan widget ke dokumen HTML saat pengembangan. Tanpa devtools (produksi, `zentara start`,
 * atau server yang tidak dijalankan oleh `zentara dev`) HTML dikembalikan apa adanya.
 */
export function injectDevTools(html: string, options: { route?: string; headers?: IncomingMessage["headers"]; request?: string } = {}): string {
  const devtools = devtoolsClient();
  if (!devtools || !isDocument(html)) return html;
  if (options.headers?.["hx-request"] !== undefined) return html;
  const route = options.route ? ` data-route="${escapeHtml(options.route)}"` : "";
  const request = options.request ? ` data-request="${escapeHtml(options.request)}"` : "";
  const probe = `<script src="/_zentara/dev/probe.js" data-port="${devtools.port}"${route}${request}></script>`;
  // Halaman sambutan dan error sudah punya chat sendiri: cukup kanal halaman tanpa tombol mengambang.
  const ui = html.includes("window.ZentaraChat") ? "off" : "on";
  const widget = `<script src="/_zentara/dev/widget.js" data-port="${devtools.port}" data-token="${escapeHtml(devtools.token)}" data-ui="${ui}" defer></script>`;

  let out = html;
  const head = /<head\b[^>]*>/i.exec(out);
  if (head) out = out.slice(0, head.index + head[0].length) + probe + out.slice(head.index + head[0].length);
  else {
    const start = /<html\b[^>]*>|<!doctype[^>]*>/i.exec(out);
    const at = start ? start.index + start[0].length : 0;
    out = out.slice(0, at) + probe + out.slice(at);
  }
  const bodyEnd = out.toLowerCase().lastIndexOf("</body");
  return bodyEnd >= 0 ? out.slice(0, bodyEnd) + widget + out.slice(bodyEnd) : out + widget;
}

function widgetScript(): string {
  const m = t().dev;
  const config = {
    css: BASE_CSS.replace(/:root/g, ":host") + CHAT_CSS + WIDGET_CSS,
    chat: m.chat,
    title: m.widget.title,
    launcher: m.widget.launcher,
    close: m.widget.close,
    emptyText: m.widget.emptyText,
    placeholder: m.widget.placeholder,
    suggestions: m.widget.suggestions,
    pageAttached: m.widget.pageAttached,
    problems: m.widget.problems,
    reloadSkipped: m.widget.reloadSkipped,
    inspect: m.widget.inspect,
    inspectHint: m.widget.inspectHint,
    noSource: m.widget.noSource,
    aboutElement: m.widget.aboutElement,
    queries: m.widget.queries,
    requestTitle: m.widget.requestTitle,
    serverTime: m.widget.serverTime,
    nPlusOne: m.widget.nPlusOne,
    logs: m.widget.logs,
    none: m.widget.none,
  };
  return `${CHAT_JS}\n${WIDGET_JS}(${jsonForScript(config)});\n`;
}

/**
 * Sajikan `/_zentara/dev/probe.js` dan `/_zentara/dev/widget.js`. Mengembalikan false (lalu 404)
 * bila devtools tidak aktif, sehingga file ini tidak pernah ada di produksi.
 */
export function sendDevAsset(req: IncomingMessage, res: ServerResponse, pathname: string): boolean {
  if (!devtoolsClient()) return false;
  const body = pathname === "/_zentara/dev/probe.js" ? PROBE_JS : pathname === "/_zentara/dev/widget.js" ? widgetScript() : undefined;
  if (body === undefined) return false;
  res.writeHead(200, {
    "Content-Type": "text/javascript; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(req.method === "HEAD" ? undefined : body);
  return true;
}

/** Beri tahu server devtools alamat aplikasi (untuk `view_page`). Diam saja bila gagal. */
export function announceAppUrl(url: string): void {
  const devtools = devtoolsClient();
  if (!devtools) return;
  fetch(`http://127.0.0.1:${devtools.port}/app`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Zentara-Token": devtools.token },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(2000),
  }).catch(() => {});
}
