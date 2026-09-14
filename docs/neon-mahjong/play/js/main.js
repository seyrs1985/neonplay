/* Neon Mahjong — bootstrap + input mapping (no game logic here).
 * Pointer: tap a free tile to select (gold lift), tap a matching free tile to
 * clear; blocked tiles shake + buzz. pointercancel just drops any pending
 * state (taps act on pointerdown, so cancel is a clean no-op reset).
 * Keyboard: arrows move focus, PageUp/PageDown switch layer, Enter/Space
 * select, H hint, N new deal, M mute. */
'use strict';
(function () {
  function tileIdx(e) {
    var el = e.target && e.target.closest ? e.target.closest(".tile") : null;
    return el ? +el.dataset.i : -1;
  }
  function tileEl(i) { return document.querySelector('.tile[data-i="' + i + '"]'); }

  function tapTile(i) {
    if (won) return;
    var t = tiles[i];
    if (!t || t.gone) return;
    var fr = freeArr();
    if (!fr[i]) {                                   // blocked -> negative feedback
      var el = tileEl(i);
      if (el) {
        el.classList.remove("shake");
        void el.offsetWidth;
        el.classList.add("shake");
      }
      Sound.locked();
      return;
    }
    if (sel === i) { sel = -1; Sound.select(); render(); return; }
    if (sel >= 0 && tiles[sel] && !tiles[sel].gone && freeArr()[sel]) {
      if (tiles[sel].face === t.face) { matchPair(sel, i); return; }
    }
    sel = i; Sound.select(); render();              // select / switch selection
  }

  // ---- pointer wiring (board only; taps act on press) ----
  function onDown(e) {
    if (won) return;
    Sound.resume();
    var i = tileIdx(e);
    if (i < 0) return;
    if (e.cancelable) e.preventDefault();
    tapTile(i);
  }
  document.getElementById("board").addEventListener("pointerdown", onDown, { passive: false });
  document.addEventListener("pointerup", function () {}, { passive: true });
  document.addEventListener("pointercancel", function () { /* taps resolve on down */ }, { passive: true });

  // ---- keyboard (accessibility mode: full clear possible without pointer) ----
  function order() {                                // alive tiles: top layer first, then rows
    var idx = aliveIdx();
    idx.sort(function (a, b) {
      var ta = tiles[a], tb = tiles[b];
      return (tb.z - ta.z) || (ta.y - tb.y) || (ta.x - tb.x);
    });
    return idx;
  }
  function kbFocusEl(i) {
    var el = tileEl(i);
    if (el) el.scrollIntoView && el.scrollIntoView({ block: "nearest", inline: "nearest" });
  }
  document.addEventListener("keydown", function (e) {
    var k = e.key;
    if (["ArrowRight", "ArrowLeft", "ArrowUp", "ArrowDown", "PageUp", "PageDown", " ", "Enter"].indexOf(k) >= 0)
      e.preventDefault();
    kbOn = true;
    var od = order(), pos = od.indexOf(kbFocus);
    if (k === "ArrowRight" || k === "Tab") { kbFocus = od[Math.min(od.length - 1, pos + 1)] || od[0] || -1; }
    else if (k === "ArrowLeft") { kbFocus = od[Math.max(0, pos - 1)] || od[0] || -1; }
    else if (k === "ArrowDown" || k === "ArrowUp") {
      var dir = k === "ArrowDown" ? 1 : -1;
      var cur = tiles[kbFocus], best = -1, bd = 1e9;
      for (var q = 0; q < od.length; q++) {
        var tt = tiles[od[q]];
        if (!cur || od[q] === kbFocus) continue;
        if (tt.x !== cur.x) continue;
        var d = (tt.y - cur.y) * dir;
        if (d > 0 && d < bd) { bd = d; best = od[q]; }
      }
      if (best < 0) best = cur ? kbFocus : od[0];
      kbFocus = best;
    }
    else if (k === "PageUp" || k === "PageDown") {  // layer switch
      var up = k === "PageUp";
      var c2 = tiles[kbFocus], cand = -1;
      for (var w = 0; w < od.length; w++) {
        var tw = tiles[od[w]];
        if (!c2 || up ? (c2 && tw.z > c2.z) : (c2 && tw.z < c2.z)) { cand = od[w]; break; }
      }
      kbFocus = cand >= 0 ? cand : (od[0] || -1);
    }
    else if (k === "Enter" || k === " ") { if (kbFocus >= 0) tapTile(kbFocus); else if (od.length) { kbFocus = od[0]; render(); } }
    else if (k === "h" || k === "H") { doHint(); }
    else if (k === "n" || k === "N") { newGame(mode); syncTabs(); }
    else if (k === "m" || k === "M") { toggleMute(); }
    else return;
    render();
    if (kbFocus >= 0) kbFocusEl(kbFocus);
  });

  // ---- HUD buttons / tabs / win panel ----
  function toggleMute() {
    var m = Sound.toggleMute();
    document.getElementById("muteBtn").textContent = m ? "🔇" : "🔊";
  }
  document.getElementById("hintBtn").addEventListener("click", function () { Sound.resume(); doHint(); });
  document.getElementById("newBtn").addEventListener("click", function () { Sound.resume(); newGame(mode); syncTabs(); });
  document.getElementById("muteBtn").addEventListener("click", toggleMute);
  var TABS = [["tab-daily", "daily"], ["tab-casual", "casual"], ["tab-standard", "standard"], ["tab-expert", "expert"]];
  TABS.forEach(function (tp) {
    document.getElementById(tp[0]).addEventListener("click", function () {
      Sound.resume();
      newGame(tp[1]);
      syncTabs();
    });
  });
  function syncTabs() {
    TABS.forEach(function (tp) {
      document.getElementById(tp[0]).classList.toggle("on", mode === tp[1]);
    });
  }
  document.getElementById("wpShare").addEventListener("click", function () {
    var btn = this;
    doShare().then(function (r) { btn.textContent = r === "shared" ? "✓" : (r === "copied" ? "✓ " + T("share") : T("share")); });
  });
  document.getElementById("wpNew").addEventListener("click", function () { newGame(mode); syncTabs(); });

  // ---- clock (own-records timer, no pressure; frozen for QA / hidden tabs) ----
  setInterval(function () {
    if (window.__qaFreeze) return;
    if (!clockOn || won) return;
    if (document.visibilityState === "hidden") return;
    sec++;
    var t = document.getElementById("v-time");
    if (t) t.textContent = fmtTime(sec);
  }, 1000);

  // ---- resize / visibility repaint ----
  window.addEventListener("resize", function () { render(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") render();
  });

  // ---- in-page deterministic self-check (?autotest=1 or __qa.autotest()) ----
  function runAutotest() {
    window.__qaFreeze = true;
    var res = [];
    var ok = function (name, cond) { res.push({ name: name, pass: !!cond }); };
    try {
      // 1) generation: 5 date seeds x 3 layouts -> deterministic, zero-shuffle, even faces
      var seeds = ["2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14", "2026-09-15"];
      var det = true, zs = true, even = true, n = 0;
      seeds.forEach(function (s) {
        ["casual", "standard", "expert"].forEach(function (ly) {
          var a = genDeal(ly, s), b = genDeal(ly, s);
          n++;
          if (JSON.stringify(a.faces) !== JSON.stringify(b.faces)) det = false;
          if (!replayClears(a.cells, a.order)) zs = false;
          var cnt = {};
          a.faces.forEach(function (f) { cnt[f] = (cnt[f] || 0) + 1; });
          for (var k in cnt) if (cnt[k] % 2) even = false;
        });
      });
      ok("gen-deterministic-15deals", det && n === 15);
      ok("gen-zero-shuffle", zs);
      ok("gen-faces-even", even);
      // 2) freeness unit cases (covered / both-sides-locked / one-side-open)
      window.__qa.rig({
        cells: [[0, 0, 1], [1, 0, 1], [2, 0, 1], [3, 0, 1], [4, 0, 1], [0, 0, 2], [2, 0, 2]],
        faces: FACES.slice(0, 7), autoShuffle: false
      });
      var fr = freeArr();
      ok("covered-not-free", fr[0] === false);
      ok("both-sides-locked-not-free", fr[1] === false);
      ok("one-side-open-free", fr[4] === true);
      // 3) real playthrough: casual cleared purely via solveStep (the real match path)
      newGame("casual");
      var guard = 0, steps = 0;
      while (!won && guard++ < 60) { if (!window.__qa.solveStep()) break; steps++; }
      ok("casual-clears-in-14-pairs", won && steps === 14);
      window.__autotest = { allPass: res.every(function (r) { return r.pass; }), results: res };
    } catch (e) {
      window.__autotest = { allPass: false, results: res, exception: String(e && e.message || e) };
    }
    window.__qaFreeze = false;
  }

  // ---- boot ----
  document.getElementById("tab-daily").textContent = T("daily");
  document.getElementById("tab-casual").textContent = T("casual");
  document.getElementById("tab-standard").textContent = T("standard");
  document.getElementById("tab-expert").textContent = T("expert");
  document.getElementById("lb-pairs").textContent = T("pairs");
  document.getElementById("lb-time").textContent = T("time");
  document.getElementById("lb-score").textContent = T("score");
  document.getElementById("muteBtn").textContent = Sound.isMuted() ? "🔇" : "🔊";
  document.getElementById("streak").title = T("streak");
  newGame("daily");
  syncTabs();
  try { window.__qa.autotest = runAutotest; } catch (e) {}
  try {
    if (new URLSearchParams(location.search).get("autotest") === "1") runAutotest();
  } catch (e) {}
})();
