/* Neon Pop — game core: state machine / board / gravity / juice / render */
'use strict';

/* ---------------- constants ---------------- */
const W = 720, H = 1280;
const COLS = 10, ROWS = 10, CELL = 64;
const BX = (W - COLS * CELL) / 2, BY = 320;
const BW = COLS * CELL, BH = ROWS * CELL;
const CHAIN_WINDOW = 2.0;      // seconds between pops to keep the chain alive
const CLEAR_BONUS = 2000;
const PAUSE_BTN = { x: W - 72, y: 120, r: 40 };

const COLORS = [
  { hi: '#a5f3fc', main: '#00e5ff', dark: '#0e5f86' }, // cyan
  { hi: '#ddd6fe', main: '#7c4dff', dark: '#3b2185' }, // violet
  { hi: '#fcc4e0', main: '#ff2d95', dark: '#8f1653' }, // pink
  { hi: '#b6f5d4', main: '#22e58c', dark: '#0b6b43' }, // green
  { hi: '#fde9a8', main: '#ffb300', dark: '#8a5a06' }, // gold
];

/* ---------------- i18n ---------------- */
var NP_L = {
  en: {
    start: 'TAP TO START', tagline: 'one hand · pure tap · pure dopamine',
    hint: 'Tap 2+ connected gems to pop them', paused: 'PAUSED',
    resume: 'RESUME', menu: 'MENU', over: 'GAME OVER', perfect: 'PERFECT CLEAR!',
    newBest: 'NEW BEST!', best: 'BEST', score: 'SCORE', retry: 'TAP TO RETRY',
    noMoves: 'NO MORE MOVES', bonus: '+2000 CLEAR BONUS',
    maxPop: 'BIGGEST POP', maxChain: 'MAX CHAIN',
  },
  zh: {
    start: '点按开始', tagline: '单手 · 纯点按 · 纯爽感',
    hint: '点 2 个以上相连的同色方块即可消除', paused: '已暂停',
    resume: '继续', menu: '回主页', over: '游戏结束', perfect: '完美清屏！',
    newBest: '新纪录！', best: '最高', score: '得分', retry: '点按再来一局',
    noMoves: '无路可走', bonus: '清屏奖励 +2000',
    maxPop: '最大消除', maxChain: '最高连击',
  },
};
// site i18n: np_core.js npLang() -> ?lang= > np_lang (site switcher) > browser > en
function T(k) {
  if (window.npT) return npT(NP_L, k);
  let lang = 'en';
  try {
    lang = new URLSearchParams(location.search).get('lang') ||
      localStorage.getItem('np_lang') || 'en';
  } catch (e) {}
  lang = String(lang).slice(0, 2).toLowerCase();
  return (NP_L[lang] && NP_L[lang][k]) || NP_L.en[k] || k;
}

/* ---------------- state ---------------- */
const G = {
  state: 'TITLE', time: 0,
  score: 0, best: 0, chain: 0, maxChain: 1, maxPop: 0,
  lastPopT: -99, lastGain: 0,
  grid: [], cellAnim: {},
  particles: [], rings: [], popups: [],
  stars: [], ambGems: [],
  shake: 0, flash: 0, hitstop: 0,
  overT: 0, bannerMsg: '', bannerT: 99, perfect: false, newBest: false, deadEnd: false,
  badT: -9, badXY: null, tut: false,
  hitRegions: [],
};

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }

/* ---------------- board helpers ---------------- */
function newGrid() {
  const g = [];
  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) row.push((Math.random() * COLORS.length) | 0);
    g.push(row);
  }
  return g;
}
function countBlocks() {
  let n = 0;
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (G.grid[r][c] >= 0) n++;
  return n;
}
function inBounds(r, c) { return r >= 0 && r < ROWS && c >= 0 && c < COLS; }
function findGroupAt(r0, c0) {
  const v = G.grid[r0][c0];
  if (v < 0) return [];
  const seen = new Set([r0 * COLS + c0]);
  const stack = [[r0, c0]];
  const out = [];
  while (stack.length) {
    const [r, c] = stack.pop();
    out.push({ r, c });
    const nb = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
    for (const [nr, nc] of nb) {
      if (inBounds(nr, nc) && G.grid[nr][nc] === v && !seen.has(nr * COLS + nc)) {
        seen.add(nr * COLS + nc);
        stack.push([nr, nc]);
      }
    }
  }
  return out;
}
function largestGroup() {
  let best = [];
  const seen = new Set();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const k = r * COLS + c;
    if (G.grid[r][c] < 0 || seen.has(k)) continue;
    const g = findGroupAt(r, c);
    for (const p of g) seen.add(p.r * COLS + p.c);
    if (g.length > best.length) best = g;
  }
  return best;
}
function hasAnyMove() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = G.grid[r][c];
    if (v < 0) continue;
    if (c + 1 < COLS && G.grid[r][c + 1] === v) return true;
    if (r + 1 < ROWS && G.grid[r + 1][c] === v) return true;
  }
  return false;
}
function findIsolatedCell() {
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = G.grid[r][c];
    if (v < 0) continue;
    const same = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([nr, nc]) => inBounds(nr, nc) && G.grid[nr][nc] === v).length;
    if (same === 0) return { r, c };
  }
  return null;
}

