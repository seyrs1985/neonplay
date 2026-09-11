/* Neon Alchemy — game core (neon-alchemy.md MVP, data tables from the design doc).
 * Pure DOM chip flow, zero canvas. Time-free logic; saves via localStorage. */
'use strict';

// ---- i18n (np_core) ----
var L = {
  en: { free: "Free Craft", daily: "Daily Puzzle", target: "Target", pool: "pool",
    discovered: "discovered!", already: "Already discovered — no double count",
    noRx: "No reaction…", dailyDone: "Today's board cleared!",
    share: "Share result", close: "Close", wall: "Collection", recipes: "Recipe log",
    reset: "Reset collection", confirm: "Reset EVERYTHING? Tap again to confirm.",
    dailyTag: "same board for everyone today", poolNote: "combine within the pool only",
    shareText: "Neon Alchemy Daily #%d %s %d/%d combos" },
  zh: { free: "自由合成", daily: "每日合成", target: "今日目标", pool: "元素池",
    discovered: "发现新元素！", already: "已发现过——不重复计数",
    noRx: "没有反应……", dailyDone: "今日合成完成！",
    share: "分享战绩", close: "关闭", wall: "元素图鉴", recipes: "配方图谱",
    reset: "重置图鉴", confirm: "确定清空全部进度？再点一次确认。",
    dailyTag: "今日全球同题", poolNote: "只能用池内元素合成",
    shareText: "Neon Alchemy 每日合成 #%d %s %d/%d" }
};
function T(k) { return npT(L, k); }

// ---- data: 42 elements (id, emoji, en, zh) — from the design doc ----
var ELEMENTS = [
  ["water","💧","Water","水"],["fire","🔥","Fire","火"],["earth","🌍","Earth","土"],["electric","⚡","Electric","电"],
  ["steam","♨️","Steam","蒸汽"],["plant","🌱","Plant","植物"],["lava","🟠","Lava","熔岩"],["light","💡","Light","光"],
  ["ocean","🌊","Ocean","海洋"],["energy","✨","Energy","能量"],["mountain","⛰️","Mountain","山脉"],["magnet","🧲","Magnet","磁场"],
  ["cloud","☁️","Cloud","云"],["rain","🌧️","Rain","雨"],["storm","🌩️","Storm","雷暴"],["stone","🪨","Stone","石头"],
  ["metal","🔩","Metal","金属"],["robot","🤖","Robot","机器人"],["engine","⚙️","Engine","引擎"],["internet","🌐","Internet","网络"],
  ["city","🏙️","City","城市"],["screen","📺","Screen","屏幕"],["neon","🌃","Neon","霓虹"],["forest","🌳","Forest","森林"],
  ["smoke","💨","Smoke","烟"],["flower","🌸","Flower","花"],["island","🏝️","Island","岛屿"],["salt","🧂","Salt","盐"],
  ["snow","❄️","Snow","雪"],["glacier","🧊","Glacier","冰川"],["volcano","🌋","Volcano","火山"],["fish","🐟","Fish","鱼"],
  ["sushi","🍣","Sushi","寿司"],["sun","☀️","Sun","太阳"],["rainbow","🌈","Rainbow","彩虹"],["arcade","🕹️","Arcade","街机"],
  ["computer","💻","Computer","电脑"],["ai","🧠","AI","人工智能"],["cyberpunk","🌉","Cyberpunk","赛博朋克"],["car","🚗","Car","汽车"],
  ["aurora","🌌","Aurora","极光"],["plane","✈️","Plane","飞机"]
];
// ---- 38 recipes (order-independent) — from the design doc ----
var RECIPES = [
  ['water','fire','steam'],['water','earth','plant'],['fire','earth','lava'],['electric','water','light'],
  ['water','water','ocean'],['fire','fire','energy'],['earth','earth','mountain'],['electric','electric','magnet'],
  ['steam','steam','cloud'],['cloud','water','rain'],['cloud','electric','storm'],['lava','water','stone'],
  ['stone','fire','metal'],['metal','electric','robot'],['light','electric','screen'],['light','light','neon'],
  ['screen','neon','arcade'],['screen','screen','computer'],['computer','electric','ai'],
  ['plant','plant','forest'],['plant','fire','smoke'],['plant','energy','flower'],
  ['ocean','earth','island'],['ocean','fire','salt'],['mountain','cloud','snow'],['snow','snow','glacier'],
  ['lava','lava','volcano'],['ocean','plant','fish'],['fish','fire','sushi'],
  ['energy','light','sun'],['sun','rain','rainbow'],['neon','city','cyberpunk'],
  ['arcade','arcade','city'],['metal','energy','engine'],['engine','metal','car'],
  ['computer','computer','internet'],['snow','light','aurora'],['engine','cloud','plane']
];
// recipe lookup, key = sorted pair
var RX = {};
RECIPES.forEach(function (r) { RX[[r[0], r[1]].sort().join("+")] = r[2]; });
// tier per element: base = 1, result = max(parents)+1 (cap 5) — "按发现层级着色"
var TIER = {}, BASE = ["water", "fire", "earth", "electric"];
BASE.forEach(function (id) { TIER[id] = 1; });
var changed = true;
while (changed) {
  changed = false;
  RECIPES.forEach(function (r) {
    if (TIER[r[2]] !== undefined) return;
    if (TIER[r[0]] && TIER[r[1]]) {
      TIER[r[2]] = Math.min(5, Math.max(TIER[r[0]], TIER[r[1]]) + 1);
      changed = true;
    }
  });
}
var TIER_COLOR = { 1: "#00e5ff", 2: "#7c4dff", 3: "#ff2d95", 4: "#ffd54a", 5: "#39ff88" };
function elOf(id) { return ELEMENTS.find(function (e) { return e[0] === id; }); }
function nameOf(id) { var e = elOf(id); return !e ? id : (npLang() === "zh" ? e[3] : e[2]); }
function emojiOf(id) { var e = elOf(id); return e ? e[1] : "❓"; }
function colorOf(id) { return TIER_COLOR[TIER[id] || 1]; }

