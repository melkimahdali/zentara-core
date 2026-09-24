/**
 * Widget chat Zentara AI untuk browser (halaman sambutan dan halaman error saat pengembangan).
 * Berbicara dengan server devtools milik `zentara dev` di 127.0.0.1 memakai token sesi.
 * Ditulis sebagai JavaScript biasa tanpa dependensi dan tanpa template literal.
 */
export const CHAT_CSS = `
.zc{display:flex;flex-direction:column;min-height:0;height:100%}
.zc-log{flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:12px;padding:4px 2px 12px;scroll-behavior:smooth}
.zc-empty{color:var(--muted);font-size:14px;text-align:center;padding:18px 8px}
.zc-msg{max-width:100%;font-size:14.5px;line-height:1.6;word-wrap:break-word}
.zc-user{align-self:flex-end;background:var(--brand-teal);color:var(--on-accent);padding:9px 14px;border-radius:14px 14px 4px 14px;max-width:85%;white-space:pre-wrap}
.zc-user .zc-att{display:block;font-size:12px;opacity:.85;margin-top:4px}
.zc-ai{display:flex;gap:10px;align-items:flex-start}
.zc-ai .zx-logo{width:24px;height:24px;margin-top:1px}
.zc-ai .zc-body{flex:1;min-width:0}
.zc-body p{margin:0 0 8px}.zc-body p:last-child{margin:0}
.zc-body ul{margin:4px 0 8px;padding-left:20px}
.zc-body code{background:var(--surface-2);border:1px solid var(--border);border-radius:5px;padding:1px 5px;font-size:12.5px}
.zc-body pre{background:var(--code-bg);border:1px solid var(--border);border-radius:10px;padding:10px 12px;overflow:auto;margin:6px 0}
.zc-body pre code{background:none;border:0;padding:0}
.zc-step{display:flex;align-items:center;gap:8px;font-family:var(--mono);font-size:12.5px;color:var(--muted);padding-left:32px}
.zc-step .ic{width:14px;text-align:center}
.zc-step.ok .ic{color:var(--ok)}.zc-step.err .ic{color:var(--warn)}
.zc-step.run .ic{animation:zc-spin 1s linear infinite}
@keyframes zc-spin{to{transform:rotate(360deg)}}
.zc-info{font-size:12.5px;color:var(--muted);padding-left:32px}
.zc-info.warn{color:var(--warn)}.zc-info.err{color:var(--danger)}
.zc-approval{margin-left:32px;border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:10px;background:var(--surface-2);padding:10px 12px}
.zc-approval.critical{border-left-color:var(--danger);background:var(--danger-soft)}
.zc-approval .t{font-weight:600;font-size:14px}
.zc-approval .r{font-size:12.5px;color:var(--danger);margin-top:2px}
.zc-approval pre{max-height:260px;overflow:auto;background:var(--code-bg);border:1px solid var(--border);border-radius:8px;padding:8px 10px;margin:8px 0;font-size:12px;line-height:1.5}
.zc-approval .add{color:var(--ok)}.zc-approval .del{color:var(--danger)}
.zc-approval .acts{display:flex;gap:8px;flex-wrap:wrap}
.zc-approval .res{font-size:12.5px;color:var(--muted)}
.zc-done{margin-left:32px;display:flex;flex-direction:column;gap:8px;font-size:13px}
.zc-done .files{font-family:var(--mono);font-size:12px;color:var(--muted)}
.zc-done .acts{display:flex;gap:8px;flex-wrap:wrap}
.zc-typing{display:flex;gap:4px;padding:6px 0 0 32px}
.zc-typing i{width:6px;height:6px;border-radius:50%;background:var(--muted);animation:zc-b 1.2s infinite ease-in-out}
.zc-typing i:nth-child(2){animation-delay:.15s}.zc-typing i:nth-child(3){animation-delay:.3s}
@keyframes zc-b{0%,80%,100%{opacity:.25;transform:translateY(0)}40%{opacity:1;transform:translateY(-3px)}}
.zc-suggest{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0 10px}
.zc-chip{border:1px solid var(--border);background:var(--surface-2);color:var(--text);border-radius:999px;padding:6px 12px;font:inherit;font-size:13px;cursor:pointer}
.zc-chip:hover{border-color:var(--accent)}
.zc-form{display:flex;gap:8px;align-items:flex-end;border:1px solid var(--border);background:var(--surface);border-radius:14px;padding:8px 8px 8px 14px;transition:border-color .15s,box-shadow .15s}
.zc-form:focus-within{border-color:var(--accent);box-shadow:0 0 0 4px var(--accent-soft)}
.zc-form textarea{flex:1;border:0;outline:0;background:none;color:var(--text);font:inherit;font-size:14.5px;resize:none;max-height:180px;min-height:24px;padding:4px 0;line-height:1.5}
.zc-form button{flex:none}
.zc-meta{display:flex;gap:10px;align-items:center;justify-content:space-between;font-size:12px;color:var(--muted);margin-top:8px;flex-wrap:wrap}
.zc-meta a{cursor:pointer}
.zc-off{border:1px dashed var(--border);border-radius:12px;padding:14px 16px;font-size:14px;color:var(--muted)}
.zc-off code{font-size:12.5px}
`;

