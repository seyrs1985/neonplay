/* Neon Fairway — golf solitaire core (design: neon-fairway.md).
 * 7x5 field of 35 cards + 17-card stock in two piles; play any field card
 * that is +/-1 in rank from the waste top; Jokers (pick 1 of 3) bend the
 * rules; chained plays (no stock flip) ride a x1..x5 multiplier. */
'use strict';

/* ---------------- i18n ---------------- */
var L = {
  en: {
    daily: "Daily", practice: "Practice", score: "Score", chain: "Chain", cleared: "Cleared",
    stock: "Stock", waste: "Waste", flip: "Flip", noPlay: "No plays — flip the stock",
    dailyDone: "Daily done ✓ best is on the board", jpTitle: "Pick your Joker",
    jpSub: "One rule modifier for this round — same deal, different build",
    soon: "Coming soon", epClear: "COURSE CLEAR", epOver: "OUT OF PLAY",
    epScore: "Score", epCleared: "Cleared", epChain: "Best chain", epJoker: "Joker",
    epBonus: "Bonuses", share: "Share result", copied: "Copied ✓", again: "New round",
    best0: "Best —", streakLbl: "streak", tierLbl: "Rank", next: "{n} pts to {t}",
    toPlay: "Tap a glowing card (±1 rank) · D flips · R restarts"
  },
  zh: {
    daily: "每日发牌", practice: "练习", score: "分数", chain: "连击", cleared: "清牌",
    stock: "库存", waste: "弃牌堆", flip: "翻牌", noPlay: "无可打的牌——翻一张库存",
    dailyDone: "今日已完成 ✓ 最优分已上榜", jpTitle: "选择你的 Joker",
    jpSub: "本局的规则修正器——同一副牌，不同构筑",
    soon: "即将推出", epClear: "全清球道！", epOver: "无路可打",
    epScore: "分数", epCleared: "清牌", epChain: "最长连击", epJoker: "Joker",
    epBonus: "奖励", share: "分享战绩", copied: "已复制 ✓", again: "再来一局",
    best0: "最佳 —", streakLbl: "连胜", tierLbl: "段位", next: "再得 {n} 分升 {t}",
    toPlay: "点发光的牌（点数 ±1）· D 翻库 · R 重开"
  }
};
function T(k) { return npT(L, k); }

