/* Neon Nonogram — game core (neon-nonogram.md MVP, PUZZLES from the design doc).
 * Pure DOM 5x5 grid + run-length clues derived at runtime; no guessing needed. */
'use strict';

// ---- i18n (np_core) ----
var L = {
  en: { lib: "Gallery", daily: "Daily", wall: "Collection", reset: "Reset gallery",
    confirm: "Reset ALL progress? Tap again.", check: "Check", unlocked: "PICTURE UNLOCKED",
    close: "Close", dailyTag: "today's picture for everyone", done: "cleared ✓",
    allDone: "Gallery complete!", errors: "some cells are wrong — they flashed red" },
  zh: { lib: "图鉴", daily: "每日一题", wall: "像素图鉴", reset: "重置图鉴",
    confirm: "清空全部进度？再点一次确认。", check: "检查", unlocked: "解锁新像素画",
    close: "关闭", dailyTag: "今日全球同题", done: "已完成 ✓",
    allDone: "图鉴集齐！", errors: "有格子填错了——红闪标出可改" }
};
function T(k) { return npT(L, k); }

// ---- 12 solver-verified puzzles (design doc — do not alter bitmaps) ----
var PUZZLES = [
 {n:1,  d:2, name:'Bell',   emoji:'🔔', color:'#ffd54a', rows:['..#..','.###.','#####','.....','..#..']},
 {n:2,  d:2, name:'Cup',    emoji:'☕', color:'#ff9e40', rows:['.###.','.###.','.###.','..#..','.###.']},
 {n:3,  d:2, name:'Flower', emoji:'🌸', color:'#ff2d95', rows:['#.#.#','#####','.###.','..#..','..#..']},
 {n:4,  d:2, name:'Skull',  emoji:'💀', color:'#ffffff', rows:['.###.','#####','#.#.#','.###.','#.#.#']},
 {n:5,  d:3, name:'Gem',    emoji:'💎', color:'#00e5ff', rows:['..#..','.###.','#####','.###.','..#..']},
 {n:6,  d:3, name:'Heart',  emoji:'❤️', color:'#ff2d95', rows:['.#.#.','#####','#####','.###.','..#..']},
 {n:7,  d:3, name:'Invader',emoji:'👾', color:'#39ff88', rows:['..#..','.###.','#####','#.#.#','#...#']},
 {n:8,  d:3, name:'Rocket', emoji:'🚀', color:'#7c4dff', rows:['..#..','.###.','.###.','.###.','#.#.#']},
 {n:9,  d:3, name:'Tree',   emoji:'🌲', color:'#39ff88', rows:['..#..','.###.','#####','..#..','..#..']},
 {n:10, d:4, name:'Key',    emoji:'🔑', color:'#ffd54a', rows:['.##..','#..#.','.##..','..#..','..##.']},
 {n:11, d:5, name:'Bolt',   emoji:'⚡', color:'#00e5ff', rows:['...#.','..##.','.###.','###..','#....']},
 {n:12, d:5, name:'Note',   emoji:'🎵', color:'#ff2d95', rows:['..##.','..#.#','..#..','.##..','###..']}
];
// run-length clue from a 5-char line: '..#..' -> [1], '##.##' -> [2,2], '.....' -> []
function clueOf(line) {
  var runs = [], n = 0;
  for (var i = 0; i < line.length; i++) {
    if (line[i] === '#') n++;
    else if (n) { runs.push(n); n = 0; }
  }
  if (n) runs.push(n);
  return runs;
}
function colOf(pz, c) {
  var line = "";
  for (var r = 0; r < 5; r++) line += pz.rows[r][c];
  return line;
}
function todayStr() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }

// ---- state + save ----
var SAVE_KEY = "np_nn_save";
var S = { solved: [], dailyDone: "" };
try {
  var d0 = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (d0) { S.solved = d0.solved || []; S.dailyDone = d0.dailyDone || ""; }
} catch (e) {}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

var mode = "lib", cur = null, curN = 0;
var grid = [];          // 25 cells: 0 empty / 1 fill / 2 cross
var confirmReset = false;

// ---- DOM refs ----
var boardEl = document.getElementById("board"), msgEl = document.getElementById("msg");

// ---- clue satisfaction: current fill runs == clue runs ----
function lineState(line, clue) {
  var runs = [], n = 0;
  for (var i = 0; i < line.length; i++) {
    if (line[i] === 1) n++;
    else if (n) { runs.push(n); n = 0; }
  }
  if (n) runs.push(n);
  return JSON.stringify(runs) === JSON.stringify(clue);
}

