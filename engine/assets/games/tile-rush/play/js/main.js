/* Tile Rush — bootstrap: i18n text, input wiring, modes, keyboard. */
'use strict';
(function () {
  var curMode = "daily", curDiff = "standard";

  function applyText() {
    document.getElementById("tab-daily").textContent = T("daily");
    document.getElementById("tab-endless").textContent = T("endless");
    document.querySelector('[data-diff="casual"]').textContent = T("casual");
    document.querySelector('[data-diff="standard"]').textContent = T("standard");
    document.querySelector('[data-diff="challenge"]').textContent = T("challenge");
    document.getElementById("muteBtn").title = TRSound.isMuted() ? T("unmuted") : T("muted");
    document.getElementById("muteBtn").textContent = TRSound.isMuted() ? "🔇" : "🔊";
  }

  function setMode(m, diff) {
    curMode = m;
    if (diff) curDiff = diff;
    document.getElementById("tab-daily").classList.toggle("on", m === "daily");
    document.getElementById("tab-endless").classList.toggle("on", m === "endless");
    document.querySelectorAll(".diff").forEach(function (b) {
      b.classList.toggle("on", m === "endless" && b.dataset.diff === curDiff);
    });
    newRound(m === "daily" ? "daily" : "endless", curDiff);
  }

  /* audio unlock on first gesture (autoplay policy) */
  ["pointerdown", "keydown"].forEach(function (ev) {
    document.addEventListener(ev, function () { TRSound.resume(); }, { passive: true, once: false });
  });

  /* board taps — event delegation; z-index hands us the topmost tile */
  document.getElementById("board").addEventListener("pointerdown", function (e) {
    var el = e.target.closest(".tile");
    if (el) {
      if (e.cancelable) e.preventDefault();
      pick(parseInt(el.dataset.id, 10));
    }
  }, { passive: false });
  document.addEventListener("pointercancel", function () {}, { passive: true });
  document.getElementById("board").style.touchAction = "none";

  /* props + panel */
  document.getElementById("pullBtn").addEventListener("click", function () { if (!pullOut()) TRSound.bad(); });
  document.getElementById("shuffleBtn").addEventListener("click", function () { if (!doShuffle()) TRSound.bad(); });
  document.getElementById("epShare").addEventListener("click", doShare);
  document.getElementById("epRetry").addEventListener("click", function () { newRound(R.mode === "daily" ? "daily" : "endless", R.diff === "daily" ? curDiff : R.diff, R.seed); });
  document.getElementById("epNew").addEventListener("click", function () { newRound("endless", R.diff === "daily" ? curDiff : R.diff); });
  document.getElementById("muteBtn").addEventListener("click", function () {
    TRSound.setMuted(!TRSound.isMuted());
    applyText();
  });

  /* tabs */
  document.getElementById("tab-daily").addEventListener("click", function () { setMode("daily"); });
  document.getElementById("tab-endless").addEventListener("click", function () { setMode("endless"); });
  document.querySelectorAll(".diff").forEach(function (b) {
    b.addEventListener("click", function () { setMode("endless", b.dataset.diff); });
  });

  /* keyboard: arrows cycle focus over FREE tiles only, Enter picks, 1/2 props */
  document.addEventListener("keydown", function (e) {
    if (e.key === "1") { if (!pullOut()) TRSound.bad(); return; }
    if (e.key === "2") { if (!doShuffle()) TRSound.bad(); return; }
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft" && e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== "Enter") return;
    var tiles = Array.prototype.slice.call(document.querySelectorAll(".tile:not(.cov)"));
    if (!tiles.length) return;
    var idx = tiles.indexOf(document.activeElement);
    if (e.key === "Enter") {
      if (idx >= 0) { pick(parseInt(document.activeElement.dataset.id, 10)); e.preventDefault(); }
      return;
    }
    e.preventDefault();
    var dir = (e.key === "ArrowRight" || e.key === "ArrowDown") ? 1 : -1;
    var next = idx < 0 ? 0 : (idx + dir + tiles.length) % tiles.length;
    tiles[next].focus();
  });

  /* repaint on resize / tab return (event-driven game) */
  window.addEventListener("resize", function () { if (R) { renderBoard(); renderTray(); } });
  document.addEventListener("visibilitychange", function () { if (!document.hidden && R) renderAll(); });

  TRSound.loadMuted();
  applyText();
  setMode("daily");
})();
