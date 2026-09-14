/* Neon Doodle — game core: levels / ink economy / circle-segment physics / render.
 * Design doc: designs/claimed/neon-doodle.md (constants & level data verbatim).
 * Physics: ball vs segments (walls + drawn ink), substep DT=1/240, impact-only
 * restitution/friction (resting contact just kills normal velocity so the ball
 * can roll — per-collision FRICTION applies to impacts, not to every substep).
 */
'use strict';

/* ---------------- constants (design doc, verbatim) ---------------- */
const W = 480, H = 720;
const GRAV = 1500;            // px/s²
const R = 12;                 // ball radius
const DT = 1 / 240;           // physics substep (anti-tunneling)
const REST = 0.35;            // bounce restitution
const FRICTION = 0.02;        // tangential loss per impact
const BOUNCE_MIN = 60;        // px/s: below this a contact is "resting", not an impact
const SAMPLE_MIN = 4;         // px between recorded pen samples (anti-jitter ink waste)
const INK_3STAR = 0.35;       // remaining-ink fraction for 3 stars
const STILL_SPEED = 5;        // px/s — below this counts as stopped
const STILL_TIME = 3;         // s of stillness -> dead ball hint
const RUN_TIMEOUT = 30;       // s safety: force reset
const MAX_PARTICLES = 260;
window.__PHYS = { W, H, GRAV, R, DT, REST, FRICTION, SAMPLE_MIN, INK_3STAR };

const C = {
  bg: '#0a0a18', cyan: '#00e5ff', violet: '#7c4dff', pink: '#ff2d95',
  gold: '#ffd54a', green: '#39ff88', red: '#ff5470', white: '#e8ecff',
  dim: 'rgba(232,236,255,0.55)', panel: 'rgba(16,18,40,0.88)',
};

/* ---------------- i18n ---------------- */
var NP_L = {
  en: {
    title: 'NEON DOODLE', tagline: 'one stroke of ink · catch the falling light',
    best: 'BEST', rank: 'RANK', streak: 'STREAK', days: 'd', wins: 'Wins',
    games: 'runs', threeStars: '3★', lvl1: 'Ramp', lvl2: 'Gap', lvl3: 'Wall',
    lvl4: 'Funnel', lvl5: 'Sweep', daily: 'DAILY', dailyTag: 'tighter ink · same worldwide',
    dailyDone: 'done', locked: 'play level 1 first', bestInk: 'best ink',
    ink: 'INK', inkHint: '3★ keep 35% ink · erase never refunds',
    drop: 'DROP', erase: 'ERASE', menu: 'MENU', retry: 'RETRY', next: 'NEXT',
    share: 'SHARE', winTitle: 'PICTURE → CUP!', inkLeft: 'ink left',
    score: 'SCORE', newBest: 'NEW BEST!', oneStroke: 'one clean stroke!',
    hintDraw: 'Draw a ramp — guide the ball into the cup', hintKbd: 'drag to draw · SPACE drop · R retry · E erase · M mute',
    hintDead: 'Ball stopped — erase and redraw', hintInk: 'Out of ink — erase to redraw',
    copied: 'Result copied — paste it anywhere!', copyFail: 'Could not copy — long-press the card',
    stats: 'Stats', sound: 'sound', dailyBudget: 'ink',
    ranksBronze: 'Bronze', ranksSilver: 'Silver', ranksGold: 'Gold', ranksPlatinum: 'Platinum',
    ranksDiamond: 'Diamond', ranksMaster: 'Master', ranksLegend: 'Legend',
    shareT: 'Neon Doodle «{n}» {s} ink left {p}% — draw line physics puzzle',
  },
  zh: {
    title: '霓虹涂鸦', tagline: '一笔墨水 · 接住坠落的光球',
    best: '最佳', rank: '段位', streak: '连胜', days: '天', wins: '通关',
    games: '次数', threeStars: '3★', lvl1: '斜坡', lvl2: '断崖', lvl3: '高墙',
    lvl4: '漏斗', lvl5: '长弯', daily: '每日关', dailyTag: '墨水紧缩 · 全球同题',
    dailyDone: '已通关', locked: '先通关第 1 关', bestInk: '最佳余墨',
    ink: '墨水', inkHint: '3★ 需剩 35% 墨水 · 擦除不返还',
    drop: '放球', erase: '擦除', menu: '菜单', retry: '重来', next: '下一关',
    share: '分享', winTitle: '一笔入杯！', inkLeft: '剩余墨水',
    score: '得分', newBest: '新纪录！', oneStroke: '一笔到位！',
    hintDraw: '画一条坡道，把光球引进杯里', hintKbd: '拖动画线 · 空格放球 · R 重来 · E 擦除 · M 静音',
    hintDead: '球停住了——擦掉重画吧', hintInk: '墨水用完了——擦除后可重画',
    copied: '成绩已复制，去粘贴吧！', copyFail: '复制失败，请长按成绩卡',
    stats: '统计', sound: '声音', dailyBudget: '墨水',
    ranksBronze: '青铜', ranksSilver: '白银', ranksGold: '黄金', ranksPlatinum: '白金',
    ranksDiamond: '钻石', ranksMaster: '大师', ranksLegend: '传奇',
    shareT: '霓虹涂鸦「{n}」{s} 剩余墨水 {p}% — 画线物理解谜',
  },
};
function T(k) { return window.npT ? npT(NP_L, k) : (NP_L.en[k] || k); }

/* ---------------- helpers ---------------- */
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function utcDate(d) { return (d || new Date()).toISOString().slice(0, 10); }
function prevDay(dateStr) {
  return new Date(new Date(dateStr + 'T00:00:00Z').getTime() - 86400000).toISOString().slice(0, 10);
}
function isoWeekKey(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThu = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const fday = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - fday + 3);
  const wk = 1 + Math.round((d - firstThu) / (7 * 24 * 3600 * 1000));
  return d.getUTCFullYear() + '-W' + String(wk).padStart(2, '0');
}

/* ---------------- level data (design doc, verbatim — do not edit coords) ---- */
const LEVELS = [
  { n: 1, name: 'lvl1', ball: [80, 60],  cup: [400, 640, 34], budget: 610,
    walls: [[[0, 690], [480, 690]]], refLine: [[[70, 180], [370, 610]]] },
  { n: 2, name: 'lvl2', ball: [85, 60],  cup: [420, 600, 34], budget: 600,
    walls: [[[0, 690], [180, 690]], [[300, 690], [480, 690]]], refLine: [[[60, 190], [410, 570]]] },
  { n: 3, name: 'lvl3', ball: [80, 60],  cup: [410, 640, 34], budget: 630,
    walls: [[[0, 690], [480, 690]], [[240, 690], [240, 470]]], refLine: [[[60, 200], [400, 620]]] },
  { n: 4, name: 'lvl4', ball: [240, 150], cup: [445, 635, 36], budget: 450,
    walls: [[[0, 690], [480, 690]], [[120, 300], [200, 380]]], refLine: [[[235, 280], [445, 600]]] },
  { n: 5, name: 'lvl5', ball: [60, 60],  cup: [430, 640, 32], budget: 630,
    walls: [[[0, 690], [480, 690]], [[260, 690], [260, 380]]],
    refLine: [[[40, 140], [200, 300]], [[200, 300], [380, 560]]] },
];

/* ---------------- storage (np_neon-doodle_* — design doc key list) ---------- */
const P = 'np_neon-doodle_';
function jget(k, d) {
  try { const v = localStorage.getItem(P + k); return v == null ? d : JSON.parse(v); }
  catch (e) { return d; }
}
function jset(k, v) { try { localStorage.setItem(P + k, JSON.stringify(v)); } catch (e) {} }
function storageKeys() {
  try { return Object.keys(localStorage).filter(k => k.indexOf(P) === 0).sort(); } catch (e) { return []; }
}