/* ---------------- flow ---------------- */
function startRun() {
  G.state = 'PLAY';
  G.score = 0; G.chain = 0; G.maxChain = 1; G.maxPop = 0;
  G.lastPopT = -99; G.lastGain = 0;
  G.grid = newGrid();
  G.cellAnim = {};
  G.popups.length = 0; G.rings.length = 0;
  G.perfect = false; G.newBest = false; G.deadEnd = false;
  G.overT = 0; G.bannerT = 99; G.flash = 0; G.hitstop = 0;
}
function toTitle() { G.state = 'TITLE'; Sound.stopMusic(); }

function endRun(kind) {
  if (G.state !== 'PLAY') return;
  G.state = 'OVER';
  G.overT = 0;
  if (kind === 'perfect') {
    G.perfect = true;
    G.score += CLEAR_BONUS;
    G.flash = 1;
    banner('PERFECT!');
    Sound.sfx.perfect();
  } else {
    G.deadEnd = true;
    banner(T('noMoves'));
    Sound.sfx.over();
  }
  if (G.score > G.best) {
    G.best = G.score;
    G.newBest = true;
    try { localStorage.setItem('np_pop_best', String(G.best)); } catch (e) {}
  }
}
function banner(msg) { G.bannerMsg = msg; G.bannerT = 0; }

/* ---------------- pop / gravity / collapse ---------------- */
function popGroup(group) {
  const n = group.length;
  G.chain = (G.time - G.lastPopT <= CHAIN_WINDOW) ? Math.min(G.chain + 1, 5) : 1;
  G.maxChain = Math.max(G.maxChain, G.chain);
  const mult = G.chain;
  const gain = n * n * 5 * mult;
  G.score += gain;
  G.lastGain = gain;
  G.lastPopT = G.time;
  G.maxPop = Math.max(G.maxPop, n);

  let cx = 0, cy = 0;
  for (const p of group) {
    const v = G.grid[p.r][p.c];
    G.grid[p.r][p.c] = -1;
    delete G.cellAnim[p.r * COLS + p.c];
    cx += BX + p.c * CELL + CELL / 2;
    cy += BY + p.r * CELL + CELL / 2;
    spawnBurst(BX + p.c * CELL + CELL / 2, BY + p.r * CELL + CELL / 2, v, n);
  }
  cx /= n; cy /= n;
  addPopup(cx, cy, '+' + gain + (mult > 1 ? '  ×' + mult : ''), gain);
  if (n >= 8) addRing(cx, cy, n >= 13 ? COLORS[4].main : COLORS[2].main);
  G.shake = Math.min(3 + n * 0.7, 16);
  if (n >= 6) G.hitstop = Math.min(0.02 * n, 0.12);
  Sound.sfx.pop(n, mult);
  if (mult >= 2) Sound.sfx.chainUp(mult);

  doGravity();
  doCollapse();

  if (countBlocks() === 0) endRun('perfect');
  else if (!hasAnyMove()) endRun('dead');
}

function doGravity() {
  const moved = {};
  for (let c = 0; c < COLS; c++) {
    let write = ROWS - 1;
    for (let r = ROWS - 1; r >= 0; r--) {
      const v = G.grid[r][c];
      if (v >= 0) {
        if (write !== r) {
          const from = moved[r * COLS + c] || { r0: r, c0: c };
          moved[write * COLS + c] = { r0: from.r0, c0: from.c0 };
          G.grid[write][c] = v;
          G.grid[r][c] = -1;
        }
        write--;
      }
    }
  }
  applyMoved(moved);
}

function doCollapse() {
  const cols = [];
  for (let c = 0; c < COLS; c++) {
    let empty = true;
    for (let r = 0; r < ROWS; r++) if (G.grid[r][c] >= 0) { empty = false; break; }
    if (!empty) cols.push(c);
  }
  if (cols.length === COLS) return;
  const moved = {};
  const newGrid = [];
  for (let r = 0; r < ROWS; r++) newGrid.push(new Array(COLS).fill(-1));
  cols.forEach((srcC, dstC) => {
    for (let r = 0; r < ROWS; r++) {
      const v = G.grid[r][srcC];
      if (v >= 0) {
        newGrid[r][dstC] = v;
        const from = moved[r * COLS + srcC] || { r0: r, c0: srcC };
        moved[r * COLS + dstC] = { r0: from.r0, c0: from.c0 };
      }
    }
  });
  G.grid = newGrid;
  applyMoved(moved);
}

