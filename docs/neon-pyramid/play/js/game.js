/* Neon Pyramid — game core: sum-13 pair matching, 28-card pyramid,
 * exposure rules, 3-cycle stock, jokers, seeded daily deals, scoring,
 * ranks, streak/save (six keys), share card, render, QA hooks.
 * Pure state + rules live here; input mapping is in main.js. */
'use strict';

// ---- i18n (flat keys so npT's direct lookup works; en fallback) ----
var L = {
  en: {
    daily: "Daily", rand: "Random", score: "SCORE", pairs: "PAIRS", stock: "STOCK",
    cycles: "CYCLES", streak: "streak", share: "Share result", again: "New deal",
    clearT: "PHARAOH CLEAR", clearNote: "The whole pyramid is gone — about 1% of deals. Rare air.",
    overT: "No moves left", overNote: "The pyramid held. Score banked.",
    scoreL: "Score", pairsL: "Pairs", cycleL: "Recycles", bestL: "Best",
    nextRankL: "pts to next rank", topRankL: "Top rank reached",
    dealt: "Daily deal — same pyramid for everyone", dailyDone: "Today's daily already scored ✓ — replay is unranked.",
    recycle: "Stock recycled (−200)", noCycles: "No recycles left",
    jokerT: "Pick your Joker", jokerSub: "One rule modifier for this deal",
    hammerArm: "🔨 armed — tap any card", hammerBtn: "🔨", xrayNext: "next",
    newBest: "NEW BEST",
    rank_legend: "Legend", rank_master: "Master", rank_diamond: "Diamond", rank_platinum: "Platinum",
    rank_gold: "Gold", rank_silver: "Silver", rank_bronze: "Bronze",
    jk_sum12: "Twelve Too", jkd_sum12: "Pairs summing 12 also count (A+J … 4+8).",
    jk_cycle4: "Fourth Cycle", jkd_cycle4: "One extra stock recycle: 4 instead of 3.",
    jk_goldbase: "Gold Base", jkd_goldbase: "Pairs using a bottom-row card score double.",
    jk_xray: "X-Ray", jkd_xray: "Preview the next 3 stock cards all game.",
    jk_hammer: "Top Hammer", jkd_hammer: "Once per game: smash away any one covered card.",
    jk_recall: "Pyramid Recall", jkd_recall: "R1 — coming soon."
  },
  zh: {
    daily: "每日挑战", rand: "随机局", score: "得分", pairs: "配对", stock: "库存",
    cycles: "循环", streak: "连胜", share: "分享战绩", again: "再来一局",
    clearT: "PHARAOH CLEAR", clearNote: "全塔清空！约 1% 发牌的稀有荣誉。",
    overT: "无路可走", overNote: "金字塔还在——分数已入账。",
    scoreL: "得分", pairsL: "配对", cycleL: "循环", bestL: "最佳",
    nextRankL: "分升下一段位", topRankL: "已达最高段位",
    dealt: "每日发牌——全球同一座塔", dailyDone: "今日每日已计分 ✓ — 重玩不计成绩。",
    recycle: "库存循环（−200）", noCycles: "循环次数已用尽",
    jokerT: "选择你的 Joker", jokerSub: "本局的一项规则修正器",
    hammerArm: "🔨 已激活——点击任意一张牌", hammerBtn: "🔨", xrayNext: "下",
    newBest: "新纪录",
    rank_legend: "传奇", rank_master: "大师", rank_diamond: "钻石", rank_platinum: "白金",
    rank_gold: "黄金", rank_silver: "白银", rank_bronze: "青铜",
    jk_sum12: "合 12 也算", jkd_sum12: "和为 12 的配对同样可消（A+J … 4+8）。",
    jk_cycle4: "第四循环", jkd_cycle4: "库存多一次循环：共 4 次。",
    jk_goldbase: "黄金底座", jkd_goldbase: "含底行牌的配对得分翻倍。",
    jk_xray: "X 光", jkd_xray: "整局可预览库存顶 3 张。",
    jk_hammer: "拆顶锤", jkd_hammer: "每局一次：敲掉任意一张被压牌。",
    jk_recall: "金字塔回收", jkd_recall: "R1——敬请期待。"
  }
};
function T(k) {
  if (typeof npT === "function") return npT(L, k);
  try {
    var lang = (localStorage.getItem("np_lang") || "en").slice(0, 2);
    return (L[lang] && L[lang][k]) || L.en[k] || k;
  } catch (e) { return L.en[k] || k; }
}
function TJ(id) { return [T("jk_" + id), T("jkd_" + id)]; }

// ---- cards ----
var SUITS = ["♠", "♥", "♦", "♣"];
var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
function isRed(s) { return s === 1 || s === 2; }
function mkCard(id) { return { s: (id / 13) | 0, r: (id % 13) + 1, id: id }; }