/* ---------------- daily (UTC date hash, budget ×0.9 tighter) ---------------- */
function dailyInfo(dateStr) {
  const date = dateStr || utcDate();
  const seed = (parseInt(date.replace(/-/g, ''), 10) >>> 0) || 1;
  const r = mulberry32(seed);
  const level = Math.floor(r() * LEVELS.length) % LEVELS.length;
  return { date, level, budget: Math.round(LEVELS[level].budget * 0.9), base: LEVELS[level].budget };
}

/* ---------------- rank (gallery stars + daily stars -> 7 ranks) ------------ */
const STAR_PTS = [0, 550, 700, 850];   // 5×850 + daily 850 = 5100 = Legend cap
const RANKS = [
  ['ranksLegend', 5100], ['ranksMaster', 4200], ['ranksDiamond', 3300],
  ['ranksPlatinum', 2400], ['ranksGold', 1500], ['ranksSilver', 800], ['ranksBronze', 0],
];
function rankInfo() {
  const lv = jget('levels', {});
  let pts = 0;
  for (let i = 1; i <= LEVELS.length; i++) pts += STAR_PTS[clamp(lv[String(i)] || 0, 0, 3)];
  const d = jget('daily', {});
  const dStars = Math.max(d.bestStars || 0, (d.done ? d.stars : 0) || 0);
  pts += STAR_PTS[clamp(dStars, 0, 3)];
  for (const [key, min] of RANKS) if (pts >= min) return { pts, name: T(key), key };
  return { pts: 0, name: T('ranksBronze'), key: 'ranksBronze' };
}

/* ---------------- streak (pure fn: cross-day +1 / break -> 1 / protect card) */
function computeStreak(s, date) {
  s = Object.assign({ count: 0, last: '', best: 0, protect: 1 }, s || {});
  const mon = date.slice(0, 7);
  if (s.month !== mon) { s.month = mon; if (s.protect < 1) s.protect = 1; } // monthly mulligan regrant
  if (s.last !== date) {
    if (s.last === prevDay(date)) s.count += 1;
    else if (s.last === prevDay(prevDay(date)) && s.protect > 0) { s.protect -= 1; s.count += 1; }
    else s.count = 1;
  }
  s.best = Math.max(s.best || 0, s.count);
  s.last = date;
  return s;
}

/* best remaining ink % per level, derived from top10 scores (no extra storage key):
 * score = round(ink) + 300 + (3 stars ? 200 : 0)  ->  ink = score - 300 - bonus */
function bestInkPct(levelIdx) {
  const top = jget('top10', []);
  let best = -1;
  for (const e of top)
    if ((e.level || 0) === levelIdx + 1) {
      const ink = (e.score || 0) - 300 - ((e.stars || 0) === 3 ? 200 : 0);
      const pct = clamp(ink / LEVELS[levelIdx].budget, 0, 1);
      if (pct > best) best = pct;
    }
  return best;
}

/* ---------------- game state ---------------- */
const G = {
  state: 'TITLE',            // TITLE | PLAY | RUN | WIN
  mode: 'level', li: 0,      // level index / daily flag
  ink: 0, inkMax: 0, drawnLen: 0,
  strokes: [], cur: null,    // strokes: [{pts:[{x,y}...]}]; cur: active stroke
  ball: { x: 0, y: 0, vx: 0, vy: 0, live: false, contact: false, captured: false },
  trail: [], parts: [], ripples: [],
  stillT: 0, runT: 0, acc: 0, t: 0,
  hintKey: '', hintT: 0, lastEvent: '', deadStops: 0,
  winT: 0, stars: 0, score: 0, inkPct: 1, newBest: false, starSnd: [false, false, false],
  focus: 0, shake: 0,
  best: null, levels: {}, stats: null, dailyS: null,
  rollSndT: 0, impSndT: 0,
};
function curLevel() {
  if (G.mode === 'daily') {
    const d = dailyInfo();
    return { ...LEVELS[d.level], budget: d.budget, daily: true };
  }
  return LEVELS[G.li] || LEVELS[0];
}
function computeStars(ink, inkMax) {
  if (inkMax <= 0) return 1;
  const pct = ink / inkMax;
  return pct >= INK_3STAR ? 3 : (ink > 0 ? 2 : 1);
}
function setHint(key, t) { G.hintKey = key; G.hintT = t || 2.5; }
function evt(name) { G.lastEvent = name; }

function loadStorage() {
  G.best = jget('best', null);
  G.levels = jget('levels', {});
  G.stats = jget('stats', { games: 0, wins: 0, threeStars: 0, inkTotal: 0 });
  G.dailyS = jget('daily', null);
  seedStorage();
}
/* design-doc key list is the contract: all 7 keys exist from first load */
function seedStorage() {
  const today = utcDate();
  if (jget('best', null) === null) jset('best', { score: 0, date: '' });
  if (jget('top10', null) === null) jset('top10', []);
  if (jget('daily', null) === null) jset('daily', { date: today, level: 0, done: false, stars: 0, bestStars: 0 });
  if (jget('streak', null) === null) jset('streak', { count: 0, last: '', best: 0, protect: 1, month: today.slice(0, 7) });
  if (jget('stats', null) === null) jset('stats', { games: 0, wins: 0, threeStars: 0, inkTotal: 0 });
  if (jget('weekly', null) === null) jset('weekly', { weekKey: isoWeekKey(today), best: { score: 0, date: '' } });
  if (jget('levels', null) === null) jset('levels', {});
}

/* ---------------- level lifecycle ---------------- */
function startLevel(idx, daily) {
  G.mode = daily ? 'daily' : 'level';
  if (daily) { const d = dailyInfo(); G.li = d.level; } else G.li = clamp(idx || 0, 0, LEVELS.length - 1);
  const lv = curLevel();
  G.inkMax = lv.budget; G.ink = lv.budget; G.drawnLen = 0;
  G.strokes = []; G.cur = null;
  resetBall();
  G.trail = []; G.parts = []; G.ripples = [];
  G.stillT = 0; G.runT = 0; G.acc = 0;
  G.state = 'PLAY'; G.winT = 0; G.starSnd = [false, false, false];
  setHint('hintDraw', 3.5); evt('start'); G.focus = 2;
}
function resetBall() {
  const lv = curLevel();
  G.ball = { x: lv.ball[0], y: lv.ball[1], vx: 0, vy: 0, live: false, contact: false, captured: false };
}
function resetToDraw(hintKey) {
  resetBall();
  G.trail = [];
  G.stillT = 0; G.runT = 0; G.acc = 0;
  G.state = 'PLAY';
  G.deadStops++;
  setHint(hintKey || 'hintDead', 3); evt('dead');
  Sound.sfx.dead();
}
function dropBall() {
  if (G.state !== 'PLAY') { Sound.sfx.bad(); return; }
  if (G.cur) endStroke();            // interrupted stroke lands as segments
  G.state = 'RUN'; G.ball.live = true;
  G.stillT = 0; G.runT = 0; G.acc = 0;
  G.stats.games = (G.stats.games || 0) + 1; jset('stats', G.stats);
  setHint('', 0); evt('drop');
  Sound.resume(); Sound.sfx.drop();
  inkSparks(G.ball.x, G.ball.y, 6, C.gold);
}
function eraseAll() {
  if (G.state !== 'PLAY') { Sound.sfx.bad(); return; }
  if (!G.strokes.length && !G.cur) { Sound.sfx.bad(); return; }
  // dissolve particles along removed lines (ink NOT refunded — design rule 3)
  for (const s of G.strokes) for (let i = 0; i < s.pts.length; i += 3)
    spawnPart(s.pts[i].x, s.pts[i].y, C.pink, 0.5);
  if (G.cur) for (const p of G.cur.pts) spawnPart(p.x, p.y, C.pink, 0.4);
  G.strokes = []; G.cur = null;
  evt('erase'); Sound.sfx.erase();
  if (G.ink <= 0) setHint('hintInk', 2.5);
}
function retryLevel() {
  if (G.state === 'TITLE') return;
  startLevel(G.li, G.mode === 'daily');
  Sound.sfx.click();
}
function toMenu() { G.state = 'TITLE'; G.cur = null; loadStorage(); evt('menu'); }