function renderBoard() {
  boardEl.innerHTML = "";
  var rowClues = cur.rows.map(clueOf);
  var colClues = [];
  for (var c = 0; c < 5; c++) colClues.push(clueOf(colOf(cur, c)));
  // current line states
  var rowLines = [], colLines = [];
  for (var r = 0; r < 5; r++) {
    var line = [];
    for (var c2 = 0; c2 < 5; c2++) line.push(grid[r * 5 + c2] === 1 ? 1 : 0);
    rowLines.push(line);
  }
  for (var c3 = 0; c3 < 5; c3++) {
    var line2 = [];
    for (var r2 = 0; r2 < 5; r2++) line2.push(grid[r2 * 5 + c3] === 1 ? 1 : 0);
    colLines.push(line2);
  }
  // header row (column clues)
  var hr = document.createElement("tr");
  hr.appendChild(Object.assign(document.createElement("td"), { className: "clue corner" }));
  for (var c4 = 0; c4 < 5; c4++) {
    var td = document.createElement("td");
    td.className = "clue" + (lineState(colLines[c4], colClues[c4]) ? " dim" : "");
    td.innerHTML = colClues[c4].length ? colClues[c4].join("<br>") : "0";
    hr.appendChild(td);
  }
  boardEl.appendChild(hr);
  // body rows
  for (var r3 = 0; r3 < 5; r3++) {
    var tr = document.createElement("tr");
    var rc = document.createElement("td");
    rc.className = "clue" + (lineState(rowLines[r3], rowClues[r3]) ? " dim" : "");
    rc.textContent = rowClues[r3].length ? rowClues[r3].join(" ") : "0";
    tr.appendChild(rc);
    for (var c5 = 0; c5 < 5; c5++) {
      var i = r3 * 5 + c5;
      var td2 = document.createElement("td");
      td2.className = "cell";
      td2.dataset.i = i;
      if (grid[i] === 1) { td2.classList.add("fill"); td2.style.setProperty("--c", cur.color); td2.textContent = ""; }
      if (grid[i] === 2) { td2.classList.add("mark"); td2.textContent = "✕"; }
      tr.appendChild(td2);
    }
    boardEl.appendChild(tr);
  }
}
function cycle(i, toMark) {
  grid[i] = toMark ? 2 : (grid[i] + 1) % 3;
  renderBoard();
}
boardEl.addEventListener("click", function (e) {
  var td = e.target.closest(".cell"); if (!td) return;
  cycle(+td.dataset.i, false);
});
boardEl.addEventListener("contextmenu", function (e) {
  e.preventDefault();
  var td = e.target.closest(".cell"); if (!td) return;
  grid[+td.dataset.i] = grid[+td.dataset.i] === 2 ? 0 : 2;
  renderBoard();
});

// ---- check / win ----
function check() {
  var ok = true;
  for (var i = 0; i < 25; i++) {
    var isSol = cur.rows[(i / 5) | 0][i % 5] === "#";
    if (isSol && grid[i] !== 1) ok = false;
    if (!isSol && grid[i] === 1) { ok = false; flashErr(i); }
  }
  if (!ok) { setMsg(T("errors"), "info"); return false; }
  // require all solution cells filled — since errors flash separately:
  var allFilled = true;
  for (var j = 0; j < 25; j++) {
    if (cur.rows[(j / 5) | 0][j % 5] === "#" && grid[j] !== 1) { allFilled = false; break; }
  }
  if (!allFilled) { setMsg(T("errors"), "info"); return false; }
  win();
  return true;
}
function flashErr(i) {
  var td = boardEl.querySelector('.cell[data-i="' + i + '"]');
  if (td) { td.classList.add("err"); setTimeout(function () { td.classList.remove("err"); }, 1100); }
}
function setMsg(text, cls) { msgEl.textContent = text; msgEl.className = cls || ""; }

function win() {
  var fresh = S.solved.indexOf(cur.n) < 0;
  if (fresh) S.solved.push(cur.n);
  if (mode === "daily") S.dailyDone = todayStr();
  save();
  setMsg("", "");
  document.getElementById("uTitle").textContent = T("unlocked");
  document.getElementById("uName").textContent = cur.emoji + " " + cur.name;
  var pix = document.getElementById("uPix");
  pix.innerHTML = "";
  var idx = 0;
  for (var r = 0; r < 5; r++) for (var c = 0; c < 5; c++) {
    var cell = document.createElement("i");
    var sol = cur.rows[r][c] === "#";
    if (sol) cell.style.background = cur.color;
    cell.style.animationDelay = ((r + c) * 60) + "ms";   // diagonal stagger
    pix.appendChild(cell);
    idx++;
  }
  document.getElementById("uClose").textContent = T("close");
  document.getElementById("unlock").classList.remove("hide");
  confettiRain();
  renderWall(fresh ? cur.n : -1); renderProgress(); renderDailyCard();
  var all = S.solved.length === 12;
  document.getElementById("wall").classList.toggle("complete", all);
}
function confettiRain() {
  var cols = ["#22d3ee", "#f472b6", "#ffd54a", "#a78bfa", "#4ade80"];
  for (var i = 0; i < 30; i++) {
    var f = document.createElement("span"); f.className = "cf";
    f.style.left = (Math.random() * 100) + "%";
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty("--dx", ((Math.random() - .5) * 90).toFixed(0) + "px");
    f.style.animationDelay = (Math.random() * .4).toFixed(2) + "s";
    document.body.appendChild(f);
    (function (el) { setTimeout(function () { el.remove(); }, 1800); })(f);
  }
}

