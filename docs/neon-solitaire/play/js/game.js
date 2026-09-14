/* Neon Solitaire — game core: Klondike rules, seeded deals, scoring,
 * undo, hint, auto-finish, streak/save, render, QA hooks.
 * Pure state + rules live here; input mapping is in main.js. */
'use strict';

// ---- i18n (np_core when present, en fallback) ----
var L = {
  en: {
    daily: "Daily", rand: "Random", score: "SCORE", time: "TIME", moves: "MOVES",
    undo: "↩", auto: "⚡ Auto", newDeal: "New deal", winT: "You cleared it! 🎉",
    winNote: "All 52 cards home.", timeL: "Time", movesL: "Moves", scoreL: "Score",
    bonusL: "Time bonus", bestL: "Best", share: "Copy result", again: "New deal",
    dailyDone: "Today's daily already cleared ✓ — replay is unranked.", streak: "streak",
    noMoves: "No moves — draw or undo", recycle: "Stock recycled (−100)",
    autoReady: "⚡ Auto finish available", dealt: "Daily deal — same board for everyone",
    star3: "Neon master run", star2: "Solid clear", star1: "Cleared"
  },
  zh: {
    daily: "每日挑战", rand: "随机局", score: "得分", time: "时间", moves: "步数",
    undo: "↩", auto: "⚡ 自动收牌", newDeal: "新的一局", winT: "通关！🎉",
    winNote: "52 张牌全部归位。", timeL: "用时", movesL: "步数", scoreL: "得分",
    bonusL: "时间奖励", bestL: "最佳", share: "复制战绩", again: "再来一局",
    dailyDone: "今日每日已通关 ✓ — 重玩不计成绩。", streak: "连胜",
    noMoves: "无路可走——抽牌或撤销", recycle: "回收牌堆（−100）",
    autoReady: "⚡ 可自动收牌", dealt: "每日发牌——全球同一副牌",
    star3: "霓虹大师级", star2: "干净利落", star1: "顺利通关"
  }
};
function T(k) {
  if (typeof npT === "function") return npT(L, k);
  try {
    var lang = (localStorage.getItem("np_lang") || "en").slice(0, 2);
    return (L[lang] && L[lang][k]) || L.en[k] || k;
  } catch (e) { return L.en[k] || k; }
}

// ---- cards ----
var SUITS = ["♠", "♥", "♦", "♣"];            // 0 spade 1 heart 2 diamond 3 club
var RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
function isRed(s) { return s === 1 || s === 2; }
function mkCard(id) { return { s: (id / 13) | 0, r: (id % 13) + 1, up: false, id: id }; }
function cardId(s, r) { return s * 13 + (r - 1); }
function cloneCard(c) { return { s: c.s, r: c.r, up: c.up, id: c.id }; }

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
function utcDate(d) {
  d = d || new Date();
  return d.toISOString().slice(0, 10);
}

// ---- save / streak (np_sol_ prefix) ----
var SAVE_KEY = "np_sol_save";
var SAV = { dailyDone: "", streak: 0, best: 0, randPlayed: 0 };
try {
  var d0 = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (d0) {
    SAV.dailyDone = d0.dailyDone || ""; SAV.streak = d0.streak || 0;
    SAV.best = d0.best || 0; SAV.randPlayed = d0.randPlayed || 0;
  }
} catch (e) {}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(SAV)); } catch (e) {} }
function bumpStreak() {
  var today = utcDate(), yest = utcDate(new Date(Date.now() - 86400000));
  if (SAV.dailyDone === today) return;              // already counted today
  SAV.streak = (SAV.dailyDone === yest) ? SAV.streak + 1 : 1;
  SAV.dailyDone = today;
  save();
}

// ---- live state ----
var mode = "daily";               // 'daily' | 'rand'
var seedStr = "";
var stock = [], waste = [], found = [[], [], [], []], tab = [[], [], [], [], [], [], []];
var moves = 0, score = 0, sec = 0, clockOn = false, won = false, undos = 0;
var sel = null;                   // {zone, idx} selection head (idx = card index in pile)
var undoStack = [];
var autoTimer = null;
var lastPlaced = {};              // cardId -> pop animation this render