function applyMoved(moved) {
  for (const key in moved) {
    const k = +key;
    const r = (k / COLS) | 0, c = k % COLS;
    const from = moved[key];
    const dist = Math.max(Math.abs(from.r0 - r), Math.abs(from.c0 - c));
    G.cellAnim[k] = {
      ox: (from.c0 - c) * CELL,
      oy: (from.r0 - r) * CELL,
      t: 0,
      dur: clamp(0.14 + dist * 0.05, 0.16, 0.5),
    };
  }
}

/* ---------------- juice ---------------- */
function spawnBurst(x, y, ci, n) {
  const col = COLORS[ci];
  const count = clamp(3 + (n >> 1), 4, 8);
  if (G.particles.length > 300) return;
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 90 + Math.random() * 260;
    G.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 70,
      life: 0, max: 0.45 + Math.random() * 0.4,
      size: 3 + Math.random() * 6, color: Math.random() < 0.25 ? col.hi : col.main,
      rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 12,
    });
  }
}
function addRing(x, y, color) { G.rings.push({ x, y, r: 10, maxR: 150, life: 0, dur: 0.45, color }); }
function addPopup(x, y, text, gain) {
  G.popups.push({
    x, y, text, life: 0, dur: 0.95,
    size: clamp(20 + gain / 40, 20, 46),
    color: gain >= 8 * 8 * 5 ? '#ffd54d' : '#ffffff',
  });
}
function spawnFirework() {
  const x = BX + 40 + Math.random() * (BW - 80);
  const y = BY + 40 + Math.random() * (BH - 80);
  const col = COLORS[(Math.random() * COLORS.length) | 0];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    G.particles.push({
      x, y, vx: Math.cos(a) * 220, vy: Math.sin(a) * 220,
      life: 0, max: 0.7, size: 3.5, color: col.main, rot: 0, spin: 0,
    });
  }
  addRing(x, y, col.main);
}

/* ---------------- update ---------------- */
function update(dt) {
  if (G.hitstop > 0) { G.hitstop -= dt; dt *= 0.15; }
  G.time += dt;
  G.shake *= Math.pow(0.0005, dt);
  if (G.shake < 0.15) G.shake = 0;
  G.flash = Math.max(0, G.flash - dt * 1.8);
  G.bannerT += dt;

  for (const k in G.cellAnim) {
    const a = G.cellAnim[k];
    a.t += dt / a.dur;
    if (a.t >= 1) delete G.cellAnim[k];
  }
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life += dt;
    if (p.life >= p.max) { G.particles.splice(i, 1); continue; }
    p.vy += 620 * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.rot += p.spin * dt;
  }
  for (let i = G.rings.length - 1; i >= 0; i--) {
    const g = G.rings[i];
    g.life += dt;
    if (g.life >= g.dur) G.rings.splice(i, 1);
    else g.r = 10 + (g.maxR - 10) * (g.life / g.dur);
  }
  for (let i = G.popups.length - 1; i >= 0; i--) {
    const p = G.popups[i];
    p.life += dt;
    if (p.life >= p.dur) G.popups.splice(i, 1);
  }

  if (G.state === 'PLAY') {
    if (countBlocks() > 0 && !hasAnyMove()) endRun('dead');
  } else if (G.state === 'OVER') {
    G.overT += dt;
    if (G.perfect && G.overT < 1.5 && Math.random() < dt * 6) spawnFirework();
  }
}

/* ---------------- draw ---------------- */
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function easeOutBack(t) { const k = 1.35; const s = t - 1; return 1 + (k + 1) * s * s * s + k * s * s; }
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
const FONT = '"Segoe UI", system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';

function initStars() {
  G.stars = [];
  for (let i = 0; i < 80; i++) {
    G.stars.push({
      x: Math.random() * W, y: Math.random() * H,
      r: 0.6 + Math.random() * 1.6, ph: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 1.2,
    });
  }
  G.ambGems = [];
  for (let i = 0; i < 9; i++) {
    G.ambGems.push({
      x: Math.random() * W, y: Math.random() * H,
      v: 26 + Math.random() * 42, ci: (Math.random() * COLORS.length) | 0,
      s: 26 + Math.random() * 30, rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 0.7,
    });
  }
}

