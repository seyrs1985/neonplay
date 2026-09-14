/* Neon Link — game core (DOM grid + SVG link overlay + persistence + i18n).
 * Pure logic lives in core.js (NLCore), audio in audio.js (Sound). */
'use strict';

// ---- i18n (np_core) ----
var L = {
  en: {
    casual: "Casual", standard: "Standard", daily: "Daily",
    hint: "💡 Hint", shuffle: "⇄ Shuffle", time: "Time", score: "Score",
    combo: "combo", noPath: "No path with ≤ 2 turns", mismatch: "Different tiles",
    shuffled: "Shuffled (−100)", autoShuffled: "No moves left — auto shuffle (−100)",
    win: "Board cleared!", timeBonus: "Time bonus", shuffles: "Shuffles",
    tilesScore: "Tiles", share: "Share", shared: "Copied", again: "Play again",
    close: "Close", dailyDone: "Daily cleared ✓ — come back tomorrow",
    streak: "Streak", best: "Best", nextRank: "{d}s faster → {r}",
    nextRankShuffle: "0 shuffles under 2:00 unlocks Platinum",
    topRank: "Top rank reached!", muteOn: "🔇", muteOff: "🔊",
    rank_legendary: "🏆 Legendary", rank_master: "🥇 Master", rank_platinum: "🥈 Platinum",
    rank_diamond: "💎 Diamond", rank_gold: "🟡 Gold", rank_silver: "⚪ Silver", rank_bronze: "🟤 Bronze",
    shareDaily: "🔗 Neon Link daily board cleared {t} · {s} shuffles {r} | {u}",
    shareMode: "🔗 Neon Link {m} board cleared {t} · {s} shuffles {r} | {u}",
    zeroShuffles: " · 0 shuffles",
  },
  zh: {
    casual: "休闲", standard: "标准", daily: "每日",
    hint: "💡 提示", shuffle: "⇄ 洗牌", time: "用时", score: "得分",
    combo: "连击", noPath: "不通——超过两次转折", mismatch: "图案不同",
    shuffled: "已洗牌（−100）", autoShuffled: "无可连对——自动洗牌（−100）",
    win: "全部连通，通关！", timeBonus: "时间分", shuffles: "洗牌",
    tilesScore: "牌面分", share: "分享", shared: "已复制", again: "再来一局",
    close: "关闭", dailyDone: "今日每日已完成 ✓——明天再来",
    streak: "连胜", best: "最佳", nextRank: "再快 {d} 秒升 {r}",
    nextRankShuffle: "2:00 内零洗牌可升白金",
    topRank: "已达最高段位！", muteOn: "🔇", muteOff: "🔊",
    rank_legendary: "🏆 传奇", rank_master: "🥇 大师", rank_platinum: "🥈 白金",
    rank_diamond: "💎 钻石", rank_gold: "🟡 黄金", rank_silver: "⚪ 白银", rank_bronze: "🟤 青铜",
    shareDaily: "🔗 Neon Link 每日牌局通关 {t} 零洗牌 {r} | {u}",
    shareMode: "🔗 Neon Link {m} 通关 {t} · {s} 次洗牌 {r} | {u}",
    zeroShuffles: " · 零洗牌",
  },
};
function T(k) { return npT(L, k); }

var FACES = ['🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🍑', '🥝', '🍍', '🥑', '🍒', '🥕'];
var MODES = { casual: { cols: 6, rows: 5, faces: 8 }, standard: { cols: 6, rows: 8, faces: 12 }, daily: { cols: 6, rows: 8, faces: 12 } };
var K = {
  best: 'np_neon-link_best', top10: 'np_neon-link_top10', daily: 'np_neon-link_daily',
  streak: 'np_neon-link_streak', stats: 'np_neon-link_stats', weekly: 'np_neon-link_weekly',
};
var SITE_URL = 'https://seyrs1985.github.io/neonplay/neon-link/';