function totalFound() {
  return found[0].length + found[1].length + found[2].length + found[3].length;
}
function snapshot() {
  return {
    stock: stock.map(cloneCard), waste: waste.map(cloneCard),
    found: found.map(function (p) { return p.map(cloneCard); }),
    tab: tab.map(function (p) { return p.map(cloneCard); }),
    moves: moves, score: score
  };
}
function restore(snap) {
  stock = snap.stock; waste = snap.waste;
  found = snap.found.map(function (p) { return p.map(cloneCard); });
  tab = snap.tab.map(function (p) { return p.map(cloneCard); });
  moves = snap.moves; score = snap.score;
  sel = null; lastPlaced = {};
}

// ---- dealing ----
function deal(deck) {
  tab = [[], [], [], [], [], [], []];
  found = [[], [], [], []];
  stock = []; waste = [];
  var di = 0;
  for (var p = 0; p < 7; p++) {
    for (var c = p; c < 7; c++) tab[c].push(deck[di++]);
  }
  for (var t = 0; t < 7; t++) {
    tab[t].forEach(function (card, i) { card.up = (i === tab[t].length - 1); });
  }
  while (di < 52) { var cd = deck[di++]; cd.up = false; stock.push(cd); }
  moves = 0; score = 0; sec = 0; clockOn = false; won = false; undos = 0;
  sel = null; undoStack = []; lastPlaced = {};
  stopAuto();
  hideWin();
}
function newGame(m, seed) {
  mode = m;
  if (m === "daily") seedStr = "neon-solitaire:" + utcDate();
  else seedStr = seed || ("rand:" + Date.now() + ":" + ((Math.random() * 1e9) | 0));
  deal(seededDeck(seedStr));
  if (m === "daily" && SAV.dailyDone === utcDate()) flash(T("dailyDone"));
  else if (m === "daily") flash(T("dealt"));
  render(); renderHud();
}

// ---- rules (pure-ish, QA asserts against these) ----
function canStackOn(card, top) {       // tableau: descending, alternating colors
  return top.up && top.r === card.r + 1 && isRed(top.s) !== isRed(card.s);
}
function canDropTab(ci, headCard) {
  var pile = tab[ci];
  if (!pile.length) return headCard.r === 13;              // empty column: kings only
  return canStackOn(headCard, pile[pile.length - 1]);
}
function canDropFound(fi, card) {
  var pile = found[fi];
  if (!pile.length) return card.r === 1;                    // any ace on empty foundation
  var top = pile[pile.length - 1];
  return top.s === card.s && card.r === top.r + 1;
}
function runValid(cards) {             // face-up descending alt-color run (drag body)
  for (var i = 1; i < cards.length; i++) {
    if (!cards[i].up || !canStackOn(cards[i], cards[i - 1])) return false;
  }
  return cards.length > 0 && cards[0].up;
}
function pileOf(zone) {
  if (zone === "stock") return stock;
  if (zone === "waste") return waste;
  if (zone[0] === "f") return found[+zone.slice(1)];
  return tab[+zone.slice(1)];
}
// move `count` cards (tail of source pile) — from tab idx = run head
function tryMove(fromZone, toZone, count) {
  if (fromZone === toZone || fromZone === "stock" || won) return false;
  var src = pileOf(fromZone);
  count = count || 1;
  var start = src.length - count;
  if (start < 0) return false;
  var moved = src.slice(start);
  var head = moved[0];
  if (fromZone[0] === "t" && !runValid(moved)) return false;
  if (fromZone === "waste" && count !== 1) return false;
  if (fromZone[0] === "f" && count !== 1) return false;

  var ok = false;
  undoStack.push(snapshot());
  if (toZone[0] === "f" && count === 1 && canDropFound(+toZone.slice(1), head)) ok = true;
  else if (toZone[0] === "t" && canDropTab(+toZone.slice(1), head)) ok = true;
  if (!ok) { undoStack.pop(); return false; }

  src.splice(start, count);
  var dst = pileOf(toZone);
  moved.forEach(function (c) { dst.push(c); });

  // scoring (standard Klondike)
  if (toZone[0] === "f") score += 10;
  else if (fromZone === "waste") score += 5;
  else if (fromZone[0] === "f") score = Math.max(0, score - 15);

  // expose + flip
  if (fromZone[0] === "t" && src.length) {
    var top = src[src.length - 1];
    if (!top.up) { top.up = true; score += 5; Sound.flip(); }
  }
  moves++; clockOn = true; sel = null;
  moved.forEach(function (c) { lastPlaced[c.id] = true; });
  if (toZone[0] === "f") { Sound.found(); pulse(toZone); } else Sound.place();
  render(); renderHud();
  checkWin();
  return true;
}
function drawCard() {                  // stock -> waste (draw 1, unlimited recycle)
  if (won) return;
  if (!stock.length && !waste.length) return;
  undoStack.push(snapshot());
  if (stock.length) {
    var c = stock.pop(); c.up = true; waste.push(c);
    Sound.flip();
  } else {                              // recycle waste back into stock
    while (waste.length) { var w = waste.pop(); w.up = false; stock.push(w); }
    score = Math.max(0, score - 100);
    flash(T("recycle"));
  }
  moves++; clockOn = true; sel = null;
  render(); renderHud();
}
function doUndo() {
  if (!undoStack.length || won) return;
  restore(undoStack.pop());
  undos++;
  Sound.undo();
  render(); renderHud();
}

