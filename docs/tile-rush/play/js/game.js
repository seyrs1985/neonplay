/* Tile Rush — game core: layered triple-match with a 7-slot tray.
 * DOM board (z-index hit testing), construction-solvable deals,
 * daily worldwide seed, pull-out / shuffle props, retention suite. */
'use strict';

/* ---- i18n ---- */
var L = {
  en: {
    daily: "Daily", endless: "Endless", casual: "Casual", standard: "Standard", challenge: "Challenge",
    pullOut: "Pull-out", shuffleP: "Shuffle", x1: "×1", used: "—",
    buried: "That tile is buried — clear what covers it first.",
    winTitle: "Board Cleared!", loseTitle: "Tray Overflow",
    time: "Time", score: "Score", rank: "Rank", left: "Tiles left",
    nextRank: "{n} pts to {r}", topRank: "Top rank reached!",
    dailyNote: "Daily board cleared ✓ — replay to beat your time (same deal).",
    endlessNote: "Deal seed #{s}",
    loseNote: "Lost by {n} slot(s) — the board stays the same, retry the deal.",
    share: "Share", retry: "Retry this deal", newDeal: "New deal",
    best: "Best", streak: "Streak", shareWin: "🀄 Tile Rush daily cleared in {t} ({r}, {sc} pts)",
    shareLose: "🀄 Tile Rush — lost by {n} slot(s)… tomorrow's deal waits. Free, no ads:",
    copied: "✓ Copied", muted: "Mute", unmuted: "Sound"
  },
  zh: {
    daily: "每日牌局", endless: "无限模式", casual: "休闲", standard: "标准", challenge: "挑战",
    pullOut: "移出", shuffleP: "洗牌", x1: "×1", used: "—",
    buried: "这张牌被压住了——先移开上面的牌。",
    winTitle: "通关！", loseTitle: "托盘爆满",
    time: "用时", score: "得分", rank: "段位", left: "剩余牌",
    nextRank: "距 {r} 还差 {n} 分", topRank: "已达最高段位！",
    dailyNote: "今日牌局通关 ✓——同一副牌可反复挑战刷时间。",
    endlessNote: "牌局种子 #{s}",
    loseNote: "差 {n} 格败北——牌局不变，再试一次同题。",
    share: "分享", retry: "重试本局", newDeal: "换一副",
    best: "最佳", streak: "连胜", shareWin: "🀄 Tile Rush 每日牌局 {t} 通关（{r} {sc} 分）",
    shareLose: "🀄 Tile Rush——差 {n} 格败北…明天再来。免费无广告：",
    copied: "✓ 已复制", muted: "静音", unmuted: "声音"
  }
};
function T(k) { return npT(L, k); }

/* ---- constants ---- */
var FACES = TRGen.FACES, COLS = TRGen.COLS, ROWS = TRGen.ROWS, SLOTS = 7;
var PARAMS = {
  daily: { k: 18, L: 10 },
  casual: { k: 12, L: 6 },
  standard: { k: 18, L: 12 },
  challenge: { k: 24, L: 18 }
};
var RANKS = [
  { min: 2100, emoji: "🏆", key: "legend" }, { min: 1800, emoji: "🥇", key: "master" },
  { min: 1500, emoji: "💎", key: "diamond" }, { min: 1200, emoji: "🥈", key: "platinum" },
  { min: 900, emoji: "🟡", key: "gold" }, { min: 600, emoji: "⚪", key: "silver" },
  { min: 0, emoji: "🟤", key: "bronze" }
];
var RANK_NAMES = { en: { legend: "Legend", master: "Master", diamond: "Diamond", platinum: "Platinum", gold: "Gold", silver: "Silver", bronze: "Bronze" },
  zh: { legend: "传奇", master: "大师", diamond: "钻石", platinum: "白金", gold: "黄金", silver: "白银", bronze: "青铜" } };