// ---- deterministic RNG (daily = UTC date hash, same board worldwide) ----
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
function seededDeck(seedStr) {
  var deck = [];
  for (var i = 0; i < 52; i++) deck.push(mkCard(i));
  var rng = mulberry32(hashSeed(seedStr)());
  for (var j = deck.length - 1; j > 0; j--) {
    var k = (rng() * (j + 1)) | 0;
    var t = deck[j]; deck[j] = deck[k]; deck[k] = t;
  }
  return deck;
}
function utcDate(d) { d = d || new Date(); return d.toISOString().slice(0, 10); }
function dayNumber() { return Math.floor(Date.now() / 86400000); }
function isoWeek(d) {
  d = d ? new Date(d) : new Date();
  var t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  var day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  var y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  var wk = Math.ceil((((t - y0) / 86400000) + 1) / 7);
  return t.getUTCFullYear() + "-W" + (wk < 10 ? "0" + wk : wk);
}

// ---- jokers (data-driven; 5 live + 1 R1 placeholder) ----
var JOKER_IDS = ["sum12", "cycle4", "goldbase", "xray", "hammer"];   // pick pool
var JOKER_ICONS = { sum12: "🎲", cycle4: "♻️", goldbase: "💰", xray: "👁️", hammer: "🔨", recall: "🔺" };
var OFFER_COMBOS = [   // C(5,3) fixed order; daily rotates by UTC day number
  ["sum12", "cycle4", "goldbase"], ["sum12", "cycle4", "xray"], ["sum12", "cycle4", "hammer"],
  ["sum12", "goldbase", "xray"], ["sum12", "goldbase", "hammer"], ["sum12", "xray", "hammer"],
  ["cycle4", "goldbase", "xray"], ["cycle4", "goldbase", "hammer"], ["cycle4", "xray", "hammer"],
  ["goldbase", "xray", "hammer"]
];
function offerFor(m) {
  if (m === "daily") return OFFER_COMBOS[dayNumber() % OFFER_COMBOS.length].slice();
  var pool = JOKER_IDS.slice(), out = [];
  while (out.length < 3 && pool.length) out.push(pool.splice((Math.random() * pool.length) | 0, 1)[0]);
  return out;
}

// ---- save keys (design doc section 3 list, np_neon-pyramid_ prefix) ----
var K_BEST = "np_neon-pyramid_best", K_TOP10 = "np_neon-pyramid_top10",
    K_DAILY = "np_neon-pyramid_daily", K_STREAK = "np_neon-pyramid_streak",
    K_STATS = "np_neon-pyramid_stats", K_WEEKLY = "np_neon-pyramid_weekly";