// ---- auto finish (endgame: stock+waste empty, all face up) ----
function autoReady() {
  if (won || stock.length || waste.length) return false;
  for (var i = 0; i < 7; i++) {
    for (var j = 0; j < tab[i].length; j++) if (!tab[i][j].up) return false;
  }
  return totalFound() < 52;
}
function autoStep() {
  for (var s = 0; s < 4; s++) {
    var want = found[s].length + 1;
    if (want > 13) continue;
    var id = cardId(s, want);
    for (var c = 0; c < 7; c++) {
      var pile = tab[c];
      if (pile.length && pile[pile.length - 1].id === id) {
        return tryMove("t" + c, "f" + s, 1);
      }
    }
  }
  return false;
}
function startAuto() {
  if (!autoReady()) return;
  stopAuto();
  autoTimer = setInterval(function () {
    if (!autoStep()) stopAuto();
  }, 130);
}
function stopAuto() { if (autoTimer) { clearInterval(autoTimer); autoTimer = null; } }

// ---- smart double-tap: foundation first, then best tableau spot ----
function smartMove(zone, idx) {
  var pile = pileOf(zone);
  if (!pile || !pile.length) return false;
  if (zone === "waste" || zone[0] === "f") idx = pile.length - 1;
  var card = pile[idx];
  if (!card || !card.up) return false;
  var count = pile.length - idx;
  if (count === 1) {
    for (var f = 0; f < 4; f++) {
      if (canDropFound(f, card)) return tryMove(zone, "f" + f, 1);
    }
  }
  // tableau targets: prefer non-empty piles, then empty (kings)
  var empties = [];
  if (zone[0] === "t") {
    for (var t = 0; t < 7; t++) {
      if ("t" + t === zone) continue;
      if (tab[t].length && canDropTab(t, card)) return tryMove(zone, "t" + t, count);
      if (!tab[t].length && card.r === 13) empties.push(t);
    }
  } else if (zone === "waste") {
    for (var w = 0; w < 7; w++) {
      if (tab[w].length && canDropTab(w, card)) return tryMove(zone, "t" + w, 1);
      if (!tab[w].length && card.r === 13) empties.push(w);
    }
  }
  if (empties.length && zone !== "stock") return tryMove(zone, "t" + empties[0], count);
  return false;
}

// ---- hint ----
function findHint() {
  var i, j;
  for (i = 0; i < 7; i++) {                     // tab/waste -> foundation
    var p = tab[i];
    if (p.length && p[p.length - 1].up) {
      for (j = 0; j < 4; j++) if (canDropFound(j, p[p.length - 1])) return { from: "t" + i, to: "f" + j, idx: p.length - 1 };
    }
  }
  if (waste.length) {
    for (j = 0; j < 4; j++) if (canDropFound(j, waste[waste.length - 1])) return { from: "waste", to: "f" + j, idx: waste.length - 1 };
  }
  for (i = 0; i < 7; i++) {                     // tab -> tab (uncover or free king)
    var pi = tab[i];
    for (var k = 0; k < pi.length; k++) {
      if (!pi[k].up) continue;
      var useful = (k > 0 && !pi[k - 1].up) || (k === 0 && pi.length > 1);
      if (!useful) continue;
      for (j = 0; j < 7; j++) {
        if (i === j) continue;
        if (canDropTab(j, pi[k])) return { from: "t" + i, to: "t" + j, idx: k };
      }
    }
  }
  if (waste.length) {
    var wc = waste[waste.length - 1];
    for (j = 0; j < 7; j++) if (canDropTab(j, wc)) return { from: "waste", to: "t" + j, idx: waste.length - 1 };
  }
  if (stock.length || waste.length) return { from: "stock", to: "waste", idx: -1 };
  return null;
}