function rankOf(score) { for (var i = 0; i < RANKS.length; i++) if (score >= RANKS[i].min) return RANKS[i]; return RANKS[RANKS.length - 1]; }
function rankName(r) { return (RANK_NAMES[npLang()] || RANK_NAMES.en)[r.key]; }
function nextRankGap(score) { for (var i = RANKS.length - 1; i >= 0; i--) if (score >= RANKS[i].min) return i === 0 ? null : { need: RANKS[i - 1].min - score, r: RANKS[i - 1] }; return null; }

/* ---- persistence (design doc key table) ---- */
function jget(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v === null ? d : v; } catch (e) { return d; } }
function jset(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
var META = {
  best: jget("np_tile-rush_best", null),
  top10: jget("np_tile-rush_top10", []),
  daily: jget("np_tile-rush_daily", { date: "", done: false, bestTimeSec: 0, bestScore: 0 }),
  streak: jget("np_tile-rush_streak", { count: 0, last: "", best: 0, protect: 1, protectMonth: "" }),
  stats: jget("np_tile-rush_stats", { games: 0, wins: 0, triples: 0, propsUsed: 0 }),
  weekly: jget("np_tile-rush_weekly", { weekKey: "", best: { score: 0, timeSec: 0 } })
};
function saveAll() {
  jset("np_tile-rush_best", META.best); jset("np_tile-rush_top10", META.top10);
  jset("np_tile-rush_daily", META.daily); jset("np_tile-rush_streak", META.streak);
  jset("np_tile-rush_stats", META.stats); jset("np_tile-rush_weekly", META.weekly);
}

/* ---- dates (UTC — daily board is worldwide-same) ---- */
function utcDateStr(offDays) {
  var d = new Date(Date.now() + (offDays || 0) * 86400000);
  return d.getUTCFullYear() + "-" + ("0" + (d.getUTCMonth() + 1)).slice(-2) + "-" + ("0" + d.getUTCDate()).slice(-2);
}
function dailySeed(offDays) { return parseInt(utcDateStr(offDays).replace(/-/g, ""), 10) >>> 0; }
function weekKey() {
  var d = new Date(), t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  var day = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - day + 3);
  var firstThu = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  var fd = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fd + 3);
  var wk = 1 + Math.round((t - firstThu) / 604800000);
  return t.getUTCFullYear() + "-W" + ("0" + wk).slice(-2);
}
function daysBetween(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }

/* ---- round state ---- */
var R = null; // current round
function newRound(mode, diff, seed) {
  var p = mode === "daily" ? PARAMS.daily : PARAMS[diff || "standard"];
  R = {
    mode: mode, diff: mode === "daily" ? "daily" : (diff || "standard"),
    seed: mode === "daily" ? dailySeed() : ((seed !== undefined && seed !== null) ? (seed >>> 0) : ((Math.random() * 0xFFFFFFFF) >>> 0)),
    k: p.k, L: p.L,
    tiles: [], order: [], orderIdx: 0,
    tray: [], props: { pull: true, shuffle: true }, propsUsed: 0, triples: 0,
    elapsed: 0, started: false, state: "playing"
  };
  var gen = TRGen.generate(R.seed, R.k, R.L);
  gen.tiles.forEach(function (t) { t.alive = true; });
  R.tiles = gen.tiles; R.order = gen.order;
  hidePanel();
  setMsg("");
  renderAll();
  if (mode === "daily" && META.daily.done && META.daily.date === utcDateStr(0)) setMsg(T("dailyNote"));
}

function aliveTiles() { return R.tiles.filter(function (t) { return t.alive; }); }
function coveredNow() {
  var m = TRGen.coveredMap(aliveTiles()), o = {};
  R.tiles.forEach(function (t) { if (t.alive) o[t.id] = m[t.id]; });
  return o;
}