/* ---------------- data ---------------- */
var RANK_TXT = ["", "A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
var SUIT_TXT = ["♠", "♥", "♣", "♦"];
var JOKERS = [
  { id: "wrap", impl: true, icon: "♻️",
    en: { n: "Wraparound", d: "A and K connect — play A on K and K on A." },
    zh: { n: "环回", d: "A 与 K 互通——A 可接 K，K 可接 A。" } },
  { id: "chain", impl: true, icon: "🔥",
    en: { n: "Chain Master", d: "Combo multiplier cap rises from ×5 to ×7.5." },
    zh: { n: "连锁大师", d: "连击倍率上限从 ×5 提升到 ×7.5。" } },
  { id: "deep", impl: true, icon: "⛏️",
    en: { n: "Deep Stock", d: "+6 extra stock cards from the spare deck." },
    zh: { n: "深部库存", d: "从备用牌堆追加 6 张库存。" } },
  { id: "xray", impl: false, icon: "👁️",
    en: { n: "X-Ray", d: "Preview the top card of both stock piles." },
    zh: { n: "X 光", d: "预览两摞库存的顶牌。" } },
  { id: "revive", impl: false, icon: "🪄",
    en: { n: "Revive", d: "One-time undo of a stock flip." },
    zh: { n: "复活", d: "一次性撤销一次翻库。" } },
  { id: "king", impl: false, icon: "👑",
    en: { n: "King's Amnesty", d: "J, Q and K may stack on each other once." },
    zh: { n: "国王特赦", d: "J/Q/K 可互相叠打一次。" } }
];
function jokerById(id) { for (var i = 0; i < JOKERS.length; i++) if (JOKERS[i].id === id) return JOKERS[i]; return null; }
function jokerName(j) { var d = npLang() === "zh" ? j.zh : j.en; return d.n; }
function jokerDesc(j) { var d = npLang() === "zh" ? j.zh : j.en; return d.d; }
var TIERS = [
  { min: 1800, key: "legend", emoji: "🏆", en: "Legend", zh: "传奇" },
  { min: 1600, key: "master", emoji: "🥇", en: "Master", zh: "大师" },
  { min: 1400, key: "diamond", emoji: "💎", en: "Diamond", zh: "钻石" },
  { min: 1250, key: "platinum", emoji: "🥈", en: "Platinum", zh: "白金" },
  { min: 1000, key: "gold", emoji: "🟡", en: "Gold", zh: "黄金" },
  { min: 750, key: "silver", emoji: "⚪", en: "Silver", zh: "白银" },
  { min: 0, key: "bronze", emoji: "🟤", en: "Bronze", zh: "青铜" }
];
function tierOf(score) { for (var i = 0; i < TIERS.length; i++) if (score >= TIERS[i].min) return TIERS[i]; return TIERS[TIERS.length - 1]; }
function tierLabel(t) { return t.emoji + " " + (npLang() === "zh" ? t.zh : t.en); }
function nextTierGap(score) { for (var i = TIERS.length - 2; i >= 0; i--) if (score < TIERS[i].min) return { n: TIERS[i].min - score, t: TIERS[i] }; return null; }

/* ---------------- rng ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function strSeed(s) {
  var h = 2166136261;
  s = String(s);
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/* ---------------- persistence (design doc key list) ---------------- */
var PFX = "np_neon-fairway_";
function loadKey(k, def) {
  try { var v = JSON.parse(localStorage.getItem(PFX + k) || "null"); return v === null ? def : v; }
  catch (e) { return def; }
}
function saveKey(k, v) { try { localStorage.setItem(PFX + k, JSON.stringify(v)); } catch (e) {} }
var best = loadKey("best", null);                                  // {score,cleared,date}
var top10 = loadKey("top10", []);                                  // [{score,cleared,joker,date}]
var daily = loadKey("daily", { date: "", score: 0, done: false }); // {date,score,done}
var streak = loadKey("streak", { count: 0, last: "", best: 0, protect: 1, month: "" });
var stats = loadKey("stats", { games: 0, clears: 0, bestChain: 0, scoreTotal: 0 });
var weekly = loadKey("weekly", { weekKey: "", best: null });

/* ---------------- utc date helpers ---------------- */
function utcStr(offDays) {
  var d = new Date(Date.now() + (offDays || 0) * 86400000);
  return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2);
}
function utcSeed() {
  var d = new Date();
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}
function utcMonth() { return utcStr().slice(0, 7); }
function isoWeekKey() {
  var t = new Date();
  t = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate()));
  var day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  var ft = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  var fd = (ft.getUTCDay() + 6) % 7;
  ft.setUTCDate(ft.getUTCDate() - fd + 3);
  var wk = 1 + Math.round((t - ft) / (7 * 86400000));
  return t.getUTCFullYear() + "-W" + (wk < 10 ? "0" : "") + wk;
}

/* ---------------- game state ---------------- */
var mode = "daily";         // 'daily' | 'practice'
var state = "joker";        // 'joker' | 'playing' | 'over'
var seed = 0, field = [], stockA = [], stockB = [], extra6 = [], waste = [];
var offer = [], joker = null;
var chain = 0, mult = 1, multCap = 5, score = 0, cleared = 0, bestChain = 0, clearedAll = false;
var playable = [];

function fmtMult(m) { return "×" + (Math.round(m * 10) / 10); }
function curMult() { return Math.min(1 + Math.max(chain - 1, 0) * 0.5, multCap); }