// ---- persistence ----
function lsGet(k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
function localDateStr() {
  var d = new Date();
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
function weekKey() {
  var d = new Date(), t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  t.setUTCDate(t.getUTCDate() - ((t.getUTCDay() + 6) % 7) + 3);
  var f = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  f.setUTCDate(f.getUTCDate() - ((f.getUTCDay() + 6) % 7) + 3);
  var wk = 1 + Math.round((t - f) / 604800000);
  return t.getUTCFullYear() + '-W' + (wk < 10 ? '0' : '') + wk;
}

// ---- state ----
var G = {
  mode: 'casual', seed: 0, grid: [], cols: 6, rows: 5, facesN: 8, repairs: 0,
  sel: -1, tilesLeft: 0, pairsTotal: 0, score: 0, pairsScore: 0, timeBonus: 0,
  comboChain: 0, lastMatchMs: -1e9, hintsLeft: 3, shuffles: 0, failCount: 0, moves: 0,
  running: false, startMs: 0, elapsedMs: 0, timeSec: 0, over: false, rank: null,
  lastPathCorners: 0, cursor: 0,
};
window.__qaFreeze = false;

function tileEl(i) { return document.querySelectorAll('#grid .tile')[i]; }

// ---- board lifecycle ----
function startMode(m) {
  var cfg = MODES[m];
  G.mode = m; G.cols = cfg.cols; G.rows = cfg.rows; G.facesN = cfg.faces;
  G.seed = m === 'daily' ? NLCore.dailySeed(NLCore.utcDateStr()) : (Math.random() * 0xFFFFFFFF) >>> 0;
  var bd = NLCore.genBoard(G.cols, G.rows, G.facesN, G.seed); // repair-construction: assert-clearable
  G.grid = bd.grid; G.repairs = bd.repairs;
  G.sel = -1; G.tilesLeft = G.cols * G.rows; G.pairsTotal = G.tilesLeft / 2;
  G.score = 0; G.pairsScore = 0; G.timeBonus = 0; G.comboChain = 0; G.lastMatchMs = -1e9;
  G.hintsLeft = 3; G.shuffles = 0; G.failCount = 0; G.moves = 0;
  G.running = false; G.elapsedMs = 0; G.timeSec = 0; G.over = false; G.rank = null;
  G.lastPathCorners = 0; G.cursor = 0;
  document.getElementById('endPanel').classList.add('hide');
  document.getElementById('links').innerHTML = '';
  document.getElementById('fx').innerHTML = '';
  buildBoard(); renderHUD(); setMsg('');
  ['casual', 'standard', 'daily'].forEach(function (t) {
    document.getElementById('tab-' + t).classList.toggle('on', t === m);
  });
  var dl = lsGet(K.daily, null);
  if (m === 'daily' && dl && dl.done && dl.date === NLCore.utcDateStr()) setMsg(T('dailyDone'));
}

function buildBoard() {
  var grid = document.getElementById('grid');
  grid.innerHTML = '';
  grid.style.setProperty('--cols', G.cols);
  for (var i = 0; i < G.cols * G.rows; i++) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.dataset.i = i;
    b.setAttribute('aria-label', 'tile ' + (G.grid[i] + 1));
    b.textContent = FACES[G.grid[i]];
    b.addEventListener('pointerdown', function (e) {
      e.preventDefault(); Sound.resume(); tapTile(+this.dataset.i);
    }, { passive: false });
    grid.appendChild(b);
  }
  paintSel();
}

function setMsg(t) { document.getElementById('msg').textContent = t || ''; }

function paintSel() {
  var tiles = document.querySelectorAll('#grid .tile');
  for (var i = 0; i < tiles.length; i++) tiles[i].classList.toggle('sel', i === G.sel);
}

function renderHUD() {
  document.getElementById('timer').textContent = fmtTime(G.elapsedMs / 1000);
  document.getElementById('scoreV').textContent = G.score;
  document.getElementById('leftV').textContent = G.tilesLeft;
  document.getElementById('hintBtn').textContent = T('hint') + ' ×' + G.hintsLeft;
  document.getElementById('hintBtn').disabled = G.hintsLeft <= 0 || G.over;
  document.getElementById('shuffleBtn').disabled = G.over || G.tilesLeft === 0;
  document.getElementById('muteBtn').textContent = Sound.isMuted() ? T('muteOn') : T('muteOff');
  var pill = document.getElementById('comboPill');
  var mult = comboMult();
  if (G.comboChain >= 2) {
    pill.classList.remove('hide');
    pill.textContent = '×' + mult + ' ' + T('combo');
    pill.classList.remove('pop'); void pill.offsetWidth; pill.classList.add('pop');
  } else pill.classList.add('hide');
}
function fmtTime(secF) {
  var s = Math.max(0, Math.floor(secF));
  return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
}
function comboMult() { return Math.min(1 + (Math.max(1, G.comboChain) - 1) * 0.5, 2.5); }

// ---- gameplay ----
function tapTile(i) {
  if (G.over || i < 0 || i >= G.grid.length || G.grid[i] === -1) return;
  if (!G.running) { G.running = true; G.startMs = Date.now(); }
  if (G.sel === -1) { G.sel = i; paintSel(); Sound.sfx.select(); return; }
  if (G.sel === i) { G.sel = -1; paintSel(); return; }
  if (G.grid[G.sel] === G.grid[i]) {
    var path = NLCore.findPath(G.grid, G.rows, G.cols, G.sel, i);
    if (path) { matchPair(G.sel, i, path); return; }
    failFeedback(G.sel, i, T('noPath'));
    G.sel = i; paintSel();
    return;
  }
  failFeedback(G.sel, i, T('mismatch')); // wrong second tap cancels the first
  G.sel = -1; paintSel();
}

function failFeedback(a, b, msg) {
  G.failCount++;
  [a, b].forEach(function (i) {
    var el = tileEl(i); if (!el) return;
    el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake');
  });
  setMsg(msg); Sound.sfx.bad();
}

function matchPair(a, b, path) {
  var now = performance.now();
  G.comboChain = now - G.lastMatchMs <= 3000 ? G.comboChain + 1 : 1;
  G.lastMatchMs = now;
  var pts = Math.round(100 * comboMult());
  G.score += pts; G.pairsScore += pts; G.moves++;
  G.lastPathCorners = path.length;
  var faceA = G.grid[a];
  G.grid[a] = -1; G.grid[b] = -1; G.tilesLeft -= 2; G.sel = -1;
  [a, b].forEach(function (i) { var el = tileEl(i); if (el) el.classList.add('gone'); });
  paintSel();
  drawLink(path); burst(a); burst(b);
  Sound.sfx.link(G.comboChain);
  renderHUD();
  if (G.tilesLeft === 0) { finish(); return; }
  if (!NLCore.findMove(G.grid, G.rows, G.cols)) { setMsg(T('autoShuffled')); doShuffle(); }
}

function doShuffle() {
  if (G.over || G.tilesLeft === 0) return;
  G.shuffles++; G.score = Math.max(0, G.score - 100);
  var fuse = 60;
  NLCore.shuffleFill(G.grid, Math.random);
  while (!NLCore.findMove(G.grid, G.rows, G.cols) && fuse-- > 0) NLCore.shuffleFill(G.grid, Math.random);
  var swapFuse = 400; // repair swaps (mirrors generator repair net)
  while (!NLCore.findMove(G.grid, G.rows, G.cols) && swapFuse-- > 0) {
    var idxs = [], i;
    for (i = 0; i < G.grid.length; i++) if (G.grid[i] !== -1) idxs.push(i);
    var x = idxs[(Math.random() * idxs.length) | 0], y = idxs[(Math.random() * idxs.length) | 0];
    if (G.grid[x] !== G.grid[y]) { var t = G.grid[x]; G.grid[x] = G.grid[y]; G.grid[y] = t; }
  }
  var tiles = document.querySelectorAll('#grid .tile');
  for (var i = 0; i < G.grid.length; i++) {
    if (G.grid[i] === -1) continue;
    tiles[i].textContent = FACES[G.grid[i]];
    tiles[i].classList.remove('flip'); void tiles[i].offsetWidth; tiles[i].classList.add('flip');
  }
  G.sel = -1; paintSel();
  Sound.sfx.shuffle(); renderHUD();
}

function useHint() {
  if (G.over || G.hintsLeft <= 0) return;
  var mv = NLCore.findMove(G.grid, G.rows, G.cols);
  if (!mv) { doShuffle(); return; }
  G.hintsLeft--;
  [mv.a, mv.b].forEach(function (i) {
    var el = tileEl(i); if (!el) return;
    el.classList.remove('hinted'); void el.offsetWidth; el.classList.add('hinted');
    setTimeout(function () { el.classList.remove('hinted'); }, 2200);
  });
  Sound.sfx.hint(); renderHUD();
}

// ---- link overlay (SVG neon path) ----
function drawLink(path) {
  try {
    var svgNS = 'http://www.w3.org/2000/svg';
    var grid = document.getElementById('grid'), wrap = document.getElementById('boardWrap');
    var grect = grid.getBoundingClientRect(), wrect = wrap.getBoundingClientRect();
    var t0 = tileEl(0).getBoundingClientRect();
    var ts = t0.width;
    var pitchX = G.cols > 1 ? (grect.width - ts) / (G.cols - 1) : 0;
    var pitchY = G.rows > 1 ? (grect.height - t0.height) / (G.rows - 1) : 0;
    var gx = grect.left - wrect.left + ts / 2, gy = grect.top - wrect.top + t0.height / 2;
    var pts = path.map(function (p) { return [gx + p[1] * pitchX, gy + p[0] * pitchY]; });
    var d = 0;
    for (var i = 1; i < pts.length; i++) d += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    var str = pts.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var svg = document.getElementById('links');
    var els = ['lglow', 'lcore'].map(function (cls) {
      var el = document.createElementNS(svgNS, 'polyline');
      el.setAttribute('points', str); el.setAttribute('class', cls);
      el.style.strokeDasharray = Math.ceil(d) + 4;
      el.style.strokeDashoffset = Math.ceil(d) + 4;
      svg.appendChild(el); return el;
    });
    void svg.getBoundingClientRect();
    els.forEach(function (el) {
      el.style.transition = 'stroke-dashoffset .26s ease-out';
      el.style.strokeDashoffset = '0';
    });
    setTimeout(function () {
      els.forEach(function (el) { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; });
    }, 340);
    setTimeout(function () { els.forEach(function (el) { el.remove(); }); }, 750);
  } catch (e) { /* overlay must never break the game loop */ }
}

function burst(i) {
  try {
    var el = tileEl(i); if (!el) return;
    var fx = document.getElementById('fx');
    var r = el.getBoundingClientRect(), w = document.getElementById('boardWrap').getBoundingClientRect();
    for (var k = 0; k < 8; k++) {
      var s = document.createElement('span');
      s.className = 'pt';
      s.style.left = (r.left - w.left + r.width / 2) + 'px';
      s.style.top = (r.top - w.top + r.height / 2) + 'px';
      s.style.background = k % 2 ? '#ffd54a' : '#00e5ff';
      s.style.setProperty('--dx', ((Math.random() - 0.5) * 64).toFixed(0) + 'px');
      s.style.setProperty('--dy', ((Math.random() - 0.7) * 64).toFixed(0) + 'px');
      fx.appendChild(s);
      (function (node) { setTimeout(function () { node.remove(); }, 650); })(s);
    }
  } catch (e) {}
}

function confettiRain() {
  var cols = ['#ffd54a', '#39ff88', '#00e5ff', '#ff2d95', '#a78bfa'];
  for (var i = 0; i < 34; i++) {
    var f = document.createElement('span'); f.className = 'cf';
    f.style.left = (Math.random() * 100) + '%';
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty('--dx', ((Math.random() - .5) * 90).toFixed(0) + 'px');
    f.style.animationDelay = (Math.random() * .4).toFixed(2) + 's';
    document.body.appendChild(f);
    (function (el) { setTimeout(function () { el.remove(); }, 1700); })(f);
  }
}

// ---- rank / scoring ----
function rankOf(sec, shuffles) {
  if (sec < 60) return 'legendary';
  if (sec < 90) return 'master';
  if (sec < 120 && shuffles === 0) return 'platinum';
  if (sec <= 120) return 'diamond'; // acceptance: 119.9s -> Platinum, exactly 120s -> Diamond
  if (sec < 150) return 'gold';
  if (sec < 240) return 'silver';
  return 'bronze';
}
var PRESTIGE = ['bronze', 'silver', 'gold', 'diamond', 'platinum', 'master', 'legendary'];
var RANK_T = { legendary: 60, master: 90, platinum: 120, diamond: 120, gold: 150, silver: 240 };
function nextRankText(sec, shuffles, rank) {
  if (rank === 'legendary') return T('topRank');
  for (var i = PRESTIGE.length - 1; i >= 0; i--) {
    var r = PRESTIGE[i];
    if (r === rank) break;
    if (r === 'platinum' && sec < 120 && shuffles > 0) return T('nextRankShuffle');
    if (RANK_T[r] !== undefined && sec >= RANK_T[r]) {
      return T('nextRank').replace('{d}', (sec - RANK_T[r] + 1)).replace('{r}', T('rank_' + r));
    }
  }
  return '';
}

function finish() {
  G.over = true; G.running = false;
  if (!window.__qaFreeze) G.elapsedMs = Date.now() - G.startMs;
  var sec = Math.floor(G.elapsedMs / 1000);
  G.timeSec = sec;
  G.timeBonus = Math.max(0, 300 - sec);
  G.score += G.timeBonus;
  G.rank = rankOf(sec, G.shuffles);

  // persistence (design key list, np_neon-link_*)
  var stats = lsGet(K.stats, { games: 0, wins: 0, pairs: 0, shuffles: 0 });
  stats.games++; stats.wins++; stats.pairs += G.pairsTotal; stats.shuffles += G.shuffles;
  lsSet(K.stats, stats);
  var best = lsGet(K.best, null);
  if (!best || sec < best.timeSec) lsSet(K.best, { timeSec: sec, mode: G.mode, date: localDateStr() });
  var top10 = lsGet(K.top10, []);
  top10.push({ timeSec: sec, mode: G.mode, shuffles: G.shuffles, date: localDateStr(), seed: G.seed });
  top10.sort(function (a, b) { return a.timeSec - b.timeSec; });
  lsSet(K.top10, top10.slice(0, 10));
  var wk = lsGet(K.weekly, null);
  if (!wk || wk.weekKey !== weekKey() || !wk.best || sec < wk.best.timeSec)
    lsSet(K.weekly, { weekKey: weekKey(), best: { timeSec: sec } });
  if (G.mode === 'daily') {
    lsSet(K.daily, { date: NLCore.utcDateStr(), timeSec: sec, done: true });
    lsSet(K.streak, NLCore.bumpStreak(lsGet(K.streak, null), NLCore.utcDateStr()));
  }

  document.getElementById('epTitle').textContent = T('win');
  document.getElementById('epRank').textContent = T('rank_' + G.rank);
  var streak = lsGet(K.streak, null);
  var rows = '<div class="er"><span>' + T('time') + '</span><b>' + fmtTime(sec) + '</b></div>' +
    '<div class="er"><span>' + T('tilesScore') + '</span><b>' + G.pairsScore + '</b></div>' +
    '<div class="er"><span>' + T('timeBonus') + '</span><b>+' + G.timeBonus + '</b></div>' +
    '<div class="er"><span>' + T('shuffles') + '</span><b>' + G.shuffles + '</b></div>' +
    '<div class="er"><span>' + T('score') + '</span><b>' + G.score + '</b></div>' +
    '<div class="er"><span>→</span><b>' + nextRankText(sec, G.shuffles, G.rank) + '</b></div>';
  document.getElementById('epRows').innerHTML = rows;
  var note = T('score') + ' ' + G.score;
  var b2 = lsGet(K.best, null);
  if (b2) note += ' · ' + T('best') + ' ' + fmtTime(b2.timeSec);
  if (streak && streak.count) note += ' · ' + T('streak') + ' ' + streak.count + '🔥';
  document.getElementById('epNote').textContent = note;
  document.getElementById('epShare').textContent = T('share');
  document.getElementById('epRetry').textContent = G.mode === 'daily' ? T('close') : T('again');
  document.getElementById('endPanel').classList.remove('hide');
  confettiRain(); Sound.sfx.win(); renderHUD();
}

// ---- share (canvas card + Web Share -> clipboard fallback) ----
function shareText() {
  var zh = npLang() === 'zh';
  var r = T('rank_' + G.rank);
  var t = fmtTime(G.timeSec);
  var s = G.shuffles === 0 ? (zh ? '零洗牌' : '0 shuffles') : (zh ? G.shuffles + ' 次洗牌' : G.shuffles + ' shuffles');
  var tpl = T(G.mode === 'daily' ? 'shareDaily' : 'shareMode');
  return tpl.replace('{t}', t).replace('{s}', s).replace('{r}', r).replace('{u}', SITE_URL) +
    (G.mode === 'daily' ? ' #NeonLinkDaily ' + NLCore.utcDateStr().slice(5) : '');
}
function drawShareCard() {
  var cv = document.getElementById('shareCanvas'), c = cv.getContext('2d');
  var bg = c.createLinearGradient(0, 0, 480, 280);
  bg.addColorStop(0, '#141d42'); bg.addColorStop(1, '#0a0a18');
  c.fillStyle = bg; c.fillRect(0, 0, 480, 280);
  c.strokeStyle = '#00e5ff'; c.globalAlpha = .8; c.lineWidth = 3;
  c.strokeRect(8, 8, 464, 264); c.globalAlpha = 1;
  c.textAlign = 'center';
  c.fillStyle = '#00e5ff'; c.font = '900 34px system-ui,sans-serif';
  c.fillText('NEON LINK', 240, 58);
  c.fillStyle = '#ffd54a'; c.font = '900 64px system-ui,sans-serif';
  c.fillText(fmtTime(G.timeSec), 240, 140);
  c.fillStyle = '#e2e8f0'; c.font = '700 24px system-ui,sans-serif';
  c.fillText(T('rank_' + G.rank) + (G.shuffles === 0 ? ' · 0 ' + T('shuffles') : ' · ' + G.shuffles + ' ' + T('shuffles')), 240, 180);
  c.fillStyle = '#7c8db5'; c.font = '16px system-ui,sans-serif';
  c.fillText(NLCore.utcDateStr() + ' · ' + G.mode, 240, 214);
  c.fillStyle = '#39ff88'; c.font = '600 15px system-ui,sans-serif';
  c.fillText(SITE_URL.replace('https://', ''), 240, 250);
  return cv;
}
function shareResult() {
  var btn = document.getElementById('epShare');
  var done = function () { btn.textContent = '✓ ' + T('shared'); };
  var text = shareText();
  var copyFallback = function () {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(text).then(done, done);
      else done();
    } catch (e) { done(); }
  };
  try {
    var cv = drawShareCard();
    cv.toBlob(function (blob) {
      try {
        if (blob && navigator.share && navigator.canShare) {
          var file = new File([blob], 'neon-link.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], text: text }).then(done, copyFallback);
            return;
          }
        }
        if (navigator.share) { navigator.share({ text: text }).then(done, copyFallback); return; }
        copyFallback();
      } catch (e) { copyFallback(); }
    }, 'image/png');
  } catch (e) { copyFallback(); }
}

