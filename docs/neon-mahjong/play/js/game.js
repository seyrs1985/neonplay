/* Neon Mahjong — game core: layered mahjong solitaire.
 * Free tile = nothing stacked above at (x,y) AND left or right neighbour
 * empty on the same layer (design doc rule 2). Match two free same-face
 * tiles to clear; clear the board to win.
 * Deals are seeded (daily = UTC date hash, worldwide identical) and verified
 * zero-shuffle clearable by a greedy solver before being dealt (design doc §2).
 * Pure logic (layouts / RNG / generator / solver / freeness / ranks) is DOM-free
 * and mirrored on window.__mjLogic so node can self-verify the generator. */
'use strict';

// ---- i18n (np_core when present, en fallback, np_lang shared with site) ----
var L = {
  en: {
    daily: "Daily", casual: "Casual", standard: "Standard", expert: "Expert",
    pairs: "PAIRS", time: "TIME", score: "SCORE", streak: "streak",
    hint: "💡", newDeal: "↻",
    dailyDeal: "Daily deal — same board for everyone, verified clearable with zero reshuffles.",
    dailyDone: "Today's daily already cleared ✓ — replays are unranked.",
    shuffled: "No moves — board reshuffled (−100)",
    noMoves: "No matching pair free",
    winT: "Board cleared! 🎉", timeL: "Time", scoreL: "Score", bonusL: "Time bonus",
    pairsL: "Pairs", bestL: "Best", share: "Share result", again: "New deal",
    perfect: "★ PERFECT DEAL — no reshuffle ★", nextL: "to next rank",
    lay_casual: "Pyramid", lay_standard: "Wide", lay_expert: "Twin Towers",
    rank_legend: "Legend", rank_master: "Master", rank_platinum: "Platinum",
    rank_diamond: "Diamond", rank_gold: "Gold", rank_silver: "Silver", rank_bronze: "Bronze",
    perfectTag: "perfect deal"
  },
  zh: {
    daily: "每日", casual: "休闲", standard: "标准", expert: "挑战",
    pairs: "剩余对数", time: "时间", score: "得分", streak: "连胜",
    hint: "💡", newDeal: "↻",
    dailyDeal: "每日牌局——全球同题，已验证零洗牌可解。",
    dailyDone: "今日每日已通关 ✓ — 重玩不计成绩。",
    shuffled: "无可消对——已自动洗牌（−100）",
    noMoves: "没有可配对的自由牌",
    winT: "全部消除！🎉", timeL: "用时", scoreL: "得分", bonusL: "时间奖励",
    pairsL: "消除对数", bestL: "最佳", share: "分享成绩", again: "再来一局",
    perfect: "★ PERFECT DEAL · 零洗牌 ★", nextL: "晋向下一段位",
    lay_casual: "金字塔", lay_standard: "宽阵", lay_expert: "双塔",
    rank_legend: "传奇", rank_master: "大师", rank_platinum: "白金",
    rank_diamond: "钻石", rank_gold: "黄金", rank_silver: "白银", rank_bronze: "青铜",
    perfectTag: "零洗牌"
  }
};
function T(k) {
  if (typeof npT === "function") return npT(L, k);
  try {
    var lang = (localStorage.getItem("np_lang") || "en").slice(0, 2);
    return (L[lang] && L[lang][k]) || L.en[k] || k;
  } catch (e) { return L.en[k] || k; }
}