function startGame(m, seedInt) {
  mode = m || mode;
  seed = (typeof seedInt === "number" && isFinite(seedInt)) ? (seedInt >>> 0)
        : (mode === "daily" ? utcSeed() : (Math.random() * 0xFFFFFFFF) >>> 0);
  var rng = mulberry32(seed);
  var deck = [];
  for (var r = 1; r <= 13; r++) for (var s = 0; s < 4; s++) deck.push({ r: r, s: s });
  for (var i = deck.length - 1; i > 0; i--) { var j = (rng() * (i + 1)) | 0; var t = deck[i]; deck[i] = deck[j]; deck[j] = t; }
  field = deck.slice(0, 35);
  var stock = deck.slice(35);                       // 17 cards
  stockB = stock.slice(0, 8);                       // bottom pile (flips second)
  stockA = stock.slice(8);                          // top pile (flips first)
  extra6 = [];                                      // deep-stock spare cards, same seed stream
  for (var e = 0; e < 6; e++) extra6.push({ r: 1 + ((rng() * 13) | 0), s: (rng() * 4) | 0 });
  offer = makeOffer(rng);
  waste = [];
  chain = 0; mult = 1; multCap = 5; score = 0; cleared = 0; bestChain = 0; clearedAll = false;
  joker = null; state = "joker";
  flipInitial();
  document.getElementById("endPanel").classList.add("hide");
  document.getElementById("jokerPanel").classList.remove("hide");
  renderJokerPanel();
  renderAll();
}
function makeOffer(rng) {
  var idx = [0, 1, 2, 3, 4, 5];
  for (var i = idx.length - 1; i > 0; i--) { var j = (rng() * (i + 1)) | 0; var t = idx[i]; idx[i] = idx[j]; idx[j] = t; }
  var off = idx.slice(0, 3);
  var impl = off.filter(function (x) { return JOKERS[x].impl; }).length;
  if (impl < 2) {
    var pool = [0, 1, 2, 3, 4, 5].filter(function (x) { return JOKERS[x].impl && off.indexOf(x) < 0; });
    for (var k = off.length - 1; k >= 0 && impl < 2; k--) {
      if (!JOKERS[off[k]].impl) { off[k] = pool.shift(); impl++; }
    }
  }
  return off;
}
function flipInitial() { if (stockA.length) waste.push(stockA.pop()); }

function pickJoker(id) {
  var j = jokerById(id);
  if (state !== "joker" || !j) return false;
  joker = j;
  if (j.id === "chain") multCap = 7.5;
  if (j.id === "deep") { for (var i = 0; i < extra6.length; i++) stockB.unshift(extra6[i]); }
  state = "playing";
  document.getElementById("jokerPanel").classList.add("hide");
  Sound.joker();
  renderAll();
  return true;
}

function canPlay(c) {
  if (!waste.length) return false;
  return rankAdjacent(waste[waste.length - 1].r, c.r, joker && joker.id === "wrap");
}
function rankAdjacent(top, r, wrap) {   // pure rule: +/-1, A<->K only under Wraparound
  if (Math.abs(top - r) === 1) return true;
  return !!wrap && ((top === 13 && r === 1) || (top === 1 && r === 13));
}
function computePlayable() {
  playable = [];
  if (state !== "playing") return;
  for (var i = 0; i < field.length; i++) if (canPlay(field[i])) playable.push(i);
}

function playCard(i) {
  if (state !== "playing" || i < 0 || i >= field.length) return false;
  var c = field[i];
  if (!canPlay(c)) {
    Sound.deny();
    var el = cardEl(i);
    if (el) { el.classList.add("shake"); setTimeout(function () { el.classList.remove("shake"); }, 320); }
    return false;
  }
  var fromEl = cardEl(i), fromRect = fromEl && fromEl.getBoundingClientRect();
  field.splice(i, 1);
  waste.push(c);
  chain++;
  if (chain > bestChain) bestChain = chain;
  var newMult = curMult();
  var leveled = newMult > mult;
  mult = newMult;
  var pts = Math.round(10 * mult);
  score += pts;
  cleared++;
  Sound.collect(chain);
  if (leveled) { Sound.chain(); comboBanner(fmtMult(mult) + (mult >= multCap ? " MAX" : "")); }
  if (fromRect) { flyCard(c, fromRect); sparks(fromRect); }
  if (field.length === 0) { endRound(true); return true; }
  computePlayable();
  checkDeadEnd();
  renderAll();
  return true;
}
function flipStock(which) {
  if (state !== "playing") return false;
  var pile = which === "B" ? stockB : stockA;
  if (which !== "B" && which !== "A") pile = stockA.length ? stockA : stockB;   // auto: A first
  if (!pile.length) {
    if (which === "auto" || !which) return false;
    Sound.deny();
    return false;
  }
  waste.push(pile.pop());
  chain = 0; mult = 1;
  Sound.flip();
  computePlayable();
  checkDeadEnd();
  renderAll();
  return true;
}
function checkDeadEnd() {
  if (state === "playing" && playable.length === 0 && !stockA.length && !stockB.length) endRound(false);
}