/* ---- core rules ---- */
function pick(id) {
  if (!R || R.state !== "playing") return false;
  var t = R.tiles[id];
  if (!t || !t.alive) return false;
  if (coveredNow()[id]) { denyTile(id); return false; }
  if (!R.started) R.started = true;
  var rect = tileRect(id);
  t.alive = false;
  var same = -1;
  for (var i = R.tray.length - 1; i >= 0; i--) if (R.tray[i].face === t.face) { same = i; break; }
  var at = same >= 0 ? same + 1 : R.tray.length;
  R.tray.splice(at, 0, { id: t.id, face: t.face });
  TRSound.pick();
  flyClone(t.face, rect, at);
  renderBoard(); renderTray();
  // match check BEFORE overflow check: a 7th slot that completes a triple clears
  var cnt = 0; R.tray.forEach(function (x) { if (x.face === t.face) cnt++; });
  if (cnt >= 3) {
    R.tray = R.tray.filter(function (x) { return x.face !== t.face; });
    R.triples++;
    burstAtSlot(at, t.face);
    TRSound.match();
    renderTray();
    if (aliveTiles().length === 0 && R.tray.length === 0) { winRound(); return true; }
  } else if (R.tray.length >= SLOTS) { loseRound(); return true; }
  return true;
}

function winRound() {
  R.state = "won";
  var sec = Math.round(R.elapsed);
  var unused = (R.props.pull ? 1 : 0) + (R.props.shuffle ? 1 : 0);
  var score = 500 + Math.max(0, 900 - sec * 5) + unused * 150;
  R.score = score; R.timeSec = sec;
  var rk = rankOf(score); R.rankKey = rk.key; R.rankEmoji = rk.emoji;
  // retention
  META.stats.games++; META.stats.wins++; META.stats.triples += R.triples; META.stats.propsUsed += R.propsUsed;
  if (!META.best || score > META.best.score) META.best = { score: score, timeSec: sec, date: utcDateStr(0) };
  META.top10.push({ score: score, timeSec: sec, mode: R.mode, date: utcDateStr(0), seed: R.seed, dailyDate: R.mode === "daily" ? utcDateStr(0) : "" });
  META.top10.sort(function (a, b) { return b.score - a.score; });
  META.top10 = META.top10.slice(0, 10);
  var wk = weekKey();
  if (META.weekly.weekKey !== wk) META.weekly = { weekKey: wk, best: { score: 0, timeSec: 0 } };
  if (score > META.weekly.best.score) META.weekly.best = { score: score, timeSec: sec };
  if (R.mode === "daily") {
    var today = utcDateStr(0);
    if (META.daily.date !== today || !META.daily.done) {
      // streak counts once per day
      var st = META.streak, month = today.slice(0, 7);
      if (st.protectMonth !== month) { st.protectMonth = month; st.protect = 1; }
      if (st.last !== today) {
        var gap = st.last ? daysBetween(st.last, today) : 9999;
        if (gap === 1) st.count++;
        else if (gap === 2 && st.protect > 0) { st.protect--; st.count++; }
        else st.count = 1;
        st.last = today;
        if (st.count > st.best) st.best = st.count;
      }
    }
    META.daily.date = today; META.daily.done = true;
    if (sec < META.daily.bestTimeSec || !META.daily.bestTimeSec) META.daily.bestTimeSec = sec;
    if (score > META.daily.bestScore) META.daily.bestScore = score;
  }
  saveAll();
  TRSound.win();
  confettiRain();
  renderHUD();
  setTimeout(function () { showPanel(true); }, 450);
}

function loseRound() {
  R.state = "lost";
  META.stats.games++;
  saveAll();
  TRSound.fail();
  var trayEl = document.getElementById("tray");
  trayEl.classList.add("shake");
  setTimeout(function () { trayEl.classList.remove("shake"); }, 500);
  setTimeout(function () { showPanel(false); }, 650);
}

