/* Tile Rush — board generator (pure, DOM-free; reused by node self-tests).
 * Reverse-construction guarantee (design doc §2 rule 5):
 *   removal order T1..Tk (T1 first). Group i (0-based) is placed on layer
 *   floor((k-1-i)*L/k) — a monotone map, so every tile strictly above Ti
 *   belongs to a group removed EARLIER. Same-layer tiles never overlap.
 *   => replaying the construction order always clears the board. */
'use strict';
(function () {
  var FACES = ["🍉", "🍇", "🥑", "🌶️", "🍄", "🐟", "⚡", "💡", "🌙", "⭐", "🍩", "🎧"];
  var COLS = 7, ROWS = 8;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* pick k triple-faces from the 12-face pool (repeat the deck when k > 12) */
  function faceDeck(rng, k) {
    var deck = FACES.slice();
    while (deck.length < k) deck = deck.concat(FACES.slice());
    for (var i = deck.length - 1; i > 0; i--) {
      var j = (rng() * (i + 1)) | 0, t = deck[i]; deck[i] = deck[j]; deck[j] = t;
    }
    return deck.slice(0, k);
  }

  /* generate(seed, k, L) -> {tiles, order, k, L, seed}
   * tiles: [{id, face, layer, col, row}] ; order: array of k triples of tile ids
   * step fuse: 60 rng tries per tile then linear scan (grid 56 cells >> 3k/L). */
  function generate(seed, k, L) {
    var rng = mulberry32(seed >>> 0);
    var faces = faceDeck(rng, k);
    var layerOf = []; // per group i (removal order)
    for (var i = 0; i < k; i++) layerOf.push(Math.min(L - 1, Math.floor((k - 1 - i) * L / k)));
    var offsets = []; // shared half-cell jitter per layer
    for (var l = 0; l < L; l++) offsets.push({ x: rng() * 0.7 - 0.35, y: rng() * 0.7 - 0.35 });
    var tiles = [], used = {}, order = [], id = 0;
    for (var g = 0; g < k; g++) {
      var layer = layerOf[g], ids = [];
      for (var n = 0; n < 3; n++) {
        var tries = 0, col, row, key;
        do {
          col = (rng() * COLS) | 0; row = (rng() * ROWS) | 0;
          key = layer + ":" + col + ":" + row;
        } while (used[key] && ++tries < 60);
        if (used[key]) { // linear-scan fallback (never hit with k<=24, L>=6)
          var found = false;
          for (row = 0; row < ROWS && !found; row++)
            for (col = 0; col < COLS && !found; col++) {
              key = layer + ":" + col + ":" + row;
              if (!used[key]) found = true;
            }
          if (!found) throw new Error("generator grid overflow");
        }
        used[key] = true;
        tiles.push({ id: id, face: faces[g], layer: layer, col: col, row: row, ox: offsets[layer].x, oy: offsets[layer].y });
        ids.push(id++);
      }
      order.push(ids);
    }
    return { tiles: tiles, order: order, k: k, L: L, seed: seed >>> 0 };
  }

  /* covered set among alive tiles: covered if a strictly-higher tile's
   * footprint overlaps (|dx|<0.92 && |dy|<0.92 cell units — same-layer cells
   * are 1.0 apart with a shared layer offset, so same layer never covers). */
  function coveredMap(alive) {
    var cov = {};
    for (var a = 0; a < alive.length; a++) {
      var t = alive[a], hit = false;
      for (var b = 0; b < alive.length && !hit; b++) {
        var u = alive[b];
        if (u.layer <= t.layer || u.id === t.id) continue;
        if (Math.abs((t.col + t.ox) - (u.col + u.ox)) < 0.92 &&
            Math.abs((t.row + t.oy) - (u.row + u.oy)) < 0.92) hit = true;
      }
      cov[t.id] = hit;
    }
    return cov;
  }

  /* simulate the construction order -> true iff board clears (self-test) */
  function solveSim(gen) {
    var alive = gen.tiles.slice(), tray = [];
    for (var g = 0; g < gen.order.length; g++) {
      var cov = coveredMap(alive);
      var ids = gen.order[g];
      for (var i = 0; i < ids.length; i++) {
        if (cov[ids[i]]) return false; // blocked -> NOT solvable via order
        tray.push(ids[i]);
        if (tray.length > 7) return false;
      }
      tray = []; // triple matched, tray drains
      alive = alive.filter(function (t) { return ids.indexOf(t.id) < 0; });
    }
    return alive.length === 0 && tray.length === 0;
  }

  /* guaranteed-solvable face reassignment over ALIVE board tiles (Shuffle
   * prop). Positions unchanged, face multiset preserved. Works WITH the tray:
   * per-face invariant quota[f] + tray[f] === 0 (mod 3) always holds, so a
   * forward greedy over the free set finds a clearing order —
   *   tray[f]==2 -> take 1 free tile of f (pair completes);
   *   tray[f]==1 -> take up to 2 free tiles of f;
   *   else       -> take up to 3 free tiles of a face with quota >= 3.
   * The planned pick order never leaves >3 tiles in the tray. */
  function shuffleFaces(alive, trayCounts, seed) {
    var rng = mulberry32(seed >>> 0);
    var quota = {}, tray = {};
    alive.forEach(function (t) { quota[t.face] = (quota[t.face] || 0) + 1; });
    Object.keys(trayCounts).forEach(function (f) { tray[f] = trayCounts[f]; });
    var faces = Object.keys(quota);
    var pickFace = function (want) { // want: preferred face or null
      var opts = faces.filter(function (f) { return quota[f] > 0; });
      if (!opts.length) return null;
      if (want && quota[want] > 0) return want;
      for (var a = opts.length - 1; a > 0; a--) {
        var b = (rng() * (a + 1)) | 0, t2 = opts[a]; opts[a] = opts[b]; opts[b] = t2;
      }
      return opts[0];
    };
    var rest = alive.slice(), out = {};
    while (rest.length > 0) {
      var cov = coveredMap(rest);
      var free = rest.filter(function (t) { return !cov[t.id]; })
        .sort(function (a, b) { return b.layer - a.layer || a.id - b.id; });
      var n = 1, f = null;
      var pair = faces.filter(function (x) { return (tray[x] || 0) === 2 && quota[x] > 0; })[0];
      if (pair) { f = pair; n = 1; }
      else {
        var single = faces.filter(function (x) { return (tray[x] || 0) === 1 && quota[x] >= 2; })[0];
        if (single) { f = single; n = Math.min(2, free.length); }
        else {
          var big = faces.filter(function (x) { return quota[x] >= 3 && !(tray[x] || 0); })
            .sort(function (a, b) { return quota[b] - quota[a]; })[0];
          f = big || pickFace(null);
          n = Math.min(3, free.length);
        }
      }
      if (!f) return null; // cannot happen (mod-3 invariant)
      for (var i2 = 0; i2 < n && i2 < free.length; i2++) {
        out[free[i2].id] = f;
        rest = rest.filter(function (t) { return t.id !== free[i2].id; });
        quota[f]--;
      }
      tray[f] = ((tray[f] || 0) + n) % 3;
    }
    return out; // id -> new face
  }

  window.TRGen = { mulberry32: mulberry32, generate: generate, coveredMap: coveredMap, solveSim: solveSim, shuffleFaces: shuffleFaces, FACES: FACES, COLS: COLS, ROWS: ROWS };
})();