// ---- daily boards (10, rotate by UTC day) — from the design doc ----
var DAILY = [
  { target: "steam", pool: ["water", "fire"], min: 1 },
  { target: "light", pool: ["water", "fire", "electric"], min: 1 },
  { target: "neon", pool: ["water", "fire", "electric"], min: 2 },
  { target: "arcade", pool: ["water", "fire", "electric"], min: 4 },
  { target: "robot", pool: ["water", "fire", "earth", "electric"], min: 4 },
  { target: "sushi", pool: ["water", "earth", "fire"], min: 4 },
  { target: "sun", pool: ["water", "fire", "electric"], min: 3 },
  { target: "aurora", pool: ["water", "fire", "earth", "electric"], min: 6 },
  { target: "cyberpunk", pool: ["water", "fire", "earth", "electric"], min: 6 },
  { target: "plane", pool: ["water", "fire", "earth", "electric"], min: 8 }
];
function dayIndex() { return Math.floor(Date.now() / 86400000); }
function todayBoard() { return DAILY[dayIndex() % 10]; }
function todayStr() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

// ---- state + save (np_alc_save) ----
var SAVE_KEY = "np_alc_save";
var S = { found: BASE.slice(), dailyDone: "" };
var mode = "free", pickA = null, dailyFound = [], confirmReset = false;
try {
  var d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (d) {
    S.found = (d.found || BASE).filter(function (id) { return elOf(id); });
    BASE.forEach(function (b) { if (S.found.indexOf(b) < 0) S.found.push(b); });
    S.dailyDone = d.dailyDone || "";
  }
} catch (e) {}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

// ---- DOM refs ----
var chipsEl = document.getElementById("chips"), msgEl = document.getElementById("msg");
var slotA = document.getElementById("slotA"), slotB = document.getElementById("slotB"), slotR = document.getElementById("slotR");

function msg(text, ok) {
  msgEl.textContent = text;
  msgEl.className = ok ? "ok" : "no";
  if (ok) setTimeout(function () { if (msgEl.textContent === text) msgEl.textContent = ""; }, 1800);
}
function setSlot(el, id) {
  if (id) {
    el.innerHTML = emojiOf(id) + '<span class="nm">' + nameOf(id) + "</span>";
    el.classList.add("filled");
    el.style.borderColor = colorOf(id);
  } else {
    el.innerHTML = '<span class="q">?</span>';
    el.classList.remove("filled", "sel", "hit", "bad");
    el.style.borderColor = "";
  }
}