function drawBackground(ctx) {
  const grd = ctx.createLinearGradient(0, 0, 0, H);
  grd.addColorStop(0, '#0d0d24');
  grd.addColorStop(1, '#080814');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, W, H);
  for (const s of G.stars) {
    ctx.globalAlpha = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(G.time * s.sp + s.ph));
    ctx.fillStyle = '#cfe9ff';
    ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 0.04 + 0.02 * Math.sin(G.time * 0.8);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1;
  for (let x = 80; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 80; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
  ctx.globalAlpha = 1;
}

function drawGem(ctx, x, y, ci, size) {
  const col = COLORS[ci];
  const pad = 4, s = (size || CELL) - pad * 2, rad = 13;
  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, col.main);
  g.addColorStop(1, col.dark);
  ctx.fillStyle = g;
  rr(ctx, x + pad, y + pad, s, s, rad); ctx.fill();
  // neon rim + fake glow (no shadowBlur)
  ctx.strokeStyle = col.main; ctx.globalAlpha = 0.28; ctx.lineWidth = 6;
  rr(ctx, x + pad, y + pad, s, s, rad); ctx.stroke();
  ctx.globalAlpha = 1; ctx.lineWidth = 2.5;
  rr(ctx, x + pad, y + pad, s, s, rad); ctx.stroke();
  // sheen
  const sh = ctx.createRadialGradient(x + s * 0.38, y + s * 0.3, 2, x + s * 0.38, y + s * 0.3, s * 0.5);
  sh.addColorStop(0, 'rgba(255,255,255,0.4)');
  sh.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = sh;
  rr(ctx, x + pad, y + pad, s, s, rad); ctx.fill();
  // core dot
  ctx.fillStyle = col.hi; ctx.globalAlpha = 0.85;
  ctx.beginPath(); ctx.arc(x + CELL / 2, y + CELL / 2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
}

function drawBoard(ctx) {
  // panel
  ctx.fillStyle = 'rgba(255,255,255,0.028)';
  rr(ctx, BX - 16, BY - 16, BW + 32, BH + 32, 26); ctx.fill();
  ctx.strokeStyle = '#00e5ff';
  ctx.globalAlpha = 0.22 + 0.08 * Math.sin(G.time * 1.4);
  ctx.lineWidth = 2;
  rr(ctx, BX - 16, BY - 16, BW + 32, BH + 32, 26); ctx.stroke();
  ctx.globalAlpha = 1;
  // empty slots
  ctx.fillStyle = 'rgba(255,255,255,0.02)';
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    rr(ctx, BX + c * CELL + 4, BY + r * CELL + 4, CELL - 8, CELL - 8, 13); ctx.fill();
  }
  // gems (skipping animated ones)
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const v = G.grid[r][c];
    if (v < 0) continue;
    const k = r * COLS + c;
    if (G.cellAnim[k]) continue;
    drawGem(ctx, BX + c * CELL, BY + r * CELL, v, CELL);
  }
  // animated gems
  for (const k in G.cellAnim) {
    const a = G.cellAnim[k];
    const r = (k / COLS) | 0, c = k % COLS;
    const v = G.grid[r][c];
    if (v < 0) continue;
    const e = easeOutBack(clamp(a.t, 0, 1));
    drawGem(ctx, BX + c * CELL + a.ox * (1 - e), BY + r * CELL + a.oy * (1 - e), v, CELL);
  }
}

function drawParticles(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.particles) {
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = p.color;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * (0.6 + a * 0.4));
    ctx.restore();
  }
  for (const g of G.rings) {
    const a = 1 - g.life / g.dur;
    ctx.globalAlpha = a * 0.8;
    ctx.strokeStyle = g.color;
    ctx.lineWidth = 6 * a + 1;
    ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}

function drawPopups(ctx) {
  for (const p of G.popups) {
    const t = p.life / p.dur;
    const a = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;
    const y = p.y - 70 * easeOutCubic(t);
    ctx.globalAlpha = a;
    ctx.font = '800 ' + p.size + 'px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.lineWidth = 5;
    ctx.strokeText(p.text, p.x, y);
    ctx.fillStyle = p.color;
    ctx.fillText(p.text, p.x, y);
  }
  ctx.globalAlpha = 1;
}

function textGlow(ctx, text, x, y, size, color, align, coreColor) {
  ctx.font = '800 ' + size + 'px ' + FONT;
  ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = color;
  ctx.fillText(text, x, y + 3);
  ctx.globalAlpha = 1;
  ctx.fillStyle = coreColor || '#ffffff';
  ctx.fillText(text, x, y);
}

