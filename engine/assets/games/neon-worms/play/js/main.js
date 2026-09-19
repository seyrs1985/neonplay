/* Neon Worms — bootstrap: canvas + camera, input (joystick / mouse /
 * boost), HUD + leaderboard wiring, panels, ?autotest=1 / ?shot= hooks.
 * No game logic here (see game.js). */
'use strict';
(function () {
  var canvas = document.getElementById("cv");
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(2, window.devicePixelRatio || 1);

  var L = {
    en: {
      title: "NEON WORMS", sub: "Solo arena — 37 AI worms, one crown",
      classic: "CLASSIC", daily: "DAILY ARENA",
      play: "▶ PLAY", again: "↻ SLITHER AGAIN", over: "YOU WERE EATEN",
      best: "Best", len: "LENGTH", kills: "KILLS", rank: "RANK", time: "TIME",
      dailyNote: "Same food map worldwide today",
      boost: "BOOST", hint: "Left half: drag to steer · right button: boost",
      kb: "Mouse steers · hold LMB / Space to boost",
      finalLen: "Final length", finalKills: "Kills", survived: "Survived",
      board: "TOP WORMS", newBest: "★ NEW BEST ★"
    },
    zh: {
      title: "霓虹蠕虫", sub: "单机竞技场 · 37 条 AI 蠕虫",
      classic: "经典", daily: "每日竞技场",
      play: "▶ 开始", again: "↻ 再来一局", over: "你被吃掉了",
      best: "最佳", len: "长度", kills: "击杀", rank: "段位", time: "存活",
      dailyNote: "今日全球同一张光点地图",
      boost: "冲刺", hint: "左半屏拖动转向 · 右下按钮冲刺",
      kb: "鼠标转向 · 按住左键/空格冲刺",
      finalLen: "最终长度", finalKills: "击杀", survived: "存活",
      board: "蠕虫榜", newBest: "★ 新纪录 ★"
    }
  };
  function T(k) { return npT(L, k); }
  function fmtT(s) { return Math.floor(s / 60) + ":" + ("0" + Math.floor(s % 60)).slice(-2); }

  // ---------- render ----------
  function resize() {
    var r = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
  }
  window.addEventListener("resize", function () { resize(); render(); });

  var HUES = { player: "#00e5ff" };
  function render() {
    var st = WORMS.st();
    if (!st) return;
    var w = canvas.width / dpr, h = canvas.height / dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a0a18"; ctx.fillRect(0, 0, w, h);
    var cam = st.cam, sc = cam.scale;
    var shx = 0, shy = 0;
    if (st.shake > 0) { shx = (Math.random() - 0.5) * st.shake; shy = (Math.random() - 0.5) * st.shake; }
    ctx.save();
    ctx.translate(w / 2 + shx, h / 2 + shy);
    ctx.scale(sc, sc);
    ctx.translate(-cam.x, -cam.y);
    var vw = w / sc, vh = h / sc;
    var x0 = cam.x - vw / 2, y0 = cam.y - vh / 2, x1 = cam.x + vw / 2, y1 = cam.y + vh / 2;

    // grid
    ctx.strokeStyle = "rgba(124,77,255,0.07)"; ctx.lineWidth = 1 / sc;
    ctx.beginPath();
    for (var gx = Math.floor(x0 / 100) * 100; gx < x1; gx += 100) { ctx.moveTo(gx, y0); ctx.lineTo(gx, y1); }
    for (var gy = Math.floor(y0 / 100) * 100; gy < y1; gy += 100) { ctx.moveTo(x0, gy); ctx.lineTo(x1, gy); }
    ctx.stroke();

    // arena border (pink glow)
    ctx.strokeStyle = "rgba(255,45,149,0.35)"; ctx.lineWidth = 10;
    ctx.strokeRect(0, 0, WORMS.WORLD, WORMS.WORLD);
    ctx.strokeStyle = "#ff2d95"; ctx.lineWidth = 3;
    ctx.strokeRect(0, 0, WORMS.WORLD, WORMS.WORLD);

    // food (breathing glow)
    ctx.globalCompositeOperation = "lighter";
    var now = performance.now() / 1000;
    for (var f = 0; f < st.food.length; f++) {
      var fo = st.food[f];
      if (fo.x < x0 - 20 || fo.x > x1 + 20 || fo.y < y0 - 20 || fo.y > y1 + 20) continue;
      var pr = (fo.v > 1 ? 9 : 5) + Math.sin(now * 3 + fo.ph) * 1.6;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = fo.hue;
      ctx.beginPath(); ctx.arc(fo.x, fo.y, pr * 2.2, 0, 7); ctx.fill();
      ctx.globalAlpha = 0.95;
      ctx.beginPath(); ctx.arc(fo.x, fo.y, pr * 0.6, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";

    // worms (visible slice)
    for (var i = 0; i < st.worms.length; i++) {
      var w2 = st.worms[i];
      if (!w2.alive) continue;
      var head = w2.pts[0];
      if (head.x < x0 - 300 || head.x > x1 + 300 || head.y < y0 - 300 || head.y > y1 + 300) continue;
      drawWorm(w2, now);
    }

    // particles
    if (st.parts.length) {
      ctx.globalCompositeOperation = "lighter";
      for (var p = 0; p < st.parts.length; p++) {
        var q = st.parts[p];
        ctx.globalAlpha = Math.max(0, q.life / q.max);
        ctx.fillStyle = q.hue;
        ctx.beginPath(); ctx.arc(q.x, q.y, q.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();
  }
  function drawWorm(worm, now) {
    var st = WORMS.st();
    var r = WORMS.radiusOf(worm.len);
    var hue = worm.isPlayer ? HUES.player : worm.hue;
    var boostGlow = worm.boost && worm.len > 10;
    // glow underlay (fake glow: wide translucent stroke)
    ctx.fillStyle = hue;
    ctx.globalAlpha = boostGlow ? 0.3 : 0.18;
    for (var i = worm.pts.length - 1; i >= 0; i -= 2) {
      var p = worm.pts[i];
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 1.55, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // body
    for (var j = worm.pts.length - 1; j >= 1; j -= 2) {
      var q = worm.pts[j];
      var rr = r * (0.62 + 0.38 * (1 - j / worm.pts.length));
      ctx.beginPath(); ctx.arc(q.x, q.y, rr, 0, 7); ctx.fill();
    }
    // head + eyes
    var h0 = worm.pts[0];
    ctx.beginPath(); ctx.arc(h0.x, h0.y, r * 1.04, 0, 7); ctx.fill();
    var ea = worm.angle;
    ctx.fillStyle = "#ffffff";
    var ex = Math.cos(ea + 0.9) * r * 0.55, ey = Math.sin(ea + 0.9) * r * 0.55;
    var ex2 = Math.cos(ea - 0.9) * r * 0.55, ey2 = Math.sin(ea - 0.9) * r * 0.55;
    ctx.beginPath(); ctx.arc(h0.x + ex, h0.y + ey, r * 0.3, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(h0.x + ex2, h0.y + ey2, r * 0.3, 0, 7); ctx.fill();
    ctx.fillStyle = "#0a0a18";
    ctx.beginPath(); ctx.arc(h0.x + ex * 1.3, h0.y + ey * 1.3, r * 0.14, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(h0.x + ex2 * 1.3, h0.y + ey2 * 1.3, r * 0.14, 0, 7); ctx.fill();
    // player marker ring
    if (worm.isPlayer) {
      ctx.strokeStyle = "rgba(0,229,255,0.8)"; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(h0.x, h0.y, r * 1.8 + Math.sin(now * 4) * 2, 0, 7); ctx.stroke();
    }
  }

  // ---------- HUD ----------
  function hud() {
    var s = WORMS.snapshot();
    document.getElementById("v-len").textContent = s.len;
    document.getElementById("v-kills").textContent = s.kills;
    var lang = npLang();
    document.getElementById("v-rank").textContent = lang === "zh" ? s.rank.zh : s.rank.en;
    document.getElementById("v-time").textContent = fmtT(s.time);
    var ol = document.getElementById("board");
    var h = "";
    for (var i = 0; i < s.board.length; i++) {
      var b = s.board[i];
      h += '<li class="' + (b.isPlayer ? "me" : "") + '"><span>' + (i + 1) + '</span>' +
           (b.isPlayer ? T("title").split(" ")[0] : "AI") + ' · ' + b.len + '</li>';
    }
    ol.innerHTML = h;
    return s;
  }

  // ---------- panels ----------
  var panel = document.getElementById("panel"), panelBox = document.getElementById("panelBox");
  function bestOf() {
    try { return parseInt(localStorage.getItem("np_worms_best_len") || "0", 10) || 0; } catch (e) { return 0; }
  }
  function showPanel(mode) {
    var s = WORMS.snapshot();
    var h = "";
    if (mode === "title") {
      h = '<h1>' + T("title") + '</h1><p class="sub">' + T("sub") + '</p>' +
          '<div class="bests">' + T("best") + ': ' + bestOf() + '</div>' +
          '<div class="modes"><button id="mClassic" class="tab">' + T("classic") + '</button>' +
          '<button id="mDaily" class="tab on">' + T("daily") + '</button></div>' +
          '<button id="pPlay" class="primary">' + T("play") + '</button>' +
          '<p class="kbhint" id="kbhint"></p>';
    } else {
      var bl = bestOf();
      var isBest = s.len >= bl && s.len > 0;
      var rank = npLang() === "zh" ? s.rank.zh : s.rank.en;
      h = '<h2>' + T("over") + '</h2>' +
          '<div class="bigscore">' + s.len + '</div>' +
          (isBest ? '<div class="newbest">' + T("newBest") + '</div>' : '') +
          '<div class="rows">' +
          '<div>' + T("finalKills") + ': <b>' + s.kills + '</b></div>' +
          '<div>' + T("survived") + ': <b>' + fmtT(s.time) + '</b></div>' +
          '<div>' + T("rank") + ': <b>' + rank + '</b></div>' +
          '<div>' + T("best") + ': <b>' + Math.max(bl, s.len) + '</b></div></div>' +
          '<button id="pAgain" class="primary">' + T("again") + '</button>';
    }
    panelBox.innerHTML = h;
    panel.classList.remove("hide");
    var mode_ = "daily";
    var b = document.getElementById("mClassic");
    if (b) b.addEventListener("click", function () { mode_ = "classic"; b.classList.add("on"); document.getElementById("mDaily").classList.remove("on"); });
    var d = document.getElementById("mDaily");
    if (d) d.addEventListener("click", function () { mode_ = "daily"; d.classList.add("on"); document.getElementById("mClassic").classList.remove("on"); });
    b = document.getElementById("pPlay");
    if (b) b.addEventListener("click", function () { begin(mode_); });
    b = document.getElementById("pAgain");
    if (b) b.addEventListener("click", function () { begin(s.date ? "daily" : "classic"); });
    var kb = document.getElementById("kbhint");
    if (kb) {
      kb.textContent = isTouch() ? T("hint") : T("kb");
    }
  }
  function begin(mode) {
    Sound.resume(); Sound.sfx("ui");
    WORMS.start(mode);
    panel.classList.add("hide");
    lastLen = WORMS.snapshot().len;
  }

  // ---------- events -> feedback ----------
  var HANDLERS = {
    eat: function () { Sound.sfx("move"); },
    kill: function () {
      Sound.sfx("clear", { rows: 2 });
      WORMS.st().hitstop = 0.1;
      WORMS.st().shake = 10;
    },
    over: function () {
      Sound.sfx("over");
      WORMS.st().shake = 16;
      showPanel("over");
    },
    start: function () { WORMS.st().shake = 0; }
  };
  var lastLen = 0;
  function pump() {
    WORMS.drainEvents(HANDLERS);
    var s = WORMS.snapshot();
    if (s.len > lastLen + 7) { Sound.sfx("rotate"); lastLen = s.len; }
    else if (s.len < lastLen) lastLen = s.len;
  }

  // ---------- input ----------
  function isTouch() { return matchMedia("(pointer: coarse)").matches; }
  var joy = null;
  var stage = document.getElementById("stage");
  stage.addEventListener("pointerdown", function (e) {
    if (e.cancelable) e.preventDefault();
    Sound.resume();
    var st = WORMS.st();
    if (st.state !== "PLAY") return;
    var r = canvas.getBoundingClientRect();
    var isTouchPt = e.pointerType === "touch";
    if (isTouchPt && e.clientX - r.left < r.width * 0.55) {
      joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, boost: false };
      return;
    }
    // right side touch or any mouse press -> boost while held
    held.set(e.pointerId, true);
    setBoost(true);
  }, { passive: false });
  var held = new Map();
  stage.addEventListener("pointermove", function (e) {
    var st = WORMS.st();
    if (st.state !== "PLAY") return;
    if (joy && e.pointerId === joy.id) {
      var dx = e.clientX - joy.ox, dy = e.clientY - joy.oy;
      var d = Math.hypot(dx, dy);
      if (d > 14) {
        var pl = WORMS.player();
        pl.target = Math.atan2(dy, dx);
        if (d > 90) { joy.ox = e.clientX - dx / d * 90; joy.oy = e.clientY - dy / d * 90; }
      }
      return;
    }
    if (e.pointerType !== "touch") {
      // desktop: steer toward pointer
      var r = canvas.getBoundingClientRect();
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (Math.abs(e.clientX - cx) + Math.abs(e.clientY - cy) > 12) {
        WORMS.player().target = Math.atan2(e.clientY - cy, e.clientX - cx);
      }
    }
  }, { passive: true });
  function release(e) {
    if (joy && e.pointerId === joy.id) joy = null;
    if (held.has(e.pointerId)) { held.delete(e.pointerId); if (!held.size) setBoost(false); }
  }
  stage.addEventListener("pointerup", release, { passive: true });
  stage.addEventListener("pointercancel", release, { passive: true });
  stage.addEventListener("pointerleave", release, { passive: true });
  var boostBtn = document.getElementById("boostBtn");
  boostBtn.addEventListener("pointerdown", function (e) {
    if (e.cancelable) e.preventDefault();
    Sound.resume(); setBoost(true);
  }, { passive: false });
  boostBtn.addEventListener("pointerup", function () { setBoost(false); }, { passive: true });
  boostBtn.addEventListener("pointercancel", function () { setBoost(false); }, { passive: true });
  function setBoost(on) {
    var pl = WORMS.player();
    if (pl && WORMS.st().state === "PLAY") pl.boost = !!on;
  }
  document.addEventListener("keydown", function (e) {
    if (e.repeat) return;
    var st = WORMS.st();
    if (e.key === "m" || e.key === "M") { toggleMute(); return; }
    if (st.state !== "PLAY") {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); begin(st.date ? "daily" : "classic"); }
      return;
    }
    if (e.key === " ") { e.preventDefault(); Sound.resume(); setBoost(true); }
  });
  document.addEventListener("keyup", function (e) {
    if (e.key === " ") setBoost(false);
  });
  function toggleMute() {
    var m = Sound.toggleMute();
    document.getElementById("muteBtn").textContent = m ? "🔇" : "🔊";
  }
  document.getElementById("muteBtn").addEventListener("click", toggleMute);
  document.getElementById("muteBtn").textContent = Sound.isMuted() ? "🔇" : "🔊";

  // ---------- main loop ----------
  var lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.033, (now - lastT) / 1000);
    lastT = now;
    if (!window.__qaFreeze) {
      var st = WORMS.st();
      if (st.state === "PLAY") WORMS.step(dt);
      WORMS.st(); // keep reference hot
      pump();
      if (Math.floor(now / 500) !== Math.floor((now - dt * 1000) / 500)) hud();
    }
    render();
  }

  // ---------- ?autotest=1 ----------
  function autotest() {
    window.__qaFreeze = true;
    var R = {};
    function chk(name, ok, detail) { R[name] = ok === true ? true : (detail || false); }
    try {
      // 1) layout determinism (same seed -> same world)
      WORMS.start("daily", 4242);
      var a = WORMS.st();
      var foodA = a.food.slice(0, 6).map(function (f) { return [Math.round(f.x), Math.round(f.y), f.v]; });
      var botsA = a.worms.length;
      WORMS.start("daily", 4242);
      var b = WORMS.st();
      var foodB = b.food.slice(0, 6).map(function (f) { return [Math.round(f.x), Math.round(f.y), f.v]; });
      chk("layoutDeterminism", botsA === b.worms.length && JSON.stringify(foodA) === JSON.stringify(foodB),
        JSON.stringify(foodA) + " vs " + JSON.stringify(foodB));
      chk("botPopulation", b.worms.length === WORMS.BOT_COUNT + 1, "worms=" + b.worms.length);

      // 2) food -> growth
      WORMS.start("daily", 99);
      var pl = WORMS.player();
      WORMS.qaClearBots();
      var len0 = pl.len;
      var grew = false;
      for (var i = 0; i < 900 && WORMS.st().state === "PLAY"; i++) {
        // steer to nearest food
        var st2 = WORMS.st(), best = null, bd = 1e18;
        for (var f2 = 0; f2 < st2.food.length; f2++) {
          var fo = st2.food[f2];
          var dx = fo.x - pl.x, dy = fo.y - pl.y, d2 = dx * dx + dy * dy;
          if (d2 < bd) { bd = d2; best = fo; }
        }
        if (!best) break;
        pl.target = Math.atan2(best.y - pl.y, best.x - pl.x);
        WORMS.step(1 / 30);
        if (pl.len > len0 + 3) { grew = true; break; }
      }
      chk("growth", grew && pl.len > len0, "len " + len0 + "->" + pl.len);

      // 3) boost burns length
      var lb = pl.len;
      pl.boost = true;
      for (var j = 0; j < 90 && pl.len > 12; j++) WORMS.step(1 / 30);
      chk("boostBurn", pl.len < lb, "len " + lb + "->" + pl.len);
      pl.boost = false;

      // 4) bot dies on player body -> kill counted + food burst
      WORMS.start("daily", 7);
      WORMS.qaClearBots();
      WORMS.qaPlacePlayer(1500, 2000, -Math.PI / 2, 200);   // long body trailing south
      var bot = WORMS.qaSpawnBot(1700, 2800, Math.PI, 30);  // heads west across the body line
      var food0 = WORMS.st().food.length;
      var killed = false;
      for (var k = 0; k < 300 && WORMS.st().state === "PLAY"; k++) {
        WORMS.step(1 / 30);
        if (!bot.alive) { killed = true; break; }
      }
      chk("aiDiesOnBody", killed && WORMS.player().kills === 1,
        "killed=" + killed + " kills=" + WORMS.player().kills);
      chk("deathFoodBurst", WORMS.st().food.length > food0 + 5,
        (WORMS.st().food.length - food0) + " new orbs");

      // 5) player dies on bot body -> OVER + best persisted
      WORMS.start("daily", 8);
      WORMS.qaClearBots();
      WORMS.qaSpawnBot(2000, 2000, 0, 200);             // long body trailing west, heads east
      WORMS.qaPlacePlayer(2400, 2000, Math.PI, 20);     // heads west into the body line
      for (var m = 0; m < 300 && WORMS.st().state === "PLAY"; m++) WORMS.step(1 / 30);
      chk("playerDeath", WORMS.st().state === "OVER" && WORMS.snapshot().alive === false,
        "state=" + WORMS.st().state);
      var keys = [];
      for (var li = 0; li < localStorage.length; li++) keys.push(localStorage.key(li));
      chk("persistence", keys.indexOf("np_worms_best_len") >= 0);

      // 6) leaderboard sorted by length desc
      WORMS.start("daily", 42);
      var lbBoard = WORMS.leaderboard(5);
      var sorted = true;
      for (var n = 1; n < lbBoard.length; n++) if (lbBoard[n].len > lbBoard[n - 1].len) sorted = false;
      chk("leaderboard", lbBoard.length === 5 && sorted);

      // 7) rank ladder bounds
      chk("ranks", WORMS.rankOf(5).en === "Slug" && WORMS.rankOf(700).en === "Neon Python" &&
        WORMS.rankOf(240).en === "Serpent");
    } catch (ex) {
      chk("exception", false, String(ex && ex.message || ex));
    }
    R.allPass = Object.keys(R).every(function (k) { return k === "allPass" || R[k] === true; });
    window.__autotest = R;
    window.__qaFreeze = false;
    return R;
  }

  // ---------- ?shot= ----------
  function shot() {
    var q = new URLSearchParams(location.search);
    var kind = q.get("shot") || "title";
    var seed = parseInt(q.get("seed") || "42", 10);
    var t = parseFloat(q.get("t") || "6");
    window.__qaFreeze = true;
    WORMS.start("daily", seed);
    if (kind === "play" || kind === "over") {
      var steps = Math.round(t * 30);
      for (var i = 0; i < steps && WORMS.st().state === "PLAY"; i++) WORMS.step(1 / 30);
      pump();
      if (kind === "over" && WORMS.st().state !== "OVER") {
        // park a wall run: steer into border
        var pl = WORMS.player();
        pl.target = 0;
        for (var k = 0; k < 600 && WORMS.st().state === "PLAY"; k++) WORMS.step(1 / 30);
        pump();
      }
      panel.classList.add("hide");
    } else {
      showPanel("title");
    }
    hud(); render();
  }

  // ---------- boot ----------
  var q = new URLSearchParams(location.search);
  resize();
  WORMS.start("daily");
  document.getElementById("boostBtn").textContent = "⚡";
  document.getElementById("lb-len").textContent = T("len");
  document.getElementById("lb-kills").textContent = T("kills");
  document.getElementById("lb-rank").textContent = T("rank");
  document.getElementById("lb-time").textContent = T("time");
  document.getElementById("boardTitle").textContent = T("board");
  hud(); showPanel("title");
  document.addEventListener("visibilitychange", function () {
    lastT = performance.now();
    if (document.visibilityState === "visible") render();
  });
  if (q.get("autotest") === "1") { setTimeout(function () { autotest(); render(); }, 50); }
  else if (q.get("shot")) { shot(); }
  requestAnimationFrame(frame);
})();