function endRound(allClear) {
  state = "over";
  clearedAll = allClear;
  var stockLeft = stockA.length + stockB.length;
  var bonus = (allClear ? 500 : 0) + stockLeft * 20;
  score += bonus;
  var prevBest = best ? best.score : 0;
  var newBest = score > prevBest;
  // persistence — every finished round
  stats.games++; stats.scoreTotal += score;
  if (bestChain > stats.bestChain) stats.bestChain = bestChain;
  if (allClear) stats.clears++;
  saveKey("stats", stats);
  if (!best || score > best.score) { best = { score: score, cleared: cleared, date: utcStr() }; saveKey("best", best); }
  top10.push({ score: score, cleared: cleared, joker: joker ? joker.id : "", date: utcStr() });
  top10.sort(function (a, b) { return b.score - a.score; });
  if (top10.length > 10) top10.length = 10;
  saveKey("top10", top10);
  var wk = isoWeekKey();
  if (weekly.weekKey !== wk || !weekly.best || score > weekly.best.score) weekly = { weekKey: wk, best: { score: score, cleared: cleared, date: utcStr() } };
  saveKey("weekly", weekly);
  if (mode === "daily") { updateDaily(); }
  renderAll();
  showEndPanel(bonus, stockLeft, newBest);
  if (allClear) { Sound.win(); confetti(); }
  else Sound.dead();
  if (newBest) confetti();
}
function updateDaily() {
  var today = utcStr();
  if (daily.date !== today || score > (daily.score || 0)) {
    daily = { date: today, score: Math.max(score, daily.date === today ? daily.score || 0 : 0), done: true };
    saveKey("daily", daily);
  }
  daily.done = true;
  if (streak.month !== utcMonth()) { streak.month = utcMonth(); streak.protect = 1; }
  if (streak.last !== today) {
    if (streak.last === utcStr(-1)) streak.count += 1;
    else if (streak.count > 0 && streak.last === utcStr(-2) && streak.protect > 0) { streak.protect -= 1; streak.count += 1; }
    else streak.count = 1;
    if (streak.count > streak.best) streak.best = streak.count;
    streak.last = today;
  }
  saveKey("streak", streak);
}

/* ---------------- rendering ---------------- */
var $ = function (id) { return document.getElementById(id); };
function cardEl(i) { return document.querySelector('.card[data-fi="' + i + '"]'); }
function cardFace(c, redCls) {
  return '<span class="rk">' + RANK_TXT[c.r] + '</span><span class="st">' + SUIT_TXT[c.s] + '</span>';
}
function isRed(c) { return c.s === 1 || c.s === 3; }