// ---- keyboard ----
document.addEventListener('keydown', function (e) {
  var r = (G.cursor / G.cols) | 0, c = G.cursor % G.cols;
  if (e.key === 'ArrowUp') { r = Math.max(0, r - 1); }
  else if (e.key === 'ArrowDown') { r = Math.min(G.rows - 1, r + 1); }
  else if (e.key === 'ArrowLeft') { c = Math.max(0, c - 1); }
  else if (e.key === 'ArrowRight') { c = Math.min(G.cols - 1, c + 1); }
  else if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault(); Sound.resume(); tapTile(G.cursor); return;
  }
  else if (e.key === 'h' || e.key === 'H') { useHint(); return; }
  else if (e.key === 's' || e.key === 'S') { setMsg(T('shuffled')); doShuffle(); return; }
  else if (e.key === 'm' || e.key === 'M') { Sound.setMuted(!Sound.isMuted()); renderHUD(); return; }
  else return;
  e.preventDefault();
  G.cursor = r * G.cols + c;
  var tiles = document.querySelectorAll('#grid .tile');
  for (var i = 0; i < tiles.length; i++) tiles[i].classList.toggle('kcur', i === G.cursor);
});

document.addEventListener('pointerdown', function () { Sound.resume(); }, { passive: true });
document.addEventListener('pointercancel', function () {}, { passive: true });