function drawHUD(ctx) {
  textGlow(ctx, T('score'), W / 2, 52, 20, '#00e5ff');
  textGlow(ctx, String(G.score), W / 2, 106, 64, '#00e5ff');
  // best (top-left)
  ctx.font = '700 24px ' + FONT;
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd54d';
  ctx.fillText('★ ' + G.best, 28, 56);
  // chain meter (top-right, left of pause btn)
  if (G.state === 'PLAY' && G.chain >= 2) {
    const left = 1 - clamp((G.time - G.lastPopT) / CHAIN_WINDOW, 0, 1);
    const pulse = 1 + 0.12 * Math.sin(G.time * 10);
    ctx.save();
    ctx.translate(W - 130, 106);
    ctx.scale(pulse, pulse);
    textGlow(ctx, '×' + G.chain, 0, -12, 40, '#ff2d95');
    ctx.restore();
    ctx.fillStyle = 'rgba(255,45,149,0.85)';
    rr(ctx, W - 172, 140, 84 * left, 5, 3); ctx.fill();
  }
  // pause button
  if (G.state === 'PLAY') {
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.fillStyle = 'rgba(255,255,255,0.07)';
    ctx.beginPath(); ctx.arc(PAUSE_BTN.x, PAUSE_BTN.y, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    rr(ctx, PAUSE_BTN.x - 9, PAUSE_BTN.y - 10, 6, 20, 2); ctx.fill();
    rr(ctx, PAUSE_BTN.x + 3, PAUSE_BTN.y - 10, 6, 20, 2); ctx.fill();
  }
  // hint
  if (G.state === 'PLAY') {
    ctx.globalAlpha = 0.45;
    ctx.font = '500 22px ' + FONT;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#9fb8d8';
    ctx.fillText(T('hint'), W / 2, BY + BH + 46);
    ctx.globalAlpha = 1;
  }
  // banner
  if (G.bannerT < 1.4) {
    const t = G.bannerT;
    const a = t < 1.0 ? 1 : 1 - (t - 1.0) / 0.4;
    const sc = t < 0.15 ? easeOutBack(t / 0.15) : 1;
    ctx.save();
    ctx.translate(W / 2, BY - 70);
    ctx.scale(sc, sc);
    ctx.globalAlpha = a;
    textGlow(ctx, G.bannerMsg, 0, 0, 44, '#ffd54d');
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}

function drawSoundIcon(ctx, x, y) {
  const on = !Sound.isMuted();
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.arc(x, y, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = on ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 4); ctx.lineTo(x - 4, y - 4); ctx.lineTo(x + 2, y - 10);
  ctx.lineTo(x + 2, y + 10); ctx.lineTo(x - 4, y + 4); ctx.lineTo(x - 10, y + 4);
  ctx.closePath(); ctx.fill();
  if (on) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.arc(x + 5, y, 8, -0.9, 0.9); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + 5, y, 13, -0.9, 0.9); ctx.stroke();
  } else {
    ctx.strokeStyle = '#ff2d95'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 7, y - 7); ctx.lineTo(x + 17, y + 7); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + 17, y - 7); ctx.lineTo(x + 7, y + 7); ctx.stroke();
  }
}