function renderField() {
  var g = $("field");
  g.innerHTML = "";
  for (var i = 0; i < 35; i++) {
    if (i < field.length) {
      var c = field[i];
      var b = document.createElement("button");
      b.type = "button";
      b.className = "card" + (isRed(c) ? " red" : "") + (playable.indexOf(i) >= 0 ? " ok" : "");
      b.dataset.fi = i;
      b.setAttribute("aria-label", RANK_TXT[c.r] + SUIT_TXT[c.s]);
      b.innerHTML = cardFace(c);
      b.addEventListener("click", (function (idx) { return function () { playCard(idx); }; })(i));
      g.appendChild(b);
    } else {
      var h = document.createElement("div");
      h.className = "card";
      h.style.visibility = "hidden";
      h.setAttribute("aria-hidden", "true");
      g.appendChild(h);
    }
  }
}
function renderBottom() {
  var w = $("waste");
  w.innerHTML = "";
  var start = Math.max(0, waste.length - 3);
  for (var i = start; i < waste.length; i++) {
    var c = waste[i];
    var d = document.createElement("div");
    d.className = "wcard" + (isRed(c) ? " red" : "");
    var off = (i - (waste.length - 3)) * 7 - 7;
    if (i < waste.length - 1) { d.style.transform = "rotate(" + ((i % 2 ? 1 : -1) * (4 + i)) + "deg)"; }
    d.innerHTML = cardFace(c);
    w.appendChild(d);
  }
  $("lbWaste").textContent = T("waste");
  $("lbFlip").textContent = T("flip") + " (D)";
  var a = $("stockA"), bEl = $("stockB");
  a.classList.toggle("empty", !stockA.length);
  bEl.classList.toggle("empty", !stockB.length);
  a.classList.toggle("on", !!stockA.length);
  bEl.classList.toggle("on", !stockA.length && !!stockB.length);
  a.innerHTML = '<span class="pileface">' + stockA.length + "</span>";
  bEl.innerHTML = '<span class="pileface">' + stockB.length + "</span>";
  a.disabled = !stockA.length;
  bEl.disabled = !stockB.length;
}
var lastMultShown = 1;
function renderHUD() {
  $("score").textContent = score.toLocaleString("en-US");
  var mf = $("multFlag");
  mf.textContent = fmtMult(mult);
  mf.classList.toggle("hot", mult >= multCap);
  if (mult !== lastMultShown) { mf.classList.remove("pop"); void mf.offsetWidth; mf.classList.add("pop"); }
  lastMultShown = mult;
  $("clearedCt").textContent = cleared + "/35";
  $("stockCt").textContent = stockA.length + stockB.length;
  var bestTxt = best ? T("best0").replace("—", best.score.toLocaleString("en-US")) : "";
  var tier = tierOf(score);
  var chip = daily.done && daily.date === utcStr() ? " · " + T("dailyDone") : "";
  $("tierChip").textContent = T("tierLbl") + " " + tierLabel(tier) + (best ? " · " + T("best0").replace("—", best.score.toLocaleString("en-US")) : "") + chip;
  var msg = $("msg");
  if (state === "playing") {
    if (playable.length === 0 && (stockA.length || stockB.length)) { msg.textContent = T("noPlay"); msg.className = "glow"; }
    else { msg.textContent = T("toPlay"); msg.className = ""; }
  } else if (state === "joker") { msg.textContent = ""; }
  else msg.textContent = "";
}
function renderTop() {
  $("streak").textContent = "🔥" + streak.count;
  $("tabDaily").classList.toggle("on", mode === "daily");
  $("tabPractice").classList.toggle("on", mode === "practice");
}
function renderJokerPanel() {
  $("jpTitle").textContent = T("jpTitle");
  $("jpSub").textContent = T("jpSub") + (mode === "daily" ? " · " + utcStr() : "");
  var box = $("jokerCards");
  box.innerHTML = "";
  offer.forEach(function (ji) {
    var j = JOKERS[ji];
    var b = document.createElement("button");
    b.type = "button";
    b.className = "jcard" + (j.impl ? "" : " locked");
    b.dataset.jid = j.id;
    b.innerHTML = '<span class="ji">' + j.icon + '</span><span class="jn">' + jokerName(j) +
      (j.impl ? "" : " 🔒") + '</span><span class="jd">' + (j.impl ? jokerDesc(j) : jokerDesc(j) + " — " + T("soon")) + "</span>";
    if (j.impl) b.addEventListener("click", function () { pickJoker(j.id); });
    else b.addEventListener("click", function () { Sound.deny(); });
    box.appendChild(b);
  });
}
function renderAll() {
  computePlayable();
  renderTop();
  renderHUD();
  renderField();
  renderBottom();
}

