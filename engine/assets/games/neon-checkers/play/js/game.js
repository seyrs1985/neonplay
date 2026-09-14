/* Neon Checkers — strict English draughts engine + minimax AI + DOM board.
 * Board: 8x8 int grid. 0 empty | 1 P1 man | 2 P1 king | 3 P2 man | 4 P2 king.
 * P1 (cyan, human, bottom rows 5-7) moves UP; P2 (pink, AI/2P, top rows 0-2) moves DOWN.
 * English rules: forced capture, maximal multi-jump sequences, men jump forward
 * only, kings all 4 diagonals, crowning on the far row ends the move.
 */
'use strict';

/* ---------------- i18n (np_lang shared with site switcher) ---------------- */
var L = {
  en: {
    you: "You", ai: "AI", p1n: "Cyan", p2n: "Pink",
    yourTurn: "Your turn — tap a cyan piece", aiTurn: "AI thinking…",
    t1: "Cyan's turn", t2: "Pink's turn",
    mustCap: "Must capture!", noMoves: "That piece has no moves", notYours: "Not your piece",
    waitAi: "Wait — AI is thinking…",
    youWin: "You win! 🎉", aiWin: "AI wins 🤖", p1Win: "Cyan wins!", p2Win: "Pink wins!", drawMsg: "Draw 🤝",
    rBlocked: "no legal moves", rPieces: "all pieces captured", rResign: "resigned",
    rQuiet: "60 quiet moves", rDrawAgreed: "draw agreed",
    newG: "New", draw: "Draw", resign: "Resign", again: "Play again",
    easy: "Easy", med: "Medium", hard: "Hard", daily: "Daily",
    drawNo: "AI declines the draw — it likes its position", drawYes: "AI accepts the draw",
    dailyLine: "Daily {d} — {lvl} AI, seeded board",
    statsLine: "W {w} · L {l} · D {d} · streak {s}",
    crownMsg: "Crowned! 👑",
  },
  zh: {
    you: "你", ai: "AI", p1n: "青方", p2n: "粉方",
    yourTurn: "你的回合 — 点一个青色棋子", aiTurn: "AI 思考中…",
    t1: "青方回合", t2: "粉方回合",
    mustCap: "必须吃子！", noMoves: "这个子不能动", notYours: "不是你的子",
    waitAi: "等一下 — AI 正在思考…",
    youWin: "你赢了！🎉", aiWin: "AI 赢了 🤖", p1Win: "青方赢！", p2Win: "粉方赢！", drawMsg: "平局 🤝",
    rBlocked: "无合法步", rPieces: "全部子被吃", rResign: "认输",
    rQuiet: "60 步无进展", rDrawAgreed: "协议和棋",
    newG: "新一局", draw: "求和", resign: "认输", again: "再来一局",
    easy: "简单", med: "中等", hard: "困难", daily: "每日",
    drawNo: "AI 拒绝和棋 — 它觉得形势不错", drawYes: "AI 接受和棋",
    dailyLine: "每日挑战 {d} — {lvl} AI，固定种子",
    statsLine: "胜 {w} · 负 {l} · 和 {d} · 连胜 {s}",
    crownMsg: "加冕为王！👑",
  },
};
var T = function (k) { return (typeof npT === 'function') ? npT(L, k) : (L.en[k] || k); };

/* ---------------- persistence (np_ck_ prefix) ---------------- */
var K_STATS = 'np_ck_stats', K_STREAK = 'np_ck_streak', K_DAILY = 'np_ck_daily', K_SET = 'np_ck_settings';
var SAVE = { stats: { w: 0, l: 0, d: 0, hardW: 0 }, streak: { cur: 0, best: 0 }, daily: { date: '', done: false, won: false } };