/* ---- props (1 per run each) ---- */
function pullOut() {
  if (!R || R.state !== "playing" || !R.props.pull || R.tray.length === 0) return false;
  R.props.pull = false; R.propsUsed++;
  var back = R.tray.splice(0, Math.min(3, R.tray.length));
  var topL = R.L, placed = [];
  back.forEach(function (x, i) {
    var cell = findFreeCell(placed);
    var nt = { id: R.tiles.length, face: x.face, layer: topL, col: cell.col, row: cell.row, ox: 0, oy: 0, alive: true };
    R.tiles.push(nt); placed.push(nt);
  });
  TRSound.propSfx();
  renderAll();
  return true;
}
function findFreeCell(exclude) {
  var alive = aliveTiles().concat(exclude);
  var best = null, bestScore = -1;
  for (var row = 1; row < ROWS - 1 && !best; row++)
    for (var col = 1; col < COLS - 1; col++) {
      var hit = false;
      for (var i = 0; i < alive.length && !hit; i++) {
        var u = alive[i];
        if (Math.abs(u.col + u.ox - col) < 0.92 && Math.abs(u.row + u.oy - row) < 0.92) hit = true;
      }
      var sc = 100 - Math.abs(col - 3) * 2 - Math.abs(row - 3) * 2; // center-ish
      if (!hit && sc > bestScore) { bestScore = sc; best = { col: col, row: row }; }
    }
  if (best) return best;
  return { col: (Math.random() * COLS) | 0, row: (Math.random() * ROWS) | 0 }; // crowded-board fallback
}
function doShuffle() {
  if (!R || R.state !== "playing" || !R.props.shuffle) return false;
  R.props.shuffle = false; R.propsUsed++;
  var trayCounts = {};
  R.tray.forEach(function (x) { trayCounts[x.face] = (trayCounts[x.face] || 0) + 1; });
  var out = TRGen.shuffleFaces(aliveTiles(), trayCounts, (R.seed ^ (R.triples * 2654435761)) >>> 0);
  if (out) R.tiles.forEach(function (t) { if (out[t.id]) t.face = out[t.id]; });
  TRSound.propSfx();
  renderAll();
  return true;
}

/* ---- rendering ---- */
function boardMetrics() {
  var el = document.getElementById("board");
  var w = el.clientWidth || 356;
  var pitch = w / COLS;
  return { pitch: pitch, size: Math.floor(pitch * 0.9), pad: 2 };
}
function renderBoard() {
  var b = document.getElementById("board"), m = boardMetrics(), cov = coveredNow();
  b.innerHTML = "";
  var maxRow = ROWS - 1;
  aliveTiles().forEach(function (t) { if (t.row > maxRow) maxRow = t.row; });
  b.style.height = Math.ceil((maxRow + 1.4) * m.pitch) + "px";
  aliveTiles().forEach(function (t) {
    var el = document.createElement("button");
    el.className = "tile" + (cov[t.id] ? " cov" : "");
    el.dataset.id = t.id;
    el.type = "button";
    el.textContent = t.face;
    el.tabIndex = cov[t.id] ? -1 : 0;
    el.setAttribute("aria-label", t.face);
    var x = m.pad + (t.col + t.ox) * m.pitch + (m.pitch - m.size) / 2;
    var y = m.pad + (t.row + t.oy) * m.pitch + (m.pitch - m.size) / 2;
    x = Math.max(1, Math.min(x, b.clientWidth - m.size - 1)); // keep on-screen
    y = Math.max(1, y);
    el.style.left = Math.round(x) + "px";
    el.style.top = Math.round(y) + "px";
    el.style.width = el.style.height = m.size + "px";
    el.style.fontSize = Math.round(m.size * 0.52) + "px";
    el.style.zIndex = 10 + t.layer * 3;
    var lift = Math.min(6, t.layer);
    el.style.boxShadow = "0 " + (1 + lift * 0.6).toFixed(1) + "px " + (3 + lift).toFixed(0) + "px rgba(0,0,0,.55)";
    b.appendChild(el);
  });
}
function tileRect(id) {
  var el = document.querySelector('.tile[data-id="' + id + '"]');
  return el ? el.getBoundingClientRect() : null;
}
function renderTray() {
  var tr = document.getElementById("tray");
  tr.innerHTML = "";
  for (var i = 0; i < SLOTS; i++) {
    var s = document.createElement("div");
    s.className = "slot" + (i < R.tray.length ? " full" : "");
    s.dataset.slot = i;
    if (i < R.tray.length) s.textContent = R.tray[i].face;
    tr.appendChild(s);
  }
  tr.classList.toggle("warn", R.tray.length >= 5);
}
function fmtTime(sec) { var m = Math.floor(sec / 60), s = sec % 60; return m + ":" + ("0" + s).slice(-2); }
function renderHUD() {
  document.getElementById("timer").textContent = "⏱ " + fmtTime(Math.round(R.elapsed));
  var b = META.best || { score: 0 };
  var rk = rankOf(b.score);
  document.getElementById("rankChip").textContent = rk.emoji + " " + b.score;
  document.getElementById("streakChip").textContent = "🔥 " + META.streak.count;
  var pb = document.getElementById("pullBtn");
  pb.textContent = T("pullOut") + " " + (R.props.pull ? T("x1") : T("used")) + " [1]";
  pb.disabled = !R.props.pull || R.tray.length === 0;
  var sb = document.getElementById("shuffleBtn");
  sb.textContent = T("shuffleP") + " " + (R.props.shuffle ? T("x1") : T("used")) + " [2]";
  sb.disabled = !R.props.shuffle;
}
function renderAll() { renderBoard(); renderTray(); renderHUD(); }