/* ---------------- pen input (logical coords, from main.js) ---------------- */
function penDown(x, y) {
  if (G.state !== 'PLAY') return;
  if (G.ink <= 0) { setHint('hintInk', 2); Sound.sfx.bad(); return; }
  G.cur = { pts: [{ x, y }] };
  Sound.resume(); Sound.sfx.scratch();
  spawnPart(x, y, C.pink, 0.4);
}
function penMove(x, y) {
  if (G.state !== 'PLAY' || !G.cur) return;
  const pts = G.cur.pts, last = pts[pts.length - 1];
  const dx = x - last.x, dy = y - last.y, d = Math.hypot(dx, dy);
  if (d < SAMPLE_MIN) return;                 // anti-jitter: no ink for micro-moves
  let seg = d;
  if (G.ink < d) {                            // truncate to remaining ink
    seg = G.ink;
    x = last.x + dx * (seg / d); y = last.y + dy * (seg / d);
  }
  pts.push({ x, y });
  G.ink -= seg; G.drawnLen += seg;
  if (Math.random() < 0.6) Sound.sfx.scratch();
  spawnPart(x, y, C.pink, 0.35);
  evt('draw');
  if (G.ink <= 0.0001) { G.ink = 0; endStroke(); setHint('hintInk', 2.5); }
}
function endStroke() {
  if (!G.cur) return;
  if (G.cur.pts.length >= 2) G.strokes.push(G.cur);
  G.cur = null;
}
function penUp() { endStroke(); }
function penCancel() { endStroke(); }          // interrupted line lands as segments

/* ---------------- physics ---------------- */
function eachSeg(fn) {
  const lv = curLevel();
  for (const w of lv.walls) fn(w[0][0], w[0][1], w[1][0], w[1][1], true);
  for (const s of G.strokes)
    for (let i = 1; i < s.pts.length; i++)
      fn(s.pts[i - 1].x, s.pts[i - 1].y, s.pts[i].x, s.pts[i].y, false);
}
function closestOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((px - ax) * dx + (py - ay) * dy) / L2 : 0;
  t = t < 0 ? 0 : (t > 1 ? 1 : t);
  return [ax + dx * t, ay + dy * t];
}
let physTick = 0;
function physStep() {
  const b = G.ball, lv = curLevel();
  b.vy += GRAV * DT;
  b.x += b.vx * DT; b.y += b.vy * DT;
  b.contact = false;
  eachSeg((ax, ay, bx, by) => {
    const cp = closestOnSeg(b.x, b.y, ax, ay, bx, by);
    const dx = b.x - cp[0], dy = b.y - cp[1];
    const d = Math.hypot(dx, dy);
    if (d < R && d > 1e-9) {
      const nx = dx / d, ny = dy / d;
      b.x = cp[0] + nx * R; b.y = cp[1] + ny * R;      // push out
      const vn = b.vx * nx + b.vy * ny;
      if (vn < -BOUNCE_MIN) {                          // impact: reflect + friction
        const vtx = b.vx - vn * nx, vty = b.vy - vn * ny;
        b.vx = vtx * (1 - FRICTION) - vn * REST * nx;
        b.vy = vty * (1 - FRICTION) - vn * REST * ny;
        impactFx(vn, b.x, b.y);
      } else if (vn < 0) {                             // resting contact: slide, no bounce
        b.vx -= vn * nx; b.vy -= vn * ny;
      }
      b.contact = true;
    }
  });
  // clamp inside canvas
  if (b.x < R) { b.x = R; if (b.vx < 0) b.vx = -b.vx * REST; }
  if (b.x > W - R) { b.x = W - R; if (b.vx > 0) b.vx = -b.vx * REST; }
  if (b.y < R) { b.y = R; if (b.vy < 0) b.vy = -b.vy * REST; }
  if (b.y > H - R) { b.y = H - R; if (b.vy > 0) b.vy = -b.vy * REST; }
  // trail
  if ((physTick = (physTick + 1) % 5) === 0) {
    G.trail.push({ x: b.x, y: b.y, a: 1 });
    if (G.trail.length > 140) G.trail.shift();
  }
  // capture: ball center inside cup capture circle -> win
  if (Math.hypot(b.x - lv.cup[0], b.y - lv.cup[1]) < lv.cup[2]) winLevel();
}
function impactFx(vn, x, y) {
  const now = G.t;
  if (now - G.impSndT < 0.06) return;
  G.impSndT = now;
  Sound.sfx.thock(vn);
  const n = Math.min(6, 2 + Math.floor(-vn / 250));
  for (let i = 0; i < n; i++) spawnPart(x, y, C.gold, 0.5);
  G.shake = Math.min(6, -vn / 300);
}

function winLevel() {
  const lv = curLevel();
  G.ball.captured = true; G.ball.live = false;
  G.stars = computeStars(G.ink, G.inkMax);
  G.inkPct = G.inkMax > 0 ? G.ink / G.inkMax : 0;
  G.score = Math.round(G.ink) + 300 + (G.stars === 3 ? 200 : 0);
  G.state = 'WIN'; G.winT = 0; G.starSnd = [false, false, false];
  evt('win');
  Sound.sfx.splash(); Sound.sfx.win();
  G.ripples.push({ x: lv.cup[0], y: lv.cup[1], r: 8, max: 70, a: 1 });
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    spawnPart(lv.cup[0] + Math.cos(a) * 20, lv.cup[1] + Math.sin(a) * 20,
      i % 2 ? C.cyan : C.gold, 0.9, Math.cos(a) * 90, Math.sin(a) * 90 - 60);
  }
  persistWin();
}
function persistWin() {
  const date = utcDate();
  const best = jget('best', { score: 0, date: '' });
  G.newBest = G.score > (best.score || 0);
  if (G.newBest) jset('best', { score: G.score, date });
  let top = jget('top10', []);
  top.push({ score: G.score, stars: G.stars, level: G.mode === 'daily' ? 0 : G.li + 1, date });
  top.sort((a, b) => b.score - a.score);
  jset('top10', top.slice(0, 10));
  const wk = jget('weekly', {});
  const key = isoWeekKey(date);
  if (!wk.weekKey || wk.weekKey !== key || !wk.best || G.score > wk.best.score)
    jset('weekly', { weekKey: key, best: { score: G.score, date } });
  if (G.mode === 'daily') {
    const prev = jget('daily', {});
    const bestStars = Math.max((prev.bestStars || 0), G.stars);
    jset('daily', { date, level: G.li + 1, done: true, stars: G.stars, bestStars });
    jset('streak', computeStreak(jget('streak', null), date));
  } else {
    const lvS = jget('levels', {});
    const k = String(G.li + 1);
    lvS[k] = Math.max(lvS[k] || 0, G.stars);
    jset('levels', lvS);
  }
  const st = jget('stats', { games: 0, wins: 0, threeStars: 0, inkTotal: 0 });
  st.wins = (st.wins || 0) + 1;
  st.threeStars = (st.threeStars || 0) + (G.stars === 3 ? 1 : 0);
  st.inkTotal = (st.inkTotal || 0) + Math.round(G.ink);
  jset('stats', st);
  loadStorage();
}