// ---- win ----
function checkWin() {
  if (totalFound() !== 52 || won) return;
  won = true; clockOn = false; stopAuto();
  var bonus = sec > 30 ? Math.round(700000 / sec) : 0;
  score += bonus;
  var stars = (moves <= 120 && sec <= 300) ? 3 : (moves <= 190 ? 2 : 1);
  if (score > SAV.best) SAV.best = score;
  if (mode === "daily") bumpStreak();
  save();
  Sound.win();
  cardRain();
  setTimeout(function () { showWin(stars, bonus); }, 900);
  render(); renderHud();
}
function showWin(stars, bonus) {
  var el = function (id) { return document.getElementById(id); };
  el("wpTitle").textContent = T("winT");
  var st = "";
  for (var i = 0; i < 3; i++) st += i < stars ? "★" : "☆";
  el("wpStars").textContent = st + " — " + T(stars === 3 ? "star3" : stars === 2 ? "star2" : "star1");
  el("wpRows").innerHTML =
    "<div><span>" + T("timeL") + "</span><b>" + fmtTime(sec) + "</b></div>" +
    "<div><span>" + T("movesL") + "</span><b>" + moves + "</b></div>" +
    "<div><span>" + T("bonusL") + "</span><b>+" + bonus + "</b></div>" +
    "<div><span>" + T("scoreL") + "</span><b>" + score + "</b></div>" +
    "<div><span>" + T("bestL") + "</span><b>" + SAV.best + "</b></div>" +
    "<p class='note'>" + T("winNote") + "</p>";
  el("wpShare").textContent = T("share");
  el("wpNew").textContent = T("again");
  el("winPanel").classList.remove("hide");
}
function hideWin() { document.getElementById("winPanel").classList.add("hide"); }
function fmtTime(s) { return ((s / 60) | 0) + ":" + ("0" + (s % 60)).slice(-2); }

// ---- juice helpers ----
function cardRain() {
  var cols = ["#00e5ff", "#ff2d95", "#7c4dff", "#ffd54a", "#39ff88"];
  for (var i = 0; i < 34; i++) {
    var f = document.createElement("span"); f.className = "cf";
    f.style.left = (Math.random() * 100) + "%";
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty("--dx", ((Math.random() - .5) * 90).toFixed(0) + "px");
    f.style.animationDelay = (Math.random() * .5).toFixed(2) + "s";
    document.body.appendChild(f);
    (function (el) { setTimeout(function () { el.remove(); }, 2200); })(f);
  }
  for (var r = 0; r < 12; r++) {                 // falling card backs
    var c = document.createElement("span"); c.className = "rain";
    c.style.left = (4 + Math.random() * 92) + "%";
    c.style.animationDelay = (Math.random() * .8).toFixed(2) + "s";
    c.style.setProperty("--spin", (360 + Math.random() * 720) + "deg");
    document.body.appendChild(c);
    (function (el) { setTimeout(function () { el.remove(); }, 3200); })(c);
  }
}
function flash(text) {
  var m = document.getElementById("msg");
  m.textContent = text; m.className = "show";
  clearTimeout(flash._t);
  flash._t = setTimeout(function () { m.className = ""; }, 2200);
}
function pulse(zone) {
  var el = document.querySelector('[data-zone="' + zone + '"]');
  if (!el) return;
  el.classList.remove("pulse");
  void el.offsetWidth;
  el.classList.add("pulse");
}

