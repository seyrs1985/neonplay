/* Bubble Storm — core: hex grid (offset rows), ballistics, pop/flood collapse,
 * scoring, retention, rendering. No DOM bootstrap here (see main.js).
 *
 * Grid geometry (design doc, formula is authoritative):
 *   even rows 8 cols, odd rows 7 cols; odd rows offset HALF A CELL so that
 *   even-row cell (r,c) touches (r-1,c) and (r-1,c+1)  -> doc formula below.
 *   Adjacency (parity of the ROW ITSELF decides the diagonal pair):
 *     even row: (r,c-1)(r,c+1)(r-1,c)(r-1,c+1)(r+1,c)(r+1,c+1)
 *     odd  row: (r,c-1)(r,c+1)(r-1,c-1)(r-1,c)(r+1,c-1)(r+1,c)
 */
'use strict';

/* ---------------- i18n (np_core npT; en fallback) ---------------- */
const L = {
  en: {
    title: 'BUBBLE STORM', subtitle: 'Neon bubble shooter — daily board, zero ads',
    daily: 'DAILY BOARD #%d', classic: 'CLASSIC', dailySub: 'Same starting board worldwide',
    best: 'BEST %s', streak: 'Daily streak 🔥 %d', shotsLeft: '%d LEFT', next: 'NEXT',
    hintDrag: 'Drag to aim — release to shoot', hintKb: '← → aim · Space shoot · P pause · M mute',
    push: 'PUSH!', combo: '×%s', overLine: 'THE BUBBLES CROSSED THE LINE',
    overShots: 'OUT OF SHOTS', clear: 'BOARD CLEAR +2000',
    result: 'RESULT', popped: 'Popped', dropped: 'Dropped', bestWave: 'Best wave',
    accuracy: 'Accuracy', rank: 'Rank', toNext: '%s pts to next rank', topRank: 'Top rank reached!',
    newBest: 'NEW BEST!', share: 'SHARE', again: 'PLAY AGAIN', menu: 'MENU',
    paused: 'PAUSED', resume: 'P to resume', copied: 'Copied to clipboard', shared: 'Shared!',
    shareFail: 'Copy failed', mute: 'Sound',
    rankBronze: 'Bronze', rankSilver: 'Silver', rankGold: 'Gold', rankPlatinum: 'Platinum',
    rankDiamond: 'Diamond', rankMaster: 'Master', rankLegend: 'Legend',
    shareDaily: '🫧 Bubble Storm daily board — %s pts (biggest collapse %d bubbles) %s | %s',
    shareClassic: '🫧 Bubble Storm — %s pts (biggest collapse %d bubbles) %s | %s',
  },
  zh: {
    title: '泡泡风暴', subtitle: '霓虹泡泡龙 — 每日全球同题，零广告',
    daily: '每日阵型 #%d', classic: '经典模式', dailySub: '全球玩家同一张起始阵',
    best: '最佳 %s', streak: '每日连胜 🔥 %d', shotsLeft: '剩 %d 发', next: '下一发',
    hintDrag: '拖动瞄准，松手发射', hintKb: '← → 瞄准 · 空格发射 · P 暂停 · M 静音',
    push: '下压!', combo: '×%s', overLine: '泡泡越线了',
    overShots: '子弹耗尽', clear: '清空全阵 +2000',
    result: '结算', popped: '消除', dropped: '塌落', bestWave: '最大单波',
    accuracy: '准确率', rank: '段位', toNext: '距下一段位 %s 分', topRank: '已达最高段位！',
    newBest: '新纪录!', share: '分享', again: '再来一局', menu: '菜单',
    paused: '已暂停', resume: '按 P 继续', copied: '已复制到剪贴板', shared: '已分享！',
    shareFail: '复制失败', mute: '音效',
    rankBronze: '青铜', rankSilver: '白银', rankGold: '黄金', rankPlatinum: '白金',
    rankDiamond: '钻石', rankMaster: '大师', rankLegend: '传奇',
    shareDaily: '🫧 Bubble Storm 每日阵 %s 分（最大塌落 %d 泡）%s | %s',
    shareClassic: '🫧 Bubble Storm %s 分（最大塌落 %d 泡）%s | %s',
  },
};
function T(k) {
  if (window.npT) return npT(L, k);
  return L.en[k] || k;
}
/* substitute %s/%d sequentially */
function TF(k, args) {
  let s = T(k);
  (Array.isArray(args) ? args : [args]).forEach(a => { s = s.replace(/%[sd]/, String(a)); });
  return s;
}
const fmtN = n => Number(n).toLocaleString('en-US');

/* ---------------- constants ---------------- */
const COLORS = ['#00e5ff', '#ff2d95', '#ffd54a', '#7c4dff', '#39ff88', '#ff9e40'];
const W = 320, H = 560;
const R = 16, D = 32;                       // bubble radius / diameter (doc: r=16)
const ROWH = Math.sqrt(3) / 2 * D;          // hex row height
const X0 = 56, Y0 = 44;                     // even-row-0 first center
const CEIL = 28;                            // ceiling plate bottom edge
const DEATH_Y = 460;                        // bubble below this = fail
const WALL_L = 8, WALL_R = W - 8;
const SHOOTER = { x: W / 2, y: 506 };
const SPEED = 520;                          // projectile speed (logical px/s)
const MAXSHOTS = 40;                        // 40 bullets per run (doc)
const AIM_MIN = -170 * Math.PI / 180, AIM_MAX = -10 * Math.PI / 180;
const POP_PTS = 10, DROP_PTS = 20;          // per bubble (doc)
const COMBO_WINDOW = 3, COMBO_CAP = 3;      // 3s window, ×3 cap (doc)
const DRY_PUSH = 6;                         // every 6 non-popping shots -> push (doc)
const CLEAR_BONUS = 2000;
const RANKS = [
  { min: 15000, key: 'rankLegend', emoji: '🏆' },
  { min: 10000, key: 'rankMaster', emoji: '🥇' },
  { min: 7500, key: 'rankDiamond', emoji: '💎' },
  { min: 5000, key: 'rankPlatinum', emoji: '🥈' },
  { min: 3000, key: 'rankGold', emoji: '🟡' },
  { min: 1500, key: 'rankSilver', emoji: '⚪' },
  { min: 0, key: 'rankBronze', emoji: '🟤' },
];
function rankOf(score) { return RANKS.find(r => score >= r.min) || RANKS[RANKS.length - 1]; }
function nextRankGap(score) {
  const hi = [...RANKS].reverse().find(r => r.min > score);
  return hi ? hi.min - score : null;
}

/* ---------------- pure hex-grid helpers (single source of truth) ---------------- */
function colNOf(r, parity) { return ((r + parity) & 1) ? 7 : 8; }
function xOfP(r, c, parity) { return X0 + (((r + parity) & 1) ? c - 0.5 : c) * D; }
function yOfP(r) { return Y0 + r * ROWH; }
/* doc adjacency — row parity decides diagonals; bounds-checked against rows */
function nb(r, c, parity, rows) {
  const odd = ((r + parity) & 1) === 1;
  const list = odd
    ? [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]]
    : [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]];
  return list.filter(([rr, cc]) => rr >= 0 && rr < rows && cc >= 0 && cc < colNOf(rr, parity));
}
function floodPure(g, parity, r0, c0, match) {
  const rows = g.length, seen = new Set([r0 + ',' + c0]), out = [{ r: r0, c: c0 }], q = [[r0, c0]];
  while (q.length) {
    const [r, c] = q.shift();
    for (const [rr, cc] of nb(r, c, parity, rows)) {
      const k = rr + ',' + cc;
      if (seen.has(k) || g[rr][cc] < 0 || !match(g[r][c], g[rr][cc])) continue;
      seen.add(k); out.push({ r: rr, c: cc }); q.push([rr, cc]);
    }
  }
  return out;
}
function anchoredPure(g, parity) {
  const rows = g.length, keep = new Set(), q = [];
  if (!rows) return keep;
  for (let c = 0; c < colNOf(0, parity); c++) if (g[0][c] >= 0) { keep.add('0,' + c); q.push([0, c]); }
  while (q.length) {
    const [r, c] = q.shift();
    for (const [rr, cc] of nb(r, c, parity, rows)) {
      const k = rr + ',' + cc;
      if (!keep.has(k) && g[rr][cc] >= 0) { keep.add(k); q.push([rr, cc]); }
    }
  }
  return keep;
}
/* full landing resolution on a pure grid — pop cluster >=3, then collapse floaters */
function solveLandingPure(gIn, parity, r, c, color) {
  const g = gIn.map(row => row.slice());
  if (r >= g.length) { while (g.length <= r) g.push(new Array(colNOf(g.length, parity)).fill(-1)); }
  g[r][c] = color;
  let popped = 0, dropped = 0;
  const cl = floodPure(g, parity, r, c, (a, b) => a === b);
  if (cl.length >= 3) {
    cl.forEach(p => { g[p.r][p.c] = -1; });
    popped = cl.length;
    const keep = anchoredPure(g, parity);
    for (let rr = 0; rr < g.length; rr++)
      for (let cc = 0; cc < colNOf(rr, parity); cc++)
        if (g[rr][cc] >= 0 && !keep.has(rr + ',' + cc)) { g[rr][cc] = -1; dropped++; }
  }
  let remain = 0;
  for (let rr = 0; rr < g.length; rr++)
    for (let cc = 0; cc < colNOf(rr, parity); cc++) if (g[rr][cc] >= 0) remain++;
  return { popped, dropped, remain };
}