function drawTitle(ctx) {
  // ambient drifting gems
  for (const g of G.ambGems) {
    g.y += g.v / 60; g.rot += g.spin / 60;
    if (g.y > H + 40) g.y = -40;
    ctx.save();
    ctx.translate(g.x, g.y); ctx.rotate(g.rot);
    ctx.globalAlpha = 0.35;
    drawGem(ctx, -g.s / 2, -g.s / 2, g.ci, g.s);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  textGlow(ctx, 'NEON', W / 2, 300, 110, '#00e5ff', 'center', '#00e5ff');
  textGlow(ctx, 'POP', W / 2, 420, 110, '#ff2d95', 'center', '#ff2d95');
  ctx.globalAlpha = 0.6;
  ctx.font = '500 24px ' + FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9fb8d8';
  ctx.fillText(T('tagline'), W / 2, 500);
  ctx.globalAlpha = 1;
  const pulse = 0.6 + 0.4 * Math.sin(G.time * 3);
  ctx.globalAlpha = 0.45 + 0.55 * pulse;
  textGlow(ctx, T('start'), W / 2, 640, 36, '#22e58c');
  ctx.globalAlpha = 1;
  ctx.font = '700 26px ' + FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffd54d';
  ctx.fillText('★ ' + G.best, W / 2, 730);
  drawSoundIcon(ctx, W - 72, H - 84);
  G.hitRegions = [{ id: 'snd', x: W - 72 - 34, y: H - 84 - 34, w: 68, h: 68 }];
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(5,5,16,0.74)';
  ctx.fillRect(0, 0, W, H);
  textGlow(ctx, T('paused'), W / 2, 420, 60, '#7c4dff');
  const btn = { x: W / 2 - 150, y: 560, w: 300, h: 76 };
  ctx.fillStyle = 'rgba(0,229,255,0.16)';
  ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2.5;
  rr(ctx, btn.x, btn.y, btn.w, btn.h, 20); ctx.fill(); ctx.stroke();
  ctx.font = '800 30px ' + FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(T('resume'), W / 2, btn.y + btn.h / 2 + 1);
  const q = { x: W / 2 - 150, y: 670, w: 300, h: 76 };
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  rr(ctx, q.x, q.y, q.w, q.h, 20); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillText(T('menu'), W / 2, q.y + q.h / 2 + 1);
  drawSoundIcon(ctx, W / 2, 830);
  G.hitRegions = [
    { id: 'resume', x: btn.x, y: btn.y, w: btn.w, h: btn.h },
    { id: 'quit', x: q.x, y: q.y, w: q.w, h: q.h },
    { id: 'snd', x: W / 2 - 34, y: 830 - 34, w: 68, h: 68 },
  ];
}

function drawOver(ctx) {
  const a = clamp((G.overT - 0.45) / 0.4, 0, 1);
  if (a <= 0) return;
  ctx.fillStyle = 'rgba(5,5,16,' + 0.72 * a + ')';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  const px = 90, py = 380, pw = W - 180, ph = 520;
  ctx.fillStyle = 'rgba(20,22,48,0.92)';
  ctx.strokeStyle = G.perfect ? '#ffd54d' : '#7c4dff';
  ctx.lineWidth = 2.5;
  rr(ctx, px, py, pw, ph, 28); ctx.fill(); ctx.stroke();
  textGlow(ctx, G.perfect ? T('perfect') : T('over'), W / 2, py + 86, G.perfect ? 52 : 48, G.perfect ? '#ffd54d' : '#7c4dff');
  ctx.globalAlpha = a * 0.55;
  ctx.font = '600 22px ' + FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9fb8d8';
  ctx.fillText(T('score'), W / 2, py + 168);
  ctx.globalAlpha = a;
  textGlow(ctx, String(G.score), W / 2, py + 232, 76, '#00e5ff');
  if (G.newBest) {
    const pulse = 1 + 0.08 * Math.sin(G.time * 8);
    ctx.save(); ctx.translate(W / 2, py + 312); ctx.scale(pulse, pulse);
    textGlow(ctx, T('newBest'), 0, 0, 34, '#ffd54d');
    ctx.restore();
  }
  ctx.globalAlpha = a * 0.85;
  ctx.font = '600 24px ' + FONT;
  ctx.fillStyle = '#cfe9ff';
  ctx.fillText(T('best') + '  ' + G.best, W / 2, py + 372);
  ctx.globalAlpha = a * 0.75;
  ctx.font = '500 21px ' + FONT;
  ctx.fillStyle = '#9fb8d8';
  ctx.fillText(T('maxPop') + ' ' + G.maxPop + '   ·   ' + T('maxChain') + ' ×' + G.maxChain, W / 2, py + 418);
  ctx.globalAlpha = a * (0.55 + 0.45 * Math.sin(G.time * 3));
  textGlow(ctx, T('retry'), W / 2, py + ph - 42, 28, '#22e58c');
  ctx.globalAlpha = 1;
  if (G.perfect && G.overT < 2.0) {
    textGlow(ctx, T('bonus'), W / 2, py - 46, 34, '#ffd54d');
  }
}

function draw(ctx) {
  ctx.save();
  if (G.shake > 0) {
    ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  }
  drawBackground(ctx);
  if (G.state === 'TITLE') {
    drawTitle(ctx);
  } else {
    drawBoard(ctx);
    drawParticles(ctx);
    drawPopups(ctx);
    drawHUD(ctx);
    if (G.state === 'PAUSE') drawPause(ctx);
    if (G.state === 'OVER') drawOver(ctx);
  }
  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,250,230,' + (G.flash * 0.5) + ')';
    ctx.fillRect(-40, -40, W + 80, H + 80);
  }
  ctx.restore();
}