function showEndPanel(bonus, stockLeft, newBest) {
  var tier = tierOf(score);
  var gap = nextTierGap(score);
  $("epTitle").textContent = clearedAll ? T("epClear") : T("epOver");
  $("epNew").classList.toggle("hide", !newBest);
  var multAtBest = bestChain ? Math.min(1 + (bestChain - 1) * 0.5, multCap) : 1;
  $("epRows").innerHTML =
    '<div class="erow"><b>' + score.toLocaleString("en-US") + "</b><i>" + T("epScore") + "</i></div>" +
    '<div class="erow"><b>' + cleared + "/35</b><i>" + T("epCleared") + "</i></div>" +
    '<div class="erow"><b>' + fmtMult(multAtBest) + " (" + bestChain + ")</b><i>" + T("epChain") + "</i></div>" +
    '<div class="erow"><b>' + (joker ? joker.icon + " " + jokerName(joker) : "—") + "</b><i>" + T("epJoker") + "</i></div>";
  $("epTier").textContent = tierLabel(tier) +
    (clearedAll || stockLeft ? " · " + T("epBonus") + " +" + bonus : "") +
    (gap ? " · " + T("next").replace("{n}", gap.n).replace("{t}", tierLabel(gap.t)) : "");
  $("epShare").textContent = T("share");
  $("epAgain").textContent = T("again");
  $("endPanel").classList.remove("hide");
}

/* ---------------- fx ---------------- */
function flyCard(c, fromRect) {
  try {
    var wasteRect = $("waste").getBoundingClientRect();
    var el = document.createElement("div");
    el.className = "flycard" + (isRed(c) ? " red" : "");
    el.innerHTML = cardFace(c);
    el.style.left = fromRect.left + "px";
    el.style.top = fromRect.top + "px";
    document.body.appendChild(el);
    requestAnimationFrame(function () {
      el.style.left = (wasteRect.left + wasteRect.width / 2 - 26) + "px";
      el.style.top = wasteRect.top + "px";
      el.style.transform = "rotate(" + ((Math.random() * 10) - 5) + "deg) scale(.9)";
    });
    setTimeout(function () { el.remove(); }, 380);
  } catch (e) {}
}
function sparks(rect) {
  try {
    var cols = ["#39ff88", "#ffd54a", "#00e5ff", "#ff2d95"];
    for (var i = 0; i < 6; i++) {
      var s = document.createElement("span");
      s.className = "spark";
      s.style.left = (rect.left + rect.width / 2) + "px";
      s.style.top = (rect.top + rect.height / 2) + "px";
      s.style.background = cols[(Math.random() * cols.length) | 0];
      s.style.setProperty("--dx", ((Math.random() - .5) * 70) + "px");
      s.style.setProperty("--dy", ((Math.random() - .5) * 70) + "px");
      $("fxLayer").appendChild(s);
      (function (el) { setTimeout(function () { el.remove(); }, 520); })(s);
    }
  } catch (e) {}
}
function comboBanner(text) {
  try {
    var r = $("waste").getBoundingClientRect();
    var el = document.createElement("div");
    el.className = "combo";
    el.textContent = text;
    el.style.left = (r.left + r.width / 2 - 40) + "px";
    el.style.top = (r.top - 6) + "px";
    $("fxLayer").appendChild(el);
    setTimeout(function () { el.remove(); }, 820);
  } catch (e) {}
}
function confetti() {
  var cols = ["#39ff88", "#ffd54a", "#00e5ff", "#ff2d95", "#a78bfa"];
  for (var i = 0; i < 34; i++) {
    var f = document.createElement("span");
    f.className = "cf";
    f.style.left = (Math.random() * 100) + "%";
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty("--dx", ((Math.random() - .5) * 90).toFixed(0) + "px");
    f.style.animationDelay = (Math.random() * .4).toFixed(2) + "s";
    $("fxLayer").appendChild(f);
    (function (el) { setTimeout(function () { el.remove(); }, 1700); })(f);
  }
}