/* ---------------- rng / daily ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function genRows(rng, rowCount) {
  const g = [];
  for (let r = 0; r < rowCount; r++) {
    const row = [];
    for (let c = 0; c < ((r & 1) ? 7 : 8); c++) row.push((rng() * COLORS.length) | 0);
    g.push(row);
  }
  return g;
}
function utcYMDInt(d) {
  const n = d || new Date();
  return n.getUTCFullYear() * 10000 + (n.getUTCMonth() + 1) * 100 + n.getUTCDate();
}
function isoDate(d) {
  const n = d || new Date();
  return n.getUTCFullYear() + '-' + String(n.getUTCMonth() + 1).padStart(2, '0') + '-' + String(n.getUTCDate()).padStart(2, '0');
}
function dailyBoardNum() {
  const n = new Date();
  const t = Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate());
  return Math.round((t - Date.UTC(2026, 0, 1)) / 86400000) + 1;
}
function isoWeekKey() {
  const n = new Date();
  const d = new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const wk = Math.ceil(((d - y0) / 86400000 + 1) / 7);
  return d.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
}
function daysBetweenISO(a, b) {
  if (!a) return 9999;
  const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
  return Math.round((Date.UTC(pb[0], pb[1] - 1, pb[2]) - Date.UTC(pa[0], pa[1] - 1, pa[2])) / 86400000);
}

/* ---------------- state ---------------- */
const G = {
  state: 'TITLE', mode: 'classic', seed: 0, rng: Math.random,
  grid: [], parity: 0,
  score: 0, best: 0, shotsUsed: 0, attempts: 0, hits: 0,
  pops: 0, drops: 0, bestDrop: 0,
  mult: 1, comboT: 0, dryStreak: 0, pushCount: 0,
  cur: 0, next: 1, aim: -Math.PI / 2, aiming: false,
  ball: null, falls: [], parts: [], txts: [], rings: [],
  shake: 0, plateAnim: 0, bannerMsg: '', bannerT: 9, overT: 0, reason: '',
  newBest: false, finalGrid: null, buttons: [], stars: [],
};
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* live wrappers bound to G */
const colN = r => colNOf(r, G.parity);
const xOf = (r, c) => xOfP(r, c, G.parity);
const yOf = r => yOfP(r);
const nbLive = (r, c) => nb(r, c, G.parity, G.grid.length);
function countBubbles() {
  let n = 0;
  for (let r = 0; r < G.grid.length; r++) for (let c = 0; c < colN(r); c++) if (G.grid[r][c] >= 0) n++;
  return n;
}
function boardColors() {
  const s = new Set();
  for (let r = 0; r < G.grid.length; r++) for (let c = 0; c < colN(r); c++) if (G.grid[r][c] >= 0) s.add(G.grid[r][c]);
  return [...s];
}

/* ---------------- persistence (np_bubble-storm_*) ---------------- */
const PK = 'np_bubble-storm_';
function lsGet(k, def) {
  try { const v = localStorage.getItem(PK + k); return v == null ? def : JSON.parse(v); } catch (e) { return def; }
}
function lsSet(k, v) { try { localStorage.setItem(PK + k, JSON.stringify(v)); } catch (e) {} }
function loadStorage() {
  G.best = (lsGet('best', { score: 0 }) || {}).score || 0;
}
function streakOnDaily(today) {
  const st = lsGet('streak', { count: 0, last: '', best: 0, protect: 1 });
  if (st.last !== today) {
    const gap = daysBetweenISO(st.last, today);
    if (st.last && gap === 1) st.count = (st.count || 0) + 1;
    else if (st.last && gap === 2 && (st.protect || 0) > 0) { st.protect--; st.count = (st.count || 0) + 1; }
    else st.count = 1;
    st.last = today;
  }
  if (!st.count) st.count = 1;
  st.best = Math.max(st.best || 0, st.count);
  lsSet('streak', st);
  return st;
}
function settleStorage() {
  const today = isoDate();
  const bestRec = lsGet('best', { score: 0, date: today });
  if (G.score > (bestRec.score || 0)) {
    G.newBest = G.score > 0;
    G.best = G.score;
    lsSet('best', { score: G.score, date: today });
  } else {
    G.best = bestRec.score || 0;
    lsSet('best', bestRec);   // key must exist after every settled run
  }
  const top = lsGet('top10', []);
  top.push({ score: G.score, mode: G.mode, date: today, seed: G.seed });
  top.sort((a, b) => b.score - a.score);
  lsSet('top10', top.slice(0, 10));
  const st = lsGet('stats', { games: 0, popped: 0, dropped: 0, bestDrop: 0 });
  st.games++; st.popped += G.pops; st.dropped += G.drops; st.bestDrop = Math.max(st.bestDrop || 0, G.bestDrop);
  lsSet('stats', st);
  const wk = lsGet('weekly', null);
  if (!wk || wk.weekKey !== isoWeekKey()) lsSet('weekly', { weekKey: isoWeekKey(), best: { score: G.score, date: today } });
  else if (G.score > (wk.best && wk.best.score || 0)) lsSet('weekly', { weekKey: wk.weekKey, best: { score: G.score, date: today } });
  if (G.mode === 'daily') {
    const dl = lsGet('daily', { date: '', score: 0, done: false });
    if (dl.date === today) lsSet('daily', { date: today, score: Math.max(dl.score || 0, G.score), done: true });
    else lsSet('daily', { date: today, score: G.score, done: true });
    streakOnDaily(today);
  }
}

/* ---------------- run control ---------------- */
function pickColor() {
  const set = boardColors();
  if (!set.length) return (G.rng() * COLORS.length) | 0;
  return set[(G.rng() * set.length) | 0] % COLORS.length;
}
function startRun(mode) {
  G.mode = mode;
  G.seed = mode === 'daily' ? utcYMDInt() : (((Math.random() * 0x7fffffff) | 0) >>> 0) || 1;
  G.rng = mulberry32(G.seed);
  G.parity = 0;
  G.grid = genRows(G.rng, 6);
  G.score = 0; G.shotsUsed = 0; G.attempts = 0; G.hits = 0;
  G.pops = 0; G.drops = 0; G.bestDrop = 0;
  G.mult = 1; G.comboT = 0; G.dryStreak = 0; G.pushCount = 0;
  G.cur = pickColor(); G.next = pickColor();
  G.ball = null; G.falls = []; G.parts = []; G.txts = []; G.rings = [];
  G.shake = 0; G.plateAnim = 0; G.newBest = false; G.finalGrid = null;
  G.overT = 0; G.reason = ''; G.aiming = false; G.aim = -Math.PI / 2;
  G.state = 'PLAY';
  G.lastPop = 0; G.lastDrop = 0; G.lastGain = 0;
  refreshOcc();
  banner(TF(mode === 'daily' ? 'daily' : 'classic', mode === 'daily' ? dailyBoardNum() : 0), 2);
}
function toTitle() { G.state = 'TITLE'; Sound.stopMusic(); }
function banner(msg, dur) { G.bannerMsg = msg; G.bannerT = 0; G.bannerDur = dur || 1.4; }