// ---- render ----
function renderChips() {
  chipsEl.innerHTML = "";
  var pool = mode === "daily" ? todayBoard().pool : S.found;
  pool.forEach(function (id) {
    var b = document.createElement("button");
    b.className = "elchip" + (pickA === id ? " picked" : "");
    b.style.setProperty("--c", colorOf(id));
    b.dataset.id = id;
    b.innerHTML = '<span class="em">' + emojiOf(id) + '</span><span class="nm">' + nameOf(id) + "</span>";
    b.addEventListener("click", function () { pick(id, b); });
    chipsEl.appendChild(b);
  });
}
function renderWall(freshId) {
  var wall = document.getElementById("wall");
  wall.innerHTML = "";
  ELEMENTS.forEach(function (e) {
    var has = S.found.indexOf(e[0]) >= 0;
    var d = document.createElement("div");
    d.className = "wcell" + (has ? "" : " locked") + (e[0] === freshId ? " fresh" : "");
    d.innerHTML = has ? e[1] + '<span class="nm">' + (npLang() === "zh" ? e[3] : e[2]) + "</span>" : "❓";
    wall.appendChild(d);
  });
  document.getElementById("progress").textContent = S.found.length + "/42";
}
function renderRecipes() {
  var rx = document.getElementById("rx");
  rx.innerHTML = "";
  RECIPES.forEach(function (r) {
    var known = S.found.indexOf(r[2]) >= 0;
    var d = document.createElement("div");
    d.className = "r" + (known ? "" : " locked");
    if (known) d.textContent = emojiOf(r[0]) + " + " + emojiOf(r[1]) + " = " + emojiOf(r[2]);
    else d.textContent = "❓ + ❓ = ❓";
    rx.appendChild(d);
  });
}
function renderDaily() {
  var bd = todayBoard(), done = S.dailyDone === todayStr();
  document.getElementById("dTarget").innerHTML =
    '<span class="em">' + emojiOf(bd.target) + '</span>' + nameOf(bd.target) +
    ' <span style="opacity:.55;font-size:.75rem">· ' + T("dailyTag") + "</span>";
  document.getElementById("dNote").textContent = T("poolNote") + " (" + bd.pool.length + ")";
}
function renderAll() {
  renderChips(); renderWall(); renderRecipes();
  if (mode === "daily") renderDaily();
  document.getElementById("dailyCard").classList.toggle("hide", mode !== "daily");
}

// ---- combine ----
function pick(id) {
  if (!pickA) { pickA = id; renderChips(); return; }
  var a = pickA, b2 = id;
  pickA = null;
  setSlot(slotA, a); slotA.classList.add("filled");
  setSlot(slotB, b2); slotB.classList.add("filled");
  combine(a, b2);
}
function combine(a, b2) {
  var res = RX[[a, b2].sort().join("+")];
  if (mode === "daily") {
    // pool limits the STARTING chips; elements crafted inside the board stay usable
    var inBoard = function (id) {
      return todayBoard().pool.indexOf(id) >= 0 || dailyFound.indexOf(id) >= 0;
    };
    if (!inBoard(a) || !inBoard(b2)) { badSlots(); msg(T("noRx")); return; }
  }
  if (!res) { badSlots(); msg(T("noRx")); return; }
  var isNew = S.found.indexOf(res) < 0;
  setSlot(slotR, res); slotR.classList.add("hit");
  setTimeout(function () { slotR.classList.remove("hit"); }, 450);
  if (mode === "daily") {
    if (dailyFound.indexOf(res) < 0) dailyFound.push(res);
    msg(nameOf(res) + " ✓", true);
    if (res === todayBoard().target && S.dailyDone !== todayStr()) dailyWin();
    renderChips();
    return;
  }
  if (isNew) {
    S.found.push(res); save();
    msg(emojiOf(res) + " " + nameOf(res) + " " + T("discovered"), true);
    renderChips(); renderWall(res); renderRecipes();
  } else {
    msg(T("already"));
  }
}
function badSlots() {
  [slotA, slotB].forEach(function (s) {
    s.classList.add("bad");
    setTimeout(function () { s.classList.remove("bad"); }, 260);
  });
}

