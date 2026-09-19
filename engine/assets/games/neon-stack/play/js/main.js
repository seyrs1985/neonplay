/* Neon Stack — bootstrap: canvas letterbox, input mapping (keyboard +
 * touch gestures), HUD wiring, render loop, ?autotest=1 / ?shot= hooks.
 * No game logic here (see game.js). */
'use strict';
(function () {
  var W = 500, H = 1000, CELL = 48, BX = 10, BY = 20; // board 480x960 inside
  var canvas = document.getElementById("cv");
  var ctx = canvas.getContext("2d");
  var dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = W * dpr; canvas.height = H * dpr;

  var L = {
    en: {
      title: "NEON STACK", sub: "Falling blocks, neon nights",
      marathon: "MARATHON", sprint: "SPRINT 40", daily: "DAILY",
      play: "▶ PLAY", again: "↻ PLAY AGAIN", resume: "▶ RESUME", paused: "PAUSED",
      over: "GAME OVER", finish: "40 LINES CLEARED!", newBest: "★ NEW BEST ★",
      best: "Best", bestTime: "Best time", time: "Time", left: "Left",
      score: "SCORE", lines: "LINES", level: "LV",
      hint: "Swipe ← → to move · tap to rotate · swipe down to drop",
      kb: "Arrows move · Z/X rotate · Space drop · P pause"
    },
    zh: {
      title: "霓虹落块", sub: "霓虹之夜 · 经典落块",
      marathon: "马拉松", sprint: "冲刺40行", daily: "每日挑战",
      play: "▶ 开始", again: "↻ 再来一局", resume: "▶ 继续", paused: "已暂停",
      over: "游戏结束", finish: "40 行冲刺完成！", newBest: "★ 新纪录 ★",
      best: "最佳", bestTime: "最快用时", time: "用时", left: "剩余",
      score: "得分", lines: "行数", level: "等级",
      hint: "左右滑移动 · 点按旋转 · 下滑速降",
      kb: "方向键移动 · Z/X 旋转 · 空格速降 · P 暂停"
    }
  };
  function T(k) { return npT(L, k); }

  // ---------- render ----------
  var shake = 0, pulse = 0;
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = "#0a0a18"; ctx.fillRect(0, 0, W, H);
    var sx = 0, sy = 0;
    if (shake > 0) { sx = (Math.random() - 0.5) * shake; sy = (Math.random() - 0.5) * shake; }
    ctx.save(); ctx.translate(sx, sy);

    ctx.strokeStyle = "rgba(255,255,255,0.04)"; ctx.lineWidth = 1;
    for (var gx = 0; gx <= STACK.COLS; gx++) {
      ctx.beginPath(); ctx.moveTo(BX + gx * CELL, BY); ctx.lineTo(BX + gx * CELL, BY + 20 * CELL); ctx.stroke();
    }
    for (var gy = 0; gy <= 20; gy++) {
      ctx.beginPath(); ctx.moveTo(BX, BY + gy * CELL); ctx.lineTo(BX + 10 * CELL, BY + gy * CELL); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(0,229,255,0.25)"; ctx.lineWidth = 6;
    ctx.strokeRect(BX - 3, BY - 3, 10 * CELL + 6, 20 * CELL + 6);
    ctx.strokeStyle = "#00e5ff"; ctx.lineWidth = 2;
    ctx.strokeRect(BX - 3, BY - 3, 10 * CELL + 6, 20 * CELL + 6);

    var st = STACK.st();
    for (var y = 0; y < STACK.ROWS; y++) {
      var clearing = st.state === "CLEARING" && st.clearRows.indexOf(y) >= 0;
      for (var x = 0; x < STACK.COLS; x++) {
        var t = st.board[y][x];
        if (!t) continue;
        drawCell(BX + x * CELL, BY + y * CELL, STACK.COLORS[t],
          clearing ? 0.35 + 0.65 * Math.abs(Math.sin(st.clearT * 40)) : 1);
      }
    }
    if (st.piece && (st.state === "PLAY" || st.state === "PAUSE")) {
      var drop = 0;
      while (ghostValid(st.piece, drop + 1)) drop++;
      var offs = STACK.SHAPES[st.piece.type][st.piece.rot];
      ctx.lineWidth = 2; ctx.strokeStyle = "rgba(255,255,255,0.22)";
      for (var i = 0; i < offs.length; i++) {
        ctx.strokeRect(BX + (st.piece.x + offs[i][0]) * CELL + 3,
                       BY + (st.piece.y + drop + offs[i][1]) * CELL + 3, CELL - 6, CELL - 6);
      }
      for (var j = 0; j < offs.length; j++) {
        drawCell(BX + (st.piece.x + offs[j][0]) * CELL, BY + (st.piece.y + offs[j][1]) * CELL,
          STACK.COLORS[st.piece.type], 1);
      }
    }
    var ps = STACK.parts();
    if (ps.length) {
      ctx.globalCompositeOperation = "lighter";
      for (var p = 0; p < ps.length; p++) {
        var q = ps[p];
        ctx.globalAlpha = Math.max(0, q.life / q.max);
        ctx.fillStyle = q.color;
        ctx.beginPath(); ctx.arc(BX + q.x, BY + q.y, q.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
    }
    if (pulse > 0) {
      ctx.fillStyle = "rgba(255,255,255," + (pulse * 0.35).toFixed(3) + ")";
      ctx.fillRect(0, 0, W, H);
    }
    ctx.restore();
  }
  function ghostValid(piece, rows) {
    var offs = STACK.SHAPES[piece.type][piece.rot];
    for (var i = 0; i < offs.length; i++) {
      var x = piece.x + offs[i][0], y = piece.y + rows + offs[i][1];
      if (x < 0 || x >= STACK.COLS || y >= STACK.ROWS) return false;
      if (y >= 0 && STACK.st().board[y][x]) return false;
    }
    return true;
  }
  function drawCell(px, py, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
    ctx.fillStyle = "rgba(255,255,255,0.28)";
    ctx.fillRect(px + 2, py + 2, CELL - 4, 8);
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 2; ctx.strokeRect(px + 3, py + 3, CELL - 6, CELL - 6);
    ctx.globalAlpha = 1;
  }

  var ncv = document.getElementById("next"); var nctx = ncv.getContext("2d");
  function drawNext() {
    nctx.clearRect(0, 0, ncv.width, ncv.height);
    var t = STACK.st().next; if (!t) return;
    var offs = STACK.SHAPES[t][0], cs = 18;
    var minx = 9, maxx = -9, miny = 9, maxy = -9;
    for (var i = 0; i < offs.length; i++) {
      minx = Math.min(minx, offs[i][0]); maxx = Math.max(maxx, offs[i][0]);
      miny = Math.min(miny, offs[i][1]); maxy = Math.max(maxy, offs[i][1]);
    }
    var ox = (ncv.width - (maxx - minx + 1) * cs) / 2 - minx * cs;
    var oy = (ncv.height - (maxy - miny + 1) * cs) / 2 - miny * cs;
    for (var j = 0; j < offs.length; j++) {
      nctx.fillStyle = STACK.COLORS[t];
      nctx.fillRect(ox + offs[j][0] * cs + 1, oy + offs[j][1] * cs + 1, cs - 2, cs - 2);
      nctx.strokeStyle = "rgba(255,255,255,0.5)";
      nctx.strokeRect(ox + offs[j][0] * cs + 1, oy + offs[j][1] * cs + 1, cs - 2, cs - 2);
    }
  }

  // ---------- HUD / panels ----------
  function fmt(ms) {
    var s = Math.floor(ms / 1000);
    return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2);
  }
  function bestOf(mode) {
    try {
      if (mode === "marathon") return localStorage.getItem("np_stack_best_marathon") || "0";
      if (mode === "sprint") return localStorage.getItem("np_stack_best_sprint") || "";
      var d = STACK.utcDateStr();
      return localStorage.getItem("np_stack_best_daily_" + d) || "";
    } catch (e) { return mode === "marathon" ? "0" : ""; }
  }
  var panel = document.getElementById("panel"), panelBox = document.getElementById("panelBox");
  function hud() {
    var st = STACK.st();
    document.getElementById("v-score").textContent = st.score;
    document.getElementById("v-lines").textContent = st.lines;
    if (st.mode === "marathon") {
      document.getElementById("lb-level").textContent = T("level");
      document.getElementById("v-level").textContent = st.level;
      document.getElementById("v-left").textContent = "";
    } else {
      document.getElementById("lb-level").textContent = T("time");
      document.getElementById("v-level").textContent = fmt(st.elapsed);
      document.getElementById("v-left").textContent = T("left") + " " + Math.max(0, 40 - st.lines);
    }
    drawNext();
  }
  function showPanel(mode) {
    var st = STACK.st();
    var h = "";
    if (mode === "title") {
      var b0 = bestOf(st.mode);
      h = '<h1>' + T("title") + '</h1><p class="sub">' + T("sub") + '</p>' +
          '<div class="bests">' + T("best") + ': ' + (b0 === "0" || b0 === "" ? "—" : b0) + '</div>' +
          '<button id="pPlay" class="primary">' + T("play") + '</button>' +
          '<p class="kbhint">' + T("kb") + '</p>';
    } else if (mode === "pause") {
      h = '<h2>' + T("paused") + '</h2><button id="pResume" class="primary">' + T("resume") + '</button>';
    } else if (mode === "over") {
      var best = parseInt(bestOf(st.mode) || "0", 10) || 0;
      var isBest = st.mode === "marathon" && st.score >= best && st.score > 0;
      h = '<h2>' + T("over") + '</h2>' +
          '<div class="bigscore">' + st.score + '</div>' +
          (isBest ? '<div class="newbest">' + T("newBest") + '</div>' : '') +
          '<button id="pAgain" class="primary">' + T("again") + '</button>';
    } else if (mode === "finish") {
      var bt = bestOf(st.mode);
      var isBT = bt && parseInt(bt, 10) >= st.elapsed;
      h = '<h2>' + T("finish") + '</h2>' +
          '<div class="bigscore">' + fmt(st.elapsed) + '</div>' +
          (isBT ? '<div class="newbest">' + T("newBest") + '</div>' : '') +
          '<div class="bests">' + T("bestTime") + ': ' + (bt ? fmt(parseInt(bt, 10)) : fmt(st.elapsed)) + '</div>' +
          '<button id="pAgain" class="primary">' + T("again") + '</button>';
    }
    panelBox.innerHTML = h;
    panel.classList.remove("hide");
    var b = document.getElementById("pPlay");
    if (b) b.addEventListener("click", function () { begin(STACK.st().mode); });
    b = document.getElementById("pResume");
    if (b) b.addEventListener("click", function () { Sound.resume(); Sound.sfx("ui"); STACK.resume(); panel.classList.add("hide"); });
    b = document.getElementById("pAgain");
    if (b) b.addEventListener("click", function () { begin(STACK.st().mode); });
  }
  function begin(mode) {
    Sound.resume(); Sound.sfx("ui");
    STACK.start(mode);
    panel.classList.add("hide");
    syncTabs(); hud();
  }
  function syncTabs() {
    var m = STACK.st().mode;
    ["marathon", "sprint", "daily"].forEach(function (k) {
      var el = document.getElementById("tab-" + k);
      el.classList.toggle("on", m === k);
      el.textContent = T(k);
    });
  }

  // ---------- events -> feedback (drained every frame) ----------
  var HANDLERS = {
    move: function () { Sound.sfx("move"); },
    rotate: function () { Sound.sfx("rotate"); },
    lock: function () { Sound.sfx("lock"); },
    harddrop: function (d) { Sound.sfx("harddrop"); shake = 8 + Math.min(6, d.rows); },
    clear: function (d) {
      Sound.sfx("clear", d);
      for (var r = 0; r < d.ys.length; r++)
        for (var x = 0; x < STACK.COLS; x++)
          STACK.burst(x * CELL + 24, d.ys[r] * CELL + 24, "#ffffff", 3, 320);
      if (d.rows >= 4) { pulse = 1; shake = 12; }
    },
    finish: function () { Sound.sfx("finish"); showPanel("finish"); },
    over: function () { Sound.sfx("over"); showPanel("over"); },
    start: function () { shake = 0; pulse = 0; lastLevel = 1; }
  };
  var lastLevel = 1;
  function pump() {
    STACK.drainEvents(HANDLERS);
    var st = STACK.st();
    if (st.level > lastLevel && st.state === "PLAY") { Sound.sfx("levelup"); pulse = 0.8; }
    lastLevel = st.level;
  }

  // ---------- input: keyboard ----------
  var das = { dir: 0, timer: 0, phase: 0 };
  document.addEventListener("keydown", function (e) {
    var st = STACK.st();
    if (e.repeat) return;
    var k = e.key;
    if (k === "p" || k === "P") {
      if (st.state === "PAUSE") { STACK.resume(); panel.classList.add("hide"); }
      else if (st.state === "PLAY" || st.state === "CLEARING") { STACK.pause(); showPanel("pause"); }
      return;
    }
    if (k === "m" || k === "M") { toggleMute(); return; }
    if (st.state === "TITLE" || st.state === "OVER" || st.state === "FINISH") {
      if (k === "Enter" || k === " ") { e.preventDefault(); begin(st.mode); }
      return;
    }
    if (st.state === "PAUSE") { if (k === "Enter") { STACK.resume(); panel.classList.add("hide"); } return; }
    if (k === "ArrowLeft") { e.preventDefault(); Sound.resume(); STACK.move(-1); das.dir = -1; das.timer = 0; das.phase = 0; }
    else if (k === "ArrowRight") { e.preventDefault(); Sound.resume(); STACK.move(1); das.dir = 1; das.timer = 0; das.phase = 0; }
    else if (k === "ArrowDown") { e.preventDefault(); STACK.setSoft(true); }
    else if (k === "ArrowUp" || k === "x" || k === "X") { e.preventDefault(); Sound.resume(); STACK.rotate(1); }
    else if (k === "z" || k === "Z") { e.preventDefault(); Sound.resume(); STACK.rotate(-1); }
    else if (k === " ") { e.preventDefault(); Sound.resume(); STACK.hardDrop(); hud(); }
  });
  document.addEventListener("keyup", function (e) {
    if (e.key === "ArrowDown") STACK.setSoft(false);
    if (e.key === "ArrowLeft" && das.dir === -1) das.dir = 0;
    if (e.key === "ArrowRight" && das.dir === 1) das.dir = 0;
  });

  // ---------- input: touch gestures ----------
  var g = null;
  var wrap = document.getElementById("stage");
  wrap.addEventListener("pointerdown", function (e) {
    if (e.cancelable) e.preventDefault();
    Sound.resume();
    var st = STACK.st();
    if (st.state !== "PLAY") return;
    g = { x0: e.clientX, y0: e.clientY, lastX: e.clientX, lastY: e.clientY,
          t0: performance.now(), moved: false, hard: false };
  }, { passive: false });
  wrap.addEventListener("pointermove", function (e) {
    if (!g || g.hard) return;
    var rect = canvas.getBoundingClientRect();
    var cellPx = (CELL * 0.9) * rect.width / W;   // finger travel per cell (client px)
    var want = Math.round((e.clientX - g.x0) / cellPx);
    var have = Math.round((g.lastX - g.x0) / cellPx);
    if (want !== have) {
      for (var i = 0; i < Math.abs(want - have); i++) STACK.move(want > have ? 1 : -1);
      g.moved = true;
    }
    var dt = performance.now() - g.t0;
    var vwant = Math.round((e.clientY - g.y0) / (cellPx * 0.9));
    var vhave = Math.round((g.lastY - g.y0) / (cellPx * 0.9));
    if (vwant - vhave >= 3 && dt < 230) {          // fast downward flick -> hard drop
      STACK.hardDrop(); g.hard = true; g.moved = true; hud();
      return;
    }
    for (var v = 0; v < Math.max(0, vwant - vhave); v++) STACK.softDrop();
    if (vwant !== vhave) g.moved = true;
    g.lastX = e.clientX; g.lastY = e.clientY;
  }, { passive: false });
  function endGesture(e) {
    if (!g) return;
    var gg = g; g = null;
    var st = STACK.st();
    if (st.state !== "PLAY") return;
    var dt = performance.now() - gg.t0;
    var dist = Math.hypot(e.clientX - gg.x0, e.clientY - gg.y0);
    if (!gg.moved && dist < 12 && dt < 300) { STACK.rotate(1); }
    hud();
  }
  wrap.addEventListener("pointerup", endGesture, { passive: true });
  wrap.addEventListener("pointercancel", function () { g = null; }, { passive: true });

  // ---------- mute / tabs / buttons ----------
  function toggleMute() {
    var m = Sound.toggleMute();
    document.getElementById("muteBtn").textContent = m ? "🔇" : "🔊";
  }
  document.getElementById("muteBtn").addEventListener("click", toggleMute);
  document.getElementById("pauseBtn").addEventListener("click", function () {
    var st = STACK.st();
    if (st.state === "PAUSE") { STACK.resume(); panel.classList.add("hide"); }
    else if (st.state === "PLAY" || st.state === "CLEARING") { STACK.pause(); showPanel("pause"); }
  });
  ["marathon", "sprint", "daily"].forEach(function (k) {
    document.getElementById("tab-" + k).addEventListener("click", function () {
      Sound.sfx("ui");
      STACK.start(k);
      panel.classList.add("hide");
      syncTabs(); hud();
    });
  });
  document.getElementById("muteBtn").textContent = Sound.isMuted() ? "🔇" : "🔊";
  document.getElementById("lb-score").textContent = T("score");
  document.getElementById("lb-lines").textContent = T("lines");
  document.getElementById("hint").textContent = T("hint");

  // ---------- main loop ----------
  var lastT = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = Math.min(0.033, (now - lastT) / 1000);
    lastT = now;
    if (!window.__qaFreeze) {
      var st = STACK.st();
      if (st.state === "PLAY" || st.state === "CLEARING") {
        if (das.dir) {
          das.timer += dt;
          var delay = das.phase === 0 ? 0.15 : 0.045;
          while (das.timer >= delay) { das.timer -= delay; das.phase = 1; STACK.move(das.dir); }
        }
        STACK.tick(dt);
      }
      STACK.stepParts(dt);
      if (shake > 0) shake = Math.max(0, shake - dt * 40);
      if (pulse > 0) pulse = Math.max(0, pulse - dt * 2.2);
      pump();
      hud();
    }
    render();
  }

  // ---------- ?autotest=1 deterministic self-check ----------
  function autotest() {
    window.__qaFreeze = true;
    var R = {};
    function chk(name, ok, detail) { R[name] = ok === true ? true : (detail || false); }
    try {
      var EMPTY = [];
      for (var e = 0; e < STACK.ROWS; e++) EMPTY.push([]);

      // 1) 7-bag coverage: 70 pieces across 10 seeded bags -> 10 of each type
      var counts = {}, total = 0;
      STACK.start("daily", 42);
      for (var i = 0; i < 70 && STACK.st().state === "PLAY"; i++) {
        var t = STACK.st().next;
        counts[t] = (counts[t] || 0) + 1; total++;
        STACK.inject(EMPTY);
        STACK.st().piece = { type: "O", rot: 0, x: 3, y: 0 };
        STACK.hardDrop(); STACK.tick(0.26);
      }
      chk("bagCoverage", total === 70 && Object.keys(counts).length === 7 &&
        counts.I === 10 && counts.O === 10 && counts.T === 10, JSON.stringify(counts) + " n=" + total);

      // 2) daily seed determinism (same seed same stream, different seed differs)
      function pieceStream(seed) {
        STACK.start("daily", seed);
        var out = [];
        for (var n = 0; n < 20 && STACK.st().state === "PLAY"; n++) {
          out.push(STACK.st().next);
          STACK.inject(EMPTY);
          STACK.st().piece = { type: "O", rot: 0, x: 3, y: STACK.st().board[19][5] ? 0 : 0 };
          STACK.hardDrop(); STACK.tick(0.26);
        }
        return out.join("");
      }
      chk("seedDeterminism", pieceStream(777) === pieceStream(777));
      chk("seedVariation", pieceStream(777) !== pieceStream(778));

      // 3) piece never leaves bounds under seeded random inputs
      STACK.start("marathon", 9);
      var rng = STACK.mulberry32(9), okBounds = true;
      for (var m = 0; m < 240 && STACK.st().state === "PLAY"; m++) {
        var r = rng();
        if (r < 0.35) STACK.move(rng() < 0.5 ? -1 : 1);
        else if (r < 0.6) STACK.rotate(rng() < 0.5 ? 1 : -1);
        else if (r < 0.9) STACK.softDrop();
        else STACK.hardDrop();
        STACK.tick(0.016);
        var pc = STACK.st().piece;
        if (pc) {
          var offs = STACK.SHAPES[pc.type][pc.rot];
          for (var c = 0; c < offs.length; c++) {
            if (pc.x + offs[c][0] < 0 || pc.x + offs[c][0] >= STACK.COLS ||
                pc.y + offs[c][1] >= STACK.ROWS) okBounds = false;
          }
        }
      }
      chk("bounds", okBounds);

      // 4) exact line-clear scoring (1/2/3/4 rows = 100/300/500/800, +32 hard-drop)
      function clearScoreTest(nRows) {
        STACK.start("marathon", 5);
        var rows = [];
        for (var r2 = 0; r2 < nRows; r2++) {
          var spec = new Array(STACK.COLS).fill("J"); spec[9] = 0; rows.push(spec);
        }
        STACK.inject(rows);
        var before = STACK.st().score;
        STACK.st().piece = { type: "I", rot: 1, x: 7, y: 0 };  // vertical I in col 9
        STACK.hardDrop(); STACK.tick(0.3);
        return STACK.st().score - before;
      }
      var s1 = clearScoreTest(1), s2 = clearScoreTest(2), s3 = clearScoreTest(3), s4 = clearScoreTest(4);
      chk("score1", s1 === 132, String(s1));
      chk("score2", s2 === 332, String(s2));
      chk("score3", s3 === 532, String(s3));
      chk("score4", s4 === 832, String(s4));
      chk("levelCurve", STACK.gravitySecs(2) < STACK.gravitySecs(1) && STACK.gravitySecs(1) === 1);

      // 5) sprint 40 finish panel + best-time persistence
      STACK.start("sprint", 5);
      var guard = 0;
      while (STACK.st().state !== "FINISH" && guard++ < 40) {
        var left2 = 40 - STACK.st().lines;
        var n2 = Math.min(4, left2);
        var rows2 = [];
        for (var r3 = 0; r3 < n2; r3++) {
          var spec2 = new Array(STACK.COLS).fill("J"); spec2[9] = 0; rows2.push(spec2);
        }
        STACK.inject(rows2);
        STACK.st().piece = { type: "I", rot: 1, x: 7, y: 0 };
        STACK.hardDrop(); STACK.tick(0.3);
      }
      chk("sprintFinish", STACK.st().state === "FINISH" && STACK.st().lines === 40,
        "state=" + STACK.st().state + " lines=" + STACK.st().lines);

      // 6) top-out -> OVER (spawn collides with blocks parked over cols 3-6)
      STACK.start("marathon", 5);
      var rowsT = [];
      var cap = new Array(STACK.COLS).fill(0); cap[3] = "T"; cap[4] = "T"; cap[5] = "T"; cap[6] = "T";
      for (var r4 = 0; r4 < STACK.ROWS; r4++) rowsT.push(r4 >= 18 ? cap.slice() : []);
      STACK.inject(rowsT);
      STACK.st().piece = { type: "O", rot: 0, x: 0, y: 10 };
      STACK.hardDrop();
      chk("topOut", STACK.st().state === "OVER", "state=" + STACK.st().state);

      // 7) persistence keys written
      var keys = [];
      for (var li = 0; li < localStorage.length; li++) keys.push(localStorage.key(li));
      chk("persistence", keys.indexOf("np_stack_best_marathon") >= 0 && keys.indexOf("np_stack_best_sprint") >= 0);
    } catch (ex) {
      chk("exception", false, String(ex && ex.message || ex));
    }
    R.allPass = Object.keys(R).every(function (k) { return k === "allPass" || R[k] === true; });
    window.__autotest = R;
    window.__qaFreeze = false;
    return R;
  }

  // ---------- ?shot= staged screenshot ----------
  function shot() {
    var q = new URLSearchParams(location.search);
    var kind = q.get("shot") || "title";
    var seed = parseInt(q.get("seed") || "42", 10);
    var t = parseFloat(q.get("t") || "0");
    var mode = q.get("mode") || "daily";
    window.__qaFreeze = true;
    STACK.start(mode, seed);
    if (kind === "play" || kind === "over") {
      var steps = Math.round(t * 60);
      for (var i = 0; i < steps; i++) {
        STACK.tick(1 / 60); STACK.stepParts(1 / 60); pump();
        if (STACK.st().state === "OVER") break;
      }
      if (kind === "over" && STACK.st().state !== "OVER") {
        var rowsT2 = [];
        var cap2 = new Array(STACK.COLS).fill(0); cap2[3] = "T"; cap2[4] = "T"; cap2[5] = "T"; cap2[6] = "T";
        for (var r = 0; r < STACK.ROWS; r++) rowsT2.push(r >= 18 ? cap2.slice() : []);
        STACK.inject(rowsT2);
        STACK.st().piece = { type: "O", rot: 0, x: 0, y: 10 };
        STACK.hardDrop(); pump();
      }
      panel.classList.add("hide");
    } else {
      showPanel("title");
    }
    hud(); render();
  }

  // ---------- boot ----------
  var q = new URLSearchParams(location.search);
  STACK.start("daily");
  syncTabs(); hud(); showPanel("title");
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "hidden") {
      if (STACK.st().state === "PLAY" || STACK.st().state === "CLEARING") { STACK.pause(); showPanel("pause"); }
    } else { lastT = performance.now(); render(); }
  });
  window.addEventListener("resize", render);
  if (q.get("autotest") === "1") { setTimeout(function () { autotest(); render(); }, 50); }
  else if (q.get("shot")) { shot(); }
  requestAnimationFrame(frame);
})();