/* ---------------- shooting ---------------- */
function clampAim(a) {
  if (a > 0) a = (a <= Math.PI / 2) ? AIM_MAX : AIM_MIN; // pointer below shooter -> clamp
  return clamp(a, AIM_MIN, AIM_MAX);
}
function setAimTo(x, y) { G.aim = clampAim(Math.atan2(y - SHOOTER.y, x - SHOOTER.x)); }
function fire() {
  if (G.state !== 'PLAY' || G.ball || G.shotsUsed >= MAXSHOTS) return false;
  const a = clampAim(G.aim);
  G.ball = { x: SHOOTER.x, y: SHOOTER.y - 4, vx: Math.cos(a) * SPEED, vy: Math.sin(a) * SPEED, color: G.cur, trailT: 0 };
  G.shotsUsed++; G.attempts++;
  Sound.sfx.shoot();
  G.cur = G.next; G.next = pickColor();
  return true;
}
function occupiedCells() {
  const out = [];
  for (let r = 0; r < G.grid.length; r++)
    for (let c = 0; c < colN(r); c++) if (G.grid[r][c] >= 0) out.push([r, c]);
  return out;
}
function hitBubbleAt(x, y) {
  const rr = (D - 3) * (D - 3);
  for (const [r, c] of occCache) {
    const dx = xOf(r, c) - x, dy = yOf(r) - y;
    if (dx * dx + dy * dy < rr) return true;
  }
  return false;
}
let occCache = [];
function refreshOcc() { occCache = occupiedCells(); }

function snapCell(x, y) {
  let best = null, bd = Infinity;
  const maxR = Math.min(G.grid.length, 40);
  for (let r = 0; r <= maxR; r++) {
    for (let c = 0; c < colNOf(r, G.parity); c++) {
      if (G.grid[r] && G.grid[r][c] >= 0) continue;
      if (r > 0 && !nb(r, c, G.parity, G.grid.length).some(([rr, cc]) => G.grid[rr][cc] >= 0)) continue;
      const dx = xOfP(r, c, G.parity) - x, dy = yOfP(r) - y, d = dx * dx + dy * dy;
      if (d < bd) { bd = d; best = { r, c }; }
    }
  }
  return best;
}
function ensureGridTo(r) {
  while (G.grid.length <= r) G.grid.push(new Array(colN(G.grid.length)).fill(-1));
}
function landAndResolve(cell, color) {
  ensureGridTo(cell.r);
  G.grid[cell.r][cell.c] = color % COLORS.length;
  refreshOcc();
  const cl = floodPure(G.grid, G.parity, cell.r, cell.c, (a, b) => a === b);
  G.lastPop = 0; G.lastDrop = 0; G.lastGain = 0;
  const lx = xOf(cell.r, cell.c), ly = yOf(cell.r);
  if (cl.length >= 3) {
    cl.forEach(p => {
      G.grid[p.r][p.c] = -1;
      spawnBurst(xOf(p.r, p.c), yOf(p.r), color % COLORS.length, cl.length);
    });
    G.lastPop = cl.length;
    G.pops += cl.length; G.hits++;
    const gain = Math.round(POP_PTS * G.mult * cl.length);
    G.score += gain; G.lastGain += gain;
    addTxt(lx, ly - 14, '+' + gain, '#ffffff');
    addRing(lx, ly, COLORS[color % COLORS.length]);
    Sound.sfx.pop(cl.length, G.mult);
    G.mult = Math.min(COMBO_CAP, Math.round((G.mult + 0.1 * cl.length) * 10) / 10);
    G.comboT = COMBO_WINDOW;
    // collapse: anchored BFS, everything unanchored falls
    const keep = anchoredPure(G.grid, G.parity);
    const fall = [];
    for (let r = 0; r < G.grid.length; r++)
      for (let c = 0; c < colN(r); c++)
        if (G.grid[r][c] >= 0 && !keep.has(r + ',' + c)) fall.push({ r, c, ci: G.grid[r][c] });
    if (fall.length) {
      G.lastDrop = fall.length;
      G.drops += fall.length;
      G.bestDrop = Math.max(G.bestDrop, fall.length);
      const dg = Math.round(DROP_PTS * G.mult * fall.length);
      G.score += dg; G.lastGain += dg;
      fall.forEach((p, i) => {
        G.grid[p.r][p.c] = -1;
        G.falls.push({ x: xOf(p.r, p.c), y: yOf(p.r), vx: (G.rng() - 0.5) * 60, vy: -60 - G.rng() * 40, ci: p.ci });
        goldRain(xOf(p.r, p.c), yOf(p.r));
      });
      addTxt(W / 2, DEATH_Y - 40, '+' + dg, '#ffd54a', 18);
      Sound.sfx.drop(fall.length);
    }
  } else {
    Sound.sfx.stick();
  }
  refreshOcc();
}
function pushRow() {
  const set = boardColors();
  const row = [];
  const n = colNOf(0, (G.parity ^ 1));
  for (let c = 0; c < n; c++) {
    const ci = set.length ? set[(G.rng() * set.length) | 0] % COLORS.length : (G.rng() * COLORS.length) | 0;
    row.push(ci);
  }
  G.parity ^= 1;          // rows shift down one index; physical x-lattice preserved
  G.grid.unshift(row);
  G.pushCount++;
  G.plateAnim = 1;
  G.shake = Math.max(G.shake, 5);
  Sound.sfx.push();
  refreshOcc();
}
function deathCheck() {
  for (let r = 0; r < G.grid.length; r++)
    if (yOf(r) + R > DEATH_Y)
      for (let c = 0; c < colN(r); c++) if (G.grid[r][c] >= 0) return true;
  return false;
}
function afterShot() {
  if (G.lastPop > 0) {
    G.dryStreak = 0;
  } else {
    G.dryStreak++;
    if (G.mult > 1) { G.mult = 1; }        // failed shot clears combo (doc)
    if (G.dryStreak >= DRY_PUSH) { G.dryStreak = 0; pushRow(); }
  }
  if (deathCheck()) return gameOver('line');
  if (countBubbles() === 0) { G.score += CLEAR_BONUS; return gameOver('clear'); }
  if (G.shotsUsed >= MAXSHOTS && !G.ball) return gameOver('shots');
}
function gameOver(reason) {
  G.state = 'OVER'; G.overT = 0; G.reason = reason;
  G.finalGrid = G.grid.map(r => r.slice());
  if (reason === 'clear') banner(T('clear'), 3);
  settleStorage();
  G.shake = reason === 'line' ? 12 : 5;
  if (G.newBest) { Sound.sfx.best(); Sound.stopMusic(); } else { Sound.sfx.over(); Sound.stopMusic(); }
}

/* ---------------- physics ---------------- */
function stepBall(dt) {
  const b = G.ball;
  if (!b) return;
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));   // 240Hz substeps (doc)
  const sdt = dt / steps;
  for (let i = 0; i < steps; i++) {
    b.x += b.vx * sdt; b.y += b.vy * sdt;
    if (b.x < WALL_L + R) { b.x = WALL_L + R; b.vx = Math.abs(b.vx); }
    if (b.x > WALL_R - R) { b.x = WALL_R - R; b.vx = -Math.abs(b.vx); }
    b.trailT += sdt;
    if (b.trailT > 0.016) { b.trailT = 0; G.parts.push({ x: b.x, y: b.y, vx: 0, vy: 0, life: 0.22, max: 0.22, ci: b.color, r: 4, glow: true }); }
    let land = false;
    if (b.y <= CEIL + R) land = true;
    else {
      const rr = (D - 3) * (D - 3);
      for (const [r, c] of occCache) {
        const dx = xOf(r, c) - b.x, dy = yOf(r) - b.y;
        if (dx * dx + dy * dy < rr) { land = true; break; }
      }
    }
    if (land) {
      const cell = snapCell(b.x, b.y);
      G.ball = null;
      if (!cell) { gameOver('line'); return; }
      landAndResolve(cell, b.color);
      afterShot();
      return;
    }
    if (b.y > H + 60) { G.ball = null; afterShot(); return; }  // safety
  }
}

