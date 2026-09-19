/* Neon Runner — bootstrap: canvas, input (tap-jump / hold-duck, keyboard),
 * render (parallax city, ground grid, runner figure), HUD, panels,
 * ?autotest=1 / ?shot= hooks. No game logic here (see game.js). */
'use strict';
(function () {
  var canvas = document.getElementById("cv");
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(2, window.devicePixelRatio || 1);

  var L = {
    en: {
      title: "NEON RUNNER", sub: "Jump the spikes, duck the drones",
      classic: "CLASSIC", daily: "DAILY TRACK",
      play: "▶ RUN", again: "↻ RUN AGAIN", over: "WIPEOUT",
      best: "Best", dist: "DIST", speed: "SPEED", miles: "Left half: tap = jump · Right half: hold = duck",
      kb: "Space/↑ jump · ↓ duck · hold for full height",
      newBest: "★ NEW BEST ★", meters: "m", dailyNote: "Same track worldwide today",
      bestToday: "Today's best"
    },
    zh: {
      title: "霓虹跑者", sub: "跳过尖刺 · 俯身躲无人机",
      classic: "经典", daily: "每日赛道",
      play: "▶ 开跑", again: "↻ 再跑一次", over: "摔倒了",
      best: "最佳", dist: "距离", speed: "速度", miles: "左半屏点按=跳 · 右半屏按住=蹲",
      kb: "空格/↑ 跳 · ↓ 蹲 · 按住跳更高",
      newBest: "★ 新纪录 ★", meters: "米", dailyNote: "今日全球同一条赛道",
      bestToday: "今日最佳"
    }
  };
  function T(k) { return npT(L, k); }

  // ---------- render ----------
  function resize() {
    var r = canvas.parentElement.getBoundingClientRect();
    canvas.width = Math.round(r.width * dpr);
    canvas.height = Math.round(r.height * dpr);
    RUNNER.setCanvasW(r.width);
  }
  window.addEventListener("resize", function () { resize(); render(); });

  function groundY() { return canvas.height / dpr - 90; }
  function render() {
    var st = RUNNER.st();
    if (!st) return;
    var w = canvas.width / dpr, h = canvas.height / dpr;
    var gy = groundY();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a0a18"; ctx.fillRect(0, 0, w, h);

    // parallax layers: far skyline, mid towers
    var off1 = (st.scrollX * 0.12) % 260, off2 = (st.scrollX * 0.3) % 180;
    ctx.fillStyle = "rgba(124,77,255,0.16)";
    for (var b = -1; b < w / 130 + 2; b++) {
      var bx = b * 130 - off1;
      var bh = 90 + ((b * 7919) % 5) * 34;
      ctx.fillRect(bx, gy - bh, 74, bh);
    }
    ctx.fillStyle = "rgba(0,229,255,0.10)";
    for (var c = -1; c < w / 90 + 2; c++) {
      var cx = c * 90 - off2;
      var ch = 46 + ((c * 6271) % 4) * 26;
      ctx.fillRect(cx, gy - ch, 48, ch);
    }
    // stars
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    for (var s = 0; s < 26; s++) {
      var sx = (s * 331 - st.scrollX * 0.05) % w; if (sx < 0) sx += w;
      var sy = (s * 137) % (gy - 120);
      ctx.fillRect(sx, sy, 2, 2);
    }

    var shx = 0, shy = 0;
    if (st.shake > 0) { shx = (Math.random() - 0.5) * st.shake; shy = (Math.random() - 0.5) * st.shake; }
    ctx.save(); ctx.translate(shx, shy);

    // ground
    ctx.strokeStyle = "rgba(0,229,255,0.5)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(w, gy); ctx.stroke();
    ctx.strokeStyle = "rgba(0,229,255,0.12)"; ctx.lineWidth = 1;
    for (var l = 0; l < w / 60 + 2; l++) {
      var lx = l * 60 - (st.scrollX % 60);
      ctx.beginPath(); ctx.moveTo(lx, gy); ctx.lineTo(lx - 26, gy + 26); ctx.stroke();
    }

    // obstacles
    for (var i = 0; i < st.obstacles.length; i++) {
      var o = st.obstacles[i];
      if (o.type === "drone") {
        var dy = gy - o.air - o.h + Math.sin(performance.now() / 180 + o.sx) * 3;
        ctx.fillStyle = "#7c4dff";
        ctx.globalAlpha = 0.35;
        ctx.fillRect(o.sx - 5, dy - 5, o.w + 10, o.h + 10);
        ctx.globalAlpha = 1;
        ctx.fillRect(o.sx, dy, o.w, o.h);
        ctx.fillStyle = "#0a0a18"; ctx.fillRect(o.sx + 8, dy + 8, o.w - 16, o.h - 16);
        ctx.fillStyle = "#c9b8ff";
        ctx.beginPath(); ctx.arc(o.sx + o.w / 2, dy + o.h / 2, 4.5, 0, 7); ctx.fill();
        // rotor lines
        ctx.strokeStyle = "rgba(124,77,255,0.8)"; ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(o.sx - 8, dy - 4); ctx.lineTo(o.sx + o.w + 8, dy - 4);
        ctx.stroke();
      } else if (o.type === "double") {
        drawSpikes(o.sx, o.w, o.h, gy, "#ff2d95");
        drawSpikes(o.sx + o.w + o.gap2, o.w, o.h, gy, "#ff2d95");
      } else if (o.type === "barrier") {
        ctx.fillStyle = "#ff2d95";
        ctx.globalAlpha = 0.3; ctx.fillRect(o.sx - 4, gy - o.h - 4, o.w + 8, o.h + 8);
        ctx.globalAlpha = 1;
        ctx.fillRect(o.sx, gy - o.h, o.w, o.h);
        ctx.fillStyle = "rgba(255,255,255,0.4)";
        ctx.fillRect(o.sx + 3, gy - o.h + 3, o.w - 6, 6);
      } else {
        drawSpikes(o.sx, o.w, o.h, gy, "#ff2d95");
      }
    }

    // runner
    var pb = { py: st.py, duck: st.ducking };
    drawRunner(pb, st);

    // particles
    if (st.parts.length) {
      ctx.globalCompositeOperation = "lighter";
      for (var p = 0; p < st.parts.length; p++) {
        var q = st.parts[p];
        ctx.globalAlpha = Math.max(0, q.life / q.max);
        ctx.fillStyle = q.hue;
        ctx.beginPath(); ctx.arc(q.x, gy + q.y, q.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    ctx.restore();

    if (st.pulse > 0) {
      ctx.fillStyle = "rgba(255,255,255," + (st.pulse * 0.22).toFixed(3) + ")";
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = "#ffd54a";
      ctx.font = "800 28px system-ui"; ctx.textAlign = "center";
      ctx.globalAlpha = Math.min(1, st.pulse * 1.6);
      ctx.fillText((st.tier * 500) + "m — SPEED UP", w / 2, gy - 190);
      ctx.globalAlpha = 1;
    }
  }
  function drawSpikes(x, w2, h2, gy, color) {
    var n = Math.max(2, Math.round(w2 / 18));
    var sw = w2 / n;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (var i = 0; i < n; i++) {
      ctx.moveTo(x + i * sw, gy);
      ctx.lineTo(x + i * sw + sw / 2, gy - h2);
      ctx.lineTo(x + (i + 1) * sw, gy);
    }
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    for (var j = 0; j < n; j++) {
      ctx.moveTo(x + j * sw + sw * 0.3, gy - h2 * 0.55);
      ctx.lineTo(x + j * sw + sw / 2, gy - h2);
      ctx.lineTo(x + j * sw + sw * 0.55, gy - h2 * 0.5);
    }
    ctx.fill();
  }
  var legPhase = 0;
  function drawRunner(pb, st) {
    var gy = groundY();
    var x = RUNNER.PLAYER_X, py = pb.py;
    var hgt = pb.duck ? 30 : 58;
    var topY = gy - py - hgt;
    ctx.fillStyle = "#00e5ff";
    ctx.globalAlpha = 0.3;
    ctx.fillRect(x - 20, topY - 4, 40, hgt + 8);           // glow underlay
    ctx.globalAlpha = 1;
    if (pb.duck) {
      ctx.fillRect(x - 17, topY, 34, hgt);                 // crouched capsule
      ctx.beginPath(); ctx.arc(x + 14, topY + 9, 8, 0, 7); ctx.fill();
    } else {
      ctx.fillRect(x - 9, topY + 12, 18, hgt - 24);        // torso
      ctx.beginPath(); ctx.arc(x, topY + 8, 9, 0, 7); ctx.fill();  // head
      // legs
      var ph = st.grounded ? Math.sin(legPhase) : 0.6;
      ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 2, gy - py - 14); ctx.lineTo(x - 2 + ph * 12, gy - py);
      ctx.moveTo(x - 2, gy - py - 14); ctx.lineTo(x - 2 - ph * 12, gy - py);
      ctx.stroke();
      // arm
      ctx.beginPath(); ctx.moveTo(x, topY + 18); ctx.lineTo(x + 10 - ph * 8, topY + 28); ctx.stroke();
    }
  }

  // ---------- HUD / panels ----------
  function hud() {
    var s = RUNNER.st();
    document.getElementById("v-dist").textContent = Math.round(s.dist);
    document.getElementById("v-speed").textContent = Math.round(s.speed);
    var b = bestOf(s.mode);
    document.getElementById("v-best").textContent = b ? b + T("meters") : "—";
  }
  function bestOf(mode) {
    try {
      if (mode === "classic") return localStorage.getItem("np_runner_best_classic") || "";
      return localStorage.getItem("np_runner_best_daily_" + RUNNER.utcDateStr()) || "";
    } catch (e) { return ""; }
  }
  var panel = document.getElementById("panel"), panelBox = document.getElementById("panelBox");
  function showPanel(mode) {
    var s = RUNNER.st();
    var h = "";
    if (mode === "title") {
      h = '<h1>' + T("title") + '</h1><p class="sub">' + T("sub") + '</p>' +
          '<div class="bests">' + T("best") + ': ' + (bestOf("classic") || "—") + ' · ' +
          T("bestToday") + ': ' + (bestOf("daily") || "—") + '</div>' +
          '<div class="modes"><button id="mClassic" class="tab">' + T("classic") + '</button>' +
          '<button id="mDaily" class="tab on">' + T("daily") + '</button></div>' +
          '<button id="pPlay" class="primary">' + T("play") + '</button>' +
          '<p class="kbhint"></p>';
    } else {
      var b = bestOf(s.mode);
      var cur = Math.round(s.dist);
      var isBest = (!b || cur > parseInt(b, 10)) && cur > 0;
      h = '<h2>' + T("over") + '</h2>' +
          '<div class="bigscore">' + cur + T("meters") + '</div>' +
          (isBest ? '<div class="newbest">' + T("newBest") + '</div>' : '') +
          '<div class="bests">' + T("best") + ': ' + (Math.max(parseInt(b || "0", 10), cur)) + T("meters") + '</div>' +
          '<button id="pAgain" class="primary">' + T("again") + '</button>';
    }
    panelBox.innerHTML = h;
    panel.classList.remove("hide");
    var mode_ = "daily";
    var b1 = document.getElementById("mClassic");
    if (b1) b1.addEventListener("click", function () { mode_ = "classic"; b1.classList.add("on"); document.getElementById("mDaily").classList.remove("on"); });
    var b2 = document.getElementById("mDaily");
    if (b2) b2.addEventListener("click", function () { mode_ = "daily"; b2.classList.add("on"); document.getElementById("mClassic").classList.remove("on"); });
    var p = document.getElementById("pPlay");
    if (p) p.addEventListener("click", function () { begin(mode_); });
    p = document.getElementById("pAgain");
    if (p) p.addEventListener("click", function () { begin(s.mode); });
    var kb = panelBox.querySelector(".kbhint");
    if (kb) kb.textContent = T("kb");
  }
  function begin(mode) {
    Sound.resume(); Sound.sfx("ui");
    RUNNER.start(mode);
    panel.classList.add("hide");
    hud();
  }

  var HANDLERS = {
    jump: function () { Sound.sfx("rotate"); },
    land: function () { Sound.sfx("move"); },
    step: function () { Sound.sfx("move"); },
    milestone: function () { Sound.sfx("levelup"); },
    over: function () { Sound.sfx("over"); showPanel("over"); },
    start: function () { RUNNER.st().shake = 0; }
  };
  function pump() { RUNNER.drainEvents(HANDLERS); }

  // ---------- input ----------
  var stage = document.getElementById("stage");
  function side(e) {
    var r = canvas.getBoundingClientRect();
    return (e.clientX - r.left) < r.width * 0.5 ? "L" : "R";
  }
  stage.addEventListener("pointerdown", function (e) {
    if (e.cancelable) e.preventDefault();
    Sound.resume();
    var st = RUNNER.st();
    if (st.state !== "PLAY") return;
    if (side(e) === "L") RUNNER.jump(true);
    else RUNNER.duck(true);
  }, { passive: false });
  stage.addEventListener("pointerup", function (e) {
    if (side(e) === "L") RUNNER.jump(false); else RUNNER.duck(false);
  }, { passive: true });
  stage.addEventListener("pointercancel", function () {
    RUNNER.jump(false); RUNNER.duck(false);
  }, { passive: true });
  document.addEventListener("keydown", function (e) {
    if (e.repeat) return;
    var st = RUNNER.st();
    if (e.key === "m" || e.key === "M") { toggleMute(); return; }
    if (st.state !== "PLAY") {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowUp") { e.preventDefault(); begin(st.mode); }
      return;
    }
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") { e.preventDefault(); RUNNER.jump(true); }
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") { e.preventDefault(); RUNNER.duck(true); }
  });
  document.addEventListener("keyup", function (e) {
    if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") RUNNER.jump(false);
    else if (e.key === "ArrowDown" || e.key === "s" || e.key === "S") RUNNER.duck(false);
  });
  function toggleMute() {
    var m = Sound.toggleMute();
    document.getElementById("muteBtn").textContent = m ? "🔇" : "🔊";
  }
  document.getElementById("muteBtn").addEventListener("click", toggleMute);
  document.getElementById("muteBtn").textContent = Sound.isMuted() ? "🔇" : "🔊";

  // ---------- loop ----------
  var lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.033, (now - lastT) / 1000);
    lastT = now;
    if (!window.__qaFreeze) {
      var st = RUNNER.st();
      if (st.state === "PLAY") { legPhase += dt * 14; RUNNER.step(dt); }
      pump();
      hud();
    }
    render();
  }

  // ---------- ?autotest=1 ----------
  function autotest() {
    window.__qaFreeze = true;
    var R = {};
    function chk(name, ok, detail) { R[name] = ok === true ? true : (detail || false); }
    try {
      // 1) route guarantee: gaps respect the physics envelope; type tiers gated
      var seeds = [RUNNER.dateSeed(RUNNER.utcDateStr()), 1, 42, 777, 20260919];
      var envOk = true, tierOk = true, worst = 1e9;
      for (var si = 0; si < seeds.length; si++) {
        var rt = RUNNER.route(seeds[si], 200);
        for (var i = 0; i < rt.length - 1; i++) {
          var cur = rt[i], nxt = rt[i + 1];
          var span = cur.type === "double" ? cur.w + cur.gap2 + cur.w : cur.w;
          var v = RUNNER.speedAt(cur.x * 0.1);
          var margin = (nxt.x - cur.x - span) - v * (RUNNER.AIR_T + 0.42);
          if (margin < worst) worst = margin;
          if (margin < -0.5) envOk = false;
          if (cur.x * 0.1 < 1000 && cur.type === "drone") tierOk = false;
          if (cur.x * 0.1 < 2000 && cur.type === "double") tierOk = false;
        }
      }
      chk("gapEnvelope", envOk, "worst margin " + Math.round(worst));
      chk("tierGating", tierOk);
      chk("droneBands", (function () {
        // every drone must hit a standing runner and clear a ducking one
        var rt = RUNNER.route(42, 200);
        for (var i = 0; i < rt.length; i++) {
          if (rt[i].type === "drone" && (rt[i].air < 34 || rt[i].air > 46)) return false;
        }
        return true;
      })());

      // 2) auto-pilot survives 60s of the daily track
      function autoRun(seed, seconds, noDuck) {
        RUNNER.start("daily", seed);
        var steps = Math.round(seconds * 60);
        var jumpT = 0;
        for (var k = 0; k < steps; k++) {
          var st = RUNNER.st();
          if (st.state !== "PLAY") break;
          var o = st.obstacles[0];
          var acted = false;
          if (o) {
            var dx = o.sx - RUNNER.PLAYER_X;
            var v = st.speed;
            if (o.type === "drone") {
              // hold duck until the drone is fully past (contact zone ends at dx=+16)
              if (!noDuck && dx < v * 0.35) { RUNNER.duck(true); acted = true; }
              else RUNNER.duck(false);
            } else {
              RUNNER.duck(false);
              if (st.grounded && dx < v * 0.32 && dx > 0) { RUNNER.jump(true); jumpT = 0.001; acted = true; }
            }
          } else RUNNER.duck(false);
          if (jumpT > 0) { jumpT += 1 / 60; if (jumpT > 0.24) { RUNNER.jump(false); jumpT = 0; } }
          RUNNER.step(1 / 60);
        }
        return RUNNER.snapshot();
      }
      var run = autoRun(4242, 60, false);
      chk("autoPilotSurvives", run.state === "PLAY" && run.dist > 1500,
        "state=" + run.state + " dist=" + run.dist + " next=" + run.next + " tier=" + run.tier + " grounded=" + run.grounded);
      chk("noDuckDiesOnDrone", (function () {
        // find a seed whose early route has a drone; run without ducking -> must die
        for (var s = 1; s < 400; s++) {
          var rt = RUNNER.route(s, 40);
          for (var i = 0; i < rt.length; i++) {
            if (rt[i].type === "drone" && rt[i].x * 0.1 > 60 && rt[i].x * 0.1 < 1300) {
              var d = autoRun(s, 50, true);
              return d.state === "OVER";
            }
            if (rt[i].x * 0.1 > 1300) break;
          }
        }
        return false;
      })());

      // 3) idle runner dies on first obstacle
      RUNNER.start("classic", 11);
      for (var m = 0; m < 60 * 12 && RUNNER.st().state === "PLAY"; m++) RUNNER.step(1 / 60);
      chk("idleDies", RUNNER.st().state === "OVER", "state=" + RUNNER.st().state);

      // 4) daily determinism: two starts, same plan
      var a = RUNNER.route(4242, 12).map(function (o) { return o.type + "@" + Math.round(o.x); }).join("|");
      var b = RUNNER.route(4242, 12).map(function (o) { return o.type + "@" + Math.round(o.x); }).join("|");
      var c = RUNNER.route(4243, 12).map(function (o) { return o.type + "@" + Math.round(o.x); }).join("|");
      chk("seedDeterminism", a === b && a !== c);

      // 5) jump variable height: early release < full hold (on a long-first-gap route)
      var seedVJ = 3;
      for (var sv = 1; sv < 500; sv++) {
        if (RUNNER.route(sv, 1)[0].x > 3400) { seedVJ = sv; break; }
      }
      RUNNER.start("classic", seedVJ);
      for (var w1 = 0; w1 < 30; w1++) RUNNER.step(1 / 60);
      RUNNER.jump(true);
      for (var w2 = 0; w2 < 6; w2++) RUNNER.step(1 / 60);
      RUNNER.jump(false);
      var maxTap = 0;
      for (var w3 = 0; w3 < 90; w3++) { RUNNER.step(1 / 60); if (RUNNER.st().py > maxTap) maxTap = RUNNER.st().py; }
      RUNNER.jump(true);
      var maxHold = 0;
      for (var w4 = 0; w4 < 60; w4++) { RUNNER.step(1 / 60); if (RUNNER.st().py > maxHold) maxHold = RUNNER.st().py; }
      RUNNER.jump(false);
      chk("variableJump", maxHold > maxTap + 20, "tap=" + Math.round(maxTap) + " hold=" + Math.round(maxHold));

      // 6) persistence after death (classic best written by idle run)
      var keys = [];
      for (var li = 0; li < localStorage.length; li++) keys.push(localStorage.key(li));
      chk("persistence", keys.indexOf("np_runner_best_classic") >= 0);
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
    var t = parseFloat(q.get("t") || "8");
    window.__qaFreeze = true;
    RUNNER.start("daily", seed);
    if (kind === "play" || kind === "over") {
      var steps = Math.round(t * 60);
      var jumpT = 0;
      for (var i = 0; i < steps && RUNNER.st().state === "PLAY"; i++) {
        var st = RUNNER.st();
        var o = st.obstacles[0];
        if (o) {
          var dx = o.sx - RUNNER.PLAYER_X, v = st.speed;
          if (o.type === "drone") { RUNNER.duck(dx < v * 0.35); if (dx < v * 0.35) RUNNER.jump(false); }
          else { RUNNER.duck(false); if (st.grounded && dx < v * 0.32 && dx > 0) { RUNNER.jump(true); jumpT = 0.001; } }
        }
        if (jumpT > 0) { jumpT += 1 / 60; if (jumpT > 0.24) { RUNNER.jump(false); jumpT = 0; } }
        RUNNER.step(1 / 60);
      }
      pump();
      panel.classList.add("hide");
    } else {
      showPanel("title");
    }
    hud(); render();
  }

  // ---------- boot ----------
  var q = new URLSearchParams(location.search);
  resize();
  RUNNER.start("daily");
  document.getElementById("lb-dist").textContent = T("dist");
  document.getElementById("lb-speed").textContent = T("speed");
  document.getElementById("lb-best").textContent = T("best");
  hud(); showPanel("title");
  document.addEventListener("visibilitychange", function () {
    lastT = performance.now();
    if (document.visibilityState === "visible") render();
  });
  if (q.get("autotest") === "1") { setTimeout(function () { autotest(); render(); }, 50); }
  else if (q.get("shot")) { shot(); }
  requestAnimationFrame(frame);
})();
