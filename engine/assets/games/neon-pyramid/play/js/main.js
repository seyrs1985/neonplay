/* Neon Pyramid — bootstrap + input mapping (no game logic here).
 * Pointer: tap exposed pyramid cards / waste top to select, tap another
 * to pair (sum 13 or 12 with the joker), kings tap once. Tap stock to
 * draw, tap again to recycle. pointercancel clears the pending press.
 * Keyboard: Tab/arrows cycle accessible cards + stock, Enter acts,
 * D draw, R new deal, M mute. */
'use strict';
(function () {
  var press = null;

  function slotFromEvent(el) {
    if (!el || el.dataset === undefined || el.dataset.r === undefined) return null;
    var s = slotById(+el.dataset.id);
    return s || null;
  }
  function tapEl(el) {
    if (!el) return;
    Sound.resume();
    if (el.classList && el.classList.contains("pyrcard")) {
      var s = slotFromEvent(el);
      if (s) tapSlot(s);
      return;
    }
    var zone = el.closest ? el.closest("[data-zone]") : null;
    if (!zone) return;
    var z = zone.dataset.zone;
    if (z === "stock") tapStock();
    else if (z === "waste") tapWaste();
  }
  function onDown(e) {
    if (phase !== "play") return;
    if (e.cancelable) e.preventDefault();
    Sound.resume();
    var el = e.target.closest ? e.target.closest(".pyrcard, .wastecard, [data-zone]") : null;
    if (!el) return;
    press = { el: el };
  }
  function onUp(e) {
    if (!press) return;
    var p = press; press = null;
    var el = e.target.closest ? e.target.closest(".pyrcard, .wastecard, [data-zone]") : null;
    if (el === p.el || (el && p.el && el.dataset.id !== undefined && el.dataset.id === p.el.dataset.id)) tapEl(el || p.el);
  }
  function onCancel() { press = null; }
  document.getElementById("board").addEventListener("pointerdown", onDown, { passive: false });
  document.addEventListener("pointerup", onUp, { passive: true });
  document.addEventListener("pointercancel", onCancel, { passive: true });

  // ---- keyboard: cycle accessible positions, Enter acts ----
  function kbList() {
    if (phase !== "play") return [];
    var list = accessible().map(function (a) {
      return a.isWaste ? { where: "waste", id: a.id } : { where: "pyr", id: a.id };
    });
    list.push({ where: "stock" });
    return list;
  }
  function kbSet(i) {
    var list = kbList();
    if (!list.length) return;
    var cur = kbFocus ? list.findIndex(function (x) { return x.where === kbFocus.where && x.id === kbFocus.id; }) : -1;
    if (i === undefined) i = cur < 0 ? 0 : cur;
    i = ((i % list.length) + list.length) % list.length;
    kbFocus = list[i];
    render();
  }
  function kbAct() {
    if (phase !== "play" || !kbFocus) return;
    Sound.resume();
    if (kbFocus.where === "stock") { tapStock(); return; }
    if (kbFocus.where === "waste") { tapWaste(); return; }
    var s = slotById(kbFocus.id);
    if (s) tapSlot(s);
  }
  document.addEventListener("keydown", function (e) {
    var k = e.key;
    if (phase === "joker") {
      if (k === "Enter" || k === " ") {   // confirm default joker unless a card button is focused (native click)
        var ae = document.activeElement;
        if (!(ae && ae.classList && ae.classList.contains("jokercard"))) {
          e.preventDefault();
          pickJoker(0);
        }
      }
      return;
    }
    kbOn = true;
    var list = kbList();
    var cur = kbFocus ? list.findIndex(function (x) { return x.where === kbFocus.where && x.id === kbFocus.id; }) : -1;
    if (k === "Tab" || k === "ArrowRight" || k === "ArrowDown") { e.preventDefault(); kbSet(cur + 1); }
    else if (k === "ArrowLeft" || k === "ArrowUp") { e.preventDefault(); kbSet(cur - 1); }
    else if (k === "Enter" || k === " ") { e.preventDefault(); kbAct(); }
    else if (k === "d" || k === "D") { e.preventDefault(); if (phase === "play") tapStock(); }
    else if (k === "r" || k === "R") { e.preventDefault(); newGame(mode); }
    else if (k === "m" || k === "M") { e.preventDefault(); toggleMute(); }
    else if (k === "h" || k === "H") { e.preventDefault(); armHammerUI(); }
  });

  // ---- HUD buttons / tabs / panels ----
  function toggleMute() {
    var m = Sound.toggleMute();
    document.getElementById("muteBtn").textContent = m ? "🔇" : "🔊";
  }
  function armHammerUI() {
    if (joker !== "hammer" || hammerUsed || phase !== "play") return;
    hammerArmed = !hammerArmed;
    if (hammerArmed) flash(T("hammerArm"));
    renderHud(); render();
  }
  document.getElementById("hammerBtn").addEventListener("click", armHammerUI);
  document.getElementById("newBtn").addEventListener("click", function () { newGame(mode); });
  document.getElementById("muteBtn").addEventListener("click", toggleMute);
  document.getElementById("tab-daily").addEventListener("click", function () { newGame("daily"); syncTabs(); });
  document.getElementById("tab-rand").addEventListener("click", function () { newGame("rand"); syncTabs(); });
  function syncTabs() {
    document.getElementById("tab-daily").classList.toggle("on", mode === "daily");
    document.getElementById("tab-rand").classList.toggle("on", mode === "rand");
  }
  document.getElementById("wpNew").addEventListener("click", function () { newGame(mode); syncTabs(); });
  document.getElementById("wpShare").addEventListener("click", function () {
    var cleared = phase === "clear";
    var text = shareText(cleared);
    var cv = shareCard(cleared);
    var self = this;
    var done = function () { self.textContent = "✓"; setTimeout(function () { self.textContent = T("share"); }, 1600); };
    if (navigator.share) {
      var sharePayload = { title: "Neon Pyramid", text: text, url: "https://seyrs1985.github.io/neonplay/neon-pyramid/" };
      if (cv && cv.toDataURL) {
        try {
          var blob = dataURLtoBlob(cv.toDataURL("image/png"));
          if (blob) {
            var file = new File([blob], "neon-pyramid.png", { type: "image/png" });
            sharePayload.files = [file];
          }
        } catch (e) {}
      }
      navigator.share(sharePayload).then(done, function () {
        clip(text); done();
      });
    } else {
      clip(text);
      done();
    }
  });
  function clip(text) {            // clipboard fallback, rejection swallowed (console-clean)
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        var p = navigator.clipboard.writeText(text);
        if (p && p.catch) p.catch(function () {});
      }
    } catch (e) {}
  }
  function dataURLtoBlob(u) {
    var parts = u.split(",");
    var mime = (parts[0].match(/:(.*?);/) || [])[1] || "image/png";
    var bin = atob(parts[1]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  // ---- clock + autosave + repaint ----
  setInterval(function () {
    if (window.__qaFreeze) return;
    if (!clockOn || phase === "clear" || phase === "over") return;
    if (document.visibilityState === "hidden") return;
    sec++;
    document.getElementById("v-time") && (document.getElementById("v-time").textContent = fmtTime(sec));
  }, 1000);
  setInterval(function () {          // 10s autosave of the retention keys
    putJSON(K_BEST, BEST); putJSON(K_TOP10, TOP10); putJSON(K_DAILY, DAILY);
    putJSON(K_STREAK, STREAK); putJSON(K_STATS, STATS); putJSON(K_WEEKLY, WEEKLY);
  }, 10000);
  window.addEventListener("resize", function () { render(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") render();
  });

  function fmtTime(s) { return ((s / 60) | 0) + ":" + ("0" + (s % 60)).slice(-2); }

  // ---- boot ----
  document.getElementById("tab-daily").textContent = T("daily");
  document.getElementById("tab-rand").textContent = T("rand");
  document.getElementById("lb-score").textContent = T("score");
  document.getElementById("lb-pairs").textContent = T("pairs");
  document.getElementById("lb-stock").textContent = T("stock");
  document.getElementById("lb-cycles").textContent = T("cycles");
  document.getElementById("jt").textContent = T("jokerT");
  document.getElementById("js").textContent = T("jokerSub");
  document.getElementById("muteBtn").textContent = Sound.isMuted() ? "🔇" : "🔊";
  document.getElementById("newBtn").title = T("again");
  document.getElementById("streak").title = T("streak");
  newGame("daily");
  syncTabs();
})();
