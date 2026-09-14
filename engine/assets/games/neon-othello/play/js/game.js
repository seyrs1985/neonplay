/* Neon Othello — strict Reversi engine + minimax AI + DOM board.
 * Board: 8x8 int grid. 0 empty | 1 cyan (dark discs, P1) | 2 pink (light discs, P2).
 * Classic rules: a move must flip >=1 enemy disc along 8 ray directions; a side
 * with no legal move passes automatically; game ends when the board is full or
 * neither side can move — most discs wins.
 */
'use strict';

/* ---------------- i18n (np_lang shared with site switcher) ---------------- */
var L = {
  en: {
    you: "You", ai: "AI", p1n: "Cyan", p2n: "Pink",
    yourTurn: "Your turn — tap a glowing square", aiTurn: "AI thinking…",
    t1: "Cyan's turn", t2: "Pink's turn",
    waitAi: "Wait — AI is thinking…", notYours: "Not your turn",
    illegal: "Must flip at least one disc", occupied: "That square is taken",
    youWin: "You win! 🎉", aiWin: "AI wins 🤖", p1Win: "Cyan wins!", p2Win: "Pink wins!", drawMsg: "Draw 🤝",
    rFull: "board full", rNoMoves: "neither side can move", rResign: "resigned",
    finalLine: "Final: {a} — {b}", newG: "New", resign: "Resign", again: "Play again", share: "Share",
    easy: "Easy", med: "Medium", hard: "Hard", daily: "Daily",
    passNote: "{s} has no moves — pass", dailyLine: "Daily {d} — {lvl} AI, you play {c}",
    statsLine: "W {w} · L {l} · D {d}",
    shared: "Result copied — paste it anywhere!",
    rankUp: "Rank up: {r}!",
    ranks: { bronze: "Bronze", silver: "Silver", gold: "Gold", platinum: "Platinum", diamond: "Diamond", master: "Master", legend: "Legend" },
  },
  zh: {
    you: "你", ai: "AI", p1n: "青方", p2n: "粉方",
    yourTurn: "你的回合 — 点发亮的格子", aiTurn: "AI 思考中…",
    t1: "青方回合", t2: "粉方回合",
    waitAi: "等一下 — AI 正在思考…", notYours: "还没到你",
    illegal: "必须至少翻转一个子", occupied: "这个格子已有棋子",
    youWin: "你赢了！🎉", aiWin: "AI 赢了 🤖", p1Win: "青方赢！", p2Win: "粉方赢！", drawMsg: "平局 🤝",
    rFull: "棋盘已满", rNoMoves: "双方都无法落子", rResign: "认输",
    finalLine: "终局：{a} — {b}", newG: "新一局", resign: "认输", again: "再来一局", share: "分享",
    easy: "简单", med: "中等", hard: "困难", daily: "每日",
    passNote: "{s}无处可走 — 跳过", dailyLine: "每日挑战 {d} — {lvl} AI，你执{c}",
    statsLine: "胜 {w} · 负 {l} · 和 {d}",
    shared: "结果已复制 — 去粘贴分享吧！",
    rankUp: "升段：{r}！",
    ranks: { bronze: "青铜", silver: "白银", gold: "黄金", platinum: "铂金", diamond: "钻石", master: "大师", legend: "传奇" },
  },
};
var T = function (k) { return (typeof npT === 'function') ? npT(L, k) : (L.en[k] || k); };

/* ---------------- persistence (np_ot_ prefix) ---------------- */
var K_STATS = 'np_ot_stats', K_RANK = 'np_ot_rank', K_DAILY = 'np_ot_daily', K_SET = 'np_ot_settings';
var SAVE = { stats: { w: 0, l: 0, d: 0 }, rank: { pts: 0, key: 'bronze' }, daily: { date: '', done: false, won: false } };

function readJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v || d; } catch (e) { return d; } }
function loadSave() {
  SAVE.stats = readJSON(K_STATS, SAVE.stats);
  SAVE.rank = readJSON(K_RANK, SAVE.rank);
  SAVE.daily = readJSON(K_DAILY, SAVE.daily);
}
function persistSave() {
  try {
    localStorage.setItem(K_STATS, JSON.stringify(SAVE.stats));
    localStorage.setItem(K_RANK, JSON.stringify(SAVE.rank));
    localStorage.setItem(K_DAILY, JSON.stringify(SAVE.daily));
    localStorage.setItem(K_SET, JSON.stringify(readJSON(K_SET, { sound: !Sound.isMuted(), level: G ? G.level : 'medium' })));
  } catch (e) {}
}