function readJSON(k, d) { try { var v = JSON.parse(localStorage.getItem(k) || 'null'); return v || d; } catch (e) { return d; } }
function loadSave() {
  SAVE.stats = readJSON(K_STATS, SAVE.stats);
  SAVE.streak = readJSON(K_STREAK, SAVE.streak);
  SAVE.daily = readJSON(K_DAILY, SAVE.daily);
}
function persistSave() {
  try {
    localStorage.setItem(K_STATS, JSON.stringify(SAVE.stats));
    localStorage.setItem(K_STREAK, JSON.stringify(SAVE.streak));
    localStorage.setItem(K_DAILY, JSON.stringify(SAVE.daily));
    localStorage.setItem(K_SET, JSON.stringify(readJSON(K_SET, { sound: !Sound.isMuted(), level: G ? G.level : 'medium' })));
  } catch (e) {}
}

/* ---------------- pure engine ---------------- */
var N = 8;
function ownerOf(v) { return v === 0 ? 0 : (v <= 2 ? 1 : 2); }
function isKingV(v) { return v === 2 || v === 4; }
function kingOf(side) { return side === 1 ? 2 : 4; }
function manOf(side) { return side === 1 ? 1 : 3; }
function dirsOf(v) {
  if (isKingV(v)) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  return ownerOf(v) === 1 ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
}
function inB(r, c) { return r >= 0 && r < N && c >= 0 && c < N; }
function initialBoard() {
  var b = [];
  for (var r = 0; r < N; r++) { b.push([0, 0, 0, 0, 0, 0, 0, 0]); }
  for (var i = 0; i < 3; i++) for (var j = 0; j < N; j++) if ((i + j) % 2 === 1) b[i][j] = 3;
  for (var i2 = 5; i2 < 8; i2++) for (var j2 = 0; j2 < N; j2++) if ((i2 + j2) % 2 === 1) b[i2][j2] = 1;
  return b;
}
function cloneB(b) { return b.map(function (row) { return row.slice(); }); }
function countPieces(b, side) {
  var n = 0;
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) if (ownerOf(b[r][c]) === side) n++;
  return n;
}
/* one-step jumps from (r,c) given piece value v (men jump forward only — English) */
function jumpsFrom(b, r, c, v) {
  var out = [], dirs = dirsOf(v);
  for (var i = 0; i < dirs.length; i++) {
    var dr = dirs[i][0], dc = dirs[i][1];
    var mr = r + dr, mc = c + dc, tr = r + 2 * dr, tc = c + 2 * dc;
    if (!inB(tr, tc)) continue;
    if (b[tr][tc] !== 0) continue;
    var mv = b[mr][mc];
    if (mv !== 0 && ownerOf(mv) !== ownerOf(v)) out.push({ to: [tr, tc], over: [mr, mc] });
  }
  return out;
}
/* maximal capture sequences for the piece at (r,c); crowning terminates (English) */
function seqFrom(b, r, c) {
  var v = b[r][c], from = [r, c], out = [];
  function rec(bb, r0, c0, path, caps) {
    var js = jumpsFrom(bb, r0, c0, v);
    if (!js.length) { if (path.length) out.push({ from: from, path: path.slice(), caps: caps.slice() }); return; }
    var crownRow = ownerOf(v) === 1 ? 0 : 7;
    for (var i = 0; i < js.length; i++) {
      var j = js[i];
      if (j.to[0] === crownRow && !isKingV(v)) { // crowned mid-jump: move ends here
        out.push({ from: from, path: path.concat([j.to]), caps: caps.concat([j.over]), crowned: true });
        continue;
      }
      var nb = cloneB(bb);
      nb[r0][c0] = 0; nb[j.over[0]][j.over[1]] = 0; nb[j.to[0]][j.to[1]] = v;
      rec(nb, j.to[0], j.to[1], path.concat([j.to]), caps.concat([j.over]));
    }
  }
  rec(b, r, c, [], []);
  return out;
}
/* all legal moves for side: captures are compulsory (forced capture) */
function allMoves(b, side) {
  var caps = [], quiet = [], r, c;
  for (r = 0; r < N; r++) for (c = 0; c < N; c++) {
    var v = b[r][c];
    if (ownerOf(v) !== side) continue;
    var seqs = seqFrom(b, r, c);
    for (var i = 0; i < seqs.length; i++) caps.push(seqs[i]);
    var dirs = dirsOf(v);
    for (var d = 0; d < dirs.length; d++) {
      var tr = r + dirs[d][0], tc = c + dirs[d][1];
      if (inB(tr, tc) && b[tr][tc] === 0) quiet.push({ from: [r, c], path: [[tr, tc]], caps: [] });
    }
  }
  return caps.length ? caps : quiet;
}
/* apply a legal move in place; returns {crowned, captured} */
function applyMove(b, mv) {
  var fr = mv.from[0], fc = mv.from[1], v = b[fr][fc];
  var side = ownerOf(v);
  b[fr][fc] = 0;
  for (var i = 0; i < mv.caps.length; i++) b[mv.caps[i][0]][mv.caps[i][1]] = 0;
  var end = mv.path[mv.path.length - 1];
  var crownRow = side === 1 ? 0 : 7;
  var crowned = false;
  if (!isKingV(v) && end[0] === crownRow) { v = kingOf(side); crowned = true; }
  b[end[0]][end[1]] = v;
  return { crowned: crowned, captured: mv.caps.length };
}
/* static eval, positive = good for P1 (cyan) */
function evalBoard(b) {
  var s = 0;
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
    var v = b[r][c];
    if (!v) continue;
    var side = ownerOf(v), k = isKingV(v);
    var val = k ? 168 : 100;
    if (!k) val += (side === 1 ? (5 - r) : (r - 2)) * 3;
    if (c >= 2 && c <= 5) val += 4;
    if (r >= 2 && r <= 5) val += 2;
    if (!k && ((side === 1 && r === 7) || (side === 2 && r === 0))) val += 8;
    s += side === 1 ? val : -val;
  }
  return s;
}