/* ---------------- input ---------------- */
function hitAt(lx, ly) {
  for (const h of G.hitRegions) {
    if (lx >= h.x && lx <= h.x + h.w && ly >= h.y && ly <= h.y + h.h) return h;
  }
  return null;
}
function onPress(lx, ly) {
  Sound.resume();
  if (G.state === 'TITLE') {
    const h = hitAt(lx, ly);
    if (h && h.id === 'snd') { Sound.setMuted(!Sound.isMuted()); Sound.sfx.click(); return; }
    startRun();
    Sound.sfx.start();
    Sound.startMusic();
    return;
  }
  if (G.state === 'PLAY') {
    const dx = lx - PAUSE_BTN.x, dy = ly - PAUSE_BTN.y;
    if (dx * dx + dy * dy < 46 * 46) { G.state = 'PAUSE'; Sound.sfx.click(); return; }
    const c = Math.floor((lx - BX) / CELL), r = Math.floor((ly - BY) / CELL);
    if (!inBounds(r, c) || G.grid[r][c] < 0) return;
    const group = findGroupAt(r, c);
    if (group.length >= 2) popGroup(group);
    else {
      G.badT = G.time;
      G.badXY = { x: BX + c * CELL + CELL / 2, y: BY + r * CELL + CELL / 2 };
      G.shake = Math.max(G.shake, 2.5);
      Sound.sfx.bad();
    }
    return;
  }
  if (G.state === 'PAUSE') {
    const h = hitAt(lx, ly);
    if (!h) return;
    if (h.id === 'resume') { G.state = 'PLAY'; Sound.sfx.click(); }
    else if (h.id === 'quit') { toTitle(); Sound.sfx.click(); }
    else if (h.id === 'snd') { Sound.setMuted(!Sound.isMuted()); Sound.sfx.click(); }
    return;
  }
  if (G.state === 'OVER') {
    if (G.overT < 0.6) return;
    startRun();
    Sound.sfx.start();
    return;
  }
}
function onRelease() { /* tap game: nothing to release */ }

/* ---------------- storage ---------------- */
function loadStorage() {
  try {
    G.best = parseInt(localStorage.getItem('np_pop_best') || '0', 10) || 0;
    G.tut = localStorage.getItem('np_pop_tut') !== '1';
    if (G.tut) { try { localStorage.setItem('np_pop_tut', '1'); } catch (e) {} }
  } catch (e) {}
}

/* ---------------- deterministic hooks (autotest / screenshots) ----------------
   ?autotest=1                       step the engine directly, expose window.__autotest
   ?shot=title|play|over[&seed=N][&t=sec]   stage a scene and render one frame */