/* seven-tier ladder (site-wide stack): points from wins + net discs */
var RANKS = [
  { key: 'legend', min: 760, emoji: '🏆' }, { key: 'master', min: 520, emoji: '🥇' },
  { key: 'diamond', min: 340, emoji: '💎' }, { key: 'platinum', min: 200, emoji: '🥈' },
  { key: 'gold', min: 100, emoji: '🥉' }, { key: 'silver', min: 40, emoji: '⚔️' },
  { key: 'bronze', min: 0, emoji: '🛡️' },
];
function rankOf(pts) { for (var i = 0; i < RANKS.length; i++) if (pts >= RANKS[i].min) return RANKS[i]; return RANKS[RANKS.length - 1]; }

/* ---------------- pure engine ---------------- */
var N = 8;
var DIRS = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
function initialBoard() {
  var b = [], r, c;
  for (r = 0; r < N; r++) { b.push([0, 0, 0, 0, 0, 0, 0, 0]); }
  b[3][3] = 2; b[3][4] = 1; b[4][3] = 1; b[4][4] = 2; // classic diagonal start
  return b;
}
function cloneB(b) { return b.map(function (row) { return row.slice(); }); }
function countP(b, side) {
  var n = 0;
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (b[r][c] === side) n++;
  return n;
}
function countEmpty(b) {
  var n = 0;
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (!b[r][c]) n++;
  return n;
}
/* flips won by `side` playing empty (r,c); [] if occupied or no closing disc */
function flipsFor(b, r, c, side) {
  if (!inB(r, c) || b[r][c] !== 0) return [];
  var out = [], opp = 3 - side;
  for (var d = 0; d < 8; d++) {
    var dr = DIRS[d][0], dc = DIRS[d][1], rr = r + dr, cc = c + dc, ray = [];
    while (inB(rr, cc) && b[rr][cc] === opp) { ray.push([rr, cc]); rr += dr; cc += dc; }
    if (ray.length && inB(rr, cc) && b[rr][cc] === side) out = out.concat(ray);
  }
  return out;
}
function legalMoves(b, side) {
  var out = [];
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
    if (b[r][c] !== 0) continue;
    var f = flipsFor(b, r, c, side);
    if (f.length) out.push({ r: r, c: c, flips: f });
  }
  return out;
}
function applyMove(b, r, c, side, mv) {
  b[r][c] = side;
  var f = mv ? mv.flips : flipsFor(b, r, c, side);
  for (var i = 0; i < f.length; i++) b[f[i][0]][f[i][1]] = side;
  return f.length;
}
/* static eval, positive = good for side 1 (cyan) */
var WT = [
  120, -20, 20, 5, 5, 20, -20, 120,
  -20, -40, -5, -5, -5, -5, -40, -20,
  20, -5, 15, 3, 3, 15, -5, 20,
  5, -5, 3, 3, 3, 3, -5, 5,
  5, -5, 3, 3, 3, 3, -5, 5,
  20, -5, 15, 3, 3, 15, -5, 20,
  -20, -40, -5, -5, -5, -5, -40, -20,
  120, -20, 20, 5, 5, 20, -20, 120,
];
function evalBoard(b) {
  var s = 0, empties = 0, d1 = 0, d2 = 0;
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
    var v = b[r][c];
    if (!v) { empties++; continue; }
    var w = WT[r * N + c];
    if (v === 1) { s += w; d1++; } else { s -= w; d2++; }
  }
  if (empties <= 10) s += (d1 - d2) * 14; // endgame: discs start to matter
  else s += (d1 - d2) * 2;
  return s;
}