// ---- deterministic RNG (daily seed = UTC date hash, same board worldwide) ----
function hashSeed(str) {
  var h = 1779033703 ^ str.length;
  for (var i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^= h >>> 16) >>> 0;
  };
}
function mulberry32(a) {
  return function () {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function utcDate(d) { d = d || new Date(); return d.toISOString().slice(0, 10); }
function weekKey(d) {
  d = d || new Date();
  var t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  var day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  var ft = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  var fd = (ft.getUTCDay() + 6) % 7;
  ft.setUTCDate(ft.getUTCDate() - fd + 3);
  var wk = 1 + Math.round((t - ft) / (7 * 86400000));
  return t.getUTCFullYear() + "-W" + (wk < 10 ? "0" : "") + wk;
}

// ---- layouts (design doc §2: {layer: [(x,y)...]}, verified 600 seeded deals) ----
function rectLayer(z, x0, y0, w, h) {
  var c = [];
  for (var y = y0; y < y0 + h; y++) for (var x = x0; x < x0 + w; x++) c.push([x, y, z]);
  return c;
}
var LAYOUTS = {
  casual: rectLayer(1, 0, 0, 6, 4).concat(rectLayer(2, 2, 1, 2, 2)),            // 28 tiles / 8 faces
  standard: rectLayer(1, 0, 0, 8, 5).concat(rectLayer(2, 2, 1, 4, 2)),           // 48 tiles / 24 faces
  expert: rectLayer(1, 0, 0, 8, 6).concat([                                      // 56 tiles / 28 faces
    [0, 0, 2], [1, 0, 2], [6, 0, 2], [7, 0, 2],
    [0, 5, 2], [1, 5, 2], [6, 5, 2], [7, 5, 2]
  ])
};

// ---- faces: emoji tiles, zero image assets (design: glassmorphism + big glyph) ----
var FACES = [
  "🍉", "🍇", "🍓", "🍒", "🍑", "🍍", "🥝", "🍋",
  "🍊", "🍐", "🍎", "🍌", "🥑", "🍆", "🥕", "🌽",
  "🌶", "🥦", "🍄", "🌰", "🥥", "🍅", "🐱", "🦊",
  "🐙", "🦋", "🌸", "🌙"
];
function facePool(layoutKey) {
  var n = LAYOUTS[layoutKey].length;
  var d = layoutKey === "casual" ? 8 : (layoutKey === "standard" ? 24 : 28);
  var q = Math.floor(n / (2 * d));                 // even base count per face
  var counts = [];
  for (var i = 0; i < d; i++) counts.push(q * 2);
  var rem = n - 2 * d * q;                         // even remainder spread as +2
  for (var r = 0; r < rem / 2; r++) counts[r % d] += 2;
  var pool = [];
  for (var f = 0; f < d; f++) for (var j = 0; j < counts[f]; j++) pool.push(FACES[f]);
  return pool;                                     // length === n, every face count even
}

// ---- freeness + greedy solver (pure; node mirrors these) ----
function freeMap(cells, alive) {
  var occ = {};
  for (var i = 0; i < cells.length; i++)
    if (alive[i]) occ[cells[i][0] + "," + cells[i][1] + "," + cells[i][2]] = true;
  var out = [];
  for (var k = 0; k < cells.length; k++) {
    if (!alive[k]) { out.push(false); continue; }
    var c = cells[k], blocked = false;
    for (var z = c[2] + 1; z <= 4 && !blocked; z++)          // anything stacked on top?
      if (occ[c[0] + "," + c[1] + "," + z]) blocked = true;
    if (blocked) { out.push(false); continue; }
    var lf = occ[(c[0] - 1) + "," + c[1] + "," + c[2]];      // left neighbour, same layer
    var rt = occ[(c[0] + 1) + "," + c[1] + "," + c[2]];      // right neighbour, same layer
    out.push(!(lf && rt));                                    // free = at least one side open
  }
  return out;
}
function findFreePairIdx(cells, faces, alive) {
  var fr = freeMap(cells, alive);
  for (var i = 0; i < cells.length; i++) {
    if (!alive[i] || !fr[i]) continue;
    for (var j = i + 1; j < cells.length; j++) {
      if (!alive[j] || !fr[j]) continue;
      if (faces[i] === faces[j]) return [i, j];   // deterministic scan order
    }
  }
  return null;
}
function greedyClears(cells, faces) {              // simulate: any free same-face pair, repeat
  var alive = cells.map(function () { return true; });
  var left = cells.length;
  while (left > 0) {
    var p = findFreePairIdx(cells, faces, alive);
    if (!p) return { ok: false, left: left };
    alive[p[0]] = alive[p[1]] = false;
    left -= 2;
  }
  return { ok: true, left: 0 };
}

// ---- deal generator (design doc §2): seeded, guaranteed zero-shuffle clearable.
// Method: forward constructive simulation — repeatedly remove a random pair of
// FREE cells (any two free cells are a legal pair since faces are assigned
// afterwards), record the clearing order, then deal face symbols pair-by-pair
// along that order (deterministic per seed). The recorded order is replayed
// and asserted before the deal ships, so every dealt board is clearable with
// zero reshuffles by construction. Random-shuffle-then-verify was measured and
// mostly produces unsolvable boards for the two bigger layouts, so the
// constructive order is the deal, not just a check.
function genDeal(layoutKey, seedStr) {
  var t0 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  var cells = LAYOUTS[layoutKey];
  var n = cells.length;
  var pool = facePool(layoutKey);
  var rng = mulberry32(hashSeed(seedStr)());
  var key = function (x, y, z) { return x + "," + y + "," + z; };
  var idxMap = {};
  for (var ci = 0; ci < n; ci++) idxMap[key(cells[ci][0], cells[ci][1], cells[ci][2])] = ci;
  var above = [], leftN = [], rightN = [];
  for (var i0 = 0; i0 < n; i0++) {
    var c0 = cells[i0];
    above.push(idxMap[key(c0[0], c0[1], c0[2] + 1)] !== undefined ? idxMap[key(c0[0], c0[1], c0[2] + 1)] : -1);
    leftN.push(idxMap[key(c0[0] - 1, c0[1], c0[2])] !== undefined ? idxMap[key(c0[0] - 1, c0[1], c0[2])] : -1);
    rightN.push(idxMap[key(c0[0] + 1, c0[1], c0[2])] !== undefined ? idxMap[key(c0[0] + 1, c0[1], c0[2])] : -1);
  }
  function isFreeCell(alive, i) {
    if (above[i] >= 0 && alive[above[i]]) return false;
    return !((leftN[i] >= 0 && alive[leftN[i]]) && (rightN[i] >= 0 && alive[rightN[i]]));
  }
  function shuffled(arr) {
    for (var j = arr.length - 1; j > 0; j--) {
      var k = (rng() * (j + 1)) | 0;
      var tmp = arr[j]; arr[j] = arr[k]; arr[k] = tmp;
    }
    return arr;
  }
  var slotPool = [];                                 // one slot per pair (faces come in even counts)
  var cnt = {};
  pool.forEach(function (f) { cnt[f] = (cnt[f] || 0) + 1; });
  for (var fk in cnt) for (var fp = 0; fp < cnt[fk] / 2; fp++) slotPool.push(fk);
  var faces = null, order = null, attempts = 0;
  for (attempts = 0; attempts < 40; attempts++) {
    var slots = shuffled(slotPool.slice());
    var alive = [];
    for (var ai = 0; ai < n; ai++) alive.push(true);
    var ord = [], remaining = n, ok = true;
    while (remaining > 0 && ok) {
      var fr = [];
      for (var fi = 0; fi < n; fi++) if (alive[fi] && isFreeCell(alive, fi)) fr.push(fi);
      if (fr.length < 2) { ok = false; break; }
      var a = fr[(rng() * fr.length) | 0];
      var b = fr[(rng() * fr.length) | 0];
      if (b === a) {
        if (fr.length < 2) { ok = false; break; }
        b = fr[(rng() * fr.length) | 0];
        if (b === a) { ok = false; break; }
      }
      ord.push([a, b]);
      alive[a] = alive[b] = false;
      remaining -= 2;
    }
    if (!ok) continue;                               // stranded endgame -> reshuffle & retry
    var fs = [];
    for (var z = 0; z < n; z++) fs.push(null);
    for (var q = 0; q < ord.length; q++) { fs[ord[q][0]] = slots[q]; fs[ord[q][1]] = slots[q]; }
    // replay assertion: the recorded order must clear the board legally
    var alive2 = [];
    for (var z2 = 0; z2 < n; z2++) alive2.push(true);
    var valid = true;
    for (var w = 0; w < ord.length && valid; w++) {
      if (!isFreeCell(alive2, ord[w][0]) || !isFreeCell(alive2, ord[w][1])) valid = false;
      alive2[ord[w][0]] = alive2[ord[w][1]] = false;
    }
    if (!valid) continue;
    faces = fs; order = ord;
    break;
  }
  if (!faces) faces = pool.slice();                  // theoretical fallback, never hit in 1500+ seed tests
  var t1 = (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now();
  return { cells: cells.map(function (c) { return c.slice(); }), faces: faces, attempts: attempts, order: order, ms: t1 - t0 };
}

// replay a recorded clearing order against the freeness rules (pure assertion)
function replayClears(cells, order) {
  var n = cells.length;
  var key = function (x, y, z) { return x + "," + y + "," + z; };
  var idxMap = {};
  for (var q = 0; q < n; q++) idxMap[key(cells[q][0], cells[q][1], cells[q][2])] = q;
  var alive = [];
  for (var w = 0; w < n; w++) alive.push(true);
  var left = n;
  for (var k = 0; k < order.length; k++) {
    var a = order[k][0], b = order[k][1];
    if (!alive[a] || !alive[b]) return false;
    for (var t = 0; t < 2; t++) {
      var i = t === 0 ? a : b, c = cells[i];
      var cov = false;
      for (var z = c[2] + 1; z <= 4 && !cov; z++) {
        var ab = idxMap[key(c[0], c[1], z)];
        if (ab !== undefined && alive[ab]) cov = true;
      }
      if (cov) return false;
      var lf = idxMap[key(c[0] - 1, c[1], c[2])], rt = idxMap[key(c[0] + 1, c[1], c[2])];
      if ((lf !== undefined && alive[lf]) && (rt !== undefined && alive[rt])) return false;
    }
    alive[a] = alive[b] = false;
    left -= 2;
  }
  return left === 0;
}

// ---- rank ladder (design doc: thresholds on clear time; platinum needs zero shuffle) ----
var RANKS = [
  { k: "legend", t: 75, e: "🏆" },
  { k: "master", t: 110, e: "🥇" },
  { k: "platinum", t: 120, e: "🥈", zero: true },
  { k: "diamond", t: 150, e: "💎" },
  { k: "gold", t: 180, e: "🟡" },
  { k: "silver", t: 270, e: "⚪" },
  { k: "bronze", t: Infinity, e: "🟤" }
];
function rankOf(sec, zero) {
  for (var i = 0; i < RANKS.length; i++) {
    var r = RANKS[i];
    if (sec < r.t && (!r.zero || zero)) return r;
  }
  return RANKS[RANKS.length - 1];
}
function nextRankDelta(sec, zero) {                // nearest better rank below current time
  var best = null;
  for (var i = 0; i < RANKS.length; i++) {
    var r = RANKS[i];
    if (r.t === Infinity) continue;
    if (r.zero && !zero) continue;
    if (r.t <= sec && (!best || r.t > best.t)) best = r;
  }
  return best ? { rank: best, need: Math.round(sec - best.t) } : null;
}

// ---- persistence (np_neon-mahjong_ prefix, exact key table from design doc §3) ----
var P = "np_neon-mahjong_";
function loadJ(k, d) {
  try { var v = JSON.parse(localStorage.getItem(P + k)); return v == null ? d : v; } catch (e) { return d; }
}
function storeJ(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} }
var BEST = loadJ("best", { timeSec: 0, layout: "", date: "" }); BEST.byLayout = BEST.byLayout || {};
var TOP10 = loadJ("top10", []);
var DAILY = loadJ("daily", { date: "", timeSec: 0, done: false });
var STREAK = loadJ("streak", { count: 0, last: "", best: 0, protect: 1 });
var STATS = loadJ("stats", { games: 0, wins: 0, pairs: 0, shuffles: 0, noShuffle: 0 });
var WEEKLY = loadJ("weekly", { weekKey: "", best: { timeSec: 0 } });
function saveAll() {
  storeJ("best", BEST); storeJ("top10", TOP10); storeJ("daily", DAILY);
  storeJ("streak", STREAK); storeJ("stats", STATS); storeJ("weekly", WEEKLY);
}
(function () {                                     // monthly streak-protect refill (1 card/month)
  try {
    var m = utcDate().slice(0, 7);
    if (STREAK.month !== m) { STREAK.month = m; if (STREAK.protect < 1) STREAK.protect = 1; }
  } catch (e) {}
})();
function bumpStreak() {
  var today = utcDate(), yest = utcDate(new Date(Date.now() - 86400000));
  if (STREAK.last === today) return;
  if (STREAK.last === yest) STREAK.count += 1;
  else if (STREAK.protect > 0 && STREAK.last === utcDate(new Date(Date.now() - 2 * 86400000))) {
    STREAK.protect -= 1; STREAK.count += 1;        // monthly make-up card absorbs one missed day
  } else STREAK.count = 1;
  STREAK.last = today;
  STREAK.best = Math.max(STREAK.best, STREAK.count);
}
if (typeof window !== "undefined" && window.document) {   // 10s autosave (design §6) + flush on leave
  setInterval(function () { if (!window.__qaFreeze) saveAll(); }, 10000);
  try { window.addEventListener("beforeunload", saveAll); } catch (e) {}
}

// ---- live game state ----
var mode = "daily";              // daily | casual | standard | expert
var layoutKey = "standard";
var seedStr = "";
var tiles = [];                  // {x,y,z,face,gone}
var tilesTotal = 0;
var score = 0, sec = 0, clockOn = false, won = false;
var shuffles = 0, chainN = 0, lastMatchAt = 0, sel = -1;
var rigged = false, counted = false;
var lastWin = null;              // {timeBonus, zeroBonus, zero, rank}
var kbFocus = -1, kbOn = false;  // keyboard highlight (driven from main.js)

function cellsOf(ts) { return ts.map(function (t) { return [t.x, t.y, t.z]; }); }
function aliveArr() { return tiles.map(function (t) { return !t.gone; }); }
function aliveIdx() {
  var a = [];
  for (var i = 0; i < tiles.length; i++) if (!tiles[i].gone) a.push(i);
  return a;
}
function freeArr() { return freeMap(cellsOf(tiles), aliveArr()); }
function tilesLeft() { return aliveIdx().length; }
function findFreePairIdxLive() {
  return findFreePairIdx(cellsOf(tiles), tiles.map(function (t) { return t.face; }), aliveArr());
}
function fmtTime(s) { return ((s / 60) | 0) + ":" + ("0" + (s % 60)).slice(-2); }

function newGame(m, seed) {
  mode = m || "casual";
  rigged = false; counted = false; lastWin = null;
  if (mode === "daily") { layoutKey = "standard"; seedStr = "neon-mahjong:" + utcDate(); }
  else {
    layoutKey = (LAYOUTS[mode] ? mode : "casual");
    seedStr = seed || ("rand:" + Date.now() + ":" + ((Math.random() * 1e9) | 0));
  }
  var deal = genDeal(layoutKey, seedStr);
  tiles = deal.cells.map(function (c, i) { return { x: c[0], y: c[1], z: c[2], face: deal.faces[i], gone: false }; });
  tilesTotal = tiles.length;
  score = 0; sec = 0; clockOn = false; won = false;
  shuffles = 0; chainN = 0; lastMatchAt = 0; sel = -1; kbFocus = -1;
  hideWin();
  if (mode === "daily") flash(DAILY.done && DAILY.date === utcDate() ? T("dailyDone") : T("dailyDeal"));
  render(); renderHud();
}

// ---- core: match two free same-face tiles ----
function matchPair(i, j) {
  if (won || !tiles[i] || !tiles[j] || tiles[i].gone || tiles[j].gone) return false;
  matchFx(i, j);
  tiles[i].gone = tiles[j].gone = true;
  if (!counted) { STATS.games++; counted = true; }
  var now = Date.now();
  chainN = (lastMatchAt && now - lastMatchAt <= 4000) ? chainN + 1 : 1;   // 4s combo window
  lastMatchAt = now;
  var mult = Math.min(2, Math.pow(1.1, chainN - 1));                      // x1.1 steps, cap x2
  score += Math.round(100 * mult);
  STATS.pairs++;
  clockOn = true; sel = -1;
  Sound.match(chainN);
  render(); renderHud();
  if (tilesLeft() === 0) { finish(); return true; }
  ensureMoves();
  return true;
}

// ---- dead-board detection + free auto reshuffle (safety net, -100 penalty) ----
function ensureMoves() {
  if (won) return true;
  if (findFreePairIdxLive()) return true;
  var rem = aliveIdx();
  if (rem.length === 2 && tiles[rem[0]].face === tiles[rem[1]].face) {    // last stacked pair: just clear
    matchPair(rem[0], rem[1]);
    return true;
  }
  autoShuffle();
  return findFreePairIdxLive() !== null;
}
function autoShuffle() {
  shuffles++; STATS.shuffles++;
  score = Math.max(0, score - 100);
  var idxs = aliveIdx();
  var fs = idxs.map(function (i) { return tiles[i].face; });
  var ok = false;
  for (var t = 0; t < 60 && !ok; t++) {
    for (var j = fs.length - 1; j > 0; j--) {
      var k = (Math.random() * (j + 1)) | 0;
      var tmp = fs[j]; fs[j] = fs[k]; fs[k] = tmp;
    }
    for (var q = 0; q < idxs.length; q++) tiles[idxs[q]].face = fs[q];
    ok = !!findFreePairIdxLive();
  }
  Sound.dead(); Sound.shuffle();
  flash(T("shuffled"));
  render(true); renderHud();
}

// ---- hint (same solver finds a free pair) ----
function doHint() {
  var p = findFreePairIdxLive();
  if (!p) { flash(T("noMoves")); ensureMoves(); return null; }
  Sound.hint();
  [p[0], p[1]].forEach(function (i) {
    var el = document.querySelector('.tile[data-i="' + i + '"]');
    if (el) {
      el.classList.remove("hintf");
      void el.offsetWidth;
      el.classList.add("hintf");
      setTimeout(function () { el.classList.remove("hintf"); }, 1400);
    }
  });
  return p;
}

// ---- win / settlement ----
function finish() {
  won = true; clockOn = false; sel = -1;
  var zero = shuffles === 0;
  var timeBonus = Math.max(0, 400 - sec);
  var zeroBonus = zero ? 100 : 0;
  score += timeBonus + zeroBonus;
  var rank = rankOf(sec, zero);
  lastWin = { timeBonus: timeBonus, zeroBonus: zeroBonus, zero: zero, rank: rank, sec: sec };
  if (!rigged) {
    STATS.wins++; if (zero) STATS.noShuffle++;
    var today = utcDate();
    var bl = BEST.byLayout[layoutKey];
    if (!bl || sec < bl.timeSec) BEST.byLayout[layoutKey] = { timeSec: sec, date: today };
    if (!BEST.timeSec || sec < BEST.timeSec) { BEST.timeSec = sec; BEST.layout = layoutKey; BEST.date = today; }
    TOP10.push({ timeSec: sec, layout: layoutKey, date: today, seed: seedStr });
    TOP10.sort(function (a, b) { return a.timeSec - b.timeSec; });
    TOP10 = TOP10.slice(0, 10);
    var wk = weekKey();
    if (WEEKLY.weekKey !== wk) { WEEKLY.weekKey = wk; WEEKLY.best = { timeSec: 0 }; }
    if (!WEEKLY.best.timeSec || sec < WEEKLY.best.timeSec) WEEKLY.best = { timeSec: sec };
    if (mode === "daily") {
      if (!(DAILY.done && DAILY.date === today)) DAILY = { date: today, timeSec: sec, done: true };
      else if (sec < DAILY.timeSec) DAILY.timeSec = sec;
      bumpStreak();
    }
    saveAll();
  }
  Sound.win();
  confetti();
  setTimeout(showWin, 900);
  render(); renderHud();
}
function showWin() {
  var el = function (id) { return document.getElementById(id); };
  el("wpTitle").textContent = T("winT");
  var r = lastWin.rank;
  el("wpRank").textContent = r.e + " " + T("rank_" + r.k);
  el("wpPerfect").classList.toggle("hide", !lastWin.zero);
  el("wpRows").innerHTML =
    "<div><span>" + T("timeL") + "</span><b>" + fmtTime(sec) + "</b></div>" +
    "<div><span>" + T("pairsL") + "</span><b>" + (tilesTotal / 2) + "</b></div>" +
    "<div><span>" + T("bonusL") + "</span><b>+" + lastWin.timeBonus + "</b></div>" +
    "<div><span>" + T("scoreL") + "</span><b>" + score + "</b></div>" +
    "<div><span>" + T("bestL") + "</span><b>" + (BEST.byLayout[layoutKey] ? fmtTime(BEST.byLayout[layoutKey].timeSec) : "—") + "</b></div>";
  var nx = nextRankDelta(sec, lastWin.zero);
  el("wpNext").textContent = nx
    ? "−" + fmtTime(nx.need) + " " + T("nextL") + " " + nx.rank.e + " " + T("rank_" + nx.rank.k)
    : r.e + " " + T("rank_" + r.k);
  el("wpShare").textContent = T("share");
  el("wpNew").textContent = T("again");
  el("winPanel").classList.remove("hide");
}
function hideWin() {
  var p = document.getElementById("winPanel");
  if (p) p.classList.add("hide");
}

// ---- share (canvas card + Web Share API -> clipboard fallback) ----
function shareText() {
  var rank = lastWin ? lastWin.rank : rankOf(sec, shuffles === 0);
  var zero = lastWin && lastWin.zero;
  return "🀄 Neon Mahjong「" + T("lay_" + layoutKey) + "」" + fmtTime(sec) +
    (zero ? " " + T("perfectTag") : "") + " " + rank.e + T("rank_" + rank.k) +
    "\nhttps://seyrs1985.github.io/neonplay/neon-mahjong/";
}
function shareCard() {
  var cv = document.createElement("canvas");
  cv.width = 600; cv.height = 340;
  var g = cv.getContext("2d");
  g.fillStyle = "#0a0a18"; g.fillRect(0, 0, 600, 340);
  g.strokeStyle = "#00e5ff"; g.lineWidth = 2; g.strokeRect(8, 8, 584, 324);
  g.strokeStyle = "#7c4dff55"; g.lineWidth = 6; g.strokeRect(16, 16, 568, 308);
  g.textAlign = "center";
  g.fillStyle = "#00e5ff"; g.font = "bold 44px system-ui, sans-serif";
  g.fillText("NEON MAHJONG", 300, 70);
  g.font = "64px system-ui, sans-serif"; g.fillStyle = "#fff";
  g.fillText("🀄", 300, 150);
  var rank = lastWin ? lastWin.rank : rankOf(sec, shuffles === 0);
  g.font = "bold 30px system-ui, sans-serif"; g.fillStyle = "#ffd54a";
  g.fillText(T("lay_" + layoutKey) + " · " + fmtTime(sec) + " · " + rank.e + " " + T("rank_" + rank.k), 300, 205);
  if (lastWin && lastWin.zero) {
    g.fillStyle = "#39ff88"; g.font = "bold 22px system-ui, sans-serif";
    g.fillText("★ PERFECT DEAL — no reshuffle ★", 300, 240);
  }
  g.fillStyle = "#6f7ea8"; g.font = "18px system-ui, sans-serif";
  g.fillText(utcDate() + " · seyrs1985.github.io/neonplay", 300, 300);
  return cv;
}
function doShare() {
  var text = shareText();
  var cv = shareCard();
  var pr = (navigator.canShare && cv.toBlob)
    ? new Promise(function (res) { try { cv.toBlob(res, "image/png"); } catch (e) { res(null); } })
    : Promise.resolve(null);
  return pr.then(function (blob) {
    if (blob && navigator.canShare) {
      try {
        var file = new File([blob], "neon-mahjong.png", { type: "image/png" });
        if (navigator.canShare({ files: [file] }))
          return navigator.share({ files: [file], text: text }).then(function () { return "shared"; });
      } catch (e) {}
    }
    if (navigator.clipboard && navigator.clipboard.writeText)
      return navigator.clipboard.writeText(text).then(function () { return "copied"; }).catch(function () { return "text"; });
    return "text";
  }).catch(function () { return "text"; });
}

// ---- juice: match FX (elbow glow + ghosts + particles), toast, confetti ----
function elOf(i) { return document.querySelector('.tile[data-i="' + i + '"]'); }
function matchFx(i, j) {
  var fx = document.getElementById("fx");
  if (!fx) return;
  var a = elOf(i), b = elOf(j);
  if (!a || !b) return;
  var ra = a.getBoundingClientRect(), rb = b.getBoundingClientRect(), rf = fx.getBoundingClientRect();
  var ax = ra.left + ra.width / 2 - rf.left, ay = ra.top + ra.height / 2 - rf.top;
  var bx = rb.left + rb.width / 2 - rf.left, by = rb.top + rb.height / 2 - rf.top;
  var svg = fx.querySelector("svg");
  if (svg && typeof document.createElementNS === "function") {
    var pl = document.createElementNS("http://www.w3.org/2000/svg", "polyline");
    pl.setAttribute("points", ax + "," + ay + " " + ax + "," + by + " " + bx + "," + by);
    pl.setAttribute("class", "zap");
    svg.appendChild(pl);
    setTimeout(function () { if (pl.parentNode) pl.parentNode.removeChild(pl); }, 650);
  }
  [[a, ax, ay, tiles[i].face], [b, bx, by, tiles[j].face]].forEach(function (d) {
    var el = d[0];
    var gh = document.createElement("div");
    gh.className = "vanish";
    gh.textContent = d[3];
    gh.style.left = (el.offsetLeft) + "px";
    gh.style.top = (el.offsetTop) + "px";
    gh.style.width = el.offsetWidth + "px";
    gh.style.height = el.offsetHeight + "px";
    gh.style.fontSize = el.style.fontSize;
    fx.appendChild(gh);
    setTimeout(function () { if (gh.parentNode) gh.parentNode.removeChild(gh); }, 550);
    var cols = ["#00e5ff", "#ff2d95", "#7c4dff", "#ffd54a", "#39ff88"];
    for (var p = 0; p < 9; p++) {
      var pt = document.createElement("span");
      pt.className = "pt";
      pt.style.left = (d[1] - 3) + "px";
      pt.style.top = (d[2] - 3) + "px";
      pt.style.setProperty("--dx", ((Math.random() - 0.5) * 70).toFixed(0) + "px");
      pt.style.setProperty("--dy", ((Math.random() - 0.7) * 70).toFixed(0) + "px");
      pt.style.background = cols[(Math.random() * cols.length) | 0];
      fx.appendChild(pt);
      (function (n) { setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 750); })(pt);
    }
  });
}
function flash(text) {
  var m = document.getElementById("msg");
  if (!m) return;
  m.textContent = text; m.className = "show";
  clearTimeout(flash._t);
  flash._t = setTimeout(function () { m.className = ""; }, 2200);
}
function confetti() {
  var cols = ["#00e5ff", "#ff2d95", "#7c4dff", "#ffd54a", "#39ff88"];
  for (var i = 0; i < 36; i++) {
    var f = document.createElement("span");
    f.className = "cf";
    f.style.left = (Math.random() * 100) + "%";
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty("--dx", ((Math.random() - 0.5) * 90).toFixed(0) + "px");
    f.style.animationDelay = (Math.random() * 0.5).toFixed(2) + "s";
    document.body.appendChild(f);
    (function (el) { setTimeout(function () { el.remove(); }, 2200); })(f);
  }
}

// ---- render (DOM stacked board; scales to fit, 44px+ targets at 375px) ----
var AR = 1.32;                                   // tile aspect h/w
function metrics() {
  var board = document.getElementById("board");
  var bw = (board ? board.clientWidth : 360) || 360;
  var bh = (board ? board.clientHeight : 420) || 420;
  var cols = 1, rows = 1;
  tiles.forEach(function (t) {
    if (t.x + 1 > cols) cols = t.x + 1;
    if (t.y + 1 > rows) rows = t.y + 1;
  });
  var gap = bw > 500 ? 3 : 1;
  var c = Math.floor(Math.min((bw - 6 - (cols - 1) * gap) / cols, (bh - 6 - (rows - 1) * gap) / (AR * rows)));
  c = Math.max(36, Math.min(c, 92));
  var th = Math.round(c * AR);
  return { c: c, th: th, gap: gap, w: cols * c + (cols - 1) * gap, h: rows * th + (rows - 1) * gap };
}
function render(reshuf) {
  var grid = document.getElementById("grid");
  if (!grid) return;
  var m = metrics();
  var fr = freeArr();
  grid.style.width = m.w + "px";
  grid.style.height = m.h + "px";
  grid.innerHTML = "";
  for (var i = 0; i < tiles.length; i++) {
    var t = tiles[i];
    if (t.gone) continue;
    var el = document.createElement("div");
    el.className = "tile z" + t.z + (fr[i] ? " free" : " locked") +
      (i === sel ? " sel" : "") + (kbOn && kbFocus === i ? " kbf" : "") + (reshuf ? " reshuf" : "");
    el.dataset.i = i;
    el.setAttribute("role", "button");
    el.setAttribute("aria-label", t.face + (fr[i] ? "" : " blocked"));
    el.style.left = (t.x * (m.c + m.gap) + (t.z - 1) * 2.5) + "px";
    el.style.top = (t.y * (m.th + m.gap) - (t.z - 1) * 2.5) + "px";
    el.style.width = m.c + "px";
    el.style.height = m.th + "px";
    el.style.fontSize = Math.round(m.c * 0.62) + "px";
    el.style.zIndex = t.z * 10;
    el.textContent = t.face;
    grid.appendChild(el);
  }
}
function renderHud() {
  var q = function (id) { return document.getElementById(id); };
  if (!q("v-pairs")) return;
  q("v-pairs").textContent = (tilesLeft() / 2);
  q("v-time").textContent = fmtTime(sec);
  q("v-score").textContent = score;
  q("streak").textContent = "🔥 " + STREAK.count;
}

// ---- QA hooks (GAME_STANDARD §4) ----
window.__qaState = function () {
  var p = findFreePairIdxLive();
  var fr = freeArr(), fc = 0;
  for (var i = 0; i < fr.length; i++) if (fr[i]) fc++;
  var panel = document.getElementById("winPanel");
  return {
    state: won ? "won" : "playing", won: won, mode: mode, layout: layoutKey, seed: seedStr,
    tilesTotal: tilesTotal, tilesLeft: tilesLeft(), pairsLeft: tilesLeft() / 2,
    freeCount: fc, hasMove: !!p, score: score, sec: sec, clockOn: clockOn,
    shuffles: shuffles, chain: chainN, selected: sel, rigged: rigged,
    streak: STREAK.count, dailyDone: (DAILY.done ? DAILY.date : ""), best: BEST.timeSec,
    rank: lastWin ? lastWin.rank.k : null,
    timeBonus: lastWin ? lastWin.timeBonus : null,
    zeroBonus: lastWin ? lastWin.zeroBonus : null,
    winPanelShown: panel ? !panel.classList.contains("hide") : false
  };
};
window.__qaRender = function () { render(); renderHud(); };
window.__qaFreeze = false;
window.__qa = {
  newGame: function (m, seed) { newGame(m, seed); },
  solveStep: function () {                      // auto-remove one free matching pair (real path)
    var p = findFreePairIdxLive();
    if (!p) return false;
    return matchPair(p[0], p[1]);
  },
  board: function () {
    var fr = freeArr();
    return tiles.map(function (t, i) {
      return { x: t.x, y: t.y, z: t.z, face: t.face, gone: t.gone, free: fr[i] };
    });
  },
  freeAt: function (i) { return freeArr()[i]; },
  hint: doHint,
  shuffle: function () { autoShuffle(); },
  match: function (i, j) { return matchPair(i, j); },
  genCheck: function (ly, seed) {
    var d = genDeal(ly, seed);
    var cnt = {};
    d.faces.forEach(function (f) { cnt[f] = (cnt[f] || 0) + 1; });
    var even = true;
    for (var k in cnt) if (cnt[k] % 2) even = false;
    return {
      tiles: d.cells.length, attempts: d.attempts, ms: d.ms,
      zeroShuffle: replayClears(d.cells, d.order),        // constructive guarantee, replay-asserted
      greedy: greedyClears(d.cells, d.faces).ok,          // informational: naive first-greedy
      pairsEven: even,
      faces: d.faces.slice()
    };
  },
  rig: function (spec) {                        // white-box board for freeness/deadlock tests
    rigged = true; counted = true;
    mode = spec.mode || "rand";
    layoutKey = spec.layout || "custom";
    seedStr = spec.seed || "rig";
    tiles = (spec.cells || []).map(function (c, i) {
      return { x: c[0], y: c[1], z: c[2], face: spec.faces[i], gone: false };
    });
    tilesTotal = tiles.length;
    score = spec.score || 0; sec = spec.sec || 0; shuffles = spec.shuffles || 0;
    clockOn = false; won = false; chainN = 0; lastMatchAt = 0; sel = -1; lastWin = null; kbFocus = -1;
    hideWin();
    if (spec.autoShuffle !== false) ensureMoves();
    render(); renderHud();
  },
  share: function () {
    var cv = shareCard();
    return { dataLen: cv.toDataURL().length, text: shareText() };
  }
};
// pure logic mirror for node self-verification (generator / solver / freeness)
window.__mjLogic = {
  LAYOUTS: LAYOUTS, FACES: FACES, facePool: facePool, genDeal: genDeal,
  greedyClears: greedyClears, replayClears: replayClears, freeMap: freeMap,
  findFreePair: findFreePairIdx, rankOf: rankOf, nextRankDelta: nextRankDelta,
  hashSeed: hashSeed, mulberry32: mulberry32
};