(function () {
  const q = new URLSearchParams(location.search);
  const mode = q.get('shot');
  const autotest = q.get('autotest');
  window.__qaState = () => {
    const full = G.grid.length === ROWS;   // callable in ANY state (TITLE has no board yet)
    let blocks = 0;
    if (full) for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (G.grid[r][c] >= 0) blocks++;
    return {
      state: G.state, score: G.score, best: G.best, chain: G.chain,
      blocks, moves: full ? hasAnyMove() : false, maxPop: G.maxPop, maxChain: G.maxChain,
    };
  };

  if (!mode && !autotest) return;

  const origErr = console.error;
  let consoleErrCount = 0;
  console.error = function () { consoleErrCount++; origErr.apply(console, arguments); };

  let seed = (parseInt(q.get('seed') || '20260910', 10) >>> 0) || 1;
  const realRandom = Math.random;
  const srand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  Math.random = srand; // everything in this page is deterministic

  initStars();
  loadStorage();

  function sim(seconds) {
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) {
      update(1 / 60);
      if (G.state !== 'PLAY' && G.state !== 'OVER') break;
    }
  }
  const tapCell = (r, c) => onPress(BX + c * CELL + CELL / 2, BY + r * CELL + CELL / 2);
  function botMove() {
    const g = largestGroup();
    if (!g || g.length < 2) return false;
    tapCell(g[0].r, g[0].c);
    return true;
  }
  function botPlay(seconds) {
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i += 24) {   // a move every 0.4s
      if (G.state !== 'PLAY') break;
      botMove();
      sim(0.4);
    }
  }

  if (autotest) {
    const results = {};
    // floating = a block with an empty cell directly below it
    const noFloating = () => {
      for (let c = 0; c < COLS; c++) {
        let seenBlock = false;
        for (let r = 0; r < ROWS; r++) {
          if (G.grid[r][c] >= 0) seenBlock = true;
          else if (seenBlock) return false;
        }
      }
      return true;
    };
    try {
      // 1) board integrity
      startRun();
      results.boardDims = G.grid.length === ROWS && G.grid[0].length === COLS &&
        G.grid.every(row => row.every(v => v >= 0 && v < COLORS.length));
      results.fullBoard = countBlocks() === ROWS * COLS;

      // 2) pop removes exactly the group, exact quadratic score, gravity compacts
      const g1 = largestGroup();
      results.pairExists = g1.length >= 2;
      const n1 = g1.length;
      const s0 = G.score;
      tapCell(g1[0].r, g1[0].c);
      results.popRemoves = countBlocks() === ROWS * COLS - n1;
      results.exactScore = G.score - s0 === n1 * n1 * 5;
      results.lastGainRecorded = G.lastGain === n1 * n1 * 5;
      results.gravityCompacts = noFloating();

      // 3) chain multiplier doubles the second pop inside the window
      startRun();
      const gA = largestGroup();
      tapCell(gA[0].r, gA[0].c);            // chain -> 1
      const gB = largestGroup();
      const sB = G.score;
      tapCell(gB[0].r, gB[0].c);            // chain -> 2
      results.chainIs2 = G.chain === 2;
      results.chainMult2 = G.score - sB === gB.length * gB.length * 5 * 2;

      // 4) chain resets after the window
      startRun();
      const gC = largestGroup();
      tapCell(gC[0].r, gC[0].c);
      sim(2.6);                              // > CHAIN_WINDOW
      const gD = largestGroup();
      const sD = G.score;
      tapCell(gD[0].r, gD[0].c);
      results.chainReset = G.chain === 1 && G.score - sD === gD.length * gD.length * 5;

      // 5) single tap is a no-op with negative feedback
      startRun();
      const iso = findIsolatedCell();
      const snap = JSON.stringify(G.grid);
      const sE = G.score;
      if (iso) {
        tapCell(iso.r, iso.c);
        results.singleTapNoOp = G.score === sE && JSON.stringify(G.grid) === snap && G.badT >= 0;
      } else results.singleTapNoOp = true;

      // 6) column collapse: empty col 5, pop col 7 -> everything shifts left
      startRun();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) G.grid[r][c] = (c === 5) ? -1 : c % 2;
      G.lastPopT = -99;
      tapCell(0, 7);                         // pops the 10-block column 7
      results.collapseWorks = countBlocks() === 80 &&
        G.grid[0][7] >= 0 && G.grid[0][5] >= 0 && G.grid[0][8] < 0 && noFloating();

      // 7) clearing the board grants the bonus and ends with perfect
      startRun();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) G.grid[r][c] = -1;
      G.grid[9][0] = 0; G.grid[9][1] = 0;
      G.lastPopT = -99; G.chain = 0;
      tapCell(9, 0);
      results.clearBonus = G.state === 'OVER' && G.perfect === true &&
        G.score === 2 * 2 * 5 + CLEAR_BONUS && G.lastGain === 20;

      // 8) a dead board (no pairs) ends the run
      startRun();
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) G.grid[r][c] = (r + c) % 2;
      update(0.05);
      results.deadBoardEnds = G.state === 'OVER' && G.deadEnd === true;

      // 9) restart / pause / best tracking
      startRun();
      results.restartWorks = G.state === 'PLAY' && G.score === 0 && countBlocks() === ROWS * COLS;
      G.state = 'PAUSE';
      results.pauseWorks = G.state === 'PAUSE';
      G.state = 'PLAY';
      G.score = 5000;
      endRun('dead');
      results.bestTracked = G.best >= 5000 && G.newBest === true;

      // 10) autopilot plays real generated boards to completion
      startRun();
      let moves = 0;
      while (G.state === 'PLAY' && moves < 60) {
        if (!botMove()) break;
        moves++;
        sim(0.3);
      }
      results.autopilotPlays = moves >= 5 && G.score > 300;
    } catch (e) {
      results.exception = String(e && e.stack || e);
    }
    results.consoleErrors = consoleErrCount;
    results.allPass = Object.keys(results).every(k => k === 'consoleErrors' ? results[k] === 0 : results[k] !== false);
    window.__autotest = results;
    try { document.title = 'AUTOTEST:' + JSON.stringify(results); } catch (e) {}
    return;
  }

  // --- staged screenshots ---
  try { localStorage.setItem('np_pop_tut', '1'); localStorage.setItem('np_pop_best', '128'); } catch (e) {}
  setTimeout(() => {
    try {
      initStars();
      loadStorage();
      G.tut = false;
      G.best = 128;
      const mode2 = mode;
      if (mode2 === 'title') {
        G.state = 'TITLE';
        G.time = 2.4;
      } else if (mode2 === 'play') {
        startRun();
        botPlay(parseFloat(q.get('t') || '4') || 4);
        G.chain = 2; G.lastPopT = G.time;   // show the combo meter in the shot
      } else if (mode2 === 'over') {
        startRun();
        botPlay(6);
        G.score = Math.max(G.score, 1240);
        endRun('dead');
        G.overT = 1.1;
        G.bannerT = 99;
      }
      G.shake = 0; G.flash = 0;
      window.__qaFreeze = true;
      setTimeout(() => {
        G.shake = 0; G.flash = 0;
        if (mode2 === 'over') G.overT = 1.1;
        window.__qaRender && window.__qaRender();
        try { document.title = 'SHOT:' + (window.__stageErr || 'ok'); } catch (e) {}
      }, 40);
    } catch (e) {
      window.__stageErr = String(e && e.stack || e);
      try { document.title = 'SHOT:' + window.__stageErr; } catch (e2) {}
    }
  }, 0);
})();