/* ---------------- AI: negamax + alpha-beta, node/time double fuse ---------------- */
function mkRng(seed) {
  if (typeof seed !== 'number' || !isFinite(seed)) return function () { return Math.random(); };
  var st = seed >>> 0;
  return function () { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
}
var AI_CFG = { easy: { d: 0, nodes: 0, ms: 0 }, medium: { d: 3, nodes: 40000, ms: 450 }, hard: { d: 5, nodes: 140000, ms: 650 } };

function moveScore(m) {
  var corner = (m.r === 0 || m.r === 7) && (m.c === 0 || m.c === 7);
  return (corner ? 1000 : 0) + m.flips.length;
}
function search(b, side, depth, alpha, beta, ctx) {
  ctx.nodes++;
  if ((ctx.nodes & 255) === 0 && (ctx.nodes > ctx.limitNodes || performance.now() - ctx.t0 > ctx.limitMs)) ctx.stop = true;
  var moves = legalMoves(b, side);
  if (depth <= 0 || ctx.stop) return side === 1 ? evalBoard(b) : -evalBoard(b);
  if (!moves.length) { // pass, or terminal if neither side can move
    if (!legalMoves(b, 3 - side).length) {
      var d = countP(b, side) - countP(b, 3 - side);
      return d > 0 ? 10000 + d : (d < 0 ? -10000 + d : 0);
    }
    return -search(b, 3 - side, depth - 1, -beta, -alpha, ctx);
  }
  moves.sort(function (a, c) { return moveScore(c) - moveScore(a); });
  var best = -Infinity;
  for (var i = 0; i < moves.length; i++) {
    var nb = cloneB(b);
    applyMove(nb, moves[i].r, moves[i].c, side, moves[i]);
    var sc = -search(nb, 3 - side, depth - 1, -beta, -alpha, ctx);
    if (ctx.stop) break;
    if (sc > best) best = sc;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best === -Infinity ? (side === 1 ? evalBoard(b) : -evalBoard(b)) : best;
}
function aiPickMove(b, side, level, rng, stat) {
  var moves = legalMoves(b, side);
  if (!moves.length) return null;
  var t0 = performance.now(), pick = null;
  if (level === 'easy') { // greedy: max flips, seeded tiebreak
    var maxF = 0, i;
    for (i = 0; i < moves.length; i++) maxF = Math.max(maxF, moves[i].flips.length);
    var pool = moves.filter(function (m) { return m.flips.length === maxF; });
    pick = pool[(rng() * pool.length) | 0];
    stat.nodes = 0; stat.ms = performance.now() - t0;
    return pick;
  }
  var cfg = AI_CFG[level] || AI_CFG.medium;
  var ordered = moves.slice().sort(function (a, c) { return moveScore(c) - moveScore(a); });
  var best = ordered[0];
  for (var d = 2; d <= cfg.d; d++) {
    var ctx = { nodes: 0, t0: performance.now(), limitNodes: cfg.nodes, limitMs: cfg.ms, stop: false };
    var curBest = null, curScore = -Infinity, a = -Infinity;
    for (var i2 = 0; i2 < ordered.length; i2++) {
      var nb = cloneB(b);
      applyMove(nb, ordered[i2].r, ordered[i2].c, side, ordered[i2]);
      var sc = -search(nb, 3 - side, d - 1, -Infinity, -a, ctx);
      if (ctx.stop) break;
      if (sc > curScore) { curScore = sc; curBest = ordered[i2]; if (sc > a) a = sc; }
    }
    if (curBest && !ctx.stop) best = curBest;
    if (ctx.stop) break;
  }
  stat.nodes = ctx ? ctx.nodes : 0;
  stat.ms = performance.now() - t0;
  return best;
}

/* ---------------- daily challenge: UTC-hash level+color+seeded opening ---------------- */
function hashStr(s) {
  var h = 2166136261 >>> 0;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 16777619) >>> 0; }
  return h >>> 0;
}
function utcDateStr(off) {
  var d = new Date(Date.now() + 86400000 * (off || 0));
  return d.toISOString().slice(0, 10);
}
function dailyInfo(dateStr) {
  var ds = dateStr || utcDateStr();
  var seed = hashStr('neon-othello-' + ds);
  var level = ['easy', 'medium', 'hard'][seed % 3];
  var human = ((seed >>> 5) & 1) ? 2 : 1; // which color the player runs today
  var rng = mkRng(seed ^ 0x9e3779b9);
  var b = initialBoard(), turn = 1, open = [];
  for (var ply = 0; ply < 4; ply++) { // fixed seeded 4-ply opening
    var mvs = legalMoves(b, turn);
    if (!mvs.length) break;
    var m = mvs[(rng() * mvs.length) | 0];
    applyMove(b, m.r, m.c, turn, m);
    open.push([m.r, m.c]);
    turn = 3 - turn;
  }
  return { date: ds, level: level, seed: seed, human: human, open: open, turn: turn };
}