// ---- QA hooks (GAME_STANDARD) ----
window.__qaState = function () {
  return {
    mode: G.mode, seed: G.seed, cols: G.cols, rows: G.rows,
    over: G.over, running: G.running, tilesLeft: G.tilesLeft, pairsTotal: G.pairsTotal,
    score: G.score, pairsScore: G.pairsScore, timeBonus: G.timeBonus,
    comboChain: G.comboChain, mult: comboMult(), hintsLeft: G.hintsLeft,
    shuffles: G.shuffles, failCount: G.failCount, moves: G.moves,
    selected: G.sel, timeSec: G.timeSec, rank: G.rank,
    lastPathCorners: G.lastPathCorners, cursor: G.cursor,
    bestTimeSec: (lsGet(K.best, null) || {}).timeSec || null,
    top10Len: lsGet(K.top10, []).length,
    dailyDone: (lsGet(K.daily, null) || {}).done === true,
    streakCount: (lsGet(K.streak, null) || {}).count || 0,
    stats: lsGet(K.stats, null),
  };
};
window.__qaRender = function () { renderHUD(); paintSel(); };
window.__qa = {
  core: NLCore,
  board: function () { return G.grid.slice(); },
  tap: function (i) { tapTile(i); },
  canLink: function (i, j) { return !!NLCore.findPath(G.grid, G.rows, G.cols, i, j); },
  solveStep: function () {
    if (G.over) return { ok: false, why: 'over' };
    var mv = NLCore.findMove(G.grid, G.rows, G.cols);
    if (!mv) return { ok: false, why: 'no-move' };
    tapTile(mv.a); tapTile(mv.b);
    return { ok: true, corners: mv.path.length, tilesLeft: G.tilesLeft, score: G.score };
  },
  findDeadPair: function () { // same face, no <=2-turn path (for fail-path QA)
    var byFace = {};
    for (var i = 0; i < G.grid.length; i++)
      if (G.grid[i] !== -1) (byFace[G.grid[i]] || (byFace[G.grid[i]] = [])).push(i);
    var keys = Object.keys(byFace);
    for (var f = 0; f < keys.length; f++) {
      var cells = byFace[keys[f]];
      for (var i = 0; i < cells.length; i++)
        for (var j = i + 1; j < cells.length; j++)
          if (!NLCore.findPath(G.grid, G.rows, G.cols, cells[i], cells[j]))
            return [cells[i], cells[j]];
    }
    return null;
  },
  findMismatchPair: function () {
    var a = -1, b = -1;
    for (var i = 0; i < G.grid.length; i++) {
      if (G.grid[i] === -1) continue;
      if (a === -1) { a = i; continue; }
      if (G.grid[i] !== G.grid[a]) { b = i; break; }
    }
    return b >= 0 ? [a, b] : null;
  },
  hint: function () { useHint(); },
  shuffle: function () { doShuffle(); },
  shareCard: function () { try { return drawShareCard().toDataURL('image/png').length; } catch (e) { return 0; } },
  clearSave: function () { Object.keys(K).forEach(function (k) { try { localStorage.removeItem(K[k]); } catch (e) {} }); },
  genCheck: function (seed) {
    var a = NLCore.genBoard(6, 8, 12, seed), b = NLCore.genBoard(6, 8, 12, seed);
    var counts = {};
    a.grid.forEach(function (v) { counts[v] = (counts[v] || 0) + 1; });
    var even = Object.keys(counts).every(function (k) { return counts[k] % 2 === 0; });
    return {
      same: a.grid.join(',') === b.grid.join(','),
      cleared: NLCore.simulateClear(a.grid, 8, 6).cleared,
      even: even, tiles: a.grid.length, pairs: a.grid.length / 2, repairs: a.repairs,
    };
  },
  setDay: function (n) {
    var real = Date.now;
    Date.now = function () { return real() + n * 86400000; };
  },
};

