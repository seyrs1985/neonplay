/* Neon Stack — core: state machine, 7-bag randomizer, SRS-lite rotation
 * with wall kicks, lock delay, classic scoring, line clears, particles.
 * No DOM / rAF / input here (main.js drives it; qa scripts step it). */
'use strict';
(function () {
  var COLS = 10, ROWS = 20;
  var TYPES = ["I", "O", "T", "S", "Z", "J", "L"];
  var COLORS = {
    I: "#00e5ff", O: "#ffd54a", T: "#7c4dff",
    S: "#22ff88", Z: "#ff2d95", J: "#ff9f1a", L: "#dff3ff"
  };
  // per-type rotation states as [x,y] offsets; I in a 4-box, rest in a 3-box
  var SHAPES = {
    I: [[[0,1],[1,1],[2,1],[3,1]], [[2,0],[2,1],[2,2],[2,3]],
        [[0,2],[1,2],[2,2],[3,2]], [[1,0],[1,1],[1,2],[1,3]]],
    O: [[[1,0],[2,0],[1,1],[2,1]]],
    T: [[[1,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[2,1],[1,2]],
        [[0,1],[1,1],[2,1],[1,2]], [[1,0],[0,1],[1,1],[1,2]]],
    S: [[[1,0],[2,0],[0,1],[1,1]], [[1,0],[1,1],[2,1],[2,2]],
        [[1,1],[2,1],[0,2],[1,2]], [[0,0],[0,1],[1,1],[1,2]]],
    Z: [[[0,0],[1,0],[1,1],[2,1]], [[2,0],[1,1],[2,1],[1,2]],
        [[0,1],[1,1],[1,2],[2,2]], [[1,0],[0,1],[1,1],[0,2]]],
    J: [[[0,0],[0,1],[1,1],[2,1]], [[1,0],[2,0],[1,1],[1,2]],
        [[0,1],[1,1],[2,1],[2,2]], [[1,0],[1,1],[0,2],[1,2]]],
    L: [[[2,0],[0,1],[1,1],[2,1]], [[1,0],[1,1],[1,2],[2,2]],
        [[0,1],[1,1],[2,1],[0,2]], [[0,0],[1,0],[1,1],[1,2]]]
  };
  // SRS-lite kicks: horizontal bias + a single up nudge (design contract)
  var KICKS = [[0,0],[-1,0],[1,0],[0,-1],[-2,0],[2,0]];
  var LINE_SCORES = {1:100, 2:300, 3:500, 4:800};
  var LOCK_DELAY = 0.5, LOCK_RESETS = 15;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dateSeed(dateStr) {         // UTC YYYY-MM-DD -> uint32
    var h = 2166136261;
    for (var i = 0; i < dateStr.length; i++) {
      h ^= dateStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function utcDateStr(offsetDays) {
    return new Date(Date.now() + (offsetDays || 0) * 86400000)
      .toISOString().slice(0, 10);
  }
  // guideline gravity: seconds per row at level (classic curve)
  function gravitySecs(level) {
    var l = Math.max(1, level | 0);
    return Math.max(0.02, Math.pow(0.8 - (l - 1) * 0.007, l - 1));
  }

  var st = null;
  function freshState() {
    return {
      state: "TITLE",          // TITLE|PLAY|CLEARING|PAUSE|OVER|FINISH
      mode: "marathon",        // marathon|sprint|daily
      board: [], piece: null, next: null, bag: [],
      rng: Math.random,
      score: 0, lines: 0, level: 1, elapsed: 0,
      dropT: 0, lockT: 0, grounded: false, lockResets: 0,
      clearRows: [], clearT: 0, softDropping: false,
      dateStr: null, dailyDate: null,
      events: []               // sfx hook: main.js drains each frame
    };
  }
  function emit(name, data) { st.events.push({ name: name, data: data || null }); }

  function emptyBoard() {
    var b = [];
    for (var y = 0; y < ROWS; y++) b.push(new Array(COLS).fill(0));
    return b;
  }
  function refillBag() {
    var bag = TYPES.slice();
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(st.rng() * (i + 1));
      var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
    }
    st.bag = st.bag.concat(bag);
  }
  function pullNext() {
    while (st.bag.length < 2) refillBag();
    return st.bag.shift();
  }
  function cells(piece, dx, dy, rot) {
    var r = (rot === undefined ? piece.rot : rot);
    var offs = SHAPES[piece.type][r % SHAPES[piece.type].length];
    var out = [];
    for (var i = 0; i < offs.length; i++) {
      out.push([piece.x + (dx || 0) + offs[i][0], piece.y + (dy || 0) + offs[i][1]]);
    }
    return out;
  }
  function valid(piece, dx, dy, rot) {
    var cs = cells(piece, dx, dy, rot);
    for (var i = 0; i < cs.length; i++) {
      var x = cs[i][0], y = cs[i][1];
      if (x < 0 || x >= COLS || y >= ROWS) return false;
      if (y >= 0 && st.board[y][x]) return false;
    }
    return true;
  }
  function grounded() { return st.piece ? !valid(st.piece, 0, 1) : false; }
  function resetLock() {
    if (st.grounded && st.lockResets < LOCK_RESETS) { st.lockT = 0; st.lockResets++; }
  }
  function move(dx) {
    if (st.state !== "PLAY" || !st.piece) return false;
    if (valid(st.piece, dx, 0)) { st.piece.x += dx; resetLock(); return true; }
    return false;
  }
  function rotate(dir) {                 // dir: 1 cw, -1 ccw
    if (st.state !== "PLAY" || !st.piece) return false;
    var nrot = (st.piece.rot + (dir || 1) + 4) % 4;
    var lim = SHAPES[st.piece.type].length;
    if (lim === 1) return false;         // O never rotates
    for (var k = 0; k < KICKS.length; k++) {
      if (valid(st.piece, KICKS[k][0], KICKS[k][1], nrot)) {
        st.piece.x += KICKS[k][0]; st.piece.y += KICKS[k][1];
        st.piece.rot = nrot % lim; resetLock();
        emit("rotate");
        return true;
      }
    }
    return false;
  }
  function softDrop() {
    if (st.state !== "PLAY" || !st.piece) return false;
    if (valid(st.piece, 0, 1)) {
      st.piece.y++; st.score += 1; st.dropT = 0; st.grounded = false;
      return true;
    }
    return false;
  }
  function hardDrop() {
    if (st.state !== "PLAY" || !st.piece) return 0;
    var n = 0;
    while (valid(st.piece, 0, 1)) { st.piece.y++; n++; }
    st.score += n * 2;
    emit("harddrop", { cells: cells(st.piece), rows: n });
    lock();
    return n;
  }
  function lock() {
    var cs = cells(st.piece), topOut = false;
    for (var i = 0; i < cs.length; i++) {
      var x = cs[i][0], y = cs[i][1];
      if (y < 0) { topOut = true; continue; }
      st.board[y][x] = st.piece.type;
    }
    emit("lock", { cells: cs });
    st.piece = null;
    if (topOut) { gameOver(); return; }
    var full = [];
    for (var y = 0; y < ROWS; y++) {
      var okRow = true;
      for (var x = 0; x < COLS; x++) if (!st.board[y][x]) { okRow = false; break; }
      if (okRow) full.push(y);
    }
    if (full.length) {
      st.clearRows = full; st.clearT = 0; st.state = "CLEARING";
      emit("clear", { rows: full.length, ys: full });
    } else {
      spawn();
    }
  }
  function finishClear() {
    var n = st.clearRows.length;
    for (var i = 0; i < n; i++) {
      st.board.splice(st.clearRows[i], 1);
      st.board.unshift(new Array(COLS).fill(0));
    }
    st.score += LINE_SCORES[n] * st.level;
    st.lines += n;
    if (st.mode === "marathon") st.level = 1 + Math.floor(st.lines / 10);
    st.clearRows = [];
    if (st.mode === "sprint" && st.lines >= 40) { finishSprint(); return; }
    st.state = "PLAY";
    spawn();
  }
  function spawn() {
    if (st.state === "OVER" || st.state === "FINISH") return;
    st.piece = { type: st.next, rot: 0, x: 3, y: 0 };
    st.next = pullNext();
    st.dropT = 0; st.lockT = 0; st.grounded = false; st.lockResets = 0;
    if (!valid(st.piece, 0, 0)) gameOver();
  }
  function gameOver() {
    st.state = "OVER";
    st.piece = null;
    emit("over");
    recordBest();
  }
  function finishSprint() {
    st.state = "FINISH";
    st.piece = null;
    emit("finish");
    recordBest();
  }
  function bestKey() {
    if (st.mode === "marathon") return "np_stack_best_marathon";
    if (st.mode === "sprint") return "np_stack_best_sprint";
    return "np_stack_best_daily_" + st.dateStr;
  }
  function recordBest() {
    try {
      if (st.mode === "marathon") {
        var b = parseInt(localStorage.getItem("np_stack_best_marathon") || "0", 10) || 0;
        if (st.score > b) localStorage.setItem("np_stack_best_marathon", String(st.score));
      } else {
        var t = parseInt(localStorage.getItem(bestKey()) || "0", 10) || 0;
        if (!t || st.elapsed < t) localStorage.setItem(bestKey(), String(st.elapsed));
      }
    } catch (e) {}
  }
  function gravity() {
    return st.mode === "marathon" ? gravitySecs(st.level) : 0.8;
  }

  function start(mode, seed) {
    st = freshState();
    st.mode = mode;
    if (mode === "daily") {
      st.dateStr = utcDateStr();
      st.dailyDate = st.dateStr;
      st.rng = mulberry32(seed === undefined ? dateSeed(st.dateStr) : seed >>> 0);
    } else if (typeof seed === "number") {
      st.rng = mulberry32(seed >>> 0);
    }
    st.board = emptyBoard();
    st.bag = [];
    st.next = pullNext();
    spawn();
    st.state = "PLAY";
    st.elapsed = 0;
    emit("start");
  }
  // advance simulation dt seconds (physics only; timers included)
  function tick(dt) {
    if (st.state === "CLEARING") {
      st.clearT += dt;
      if (st.clearT >= 0.25) finishClear();
      return;
    }
    if (st.state !== "PLAY" || !st.piece) return;
    st.elapsed += dt * 1000;
    st.grounded = !valid(st.piece, 0, 1);   // re-evaluate: sliding off a ledge resumes falling
    if (!st.grounded) st.lockT = 0;
    var g = st.softDropping ? Math.min(gravity(), 0.05) : gravity();
    st.dropT += dt;
    if (st.grounded) {
      st.lockT += dt;
      if (st.lockT >= LOCK_DELAY) { lock(); return; }
    }
    while (st.dropT >= g && st.state === "PLAY") {
      st.dropT -= g;
      if (valid(st.piece, 0, 1)) {
        st.piece.y++;
        if (st.softDropping) st.score += 1;
      } else {
        st.dropT = 0;
        break;
      }
    }
  }
  function pause() { if (st.state === "PLAY" || st.state === "CLEARING") { st._prePause = st.state; st.state = "PAUSE"; } }
  function resume() { if (st.state === "PAUSE") st.state = st._prePause || "PLAY"; }
  function inject(rows, types) {         // qa helper: fill board rows (bottom-up list)
    for (var i = 0; i < rows.length; i++) {
      var y = ROWS - 1 - i;
      var spec = rows[i];
      for (var x = 0; x < COLS; x++) st.board[y][x] = spec[x] || 0;
    }
  }

  // -------- particles (owned by core; drawn by renderer) --------
  var parts = [];
  function burst(x, y, color, n, spd) {
    for (var i = 0; i < n && parts.length < 260; i++) {
      var a = Math.random() * Math.PI * 2, v = (0.3 + Math.random() * 0.7) * (spd || 260);
      parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 60,
                   life: 0.5 + Math.random() * 0.4, max: 0.9, color: color, r: 2 + Math.random() * 3 });
    }
  }
  function stepParts(dt) {
    for (var i = parts.length - 1; i >= 0; i--) {
      var p = parts[i];
      p.life -= dt;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 500 * dt;
    }
  }
  function drainEvents(handlers) {
    for (var i = 0; i < st.events.length; i++) {
      var e = st.events[i];
      if (handlers[e.name]) handlers[e.name](e.data);
      if (e.name === "clear") {
        for (var r = 0; r < e.data.ys.length; r++)
          for (var x = 0; x < COLS; x++)
            burst(x * 48 + 24, e.data.ys[r] * 48 + 24, "#ffffff", 3, 320);
      }
    }
    st.events.length = 0;
  }

  function snapshot() {
    return {
      state: st.state, mode: st.mode,
      board: st.board.map(function (r) { return r.slice(); }),
      piece: st.piece ? { type: st.piece.type, x: st.piece.x, y: st.piece.y, rot: st.piece.rot } : null,
      next: st.next, lines: st.lines, level: st.level, score: st.score,
      elapsed: Math.round(st.elapsed), date: st.dateStr,
      sprintLeft: Math.max(0, 40 - st.lines)
    };
  }

  var API = {
    COLS: COLS, ROWS: ROWS, TYPES: TYPES, COLORS: COLORS, SHAPES: SHAPES,
    LINE_SCORES: LINE_SCORES, gravitySecs: gravitySecs, mulberry32: mulberry32,
    dateSeed: dateSeed, utcDateStr: utcDateStr,
    start: start, tick: tick, pause: pause, resume: resume,
    move: move, rotate: rotate, softDrop: softDrop, hardDrop: hardDrop,
    inject: inject, drainEvents: drainEvents,
    burst: burst, stepParts: stepParts, parts: function () { return parts; },
    st: function () { return st; },
    setSoft: function (on) { st.softDropping = !!on; }
  };
  window.STACK = API;
  window.__qaState = snapshot;
})();