/* ---------------- fx ---------------- */
function spawnBurst(x, y, ci, n) {
  const cnt = Math.min(10 + (n || 3) * 2, 18);
  for (let i = 0; i < cnt; i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 180;
    G.parts.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40, life: 0.5 + Math.random() * 0.35, max: 0.85, ci: ci == null ? 5 : ci, r: 2 + Math.random() * 2.5, grav: 320 });
  }
  if (G.parts.length > 260) G.parts.splice(0, G.parts.length - 260);
}
function goldRain(x, y) {
  for (let i = 0; i < 4; i++) {
    G.parts.push({ x: x + (Math.random() - 0.5) * 18, y: y + (Math.random() - 0.5) * 18, vx: (Math.random() - 0.5) * 50, vy: -30 - Math.random() * 60, life: 0.7, max: 0.7, ci: 2, r: 1.5 + Math.random() * 2, grav: 420 });
  }
  if (G.parts.length > 260) G.parts.splice(0, G.parts.length - 260);
}
function addTxt(x, y, txt, color, size) {
  G.txts.push({ x, y, txt, color: color || '#fff', size: size || 13, life: 1.1, max: 1.1 });
  if (G.txts.length > 14) G.txts.shift();
}
function addRing(x, y, color) { G.rings.push({ x, y, r: 12, maxR: 90, life: 0, dur: 0.4, color }); }
function initStars() {
  G.stars = [];
  for (let i = 0; i < 70; i++)
    G.stars.push({ x: Math.random() * W, y: Math.random() * H, z: 0.3 + Math.random() * 0.7 });
}

/* ---------------- update ---------------- */
function update(dt) {
  for (const s of G.stars) { s.y += dt * 12 * s.z; if (s.y > H) { s.y = -2; s.x = Math.random() * W; } }
  G.shake = Math.max(0, G.shake - dt * 26);
  G.plateAnim = Math.max(0, G.plateAnim - dt * 2);
  if (G.bannerT < (G.bannerDur || 1.4)) G.bannerT += dt;
  // particles
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.life -= dt;
    if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    if (p.grav) p.vy += p.grav * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = G.txts.length - 1; i >= 0; i--) {
    const t = G.txts[i];
    t.life -= dt; t.y -= dt * 26;
    if (t.life <= 0) G.txts.splice(i, 1);
  }
  for (let i = G.rings.length - 1; i >= 0; i--) {
    const rg = G.rings[i];
    rg.life += dt;
    if (rg.life > rg.dur) G.rings.splice(i, 1);
  }
  for (let i = G.falls.length - 1; i >= 0; i--) {
    const f = G.falls[i];
    f.vy += 1500 * dt;
    f.x += f.vx * dt; f.y += f.vy * dt;
    if (f.y > H + 40) G.falls.splice(i, 1);
  }
  if (G.state === 'OVER') { G.overT += dt; return; }
  if (G.state !== 'PLAY') return;
  if (G.comboT > 0) {
    G.comboT -= dt;
    if (G.comboT <= 0) { G.comboT = 0; G.mult = 1; }
  }
  if (G.ball) stepBall(dt);
}