/* ---------------- particles / ripples ---------------- */
function spawnPart(x, y, col, life, vx, vy) {
  if (G.parts.length >= MAX_PARTICLES) G.parts.shift();
  G.parts.push({
    x, y, vx: vx || (Math.random() * 2 - 1) * 60, vy: vy || (Math.random() * 2 - 1) * 60 - 30,
    life: life || 0.5, max: life || 0.5, col, r: 1.5 + Math.random() * 2.5,
  });
}
function inkSparks(x, y, n, col) { for (let i = 0; i < n; i++) spawnPart(x, y, col, 0.6); }

/* ---------------- update ---------------- */
function update(dt) {
  G.t += dt;
  if (G.hintT > 0) G.hintT -= dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 20);
  // particles / ripples / trail fade
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.life -= dt;
    if (p.life <= 0) { G.parts.splice(i, 1); continue; }
    p.vy += 500 * dt; p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = G.ripples.length - 1; i >= 0; i--) {
    const r = G.ripples[i];
    r.r += (r.max - r.r) * dt * 5; r.a -= dt * 1.2;
    if (r.a <= 0) G.ripples.splice(i, 1);
  }
  for (const p of G.trail) p.a -= dt * 0.55;
  while (G.trail.length && G.trail[0].a <= 0) G.trail.shift();

  if (G.state === 'RUN') {
    G.acc += dt;
    let steps = 0;
    while (G.acc >= DT && steps < 40) { G.acc -= DT; physStep(); steps++; if (G.state !== 'RUN') break; }
    G.runT += dt;
    const b = G.ball, sp = Math.hypot(b.vx, b.vy);
    // rolling sound
    if (b.contact && sp > 60 && G.t - G.rollSndT > 0.09) { G.rollSndT = G.t; Sound.sfx.roll(sp); }
    // dead-stop: 3s under 5 px/s -> back to draw phase (never stuck)
    if (sp < STILL_SPEED) G.stillT += dt; else G.stillT = 0;
    if (G.stillT >= STILL_TIME || G.runT >= RUN_TIMEOUT) resetToDraw('hintDead');
  } else if (G.state === 'WIN') {
    G.winT += dt;
    // star pop sounds
    for (let i = 0; i < G.stars; i++)
      if (!G.starSnd[i] && G.winT > 0.45 + i * 0.3) { G.starSnd[i] = true; Sound.sfx.star(i); }
  }
}

/* deterministic sim for QA: same per-substep path as update() */
function simStep(sec) {
  window.__qaFreeze = true;
  const n = Math.max(1, Math.round(sec / DT));
  for (let i = 0; i < n; i++) {
    if (G.state === 'RUN') {
      physStep();
      G.runT += DT;
      const sp = Math.hypot(G.ball.vx, G.ball.vy);
      if (sp < STILL_SPEED) G.stillT += DT; else G.stillT = 0;
      if (G.stillT >= STILL_TIME || G.runT >= RUN_TIMEOUT) resetToDraw('hintDead');
    } else if (G.state === 'WIN') {
      G.winT += DT;
    } else {
      G.t += DT;
    }
  }
  return qaState();
}

/* ---------------- UI surfaces ---------------- */
function uiButtons() {
  if (G.state === 'TITLE') {
    const btns = [];
    const cw = 222, ch = 130, x0 = 14, y0 = 150, gx = 232, gy = 142;
    for (let i = 0; i < 5; i++)
      btns.push({ id: 'lvl' + (i + 1), x: x0 + (i % 2) * gx, y: y0 + Math.floor(i / 2) * gy, w: cw, h: ch, label: T(LEVELS[i].name) });
    btns.push({ id: 'daily', x: x0 + (5 % 2) * gx, y: y0 + Math.floor(5 / 2) * gy, w: cw, h: ch, label: T('daily') });
    btns.push({ id: 'sound', x: W - 62, y: 12, w: 50, h: 50, label: T('sound') });
    return btns;
  }
  if (G.state === 'WIN') {
    return [
      { id: 'next', x: 64, y: 452, w: 176, h: 54, label: T('next') },
      { id: 'share', x: 248, y: 452, w: 168, h: 54, label: T('share') },
      { id: 'menu', x: 64, y: 514, w: 176, h: 54, label: T('menu') },
      { id: 'retry', x: 248, y: 514, w: 168, h: 54, label: T('retry') },
    ];
  }
  // PLAY | RUN
  return [
    { id: 'menu', x: 14, y: 648, w: 92, h: 56, label: T('menu'), enabled: true },
    { id: 'erase', x: 114, y: 648, w: 112, h: 56, label: T('erase'), enabled: G.state === 'PLAY' },
    { id: 'drop', x: 234, y: 648, w: 232, h: 56, label: T('drop'), enabled: G.state === 'PLAY' },
  ];
}
function pressBtn(id) {
  Sound.resume();
  if (id === 'menu') { toMenu(); Sound.sfx.click(); return true; }
  if (id === 'erase') { eraseAll(); return true; }
  if (id === 'drop') { dropBall(); return true; }
  if (id === 'retry') { retryLevel(); return true; }
  if (id === 'next') {
    if (G.mode === 'daily') { toMenu(); Sound.sfx.click(); return true; }
    startLevel(Math.min(G.li + 1, LEVELS.length - 1), false);
    if (G.li === LEVELS.length - 1 && G.mode === 'level') { /* replay last */ }
    Sound.sfx.click(); return true;
  }
  if (id === 'share') { doShare(); return true; }
  if (id === 'sound') { Sound.setMuted(!Sound.isMuted()); return true; }
  if (id.lastIndexOf('lvl', 0) === 0) {
    const i = parseInt(id.slice(3), 10) - 1;
    startLevel(i, false); Sound.sfx.start(); return true;
  }
  if (id === 'daily') { startLevel(0, true); Sound.sfx.start(); return true; }
  return false;
}
function onPress(x, y) {
  const btns = uiButtons();
  for (const b of btns) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) {
      if (b.enabled === false) { Sound.sfx.bad(); return true; }
      return pressBtn(b.id);
    }
  }
  return false; // not on a button -> caller may start a pen stroke
}
function onKey(code) {
  Sound.resume();
  const btns = uiButtons();
  if (code === 'Tab' || code === 'ArrowRight' || code === 'ArrowDown') {
    G.focus = (G.focus + 1) % btns.length; return;
  }
  if (code === 'ArrowLeft' || code === 'ArrowUp') {
    G.focus = (G.focus + btns.length - 1) % btns.length; return;
  }
  if (code === 'Space') {
    if (G.state === 'PLAY') { dropBall(); return; }
    if (G.state === 'TITLE') { pressBtn(btns[clamp(G.focus, 0, btns.length - 1)].id); return; }
    if (G.state === 'RUN') return;
    if (G.state === 'WIN' && G.winT > 0.5) { pressBtn('next'); return; }
  }
  if (code === 'Enter') {
    const b = btns[clamp(G.focus, 0, btns.length - 1)];
    if (b) { if (b.enabled === false) Sound.sfx.bad(); else pressBtn(b.id); }
    return;
  }
  if (code === 'KeyR') { if (G.state !== 'TITLE') retryLevel(); return; }
  if (code === 'KeyE') { eraseAll(); return; }
  if (code === 'KeyM') { Sound.setMuted(!Sound.isMuted()); return; }
  if (code === 'Escape') { if (G.state !== 'TITLE') toMenu(); return; }
}