// ---- layout + render (DOM, fits 375×667 first screen, no scroll) ----
var CW = 48, CH = 68;
function layout() {
  var stage = document.getElementById("stage");
  var w = stage.clientWidth || 375;
  var gap = Math.max(3, Math.min(6, w * 0.012));
  CW = Math.floor((w - gap * 8) / 7);
  CW = Math.max(30, Math.min(CW, 84));
  CH = Math.round(CW * 1.42);
  document.documentElement.style.setProperty("--cw", CW + "px");
  document.documentElement.style.setProperty("--ch", CH + "px");
  document.documentElement.style.setProperty("--gap", gap + "px");
}
function cardEl(card, zone, topPx, extraCls) {
  var el = document.createElement("div");
  el.className = "card " + (card.up ? "up " : "down ") + (isRed(card.s) ? "red" : "dark") +
    (extraCls ? " " + extraCls : "");
  el.dataset.id = card.id;
  el.dataset.zone = zone;
  el.style.top = topPx + "px";
  if (card.up) {
    el.innerHTML = '<span class="cr">' + RANKS[card.r - 1] + '</span>' +
      '<span class="cs">' + SUITS[card.s] + '</span>' +
      '<span class="cr b">' + RANKS[card.r - 1] + '</span>';
    el.setAttribute("aria-label", RANKS[card.r - 1] + " " + SUITS[card.s]);
  } else {
    el.setAttribute("aria-label", "card");
  }
  return el;
}
function selInfo() {
  if (!sel) return null;
  var pile = pileOf(sel.zone);
  if (!pile || sel.idx >= pile.length || !pile[sel.idx] || !pile[sel.idx].up) return null;
  return { zone: sel.zone, idx: sel.idx, pile: pile };
}
function render() {
  layout();
  var i, j;
  // top row
  ["stock", "waste", "f0", "f1", "f2", "f3"].forEach(function (zone) {
    var host = document.querySelector('[data-zone="' + zone + '"]');
    if (!host) return;
    host.innerHTML = "";
    host.classList.remove("pulse");
    var pile = pileOf(zone);
    if (!pile.length) {
      var e = document.createElement("div");
      e.className = "ph " + (zone[0] === "f" ? "phA" : zone === "stock" ? "phS" : "phW");
      e.dataset.zone = zone;
      host.appendChild(e);
      if (sel && sel.zone === zone) host.classList.add("selzone");
      else host.classList.remove("selzone");
      return;
    }
    host.classList.remove("selzone");
    var maxShow = zone === "waste" ? 3 : pile.length;
    var start = Math.max(0, pile.length - maxShow);
    for (var q = start; q < pile.length; q++) {
      var cls = [];
      if (sel && sel.zone === zone && q === sel.idx) cls.push("sel");
      else if (sel && sel.zone === zone && q > sel.idx) cls.push("selrun");
      if (lastPlaced[pile[q].id]) cls.push("pop");
      if (kbOn && kbFocus && kbFocus.zone === zone && q === pile.length - 1) cls.push("kbf");
      var cel = cardEl(pile[q], zone, 0, cls.join(" "));
      if (zone === "waste" && q > start) cel.style.left = ((q - start) * Math.round(CW * 0.32)) + "px";
      host.appendChild(cel);
    }
  });
  // tableau
  var rowTab = document.getElementById("rowTab");
  rowTab.innerHTML = "";
  var boardH = document.getElementById("board").clientHeight || 480;
  var topRowH = CH + 10;
  var tabH = Math.max(160, boardH - topRowH - 8);
  for (i = 0; i < 7; i++) {
    var wrap = document.createElement("div");
    wrap.className = "colWrap";
    var pileEl = document.createElement("div");
    pileEl.className = "pile tab";
    pileEl.dataset.zone = "t" + i;
    var pile = tab[i];
    if (!pile.length) {
      var e2 = document.createElement("div");
      e2.className = "ph phK";
      e2.dataset.zone = "t" + i;
      pileEl.appendChild(e2);
      if (sel && sel.zone === "t" + i) pileEl.classList.add("selzone");
    } else {
      var n = pile.length;
      var offUp = Math.max(12, Math.round(CH * 0.26));
      var offDown = Math.max(7, Math.round(CH * 0.13));
      var need = 0;
      for (var q2 = 0; q2 < n - 1; q2++) need += pile[q2].up ? offUp : offDown;
      var room = tabH - CH;
      if (need > room && n > 1) {                 // compress so the column always fits
        var k2 = room / need;
        offUp = Math.max(6, Math.floor(offUp * k2));
        offDown = Math.max(4, Math.floor(offDown * k2));
      }
      var y = 0;
      for (var q3 = 0; q3 < n; q3++) {
        var cls2 = [];
        if (sel && sel.zone === "t" + i && q3 === sel.idx) cls2.push("sel");
        else if (sel && sel.zone === "t" + i && q3 > sel.idx) cls2.push("selrun");
        if (lastPlaced[pile[q3].id]) cls2.push("pop");
        if (kbOn && kbFocus && kbFocus.zone === "t" + i) {
          var headIdx = kbFocus.idx !== undefined ? kbFocus.idx : pile.length - 1;
          if (q3 >= headIdx && pile[q3].up) cls2.push("kbf");
        }
        pileEl.appendChild(cardEl(pile[q3], "t" + i, y, cls2.join(" ")));
        y += pile[q3].up ? offUp : offDown;
      }
      pileEl.style.height = (y + CH) + "px";
    }
    wrap.appendChild(pileEl);
    rowTab.appendChild(wrap);
  }
  lastPlaced = {};
  document.getElementById("autoBtn").classList.toggle("hide", !autoReady());
}
var kbFocus = null;   // keyboard highlight (set by main.js)
var kbOn = false;     // ring renders only after first real key use