// ---- wall / progress / daily card ----
function renderWall(freshN) {
  var wall = document.getElementById("wall");
  wall.innerHTML = "";
  PUZZLES.slice().sort(function (a, b) { return a.d - b.d || a.n - b.n; }).forEach(function (p) {
    var has = S.solved.indexOf(p.n) >= 0;
    var d = document.createElement("div");
    d.className = "gcell" + (has ? "" : " locked") + (p.n === freshN ? " fresh" : "");
    d.innerHTML = has
      ? '<span class="em">' + p.emoji + '</span><span class="nm">' + p.name + "</span>"
      : "❓";
    wall.appendChild(d);
  });
  document.getElementById("progress").innerHTML = S.solved.length + "<b>/</b>12".replace("<b>/</b>", "/12");
  document.getElementById("progress").textContent = S.solved.length + "/12";
  var all = S.solved.length === 12;
  document.getElementById("wall").classList.toggle("complete", all);
  if (all) document.getElementById("wallTitle").textContent = T("allDone");
}
function renderProgress() { document.getElementById("progress").textContent = S.solved.length + "/12"; }
function renderDailyCard() {
  var bd = PUZZLES[dayIndex() % 12];
  var done = S.dailyDone === todayStr();
  var card = document.getElementById("dailyCard");
  card.classList.add("show");
  card.classList.toggle("already", done);
  document.getElementById("dEmoji").textContent = bd.emoji;
  document.getElementById("dName").textContent = bd.name;
  document.getElementById("dTag").textContent = done ? T("done") + " · " + todayStr() : T("dailyTag");
}

// ---- modes ----
function dayIndex() { return Math.floor(Date.now() / 86400000); }
function setMode(m) {
  mode = m;
  document.getElementById("tab-lib").classList.toggle("on", m === "lib");
  document.getElementById("tab-daily").classList.toggle("on", m === "daily");
  if (m === "daily") { curN = dayIndex() % 12; cur = PUZZLES[curN]; renderDailyCard(); }
  else { cur = PUZZLES[0]; }
  newPuzzle();
}
function newPuzzle() {
  grid = []; for (var i = 0; i < 25; i++) grid.push(0);
  renderBoard(); setMsg("", "");
}
document.getElementById("tab-lib").addEventListener("click", function () { setMode("lib"); });
document.getElementById("tab-daily").addEventListener("click", function () { setMode("daily"); });
document.getElementById("checkBtn").addEventListener("click", check);
document.getElementById("uClose").addEventListener("click", function () {
  document.getElementById("unlock").classList.add("hide");
});
document.getElementById("resetBtn").addEventListener("click", function () {
  if (!confirmReset) {
    confirmReset = true; this.textContent = T("confirm");
    var b = this;
    setTimeout(function () { confirmReset = false; b.textContent = T("reset"); }, 2500);
    return;
  }
  S.solved = []; S.dailyDone = ""; save(); confirmReset = false;
  this.textContent = T("reset"); renderWall(-1); renderProgress(); renderDailyCard();
});
// keyboard: arrows move cursor, Space cycles, X marks, Enter checks
var cursor = -1;
document.addEventListener("keydown", function (e) {
  if (mode !== "lib" && mode !== "daily") return;
  var moves = { ArrowUp: -5, ArrowDown: 5, ArrowLeft: -1, ArrowRight: 1 };
  if (e.key in moves) {
    e.preventDefault();
    if (cursor < 0) cursor = 0;
    else cursor = Math.max(0, Math.min(24, cursor + moves[e.key]));
    renderBoard();
    var td = boardEl.querySelector('.cell[data-i="' + cursor + '"]');
    if (td) { td.style.outline = "2px solid #22d3ee"; td.style.outlineOffset = "-2px"; }
  } else if (e.code === "Space" && cursor >= 0) {
    e.preventDefault(); cycle(cursor, false);
  } else if (e.key === "x" || e.key === "X") {
    if (cursor >= 0) cycle(cursor, true);
  } else if (e.key === "Enter") {
    check();
  }
});
document.addEventListener("pointercancel", function () {}, { passive: true });

// ---- testability hooks (GAME_STANDARD) ----
window.__qaState = function () {
  return {
    mode: mode, board: cur ? cur.n : 0, grid: grid.slice(),
    solved: S.solved.slice(), dailyDone: S.dailyDone,
    over: !document.getElementById("unlock").classList.contains("hide")
  };
};
window.__qa = {
  setDay: function (n) { var real = Date.now; Date.now = function () { return real() + n * 86400000; }; },
  cycle: function (i, mark) { cycle(i, mark); },
  check: function () { return check(); },
  click: function (i) { cycle(i, false); }
};

// ---- boot ----
document.getElementById("tab-lib").textContent = T("lib");
document.getElementById("tab-daily").textContent = T("daily");
document.getElementById("checkBtn").textContent = T("check");
document.getElementById("wallBtn").textContent = T("wall");
document.getElementById("resetBtn").textContent = T("reset");
document.getElementById("wallTitle").textContent = T("wall");
document.getElementById("wallBtn").addEventListener("click", function () {
  document.getElementById("wall").scrollIntoView({ behavior: "smooth" });
});
setMode("lib");