/* ---------------- share ---------------- */
function shareText() {
  const lv = curLevel();
  const name = T(lv.name);
  const stars = '★'.repeat(G.stars) + '☆'.repeat(3 - G.stars);
  return T('shareT').replace('{n}', name).replace('{s}', stars).replace('{p}', Math.round(G.inkPct * 100)) +
    ' | https://seyrs1985.github.io/neonplay/';
}
function buildShareCard() {
  const cv = document.createElement('canvas');
  cv.width = 480; cv.height = 640;
  const x = cv.getContext('2d');
  x.fillStyle = C.bg; x.fillRect(0, 0, 480, 640);
  // breathing grid
  x.strokeStyle = 'rgba(0,229,255,0.07)'; x.lineWidth = 1;
  for (let i = 1; i < 10; i++) { x.beginPath(); x.moveTo(i * 48, 0); x.lineTo(i * 48, 640); x.stroke(); }
  for (let i = 1; i < 13; i++) { x.beginPath(); x.moveTo(0, i * 48); x.lineTo(480, i * 48); x.stroke(); }
  x.textAlign = 'center';
  x.fillStyle = C.pink; x.font = '900 40px Arial, sans-serif';
  x.fillText(T('title'), 240, 66);
  x.fillStyle = C.white; x.font = '16px Arial, sans-serif';
  x.fillText(T('tagline'), 240, 96);
  // stars
  x.font = '64px Arial, sans-serif';
  x.fillStyle = C.gold;
  x.fillText('★'.repeat(G.stars) + '☆'.repeat(3 - G.stars), 240, 190);
  // info
  x.font = 'bold 24px Arial, sans-serif'; x.fillStyle = C.cyan;
  x.fillText(T(LEVELS[G.li].name), 240, 240);
  x.fillStyle = C.white; x.font = '20px Arial, sans-serif';
  x.fillText(T('inkLeft') + ' ' + Math.round(G.inkPct * 100) + '%', 240, 274);
  x.fillText(T('score') + ' ' + G.score, 240, 304);
  x.fillStyle = C.dim; x.font = '16px Arial, sans-serif';
  x.fillText(utcDate(), 240, 330);
  // trajectory thumbnail: play area scaled into 216x324
  const tx = 132, ty = 356, tw = 216, th = 324, sx = tw / W, sy = th / H;
  x.strokeStyle = 'rgba(232,236,255,0.25)'; x.strokeRect(tx, ty, tw, th);
  const lv = curLevel();
  x.strokeStyle = 'rgba(232,236,255,0.7)'; x.lineWidth = 2;
  for (const w of lv.walls) {
    x.beginPath(); x.moveTo(tx + w[0][0] * sx, ty + w[0][1] * sy); x.lineTo(tx + w[1][0] * sx, ty + w[1][1] * sy); x.stroke();
  }
  x.strokeStyle = C.pink; x.lineWidth = 2; x.lineCap = 'round';
  for (const s of G.strokes) {
    x.beginPath();
    s.pts.forEach((p, i) => i ? x.lineTo(tx + p.x * sx, ty + p.y * sy) : x.moveTo(tx + p.x * sx, ty + p.y * sy));
    x.stroke();
  }
  x.strokeStyle = 'rgba(255,213,74,0.6)';
  x.beginPath();
  G.trail.forEach((p, i) => i ? x.lineTo(tx + p.x * sx, ty + p.y * sy) : x.moveTo(tx + p.x * sx, ty + p.y * sy));
  x.stroke();
  x.strokeStyle = C.cyan; x.lineWidth = 2;
  x.beginPath(); x.arc(tx + lv.cup[0] * sx, ty + lv.cup[1] * sy, 10, 0, 7); x.stroke();
  x.fillStyle = C.gold;
  x.beginPath(); x.arc(tx + lv.ball[0] * sx, ty + lv.ball[1] * sy, 4, 0, 7); x.fill();
  // site link
  x.fillStyle = C.cyan; x.font = 'bold 18px Arial, sans-serif';
  x.fillText('seyrs1985.github.io/neonplay', 240, 726 - 60);
  return cv;
}
async function doShare() {
  const text = shareText();
  evt('share');
  try {
    if (navigator.share) { await navigator.share({ title: T('title'), text }); setHint('copied', 2); return; }
  } catch (e) { /* user cancelled or failed -> fall through to clipboard */ }
  try {
    await navigator.clipboard.writeText(text);
    setHint('copied', 2.5); Sound.sfx.click();
  } catch (e) { setHint('copyFail', 2.5); Sound.sfx.bad(); }
}

/* ---------------- render ---------------- */
function draw(ctx) {
  ctx.save();
  if (G.shake > 0.2) ctx.translate((Math.random() * 2 - 1) * G.shake, (Math.random() * 2 - 1) * G.shake);
  // deep-space bg + breathing grid
  ctx.fillStyle = C.bg; ctx.fillRect(-8, -8, W + 16, H + 16);
  const gp = 0.04 + 0.025 * Math.sin(G.t * 0.9);
  ctx.strokeStyle = 'rgba(0,229,255,' + gp.toFixed(3) + ')';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let i = 1; i < 10; i++) { ctx.moveTo(i * 48, 0); ctx.lineTo(i * 48, H); }
  for (let i = 1; i < 15; i++) { ctx.moveTo(0, i * 48); ctx.lineTo(W, i * 48); }
  ctx.stroke();

  if (G.state === 'TITLE') drawTitle(ctx);
  else drawPlay(ctx);
  drawParticles(ctx);
  drawHint(ctx);
  ctx.restore();
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