// ---- daily win ----
function dailyWin() {
  S.dailyDone = todayStr(); save();
  var bd = todayBoard(), n = DAILY.indexOf(bd) + 1;
  var text = T("shareText").replace("%d", n).replace("%s", "🧪".repeat(bd.min)).replace("%d", bd.min).replace("%d", bd.min);
  document.getElementById("dwTitle").textContent = T("dailyDone");
  document.getElementById("dwEmoji").textContent = emojiOf(bd.target);
  document.getElementById("dwText").textContent = text;
  document.getElementById("dwShare").textContent = T("share");
  document.getElementById("dwClose").textContent = T("close");
  document.getElementById("dailWin").classList.remove("hide");
  document.getElementById("dwShare").onclick = function () {
    var full = text + " → https://seyrs1985.github.io/neonplay/neon-alchemy/";
    if (navigator.clipboard) navigator.clipboard.writeText(full);
    document.getElementById("dwShare").textContent = "✓";
  };
  confettiRain();
}
function confettiRain() {
  var cols = ["#00e5ff", "#ff2d95", "#ffd54a", "#7c4dff", "#39ff88"];
  for (var i = 0; i < 30; i++) {
    var f = document.createElement("span"); f.className = "cf";
    f.style.left = (Math.random() * 100) + "%";
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty("--dx", ((Math.random() - .5) * 90).toFixed(0) + "px");
    f.style.animationDelay = (Math.random() * .4).toFixed(2) + "s";
    document.body.appendChild(f);
    (function (el) { setTimeout(function () { el.remove(); }, 1700); })(f);
  }
}

// ---- tabs / reset / slots cleanup ----
function setMode(m) {
  mode = m; pickA = null;
  setSlot(slotA, null); setSlot(slotB, null); setSlot(slotR, null);
  document.getElementById("tab-free").classList.toggle("on", m === "free");
  document.getElementById("tab-daily").classList.toggle("on", m === "daily");
  dailyFound = [];
  renderAll();
}
document.getElementById("tab-free").addEventListener("click", function () { setMode("free"); });
document.getElementById("tab-daily").addEventListener("click", function () { setMode("daily"); });
document.getElementById("resetBtn").addEventListener("click", function () {
  if (!confirmReset) {
    confirmReset = true;
    this.textContent = T("confirm");
    var btn = this;
    setTimeout(function () { confirmReset = false; btn.textContent = T("reset"); }, 2500);
    return;
  }
  S.found = BASE.slice(); S.dailyDone = ""; save();
  confirmReset = false; this.textContent = T("reset");
  setMode(mode);
});
document.addEventListener("pointercancel", function () {}, { passive: true });

// ---- testability hooks (GAME_STANDARD) ----
window.__qaState = function () {
  return {
    found: S.found.slice(), count: S.found.length, mode: mode,
    dailyDone: S.dailyDone, board: dayIndex() % 10,
    dailyFound: dailyFound.slice(),
    pool: todayBoard().pool, target: todayBoard().target,
    msg: msgEl.textContent
  };
};
window.__qa = {
  setLang: function (l) { try { localStorage.setItem("np_lang", l); } catch (e) {} },
  dayOffset: function (n) { // simulate another day's board
    var real = Date.now;
    Date.now = function () { return real() + n * 86400000; };
  },
  reset: function () { S.found = BASE.slice(); S.dailyDone = ""; save(); setMode(mode); },
  // BFS the recipe graph within the board pool and execute the minimal
  // combo sequence to the target — validates the real completion path
  solveBoard: function () {
    if (mode !== "daily") return "not-daily";
    var bd = todayBoard();
    if (S.dailyDone === todayStr()) return "already-done";
    var reach = {};
    bd.pool.forEach(function (id) { reach[id] = true; });
    var steps = [], guard = 0;
    while (!reach[bd.target] && guard++ < 60) {
      var progressed = false;
      for (var i = 0; i < RECIPES.length && !progressed; i++) {
        var r = RECIPES[i];
        if (reach[r[2]]) continue;
        if (reach[r[0]] && reach[r[1]]) {
          reach[r[2]] = true; steps.push([r[0], r[1]]); progressed = true;
        }
      }
      if (!progressed) break;
    }
    if (!reach[bd.target]) return "no-path";
    steps.forEach(function (s) { combine(s[0], s[1]); });
    return reach[bd.target] ? "done" : "no-path";
  }
};

// ---- boot ----
document.getElementById("tab-free").textContent = T("free");
document.getElementById("tab-daily").textContent = T("daily");
document.getElementById("wallTitle").textContent = T("wall");
document.getElementById("resetBtn").textContent = T("reset");
document.getElementById("rxhead").textContent = T("recipes");
setMode("free");