export const CHAT_JS = String.raw`
(function(){
  "use strict";
  var LOGO = document.querySelector(".zx-logo") ? document.querySelector(".zx-logo").outerHTML : "";
  function el(tag, cls, html){ var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s){ return String(s).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function inline(s){
    return s.replace(/` + "`" + String.raw`([^` + "`" + String.raw`]+)` + "`" + String.raw`/g, "<code>$1</code>")
      .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  }
  function md(text){
    var parts = String(text).split(/` + "```" + String.raw`[\w-]*\n?/);
    var out = "";
    for (var i = 0; i < parts.length; i++) {
      if (i % 2 === 1) { out += "<pre><code>" + esc(parts[i].replace(/\n$/, "")) + "</code></pre>"; continue; }
      var blocks = esc(parts[i]).split(/\n{2,}/);
      for (var b = 0; b < blocks.length; b++) {
        var block = blocks[b].trim(); if (!block) continue;
        var lines = block.split("\n"), para = [], items = [];
        var flushPara = function(){ if (para.length) out += "<p>" + para.join("<br>") + "</p>"; para = []; };
        var flushList = function(){ if (items.length) out += "<ul>" + items.join("") + "</ul>"; items = []; };
        lines.forEach(function(l){
          if (/^\s*([-*•]|\d+\.)\s+/.test(l)) { flushPara(); items.push("<li>" + inline(l.replace(/^\s*([-*•]|\d+\.)\s+/, "")) + "</li>"); }
          else { flushList(); para.push(inline(l.replace(/^#{1,6}\s+(.*)$/, "<strong>$1</strong>"))); }
        });
        flushPara(); flushList();
      }
    }
    return out;
  }
  function diff(preview){
    return String(preview).split("\n").map(function(l){
      var cls = /^\+ /.test(l) ? "add" : /^- /.test(l) ? "del" : "";
      return cls ? '<span class="' + cls + '">' + esc(l) + "</span>" : esc(l);
    }).join("\n");
  }

  function mount(root, opts){
    var base = "http://127.0.0.1:" + opts.port;
    var key = "zentara-chat:" + opts.port + ":" + (opts.storageKey || "main");
    var host = location.hostname;
    var local = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
    root.innerHTML = "";
    var wrap = el("div", "zc");
    var log = el("div", "zc-log");
    var suggest = el("div", "zc-suggest");
    var form = el("form", "zc-form");
    var input = el("textarea"); input.rows = 1; input.placeholder = opts.placeholder || "Tulis permintaan dalam bahasa biasa...";
    var send = el("button", "zx-btn primary small", "Kirim"); send.type = "submit";
    form.appendChild(input); form.appendChild(send);
    var meta = el("div", "zc-meta", '<span class="st">Menghubungkan ke Zentara AI...</span><span><a data-act="reset">Percakapan baru</a></span>');
    wrap.appendChild(log); wrap.appendChild(suggest); wrap.appendChild(form); wrap.appendChild(meta);
    root.appendChild(wrap);

    if (!local) {
      root.innerHTML = '<div class="zc-off">Chat Zentara AI hanya bisa dipakai dari komputer yang menjalankan server. Buka <code>http://localhost:' + esc(location.port || "80") + esc(location.pathname) + "</code>.</div>";
      return {};
    }

    var busy = false, controller = null, typing = null, steps = {};
    function save(){ try { sessionStorage.setItem(key, log.innerHTML); } catch (e) {} }
    function scroll(){ log.scrollTop = log.scrollHeight; }
    function add(node){ if (typing && typing.parentNode) log.insertBefore(node, typing); else log.appendChild(node); scroll(); save(); return node; }
    function setTyping(on){
      if (on && !typing) { typing = el("div", "zc-typing", "<i></i><i></i><i></i>"); log.appendChild(typing); scroll(); }
      if (!on && typing) { typing.remove(); typing = null; }
    }
    function empty(){
      if (!log.children.length && opts.emptyText) log.appendChild(el("div", "zc-empty", esc(opts.emptyText)));
    }
    function setBusy(on){
      busy = on; send.textContent = on ? "Berhenti" : "Kirim"; send.className = "zx-btn small " + (on ? "danger" : "primary");
      suggest.style.display = on || log.querySelector(".zc-user") ? "none" : "";
    }
    function api(path, body){
      return fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json", "X-Zentara-Token": opts.token }, body: JSON.stringify(body || {}) });
    }

    try { var saved = sessionStorage.getItem(key); if (saved) { log.innerHTML = saved; log.querySelectorAll(".zc-approval:not(.done) .acts, .zc-typing").forEach(function(n){ n.outerHTML = '<div class="res">Kedaluwarsa (halaman dimuat ulang).</div>'; }); log.querySelectorAll(".zc-step.run").forEach(function(n){ n.className = "zc-step err"; n.querySelector(".ic").textContent = "·"; }); } } catch (e) {}
    empty();
    (opts.suggestions || []).forEach(function(s){ var chip = el("button", "zc-chip", esc(s)); chip.type = "button"; chip.onclick = function(){ ask(s); }; suggest.appendChild(chip); });
    setBusy(false);

    fetch(base + "/status", { headers: { "X-Zentara-Token": opts.token } }).then(function(r){ return r.json(); }).then(function(s){
      var st = meta.querySelector(".st");
      if (!s.providers || !s.providers.length) st.innerHTML = "Belum ada provider AI. Jalankan <code>npx zentara ai:setup</code>";
      else st.textContent = "● " + s.providers.join(" → ") + " · mode " + (s.mode === "auto" ? "otomatis" : "minta persetujuan") + " · Enter kirim, Shift+Enter baris baru";
    }).catch(function(){
      meta.querySelector(".st").innerHTML = "Tidak terhubung ke Zentara AI. Jalankan server dengan <code>npx zentara dev</code> atau <code>npx zentara</code>.";
    });

    function handle(ev){
      if (ev.type === "thinking") { setTyping(true); return; }
      setTyping(false);
      if (ev.type === "assistant") add(el("div", "zc-msg zc-ai", LOGO + '<div class="zc-body">' + md(ev.text) + "</div>"));
      else if (ev.type === "tool" && ev.phase === "start") { steps[ev.id] = add(el("div", "zc-step run", '<span class="ic">◌</span><span>' + esc(ev.label) + "</span>")); setTyping(true); }
      else if (ev.type === "tool" && ev.phase === "end") {
        var s = steps[ev.id]; if (!s) return;
        s.className = "zc-step " + (ev.ok ? "ok" : "err"); s.querySelector(".ic").textContent = ev.ok ? "✓" : "✗";
        if (ev.detail) s.lastChild.textContent += " — " + ev.detail;
        save(); setTyping(true);
      }
      else if (ev.type === "approval") {
        var card = el("div", "zc-approval" + (ev.risk === "critical" ? " critical" : ""));
        card.innerHTML = '<div class="t">' + (ev.risk === "critical" ? "⚠ " : "✎ ") + esc(ev.summary) + "</div>" +
          (ev.reason ? '<div class="r">Perlu persetujuan: ' + esc(ev.reason) + "</div>" : "") +
          (ev.preview ? "<pre>" + diff(ev.preview) + "</pre>" : "") +
          '<div class="acts"><button type="button" class="zx-btn primary small" data-act="approve" data-id="' + esc(ev.id) + '" data-answer="yes">Setujui</button>' +
          (ev.risk === "critical" ? "" : '<button type="button" class="zx-btn small" data-act="approve" data-id="' + esc(ev.id) + '" data-answer="all">Setujui semua perubahan biasa</button>') +
          '<button type="button" class="zx-btn small danger" data-act="approve" data-id="' + esc(ev.id) + '" data-answer="no">Tolak</button></div>';
        add(card);
      }
      else if (ev.type === "info") add(el("div", "zc-info", esc(ev.text)));
      else if (ev.type === "fallback") add(el("div", "zc-info warn", "✗ " + esc(ev.from) + " tidak tersedia (" + esc(ev.reason) + ")" + (ev.to ? " → pindah ke " + esc(ev.to) : "")));
      else if (ev.type === "error") add(el("div", "zc-info err", "✗ " + esc(ev.message)));
      else if (ev.type === "done") {
        var labels = { done: "✓ Selesai", incomplete: "… Belum selesai (batas langkah)", refused: "✗ Ditolak model", verification_failed: "✗ Verifikasi gagal", interrupted: "■ Dihentikan" };
        var box = el("div", "zc-done");
        var html = "<div>" + esc(labels[ev.status] || ev.status) + ' <span class="zx-muted">· ' + ev.steps + " langkah" + (ev.providers && ev.providers.length ? " · " + esc(ev.providers.join(", ")) : "") + "</span></div>";
        if (ev.changedFiles && ev.changedFiles.length) {
          html += '<div class="files">' + ev.changedFiles.map(esc).join("<br>") + "</div>" +
            '<div class="acts"><button type="button" class="zx-btn primary small" data-act="reload">Muat ulang halaman</button><button type="button" class="zx-btn small" data-act="undo">Batalkan perubahan</button></div>';
        }
        box.innerHTML = html; add(box);
      }
    }

    function ask(message, context){
      if (busy || !message.trim()) return;
      var e = log.querySelector(".zc-empty"); if (e) e.remove();
      var bubble = el("div", "zc-msg zc-user"); bubble.textContent = message;
      if (context) bubble.appendChild(el("span", "zc-att", "📎 detail error terlampir"));
      add(bubble);
      setBusy(true); setTyping(true);
      controller = new AbortController();
      fetch(base + "/chat", { method: "POST", headers: { "Content-Type": "application/json", "X-Zentara-Token": opts.token }, body: JSON.stringify({ message: message, context: context || opts.context || "" }), signal: controller.signal })
        .then(function(res){
          if (!res.ok) return res.json().then(function(j){ handle({ type: "error", message: j.error || ("HTTP " + res.status) }); });
          var reader = res.body.getReader(), decoder = new TextDecoder(), buf = "";
          function pump(){
            return reader.read().then(function(r){
              if (r.done) return;
              buf += decoder.decode(r.value, { stream: true });
              var lines = buf.split("\n"); buf = lines.pop();
              lines.forEach(function(l){ if (l.trim()) { try { handle(JSON.parse(l)); } catch (err) {} } });
              return pump();
            });
          }
          return pump();
        })
        .catch(function(err){ if (err && err.name === "AbortError") return; handle({ type: "error", message: "Koneksi ke Zentara AI terputus. Pastikan server Zentara (npx zentara dev) masih berjalan." }); })
        .then(function(){ setTyping(false); setBusy(false); controller = null; save(); });
    }

    form.addEventListener("submit", function(ev){
      ev.preventDefault();
      if (busy) { api("/stop"); return; }
      var text = input.value; input.value = ""; input.style.height = "";
      ask(text);
    });
    input.addEventListener("keydown", function(ev){ if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); form.requestSubmit(); } });
    input.addEventListener("input", function(){ input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 180) + "px"; });
    wrap.addEventListener("click", function(ev){
      var t = ev.target.closest("[data-act]"); if (!t) return;
      var act = t.getAttribute("data-act");
      if (act === "approve") {
        var card = t.closest(".zc-approval"); var answer = t.getAttribute("data-answer");
        card.classList.add("done");
        card.querySelector(".acts").outerHTML = '<div class="res">' + (answer === "no" ? "Ditolak" : answer === "all" ? "Disetujui (semua perubahan biasa)" : "Disetujui") + "</div>";
        api("/approve", { id: t.getAttribute("data-id"), answer: answer }); save();
      } else if (act === "reload") location.reload();
      else if (act === "undo") {
        t.disabled = true;
        api("/undo").then(function(r){ return r.json(); }).then(function(j){ add(el("div", "zc-info", j.ok ? "↶ Perubahan dibatalkan: " + esc(j.files.join(", ")) : esc(j.error || "Tidak ada yang bisa dibatalkan"))); });
      } else if (act === "reset") {
        if (busy) return;
        api("/reset"); log.innerHTML = ""; save(); empty(); setBusy(false);
      }
    });
    return { ask: ask, focus: function(){ input.focus(); } };
  }
  window.ZentaraChat = { mount: mount };
})();
`;