function drawTitle(ctx) {
  ctx.textAlign = 'center';
  // title with fake glow
  ctx.font = '900 44px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,45,149,0.35)'; ctx.fillText(T('title'), W / 2 + 2, 66);
  ctx.fillStyle = C.pink; ctx.fillText(T('title'), W / 2, 64);
  ctx.font = '15px Arial, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText(T('tagline'), W / 2, 96);
  // rank + best line
  const rk = rankInfo();
  const best = jget('best', { score: 0 });
  const streak = jget('streak', { count: 0, best: 0 });
  ctx.font = 'bold 16px Arial, sans-serif'; ctx.fillStyle = C.cyan;
  ctx.fillText(T('rank') + ': ' + rk.name + ' · ' + rk.pts + ' pts', W / 2, 124);
  ctx.fillStyle = C.dim; ctx.font = '13px Arial, sans-serif';
  ctx.fillText(T('best') + ' ' + (best.score || 0) + '  ·  ' + T('streak') + ' 🔥' + (streak.count || 0) + T('days'), W / 2, 144 - 8);

  // cards
  const btns = uiButtons();
  const lvS = jget('levels', {});
  const d = dailyInfo();
  const dailyDone = G.dailyS && G.dailyS.date === d.date && G.dailyS.done;
  btns.forEach((b, idx) => {
    const focused = idx === G.focus;
    if (b.id === 'sound') { drawSoundBtn(ctx, b, focused); return; }
    rr(ctx, b.x, b.y, b.w, b.h, 12);
    let border = C.violet, fillA = 0.5;
    if (b.id === 'daily') { border = C.gold; fillA = 0.35; }
    ctx.fillStyle = 'rgba(124,77,255,' + fillA * 0.25 + ')'; ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = border; ctx.stroke();
    if (focused) { ctx.lineWidth = 3; ctx.strokeStyle = C.white; ctx.stroke(); }
    ctx.textAlign = 'center';
    if (b.id === 'daily') {
      ctx.font = '900 24px Arial, sans-serif'; ctx.fillStyle = C.gold;
      ctx.fillText(T('daily'), b.x + b.w / 2, b.y + 36);
      ctx.font = '13px Arial, sans-serif'; ctx.fillStyle = C.dim;
      ctx.fillText(d.date.slice(5) + ' · ' + T(LEVELS[d.level].name), b.x + b.w / 2, b.y + 60);
      ctx.fillStyle = C.white; ctx.font = 'bold 14px Arial, sans-serif';
      ctx.fillText(T('dailyBudget') + ' ' + d.budget + ' (×0.9)', b.x + b.w / 2, b.y + 84);
      ctx.fillStyle = dailyDone ? C.green : C.dim; ctx.font = '13px Arial, sans-serif';
      ctx.fillText(dailyDone ? '✓ ' + T('dailyDone') : T('dailyTag'), b.x + b.w / 2, b.y + 108);
      return;
    }
    const i = parseInt(b.id.slice(3), 10) - 1;
    const stars = lvS[String(i + 1)] || 0;
    const bi = bestInkPct(i);
    ctx.font = '900 26px Arial, sans-serif'; ctx.fillStyle = C.cyan;
    ctx.fillText((i + 1) + ' · ' + T(LEVELS[i].name), b.x + b.w / 2, b.y + 38);
    ctx.font = '24px Arial, sans-serif';
    ctx.fillStyle = stars ? C.gold : 'rgba(232,236,255,0.25)';
    ctx.fillText('★'.repeat(stars) + '☆'.repeat(3 - stars), b.x + b.w / 2, b.y + 72);
    ctx.font = '13px Arial, sans-serif'; ctx.fillStyle = C.dim;
    ctx.fillText(T('best') + ' ' + T('bestInk') + ': ' + (bi >= 0 ? Math.round(bi * 100) + '%' : '—'), b.x + b.w / 2, b.y + 98);
    ctx.fillStyle = 'rgba(232,236,255,0.35)'; ctx.font = '12px Arial, sans-serif';
    ctx.fillText('ink ' + LEVELS[i].budget, b.x + b.w / 2, b.y + 116);
  });

  // footer stats + hint
  const st = jget('stats', { games: 0, wins: 0, threeStars: 0 });
  ctx.font = '13px Arial, sans-serif'; ctx.fillStyle = C.dim; ctx.textAlign = 'center';
  ctx.fillText(T('wins') + ' ' + (st.wins || 0) + '/' + (st.games || 0) + '  ·  ' + T('threeStars') + ' ×' + (st.threeStars || 0), W / 2, 596);
  ctx.fillStyle = 'rgba(232,236,255,0.45)'; ctx.font = '12px Arial, sans-serif';
  ctx.fillText(T('hintKbd'), W / 2, 648);
}
function drawSoundBtn(ctx, b, focused) {
  rr(ctx, b.x, b.y, b.w, b.h, 10);
  ctx.fillStyle = 'rgba(16,18,40,0.8)'; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = focused ? C.white : C.cyan; ctx.stroke();
  const mx = b.x + b.w / 2, my = b.y + b.h / 2;
  ctx.strokeStyle = Sound.isMuted() ? C.red : C.cyan; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(mx - 10, my - 4); ctx.lineTo(mx - 4, my - 4); ctx.lineTo(mx + 3, my - 11);
  ctx.lineTo(mx + 3, my + 11); ctx.lineTo(mx - 4, my + 4); ctx.lineTo(mx - 10, my + 4);
  ctx.closePath(); ctx.stroke();
  if (!Sound.isMuted()) {
    ctx.beginPath(); ctx.arc(mx + 6, my, 7, -0.9, 0.9); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.moveTo(mx + 7, my - 7); ctx.lineTo(mx + 15, my + 7); ctx.stroke();
  }
}