/* ---------------- AI: negamax + alpha-beta, node/time double fuse (LESSONS 14) */
function mkRng(seed) {
  if (typeof seed !== 'number' || !isFinite(seed)) return function () { return Math.random(); };
  var st = seed >>> 0;
  return function () { st = (st * 1664525 + 1013904223) >>> 0; return st / 4294967296; };
}
var AI_CFG = { easy: { d: 0, nodes: 0, ms: 0 }, medium: { d: 3, nodes: 30000, ms: 500 }, hard: { d: 5, nodes: 90000, ms: 700 } };

function search(b, side, depth, alpha, beta, ctx) {
  ctx.nodes++;
  if ((ctx.nodes & 255) === 0 && (ctx.nodes > ctx.limitNodes || performance.now() - ctx.t0 > ctx.limitMs)) ctx.stop = true;
  var moves = allMoves(b, side);
  if (!moves.length) return -(10000 + depth); // side to move has no reply: it loses
  if (depth <= 0 || ctx.stop) return side === 1 ? evalBoard(b) : -evalBoard(b);
  moves.sort(function (a, c) { return c.caps.length - a.caps.length; });
  var best = -Infinity;
  for (var i = 0; i < moves.length; i++) {
    var nb = cloneB(b);
    applyMove(nb, moves[i]);
    var sc = -search(nb, 3 - side, depth - 1, -beta, -alpha, ctx);
    if (ctx.stop) break;
    if (sc > best) best = sc;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best === -Infinity ? (side === 1 ? evalBoard(b) : -evalBoard(b)) : best;
}
function aiPickMove(b, side, level, rng, stat) {
  var moves = allMoves(b, side);
  if (!moves.length) return null;
  var t0 = performance.now();
  var pick = null;
  if (level === 'easy') {
    var maxC = 0, i;
    for (i = 0; i < moves.length; i++) maxC = Math.max(maxC, moves[i].caps.length);
    if (maxC > 0) {
      var cs = moves.filter(function (m) { return m.caps.length === maxC; });
      pick = cs[(rng() * cs.length) | 0];
    } else {
      pick = moves[(rng() * moves.length) | 0];
    }
    stat.nodes = 0; stat.ms = performance.now() - t0;
    return pick;
  }
  var cfg = AI_CFG[level] || AI_CFG.medium;
  var ordered = moves.slice().sort(function (a, c) { return c.caps.length - a.caps.length; });
  var best = ordered[0];
  for (var d = 2; d <= cfg.d; d++) {
    var ctx = { nodes: 0, t0: performance.now(), limitNodes: cfg.nodes, limitMs: cfg.ms, stop: false };
    var curBest = null, curScore = -Infinity, a = -Infinity;
    for (var i2 = 0; i2 < ordered.length; i2++) {
      var nb = cloneB(b);
      applyMove(nb, ordered[i2]);
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

/* ---------------- daily challenge: UTC-hash level + seeded game ---------------- */
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
  var seed = hashStr('neon-checkers-' + ds);
  var level = ['easy', 'medium', 'hard'][seed % 3];
  var rng = mkRng(seed ^ 0x9e3779b9);
  var mvs = allMoves(initialBoard(), 2);
  var open = mvs[(rng() * mvs.length) | 0];
  return { date: ds, level: level, seed: seed, open: [open.from, open.path[open.path.length - 1]] };
}

/* ---------------- game state + DOM ---------------- */
var G = {
  state: 'PLAY', mode: 'ai', level: 'medium', turn: 1,
  board: initialBoard(), legal: [], sel: null, last: null,
  winner: 0, endReason: '', plies: 0, quiet: 0,
  fx: { captures: 0, crowns: 0 }, ai: { ms: 0, nodes: 0 },
  rng: mkRng(), daily: null, aiOpens: 0, aiTimer: 0, lastMoveInfo: null,
};
var boardEl = document.getElementById('board');
var msgEl = document.getElementById('msg');
function el(id) { return document.getElementById(id); }
function cellAt(rc) { return boardEl.children[rc[0] * N + rc[1]]; }
function pieceClass(v) { return v === 1 ? 'piece p1' : v === 2 ? 'piece p1 k1' : v === 3 ? 'piece p2' : 'piece p2 k2'; }

function buildBoard() {
  boardEl.innerHTML = '';
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
    var d = document.createElement('div');
    var dark = (r + c) % 2 === 1;
    d.className = 'cell ' + (dark ? 'dark' : 'light');
    if (dark) { d.dataset.r = r; d.dataset.c = c; d.setAttribute('role', 'button'); }
    boardEl.appendChild(d);
  }
}
function renderAll() {
  for (var r = 0; r < N; r++) for (var c = 0; c < N; c++) {
    var cell = cellAt([r, c]);
    var p = cell.querySelector('.piece');
    if (p) p.remove();
    if (G.board[r][c]) {
      var d = document.createElement('div');
      d.className = pieceClass(G.board[r][c]);
      cell.appendChild(d);
    }
  }
  refreshMarkers();
}
function refreshMarkers() {
  var cells = boardEl.children;
  for (var i = 0; i < cells.length; i++) cells[i].classList.remove('from', 'to', 'selq');
  var hs = document.querySelectorAll('#board .hint');
  for (var h = 0; h < hs.length; h++) hs[h].remove();
  if (G.last) {
    cellAt(G.last.from).classList.add('from');
    cellAt(G.last.to).classList.add('to');
  }
  var mustCap = G.legal.length > 0 && G.legal[0].caps.length > 0;
  boardEl.classList.toggle('mustcap', !!(mustCap && G.state === 'PLAY'));
  if (G.sel && G.state === 'PLAY') {
    cellAt(G.sel).classList.add('selq');
    for (var m = 0; m < G.legal.length; m++) {
      var mv = G.legal[m];
      if (mv.from[0] !== G.sel[0] || mv.from[1] !== G.sel[1]) continue;
      var end = mv.path[mv.path.length - 1];
      var hint = document.createElement('span');
      hint.className = 'hint';
      cellAt(end).appendChild(hint);
      for (var s = 0; s < mv.path.length - 1; s++) cellAt(mv.path[s]).classList.add('to');
    }
  }
  updateMsg();
  if (window.CK && window.CK.onRender) { try { window.CK.onRender(); } catch (e) {} }
}
function updateMsg() {
  el('cR').textContent = countPieces(G.board, 1);
  el('cB').textContent = countPieces(G.board, 2);
  el('cStreak').textContent = SAVE.streak.cur;
  el('chipR').style.opacity = G.turn === 1 ? 1 : 0.55;
  el('chipB').style.opacity = G.turn === 2 ? 1 : 0.55;
  if (G.state !== 'PLAY') return; // endGame already set the message
  var mustCap = G.legal.length > 0 && G.legal[0].caps.length > 0;
  msgEl.classList.toggle('must', !!mustCap);
  if (G.mode === '2p') msgEl.textContent = (G.turn === 1 ? T('t1') : T('t2')) + (mustCap ? ' — ' + T('mustCap') : '');
  else if (G.turn === 1) msgEl.textContent = mustCap ? T('mustCap') : T('yourTurn');
  else msgEl.textContent = T('aiTurn');
}
function toast(txt) {
  var old = el('toast'); if (old) old.remove();
  var t = document.createElement('div');
  t.id = 'toast'; t.textContent = txt;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 1100);
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
  G.turn = 1; G.state = 'PLAY'; G.winner = 0; G.endReason = '';
  msgEl.classList.remove('winmsg', 'must');
  G.sel = null; G.last = null; G.plies = 0; G.quiet = 0; G.lastMoveInfo = null;
  G.fx = { captures: 0, crowns: 0 }; G.ai = { ms: 0, nodes: 0 };
  G.rng = (typeof seed === 'number' && isFinite(seed)) ? mkRng(seed) : (G.mode === 'daily' ? mkRng(G.daily.seed) : mkRng());
  G.aiOpens = G.mode === 'daily' ? 1 : 0; // seeded opening move for daily AI
  G.legal = allMoves(G.board, G.turn);
  el('panel').hidden = true;
  el('lbR').textContent = G.mode === '2p' ? T('p1n') : T('you');
  el('lbB').textContent = G.mode === '2p' ? T('p2n') : T('ai');
  if (G.mode === 'daily') toast(T('dailyLine').replace('{d}', G.daily.date).replace('{lvl}', T(G.daily.level === 'easy' ? 'easy' : G.daily.level === 'hard' ? 'hard' : 'med')));
  renderAll();
  return state();
}
function selMoves() {
  if (!G.sel) return [];
  return G.legal.filter(function (m) { return m.from[0] === G.sel[0] && m.from[1] === G.sel[1]; });
}
function clickCell(r, c) {
  if (G.state !== 'PLAY') return;
  if (G.mode !== '2p' && G.turn === 2) { Sound.sfx.bad(); toast(T('waitAi')); return; }
  var sm = selMoves();
  for (var i = 0; i < sm.length; i++) {
    var end = sm[i].path[sm[i].path.length - 1];
    if (end[0] === r && end[1] === c) { doMove(sm[i], true); return; }
  }
  var v = G.board[r][c];
  if (v && ownerOf(v) === G.turn) {
    if (!selMovesFor(r, c).length) {
      Sound.sfx.bad();
      toast(G.legal.length && G.legal[0].caps.length ? T('mustCap') : T('noMoves'));
      boardEl.classList.remove('shake'); void boardEl.offsetWidth; boardEl.classList.add('shake');
      setTimeout(function () { boardEl.classList.remove('shake'); }, 480);
      return;
    }
    G.sel = [r, c];
    Sound.sfx.select();
    refreshMarkers();
    return;
  }
  Sound.sfx.bad();
  if (v && ownerOf(v) !== G.turn) toast(T('notYours'));
}
function selMovesFor(r, c) {
  return G.legal.filter(function (m) { return m.from[0] === r && m.from[1] === c; });
}
/* single entry point for playing a move: FLIP animation + rules + turn switch */
function doMove(mv, auto) {
  var fromCell = cellAt(mv.from);
  var pieceEl = fromCell.querySelector('.piece');
  var wasKing = isKingV(G.board[mv.from[0]][mv.from[1]]);
  var res = applyMove(G.board, mv);
  var end = mv.path[mv.path.length - 1];
  var toCell = cellAt(end);
  if (pieceEl && toCell && pieceEl.parentNode !== toCell) {
    var fr = fromCell.getBoundingClientRect(), tr2 = toCell.getBoundingClientRect();
    toCell.appendChild(pieceEl);
    pieceEl.style.transition = 'none';
    pieceEl.style.transform = 'translate(' + (fr.left - tr2.left) + 'px,' + (fr.top - tr2.top) + 'px)';
    void pieceEl.offsetWidth;
    pieceEl.style.transition = 'transform .18s ease';
    pieceEl.style.transform = 'translate(0,0)';
    pieceEl.classList.add('land');
    setTimeout(function () { pieceEl.classList.remove('land'); }, 340);
  }
  for (var i = 0; i < mv.caps.length; i++) {
    (function (rc, k) {
      var cEl = cellAt(rc);
      var p = cEl.querySelector('.piece');
      if (p) {
        setTimeout(function () { p.classList.add('gone'); }, 90 + k * 70);
        setTimeout(function () { p.remove(); }, 440 + k * 70);
      }
      sparks(cEl, ownerOf(G.turn) === 1 ? '#f472b6' : '#22d3ee');
    })(mv.caps[i], i);
  }
  if (mv.caps.length) { Sound.sfx.jump(); setTimeout(Sound.sfx.capture, 130); }
  else Sound.sfx.move();
  if (res.crowned) {
    if (pieceEl) { pieceEl.className = pieceClass(G.board[end[0]][end[1]]) + ' crowned'; }
    sparks(toCell, '#facc15');
    Sound.sfx.crown();
    G.fx.crowns++;
    toast(T('crownMsg'));
  }
  G.fx.captures += mv.caps.length;
  G.last = { from: mv.from, to: end };
  G.lastMoveInfo = { from: mv.from, to: end, caps: mv.caps.length, crowned: res.crowned };
  G.sel = null;
  G.plies++;
  if (mv.caps.length || !wasKing) G.quiet = 0; else G.quiet++;
  G.turn = 3 - G.turn;
  G.legal = allMoves(G.board, G.turn);
  var done = checkEnd();
  if (!done) { refreshMarkers(); if (auto) scheduleAi(); }
  return res;
}
function checkEnd() {
  if (G.state !== 'PLAY') return true;
  if (!G.legal.length) {
    endGame(3 - G.turn, countPieces(G.board, G.turn) === 0 ? 'rPieces' : 'rBlocked');
    return true;
  }
  if (G.quiet >= 60) { endGame(0, 'rQuiet'); return true; }
  return false;
}
function endGame(winner, reason) {
  G.state = 'OVER'; G.winner = winner; G.endReason = reason;
  if (G.aiTimer) { clearTimeout(G.aiTimer); G.aiTimer = 0; }
  var isAi = G.mode !== '2p';
  if (winner === 0) {
    msgEl.textContent = T('drawMsg'); Sound.sfx.draw();
    el('ptitle').textContent = T('drawMsg');
  } else if (isAi) {
    if (winner === 1) { msgEl.textContent = T('youWin'); msgEl.classList.add('winmsg'); Sound.sfx.win(); confetti(); el('ptitle').textContent = T('youWin'); }
    else { msgEl.textContent = T('aiWin'); Sound.sfx.lose(); el('ptitle').textContent = T('aiWin'); }
  } else {
    msgEl.textContent = winner === 1 ? T('p1Win') : T('p2Win');
    msgEl.classList.add('winmsg'); Sound.sfx.win(); confetti();
    el('ptitle').textContent = winner === 1 ? T('p1Win') : T('p2Win');
  }
  msgEl.classList.remove('must');
  if (isAi) {
    if (winner === 1) {
      SAVE.stats.w++;
      if (G.level === 'hard') SAVE.stats.hardW++;
      SAVE.streak.cur++;
      if (SAVE.streak.cur > SAVE.streak.best) SAVE.streak.best = SAVE.streak.cur;
    } else if (winner === 2) { SAVE.stats.l++; SAVE.streak.cur = 0; }
    else SAVE.stats.d++;
  }
  if (G.mode === 'daily' && G.daily) SAVE.daily = { date: G.daily.date, done: true, won: winner === 1 };
  persistSave();
  el('pdetail').textContent = T(reason || 'rBlocked') + ' · ' +
    T('statsLine').replace('{w}', SAVE.stats.w).replace('{l}', SAVE.stats.l).replace('{d}', SAVE.stats.d).replace('{s}', SAVE.streak.cur);
  el('panel').hidden = false;
  refreshMarkers();
}
function scheduleAi() {
  if (G.state !== 'PLAY' || G.mode === '2p' || G.turn !== 2) return;
  if (window.__qaFreeze) return; // deterministic QA: drive AI via __qa.aiMove()
  if (G.aiTimer) clearTimeout(G.aiTimer);
  G.aiTimer = setTimeout(aiTurn, 380 + Math.random() * 340);
}
function aiTurn() {
  if (G.state !== 'PLAY' || G.turn !== 2 || G.mode === '2p') return;
  if (window.__qaFreeze || document.hidden) { G.aiTimer = setTimeout(aiTurn, 250); return; }
  G.aiTimer = 0;
  var stat = { nodes: 0, ms: 0 };
  var mv = null;
  if (G.aiOpens > 0) { // daily seeded opening: rng pick is deterministic (seeded)
    G.aiOpens--;
    var mvs = G.legal;
    var maxC = 0, i;
    for (i = 0; i < mvs.length; i++) maxC = Math.max(maxC, mvs[i].caps.length);
    var pool = mvs.filter(function (m) { return m.caps.length === maxC; });
    mv = pool[(G.rng() * pool.length) | 0];
    stat.ms = 0; stat.nodes = 0;
  } else {
    mv = aiPickMove(G.board, 2, G.level, G.rng, stat);
  }
  G.ai = { ms: Math.round(stat.ms), nodes: stat.nodes };
  if (!mv) { endGame(1, 'rBlocked'); return; }
  doMove(mv, true);
}
function offerDraw() {
  if (G.state !== 'PLAY') return;
  Sound.sfx.click();
  if (G.mode === '2p') { endGame(0, 'rDrawAgreed'); return; }
  var aiScore = -evalBoard(G.board); // from AI (side 2) perspective
  if (aiScore < -140) { toast(T('drawYes')); endGame(0, 'rDrawAgreed'); }
  else toast(T('drawNo'));
}
function resign() {
  if (G.state !== 'PLAY') return;
  Sound.sfx.click();
  endGame(3 - G.turn, 'rResign');
}
function deselect() { G.sel = null; if (G.state === 'PLAY') refreshMarkers(); }

/* ---------------- board <-> string (QA injection) ---------------- */
function boardRows(b) {
  var m = { 0: '.', 1: 'r', 2: 'R', 3: 'b', 4: 'B' }, out = [];
  for (var r = 0; r < N; r++) {
    var s = '';
    for (var c = 0; c < N; c++) s += m[b[r][c]];
    out.push(s);
  }
  return out;
}
function parseRows(rows) {
  if (!Array.isArray(rows) || rows.length !== N) throw new Error('need 8 rows');
  var m = { '.': 0, r: 1, R: 2, b: 3, B: 4 };
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
    state: G.state, mode: G.mode, level: G.level, turn: G.turn,
    board: boardRows(G.board), counts: { p1: countPieces(G.board, 1), p2: countPieces(G.board, 2) },
    legalN: G.legal.length, mustCap: !!(G.legal.length && G.legal[0].caps.length > 0),
    sel: G.sel ? G.sel.slice() : null,
    last: G.last ? { from: G.last.from.slice(), to: G.last.to.slice() } : null,
    lastMoveInfo: G.lastMoveInfo, winner: G.winner, endReason: G.endReason,
    plies: G.plies, quiet: G.quiet,
    fx: { captures: G.fx.captures, crowns: G.fx.crowns },
    ai: { ms: G.ai.ms, nodes: G.ai.nodes },
    daily: G.daily, streak: SAVE.streak.cur,
    stats: { w: SAVE.stats.w, l: SAVE.stats.l, d: SAVE.stats.d },
  };
}
window.__qaState = state;
window.__qaRender = function () { renderAll(); };
window.__qa = {
  state: state,
  newGame: function (mode, level, seed) { return newGame(mode, level, seed); },
  legal: function () { return G.legal.map(function (m) { return { from: m.from.slice(), path: m.path.map(function (p) { return p.slice(); }), caps: m.caps.map(function (p) { return p.slice(); }) }; }); },
  load: function (rows, turn, opts) {
    if (G.aiTimer) { clearTimeout(G.aiTimer); G.aiTimer = 0; }
    G.board = parseRows(rows);
    G.turn = turn === 2 ? 2 : 1;
    G.state = 'PLAY'; G.winner = 0; G.endReason = ''; G.sel = null; G.last = null;
    G.quiet = 0; G.lastMoveInfo = null;
    G.mode = (opts && opts.mode) || '2p'; G.level = (opts && opts.level) || G.level;
    G.legal = allMoves(G.board, G.turn);
    el('panel').hidden = true;
    renderAll();
    return state();
  },
  move: function (from, to) {
    if (G.state !== 'PLAY') return { ok: false, reason: 'game-over' };
    var mvs = G.legal.filter(function (m) { return m.from[0] === from[0] && m.from[1] === from[1]; });
    if (!mvs.length) return { ok: false, reason: 'no-movable-piece-at-from' };
    var mv = null;
    var isPath = Array.isArray(to) && Array.isArray(to[0]); // [[r,c],...] vs plain [r,c]
    for (var i = 0; i < mvs.length; i++) {
      var end = mvs[i].path[mvs[i].path.length - 1];
      if (isPath) {
        if (end[0] === to[to.length - 1][0] && end[1] === to[to.length - 1][1] && mvs[i].path.length === to.length) { mv = mvs[i]; break; }
      } else if (end[0] === to[0] && end[1] === to[1]) { mv = mvs[i]; break; }
    }
    if (!mv) {
      // distinguish must-capture rejection for clear test semantics
      var tgt = isPath ? to[to.length - 1] : to;
      var mustCap = G.legal[0].caps.length > 0;
      var dr = Math.abs(tgt[0] - from[0]), dc = Math.abs(tgt[1] - from[1]);
      var oneStep = dr === 1 && dc === 1 && G.board[tgt[0]][tgt[1]] === 0;
      return { ok: false, reason: mustCap && oneStep ? 'must-capture' : (mustCap ? 'incomplete-jump' : 'illegal-target') };
    }
    var res = doMove(mv, false);
    var st = state();
    st.ok = true;
    st.capturedNow = res.captured;
    st.crownedNow = res.crowned;
    return st;
  },
  aiMove: function () {
    if (G.state !== 'PLAY' || G.turn !== 2) return { ok: false, reason: 'not-ai-turn' };
    aiTurn();
    var st = state();
    st.ok = G.state === 'OVER' || G.lastMoveInfo !== null;
    return st;
  },
  settle: function () { checkEnd(); refreshMarkers(); return state(); },
  dailyInfo: dailyInfo,
  engine: { allMoves: allMoves, applyMove: applyMove, evalBoard: evalBoard, initialBoard: initialBoard, parseRows: parseRows, boardRows: boardRows, aiPickMove: aiPickMove, mkRng: mkRng },
};

/* namespace consumed by main.js (input routing) — logic stays here */
window.CK = {
  G: G, newGame: newGame, clickCell: clickCell, deselect: deselect,
  offerDraw: offerDraw, resign: resign, renderAll: renderAll, refreshMarkers: refreshMarkers,
  boardRows: boardRows, cellAt: cellAt, onRender: null,
};

buildBoard();
loadSave();
newGame('ai', (readJSON(K_SET, {}).level) || 'medium');
persistSave(); // write default key set at boot (np_ck_stats/streak/daily/settings)