/* ---- juice ---- */
function flyClone(face, from, slotIdx) {
  if (!from) return;
  var c = document.createElement("div");
  c.className = "fly";
  c.textContent = face;
  c.style.left = from.left + "px"; c.style.top = from.top + "px";
  c.style.width = from.width + "px"; c.style.height = from.height + "px";
  c.style.fontSize = Math.round(from.width * 0.52) + "px";
  document.body.appendChild(c);
  requestAnimationFrame(function () {
    var tr = document.getElementById("tray");
    var slot = tr.children[Math.min(slotIdx, SLOTS - 1)];
    if (!slot) { c.remove(); return; }
    var to = slot.getBoundingClientRect();
    c.style.left = to.left + "px"; c.style.top = to.top + "px";
    c.style.width = to.width + "px"; c.style.height = to.height + "px";
  });
  setTimeout(function () { c.remove(); }, 340);
}
function burstAtSlot(slotIdx, face) {
  var tr = document.getElementById("tray");
  var slot = tr.children[Math.min(slotIdx, SLOTS - 1)];
  if (!slot) return;
  var r = slot.getBoundingClientRect();
  var cols = ["#ffd54a", "#00e5ff", "#ff2d95", "#39ff88"];
  for (var i = 0; i < 14; i++) {
    var p = document.createElement("span");
    p.className = "pt";
    p.textContent = Math.random() < 0.3 ? face : "•";
    p.style.left = (r.left + r.width / 2) + "px";
    p.style.top = (r.top + r.height / 2) + "px";
    p.style.color = cols[(Math.random() * cols.length) | 0];
    p.style.setProperty("--dx", ((Math.random() - 0.5) * 130).toFixed(0) + "px");
    p.style.setProperty("--dy", ((Math.random() - 0.9) * 120).toFixed(0) + "px");
    document.body.appendChild(p);
    (function (el) { setTimeout(function () { el.remove(); }, 700); })(p);
  }
}
function confettiRain() {
  var cols = ["#ffd54a", "#39ff88", "#00e5ff", "#ff2d95", "#a78bfa"];
  for (var i = 0; i < 34; i++) {
    var f = document.createElement("span");
    f.className = "cf";
    f.style.left = (Math.random() * 100) + "%";
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty("--dx", ((Math.random() - 0.5) * 90).toFixed(0) + "px");
    f.style.animationDelay = (Math.random() * 0.4).toFixed(2) + "s";
    document.body.appendChild(f);
    (function (el) { setTimeout(function () { el.remove(); }, 1700); })(f);
  }
}
function denyTile(id) {
  var el = document.querySelector('.tile[data-id="' + id + '"]');
  if (el) {
    el.classList.add("nudge");
    setTimeout(function () { el.classList.remove("nudge"); }, 320);
  }
  setMsg(T("buried"));
  TRSound.bad();
}
var msgTimer = null;
function setMsg(text) {
  var m = document.getElementById("msg");
  m.textContent = text || "";
  if (msgTimer) clearTimeout(msgTimer);
  if (text) msgTimer = setTimeout(function () { m.textContent = ""; }, 2200);
}