/* ---------------- game state + DOM ---------------- */
var G = {
  state: 'PLAY', mode: 'ai', level: 'medium', turn: 1, human: 1,
  board: initialBoard(), legal: [], last: null, winner: 0, endReason: '',
  plies: 0, passCount: 0, fx: { flips: 0, passes: 0 }, ai: { ms: 0, nodes: 0 },
  rng: mkRng(), daily: null, aiTimer: 0, lastMoveInfo: null, passNote: '',
};
var boardEl = document.getElementById('board');
var msgEl = document.getElementById('msg');
function el(id) { return document.getElementById(id); }
function cellAt(rc) { return boardEl.children[rc[0] * N + rc[1]]; }

function buildBoard() {
  boardEl.innerHTML = '';
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
    var d = document.createElement('div');
    d.className = 'cell';
    d.dataset.r = r; d.dataset.c = c;
    d.setAttribute('role', 'button');
    boardEl.appendChild(d);
  }
}
function mkPiece(side, placed) {
  var d = document.createElement('div');
  d.className = 'piece ' + (side === 1 ? 'd1' : 'd2');
  d.innerHTML = '<div class="face f1"></div><div class="face f2"></div>';
  if (placed) d.classList.add('placed');
  return d;
}
function renderAll() {
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
    var cell = cellAt([r, c]);
    var p = cell.querySelector('.piece');
    if (p) p.remove();
    if (G.board[r][c]) cell.appendChild(mkPiece(G.board[r][c], false));
  }
  refreshMarkers();
}
function refreshMarkers() {
  var cells = boardEl.children;
  for (var i = 0; i < cells.length; i++) cells[i].classList.remove('last');
  var hs = document.querySelectorAll('#board .hint');
  for (var h = 0; h < hs.length; h++) hs[h].remove();
  if (G.last) cellAt(G.last).classList.add('last');
  if (G.state === 'PLAY' && isHumanTurn()) {
    for (var m = 0; m < G.legal.length; m++) {
      var hint = document.createElement('span');
      hint.className = 'hint';
      cellAt([G.legal[m].r, G.legal[m].c]).appendChild(hint);
    }
  }
  updateMsg();
  if (window.OT && window.OT.onRender) { try { window.OT.onRender(); } catch (e) {} }
}
function sideName(side) {
  if (G.mode === '2p') return T(side === 1 ? 'p1n' : 'p2n');
  return T(side === G.human ? 'you' : 'ai');
}
function isHumanTurn() {
  if (G.state !== 'PLAY') return false;
  return G.mode === '2p' || G.turn === G.human;
}
function updateMsg() {
  el('cR').textContent = countP(G.board, 1);
  el('cB').textContent = countP(G.board, 2);
  el('cRank').textContent = rankOf(SAVE.rank.pts).emoji + ' ' + T2('ranks', rankOf(SAVE.rank.pts).key);
  el('chipR').style.opacity = G.turn === 1 ? 1 : 0.55;
  el('chipB').style.opacity = G.turn === 2 ? 1 : 0.55;
  if (G.state !== 'PLAY') return; // endGame already set the message
  var note = G.passNote ? ' — ' + G.passNote : '';
  if (G.mode === '2p') msgEl.textContent = (G.turn === 1 ? T('t1') : T('t2')) + note;
  else if (G.turn === G.human) msgEl.textContent = T('yourTurn') + note;
  else msgEl.textContent = T('aiTurn');
}
function T2(group, k) {
  var lang = 'en';
  try { lang = (typeof npLang === 'function') ? npLang() : 'en'; } catch (e) {}
  var d = (L[lang] && L[lang][group]) || L.en[group] || {};
  return d[k] || (L.en[group] ? L.en[group][k] : k);
}
function toast(txt) {
  var old = el('toast'); if (old) old.remove();
  var t = document.createElement('div');
  t.id = 'toast'; t.textContent = txt;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 1400);
}
function sparks(cell, color) {
  for (var i = 0; i < 7; i++) {
    var s = document.createElement('span');
    s.className = 'spark'; s.style.background = color;
    s.style.boxShadow = '0 0 6px ' + color;
    var a = Math.random() * 6.28, rr = 12 + Math.random() * 16;
    s.style.setProperty('--dx', (Math.cos(a) * rr).toFixed(1) + 'px');
    s.style.setProperty('--dy', (Math.sin(a) * rr).toFixed(1) + 'px');
    cell.appendChild(s);
    (function (sp) { setTimeout(function () { sp.remove(); }, 620); })(s);
  }
}
function confetti() {
  var cols = ['#22d3ee', '#f472b6', '#facc15', '#a78bfa', '#4ade80'];
  for (var i = 0; i < 28; i++) {
    var f = document.createElement('span');
    f.className = 'cf';
    f.style.left = (2 + Math.random() * 94) + '%';
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty('--dx', ((Math.random() - 0.5) * 90).toFixed(0) + 'px');
    f.style.animationDelay = (Math.random() * 0.35).toFixed(2) + 's';
    boardEl.appendChild(f);
    (function (cf) { setTimeout(function () { cf.remove(); }, 1600); })(f);
  }
}