/* ---------------- rendering ---------------- */
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
}
const CINFO = COLORS.map(h => ({ base: h, light: shade(h, 0.55), dark: shade(h, -0.38), glow: shade(h, 0.25) }));
const SPR = [];
function bubbleSprite(ci) {
  ci = ((ci % COLORS.length) + COLORS.length) % COLORS.length; // never crash on bad data
  if (SPR[ci]) return SPR[ci];
  const pad = 10, sz = (R + pad) * 2, scale = 3;
  const cv = document.createElement('canvas');
  cv.width = cv.height = Math.round(sz * scale);
  const x = cv.getContext('2d');
  x.scale(scale, scale);
  const cx = R + pad, cy = R + pad, info = CINFO[ci];
  // fake glow halo (no shadowBlur — perf)
  x.globalCompositeOperation = 'lighter';
  const gh = x.createRadialGradient(cx, cy, R * 0.4, cx, cy, R + pad - 2);
  gh.addColorStop(0, 'rgba(255,255,255,0)');
  gh.addColorStop(0.72, info.glow.replace('rgb', 'rgba').replace(')', ',0.28)'));
  gh.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = gh;
  x.fillRect(0, 0, sz, sz);
  x.globalCompositeOperation = 'source-over';
  // body
  const g = x.createRadialGradient(cx - R * 0.32, cy - R * 0.36, R * 0.12, cx, cy, R);
  g.addColorStop(0, info.light);
  g.addColorStop(0.55, info.base);
  g.addColorStop(1, info.dark);
  x.fillStyle = g;
  x.beginPath(); x.arc(cx, cy, R, 0, Math.PI * 2); x.fill();
  // rim
  x.strokeStyle = 'rgba(255,255,255,0.35)';
  x.lineWidth = 1.4;
  x.beginPath(); x.arc(cx, cy, R - 0.9, 0, Math.PI * 2); x.stroke();
  // highlight
  x.fillStyle = 'rgba(255,255,255,0.85)';
  x.beginPath(); x.ellipse(cx - R * 0.34, cy - R * 0.4, R * 0.2, R * 0.13, -0.6, 0, Math.PI * 2); x.fill();
  x.fillStyle = 'rgba(255,255,255,0.35)';
  x.beginPath(); x.arc(cx + R * 0.3, cy + R * 0.42, R * 0.09, 0, Math.PI * 2); x.fill();
  SPR[ci] = cv;
  return cv;
}
const SPR_SZ = (R + 10) * 2;
function drawBubble(ctx, x, y, ci, alpha, scale) {
  const s = bubbleSprite(ci);
  const sz = SPR_SZ * (scale || 1);
  if (alpha != null) { ctx.globalAlpha = alpha; }
  ctx.drawImage(s, x - sz / 2, y - sz / 2, sz, sz);
  if (alpha != null) ctx.globalAlpha = 1;
}
function textGlow(ctx, text, x, y, size, color, align, coreColor) {
  ctx.font = 'bold ' + size + 'px "Segoe UI",system-ui,sans-serif';
  ctx.textAlign = align || 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.45;
  ctx.fillText(text, x, y + 1.5); ctx.fillText(text, x, y - 1.5);
  ctx.fillText(text, x + 1.5, y); ctx.fillText(text, x - 1.5, y);
  ctx.globalAlpha = 1;
  ctx.fillStyle = coreColor || '#fff';
  ctx.fillText(text, x, y);
}
function drawBackground(ctx) {
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(0, 0, W, H);
  for (const s of G.stars) {
    ctx.globalAlpha = 0.25 + s.z * 0.45;
    ctx.fillStyle = s.z > 0.75 ? '#7c4dff' : (s.z > 0.5 ? '#00e5ff' : '#8fa3c8');
    ctx.fillRect(s.x, s.y, 1.6 * s.z + 0.6, 1.6 * s.z + 0.6);
  }
  ctx.globalAlpha = 1;
  // side wall glow
  ctx.strokeStyle = 'rgba(0,229,255,0.14)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(WALL_L, CEIL); ctx.lineTo(WALL_L, DEATH_Y); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(WALL_R, CEIL); ctx.lineTo(WALL_R, DEATH_Y); ctx.stroke();
}
function lowestBubbleY() {
  let m = 0;
  for (let r = 0; r < G.grid.length; r++)
    for (let c = 0; c < colN(r); c++) if (G.grid[r][c] >= 0) m = Math.max(m, yOf(r));
  return m;
}
function drawCeiling(ctx) {
  const danger = lowestBubbleY() + R > DEATH_Y - 3 * ROWH;
  const g = ctx.createLinearGradient(0, 0, 0, CEIL);
  g.addColorStop(0, '#39415e'); g.addColorStop(1, '#14172a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, CEIL);
  // hazard stripes
  ctx.save();
  ctx.beginPath(); ctx.rect(0, CEIL - 6, W, 5); ctx.clip();
  ctx.fillStyle = danger ? 'rgba(255,45,90,0.6)' : 'rgba(255,213,74,0.35)';
  for (let x = -10; x < W + 20; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, CEIL); ctx.lineTo(x + 8, CEIL - 7); ctx.lineTo(x + 15, CEIL - 7); ctx.lineTo(x + 7, CEIL);
    ctx.fill();
  }
  ctx.restore();
  if (danger || G.plateAnim > 0) {
    ctx.globalAlpha = Math.max(G.plateAnim * 0.8, danger ? 0.5 + 0.3 * Math.sin(performance.now() / 150) : 0);
    ctx.strokeStyle = '#ff2d95';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, CEIL + 1.5); ctx.lineTo(W, CEIL + 1.5); ctx.stroke();
    ctx.globalAlpha = 1;
  }
}
function drawDeathLine(ctx) {
  ctx.strokeStyle = 'rgba(255,45,90,0.55)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([7, 6]);
  ctx.beginPath(); ctx.moveTo(0, DEATH_Y); ctx.lineTo(W, DEATH_Y); ctx.stroke();
  ctx.setLineDash([]);
}
function drawGrid(ctx) {
  for (let r = 0; r < G.grid.length; r++)
    for (let c = 0; c < colN(r); c++) {
      const ci = G.grid[r][c];
      if (ci < 0) continue;
      drawBubble(ctx, xOf(r, c), yOf(r), ci);
    }
  for (const f of G.falls) {
    const fa = f.y < DEATH_Y ? 1 : Math.max(0.2, 1 - (f.y - DEATH_Y) / 140);
    drawBubble(ctx, f.x, f.y, f.ci, fa);
  }
}
function aimPath() {
  let x = SHOOTER.x, y = SHOOTER.y - 6;
  let vx = Math.cos(G.aim), vy = Math.sin(G.aim);
  const pts = [{ x, y }];
  const step = 3;
  let bounced = 0, dist = 0;
  for (let i = 0; i < 700; i++) {
    x += vx * step; y += vy * step; dist += step;
    if (x < WALL_L + R) { x = WALL_L + R; vx = Math.abs(vx); if (bounced++ < 1) pts.push({ x, y }); else break; }
    if (x > WALL_R - R) { x = WALL_R - R; vx = -Math.abs(vx); if (bounced++ < 1) pts.push({ x, y }); else break; }
    if (y <= CEIL + R || hitBubbleAt(x, y)) { pts.push({ x, y }); break; }
    if (dist > 1600) { pts.push({ x, y }); break; }
  }
  return pts;
}
function drawAim(ctx) {
  if (G.state !== 'PLAY' || G.ball) return;
  const pts = aimPath();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  // dashed dotted trajectory (one wall bounce included by construction)
  let acc = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    for (let d = 0; d < seg; d += 9) {
      const t = d / seg;
      ctx.globalAlpha = 0.65 * (1 - (acc + d) / 900);
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    acc += seg;
  }
  ctx.restore();
  // landing ghost
  const end = pts[pts.length - 1];
  const cell = snapCell(end.x, end.y);
  if (cell) {
    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(xOf(cell.r, cell.c), yOf(cell.r), R - 2, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
}
function drawShooter(ctx) {
  // base
  ctx.fillStyle = '#141a30';
  ctx.beginPath(); ctx.arc(SHOOTER.x, SHOOTER.y + 6, 26, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#00e5ff';
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(SHOOTER.x, SHOOTER.y + 6, 26, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  // barrel chevron
  const a = clampAim(G.aim);
  ctx.save();
  ctx.translate(SHOOTER.x, SHOOTER.y);
  ctx.rotate(a + Math.PI / 2);
  ctx.fillStyle = 'rgba(0,229,255,0.85)';
  ctx.beginPath();
  ctx.moveTo(0, -34); ctx.lineTo(-7, -22); ctx.lineTo(7, -22);
  ctx.fill();
  ctx.restore();
  // current bubble on the launcher (>=44px touch target via whole zone)
  drawBubble(ctx, SHOOTER.x, SHOOTER.y, G.cur);
  // next bubble
  textGlow(ctx, T('next'), 268, SHOOTER.y - 26, 9, '#7c4dff');
  drawBubble(ctx, 268, SHOOTER.y - 4, G.next, 0.9, 0.55);
}
function drawHUD(ctx) {
  // top strip over the ceiling plate
  textGlow(ctx, fmtN(G.score), 10, 14, 15, '#00e5ff', 'left');
  ctx.font = 'bold 9px "Segoe UI",system-ui,sans-serif';
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#8fa3c8';
  ctx.fillText(TF('best', fmtN(Math.max(G.best, 0))).toUpperCase(), 10, 25);
  const left = MAXSHOTS - G.shotsUsed;
  textGlow(ctx, TF('shotsLeft', left), W - 10, 14, 12, left <= 5 ? '#ff2d95' : '#ffd54a', 'right');
  // mode badge (top center, clear of the hazard stripes)
  const badge = G.mode === 'daily' ? 'D#' + dailyBoardNum() : 'CLS';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#8fa3c8';
  ctx.font = 'bold 9px "Segoe UI",system-ui,sans-serif';
  ctx.fillText(badge, W / 2, 14);
  if (G.mult > 1) {
    const w = 54 * clamp(G.comboT / COMBO_WINDOW, 0, 1);
    ctx.fillStyle = 'rgba(124,77,255,0.35)';
    ctx.fillRect(W / 2 - 27, 4, 54, 3);
    ctx.fillStyle = '#7c4dff';
    ctx.fillRect(W / 2 - 27, 4, w, 3);
    textGlow(ctx, TF('combo', G.mult.toFixed(1)), W / 2 + 62, 14, 12, '#7c4dff');
  }
  // banner
  if (G.bannerT < (G.bannerDur || 1.4)) {
    const k = G.bannerT / (G.bannerDur || 1.4);
    ctx.globalAlpha = k < 0.15 ? k / 0.15 : (k > 0.75 ? (1 - k) / 0.25 : 1);
    textGlow(ctx, G.bannerMsg, W / 2, 210, 20, '#ff2d95');
    ctx.globalAlpha = 1;
  }
  // hints
  if (G.state === 'PLAY' && G.shotsUsed === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '10px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(T('hintDrag'), W / 2, DEATH_Y + 18);
    ctx.fillText(T('hintKb'), W / 2, DEATH_Y + 32);
  }
}
function drawParticles(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.parts) {
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = COLORS[p.ci] || '#fff';
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }
  for (const rg of G.rings) {
    const k = rg.life / rg.dur;
    ctx.globalAlpha = (1 - k) * 0.7;
    ctx.strokeStyle = rg.color;
    ctx.lineWidth = 2.5 * (1 - k) + 0.5;
    ctx.beginPath(); ctx.arc(rg.x, rg.y, rg.r + (rg.maxR - rg.r) * k, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  for (const t of G.txts) {
    ctx.globalAlpha = clamp(t.life / t.max, 0, 1);
    textGlow(ctx, t.txt, t.x, t.y, t.size, t.color);
  }
  ctx.globalAlpha = 1;
}
function button(ctx, id, x, y, w, h, label, accent, small) {
  G.buttons.push({ id, x, y, w, h });
  ctx.fillStyle = 'rgba(20,26,48,0.92)';
  rr(ctx, x, y, w, h, 10);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.85;
  rr(ctx, x, y, w, h, 10);
  ctx.stroke();
  ctx.globalAlpha = 1;
  textGlow(ctx, label, x + w / 2, y + h / 2 + 1, small ? 13 : 16, accent);
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawMuteBtn(ctx) {
  G.buttons.push({ id: 'mute', x: W - 44, y: H - 44, w: 44, h: 44 });
  ctx.globalAlpha = 0.8;
  ctx.strokeStyle = '#8fa3c8';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(W - 22, H - 22, 13, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#8fa3c8';
  ctx.beginPath();
  ctx.moveTo(W - 27, H - 25); ctx.lineTo(W - 23, H - 25); ctx.lineTo(W - 18, H - 30);
  ctx.lineTo(W - 18, H - 14); ctx.lineTo(W - 23, H - 19); ctx.lineTo(W - 27, H - 19);
  ctx.closePath(); ctx.fill();
  if (Sound.isMuted()) {
    ctx.strokeStyle = '#ff2d95';
    ctx.beginPath(); ctx.moveTo(W - 31, H - 27); ctx.lineTo(W - 13, H - 17); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
function drawTitle(ctx) {
  // floating demo bubbles behind the logo
  const t = performance.now() / 1000;
  for (let i = 0; i < 8; i++) {
    const x = 40 + ((i * 53) % 250), y = 60 + ((i * 97) % 420) + Math.sin(t + i) * 8;
    drawBubble(ctx, x, y, i % 6, 0.35);
  }
  textGlow(ctx, T('title'), W / 2, 120, 34, '#00e5ff');
  ctx.font = '11px "Segoe UI",system-ui,sans-serif';
  ctx.fillStyle = '#8fa3c8';
  ctx.textAlign = 'center';
  ctx.fillText(T('subtitle'), W / 2, 150);
  const dn = dailyBoardNum();
  button(ctx, 'daily', 44, 250, 232, 48, TF('daily', dn), '#ff2d95');
  ctx.font = '10px "Segoe UI",system-ui,sans-serif';
  ctx.fillStyle = '#8fa3c8';
  ctx.fillText(T('dailySub'), W / 2, 307);
  button(ctx, 'classic', 44, 322, 232, 48, T('classic'), '#7c4dff');
  ctx.font = 'bold 11px "Segoe UI",system-ui,sans-serif';
  ctx.fillStyle = '#ffd54a';
  ctx.fillText(TF('best', fmtN(G.best)), W / 2, 388);
  const st = lsGet('streak', { count: 0 });
  if (st.count) {
    ctx.fillStyle = '#ff9e40';
    ctx.fillText(TF('streak', st.count), W / 2, 406);
  }
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.font = '10px "Segoe UI",system-ui,sans-serif';
  ctx.fillText(T('hintKb'), W / 2, 445);
  drawMuteBtn(ctx);
}
function drawOver(ctx) {
  ctx.fillStyle = 'rgba(4,6,16,0.78)';
  ctx.fillRect(0, 0, W, H);
  const k = clamp(G.overT / 0.4, 0, 1);
  ctx.save();
  ctx.translate(0, (1 - k) * 30);
  textGlow(ctx, T('result'), W / 2, 92, 18, '#7c4dff');
  textGlow(ctx, fmtN(G.score), W / 2, 132, 40, '#00e5ff');
  const reasonKey = G.reason === 'line' ? 'overLine' : (G.reason === 'clear' ? 'clear' : 'overShots');
  ctx.font = '11px "Segoe UI",system-ui,sans-serif';
  ctx.fillStyle = '#ff2d95';
  ctx.textAlign = 'center';
  ctx.fillText(T(reasonKey), W / 2, 162);
  if (G.newBest && G.overT > 0.4) {
    // NEW BEST sweep
    ctx.save();
    ctx.font = 'bold 16px "Segoe UI",system-ui,sans-serif';
    ctx.textAlign = 'center';
    const sweep = (performance.now() / 700) % 1;
    const gr = ctx.createLinearGradient(W / 2 - 90 + sweep * 120, 0, W / 2 - 30 + sweep * 120, 0);
    gr.addColorStop(0, '#ffd54a'); gr.addColorStop(0.5, '#ffffff'); gr.addColorStop(1, '#ffd54a');
    ctx.fillStyle = gr;
    ctx.fillText(T('newBest'), W / 2, 184);
    ctx.restore();
  }
  // stats
  const acc = G.attempts ? Math.round((G.hits / G.attempts) * 100) : 0;
  const rows = [
    [T('popped'), String(G.pops)],
    [T('dropped'), String(G.drops)],
    [T('bestWave'), String(G.bestDrop)],
    [T('accuracy'), acc + '%'],
  ];
  ctx.font = '12px "Segoe UI",system-ui,sans-serif';
  rows.forEach(([a, b], i) => {
    ctx.textAlign = 'left'; ctx.fillStyle = '#8fa3c8';
    ctx.fillText(a, 70, 210 + i * 20);
    ctx.textAlign = 'right'; ctx.fillStyle = '#fff';
    ctx.fillText(b, 250, 210 + i * 20);
  });
  // rank
  const rk = rankOf(G.score);
  textGlow(ctx, rk.emoji + ' ' + T(rk.key), W / 2, 306, 18, '#ffd54a');
  ctx.font = '10px "Segoe UI",system-ui,sans-serif';
  ctx.fillStyle = '#8fa3c8';
  ctx.textAlign = 'center';
  const gap = nextRankGap(G.score);
  ctx.fillText(gap == null ? T('topRank') : TF('toNext', fmtN(gap)), W / 2, 326);
  const ready = G.overT > 0.5;
  if (ready) {
    button(ctx, 'share', 60, 344, 200, 44, T('share'), '#00e5ff', true);
    button(ctx, 'again', 60, 396, 200, 44, T('again'), '#ff2d95', true);
    button(ctx, 'menu', 60, 448, 200, 44, T('menu'), '#7c4dff', true);
  }
  ctx.restore();
  drawMuteBtn(ctx);
}
function drawPause(ctx) {
  ctx.fillStyle = 'rgba(4,6,16,0.7)';
  ctx.fillRect(0, 0, W, H);
  textGlow(ctx, T('paused'), W / 2, H / 2 - 20, 24, '#00e5ff');
  ctx.font = '12px "Segoe UI",system-ui,sans-serif';
  ctx.fillStyle = '#8fa3c8';
  ctx.textAlign = 'center';
  ctx.fillText(T('resume'), W / 2, H / 2 + 14);
}
function drawBall(ctx) {
  if (!G.ball) return;
  drawBubble(ctx, G.ball.x, G.ball.y, G.ball.color);
}
function draw(ctx) {
  G.buttons.length = 0;
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  drawBackground(ctx);
  if (G.state === 'TITLE') {
    drawTitle(ctx);
    drawParticles(ctx);
    ctx.restore();
    return;
  }
  drawCeiling(ctx);
  drawDeathLine(ctx);
  drawGrid(ctx);
  drawAim(ctx);
  drawBall(ctx);
  drawShooter(ctx);
  drawHUD(ctx);
  drawParticles(ctx);
  if (G.state === 'PAUSE') drawPause(ctx);
  if (G.state === 'OVER') drawOver(ctx);
  ctx.restore();
}

/* ---------------- input (called from main.js) ---------------- */
function hitButton(x, y) {
  for (const b of G.buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return b.id;
  }
  return null;
}
async function doShare() {
  const text = shareText();
  try {
    if (navigator.share) { await navigator.share({ title: 'Bubble Storm', text }); return T('shared'); }
  } catch (e) { /* fall through to clipboard */ }
  try {
    await navigator.clipboard.writeText(text);
    return T('copied');
  } catch (e) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return T('copied');
    } catch (e2) { return T('shareFail'); }
  }
}
function onPress(x, y) {
  Sound.resume();
  const id = hitButton(x, y);
  if (id === 'mute') { Sound.setMuted(!Sound.isMuted()); Sound.sfx.click(); return; }
  if (G.state === 'TITLE') {
    if (id === 'daily' || id === 'classic') {
      Sound.sfx.start(); Sound.startMusic();
      startRun(id === 'daily' ? 'daily' : 'classic');
    }
    return;
  }
  if (G.state === 'OVER') {
    if (G.overT < 0.5) return;
    if (id === 'again') { Sound.sfx.start(); startRun(G.mode); }
    else if (id === 'menu') { Sound.sfx.click(); toTitle(); }
    else if (id === 'share') {
      Sound.sfx.click();
      doShare().then(m => banner(m, 1.6)).catch(() => banner(T('shareFail'), 1.6));
    }
    return;
  }
  if (G.state === 'PAUSE') { G.state = 'PLAY'; return; }
  if (G.state === 'PLAY') {
    G.aiming = true;
    setAimTo(x, y);
    Sound.sfx.chainUp(0); // soft tick as immediate input feedback
  }
}
function onMove(x, y) {
  if (G.state === 'PLAY' && G.aiming) setAimTo(x, y);
}
function onRelease() {
  if (G.state === 'PLAY' && G.aiming) {
    G.aiming = false;
    fire();
  } else G.aiming = false;
}
function onKey(code) {
  if (code === 'ArrowLeft') { G.aim = clamp(G.aim - 2 * Math.PI / 180, AIM_MIN, AIM_MAX); }
  else if (code === 'ArrowRight') { G.aim = clamp(G.aim + 2 * Math.PI / 180, AIM_MIN, AIM_MAX); }
  else if (code === 'Space' || code === 'Enter') {
    if (G.state === 'TITLE') { Sound.resume(); Sound.sfx.start(); Sound.startMusic(); startRun('classic'); }
    else if (G.state === 'PLAY') { Sound.resume(); fire(); }
    else if (G.state === 'PAUSE') { G.state = 'PLAY'; }
    else if (G.state === 'OVER' && G.overT > 0.5) { Sound.sfx.start(); startRun(G.mode); }
  }
  else if (code === 'KeyP' || code === 'Escape') {
    if (G.state === 'PLAY') G.state = 'PAUSE';
    else if (G.state === 'PAUSE') G.state = 'PLAY';
  }
  else if (code === 'KeyM') { Sound.setMuted(!Sound.isMuted()); }
  else if (code === 'KeyR') {
    if (G.state === 'PLAY' || G.state === 'PAUSE' || (G.state === 'OVER' && G.overT > 0.5)) startRun(G.mode);
  }
}

/* ---------------- share ---------------- */
function shareText() {
  const link = 'https://seyrs1985.github.io/neonplay/bubble-storm/';
  const rk = rankOf(G.score);
  const rkTxt = rk.emoji + ' ' + T(rk.key);
  return TF(G.mode === 'daily' ? 'shareDaily' : 'shareClassic', [fmtN(G.score), G.bestDrop, rkTxt, link]);
}
function buildShareCard() {
  const cv = document.createElement('canvas');
  cv.width = 640; cv.height = 360;
  const x = cv.getContext('2d');
  const bg = x.createLinearGradient(0, 0, 0, 360);
  bg.addColorStop(0, '#0d1230'); bg.addColorStop(1, '#0a0a18');
  x.fillStyle = bg; x.fillRect(0, 0, 640, 360);
  for (let i = 0; i < 40; i++) {
    x.globalAlpha = 0.15 + Math.random() * 0.3;
    x.fillStyle = COLORS[i % 6];
    x.fillRect(Math.random() * 640, Math.random() * 360, 2, 2);
  }
  x.globalAlpha = 1;
  x.textAlign = 'center';
  x.font = 'bold 34px "Segoe UI",system-ui,sans-serif';
  x.fillStyle = '#00e5ff';
  x.fillText('BUBBLE STORM', 320, 52);
  x.font = '16px "Segoe UI",system-ui,sans-serif';
  x.fillStyle = '#8fa3c8';
  x.fillText(G.mode === 'daily' ? 'DAILY BOARD #' + dailyBoardNum() + ' — ' + isoDate() : 'CLASSIC — ' + isoDate(), 320, 80);
  x.font = 'bold 72px "Segoe UI",system-ui,sans-serif';
  x.fillStyle = '#ffffff';
  x.fillText(fmtN(G.score), 320, 165);
  const rk = rankOf(G.score);
  x.font = 'bold 26px "Segoe UI",system-ui,sans-serif';
  x.fillStyle = '#ffd54a';
  x.fillText(rk.emoji + ' ' + T(rk.key) + '   ·   ' + T('bestWave') + ' ' + G.bestDrop, 320, 212);
  // mini board thumbnail from the final grid
  const fg = G.finalGrid && G.finalGrid.length ? G.finalGrid : G.grid;
  const cellD = 22;
  let drawn = 0;
  for (let r = 0; r < Math.min(fg.length, 4) && drawn < 32; r++)
    for (let c = 0; c < colNOf(r, G.parity) && drawn < 32; c++) {
      const ci = fg[r] && fg[r][c];
      if (ci == null || ci < 0) continue;
      x.beginPath();
      x.arc(320 - ((colNOf(r, G.parity)) * cellD) / 2 + cellD / 2 + c * cellD + (((r + G.parity) & 1) ? cellD / 2 : 0), 258 + r * 16, 8, 0, Math.PI * 2);
      x.fillStyle = COLORS[ci % 6];
      x.fill();
      drawn++;
    }
  x.font = '15px "Segoe UI",system-ui,sans-serif';
  x.fillStyle = '#7c9bd8';
  x.fillText('seyrs1985.github.io/neonplay', 320, 338);
  return cv;
}

/* ---------------- deterministic QA hooks (GAME_STANDARD) ---------------- */
window.__PHYS = {
  W, H, D, R, ROWH, X0, Y0, CEIL, DEATH_Y, WALL_L, WALL_R,
  SHOOTER: { x: SHOOTER.x, y: SHOOTER.y }, SPEED, MAXSHOTS,
  POP_PTS, DROP_PTS, COMBO_WINDOW, COMBO_CAP, DRY_PUSH,
};
function gridSnapshot() {
  return { rows: G.grid.map(r => r.slice()), parity: G.parity };
}
window.__qaState = () => {
  const rk = rankOf(G.score);
  return {
    state: G.state, mode: G.mode, score: G.score, best: G.best,
    shotsUsed: G.shotsUsed, shotsLeft: MAXSHOTS - G.shotsUsed,
    pops: G.pops, drops: G.drops, bestDrop: G.bestDrop,
    mult: G.mult, comboT: G.comboT, dryStreak: G.dryStreak,
    pushed: G.pushCount, rows: G.grid.length, parity: G.parity,
    bubbles: countBubbles(), ballLive: !!G.ball,
    cur: G.cur, next: G.next, aimDeg: Math.round(G.aim * 180 / Math.PI),
    lastPop: G.lastPop || 0, lastDrop: G.lastDrop || 0, lastGain: G.lastGain || 0,
    reason: G.reason, rank: rk.key, rankEmoji: rk.emoji, newBest: G.newBest,
    accuracy: G.attempts ? Math.round(G.hits / G.attempts * 100) : 0,
    lang: window.npLang ? npLang() : 'en',
    overT: Math.round(G.overT * 100) / 100,
  };
};
window.__qa = {
  start(mode) { startRun(mode); return window.__qaState(); },
  sim(seconds) {
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) {
      update(1 / 60);
      if (G.state !== 'PLAY' && G.state !== 'OVER') break;
    }
    return window.__qaState();
  },
  shoot(angleDeg) {
    G.aim = clampAim(angleDeg * Math.PI / 180);
    if (!fire()) return window.__qaState();
    for (let i = 0; i < 60 * 6 && G.ball; i++) update(1 / 60);
    return window.__qaState();
  },
  angleTo(r, c) { return Math.atan2(yOf(r) - SHOOTER.y, xOf(r, c) - SHOOTER.x) * 180 / Math.PI; },
  landShot(r, c) {
    if (G.state !== 'PLAY') return window.__qaState();
    G.lastPop = 0; G.lastDrop = 0; G.lastGain = 0;
    G.attempts++; G.shotsUsed++;
    const color = G.cur;
    G.cur = G.next; G.next = pickColor();
    landAndResolve({ r, c }, color);
    afterShot();
    return window.__qaState();
  },
  setBall(ci) { G.cur = ((ci % 6) + 6) % 6; return window.__qaState(); },
  setShots(n) { G.shotsUsed = clamp(n, 0, MAXSHOTS); return window.__qaState(); },
  setMult(m) { G.mult = m; G.comboT = COMBO_WINDOW; return window.__qaState(); },
  place(r, c, ci) {
    ensureGridTo(r);
    G.grid[r][c] = ((ci % 6) + 6) % 6;
    refreshOcc();
    return window.__qaState();
  },
  clear(r, c) { if (G.grid[r] && c < G.grid[r].length) { G.grid[r][c] = -1; refreshOcc(); } return window.__qaState(); },
  loadRows(rows, parity) {
    G.grid = rows.map(r => r.slice());
    G.parity = parity || 0;
    G.ball = null; G.falls = []; G.parts = []; G.txts = []; G.rings = [];
    refreshOcc();
    return gridSnapshot();
  },
  grid() { return gridSnapshot(); },
  push() {
    if (G.state !== 'PLAY') return window.__qaState();
    pushRow();
    if (deathCheck()) gameOver('line');
    else if (countBubbles() === 0) { }
    return window.__qaState();
  },
  nb(r, c, parity, rows) { return nb(r, c, parity == null ? G.parity : parity, rows == null ? 10 : rows); },
  xOf: (r, c) => xOf(r, c), yOf: r => yOf(r), colN,
  dailyPreview(dateInt) {
    const di = dateInt || utcYMDInt();
    const g = genRows(mulberry32(di), 6);
    return { date: di, cells: g.flat() };
  },
  testVectors() {
    // T1: plain triple pop. T2: pop the support -> floating cluster collapses.
    // T3: the offset-row trap — (2,5) must connect to odd-row (1,6) per doc formula.
    const E = -1;
    const t1 = solveLandingPure([[0, 0, E, E, E, E, E, E]], 0, 0, 2, 0);
    const t2rows = [
      [2, E, E, E, E, E, E, E],
      [2, E, E, E, E, E, E],
      [1, 1, 1, E, E, E, E, E],
    ];
    const t2 = solveLandingPure(t2rows, 0, 1, 1, 2);
    const t3rows = [
      [E, E, E, E, E, E, 2, E],
      [E, E, E, E, E, E, 0],
      [E, E, E, E, E, 0, E, E],
    ];
    const t3 = solveLandingPure(t3rows, 0, 2, 6, 0);
    const trap = nb(1, 6, 0, 3).some(([r, c]) => r === 2 && c === 5) &&
      nb(2, 5, 0, 3).some(([r, c]) => r === 1 && c === 6);
    return {
      T1: { ...t1, expect: { popped: 3, dropped: 0, remain: 0 }, pass: t1.popped === 3 && t1.dropped === 0 && t1.remain === 0 },
      T2: { ...t2, expect: { popped: 3, dropped: 3, remain: 0 }, pass: t2.popped === 3 && t2.dropped === 3 && t2.remain === 0 },
      T3: { ...t3, expect: { popped: 3, dropped: 0, remain: 1 }, pass: t3.popped === 3 && t3.dropped === 0 && t3.remain === 1 },
      offsetTrap: trap,
    };
  },
  buildShareCard() { return buildShareCard(); },
  shareText() { return shareText(); },
  forceOver(reason) { gameOver(reason || 'shots'); return window.__qaState(); },
};

/* ---------------- ?autotest=1 deterministic self-check ---------------- */
(function () {
  const q = new URLSearchParams(location.search);
  if (!q.get('autotest')) return;
  const origErr = console.error;
  let consoleErrCount = 0;
  console.error = function () { consoleErrCount++; origErr.apply(console, arguments); };

  let seed = (parseInt(q.get('seed') || '20260915', 10) >>> 0) || 1;
  const realRandom = Math.random;
  const srand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  Math.random = srand;

  const results = {};
  try {
    // 1) board + column parity
    window.__qa.start('daily');
    const g1 = window.__qa.grid();
    results.gridDims = g1.rows.length === 6 &&
      g1.rows.every((r, i) => r.length === ((i + g1.parity) & 1 ? 7 : 8)) &&
      g1.rows.every(r => r.every(v => v >= 0 && v < 6));

    // 2) hex geometry: every doc-adjacency pair sits exactly one diameter apart
    let geoOK = true;
    for (let p = 0; p < 2; p++)
      for (let r = 0; r < 4; r++)
        for (let c = 0; c < colNOf(r, p); c++)
          for (const [rr, cc] of nb(r, c, p, 4)) {
            const dx = xOfP(r, c, p) - xOfP(rr, cc, p), dy = yOfP(r) - yOfP(rr);
            if (Math.abs(Math.hypot(dx, dy) - D) > 0.001) geoOK = false;
          }
    results.hexDistance = geoOK;

    // 3) design-doc test vectors T1/T2/T3 + offset trap
    const tv = window.__qa.testVectors();
    results.t1Triple = tv.T1.pass;
    results.t2Collapse = tv.T2.pass;
    results.t3Offset = tv.T3.pass;
    results.offsetTrap = tv.offsetTrap;

    // 4) live pop triple scores exactly 10 x 3 (residue row keeps the run alive)
    window.__qa.start('classic');
    window.__qa.loadRows([[0, 0, -1, 3, 3, 3, 3, 3], [5, 5, 5, 5, 5, 5, 5]], 0);
    window.__qa.setBall(0);
    let s = window.__qa.landShot(0, 2);
    results.popScore = s.score === 30 && s.pops === 3 && s.lastPop === 3 && s.state === 'PLAY';

    // 5) collapse scores 20 x mult per bubble (mult rises to 1.3 after the pop)
    window.__qa.start('classic');
    window.__qa.loadRows([
      [2, -1, -1, 6, -1, -1, -1, -1],
      [2, -1, -1, -1, -1, -1, -1],
      [1, 1, 1, -1, -1, -1, -1, -1],
    ], 0);
    window.__qa.setBall(2);
    s = window.__qa.landShot(1, 1);
    results.dropScore = s.score === 108 && s.drops === 3 && s.mult === 1.3 && s.lastGain === 108 && s.state === 'PLAY';

    // 6) combo window expires -> multiplier resets
    s = window.__qa.sim(3.2);
    results.comboWindow = s.mult === 1;

    // 7) failed shot clears the multiplier and feeds the dry counter
    window.__qa.setMult(2);
    window.__qa.loadRows([[3, -1, -1, -1, -1, -1, -1, -1], [-1, -1, -1, -1, -1, -1, -1]], 0);
    window.__qa.setBall(4);
    s = window.__qa.landShot(1, 3);
    results.missResets = s.mult === 1 && s.dryStreak === 1 && s.lastPop === 0;

    // 8) six non-popping shots push exactly one row
    window.__qa.start('classic');
    window.__qa.loadRows([[0, 1, 0, 1, 0, 1, 0, 1]], 0);
    const cols6 = [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4], [1, 5]];
    cols6.forEach(([r, c], i) => { window.__qa.setBall(i % 2 ? 3 : 4); window.__qa.landShot(r, c); });
    s = window.__qaState();
    results.sixDryPush = s.pushed === 1 && s.rows === 3 && s.state === 'PLAY';

    // 9) pushing into the death line ends the run
    let over = false;
    for (let i = 0; i < 30 && !over; i++) over = window.__qa.push().state === 'OVER';
    s = window.__qaState();
    results.deathOver = s.state === 'OVER' && s.reason === 'line';

    // 10) settlement wrote the base retention keys
    const keys = Object.keys(localStorage).filter(k => k.indexOf('np_bubble-storm') === 0);
    results.storageKeys = ['best', 'top10', 'stats', 'weekly'].every(k => keys.includes('np_bubble-storm_' + k));

    // 11) 40th shot ends a daily run -> daily + streak keys land too
    window.__qa.start('daily');
    window.__qa.loadRows([[0, 1, 0, 1, 0, 1, 0, 1], [-1, -1, -1, -1, -1, -1, -1]], 0);
    window.__qa.setShots(39);
    window.__qa.setBall(4);
    s = window.__qa.landShot(1, 3);
    results.shotsEnd = s.state === 'OVER' && s.reason === 'shots' && s.shotsUsed === 40;
    const keys2 = Object.keys(localStorage).filter(k => k.indexOf('np_bubble-storm') === 0);
    results.storageDailyKeys = ['daily', 'streak'].every(k => keys2.includes('np_bubble-storm_' + k));

    // 12) daily determinism: same date -> identical board, twice
    const d1 = window.__qa.dailyPreview(20260915), d2 = window.__qa.dailyPreview(20260915);
    results.dailyDeterministic = JSON.stringify(d1) === JSON.stringify(d2) && d1.cells.length === 45;

    // 13) rank thresholds (9999 diamond / 10000 master / 15000 legend)
    results.rankBounds = rankOf(9999).key === 'rankDiamond' && rankOf(10000).key === 'rankMaster' &&
      rankOf(15000).key === 'rankLegend' && rankOf(14999).key === 'rankMaster' && rankOf(0).key === 'rankBronze';

    // 14) board clear pays the +2000 bonus and settles
    window.__qa.start('classic');
    window.__qa.loadRows([[0, 0, 0, -1, -1, -1, -1, -1]], 0);
    window.__qa.setBall(0);
    s = window.__qa.landShot(0, 3);
    results.clearBonus = s.state === 'OVER' && s.reason === 'clear' && s.score === 40 + CLEAR_BONUS;

    // 15) shot palette only draws colors present on the board
    window.__qa.start('classic');
    window.__qa.loadRows([[5, 5, 5, 5, 5, 5, 5, 5]], 0);
    results.ballPalette = pickColor() === 5;

    // 16) share text carries the site link; share card is not blank
    const txt = shareText();
    const cv = buildShareCard();
    const cx = cv.getContext('2d');
    const cols = new Set();
    for (let i = 0; i < 30; i++) {
      const px = cx.getImageData((i * 37) % cv.width, (i * 91) % cv.height, 1, 1).data;
      cols.add(px[0] + ',' + px[1] + ',' + px[2]);
    }
    results.share = /seyrs1985\.github\.io\/neonplay/.test(txt) && cols.size >= 5;

    // 17) real physics: a straight shot at a two-color row pops exactly 5
    window.__qa.start('classic');
    window.__qa.loadRows([[0, 0, 0, 0, 1, 1, 1, 1], [-1, -1, -1, -1, -1, -1, -1]], 0);
    window.__qa.setBall(0);
    s = window.__qa.shoot(-90);
    results.physicalShot = s.state === 'PLAY' && s.pops === 5 && s.score === 50;

    // 18) no console.error during the whole self-check
    results.noConsoleError = consoleErrCount === 0;
  } catch (e) {
    results.exception = String(e && e.stack || e);
  }
  Math.random = realRandom;
  results.allPass = Object.keys(results).filter(k => k !== 'allPass').every(k => results[k] === true);
  window.__autotest = results;
})();