function renderHud() {
  document.getElementById("v-score").textContent = score;
  document.getElementById("v-time").textContent = fmtTime(sec);
  document.getElementById("v-moves").textContent = moves;
  document.getElementById("streak").textContent = "🔥 " + SAV.streak;
  document.getElementById("undoBtn").textContent = T("undo");
  var ab = document.getElementById("autoBtn");
  ab.textContent = T("auto");
  ab.classList.toggle("hide", !autoReady());
}

// ---- QA hooks ----
window.__qaState = function () {
  return {
    mode: mode, seed: seedStr, won: won, moves: moves, score: score, sec: sec, undos: undos,
    stock: stock.map(function (c) { return c.id; }),
    waste: waste.map(function (c) { return c.id; }),
    foundations: found.map(function (p) { return p.map(function (c) { return c.id; }); }),
    tableau: tab.map(function (p) { return p.map(function (c) { return { id: c.id, s: c.s, r: c.r, up: c.up }; }); }),
    foundTotal: totalFound(), autoReady: autoReady(),
    streak: SAV.streak, dailyDone: SAV.dailyDone, best: SAV.best,
    undoDepth: undoStack.length, winPanelShown: !document.getElementById("winPanel").classList.contains("hide")
  };
};
window.__qaRender = function () { render(); renderHud(); };
window.__qaFreeze = false;
window.__qa = {
  newGame: function (m, seed) { newGame(m || "rand", seed); },
  // white-box rig: {tab:[[ids]], stock:[ids], waste:[ids], found:[[ids]]}, faceUpAll flips all tableau up
  rig: function (spec, m) {
    mode = m || mode;
    seedStr = "rig";
    stopAuto(); hideWin();
    tab = [];
    for (var ti = 0; ti < 7; ti++) {
      var col = (spec.tab && spec.tab[ti]) || [];
      tab.push(col.map(function (id, i) {
        var c = mkCard(id); c.up = spec.faceUpAll || i === col.length - 1; return c;
      }));
    }
    stock = (spec.stock || []).map(function (id) { var c = mkCard(id); c.up = false; return c; });
    waste = (spec.waste || []).map(function (id) { var c = mkCard(id); c.up = true; return c; });
    found = [0, 1, 2, 3].map(function (i) {
      return ((spec.found && spec.found[i]) || []).map(function (id) { var c = mkCard(id); c.up = true; return c; });
    });
    moves = spec.moves || 0; score = spec.score || 0; sec = spec.sec || 0;
    clockOn = false; won = false; undos = 0; sel = null; undoStack = []; lastPlaced = {};
    render(); renderHud();
  },
  clickCard: function (id) {
    var el = document.querySelector('.card[data-id="' + id + '"]');
    if (el) { el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
      el.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 0, clientY: 0 })); }
  },
  dblCard: function (id) {
    var el = document.querySelector('.card[data-id="' + id + '"]');
    if (el) el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  },
  clickZone: function (zone) {
    var el = document.querySelector('[data-zone="' + zone + '"]');
    if (el) { el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true, clientX: 0, clientY: 0 }));
      el.dispatchEvent(new MouseEvent("pointerup", { bubbles: true, clientX: 0, clientY: 0 })); }
  },
  draw: function () { drawCard(); },
  undo: function () { doUndo(); },
  auto: function () { startAuto(); },
  hint: function () { return findHint(); },
  smart: function (zone, idx) { return smartMove(zone, idx); },
  canTab: function (ci, id) { return canDropTab(ci, mkCard(id)); },
  canFound: function (fi, id) { return canDropFound(fi, mkCard(id)); }
};