/* ---------------- turn flow ---------------- */
function newGame(mode, level, seed) {
  if (G.aiTimer) { clearTimeout(G.aiTimer); G.aiTimer = 0; }
  G.mode = mode || 'ai';
  if (G.mode === 'daily') { G.daily = dailyInfo(); G.level = G.daily.level; }
  else G.level = level || G.level || 'medium';
  G.board = initialBoard();
  G.state = 'PLAY'; G.winner = 0; G.endReason = ''; G.passNote = '';
  msgEl.classList.remove('winmsg', 'must');
  G.last = null; G.plies = 0; G.passCount = 0; G.lastMoveInfo = null;
  G.fx = { flips: 0, passes: 0 }; G.ai = { ms: 0, nodes: 0 };
  G.rng = (typeof seed === 'number' && isFinite(seed)) ? mkRng(seed) : (G.mode === 'daily' ? mkRng(G.daily.seed) : mkRng());
  G.human = G.mode === 'daily' ? G.daily.human : 1;
  G.turn = 1;
  if (G.mode === 'daily') { // replay the fixed seeded opening
    for (var i = 0; i < G.daily.open.length; i++) {
      var rc = G.daily.open[i];
      applyMove(G.board, rc[0], rc[1], G.turn, null);
      G.turn = 3 - G.turn;
    }
  }
  G.legal = legalMoves(G.board, G.turn);
  el('panel').hidden = true;
  el('lbR').textContent = G.mode === '2p' ? T('p1n') : (G.human === 1 ? T('you') : T('ai'));
  el('lbB').textContent = G.mode === '2p' ? T('p2n') : (G.human === 2 ? T('you') : T('ai'));
  if (G.mode === 'daily')
    toast(T('dailyLine').replace('{d}', G.daily.date)
      .replace('{lvl}', T(G.daily.level === 'easy' ? 'easy' : G.daily.level === 'hard' ? 'hard' : 'med'))
      .replace('{c}', T(G.daily.human === 1 ? 'p1n' : 'p2n')));
  renderAll();
  scheduleAi();
  return state();
}
function clickCell(r, c) {
  if (G.state !== 'PLAY') return;
  if (!isHumanTurn()) { Sound.sfx.bad(); toast(T('waitAi')); return; }
  var mv = null;
  for (var i = 0; i < G.legal.length; i++) if (G.legal[i].r === r && G.legal[i].c === c) { mv = G.legal[i]; break; }
  if (!mv) {
    Sound.sfx.bad();
    toast(G.board[r][c] ? T('occupied') : T('illegal'));
    boardEl.classList.remove('shake'); void boardEl.offsetWidth; boardEl.classList.add('shake');
    setTimeout(function () { boardEl.classList.remove('shake'); }, 480);
    return;
  }
  playMove(mv, true);
}
/* single entry point for playing a disc: flip animation + rules + pass handling */
function playMove(mv, auto) {
  var side = G.turn;
  var cell = cellAt([mv.r, mv.c]);
  var n = applyMove(G.board, mv.r, mv.c, side, mv);
  cell.appendChild(mkPiece(side, true));
  Sound.sfx.place();
  for (var i = 0; i < mv.flips.length; i++) {
    (function (rc, k) {
      var fEl = cellAt(rc).querySelector('.piece');
      if (fEl) { // swap face class -> CSS rotateY flip (staggered via transition-delay)
        fEl.style.transitionDelay = (k * 55) + 'ms';
        fEl.classList.remove('d1', 'd2');
        fEl.classList.add(side === 1 ? 'd1' : 'd2');
        setTimeout(function () { fEl.style.transitionDelay = ''; }, 420 + k * 55);
      }
      sparks(cellAt(rc), side === 1 ? '#22d3ee' : '#f472b6');
    })(mv.flips[i], i);
  }
  for (var s = 0; s < mv.flips.length && s < 8; s++) Sound.sfx.flip(s);
  G.fx.flips += n;
  G.last = [mv.r, mv.c];
  G.lastMoveInfo = { r: mv.r, c: mv.c, side: side, flipped: n };
  G.passNote = '';
  G.plies++;
  G.turn = 3 - G.turn;
  G.legal = legalMoves(G.board, G.turn);
  if (!G.legal.length) {
    if (!legalMoves(G.board, 3 - G.turn).length || countEmpty(G.board) === 0) {
      endGame(0, countEmpty(G.board) === 0 ? 'rFull' : 'rNoMoves');
      return n;
    }
    // side to move must pass — auto-pass with a visible note for both sides
    G.passCount++; G.fx.passes++;
    G.passNote = T('passNote').replace('{s}', sideName(G.turn));
    Sound.sfx.pass();
    G.turn = 3 - G.turn;
    G.legal = legalMoves(G.board, G.turn);
  }
  if (countP(G.board, 1) === 0 || countP(G.board, 2) === 0) { endGame(0, 'rNoMoves'); return n; }
  refreshMarkers();
  if (auto) scheduleAi();
  return n;
}
function endGame(winnerArg, reason) {
  G.state = 'OVER'; G.endReason = reason;
  if (G.aiTimer) { clearTimeout(G.aiTimer); G.aiTimer = 0; }
  var p1 = countP(G.board, 1), p2 = countP(G.board, 2);
  G.winner = winnerArg || (p1 > p2 ? 1 : (p2 > p1 ? 2 : 0));
  var isAi = G.mode !== '2p';
  var humanWon = isAi && G.winner === G.human;
  if (G.winner === 0) {
    msgEl.textContent = T('drawMsg'); Sound.sfx.draw();
    el('ptitle').textContent = T('drawMsg');
  } else if (isAi && G.winner !== G.human) {
    msgEl.textContent = T('aiWin'); Sound.sfx.lose(); el('ptitle').textContent = T('aiWin');
  } else {
    msgEl.textContent = isAi ? T('youWin') : (G.winner === 1 ? T('p1Win') : T('p2Win'));
    msgEl.classList.add('winmsg'); Sound.sfx.win(); confetti();
    el('ptitle').textContent = isAi ? T('youWin') : (G.winner === 1 ? T('p1Win') : T('p2Win'));
  }
  msgEl.classList.remove('must');
  if (isAi) {
    var net = Math.abs(p1 - p2);
    if (humanWon) {
      SAVE.stats.w++;
      SAVE.rank.pts += 8 + Math.min(net, 12); // win + capped net discs
      var rk = rankOf(SAVE.rank.pts);
      if (rk.key !== SAVE.rank.key) { SAVE.rank.key = rk.key; toast(T('rankUp').replace('{r}', T2('ranks', rk.key))); }
    } else if (G.winner === 0) SAVE.stats.d++;
    else SAVE.stats.l++;
  }
  if (G.mode === 'daily' && G.daily) SAVE.daily = { date: G.daily.date, done: true, won: humanWon };
  persistSave();
  el('pdetail').textContent = T('finalLine').replace('{a}', p1).replace('{b}', p2) + ' · ' + T(reason) + '\n' +
    T('statsLine').replace('{w}', SAVE.stats.w).replace('{l}', SAVE.stats.l).replace('{d}', SAVE.stats.d);
  el('panel').hidden = false;
  refreshMarkers();
}
function scheduleAi() {
  if (G.state !== 'PLAY' || G.mode === '2p' || G.turn === G.human) return;
  if (window.__qaFreeze) return; // deterministic QA: drive AI via __qa.aiMove()
  if (G.aiTimer) clearTimeout(G.aiTimer);
  G.aiTimer = setTimeout(aiTurn, 360 + Math.random() * 320);
}
function aiTurn() {
  if (G.state !== 'PLAY' || G.mode === '2p' || G.turn === G.human) return;
  if (window.__qaFreeze || document.hidden) { G.aiTimer = setTimeout(aiTurn, 250); return; }
  G.aiTimer = 0;
  var stat = { nodes: 0, ms: 0 };
  var mv = aiPickMove(G.board, G.turn, G.level, G.rng, stat);
  G.ai = { ms: Math.round(stat.ms), nodes: stat.nodes };
  if (!mv) { endGame(0, 'rNoMoves'); return; }
  playMove(mv, true);
}
function resign() {
  if (G.state !== 'PLAY') return;
  Sound.sfx.click();
  endGame(G.mode === '2p' ? 3 - G.turn : 3 - G.human, 'rResign');
}
function shareText() {
  var p1 = countP(G.board, 1), p2 = countP(G.board, 2);
  var head = G.mode === 'daily' && G.daily ? 'Neon Othello Daily ' + G.daily.date :
    (G.state === 'OVER' ? 'Neon Othello' : 'Neon Othello');
  var res = G.state === 'OVER' ? (G.winner === 0 ? 'Draw' : (G.winner === 1 ? 'Cyan' : 'Pink') + ' wins') : 'in progress';
  return head + ' — ' + T('finalLine').replace('{a}', p1).replace('{b}', p2) + ' (' + res + ') · ' +
    T2('ranks', rankOf(SAVE.rank.pts).key) + ' · play free: ' + location.href.split('?')[0];
}
function doShare() {
  Sound.sfx.click();
  var txt = shareText();
  var done = function () { toast(T('shared')); };
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(txt).then(done, function () { fallbackCopy(txt); done(); });
  } else { fallbackCopy(txt); done(); }
}
function fallbackCopy(txt) {
  var ta = document.createElement('textarea');
  ta.value = txt; ta.style.position = 'fixed'; ta.style.opacity = '0';
  document.body.appendChild(ta); ta.select();
  try { document.execCommand('copy'); } catch (e) {}
  ta.remove();
}

