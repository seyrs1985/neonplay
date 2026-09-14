/* Neon Link — pure core: seeded repair-construction generator + turn-limited
 * path finder (<= 2 turns, free padded border = classic Onet rule).
 * No DOM, no window: browser loads it via <script> (window.NLCore), the
 * offline self-test loads it in Node via require(). */
'use strict';
(function (root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NLCore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  var DIRS = [[0, 1], [1, 0], [0, -1], [-1, 0]];

  // deterministic RNG (same stream in browser and Node)
  function mulberry32(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // xfnv1a string hash -> uint32 (daily UTC date seed)
  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function utcDateStr(dayOffset) {
    var d = new Date(Date.now() + (dayOffset || 0) * 86400000);
    return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) +
      '-' + ('0' + d.getUTCDate()).slice(-2);
  }
  function dailySeed(dateStr) { return hashStr('neon-link|' + dateStr); }

  /* findPath — grid is a flat array (rows*cols), -1 = empty cell.
   * a and b are flat indices of the two tiles. Returns the corner list of the
   * connecting polyline in GRID coordinates (values may be -1..rows / -1..cols
   * for the free outside border ring), or null when no path with <= 2 turns.
   * Layered ray-BFS: layer L = cells reachable with exactly L turns. */
  function findPath(g, rows, cols, a, b) {
    var PR = rows + 2, PC = cols + 2;
    function occ(pr, pc) { // padded coords; border ring is never occupied
      if (pr <= 0 || pc <= 0 || pr > rows || pc > cols) return false;
      return g[(pr - 1) * cols + (pc - 1)] !== -1;
    }
    var SR = ((a / cols) | 0) + 1, SC = (a % cols) + 1;
    var TR = ((b / cols) | 0) + 1, TC = (b % cols) + 1;
    var N = PR * PC;
    var layer = new Int8Array(N); // 0..2 visited layer; -9 unvisited
    var org = new Int32Array(N); // ray origin (padded idx); -2 = start sentinel
    for (var i = 0; i < N; i++) { layer[i] = -9; org[i] = -1; }
    var S = SR * PC + SC;
    layer[S] = 0; org[S] = -2;
    var frontier = [S];
    for (var L = 0; L <= 2 && frontier.length; L++) {
      var next = [];
      for (var fi = 0; fi < frontier.length; fi++) {
        var cur = frontier[fi];
        var cr = (cur / PC) | 0, cc = cur % PC;
        for (var d = 0; d < 4; d++) {
          var nr = cr + DIRS[d][0], nc = cc + DIRS[d][1];
          while (nr >= 0 && nr < PR && nc >= 0 && nc < PC) {
            var isT = nr === TR && nc === TC;
            if (!isT && occ(nr, nc)) break;
            var idx = nr * PC + nc;
            if (layer[idx] === -9) {
              layer[idx] = L; org[idx] = cur;
              if (isT) { // reconstruct corner chain target -> start
                var pts = [];
                var node = idx;
                for (;;) {
                  pts.push([(node / PC) | 0, node % PC]);
                  if (org[node] === -2) break;
                  node = org[node];
                }
                pts.reverse();
                for (var p = 0; p < pts.length; p++) { pts[p][0]--; pts[p][1]--; }
                return pts;
              }
              next.push(idx);
            }
            if (isT) break; // target absorbs the ray
            nr += DIRS[d][0]; nc += DIRS[d][1];
          }
        }
      }
      frontier = next;
    }
    return null;
  }

  // first linkable same-face pair on the board, or null
  function findMove(g, rows, cols) {
    var byFace = {};
    for (var i = 0; i < g.length; i++) {
      if (g[i] === -1) continue;
      (byFace[g[i]] || (byFace[g[i]] = [])).push(i);
    }
    var faces = Object.keys(byFace).map(Number).sort(function (x, y) { return x - y; });
    for (var f = 0; f < faces.length; f++) {
      var cells = byFace[faces[f]];
      for (var i = 0; i < cells.length; i++)
        for (var j = i + 1; j < cells.length; j++) {
          var p = findPath(g, rows, cols, cells[i], cells[j]);
          if (p) return { a: cells[i], b: cells[j], path: p };
        }
    }
    return null;
  }

  // greedy clear simulation: repeatedly remove any linkable pair
  function simulateClear(g, rows, cols) {
    var b = g.slice(), removed = 0;
    for (;;) {
      var mv = findMove(b, rows, cols);
      if (!mv) break;
      b[mv.a] = -1; b[mv.b] = -1; removed++;
    }
    var left = 0;
    for (var i = 0; i < b.length; i++) if (b[i] !== -1) left++;
    return { cleared: left === 0, removed: removed, left: left };
  }

  /* genBoard — repair-construction (design doc, the soul of this game):
   * 1. deal face pairs from a seeded RNG, deterministic shuffle, fill grid;
   * 2. greedy-simulate: if the board can be fully cleared without shuffles
   *    it ships (measured: ~100% of boards, 0 repairs);
   * 3. repair net: swap two different-face tiles from the same RNG stream
   *    and retry, under a hard fuse so a pathological seed can never hang. */
  function genBoard(cols, rows, faceCount, seed) {
    var rng = mulberry32(seed >>> 0);
    var total = cols * rows, pairs = total / 2;
    var cells = [];
    for (var p = 0; p < pairs; p++) {
      var f = (rng() * faceCount) | 0;
      cells.push(f, f);
    }
    for (var i = cells.length - 1; i > 0; i--) {
      var j = (rng() * (i + 1)) | 0;
      var t = cells[i]; cells[i] = cells[j]; cells[j] = t;
    }
    var repairs = 0, FUSE = 2000;
    while (!simulateClear(cells, rows, cols).cleared) {
      repairs++;
      if (repairs > FUSE) throw new Error('NLCore.genBoard fuse blown (seed ' + seed + ')');
      var x = (rng() * total) | 0, y = (rng() * total) | 0;
      if (cells[x] === cells[y]) continue;
      var t2 = cells[x]; cells[x] = cells[y]; cells[y] = t2;
    }
    return { grid: cells, cols: cols, rows: rows, faces: faceCount, seed: seed >>> 0, repairs: repairs };
  }

  // runtime shuffle: permute remaining faces among remaining positions
  function shuffleFill(g, rng) {
    var idx = [], vals = [];
    for (var i = 0; i < g.length; i++) if (g[i] !== -1) { idx.push(i); vals.push(g[i]); }
    for (var i = vals.length - 1; i > 0; i--) {
      var j = (rng() * (i + 1)) | 0;
      var t = vals[i]; vals[i] = vals[j]; vals[j] = t;
    }
    for (var k = 0; k < idx.length; k++) g[idx[k]] = vals[k];
    return idx.length;
  }

  // streak bump (pure, unit-testable): consecutive-day logic + monthly protect card
  function bumpStreak(st, today) {
    st = st || { count: 0, last: '', best: 0, protect: 1, month: '' };
    if (st.last === today) return st;
    function shift(n) {
      return new Date(Date.parse(today + 'T00:00:00Z') - n * 86400000).toISOString().slice(0, 10);
    }
    if (st.last === shift(1)) st.count += 1;
    else if (st.protect > 0 && st.last === shift(2)) { st.protect -= 1; st.count += 1; }
    else st.count = 1;
    var mo = today.slice(0, 7);
    if (st.month !== mo) { st.month = mo; if (st.protect < 1) st.protect = 1; }
    st.last = today;
    if (st.count > (st.best || 0)) st.best = st.count;
    return st;
  }

  return {
    mulberry32: mulberry32, hashStr: hashStr,
    utcDateStr: utcDateStr, dailySeed: dailySeed, bumpStreak: bumpStreak,
    findPath: findPath, findMove: findMove, simulateClear: simulateClear,
    genBoard: genBoard, shuffleFill: shuffleFill
  };
});