// ---- wiring ----
document.getElementById('tab-casual').addEventListener('click', function () { startMode('casual'); });
document.getElementById('tab-standard').addEventListener('click', function () { startMode('standard'); });
document.getElementById('tab-daily').addEventListener('click', function () { startMode('daily'); });
document.getElementById('hintBtn').addEventListener('click', useHint);
document.getElementById('shuffleBtn').addEventListener('click', function () { setMsg(T('shuffled')); doShuffle(); });
document.getElementById('muteBtn').addEventListener('click', function () { Sound.setMuted(!Sound.isMuted()); renderHUD(); });
document.getElementById('epShare').addEventListener('click', shareResult);
document.getElementById('epRetry').addEventListener('click', function () {
  if (G.mode === 'daily') document.getElementById('endPanel').classList.add('hide');
  else startMode(G.mode);
});
setInterval(function () {
  if (!G.running || G.over || window.__qaFreeze) return;
  G.elapsedMs = Date.now() - G.startMs;
  document.getElementById('timer').textContent = fmtTime(G.elapsedMs / 1000);
}, 250);

// ---- boot ----
document.getElementById('tab-casual').textContent = T('casual');
document.getElementById('tab-standard').textContent = T('standard');
document.getElementById('tab-daily').textContent = T('daily');
document.getElementById('shuffleBtn').textContent = T('shuffle');
startMode('casual');