/* ---- end panel + share ---- */
function hidePanel() { document.getElementById("endPanel").classList.add("hide"); }
function showPanel(won) {
  var rk = won ? { emoji: R.rankEmoji, key: R.rankKey } : null;
  document.getElementById("epTitle").textContent = won ? T("winTitle") : T("loseTitle");
  var rows = "";
  if (won) {
    var gap = nextRankGap(R.score);
    rows = row(T("time"), fmtTime(R.timeSec)) + row(T("score"), R.score) +
      row(T("rank"), rk.emoji + " " + rankName(rk)) +
      row(T("best"), META.best ? META.best.score : 0) +
      "<div class='gap'>" + (gap ? T("nextRank").replace("{n}", gap.need).replace("{r}", rankName(gap.r)) : T("topRank")) + "</div>";
  } else {
    var near = 0, cnt = {};
    R.tray.forEach(function (x) { cnt[x.face] = (cnt[x.face] || 0) + 1; });
    Object.keys(cnt).forEach(function (f) { if (cnt[f] === 2) near++; });
    R.nearMiss = near || 1;
    rows = row(T("left"), aliveTiles().length + R.tray.length) + row(T("streak"), "🔥 " + META.streak.count);
  }
  document.getElementById("epRows").innerHTML = rows;
  document.getElementById("epNote").textContent =
    won ? (R.mode === "daily" ? T("dailyNote") : T("endlessNote").replace("{s}", R.seed)) : T("loseNote").replace("{n}", R.nearMiss);
  document.getElementById("epShare").textContent = T("share");
  document.getElementById("epRetry").textContent = T("retry");
  var newBtn = document.getElementById("epNew");
  newBtn.textContent = T("newDeal");
  newBtn.classList.toggle("hide", R.mode === "daily");
  if (won) drawShareCard();
  document.getElementById("endPanel").classList.remove("hide");
}
function row(k, v) { return "<div class='rrow'><span>" + k + "</span><b>" + v + "</b></div>"; }

function shareText(won) {
  var link = "https://seyrs1985.github.io/neonplay/tile-rush/";
  if (won) return T("shareWin").replace("{t}", fmtTime(R.timeSec)).replace("{r}", R.rankEmoji + rankName({ key: R.rankKey })).replace("{sc}", R.score) + " | " + link;
  return T("shareLose").replace("{n}", R.nearMiss) + " " + link;
}
function drawShareCard() {
  try {
    var cv = document.getElementById("shareCard"), g = cv.getContext("2d");
    var grd = g.createLinearGradient(0, 0, 600, 315);
    grd.addColorStop(0, "#141d42"); grd.addColorStop(1, "#0a0a18");
    g.fillStyle = grd; g.fillRect(0, 0, 600, 315);
    g.strokeStyle = "#00e5ff"; g.lineWidth = 3; g.strokeRect(8, 8, 584, 299);
    g.fillStyle = "#00e5ff"; g.font = "900 34px system-ui,sans-serif"; g.textAlign = "center";
    g.fillText("TILE RUSH", 300, 62);
    g.fillStyle = "#e2e8f0"; g.font = "900 84px system-ui,sans-serif";
    g.fillText(fmtTime(R.timeSec), 300, 165);
    g.fillStyle = "#ffd54a"; g.font = "700 30px system-ui,sans-serif";
    g.fillText(R.rankEmoji + " " + rankName({ key: R.rankKey }) + " · " + R.score + " pts", 300, 215);
    g.fillStyle = "#7c8db5"; g.font = "16px system-ui,sans-serif";
    g.fillText(utcDateStr(0) + (R.mode === "daily" ? " · #TileRushDaily" : ""), 300, 250);
    g.fillStyle = "#ff2d95";
    g.fillText("seyrs1985.github.io/neonplay/tile-rush", 300, 285);
  } catch (e) {}
}
function doShare() {
  var won = R.state === "won";
  var text = shareText(won);
  var btn = document.getElementById("epShare");
  var done = function () { btn.textContent = T("copied"); };
  var fallback = function () {
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(text).then(done, done);
    else done();
  };
  try {
    var cv = document.getElementById("shareCard");
    if (won && navigator.canShare && cv.toBlob) {
      cv.toBlob(function (blob) {
        if (!blob) return fallback();
        var file = new File([blob], "tile-rush.png", { type: "image/png" });
        var data = { title: "Tile Rush", text: text, files: [file] };
        if (navigator.canShare(data)) navigator.share(data).then(done, fallback);
        else fallback();
      });
      return;
    }
  } catch (e) {}
  if (won && navigator.share) { navigator.share({ title: "Tile Rush", text: text }).then(done, fallback); return; }
  fallback();
}