function drawPlay(ctx) {
  const lv = curLevel();
  // walls (white 70%)
  ctx.lineCap = 'round'; ctx.lineWidth = 5;
  ctx.strokeStyle = 'rgba(232,236,255,0.28)'; ctx.lineWidth = 11;
  for (const w of lv.walls) {
    ctx.beginPath(); ctx.moveTo(w[0][0], w[0][1]); ctx.lineTo(w[1][0], w[1][1]); ctx.stroke();
  }
  ctx.strokeStyle = 'rgba(232,236,255,0.7)'; ctx.lineWidth = 4;
  for (const w of lv.walls) {
    ctx.beginPath(); ctx.moveTo(w[0][0], w[0][1]); ctx.lineTo(w[1][0], w[1][1]); ctx.stroke();
  }

  // cup: rotating outer arc + breathing dashed capture circle
  const cx = lv.cup[0], cy = lv.cup[1], cr = lv.cup[2];
  const rot = G.t * 1.6;
  ctx.strokeStyle = 'rgba(0,229,255,0.25)'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.arc(cx, cy, 26, rot, rot + Math.PI * 1.4); ctx.stroke();
  ctx.strokeStyle = C.cyan; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(cx, cy, 26, rot, rot + Math.PI * 1.4); ctx.stroke();
  ctx.beginPath(); ctx.arc(cx, cy, 26, rot + Math.PI, rot + Math.PI * 1.9); ctx.stroke();
  const br = 0.25 + 0.15 * Math.sin(G.t * 2.2);
  ctx.strokeStyle = 'rgba(0,229,255,' + br.toFixed(3) + ')';
  ctx.setLineDash([6, 7]); ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, cr, 0, Math.PI * 2); ctx.stroke();
  ctx.setLineDash([]);

  // ripples
  for (const r of G.ripples) {
    ctx.strokeStyle = 'rgba(0,229,255,' + Math.max(0, r.a).toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2); ctx.stroke();
  }

  // ink strokes (fake glow: wide translucent underlay + core)
  const drawStroke = (pts, live) => {
    if (pts.length < 2) return;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.strokeStyle = live ? 'rgba(255,45,149,0.35)' : 'rgba(255,45,149,0.28)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
    ctx.strokeStyle = live ? '#ff5fa8' : C.pink;
    ctx.lineWidth = 6;
    ctx.beginPath();
    pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
    ctx.stroke();
  };
  for (const s of G.strokes) drawStroke(s.pts, false);
  if (G.cur) {
    drawStroke(G.cur.pts, true);
    const p = G.cur.pts[G.cur.pts.length - 1];
    ctx.fillStyle = '#ff8cc0';
    ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill();
  }

  // ball trail (glowing fading polyline)
  if (G.trail.length > 1) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (let i = 1; i < G.trail.length; i++) {
      const a = G.trail[i].a;
      if (a <= 0) continue;
      ctx.strokeStyle = 'rgba(255,213,74,' + (a * 0.5).toFixed(3) + ')';
      ctx.lineWidth = 2 + 5 * a;
      ctx.beginPath();
      ctx.moveTo(G.trail[i - 1].x, G.trail[i - 1].y);
      ctx.lineTo(G.trail[i].x, G.trail[i].y);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ball
  const b = G.ball;
  let bx = b.x, by = b.y, bbr = R;
  if (G.state === 'WIN') {          // sink into cup
    const k = clamp(G.winT / 0.5, 0, 1);
    bx = b.x + (lv.cup[0] - b.x) * k; by = b.y + (lv.cup[1] - b.y) * k; bbr = R * (1 - 0.4 * k);
  }
  const pulse = G.state === 'PLAY' ? 1 + 0.18 * Math.sin(G.t * 4) : 1;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const gr = ctx.createRadialGradient(bx, by, 1, bx, by, 26 * pulse);
  gr.addColorStop(0, 'rgba(255,213,74,0.55)');
  gr.addColorStop(1, 'rgba(255,213,74,0)');
  ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(bx, by, 26 * pulse, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  ctx.fillStyle = C.gold;
  ctx.beginPath(); ctx.arc(bx, by, bbr, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath(); ctx.arc(bx - 3, by - 4, 3, 0, Math.PI * 2); ctx.fill();
  if (G.state === 'PLAY') {         // spawn halo ring
    ctx.strokeStyle = 'rgba(255,213,74,' + (0.35 + 0.2 * Math.sin(G.t * 4)).toFixed(3) + ')';
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(bx, by, 20 * pulse, 0, Math.PI * 2); ctx.stroke();
  }

  drawHUD(ctx);

  if (G.state === 'WIN') drawWinPanel(ctx);
  else drawButtons(ctx);
}

function drawHUD(ctx) {
  // ink capsule
  const pct = G.inkMax > 0 ? clamp(G.ink / G.inkMax, 0, 1) : 0;
  const low = pct < INK_3STAR;
  rr(ctx, 14, 14, 250, 20, 10);
  ctx.fillStyle = 'rgba(16,18,40,0.8)'; ctx.fill();
  ctx.strokeStyle = 'rgba(232,236,255,0.3)'; ctx.lineWidth = 1.5; ctx.stroke();
  if (pct > 0.01) {
    const flash = low ? 0.65 + 0.35 * Math.sin(G.t * 8) : 1;
    rr(ctx, 16, 16, 246 * pct, 16, 8);
    ctx.fillStyle = low ? 'rgba(255,84,112,' + flash.toFixed(2) + ')' : C.pink;
    ctx.fill();
  }
  ctx.textAlign = 'left'; ctx.font = 'bold 13px Arial, sans-serif';
  ctx.fillStyle = C.white;
  ctx.fillText(T('ink') + ' ' + Math.round(G.ink) + '/' + G.inkMax, 22, 28.5);
  // level name + daily tag
  ctx.textAlign = 'right'; ctx.font = 'bold 15px Arial, sans-serif'; ctx.fillStyle = C.cyan;
  ctx.fillText((G.mode === 'daily' ? T('daily') + ' · ' : '') + T(LEVELS[G.li].name) +
    (G.mode === 'daily' ? ' (' + dailyInfo().date.slice(5) + ')' : ''), W - 14, 28);
  ctx.font = '11px Arial, sans-serif'; ctx.fillStyle = 'rgba(232,236,255,0.4)';
  ctx.textAlign = 'left';
  ctx.fillText(T('inkHint'), 14, 48);
}

function drawButtons(ctx) {
  const btns = uiButtons();
  btns.forEach((b, idx) => {
    const focused = idx === G.focus;
    rr(ctx, b.x, b.y, b.w, b.h, 12);
    if (b.id === 'drop' && b.enabled !== false) {
      ctx.fillStyle = 'rgba(0,229,255,0.9)'; ctx.fill();
      ctx.fillStyle = '#062028'; ctx.font = '900 22px Arial, sans-serif';
    } else {
      ctx.fillStyle = b.enabled === false ? 'rgba(16,18,40,0.5)' : 'rgba(16,18,40,0.86)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = b.enabled === false ? 'rgba(232,236,255,0.2)' : (b.id === 'erase' ? C.pink : C.cyan);
      ctx.stroke();
      if (focused) { ctx.lineWidth = 3; ctx.strokeStyle = C.white; ctx.stroke(); }
      ctx.fillStyle = b.enabled === false ? 'rgba(232,236,255,0.3)' : C.white;
      ctx.font = 'bold 18px Arial, sans-serif';
    }
    ctx.textAlign = 'center';
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2 + 6);
  });
}

function drawWinPanel(ctx) {
  const a = clamp(G.winT / 0.35, 0, 1);
  ctx.fillStyle = 'rgba(5,6,16,' + (0.45 * a).toFixed(2) + ')';
  ctx.fillRect(0, 0, W, H);
  rr(ctx, 40, 150, 400, 430, 16);
  ctx.fillStyle = C.panel; ctx.globalAlpha = a; ctx.fill();
  ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(0,229,255,0.6)'; ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.textAlign = 'center';
  ctx.font = '900 28px Arial, sans-serif'; ctx.fillStyle = C.pink;
  ctx.globalAlpha = a;
  ctx.fillText(T('winTitle'), W / 2, 214);
  // stars pop in sequence
  for (let i = 0; i < 3; i++) {
    const on = i < G.stars;
    const t = clamp((G.winT - 0.35 - i * 0.3) / 0.25, 0, 1);
    if (t <= 0) continue;
    const s = on ? 1 + 0.4 * (1 - t) * Math.sin(t * Math.PI) : 0.85;
    ctx.font = Math.round(52 * s) + 'px Arial, sans-serif';
    ctx.fillStyle = on ? C.gold : 'rgba(232,236,255,0.22)';
    ctx.fillText(on ? '★' : '☆', W / 2 + (i - 1) * 74, 300);
  }
  ctx.font = 'bold 20px Arial, sans-serif'; ctx.fillStyle = C.white;
  ctx.fillText(T('inkLeft') + ' ' + Math.round(G.inkPct * 100) + '%', W / 2, 356);
  if (G.stars === 3) { ctx.fillStyle = C.green; ctx.font = 'bold 16px Arial, sans-serif'; ctx.fillText(T('oneStroke'), W / 2, 382); }
  ctx.fillStyle = C.cyan; ctx.font = 'bold 26px Arial, sans-serif';
  ctx.fillText(T('score') + ' ' + G.score, W / 2, 424);
  if (G.newBest) {
    ctx.fillStyle = C.gold; ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillText(T('newBest'), W / 2, 450 - 4);
  }
  ctx.globalAlpha = 1;
  drawButtons(ctx);
}

function drawParticles(ctx) {
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for (const p of G.parts) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.col;
    ctx.globalAlpha = a * 0.85;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.5 + a * 0.5), 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore(); ctx.globalAlpha = 1;
}

function drawHint(ctx) {
  if (G.hintT <= 0 || !G.hintKey) return;
  const a = clamp(G.hintT, 0, 1);
  const msg = T(G.hintKey);
  ctx.font = 'bold 17px Arial, sans-serif'; ctx.textAlign = 'center';
  const w = ctx.measureText(msg).width + 36;
  ctx.globalAlpha = a;
  rr(ctx, W / 2 - w / 2, 586, w, 38, 10);
  ctx.fillStyle = 'rgba(16,18,40,0.9)'; ctx.fill();
  ctx.strokeStyle = 'rgba(255,213,74,0.6)'; ctx.lineWidth = 1.5; ctx.stroke();
  ctx.fillStyle = C.gold; ctx.fillText(msg, W / 2, 610);
  ctx.globalAlpha = 1;
}

/* ---------------- QA hooks (GAME_STANDARD) ---------------- */
function qaState() {
  return {
    state: G.state, mode: G.mode, level: (G.mode === 'daily' ? dailyInfo().level : G.li) + 1,
    levelName: LEVELS[G.li].name,
    ink: Math.round(G.ink * 1000) / 1000, inkMax: G.inkMax,
    inkPct: G.inkMax ? Math.round((G.ink / G.inkMax) * 1000) / 1000 : 0,
    drawnLen: Math.round(G.drawnLen * 1000) / 1000,
    strokes: G.strokes.length, drawing: !!G.cur,
    ball: {
      x: Math.round(G.ball.x * 10) / 10, y: Math.round(G.ball.y * 10) / 10,
      vx: Math.round(G.ball.vx), vy: Math.round(G.ball.vy),
      live: G.ball.live, captured: G.ball.captured,
      speed: Math.round(Math.hypot(G.ball.vx, G.ball.vy) * 10) / 10,
    },
    stars: G.stars, score: G.score, winT: Math.round(G.winT * 100) / 100,
    hint: G.hintKey, deadStops: G.deadStops, lastEvent: G.lastEvent,
    games: G.stats.games, wins: G.stats.wins,
    storage: storageKeys(),
    physics: { W, H, GRAV, R, DT, REST, FRICTION },
  };
}
window.__qaState = qaState;