/* ---------------- board <-> string (QA injection: '.' empty, 'b' cyan, 'w' pink) ---------------- */
function boardRows(b) {
  var out = [];
  for (var r = 0; r < N; r++) {
    var s = '';
    for (var c = 0; c < N; c++) s += b[r][c] === 0 ? '.' : (b[r][c] === 1 ? 'b' : 'w');
    out.push(s);
  }
  return out;
}
function parseRows(rows) {
  if (!Array.isArray(rows) || rows.length !== N) throw new Error('need 8 rows');
  var m = { '.': 0, b: 1, w: 2, B: 1, W: 2 };
  var b = [];
  for (var r = 0; r < N; r++) {
    if (typeof rows[r] !== 'string' || rows[r].length !== N) throw new Error('row ' + r + ' must be 8 chars');
    var row = [];
    for (var c = 0; c < N; c++) {
      var v = m[rows[r][c]];
      if (typeof v !== 'number') throw new Error('bad char ' + rows[r][c]);
      row.push(v);
    }
    b.push(row);
  }
  return b;
}

/* ---------------- GAME_STANDARD QA surface ---------------- */
function state() {
  return {
    state: G.state, mode: G.mode, level: G.level, turn: G.turn, human: G.human,
    board: boardRows(G.board), counts: { p1: countP(G.board, 1), p2: countP(G.board, 2) },
    legalN: G.legal.length,
    legal: G.legal.map(function (m) { return { r: m.r, c: m.c, n: m.flips.length }; }),
    last: G.last ? G.last.slice() : null,
    lastMoveInfo: G.lastMoveInfo, winner: G.winner, endReason: G.endReason,
    plies: G.plies, passCount: G.passCount,
    fx: { flips: G.fx.flips, passes: G.fx.passes },
    ai: { ms: G.ai.ms, nodes: G.ai.nodes },
    daily: G.daily, rank: { pts: SAVE.rank.pts, key: SAVE.rank.key },
    stats: { w: SAVE.stats.w, l: SAVE.stats.l, d: SAVE.stats.d },
  };
}
window.__qaState = state;
window.__qaRender = function () { renderAll(); };
window.__qa = {
  state: state,
  newGame: function (mode, level, seed) { return newGame(mode, level, seed); },
  legal: function () { return G.legal.map(function (m) { return { r: m.r, c: m.c, flips: m.flips.map(function (p) { return p.slice(); }) }; }); },
  load: function (rows, turn, opts) {
    if (G.aiTimer) { clearTimeout(G.aiTimer); G.aiTimer = 0; }
    G.board = parseRows(rows);
    G.turn = turn === 2 ? 2 : 1;
    G.state = 'PLAY'; G.winner = 0; G.endReason = ''; G.last = null; G.passNote = '';
    G.passCount = 0; G.lastMoveInfo = null; G.daily = null;
    G.mode = (opts && opts.mode) || '2p'; G.level = (opts && opts.level) || G.level;
    G.human = (opts && opts.human) || 1;
    G.legal = legalMoves(G.board, G.turn);
    el('panel').hidden = true;
    renderAll();
    return state();
  },
  move: function (rc) {
    if (G.state !== 'PLAY') return { ok: false, reason: 'game-over' };
    var r = rc[0], c = rc[1];
    var mv = null;
    for (var i = 0; i < G.legal.length; i++) if (G.legal[i].r === r && G.legal[i].c === c) { mv = G.legal[i]; break; }
    if (!mv) {
      if (!inB(r, c)) return { ok: false, reason: 'off-board' };
      return { ok: false, reason: G.board[r][c] !== 0 ? 'occupied' : 'no-flip' };
    }
    var flipped = playMove(mv, false);
    var st = state();
    st.ok = true; st.flippedNow = flipped;
    return st;
  },
  aiMove: function () {
    if (G.state !== 'PLAY' || G.mode === '2p' || G.turn === G.human) return { ok: false, reason: 'not-ai-turn' };
    aiTurn();
    var st = state();
    st.ok = G.state === 'OVER' || G.lastMoveInfo !== null;
    return st;
  },
  settle: function () { // resolve pass / end conditions for the side to move
    if (G.state === 'PLAY' && !G.legal.length) {
      if (!legalMoves(G.board, 3 - G.turn).length) endGame(0, countEmpty(G.board) === 0 ? 'rFull' : 'rNoMoves');
      else {
        G.passCount++; G.fx.passes++;
        G.passNote = T('passNote').replace('{s}', sideName(G.turn));
        G.turn = 3 - G.turn;
        G.legal = legalMoves(G.board, G.turn);
      }
    } else if (G.state === 'PLAY' && countEmpty(G.board) === 0) endGame(0, 'rFull');
    else if (G.state === 'PLAY' && (countP(G.board, 1) === 0 || countP(G.board, 2) === 0)) endGame(0, 'rNoMoves');
    refreshMarkers();
    return state();
  },
  dailyInfo: dailyInfo,
  engine: { flipsFor: flipsFor, legalMoves: legalMoves, applyMove: applyMove, evalBoard: evalBoard, initialBoard: initialBoard, parseRows: parseRows, boardRows: boardRows, aiPickMove: aiPickMove, mkRng: mkRng, WT: WT },
};

/* namespace consumed by main.js (input routing) — logic stays here */
window.OT = {
  G: G, newGame: newGame, clickCell: clickCell, resign: resign, doShare: doShare,
  shareText: shareText, renderAll: renderAll, refreshMarkers: refreshMarkers,
  boardRows: boardRows, cellAt: cellAt, onRender: null,
};

buildBoard();
loadSave();
newGame('ai', (readJSON(K_SET, {}).level) || 'medium');
persistSave(); // write default key set at boot (np_ot_stats/rank/daily/settings)