/* ---- timer ---- */
setInterval(function () {
  if (R && R.state === "playing" && R.started && !window.__qaFreeze) {
    R.elapsed += 0.25;
    document.getElementById("timer").textContent = "⏱ " + fmtTime(Math.round(R.elapsed));
  }
}, 250);
setInterval(function () { if (R && R.state === "playing") saveAll(); }, 10000); // auto-save cadence

/* ---- QA hooks (GAME_STANDARD §4) ---- */
window.__qaRender = function () { renderAll(); return true; };
window.__qaState = function () {
  if (!R) return null;
  var cov = coveredNow();
  return {
    state: R.state, mode: R.mode, diff: R.diff, seed: R.seed, k: R.k, L: R.L,
    tilesLeft: aliveTiles().length, trayLen: R.tray.length, tray: R.tray.map(function (x) { return x.face; }),
    score: R.score || 0, timeSec: R.timeSec || 0, triples: R.triples,
    props: { pull: R.props.pull, shuffle: R.props.shuffle }, propsUsed: R.propsUsed,
    elapsed: R.elapsed,
    tiles: R.tiles.map(function (t) {
      return { id: t.id, face: t.face, layer: t.layer, col: t.col, row: t.row, ox: t.ox, oy: t.oy, covered: t.alive ? cov[t.id] : null, alive: t.alive };
    }),
    order: R.order, orderIdx: R.orderIdx,
    best: META.best, stats: META.stats, streak: META.streak,
    daily: META.daily, top10Len: META.top10.length, weekly: META.weekly
  };
};
window.__qa = {
  clickTile: function (id) { return pick(id); },
  solveStep: function () { // remove the next construction-order triple (guaranteed free)
    if (!R || R.state !== "playing" || R.orderIdx >= R.order.length) return false;
    var ids = R.order[R.orderIdx++];
    ids.forEach(function (id) { pick(id); });
    return true;
  },
  newGame: function (mode, diff, seed) { newRound(mode || "daily", diff, seed); return true; },
  pullOut: function () { return pullOut(); },
  shuffle: function () { return doShuffle(); },
  rankOf: function (s) { return rankOf(s).key; },
  dailySeed: dailySeed,
  todayStr: function () { return utcDateStr(0); },
  setDay: function (n) {
    if (!this._real) this._real = Date.now;
    var real = this._real;
    Date.now = function () { return real() + n * 86400000; };
  },
  clearSave: function () {
    ["best", "top10", "daily", "streak", "stats", "weekly"].forEach(function (k2) {
      try { localStorage.removeItem("np_tile-rush_" + k2); } catch (e) {}
    });
  }
};
