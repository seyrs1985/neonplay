/* Neon Solitaire — bootstrap + input mapping (no game logic here).
 * Pointer: press+release = tap (select / place / draw), press+move = carry the
 * run (drag), quick double-tap or dblclick = smart move to foundation.
 * pointercancel springs the drag back. Keyboard: Tab/arrows move focus,
 * Enter/Space act, U undo, D draw, H hint, A auto, N new, M mute. */
'use strict';
(function () {
  var dragLayer = document.getElementById("dragLayer");
  var press = null;          // pending tap/drag: {zone, idx, x, y, el}
  var drag = null;           // live drag: {zone, idx, els, ox, oy, sx, sy, src}
  var lastTap = { id: -1, t: 0 };

  function zoneOf(el) {
    var n = el && el.closest ? el.closest("[data-zone]") : null;
    return n ? n.dataset.zone : null;
  }
  function idxOf(el) {
    var pile = pileOf(zoneOf(el));
    if (!pile || el.dataset.id === undefined) return -1;
    var id = +el.dataset.id;
    for (var i = pile.length - 1; i >= 0; i--) if (pile[i].id === id) return i;
    return -1;
  }
  function dragCapable(zone, idx) {
    var pile = pileOf(zone);
    if (idx < 0 || !pile[idx] || !pile[idx].up) return false;
    if (zone === "waste" || zone[0] === "f") return idx === pile.length - 1;
    if (zone[0] === "t") return runValid(pile.slice(idx));
    return false;
  }

  // ---- tap / selection model ----
  function tap(zone, idx) {
    if (!zone || won) return;
    Sound.resume();
    if (zone === "stock") { drawCard(); return; }
    var pile = pileOf(zone);
    if (zone === "waste" || zone[0] === "f") idx = pile ? pile.length - 1 : -1;
    var si = selInfo();
    if (si && si.zone === zone && si.idx === idx) { sel = null; render(); return; }   // toggle off
    if (si) {                                        // try to place the selection here
      var count = si.pile.length - si.idx;
      if (tryMove(si.zone, zone, count)) return;
      var card = pile && pile[idx];
      if (card && card.up && zone[0] === "t") {      // invalid spot -> switch selection
        sel = { zone: zone, idx: idx }; render(); return;
      }
      badMove(zone, idx);
      return;
    }
    var c2 = pile && pile[idx];
    if (c2 && c2.up) { sel = { zone: zone, idx: idx }; Sound.flip(); render(); return; }
    badMove(zone, idx);                              // empty pile / face-down with no selection
  }
  function badMove(zone, idx) {
    var el = null;
    if (zone) {
      var pile = pileOf(zone);
      var c = pile && pile[idx];
      el = (c && document.querySelector('.card[data-id="' + c.id + '"]')) ||
           document.querySelector('[data-zone="' + zone + '"]');
    }
    if (el) {
      el.classList.remove("shake");
      void el.offsetWidth;
      el.classList.add("shake");
    }
    Sound.invalid();
  }

  // ---- drag ----
  function beginCarry(x, y) {
    if (!press) return false;
    var pile = pileOf(press.zone);
    drag = {
      zone: press.zone, idx: press.idx, els: [],
      ox: press.x - press.r.left, oy: press.y - press.r.top,
      sx: press.x, sy: press.y, src: press.el
    };
    dragLayer.innerHTML = "";
    for (var i = press.idx; i < pile.length; i++) {
      var g = cardEl(pile[i], press.zone, 0, "ghost");
      g.style.position = "fixed";
      g.style.left = "-999px";
      dragLayer.appendChild(g);
      drag.els.push(g);
    }
    if (press.el) press.el.style.opacity = "0.25";
    moveCarry(x, y);
    return true;
  }
  function moveCarry(x, y) {
    if (!drag) return;
    for (var j = 0; j < drag.els.length; j++) {
      drag.els[j].style.left = (x - drag.ox) + "px";
      drag.els[j].style.top = (y - drag.oy + j * Math.round(CH * 0.26)) + "px";
    }
  }
  function endDrag(x, y, cancelled) {
    if (!drag) return;
    var d = drag; drag = null;
    if (d.src) d.src.style.opacity = "";
    dragLayer.innerHTML = "";
    if (cancelled) { render(); return; }
    var els = document.elementsFromPoint(x, y) || [];
    var targetZone = null;
    for (var i = 0; i < els.length; i++) {
      if (els[i].closest && els[i].closest("[data-zone]")) {
        targetZone = els[i].closest("[data-zone]").dataset.zone;
        break;
      }
    }
    var pile = pileOf(d.zone);
    var count = pile.length - d.idx;
    if (targetZone && targetZone !== d.zone && targetZone !== "stock" && targetZone !== "waste") {
      if (!tryMove(d.zone, targetZone, count)) badMove(targetZone, pileOf(targetZone).length - 1);
    } else if (targetZone === d.zone) { render(); }
    else badMove(d.zone, d.idx);
  }

  // ---- pointer wiring (board only; HUD uses click) ----
  function onDown(e) {
    if (won) return;
    Sound.resume();
    var el = e.target.closest ? e.target.closest("[data-zone]") : null;
    var zone = zoneOf(el);
    if (!zone) return;
    if (e.cancelable) e.preventDefault();
    if (zone === "stock") { drawCard(); return; }    // stock: draw on press
    var idx = el.classList.contains("card") ? idxOf(el) : -1;
    press = { zone: zone, idx: idx, x: e.clientX, y: e.clientY, r: el.getBoundingClientRect(), el: el };
  }
  function onMove(e) {
    if (!press || drag) return;
    if (Math.abs(e.clientX - press.x) < 6 && Math.abs(e.clientY - press.y) < 6) return;
    if (dragCapable(press.zone, press.idx)) beginCarry(e.clientX, e.clientY);
  }
  function onUp(e) {
    if (drag) { endDrag(e.clientX, e.clientY, false); return; }
    if (!press) return;
    var p = press; press = null;
    if (p.zone === "stock") return;
    // double-tap / double-click detection -> smart move
    var id = p.el && p.el.dataset.id !== undefined ? +p.el.dataset.id : -1;
    var now = Date.now();
    if (id >= 0 && id === lastTap.id && now - lastTap.t < 340) {
      lastTap = { id: -1, t: 0 };
      var pile = pileOf(p.zone);
      var idx = p.el.classList.contains("card") ? idxOf(p.el) : pile.length - 1;
      if (!smartMove(p.zone, idx)) badMove(p.zone, idx);
      return;
    }
    if (id >= 0) lastTap = { id: id, t: now };
    tap(p.zone, p.idx);
  }
  function onCancel() {
    press = null;
    if (drag) endDrag(-1, -1, true);
  }
  document.getElementById("board").addEventListener("pointerdown", onDown, { passive: false });
  document.addEventListener("pointermove", onMove, { passive: false });
  document.addEventListener("pointerup", onUp, { passive: false });
  document.addEventListener("pointercancel", onCancel, { passive: true });
  document.addEventListener("dblclick", function (e) {
    var el = e.target.closest ? e.target.closest(".card") : null;
    if (!el || won) return;
    var zone = zoneOf(el);
    if (!zone || zone === "stock") return;
    if (!smartMove(zone, idxOf(el))) badMove(zone, idxOf(el));
  });

  // ---- keyboard ----
  var KB_ZONES = ["stock", "waste", "f0", "f1", "f2", "f3", "t0", "t1", "t2", "t3", "t4", "t5", "t6"];
  var kbStop = 0;
  function kbSet(stop, idx) {
    kbStop = Math.max(0, Math.min(KB_ZONES.length - 1, stop));
    var zone = KB_ZONES[kbStop];
    var pile = pileOf(zone);
    var head = idx !== undefined ? idx : pile.length - 1;
    if (head < 0) head = 0;
    kbFocus = { zone: zone, idx: head };
    render();
  }
  function kbAct() {
    var zone = KB_ZONES[kbStop];
    var pile = pileOf(zone);
    if (kbFocus && kbFocus.zone === zone && pile[kbFocus.idx] && pile[kbFocus.idx].up) tap(zone, kbFocus.idx);
    else if (pile.length) tap(zone, pile.length - 1);
    else tap(zone, -1);
  }
  document.addEventListener("keydown", function (e) {
    kbOn = true;
    var k = e.key;
    if (k === "Tab" || k === "ArrowRight") { e.preventDefault(); kbSet(kbStop + 1); }
    else if (k === "ArrowLeft") { e.preventDefault(); kbSet(kbStop - 1); }
    else if (k === "ArrowDown") {
      e.preventDefault();
      var z0 = KB_ZONES[kbStop];
      if (z0[0] === "t") { var p0 = pileOf(z0); kbSet(kbStop, Math.max(0, (kbFocus ? kbFocus.idx : p0.length - 1) - 1)); }
      else kbAct();
    }
    else if (k === "ArrowUp") {
      e.preventDefault();
      var z1 = KB_ZONES[kbStop];
      if (z1[0] === "t") { var p1 = pileOf(z1); kbSet(kbStop, Math.min(Math.max(0, p1.length - 1), (kbFocus ? kbFocus.idx : p1.length - 1) + 1)); }
      else kbAct();
    }
    else if (k === "Enter" || k === " ") { e.preventDefault(); kbAct(); }
    else if (k === "u" || k === "U") { e.preventDefault(); doUndo(); }
    else if (k === "d" || k === "D") { e.preventDefault(); drawCard(); }
    else if (k === "h" || k === "H") { e.preventDefault(); doHint(); }
    else if (k === "a" || k === "A") { e.preventDefault(); startAuto(); }
    else if (k === "n" || k === "N") { e.preventDefault(); newGame(mode); }
    else if (k === "m" || k === "M") { e.preventDefault(); toggleMute(); }
  });
  function doHint() {
    var h = findHint();
    if (!h || h.from === "stock") { flash(T("noMoves")); return; }
    var src = document.querySelector('[data-zone="' + h.from + '"] .card[data-id="' + pileOf(h.from)[h.idx].id + '"]');
    var dst = document.querySelector('[data-zone="' + h.to + '"]');
    [src, dst].forEach(function (el) {
      if (!el) return;
      el.classList.remove("hintf");
      void el.offsetWidth;
      el.classList.add("hintf");
      setTimeout(function () { el.classList.remove("hintf"); }, 1400);
    });
  }

  // ---- HUD buttons / tabs / win panel ----
  function toggleMute() {
    var m = Sound.toggleMute();
    document.getElementById("muteBtn").textContent = m ? "🔇" : "🔊";
  }
  document.getElementById("undoBtn").addEventListener("click", doUndo);
  document.getElementById("hintBtn").addEventListener("click", doHint);
  document.getElementById("autoBtn").addEventListener("click", startAuto);
  document.getElementById("newBtn").addEventListener("click", function () { newGame(mode); });
  document.getElementById("muteBtn").addEventListener("click", toggleMute);
  document.getElementById("tab-daily").addEventListener("click", function () { newGame("daily"); syncTabs(); });
  document.getElementById("tab-rand").addEventListener("click", function () {
    SAV.randPlayed++; save(); newGame("rand"); syncTabs();
  });
  function syncTabs() {
    document.getElementById("tab-daily").classList.toggle("on", mode === "daily");
    document.getElementById("tab-rand").classList.toggle("on", mode === "rand");
  }
  document.getElementById("wpShare").addEventListener("click", function () {
    var text = "Neon Solitaire — " + (mode === "daily" ? "Daily " + utcDate() : "Random deal") +
      "\n" + fmtTime(sec) + " · " + moves + " moves · " + score + " pts" +
      "\nhttps://seyrs1985.github.io/neonplay/neon-solitaire/";
    try { if (navigator.clipboard) navigator.clipboard.writeText(text); } catch (e) {}
    this.textContent = "✓";
  });
  document.getElementById("wpNew").addEventListener("click", function () { newGame(mode); syncTabs(); });

  // ---- clock ----
  setInterval(function () {
    if (window.__qaFreeze) return;
    if (!clockOn || won) return;
    if (document.visibilityState === "hidden") return;
    sec++;
    document.getElementById("v-time").textContent = fmtTime(sec);
  }, 1000);

  // ---- resize / visibility repaint ----
  window.addEventListener("resize", function () { render(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") render();
  });

  // ---- boot ----
  document.getElementById("tab-daily").textContent = T("daily");
  document.getElementById("tab-rand").textContent = T("rand");
  document.getElementById("lb-score").textContent = T("score");
  document.getElementById("lb-time").textContent = T("time");
  document.getElementById("lb-moves").textContent = T("moves");
  document.getElementById("muteBtn").textContent = Sound.isMuted() ? "🔇" : "🔊";
  document.getElementById("streak").title = T("streak");
  newGame("daily");
  syncTabs();
  kbSet(0);
})();