/* ---------------- share ---------------- */
function shareText() {
  var tier = tierOf(score);
  var multAtBest = bestChain ? Math.min(1 + (bestChain - 1) * 0.5, multCap) : 1;
  if (npLang() === "zh") {
    return "⛳ Neon Fairway " + (mode === "daily" ? "每日发牌" : "练习") + " " + score.toLocaleString("en-US") +
      " 分（" + cleared + "/35 清牌 · " + fmtMult(multAtBest) + " 满链）" + tierLabel(tier) +
      " | https://seyrs1985.github.io/neonplay/";
  }
  return "⛳ Neon Fairway " + (mode === "daily" ? "Daily" : "Practice") + " — " + score.toLocaleString("en-US") +
    " pts (" + cleared + "/35 cleared · " + fmtMult(multAtBest) + " chain) " + tierLabel(tier) +
    " | https://seyrs1985.github.io/neonplay/";
}
function drawShareCard() {
  var cv = document.createElement("canvas");
  cv.width = 640; cv.height = 360;
  var x = cv.getContext("2d");
  var grad = x.createLinearGradient(0, 0, 640, 360);
  grad.addColorStop(0, "#0a0a18"); grad.addColorStop(1, "#14261e");
  x.fillStyle = grad; x.fillRect(0, 0, 640, 360);
  x.strokeStyle = "#39ff88"; x.lineWidth = 4; x.strokeRect(8, 8, 624, 344);
  x.textAlign = "center";
  x.fillStyle = "#39ff88"; x.font = "900 34px Segoe UI, sans-serif";
  x.fillText("⛳ NEON FAIRWAY", 320, 62);
  x.fillStyle = "#e8ecff"; x.font = "900 92px Segoe UI, sans-serif";
  x.fillText(score.toLocaleString("en-US"), 320, 168);
  x.fillStyle = "#9fb0d8"; x.font = "600 24px Segoe UI, sans-serif";
  var multAtBest = bestChain ? Math.min(1 + (bestChain - 1) * 0.5, multCap) : 1;
  x.fillText(cleared + "/35 cleared · " + fmtMult(multAtBest) + " chain · " + (joker ? jokerName(joker) : ""), 320, 218);
  x.fillStyle = "#ffd54a"; x.font = "800 28px Segoe UI, sans-serif";
  x.fillText(tierLabel(tierOf(score)) + (clearedAll ? " · COURSE CLEAR" : ""), 320, 262);
  x.fillStyle = "#7d8db5"; x.font = "600 20px Segoe UI, sans-serif";
  x.fillText(utcStr() + (mode === "daily" ? " · Daily Deal" : "") + " · seyrs1985.github.io/neonplay", 320, 318);
  return cv;
}
function doShare(btn) {
  var text = shareText();
  var cv = drawShareCard();
  try {
    cv.toBlob(function (blob) {
      if (blob && navigator.share && navigator.canShare && navigator.canShare({ files: [new File([blob], "neon-fairway.png", { type: "image/png" })] })) {
        var file = new File([blob], "neon-fairway.png", { type: "image/png" });
        navigator.share({ files: [file], text: text }).catch(function () {});
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(function () {});
      }
    }, "image/png");
  } catch (e) {
    try { if (navigator.clipboard) navigator.clipboard.writeText(text); } catch (e2) {}
  }
  btn.textContent = T("copied");
  setTimeout(function () { btn.textContent = T("share"); }, 1600);
}

/* ---------------- input ---------------- */
document.addEventListener("pointerdown", function (e) {
  Sound.resume();
  var c = e.target && e.target.closest ? e.target.closest(".card") : null;
  if (c) c.classList.add("press");
}, { passive: true });
["pointerup", "pointercancel"].forEach(function (ev) {
  document.addEventListener(ev, function () {
    var pressed = document.querySelectorAll(".card.press");
    for (var i = 0; i < pressed.length; i++) pressed[i].classList.remove("press");
  }, { passive: true });
});
document.addEventListener("keydown", function (e) {
  if (state !== "playing") return;
  var k = e.key;
  if (k === "d" || k === "D") { flipStock("auto"); e.preventDefault(); }
  else if (k === "r" || k === "R") { startGame(mode); e.preventDefault(); }
  else if (k === "ArrowLeft" || k === "ArrowRight" || k === "ArrowUp" || k === "ArrowDown") {
    var ae = document.activeElement;
    if (ae && ae.dataset && ae.dataset.fi !== undefined) {
      var fi = +ae.dataset.fi, nf = fi;
      if (k === "ArrowLeft") nf = Math.max(0, fi - 1);
      else if (k === "ArrowRight") nf = Math.min(field.length - 1, fi + 1);
      else if (k === "ArrowUp") nf = Math.max(0, fi - 7);
      else nf = Math.min(field.length - 1, fi + 7);
      var el = cardEl(nf);
      if (el) { el.focus(); e.preventDefault(); }
    }
  }
});
$("tabDaily").addEventListener("click", function () { if (mode !== "daily" || state === "over") startGame("daily"); });
$("tabPractice").addEventListener("click", function () { if (mode !== "practice" || state === "over") startGame("practice"); });
$("stockA").addEventListener("click", function () { flipStock("A"); });
$("stockB").addEventListener("click", function () { flipStock("B"); });
$("muteBtn").addEventListener("click", function () { Sound.resume(); this.textContent = Sound.toggleMute() ? "🔇" : "🔊"; });
$("epShare").addEventListener("click", function () { doShare(this); });
$("epAgain").addEventListener("click", function () {
  $("endPanel").classList.add("hide");
  startGame(mode);
});