window.__qa = {
  start(idx, daily) { startLevel(idx, daily === true); return qaState(); },
  pen(x, y, phase) {
    if (phase === 'down') penDown(x, y);
    else if (phase === 'move') penMove(x, y);
    else if (phase === 'cancel') penCancel();
    else penUp();
    return qaState();
  },
  penLine(pts) { // direct deterministic draw (no DOM events)
    penDown(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) penMove(pts[i][0], pts[i][1]);
    penUp();
    return qaState();
  },
  solveLevel(k, daily) { // replay refLine as SYNTHETIC PointerEvents (LESSONS #9 red line)
    const lv = LEVELS[clamp(k, 0, LEVELS.length - 1)];
    startLevel(k, daily === true);
    const evts = [];
    for (const seg of lv.refLine) {
      const [ax, ay] = seg[0], [bx, by] = seg[1];
      const d = Math.hypot(bx - ax, by - ay);
      const n = Math.max(2, Math.ceil(d / 18));
      const pts = [];
      for (let i = 0; i <= n; i++) pts.push([ax + (bx - ax) * i / n, ay + (by - ay) * i / n]);
      evts.push(pts);
    }
    if (typeof window.__qaToClient !== 'function') {   // fallback: direct pen
      for (const pts of evts) this.penLine(pts);
      return qaState();
    }
    const canvas = document.getElementById('c');
    const fire = (type, x, y) => canvas.dispatchEvent(new PointerEvent(type, {
      clientX: x, clientY: y, pointerId: 42, pointerType: 'pen', bubbles: true, cancelable: true,
    }));
    for (let s = 0; s < evts.length; s++) {
      const pts = evts[s];
      const c0 = window.__qaToClient(pts[0][0], pts[0][1]);
      fire('pointerdown', c0.x, c0.y);
      for (let i = 1; i < pts.length; i++) {
        const c = window.__qaToClient(pts[i][0], pts[i][1]);
        fire('pointermove', c.x, c.y);
      }
      const cl = window.__qaToClient(pts[pts.length - 1][0], pts[pts.length - 1][1]);
      fire('pointerup', cl.x, cl.y);
    }
    return qaState();
  },
  drop() { dropBall(); return qaState(); },
  erase() { eraseAll(); return qaState(); },
  retry() { retryLevel(); return qaState(); },
  menu() { toMenu(); return qaState(); },
  sim(sec) { return simStep(sec); },
  computeStars(ink, inkMax) { return computeStars(ink, inkMax); },
  dailyInfo: () => dailyInfo(),
  streakSim(dates) { let s = null; const out = []; for (const d of dates) { s = computeStreak(s, d); out.push(s.count); } return { counts: out, final: s }; },
  buildShareCard: () => buildShareCard(),
  shareText: () => shareText(),
  storageKeys: () => storageKeys(),
};

/* ---------------- in-page deterministic self-check (?autotest=1) ------------ */
(function () {
  if (!new URLSearchParams(location.search).get('autotest')) return;
  const R_ = {};
  const chk = (name, ok) => { R_[name] = !!ok; };
  setTimeout(() => {
    try {
      // 1. physics constants exactly as design doc
      const P = window.__PHYS;
      chk('physConsts', P.W === 480 && P.H === 720 && P.GRAV === 1500 && P.R === 12 &&
        Math.abs(P.DT - 1 / 240) < 1e-9 && P.REST === 0.35 && P.FRICTION === 0.02 && P.SAMPLE_MIN === 4);
      // 2. all 5 levels solvable via reference line (deterministic pen + sim)
      let allWin = true, starLog = [];
      for (let k = 0; k < 5; k++) {
        window.__qa.start(k);
        const lv = LEVELS[k];
        for (const seg of lv.refLine) window.__qa.penLine(seg);
        window.__qa.drop();
        const s = window.__qa.sim(6);
        if (s.state !== 'WIN' || s.stars < 1) allWin = false;
        starLog.push(s.stars);
      }
      chk('solve5', allWin);
      chk('starsL1is2', starLog[0] === 2);       // refLine uses ~86% budget -> 2★
      // 3. no free win: drop with no line never wins
      window.__qa.start(0);
      const winsBefore = window.__qaState().wins;
      window.__qa.drop();
      const nf = window.__qa.sim(9);
      chk('noFreeWin', nf.state !== 'WIN' && nf.state === 'PLAY' && nf.wins === winsBefore);
      chk('deadStopHint', nf.hint === 'hintDead' && nf.deadStops >= 1);
      // 4. ink accounting: deduction == drawn length (+-5%)
      window.__qa.start(1);
      const s0 = window.__qaState();
      window.__qa.penLine([[60, 120], [200, 120], [200, 300], [400, 300]]);
      const s1 = window.__qaState();
      const used = s0.ink - s1.ink;
      chk('inkAccounting', Math.abs(used - s1.drawnLen) <= Math.max(0.5, s1.drawnLen * 0.05));
      // 5. erase clears strokes, does NOT refund ink
      window.__qa.erase();
      const s2 = window.__qaState();
      chk('eraseNoRefund', s2.strokes === 0 && Math.abs(s2.ink - s1.ink) < 0.001);
      // 6. star thresholds
      const cs = window.__qa.computeStars;
      chk('starThresholds', cs(0.5 * 600, 600) === 3 && cs(0.35 * 600, 600) === 3 &&
        cs(0.34 * 600, 600) === 2 && cs(1, 600) === 2 && cs(0, 600) === 1);
      // 7. pointercancel safety: interrupted stroke lands, nothing dangles
      window.__qa.start(2);
      window.__qa.pen(60, 200, 'down');
      window.__qa.pen(200, 300, 'move');
      window.__qa.pen(0, 0, 'cancel');
      const s3 = window.__qaState();
      chk('pointercancelSafe', !s3.drawing && s3.strokes >= 1);
      // 8. daily determinism + tighter budget
      const d1 = window.__qa.dailyInfo(), d2 = window.__qa.dailyInfo();
      chk('dailyDeterministic', JSON.stringify(d1) === JSON.stringify(d2) &&
        d1.budget === Math.round(LEVELS[d1.level].budget * 0.9) && d1.level >= 0 && d1.level < 5);
      chk('dailySolvable', LEVELS[d1.level].refLine.reduce((a, s) => a + Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1]), 0) < d1.budget);
      // 9. streak math: +1 cross-day, break resets, protect card consumed
      const st = window.__qa.streakSim(['2026-09-10', '2026-09-11', '2026-09-12', '2026-09-14', '2026-09-17']);
      chk('streakMath', JSON.stringify(st.counts) === JSON.stringify([1, 2, 3, 4, 1]) && st.final.protect === 0);
      // 10. persistence keys after the wins above (design key list)
      const keys = window.__qa.storageKeys();
      const want = ['np_neon-doodle_best', 'np_neon-doodle_daily', 'np_neon-doodle_levels',
        'np_neon-doodle_stats', 'np_neon-doodle_streak', 'np_neon-doodle_top10', 'np_neon-doodle_weekly'];
      chk('storageKeys', want.every(k => keys.indexOf(k) >= 0));
      // 11. share card non-blank + site link
      const cv = window.__qa.buildShareCard();
      const x2 = cv.getContext('2d');
      const cols = new Set();
      for (let i = 0; i < 200; i++) {
        const px = x2.getImageData((i * 37) % cv.width, (i * 91) % cv.height, 1, 1).data;
        cols.add(px[0] + ',' + px[1] + ',' + px[2]);
      }
      chk('shareCard', cols.size >= 5 && /seyrs1985\.github\.io\/neonplay/.test(window.__qa.shareText()));
    } catch (e) {
      R_.exception = String(e && e.message || e);
    }
    R_.allPass = Object.keys(R_).every(k => k === 'allPass' || R_[k] === true);
    window.__autotest = R_;
  }, 300);
})();