function loadJSON(key, def) {
  try { var v = JSON.parse(localStorage.getItem(key) || "null"); return v || def; }
  catch (e) { return def; }
}
function putJSON(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
var BEST = loadJSON(K_BEST, { score: 0, pairs: 0, date: "" });
var TOP10 = loadJSON(K_TOP10, []);
var DAILY = loadJSON(K_DAILY, { date: "", score: 0, done: false });
var STREAK = loadJSON(K_STREAK, { count: 0, last: "", best: 0, protect: 1 });
var STATS = loadJSON(K_STATS, { games: 0, clears: 0, pairs: 0, bestPairs: 0 });
var WEEKLY = loadJSON(K_WEEKLY, { weekKey: "", best: { score: 0, pairs: 0, date: "" } });

function bumpStreak() {
  var today = utcDate();
  if (STREAK.last === today) return;
  if (STREAK.last && STREAK.last.slice(0, 7) !== today.slice(0, 7))
    STREAK.protect = Math.max(STREAK.protect, 1);                 // monthly make-up card refill
  var yest = utcDate(new Date(Date.now() - 86400000));
  var erey = utcDate(new Date(Date.now() - 2 * 86400000));
  if (STREAK.last === yest) STREAK.count += 1;
  else if (STREAK.protect > 0 && STREAK.last === erey) { STREAK.protect -= 1; STREAK.count += 1; }  // consume make-up card
  else STREAK.count = 1;
  STREAK.best = Math.max(STREAK.best || 0, STREAK.count);
  STREAK.last = today;
}

// ---- ranks (200-sim calibrated bands: bronze<600 ... legend>=2450) ----
var RANK_STEPS = [
  { key: "legend", emoji: "🏆", min: 2450 }, { key: "master", emoji: "🥇", min: 2150 },
  { key: "diamond", emoji: "💎", min: 1850 }, { key: "platinum", emoji: "🥈", min: 1450 },
  { key: "gold", emoji: "🟡", min: 1050 }, { key: "silver", emoji: "⚪", min: 600 },
  { key: "bronze", emoji: "🟤", min: 0 }
];
function rankOf(score) {
  for (var i = 0; i < RANK_STEPS.length; i++) if (score >= RANK_STEPS[i].min) return RANK_STEPS[i];
  return RANK_STEPS[RANK_STEPS.length - 1];
}
function nextRankGap(score) {   // points to the next band, null at legend
  var asc = RANK_STEPS.slice().reverse();
  for (var i = 0; i < asc.length; i++) if (asc[i].min > score) return asc[i].min - score;
  return null;
}

// ---- live state ----
var mode = "daily", seedStr = "";
var pyr = [];                 // slots {r,i,s,rk,id,removed} (kept for geometry)
var stock = [], waste = [];
var phase = "joker";          // 'joker' | 'play' | 'clear' | 'over'
var jokerOffer = [], joker = "", hammerUsed = false, hammerArmed = false;
var sel = null;               // {where:'pyr', id} | {where:'waste'}
var score = 0, pairs = 0, moves = 0, cycles = 0, sec = 0, clockOn = false;
var rowEmpty = [false, false, false, false, false, false, false];

function slotAt(r, i) {
  for (var k = 0; k < pyr.length; k++) if (pyr[k].r === r && pyr[k].i === i) return pyr[k];
  return null;
}
function isExposed(slot) {    // blocked only by the two slots overlapping it: (r+1,i),(r+1,i+1)
  if (!slot || slot.removed) return false;
  var a = slotAt(slot.r + 1, slot.i), b = slotAt(slot.r + 1, slot.i + 1);
  return !(a && !a.removed) && !(b && !b.removed);
}
function slotById(id) {
  for (var k = 0; k < pyr.length; k++) if (pyr[k].id === id && !pyr[k].removed) return pyr[k];
  return null;
}
function wasteTop() { return waste.length ? waste[waste.length - 1] : null; }
function wasteAcc() {         // waste top as accessible pseudo-slot
  var t = wasteTop();
  return t ? { isWaste: true, rk: t.r, id: t.id, r: -1 } : null;
}
function exposedSlots() {
  var out = [];
  for (var k = 0; k < pyr.length; k++) if (isExposed(pyr[k])) out.push(pyr[k]);
  return out;
}
function accessible() {       // everything a pair can draw from right now
  var list = exposedSlots();
  var w = wasteAcc();
  if (w) list.push(w);
  return list;
}
function targetSums() { return joker === "sum12" ? [13, 12] : [13]; }
function sumsOK(a, b) {
  var s = a + b;
  for (var i = 0; i < targetSums().length; i++) if (s === targetSums()[i]) return true;
  return false;
}
function maxCycles() { return joker === "cycle4" ? 4 : 3; }
function pyramidLeft() {
  var n = 0;
  for (var k = 0; k < pyr.length; k++) if (!pyr[k].removed) n++;
  return n;
}

// ---- dealing ----
function deal(deck) {
  pyr = []; stock = []; waste = [];
  var di = 0;
  for (var r = 0; r < 7; r++)
    for (var i = 0; i <= r; i++) {
      var c = deck[di++];
      pyr.push({ r: r, i: i, s: c.s, rk: c.r, id: c.id, removed: false });
    }
  while (di < 52) stock.push(deck[di++]);
  sel = null; score = 0; pairs = 0; moves = 0; cycles = 0; sec = 0; clockOn = false;
  hammerUsed = false; hammerArmed = false;
  rowEmpty = [false, false, false, false, false, false, false];
}
function newGame(m, seed) {
  mode = m;
  if (m === "daily") seedStr = "neon-pyramid:" + utcDate();
  else seedStr = seed || ("rand:" + Date.now() + ":" + ((Math.random() * 1e9) | 0));
  deal(seededDeck(seedStr));
  jokerOffer = offerFor(m); joker = ""; phase = "joker";
  hidePanel();
  renderJokers(); render(); renderHud();
  if (m === "daily" && DAILY.done && DAILY.date === utcDate()) flash(T("dailyDone"));
  else if (m === "daily") flash(T("dealt"));
}
function pickJoker(idx) {
  if (phase !== "joker") return false;
  joker = jokerOffer[idx] || "";
  phase = "play";
  Sound.joker();
  renderJokers(); render(); renderHud();
  return true;
}

// ---- removal + scoring ----
function pairScore(a, b) {    // 100 per pair / 50 king solo; goldbase doubles bottom-row pairs
  var solo = a && a.rk === 13 && !b;
  var base = solo ? 50 : 100;
  if (joker === "goldbase" && !solo && ((a && a.r === 6) || (b && b.r === 6))) base *= 2;
  return base;
}
function removeAcc(a) {       // pyramid slot or waste pseudo-slot, with burst fx
  var el = document.querySelector('.card[data-id="' + a.id + '"]');
  var rect = el ? el.getBoundingClientRect() : null;
  if (a.isWaste) waste.pop();
  else a.removed = true;
  if (rect) burstAt(rect.left + rect.width / 2, rect.top + rect.height / 2, a.rk === 13 ? "K" : String(a.rk));
}
function doRemovePair(a, b) {
  removeAcc(a); removeAcc(b);
  score += pairScore(a, b);
  pairs++; moves++; sel = null;
  Sound.pair();
  afterAction();
}
function doRemoveKing(a) {
  removeAcc(a);
  score += pairScore(a, null);
  pairs++; moves++; sel = null;
  Sound.king();
  afterAction();
}
function doHammer(slot) {
  hammerUsed = true; hammerArmed = false;
  removeAcc(slot);
  moves++; sel = null;
  Sound.hammer();
  afterAction();
}
function drawCard() {
  if (phase !== "play" || !stock.length) return false;
  waste.push(stock.pop());
  moves++; clockOn = true; sel = null;
  Sound.flip();
  afterAction();
  return true;
}
function recycleStock() {
  if (phase !== "play" || stock.length || !waste.length) return false;
  if (cycles >= maxCycles()) { flash(T("noCycles")); Sound.invalid(); return false; }
  cycles++;
  while (waste.length) stock.push(waste.pop());
  score = Math.max(0, score - 200);
  moves++; clockOn = true; sel = null;
  Sound.cycle();
  flash(T("recycle"));
  afterAction();
  return true;
}

// ---- selection entry points (pointer taps + keyboard Enter share these) ----
function selAcc() {
  if (!sel) return null;
  if (sel.where === "pyr") return slotById(sel.id);
  return wasteAcc();
}
function tapSlot(slot) {
  if (phase !== "play") return;
  if (hammerArmed && joker === "hammer" && !hammerUsed) { doHammer(slot); return; }
  if (!isExposed(slot)) { badSlot(slot.id); return; }
  if (slot.rk === 13) { doRemoveKing(slot); return; }
  var other = selAcc();
  if (other && sel.where === "pyr" && other.id === slot.id) { sel = null; render(); return; }  // toggle off
  if (other && sumsOK(other.rk, slot.rk)) { doRemovePair(other, slot); return; }
  sel = { where: "pyr", id: slot.id };
  Sound.select();
  render();
}
function tapWaste() {
  if (phase !== "play") return;
  var top = wasteAcc();
  if (!top) return;
  if (top.rk === 13) { doRemoveKing(top); return; }               // kings walk alone from waste too
  if (sel && sel.where === "waste") { sel = null; render(); return; }
  var other = selAcc();
  if (other && sumsOK(other.rk, top.rk)) { doRemovePair(other, top); return; }
  sel = { where: "waste" };
  Sound.select();
  render();
}
function tapStock() {
  if (phase !== "play") return;
  if (stock.length) { drawCard(); return; }
  recycleStock();
}

// ---- end detection ----
function anyMove() {
  if (phase !== "play") return false;
  var list = accessible();
  for (var a = 0; a < list.length; a++)
    for (var b = a + 1; b < list.length; b++)
      if (sumsOK(list[a].rk, list[b].rk)) return true;
  for (var k = 0; k < list.length; k++) if (list[k].rk === 13) return true;   // kings walk alone
  if (stock.length) return true;                                              // drawing is a move
  if (waste.length && cycles < maxCycles()) return true;                      // recycle is a move
  if (joker === "hammer" && !hammerUsed && pyramidLeft() > 0) return true;
  return false;
}
function afterAction() {
  render(); renderHud();
  checkRows();
  if (phase === "play") {
    if (pyramidLeft() === 0) finish(true);
    else if (!anyMove()) finish(false);
  }
}
function checkRows() {
  var clearedRow = -1;
  for (var r = 0; r < 6; r++) {
    var any = false;
    for (var k = 0; k < pyr.length; k++) if (pyr[k].r === r && !pyr[k].removed) { any = true; break; }
    if (!any && !rowEmpty[r]) { rowEmpty[r] = true; clearedRow = r; }
  }
  if (clearedRow >= 0) { Sound.rowClear(); flashRow(clearedRow); }
}

// ---- finish + persistence (six keys, written on every game end) ----
var lastResult = null;
function finish(cleared) {
  phase = cleared ? "clear" : "over";
  clockOn = false;
  if (cleared) score += 1000;
  var rk = rankOf(score), gap = nextRankGap(score);
  var isBest = score > (BEST.score || 0);
  if (isBest) BEST = { score: score, pairs: pairs, date: utcDate() };
  TOP10.push({ score: score, pairs: pairs, date: utcDate(), seed: seedStr });
  TOP10.sort(function (x, y) { return y.score - x.score; });
  if (TOP10.length > 10) TOP10.length = 10;
  if (mode === "daily") {
    if (DAILY.date !== utcDate()) DAILY = { date: utcDate(), score: score, done: true };
    else { DAILY.score = Math.max(DAILY.score || 0, score); DAILY.done = true; }
    if (pairs >= 1) bumpStreak();
  }
  STATS.games++; STATS.pairs += pairs; STATS.bestPairs = Math.max(STATS.bestPairs || 0, pairs);
  if (cleared) STATS.clears++;
  var wk = isoWeek();
  if (WEEKLY.weekKey !== wk) WEEKLY = { weekKey: wk, best: { score: score, pairs: pairs, date: utcDate() } };
  else if (score > (WEEKLY.best.score || 0)) WEEKLY.best = { score: score, pairs: pairs, date: utcDate() };
  putJSON(K_BEST, BEST); putJSON(K_TOP10, TOP10); putJSON(K_DAILY, DAILY);
  putJSON(K_STREAK, STREAK); putJSON(K_STATS, STATS); putJSON(K_WEEKLY, WEEKLY);
  lastResult = { cleared: cleared, rank: rk.key, gap: gap, isBest: isBest, score: score, pairs: pairs };
  if (cleared) { Sound.win(); confetti(); }
  else Sound.over();
  render(); renderHud();
  var show = function () { showPanel(cleared, rk, gap, isBest); };
  if (window.__qaFreeze) show();
  else setTimeout(show, cleared ? 900 : 550);
}
function showPanel(cleared, rk, gap, isBest) {
  var el = function (id) { return document.getElementById(id); };
  el("wpTitle").textContent = cleared ? T("clearT") : T("overT");
  el("wpTitle").className = cleared ? "gold" : "";
  el("wpStars").textContent = rk.emoji + " " + T("rank_" + rk.key) + (isBest ? " · " + T("newBest") : "");
  el("wpStars").className = isBest ? "sweep" : "";
  el("wpRows").innerHTML =
    "<div><span>" + T("scoreL") + "</span><b>" + score + "</b></div>" +
    "<div><span>" + T("pairsL") + "</span><b>" + pairs + "</b></div>" +
    "<div><span>" + T("cycleL") + "</span><b>" + cycles + "</b></div>" +
    "<div><span>" + T("bestL") + "</span><b>" + (BEST.score || 0) + "</b></div>" +
    "<p class='note'>" + (gap !== null ? (gap + " " + T("nextRankL")) : T("topRankL")) + " · " +
    T(cleared ? "clearNote" : "overNote") + "</p>";
  el("wpShare").textContent = T("share");
  el("wpNew").textContent = T("again");
  el("winPanel").classList.remove("hide");
}
function hidePanel() { var p = document.getElementById("winPanel"); if (p) p.classList.add("hide"); }

// ---- share card (canvas + Web Share -> clipboard fallback) ----
function shareText(cleared) {
  var rk = rankOf(score);
  var zh = typeof npLang === "function" && npLang() === "zh";
  var url = "https://seyrs1985.github.io/neonplay/neon-pyramid/";
  var head = cleared ? "🔺 PHARAOH CLEAR" + (zh ? " 全塔清空！" : "! ") : "🔺 Neon Pyramid ";
  var mid = zh ? (mode === "daily" ? "每日发牌 " : "") + score + " 分（" + pairs + " 对）"
               : (mode === "daily" ? "daily deal " : "") + score + " pts (" + pairs + " pairs) ";
  return head + mid + rk.emoji + T("rank_" + rk.key) + " | " + url;
}
function shareCard(cleared) {
  var cv = document.getElementById("shareCard");
  cv.width = 640; cv.height = 320;
  var g = cv.getContext("2d");
  if (!g) return null;
  g.fillStyle = "#0a0a18"; g.fillRect(0, 0, 640, 320);
  g.strokeStyle = "#ffd54a"; g.lineWidth = 3;                       // dark-gold pyramid silhouette
  g.beginPath(); g.moveTo(320, 26); g.lineTo(452, 240); g.lineTo(188, 240); g.closePath(); g.stroke();
  g.strokeStyle = "#ffd54a55"; g.lineWidth = 1.5;
  [0.33, 0.66].forEach(function (f) {
    g.beginPath();
    g.moveTo(320 + (452 - 320) * f, 26 + (240 - 26) * f);
    g.lineTo(320 + (188 - 320) * f, 26 + (240 - 26) * f);
    g.stroke();
  });
  g.textAlign = "center";
  g.fillStyle = "#ffd54a"; g.font = "700 44px system-ui, sans-serif";
  g.fillText(String(score), 320, 118);
  g.fillStyle = "#8fa1cc"; g.font = "16px system-ui, sans-serif";
  g.fillText((cleared ? "PHARAOH CLEAR · " : "") + pairs + " pairs · " + rankOf(score).emoji + " " +
    T("rank_" + rankOf(score).key) + " · " + utcDate(), 320, 154);
  g.fillStyle = "#00e5ff"; g.font = "14px system-ui, sans-serif";
  g.fillText("seyrs1985.github.io/neonplay/neon-pyramid", 320, 286);
  return cv;
}

// ---- juice ----
function burstAt(x, y, label) {
  var b = document.createElement("span");
  b.className = "burst";
  b.textContent = label;
  b.style.left = x + "px"; b.style.top = y + "px";
  document.body.appendChild(b);
  setTimeout(function () { b.remove(); }, 900);
  for (var i = 0; i < 7; i++) {
    var p = document.createElement("span");
    p.className = "spark";
    p.style.left = x + "px"; p.style.top = y + "px";
    p.style.setProperty("--dx", ((Math.random() - .5) * 120).toFixed(0) + "px");
    p.style.setProperty("--dy", ((Math.random() - .7) * 110).toFixed(0) + "px");
    p.style.background = ["#ffd54a", "#00e5ff", "#ff2d95", "#7c4dff"][(Math.random() * 4) | 0];
    document.body.appendChild(p);
    (function (el) { setTimeout(function () { el.remove(); }, 800); })(p);
  }
}
function confetti() {
  var cols = ["#ffd54a", "#00e5ff", "#ff2d95", "#7c4dff", "#39ff88"];
  for (var i = 0; i < 44; i++) {
    var f = document.createElement("span"); f.className = "cf";
    f.style.left = (Math.random() * 100) + "%";
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty("--dx", ((Math.random() - .5) * 90).toFixed(0) + "px");
    f.style.animationDelay = (Math.random() * .5).toFixed(2) + "s";
    document.body.appendChild(f);
    (function (el) { setTimeout(function () { el.remove(); }, 2200); })(f);
  }
}
function flash(text) {
  var m = document.getElementById("msg");
  if (!m) return;
  m.textContent = text; m.className = "show";
  clearTimeout(flash._t);
  flash._t = setTimeout(function () { m.className = ""; }, 2200);
}
function flashRow(r) {
  var host = document.getElementById("board");
  if (!host) return;
  var strip = document.createElement("div");
  strip.className = "rowflash";
  strip.textContent = "— ROW " + (r + 1) + " —";
  host.appendChild(strip);
  setTimeout(function () { strip.remove(); }, 1100);
}
function badSlot(id) {
  var el = document.querySelector('.card[data-id="' + id + '"]');
  if (el) {
    el.classList.remove("shake");
    void el.offsetWidth;
    el.classList.add("shake");
  }
  Sound.invalid();
}

// ---- layout + render (DOM cards; 375x667 first screen, no scroll) ----
var CW = 48, CH = 68, ROWSTEP = 38, GX = 3;
function layout() {
  var stage = document.getElementById("stage");
  var w = stage.clientWidth || 375;
  GX = Math.max(2, Math.min(5, w * 0.008));
  CW = Math.floor((w - 12 - 6 * GX) / 7);
  CW = Math.max(26, Math.min(CW, 72));
  CH = Math.round(CW * 1.38);
  var wrap = document.getElementById("pyrwrap");
  var board = document.getElementById("board");
  var pyrH = wrap ? wrap.clientHeight : (board ? board.clientHeight - (CH + 42) : 480);
  pyrH = Math.max(120, pyrH);
  var step = Math.round(CH * 0.55);
  if (CH + 6 * step > pyrH) {            // shrink cards first, then compress the step
    CH = Math.max(40, Math.floor(pyrH / 4.35));
    CW = Math.min(CW, Math.round(CH / 1.38));
    step = Math.max(12, Math.floor((pyrH - CH) / 6));
  }
  ROWSTEP = step;
  document.documentElement.style.setProperty("--cw", CW + "px");
  document.documentElement.style.setProperty("--ch", CH + "px");
}
function cardFace(el, s, rk) {
  el.innerHTML = '<span class="cr">' + RANKS[rk - 1] + '</span>' +
    '<span class="cs">' + SUITS[s] + '</span>' +
    '<span class="cr b">' + RANKS[rk - 1] + '</span>';
  el.classList.add(isRed(s) ? "red" : "dark");
  el.setAttribute("aria-label", RANKS[rk - 1] + " " + SUITS[s]);
}
function slotPos(slot) {
  var host = document.getElementById("pyr");
  var w = host.clientWidth || 360;
  var spacing = CW + GX;
  return {
    x: Math.round(w / 2 + (slot.i - slot.r / 2) * spacing - CW / 2),
    y: slot.r * ROWSTEP
  };
}
function render() {
  layout();
  var host = document.getElementById("pyr");
  host.innerHTML = "";
  for (var k = 0; k < pyr.length; k++) {
    var slot = pyr[k];
    if (slot.removed) continue;
    var p = slotPos(slot);
    var el = document.createElement("div");
    el.className = "card pyrcard " + (isExposed(slot) ? "exp " : "cov ");
    el.dataset.id = slot.id;
    el.dataset.r = slot.r; el.dataset.i = slot.i;
    el.style.left = p.x + "px"; el.style.top = p.y + "px";
    el.style.zIndex = String(20 + (6 - slot.r));      // upper rows paint over lower
    cardFace(el, slot.s, slot.rk);
    if (sel && sel.where === "pyr" && sel.id === slot.id) el.classList.add("sel");
    if (hammerArmed) el.classList.add("hammerable");
    if (kbOn && kbFocus && kbFocus.where === "pyr" && kbFocus.id === slot.id) el.classList.add("kbf");
    host.appendChild(el);
  }
  // stock pile (+ x-ray peek)
  var stockEl = document.getElementById("stock");
  stockEl.innerHTML = "";
  var ph = document.createElement("div");
  ph.className = "ph phS";
  ph.dataset.zone = "stock";
  ph.setAttribute("role", "button");
  ph.setAttribute("aria-label", "stock");
  ph.textContent = stock.length ? String(stock.length) : (waste.length && cycles < maxCycles() ? "↻" : "·");
  stockEl.appendChild(ph);
  if (stock.length) {
    var back = document.createElement("div");
    back.className = "card down stockcard";
    stockEl.appendChild(back);
  }
  var xr = document.getElementById("xray");
  if (joker === "xray" && stock.length) {
    var next3 = stock.slice(-3).reverse().map(function (c) { return RANKS[c.r - 1]; });
    xr.textContent = T("xrayNext") + ": " + next3.join(" ");
    xr.classList.remove("hide");
  } else xr.classList.add("hide");
  // waste (top 3 fanned)
  var wasteEl = document.getElementById("waste");
  wasteEl.innerHTML = "";
  if (!waste.length) {
    var pw = document.createElement("div");
    pw.className = "ph phW";
    pw.dataset.zone = "waste";
    wasteEl.appendChild(pw);
  } else {
    var start = Math.max(0, waste.length - 3);
    for (var q = start; q < waste.length; q++) {
      var c2 = waste[q];
      var el2 = document.createElement("div");
      el2.className = "card up wastecard " + (isRed(c2.s) ? "red" : "dark") +
        (q < waste.length - 1 ? " under" : "");
      el2.dataset.id = c2.id;
      el2.dataset.zone = "waste";
      cardFace(el2, c2.s, c2.r);
      if (q > start) el2.style.left = ((q - start) * Math.round(CW * 0.34)) + "px";
      if (sel && sel.where === "waste" && q === waste.length - 1) el2.classList.add("sel");
      if (kbOn && kbFocus && kbFocus.where === "waste" && q === waste.length - 1) el2.classList.add("kbf");
      wasteEl.appendChild(el2);
    }
  }
}
var kbFocus = null;   // {where:'pyr',id} | {where:'waste'} | {where:'stock'} (set by main.js)
var kbOn = false;

function renderJokers() {
  var panel = document.getElementById("jokerPanel");
  if (phase !== "joker") { panel.classList.add("hide"); return; }
  panel.classList.remove("hide");
  var host = document.getElementById("jokerList");
  host.innerHTML = "";
  jokerOffer.forEach(function (jid, idx) {
    var names = TJ(jid);
    var b = document.createElement("button");
    b.className = "jokercard";
    b.dataset.joker = jid;
    b.innerHTML = '<span class="jicon">' + (JOKER_ICONS[jid] || "🃏") + '</span>' +
      '<span class="jname">' + names[0] + '</span>' +
      '<span class="jdesc">' + names[1] + '</span>';
    b.addEventListener("click", function () { pickJoker(idx); });
    host.appendChild(b);
  });
}
function renderHud() {
  document.getElementById("v-score").textContent = score;
  document.getElementById("v-pairs").textContent = pairs;
  document.getElementById("v-stock").textContent = stock.length;
  var dots = "";
  for (var i = 0; i < maxCycles(); i++) dots += i < cycles ? "●" : "○";
  document.getElementById("v-cycles").textContent = dots;
  var rk = rankOf(score);
  document.getElementById("rankChip").textContent = rk.emoji + " " + T("rank_" + rk.key);
  document.getElementById("streak").textContent = "🔥 " + (STREAK.count || 0);
  var hb = document.getElementById("hammerBtn");
  hb.classList.toggle("hide", !(joker === "hammer" && !hammerUsed && phase === "play"));
  hb.classList.toggle("armed", hammerArmed);
  hb.title = hammerArmed ? T("hammerArm") : T("jk_hammer");
  var jc = document.getElementById("jokerChip");
  if (joker) {
    jc.classList.remove("hide");
    jc.textContent = (JOKER_ICONS[joker] || "🃏") + " " + TJ(joker)[0];
  } else jc.classList.add("hide");
}

// ---- QA hooks ----
window.__qaState = function () {
  return {
    phase: phase, mode: mode, seed: seedStr, score: score, pairs: pairs, moves: moves,
    cycles: cycles, maxCycles: maxCycles(), joker: joker, jokersOffered: jokerOffer.slice(),
    hammerArmed: hammerArmed, hammerUsed: hammerUsed, sel: sel,
    pyramid: pyr.map(function (s) {
      return { r: s.r, i: s.i, id: s.id, rk: s.rk, removed: s.removed, exposed: isExposed(s) };
    }),
    pyramidLeft: pyramidLeft(), anyMove: anyMove(),
    stock: stock.map(function (c) { return c.id; }),
    waste: waste.map(function (c) { return c.id; }),
    rank: rankOf(score).key, nextGap: nextRankGap(score),
    best: BEST, top10: TOP10, daily: DAILY,
    streak: { count: STREAK.count, last: STREAK.last, best: STREAK.best, protect: STREAK.protect },
    stats: STATS, weekly: WEEKLY,
    panelShown: (function () { var p = document.getElementById("winPanel"); return p && !p.classList.contains("hide"); })(),
    lastResult: lastResult
  };
};
window.__qaRender = function () { render(); renderHud(); };
window.__qaFreeze = false;
window.__qa = {
  newGame: function (m, seed) { newGame(m || "rand", seed); },
  deal: function (m, seed) { newGame(m || "daily", seed); },       // design acceptance name
  rig: function (spec, m) {
    mode = m || "rand";
    seedStr = "rig";
    hidePanel();
    pyr = [];
    var rows = spec.rows || [];
    for (var r = 0; r < rows.length; r++)
      for (var i = 0; i < rows[r].length; i++) {
        var c = mkCard(rows[r][i]);
        pyr.push({ r: r, i: i, s: c.s, rk: c.r, id: c.id, removed: false });
      }
    stock = (spec.stock || []).map(function (id) { return mkCard(id); });
    waste = (spec.waste || []).map(function (id) { return mkCard(id); });
    joker = spec.joker || ""; jokerOffer = spec.offer ? spec.offer.slice() : offerFor(mode);
    hammerUsed = false; hammerArmed = false;
    sel = null; score = spec.score || 0; pairs = spec.pairs || 0; moves = 0;
    cycles = spec.cycles || 0; sec = 0; clockOn = false;
    rowEmpty = [false, false, false, false, false, false, false];
    phase = spec.phase || "play";
    lastResult = null;
    renderJokers(); render(); renderHud();
  },
  pickJoker: function (i) { return pickJoker(i); },
  tapCard: function (id) {
    var el = document.querySelector('.card[data-id="' + id + '"]');
    if (el) {
      el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
      el.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 0, clientY: 0 }));
    }
  },
  tapStock: function () {
    var el = document.querySelector('[data-zone="stock"]');
    if (el) {
      el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
      el.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 0, clientY: 0 }));
    }
  },
  tapWaste: function () {
    var el = document.querySelector('#waste .card') || document.querySelector('[data-zone="waste"]');
    if (el) {
      el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
      el.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 0, clientY: 0 }));
    }
  },
  armHammer: function () { hammerArmed = !hammerArmed; renderHud(); render(); },
  autoPlay: function () {   // greedy solver: kings, pyramid pairs, waste pairs, hammer, draw, recycle
    var guard = 0;
    if (phase === "joker") pickJoker(0);
    while (phase === "play" && guard++ < 900) {
      var list = accessible(), done = false, a, b;
      for (a = 0; a < list.length && !done; a++)
        if (list[a].rk === 13) { doRemoveKing(list[a]); done = true; }
      if (done) continue;
      for (a = 0; a < list.length && !done; a++)
        for (b = a + 1; b < list.length && !done; b++)
          if (!list[a].isWaste && !list[b].isWaste && sumsOK(list[a].rk, list[b].rk)) {
            doRemovePair(list[a], list[b]); done = true;
          }
      if (done) continue;
      for (a = 0; a < list.length && !done; a++)
        for (b = a + 1; b < list.length && !done; b++)
          if (sumsOK(list[a].rk, list[b].rk)) { doRemovePair(list[a], list[b]); done = true; }
      if (done) continue;
      if (joker === "hammer" && !hammerUsed && pyramidLeft() > 0) {
        var cov = null;
        for (var k = 0; k < pyr.length; k++) if (!pyr[k].removed && !isExposed(pyr[k])) { cov = pyr[k]; break; }
        if (cov) { doHammer(cov); continue; }
      }
      if (stock.length) { drawCard(); continue; }
      if (waste.length && cycles < maxCycles()) { recycleStock(); continue; }
      break;                                   // stuck -> settle below
    }
    if (phase === "play" && !anyMove()) finish(false);
    return { phase: phase, pairs: pairs, score: score };
  }
};