/* ---------------- QA hooks ---------------- */
window.__qaFreeze = false;
window.__qaRender = function () { renderAll(); };
window.__qaState = function () {
  return {
    state: state, mode: mode, seed: seed, joker: joker ? joker.id : null,
    offer: offer.map(function (i) { return JOKERS[i].id; }),
    score: score, chain: chain, mult: mult, multCap: multCap,
    cleared: cleared, clearedAll: clearedAll,
    fieldLeft: field.length, fieldRanks: field.map(function (c) { return c.r; }),
    stockLeft: stockA.length + stockB.length,
    wasteTop: waste.length ? waste[waste.length - 1].r : null,
    wasteSize: waste.length, playable: playable.slice(),
    panel: !$("endPanel").classList.contains("hide"),
    jokerPanel: !$("jokerPanel").classList.contains("hide"),
    best: best ? best.score : 0, streak: streak.count,
    dailyDone: !!(daily.done && daily.date === utcStr()),
    tier: tierOf(score).key
  };
};
window.__qa = {
  deal: function (seedStr, jokerId) {   // deterministic practice deal (same seed => same everything)
    startGame("practice", typeof seedStr === "number" ? seedStr : strSeed(seedStr));
    var st = window.__qaState();
    if (st.state === "joker") {
      var id = jokerId && jokerById(jokerId) && jokerById(jokerId).impl ? jokerId : JOKERS[offer.find(function (i) { return JOKERS[i].impl; })].id;
      pickJoker(id);
    }
    return window.__qaState().fieldRanks;
  },
  daily: function () { startGame("daily"); return window.__qaState(); },
  pickJoker: function (id) { return pickJoker(id); },
  play: function (i) { var el = cardEl(i); if (!el) return false; el.click(); return true; },
  flip: function (which) { return flipStock(which || "auto"); },
  autoPlay: function () {
    var guard = 0, moves = 0;
    while (state === "playing" && guard++ < 500) {
      if (playable.length) { playCard(playable[0]); moves++; }
      else if (!flipStock("auto")) break;
      else moves++;
    }
    return { over: state === "over", cleared: cleared, score: score, moves: moves, clearedAll: clearedAll, stockLeft: stockA.length + stockB.length };
  },
  shareCard: function () { try { return drawShareCard().toDataURL("image/png").length; } catch (e) { return 0; } },
  dailySeed: utcSeed,
  ranksAdjacent: rankAdjacent,
  tierFor: tierOf
};
Object.defineProperty(window, "__qaFreeze", {
  get: function () { return document.body.classList.contains("frozen"); },
  set: function (v) { document.body.classList.toggle("frozen", !!v); }
});

/* ---------------- boot ---------------- */
(function boot() {
  $("tabDaily").textContent = T("daily");
  $("tabPractice").textContent = T("practice");
  $("lbScore").textContent = T("score");
  $("lbChain").textContent = T("chain");
  $("lbCleared").textContent = T("cleared");
  $("lbStock").textContent = T("stock");
  $("muteBtn").textContent = Sound.isMuted() ? "🔇" : "🔊";
  startGame("daily");
  try {
    if (new URLSearchParams(location.search).get("autotest") === "1") {
      window.__qaFreeze = true;
      var implIdx = offer.find(function (i) { return JOKERS[i].impl; });
      if (implIdx !== undefined) pickJoker(JOKERS[implIdx].id);
    }
  } catch (e) {}
})();
