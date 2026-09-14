/* Neon Hoops — game core: state machine / wind physics / hoop / juice / render */
'use strict';

/* ---------------- constants ---------------- */
const W = 720, H = 1280;
const GRAV = 1500;            // px/s² downward
const WIND_K = 42;            // px/s² per wind unit (w ∈ [-3,3] → ax up to ±126)
const BALL_R = 26;
const RIM_HALF = 64;          // rim tips at hoop.x ± RIM_HALF
const RIM_TIP_R = 9;          // collision circles on the tips
const BOARD_W = 14;           // backboard thickness
const BOARD_OFF = RIM_HALF + 20; // backboard x offset from hoop center
const BOARD_TOP = -124, BOARD_BOT = 30; // backboard y extents relative to rim
const MINV = 420, MAXV = 1750;
const DRAG_K = 3.6;           // drag length (px) → launch speed
const RUN_TIME = 60;          // seconds
const PREVIEW_N = 8;          // trajectory preview dots
const COMBO_CAP = 5;          // extra combo points cap
const MAX_PARTICLES = 260;

/* physics exposed for QA scripts (authoritative, single source) */
window.__PHYS = { W, H, GRAV, WIND_K, BALL_R, RIM_HALF, RIM_TIP_R, MINV, MAXV, RUN_TIME, COMBO_CAP };

const C = {
  bg: '#0a0a18', cyan: '#00e5ff', violet: '#7c4dff', pink: '#ff2d95',
  green: '#39ff88', red: '#ff5470', gold: '#ffd54a', ball: '#ff9e40',
  ink: '#e8ecff', dim: 'rgba(232,236,255,0.55)', panel: 'rgba(16,18,40,0.86)',
};

/* ---------------- i18n ---------------- */
var NP_L = {
  en: {
    title: 'NEON HOOPS', tagline: '60-second flick basketball · read the wind',
    classic: 'CLASSIC 60s', daily: 'DAILY CHALLENGE', dailyTag: "today's wind is the same for everyone",
    hintDrag: 'Drag back anywhere & release to shoot', hintKbd: '←→ angle · ↑↓ power · Space shoot · R restart',
    best: 'BEST', streak: 'STREAK', days: 'd', score: 'SCORE', time: 'TIME', wind: 'WIND', calm: 'CALM',
    combo: 'COMBO', swish: 'SWISH!', paused: 'PAUSED', resume: 'RESUME', menu: 'MENU',
    retry: 'RETRY', share: 'SHARE', over: 'TIME UP!', newBest: 'NEW BEST!',
    makes: 'MAKES', attempts: 'SHOTS', maxCombo: 'BEST RUN', swishes: 'SWISHES', rank: 'RANK',
    nextRank: 'next rank', at: 'at', pts: 'pts', angle: 'ANGLE', power: 'POWER',
    copied: 'Result copied — paste it anywhere!', copyFail: 'Could not copy — long-press the card',
    dailyDone: 'Daily score saved', comeBack: 'come back tomorrow for a new wind',
    ranksBronze: 'Bronze', ranksSilver: 'Silver', ranksGold: 'Gold', ranksPlatinum: 'Platinum',
    ranksDiamond: 'Diamond', ranksMaster: 'Master', ranksLegend: 'Legend',
  },
  zh: {
    title: '霓虹灌篮', tagline: '60 秒指尖投篮 · 会读风才会赢',
    classic: '经典 60 秒', daily: '每日挑战', dailyTag: '今天全球同一套风',
    hintDrag: '任意位置向后拖拽，松手出手', hintKbd: '←→ 角度 · ↑↓ 力度 · 空格出手 · R 重开',
    best: '最佳', streak: '连胜', days: '天', score: '得分', time: '时间', wind: '风力', calm: '无风',
    combo: '连中', swish: '空心！', paused: '已暂停', resume: '继续', menu: '回主页',
    retry: '再来一局', share: '分享', over: '时间到！', newBest: '新纪录！',
    makes: '命中', attempts: '出手', maxCombo: '最高连中', swishes: '空心数', rank: '段位',
    nextRank: '距下一段位', at: '需', pts: '分', angle: '角度', power: '力度',
    copied: '成绩已复制，去粘贴吧！', copyFail: '复制失败，请长按成绩卡',
    dailyDone: '每日成绩已保存', comeBack: '明天来打新的一套风',
    ranksBronze: '青铜', ranksSilver: '白银', ranksGold: '黄金', ranksPlatinum: '白金',
    ranksDiamond: '钻石', ranksMaster: '大师', ranksLegend: '传奇',
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

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function rnd(a, b) { return a + Math.random() * (b - a); }
function round1(v) { return Math.round(v * 10) / 10; }

/* ---------------- seeded daily (mulberry32 on UTC date) ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function utcDate(d) { return (d || new Date()).toISOString().slice(0, 10); }
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
const SEQ_LEN = 240;
function buildDailySeq(dateStr) {
  const seed = (parseInt(dateStr.replace(/-/g, ''), 10) >>> 0) || 1;
  const r = mulberry32(seed);
  const winds = [], hoops = [];
  for (let i = 0; i < SEQ_LEN; i++) {
    winds.push(round1((r() * 2 - 1) * 3));
    const t = Math.min(1, i / 12); // progressive placement, capped
    hoops.push({
      x: clamp(W * (0.56 + 0.10 * t) + (r() * 2 - 1) * 70, W * 0.54, W - BOARD_OFF - BOARD_W - 30),
      y: clamp(H * (0.30 + 0.10 * t) + (r() * 2 - 1) * 60, H * 0.22, H * 0.52),
    });
  }
  return { date: dateStr, winds, hoops };
}

/* ---------------- ranks ---------------- */
const RANKS = [
  { key: 'legend', min: 150, emoji: '🏆' },
  { key: 'master', min: 105, emoji: '🥇' },
  { key: 'diamond', min: 75, emoji: '💎' },
  { key: 'platinum', min: 50, emoji: '🥈' },
  { key: 'gold', min: 30, emoji: '🟡' },
  { key: 'silver', min: 15, emoji: '⚪' },
  { key: 'bronze', min: 0, emoji: '🟤' },
];
function rankFor(score) {
  for (let i = 0; i < RANKS.length; i++) if (score >= RANKS[i].min) {
    const next = i > 0 ? RANKS[i - 1] : null;
    return { key: RANKS[i].key, emoji: RANKS[i].emoji, name: T('ranks' + RANKS[i].key[0].toUpperCase() + RANKS[i].key.slice(1)), min: RANKS[i].min, nextKey: next ? next.key : null, nextMin: next ? next.min : null, need: next ? next.min - score : 0 };
  }
  const last = RANKS[RANKS.length - 1];
  return { key: last.key, emoji: last.emoji, name: T('ranks' + last.key[0].toUpperCase() + last.key.slice(1)), min: 0, nextKey: RANKS[RANKS.length - 2].key, nextMin: 15, need: 15 - score };
}

/* ---------------- storage (design key table — no unlisted keys) ---------------- */
const K_BEST = 'np_neon-hoops_best', K_TOP10 = 'np_neon-hoops_top10', K_DAILY = 'np_neon-hoops_daily',
      K_STREAK = 'np_neon-hoops_streak', K_STATS = 'np_neon-hoops_stats', K_WEEKLY = 'np_neon-hoops_weekly';
function lsGet(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

const SAVE = {
  best: { score: 0, date: '' }, top10: [], daily: { date: '', score: 0, done: false },
  streak: { count: 0, last: '', best: 0, protect: 1, pmonth: '' },
  stats: { games: 0, attempts: 0, makes: 0, swishes: 0 },
  weekly: { weekKey: '', best: { score: 0 } },
};
function loadStorage() {
  const b = lsGet(K_BEST, null); if (b && typeof b.score === 'number') SAVE.best = b;
  const t = lsGet(K_TOP10, null); if (Array.isArray(t)) SAVE.top10 = t;
  const d = lsGet(K_DAILY, null); if (d && typeof d === 'object') SAVE.daily = d;
  const s = lsGet(K_STREAK, null); if (s && typeof s === 'object') SAVE.streak = s;
  const st = lsGet(K_STATS, null); if (st && typeof st === 'object') SAVE.stats = st;
  const wk = lsGet(K_WEEKLY, null); if (wk && typeof wk === 'object') SAVE.weekly = wk;
}
function refillProtect(streak, today) {
  const m = today.slice(0, 7);
  if (streak.pmonth !== m) { streak.pmonth = m; streak.protect = 1; }
  return streak;
}
function dayShift(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
// completing the daily challenge marks the day: +1 streak (mulligan card covers a 1-day gap)
function markDailyDone(today, score) {
  const st = refillProtect(Object.assign({}, SAVE.streak), today);
  if (st.last === today) { st.best = Math.max(st.best, st.count); SAVE.streak = st; lsSet(K_STREAK, st); return st; }
  const yest = dayShift(today, -1);
  if (st.last === yest) st.count += 1;
  else if (st.last === dayShift(today, -2) && st.protect > 0) { st.protect -= 1; st.count += 1; } // monthly mulligan
  else st.count = 1;
  st.last = today;
  st.best = Math.max(st.best, st.count);
  SAVE.streak = st; lsSet(K_STREAK, st);
  return st;
}
function persistRun(score, makes, swishes, mode, dailyDate) {
  const today = utcDate();
  if (score > SAVE.best.score) SAVE.best = { score, date: today };
  lsSet(K_BEST, SAVE.best); // key always present after a settled run
  SAVE.top10.push({ score, makes, swishes, date: today, dailyDate: mode === 'daily' ? dailyDate : undefined });
  SAVE.top10.sort((a, b) => b.score - a.score);
  SAVE.top10 = SAVE.top10.slice(0, 10);
  lsSet(K_TOP10, SAVE.top10);
  const wk = isoWeekKey(today);
  if (SAVE.weekly.weekKey !== wk) SAVE.weekly = { weekKey: wk, best: { score: 0 } };
  if (score > SAVE.weekly.best.score) SAVE.weekly.best = { score };
  lsSet(K_WEEKLY, SAVE.weekly);
  if (mode === 'daily') {
    if (SAVE.daily.date !== today) SAVE.daily = { date: today, score: 0, done: false };
    SAVE.daily.score = Math.max(SAVE.daily.score, score);
    SAVE.daily.done = true;
    lsSet(K_DAILY, SAVE.daily);
    markDailyDone(today, score);
  }
  SAVE.stats.games += 1;
  lsSet(K_STATS, SAVE.stats);
}
function autosave() {
  const today = utcDate(), wk = isoWeekKey(today);
  if (SAVE.weekly.weekKey !== wk) SAVE.weekly = { weekKey: wk, best: { score: 0 } };
  if (G.score > SAVE.weekly.best.score) SAVE.weekly.best = { score: G.score };
  lsSet(K_WEEKLY, SAVE.weekly);
  lsSet(K_STATS, SAVE.stats);
}

/* ---------------- state ---------------- */
const G = {
  state: 'TITLE', mode: 'classic',
  time: 0, timeLeft: RUN_TIME, autosaveT: 0,
  score: 0, combo: 0, maxCombo: 0, makes: 0, attempts: 0, swishes: 0, lastGain: 0, lastEvent: '',
  ball: { x: W * 0.35, y: H - 190, vx: 0, vy: 0, live: true, scored: false, touched: false, spin: 0, trail: [], respawnT: 0 },
  hoop: { x: W * 0.64, y: H * 0.34, tx: W * 0.64, ty: H * 0.34 },
  wind: 0, windShown: 0, shotIdx: 0,
  dailySeq: null,
  drag: { active: false, sx: 0, sy: 0, cx: 0, cy: 0 },
  aim: { angle: 62, power: 0.72, show: 0 },
  particles: [], popups: [], banners: [], windStreaks: [],
  netAnim: 0, netPhase: 0, hoopFlash: 0,
  shake: 0, flash: 0, overT: 0, newBest: false, rank: null,
  stars: [], skyline: [], hitRegions: [], toast: '', toastT: 0,
};

function initStars() {
  G.stars = [];
  for (let i = 0; i < 70; i++) G.stars.push({ x: rnd(0, W), y: rnd(0, H * 0.55), r: rnd(0.6, 2.2), p: rnd(0, 6.28) });
  G.skyline = [];
  let x = -20;
  while (x < W + 40) {
    const bw = rnd(50, 120), bh = rnd(90, 260);
    G.skyline.push({ x, w: bw, h: bh, win: Math.random() });
    x += bw + rnd(6, 26);
  }
  G.windStreaks = [];
  for (let i = 0; i < 22; i++) G.windStreaks.push({ x: rnd(0, W), y: rnd(120, H * 0.42), len: rnd(20, 70), a: rnd(0.15, 0.5) });
}

/* ---------------- run control ---------------- */
function windForShot(i) {
  if (G.mode === 'daily' && G.dailySeq) return G.dailySeq.winds[i % G.dailySeq.winds.length];
  return round1((Math.random() * 2 - 1) * 3);
}
function hoopForShot(i) {
  if (G.mode === 'daily' && G.dailySeq) {
    const h = G.dailySeq.hoops[i % G.dailySeq.hoops.length];
    return { x: h.x, y: h.y };
  }
  const t = Math.min(1, i / 12);
  return {
    x: clamp(W * (0.56 + 0.10 * t) + rnd(-60, 60), W * 0.54, W - BOARD_OFF - BOARD_W - 30),
    y: clamp(H * (0.30 + 0.10 * t) + rnd(-50, 50), H * 0.22, H * 0.52),
  };
}
function spawnBall() {
  const b = G.ball;
  b.x = rnd(110, W * 0.62); b.y = H - 190;
  b.vx = 0; b.vy = 0; b.live = true; b.scored = false; b.touched = false;
  b.trail = []; b.respawnT = 0;
  G.wind = windForShot(G.shotIdx);
}
function startRun(mode) {
  G.mode = mode || 'classic';
  if (G.mode === 'daily') G.dailySeq = buildDailySeq(utcDate());
  G.state = 'PLAY';
  G.timeLeft = RUN_TIME; G.autosaveT = 0;
  G.score = 0; G.combo = 0; G.maxCombo = 0; G.makes = 0; G.attempts = 0; G.swishes = 0;
  G.lastGain = 0; G.lastEvent = ''; G.shotIdx = 0;
  const h0 = hoopForShot(0);
  G.hoop = { x: h0.x, y: h0.y, tx: h0.x, ty: h0.y };
  G.particles = []; G.popups = []; G.banners = [];
  G.netAnim = 0; G.hoopFlash = 0; G.shake = 0; G.flash = 0; G.overT = 0; G.newBest = false;
  spawnBall();
}
function endRun() {
  G.state = 'OVER';
  G.overT = 0;
  G.rank = rankFor(G.score);
  G.ball.live = false;
  G.newBest = G.score > SAVE.best.score && G.score > 0;
  persistRun(G.score, G.makes, G.swishes, G.mode, utcDate());
  Sound.sfx.buzzer();
  Sound.sfx.over();
  Sound.stopMusic();
  if (G.newBest) setTimeout(() => Sound.sfx.best(), 500);
}

/* ---------------- particles / popups ---------------- */
function burst(x, y, n, col, spd) {
  for (let i = 0; i < n && G.particles.length < MAX_PARTICLES; i++) {
    const a = rnd(0, Math.PI * 2), v = rnd(0.3, 1) * (spd || 420);
    G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 120, life: rnd(0.4, 0.9), max: 0.9, r: rnd(2, 5), col, g: 900, shrink: true });
  }
}
function popup(x, y, txt, col, big) {
  G.popups.push({ x, y, txt, col, t: 0, life: 1.0, big: !!big });
}
function banner(txt, col) {
  G.banners.push({ txt, col, t: 0, life: 1.1 });
}

/* ---------------- scoring ---------------- */
function onMake() {
  const b = G.ball;
  b.scored = true;
  G.makes += 1;
  G.combo += 1;
  G.maxCombo = Math.max(G.maxCombo, G.combo);
  const base = b.touched ? 2 : 3;
  const extra = Math.min(G.combo - 1, COMBO_CAP);
  const gain = base + extra;
  if (!b.touched) { G.swishes += 1; SAVE.stats.swishes += 1; }
  SAVE.stats.makes += 1;
  G.score += gain;
  G.lastGain = gain;
  G.lastEvent = b.touched ? 'make' : 'swish';
  G.netAnim = 1; G.netPhase = 0; G.hoopFlash = 1;
  burst(G.hoop.x, G.hoop.y + 18, b.touched ? 14 : 22, b.touched ? C.cyan : C.gold, 460);
  popup(G.hoop.x, G.hoop.y - 40, '+' + gain + (b.touched ? '' : ' ' + T('swish')), b.touched ? C.cyan : C.gold, !b.touched);
  if (!b.touched) { banner(T('swish'), C.gold); Sound.sfx.swish(); } else Sound.sfx.net();
  Sound.sfx.make(G.combo);
  if (G.combo >= 2) popup(W / 2, H * 0.42, T('combo') + ' ×' + G.combo, C.cyan);
  // hoop walks to a new spot; next ball comes shortly
  G.shotIdx = G.attempts; // next shot index
  const h = hoopForShot(G.makes);
  G.hoop.tx = h.x; G.hoop.ty = h.y;
  b.respawnT = 0.55;
}
function onMiss() {
  G.combo = 0;
  G.lastEvent = 'miss';
  G.shake = 7;
  Sound.sfx.miss();
  G.ball.respawnT = 0.45;
}

/* ---------------- physics ---------------- */
function launch(vx, vy) {
  const b = G.ball;
  if (!b.live || b.scored) return false;
  b.vx = vx; b.vy = vy; b.touched = false; b.trail = [];
  G.attempts += 1;
  G.shotIdx = G.attempts; // next spawned ball pulls the next seeded wind
  SAVE.stats.attempts += 1;
  G.lastEvent = 'launch';
  Sound.sfx.launch();
  return true;
}
function shoot(angleDeg, power) {
  const v = MINV + clamp(power, 0, 1) * (MAXV - MINV);
  const a = angleDeg * Math.PI / 180;
  return launch(Math.cos(a) * v, -Math.sin(a) * v);
}
function substep(h) {
  const b = G.ball;
  const px = b.x, py = b.y;
  b.vy += GRAV * h;
  b.vx += G.wind * WIND_K * h;
  b.x += b.vx * h;
  b.y += b.vy * h;
  b.spin += b.vx * h * 0.02;

  // --- rim-plane crossing → make (deterministic segment test) ---
  const hy = G.hoop.y;
  if (!b.scored && b.vy > 40 && py < hy && b.y >= hy) {
    const t = (hy - py) / (b.y - py);
    const cx = px + (b.x - px) * t;
    if (cx > G.hoop.x - RIM_HALF + 6 && cx < G.hoop.x + RIM_HALF - 6) onMake();
  }

  if (!b.scored) {
    // --- rim tip circles ---
    for (const s of [-1, 1]) {
      const txp = G.hoop.x + s * RIM_HALF, typ = hy;
      const dx = b.x - txp, dy = b.y - typ, d = Math.hypot(dx, dy), rr = BALL_R + RIM_TIP_R;
      if (d < rr && d > 0.001) {
        const nx = dx / d, ny = dy / d;
        b.x = txp + nx * rr; b.y = typ + ny * rr;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) { b.vx -= 1.5 * vn * nx; b.vy -= 1.5 * vn * ny; }
        b.vx *= 0.82; b.vy *= 0.82;
        if (!b.touched) Sound.sfx.rim();
        b.touched = true;
      }
    }
    // --- backboard ---
    const bx = G.hoop.x + BOARD_OFF;
    if (b.vx > 0 && b.x + BALL_R > bx && b.x < bx + BOARD_W + BALL_R &&
        b.y > hy + BOARD_TOP && b.y < hy + BOARD_BOT) {
      b.x = bx - BALL_R;
      b.vx = -Math.abs(b.vx) * 0.62;
      if (!b.touched) Sound.sfx.board();
      b.touched = true;
      burst(bx, b.y, 6, C.pink, 260);
    }
  }

  // --- out of world ---
  if (b.y > H + 80 || b.x < -80 || b.x > W + 80) {
    if (!b.scored) onMiss();
    b.live = false;
  }
}
function stepBall(dt) {
  const b = G.ball;
  if (!b.live) {
    if (b.respawnT > 0) {
      b.respawnT -= dt;
      if (b.respawnT <= 0 && G.state === 'PLAY') spawnBall();
    }
    return;
  }
  if (b.vx === 0 && b.vy === 0) return; // waiting to be shot
  const steps = Math.max(1, Math.ceil(dt / 0.008));
  const h = dt / steps;
  for (let i = 0; i < steps && b.live; i++) substep(h);
  b.trail.push({ x: b.x, y: b.y });
  if (b.trail.length > 10) b.trail.shift();
}

/* ---------------- update ---------------- */
function update(dt) {
  G.time += dt;
  G.windShown = G.wind;
  G.shake *= Math.pow(0.001, dt);
  G.flash = Math.max(0, G.flash - dt * 3);
  G.netAnim = Math.max(0, G.netAnim - dt * 1.6);
  G.netPhase += dt;
  G.hoopFlash = Math.max(0, G.hoopFlash - dt * 2);
  G.toastT = Math.max(0, G.toastT - dt);
  G.aim.show = Math.max(0, G.aim.show - dt);

  // hoop glide
  const hp = G.hoop;
  hp.x = lerp(hp.x, hp.tx, Math.min(1, dt * 9));
  hp.y = lerp(hp.y, hp.ty, Math.min(1, dt * 9));

  // particles
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life -= dt;
    if (p.life <= 0) { G.particles.splice(i, 1); continue; }
    p.vy += (p.g || 0) * dt;
    p.x += p.vx * dt; p.y += p.vy * dt;
  }
  for (let i = G.popups.length - 1; i >= 0; i--) {
    const p = G.popups[i];
    p.t += dt;
    if (p.t > p.life) G.popups.splice(i, 1);
  }
  for (let i = G.banners.length - 1; i >= 0; i--) {
    const bn = G.banners[i];
    bn.t += dt;
    if (bn.t > bn.life) G.banners.splice(i, 1);
  }
  // ambient wind streaks
  const wv = G.state === 'PLAY' || G.state === 'TITLE' ? G.wind : 0;
  for (const s of G.windStreaks) {
    s.x += wv * 60 * dt;
    if (s.x > W + 80) s.x = -80;
    if (s.x < -80) s.x = W + 80;
  }

  if (G.state === 'PLAY') {
    G.timeLeft -= dt;
    stepBall(dt);
    if (G.timeLeft <= 0) { G.timeLeft = 0; endRun(); }
    G.autosaveT += dt;
    if (G.autosaveT >= 10) { G.autosaveT = 0; autosave(); }
  } else if (G.state === 'OVER') {
    G.overT += dt;
  }
}

/* ---------------- share ---------------- */
function shareText() {
  const r = G.rank || rankFor(G.score);
  return '🏀 Neon Hoops 60s: ' + G.score + ' pts · ' + G.makes + ' makes · best run ' + G.maxCombo +
    ' · ' + r.emoji + r.name + ' | seyrs1985.github.io/neonplay/neon-hoops/';
}
function buildShareCard() {
  const cw = 720, ch = 900;
  const cv = document.createElement('canvas');
  cv.width = cw; cv.height = ch;
  const x = cv.getContext('2d');
  const g = x.createLinearGradient(0, 0, 0, ch);
  g.addColorStop(0, '#101438'); g.addColorStop(1, '#0a0a18');
  x.fillStyle = g; x.fillRect(0, 0, cw, ch);
  for (let i = 0; i < 60; i++) {
    x.fillStyle = 'rgba(232,236,255,' + (0.1 + 0.25 * Math.random()).toFixed(2) + ')';
    x.fillRect(Math.random() * cw, Math.random() * ch, 2, 2);
  }
  x.strokeStyle = C.cyan; x.lineWidth = 3;
  x.strokeRect(24, 24, cw - 48, ch - 48);
  x.textAlign = 'center';
  x.fillStyle = C.ink; x.font = 'bold 56px system-ui, sans-serif';
  x.fillText('🏀 NEON HOOPS', cw / 2, 130);
  x.fillStyle = C.gold; x.font = 'bold 150px system-ui, sans-serif';
  x.fillText(String(G.score), cw / 2, 320);
  x.font = '600 34px system-ui, sans-serif'; x.fillStyle = C.dim;
  x.fillText('PTS · ' + utcDate(), cw / 2, 370);
  const r = G.rank || rankFor(G.score);
  x.font = 'bold 72px system-ui, sans-serif'; x.fillStyle = C.pink;
  x.fillText(r.emoji + '  ' + r.name.toUpperCase(), cw / 2, 500);
  x.font = '600 38px system-ui, sans-serif'; x.fillStyle = C.ink;
  x.fillText(G.makes + ' makes · ' + G.swishes + ' swishes · best run ×' + G.maxCombo, cw / 2, 590);
  if (G.mode === 'daily') { x.fillStyle = C.green; x.font = '600 30px system-ui, sans-serif'; x.fillText('#NeonHoopsDaily ' + utcDate().slice(5), cw / 2, 645); }
  x.strokeStyle = 'rgba(0,229,255,0.35)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(80, 700); x.lineTo(cw - 80, 700); x.stroke();
  x.fillStyle = C.cyan; x.font = '600 34px system-ui, sans-serif';
  x.fillText('seyrs1985.github.io/neonplay/neon-hoops/', cw / 2, 760);
  return cv;
}
async function doShare() {
  const text = shareText();
  let shared = false;
  try {
    if (navigator.share) {
      const cv = buildShareCard();
      const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'neon-hoops.png', { type: 'image/png' })] })) {
        await navigator.share({ files: [new File([blob], 'neon-hoops.png', { type: 'image/png' })], title: 'Neon Hoops', text });
        shared = true;
      } else {
        await navigator.share({ title: 'Neon Hoops', text });
        shared = true;
      }
    }
  } catch (e) { /* user cancel or no share — fall through to clipboard */ }
  if (!shared) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        G.toast = T('copied'); G.toastT = 2.2;
      } else { G.toast = T('copyFail'); G.toastT = 2.2; }
    } catch (e) { G.toast = T('copyFail'); G.toastT = 2.2; }
  }
  Sound.sfx.click();
}

/* ---------------- input (called from main.js, logical coords) ---------------- */
function onPress(x, y) {
  Sound.resume();
  // buttons first (drawn overlays register hit regions each frame)
  for (const r of G.hitRegions) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { pressButton(r.id); return; }
  }
  if (G.state === 'PLAY') {
    const b = G.ball;
    if (b.live && !b.scored && b.vx === 0 && b.vy === 0) {
      G.drag = { active: true, sx: x, sy: y, cx: x, cy: y };
    }
  } else if (G.state === 'TITLE') {
    Sound.sfx.bad();
    G.shake = 3;
  }
}
function pressButton(id) {
  Sound.sfx.click();
  if (id === 'classic') { startRun('classic'); Sound.sfx.start(); Sound.startMusic(); }
  else if (id === 'daily') { startRun('daily'); Sound.sfx.start(); Sound.startMusic(); }
  else if (id === 'retry') { startRun(G.mode); Sound.sfx.start(); Sound.startMusic(); }
  else if (id === 'menu') { G.state = 'TITLE'; Sound.stopMusic(); }
  else if (id === 'resume') { G.state = 'PLAY'; }
  else if (id === 'pause') { G.state = 'PAUSE'; }
  else if (id === 'share') { doShare(); }
}
function onMove(x, y) {
  if (G.drag.active) { G.drag.cx = x; G.drag.cy = y; }
}
function onRelease() {
  if (!G.drag.active) return;
  const d = G.drag;
  G.drag.active = false;
  const dx = d.sx - d.cx, dy = d.sy - d.cy; // slingshot: drag back, fly opposite
  const len = Math.hypot(dx, dy);
  if (len < 24) { if (len > 6) Sound.sfx.bad(); return; }
  let v = len * DRAG_K;
  v = clamp(v, MINV, MAXV);
  launch(dx / len * v, dy / len * v);
}
function keyAction(code) {
  if (code === 'KeyM') { Sound.setMuted(!Sound.isMuted()); return; }
  if (G.state === 'TITLE') {
    if (code === 'Space' || code === 'Enter') { startRun('classic'); Sound.sfx.start(); Sound.startMusic(); }
    return;
  }
  if (G.state === 'PAUSE') {
    if (code === 'Space' || code === 'Enter' || code === 'KeyP' || code === 'Escape') G.state = 'PLAY';
    return;
  }
  if (G.state === 'OVER') {
    if (G.overT > 0.6 && (code === 'Space' || code === 'Enter' || code === 'KeyR')) { startRun(G.mode); Sound.sfx.start(); Sound.startMusic(); }
    return;
  }
  // PLAY
  if (code === 'KeyP' || code === 'Escape') { G.state = 'PAUSE'; return; }
  if (code === 'KeyR') { startRun(G.mode); Sound.sfx.start(); return; }
  const a = G.aim;
  if (code === 'ArrowLeft') { a.angle = clamp(a.angle + 15, 20, 85); a.show = 3; Sound.sfx.click(); }
  else if (code === 'ArrowRight') { a.angle = clamp(a.angle - 15, 20, 85); a.show = 3; Sound.sfx.click(); }
  else if (code === 'ArrowUp') { a.power = clamp(round2(a.power + 0.05), 0.2, 1); a.show = 3; Sound.sfx.click(); }
  else if (code === 'ArrowDown') { a.power = clamp(round2(a.power - 0.05), 0.2, 1); a.show = 3; Sound.sfx.click(); }
  else if (code === 'Space') { a.show = 3; shoot(a.angle, a.power); }
}
function round2(v) { return Math.round(v * 100) / 100; }

/* ---------------- render helpers ---------------- */
function fakeGlowRect(x, stroke, col, w) { /* layered translucent stroke = glow, no shadowBlur */
  x.strokeStyle = col; x.lineWidth = w * 3; x.globalAlpha = 0.16; x.stroke(stroke);
  x.globalAlpha = 0.35; x.lineWidth = w * 1.8; x.stroke(stroke);
  x.globalAlpha = 1; x.lineWidth = w; x.stroke(stroke);
}
function roundRectPath(x, px, py, w, h, r) {
  x.beginPath();
  x.moveTo(px + r, py);
  x.arcTo(px + w, py, px + w, py + h, r);
  x.arcTo(px + w, py + h, px, py + h, r);
  x.arcTo(px, py + h, px, py, r);
  x.arcTo(px, py, px + w, py, r);
  x.closePath();
}
function button(x, id, cx, cy, w, h, label, accent, sub) {
  roundRectPath(x, cx - w / 2, cy - h / 2, w, h, 18);
  x.fillStyle = 'rgba(20,24,56,0.9)'; x.fill();
  const p = new Path2D();
  p.roundRect ? p.roundRect(cx - w / 2, cy - h / 2, w, h, 18) : p.rect(cx - w / 2, cy - h / 2, w, h);
  fakeGlowRect(x, p, accent, 2);
  x.strokeStyle = accent; x.lineWidth = 3; x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = C.ink; x.font = 'bold 40px system-ui, sans-serif';
  x.fillText(label, cx, cy - (sub ? 14 : 0));
  if (sub) { x.font = '500 22px system-ui, sans-serif'; x.fillStyle = C.dim; x.fillText(sub, cx, cy + 24); }
  G.hitRegions.push({ id, x: cx - w / 2, y: cy - h / 2, w, h });
}

/* ---------------- render ---------------- */
function draw(ctx) {
  G.hitRegions = [];
  ctx.save();
  if (G.shake > 0.3) ctx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));

  drawBackground(ctx);
  drawWindHud(ctx);
  if (G.state !== 'TITLE') {
    drawHoop(ctx);
    drawBallAndAim(ctx);
  }
  drawParticles(ctx, 'under');
  drawHud(ctx);
  drawParticles(ctx, 'over');
  drawPopups(ctx);
  drawBanners(ctx);

  if (G.state === 'TITLE') drawTitle(ctx);
  else if (G.state === 'PAUSE') drawPause(ctx);
  else if (G.state === 'OVER') drawOver(ctx);

  if (G.toastT > 0) {
    ctx.globalAlpha = Math.min(1, G.toastT);
    ctx.fillStyle = C.panel; roundRectPath(ctx, W / 2 - 260, H - 200, 520, 64, 14); ctx.fill();
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.ink; ctx.font = '600 26px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(G.toast, W / 2, H - 168);
    ctx.globalAlpha = 1;
  }
  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,213,74,' + (G.flash * 0.22).toFixed(3) + ')';
    ctx.fillRect(-20, -20, W + 40, H + 40);
  }
  ctx.restore();
}

function drawBackground(ctx) {
  ctx.fillStyle = C.bg; ctx.fillRect(-20, -20, W + 40, H + 40);
  // stars
  for (const s of G.stars) {
    const tw = 0.5 + 0.5 * Math.sin(G.time * 1.4 + s.p);
    ctx.fillStyle = 'rgba(232,236,255,' + (0.14 + tw * 0.3).toFixed(3) + ')';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
  // skyline silhouette
  const horizon = H * 0.62;
  for (const b of G.skyline) {
    ctx.fillStyle = '#12122b';
    ctx.fillRect(b.x, horizon - b.h, b.w, b.h);
    ctx.fillStyle = 'rgba(0,229,255,0.28)';
    for (let wy = horizon - b.h + 14; wy < horizon - 10; wy += 22)
      for (let wx = b.x + 8; wx < b.x + b.w - 10; wx += 18)
        if ((wx * 7 + wy * 13 + b.win * 91) % 5 < 2) ctx.fillRect(wx, wy, 5, 8);
  }
  // neon fence
  ctx.strokeStyle = 'rgba(124,77,255,0.5)'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (let x = 0; x <= W; x += 48) { ctx.moveTo(x, horizon - 116); ctx.lineTo(x + 14, horizon); }
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0,229,255,0.35)';
  ctx.beginPath(); ctx.moveTo(0, horizon - 116); ctx.lineTo(W, horizon - 116); ctx.stroke();
  // court floor
  ctx.fillStyle = '#0d0d22'; ctx.fillRect(0, horizon, W, H - horizon);
  ctx.strokeStyle = 'rgba(0,229,255,0.6)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(0, horizon + 6); ctx.lineTo(W, horizon + 6); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,45,149,0.35)'; ctx.lineWidth = 3;
  ctx.strokeRect(W * 0.08, H - 150, W * 0.3, 110);
  // ambient wind streaks (upper sky)
  const wdir = G.wind >= 0 ? 1 : -1;
  ctx.strokeStyle = G.wind >= 0 ? 'rgba(57,255,136,0.30)' : 'rgba(255,84,112,0.30)';
  ctx.lineWidth = 2;
  for (const s of G.windStreaks) {
    const len = s.len * (0.3 + Math.abs(G.wind) / 3 * 0.7);
    if (Math.abs(G.wind) < 0.05) continue;
    ctx.globalAlpha = s.a;
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - wdir * len, s.y); ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawWindHud(ctx) {
  const fx = W / 2, fy = 86;
  // flag pole
  ctx.strokeStyle = C.violet; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.moveTo(fx, fy - 34); ctx.lineTo(fx, fy + 40); ctx.stroke();
  ctx.fillStyle = C.violet;
  ctx.beginPath(); ctx.arc(fx, fy - 34, 7, 0, 7); ctx.fill();
  // waving flag: amplitude ∝ |wind|, points along wind direction
  const w = G.windShown, aw = Math.abs(w), dir = w >= 0 ? 1 : -1;
  const fw = 46 + aw / 3 * 66;         // flag length 46..112
  const amp = 3 + aw / 3 * 16;         // sway amplitude 3..19
  const col = Math.abs(w) < 0.05 ? C.dim : (w > 0 ? C.green : C.red);
  ctx.beginPath();
  ctx.moveTo(fx, fy - 28);
  const seg = 8;
  for (let i = 1; i <= seg; i++) {
    const t = i / seg;
    ctx.lineTo(fx + dir * fw * t, fy - 28 + Math.sin(G.time * (3 + aw * 1.6) + t * 4) * amp * t + 14 * t);
  }
  for (let i = seg; i >= 0; i--) {
    const t = i / seg;
    ctx.lineTo(fx + dir * fw * t, fy - 28 + 18 + Math.sin(G.time * (3 + aw * 1.6) + t * 4 + 0.6) * amp * t + 14 * t);
  }
  ctx.closePath();
  ctx.fillStyle = col; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1;
  // wind readout
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 30px system-ui, sans-serif';
  if (Math.abs(w) < 0.05) {
    ctx.fillStyle = C.dim; ctx.fillText(T('calm'), fx, fy + 66);
  } else {
    ctx.fillStyle = col;
    ctx.fillText(T('wind') + ' ' + Math.abs(w).toFixed(1) + (w > 0 ? ' →' : ' ←'), fx, fy + 66);
    ctx.font = '500 22px system-ui, sans-serif'; ctx.fillStyle = C.dim;
    ctx.fillText('▮▮▮▮▮▮'.slice(0, Math.max(1, Math.round(aw / 3 * 6))), fx, fy + 96);
  }
}

function drawHoop(ctx) {
  const hx = G.hoop.x, hy = G.hoop.y;
  // pole from board down to floor (street style)
  const bx = hx + BOARD_OFF;
  ctx.strokeStyle = 'rgba(0,229,255,0.25)'; ctx.lineWidth = 8;
  ctx.beginPath(); ctx.moveTo(bx + 6, hy + BOARD_BOT); ctx.lineTo(bx + 6, H * 0.62 + 60); ctx.stroke();
  // backboard
  const by1 = hy + BOARD_TOP, by2 = hy + BOARD_BOT;
  roundRectPath(ctx, bx, by1, BOARD_W, by2 - by1, 6);
  ctx.fillStyle = 'rgba(16,18,40,0.92)'; ctx.fill();
  const board = new Path2D();
  board.rect(bx, by1, BOARD_W, by2 - by1);
  fakeGlowRect(ctx, board, G.hoopFlash > 0 ? C.gold : C.pink, 3);
  // rim
  const rim = new Path2D();
  rim.moveTo(hx - RIM_HALF, hy); rim.lineTo(hx + RIM_HALF, hy);
  fakeGlowRect(ctx, rim, G.hoopFlash > 0 ? C.gold : C.cyan, 5);
  // net (sways when the ball drops through)
  const sway = Math.sin(G.netPhase * 14) * 26 * G.netAnim;
  const depth = 74 + G.netAnim * 26;
  ctx.strokeStyle = 'rgba(255,45,149,0.85)'; ctx.lineWidth = 2.5;
  for (let i = 0; i <= 5; i++) {
    const t = i / 5;
    const topX = hx - RIM_HALF + t * RIM_HALF * 2;
    const botX = hx - RIM_HALF * 0.45 + t * RIM_HALF * 0.9 + sway * (0.4 + t * 0.6);
    ctx.beginPath(); ctx.moveTo(topX, hy + 4); ctx.quadraticCurveTo((topX + botX) / 2 + sway * 0.5, hy + depth * 0.6, botX, hy + depth); ctx.stroke();
  }
  for (let j = 1; j <= 3; j++) {
    const t = j / 3.4;
    const wTop = RIM_HALF, wBot = RIM_HALF * 0.45;
    const yy = hy + 4 + t * depth;
    const ww = lerp(wTop, wBot, t);
    ctx.beginPath();
    ctx.moveTo(hx - ww + sway * t, yy);
    ctx.quadraticCurveTo(hx + sway * t, yy + 10, hx + ww + sway * t, yy);
    ctx.stroke();
  }
}

function drawBallAndAim(ctx) {
  const b = G.ball;
  if (!b.live) return;
  // trajectory preview (drag or keyboard aim)
  let vx = null, vy = null;
  if (G.drag.active) {
    const dx = G.drag.sx - G.drag.cx, dy = G.drag.sy - G.drag.cy;
    const len = Math.hypot(dx, dy);
    if (len > 24) {
      let v = clamp(len * DRAG_K, MINV, MAXV);
      vx = dx / len * v; vy = dy / len * v;
    }
  } else if (G.aim.show > 0 && b.vx === 0 && b.vy === 0) {
    const v = MINV + G.aim.power * (MAXV - MINV);
    const a = G.aim.angle * Math.PI / 180;
    vx = Math.cos(a) * v; vy = -Math.sin(a) * v;
  }
  if (vx !== null && !b.scored) {
    for (let i = 1; i <= PREVIEW_N; i++) {
      const t = i * 0.07;
      const px2 = b.x + vx * t + 0.5 * G.wind * WIND_K * t * t;
      const py2 = b.y + vy * t + 0.5 * GRAV * t * t;
      ctx.globalAlpha = 0.75 - i * 0.07;
      ctx.fillStyle = C.cyan;
      ctx.beginPath(); ctx.arc(px2, py2, 7 - i * 0.4, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  // trail
  if (b.trail.length > 1 && (b.vx !== 0 || b.vy !== 0)) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < b.trail.length; i++) {
      const p = b.trail[i], t = i / b.trail.length;
      ctx.globalAlpha = t * 0.3;
      ctx.fillStyle = C.ball;
      ctx.beginPath(); ctx.arc(p.x, p.y, BALL_R * t * 0.8, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  // ball with rotating seams
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.28; ctx.fillStyle = C.ball;
  ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R + 7, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = C.ball;
  ctx.beginPath(); ctx.arc(b.x, b.y, BALL_R, 0, 7); ctx.fill();
  ctx.save();
  ctx.translate(b.x, b.y); ctx.rotate(b.spin);
  ctx.strokeStyle = 'rgba(58,28,8,0.8)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, BALL_R - 2, 0.4, 2.7); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-BALL_R + 4, -6); ctx.quadraticCurveTo(0, 6, BALL_R - 4, -6); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-BALL_R + 4, 10); ctx.quadraticCurveTo(0, 20, BALL_R - 4, 10); ctx.stroke();
  ctx.restore();
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath(); ctx.arc(b.x - 8, b.y - 10, 5, 0, 7); ctx.fill();
  // keyboard aim meter
  if (G.aim.show > 0 && b.vx === 0 && b.vy === 0 && !b.scored) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'bold 30px system-ui, sans-serif'; ctx.fillStyle = C.cyan;
    ctx.fillText(T('angle') + ' ' + G.aim.angle + '°  ·  ' + T('power') + ' ' + Math.round(G.aim.power * 100) + '%', b.x, b.y - BALL_R - 70);
    const a = G.aim.angle * Math.PI / 180;
    ctx.strokeStyle = C.gold; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x + Math.cos(a) * 90, b.y - Math.sin(a) * 90); ctx.stroke();
  }
}

function drawParticles(ctx, layer) {
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.particles) {
    const t = p.life / p.max;
    ctx.globalAlpha = Math.max(0, t) * 0.9;
    ctx.fillStyle = p.col;
    const r = p.shrink ? p.r * t : p.r;
    ctx.beginPath(); ctx.arc(p.x, p.y, Math.max(0.5, r), 0, 7); ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}

function drawHud(ctx) {
  if (G.state === 'TITLE') return;
  ctx.textBaseline = 'middle';
  // score
  ctx.textAlign = 'left';
  ctx.font = '600 24px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText(T('score'), 30, 60);
  ctx.font = 'bold 58px system-ui, sans-serif'; ctx.fillStyle = C.ink;
  ctx.fillText(String(G.score), 30, 104);
  // timer
  ctx.textAlign = 'right';
  const tl = Math.max(0, G.timeLeft);
  ctx.font = '600 24px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText(T('time'), W - 30, 60);
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillStyle = tl <= 10 ? C.red : (tl <= 20 ? C.gold : C.ink);
  ctx.fillText(tl.toFixed(1), W - 30, 104);
  // combo capsule
  if (G.combo >= 2 && G.state === 'PLAY') {
    const bw = 190, bx = 30, by = 150;
    const pulse = 1 + 0.06 * Math.sin(G.time * 10);
    ctx.save(); ctx.translate(bx + bw / 2, by); ctx.scale(pulse, pulse);
    roundRectPath(ctx, -bw / 2, -26, bw, 52, 26);
    ctx.fillStyle = 'rgba(0,229,255,0.14)'; ctx.fill();
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = 'bold 30px system-ui, sans-serif'; ctx.fillStyle = C.cyan;
    ctx.fillText(T('combo') + ' ×' + G.combo, 0, 1);
    ctx.restore();
  }
  // pause button (PLAY only, ≥44px)
  if (G.state === 'PLAY') {
    const px2 = W - 62, py2 = 162;
    ctx.beginPath(); ctx.arc(px2, py2, 34, 0, 7);
    ctx.fillStyle = 'rgba(20,24,56,0.8)'; ctx.fill();
    ctx.strokeStyle = 'rgba(232,236,255,0.5)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.fillRect(px2 - 9, py2 - 12, 6, 24); ctx.fillRect(px2 + 3, py2 - 12, 6, 24);
    G.hitRegions.push({ id: 'pause', x: px2 - 34, y: py2 - 34, w: 68, h: 68 });
  }
}

function drawPopups(ctx) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of G.popups) {
    const t = p.t / p.life;
    ctx.globalAlpha = 1 - t * t;
    ctx.font = (p.big ? 'bold 54px' : 'bold 40px') + ' system-ui, sans-serif';
    ctx.fillStyle = p.col;
    ctx.fillText(p.txt, p.x, p.y - t * 90);
  }
  ctx.globalAlpha = 1;
}

function drawBanners(ctx) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const bn of G.banners) {
    const t = bn.t / bn.life;
    const slide = (1 - Math.min(1, t * 4)) * W * 0.4;
    ctx.save();
    ctx.translate(W / 2 + slide * 0.3, H * 0.3);
    ctx.transform(1, 0, -0.22, 1, 0, 0); // italic skew
    ctx.globalAlpha = t < 0.15 ? t / 0.15 : 1 - Math.max(0, (t - 0.7) / 0.3);
    ctx.font = 'bold 96px system-ui, sans-serif';
    ctx.strokeStyle = bn.col; ctx.lineWidth = 14; ctx.globalAlpha *= 0.9;
    ctx.strokeText(bn.txt, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillText(bn.txt, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawTitle(ctx) {
  ctx.fillStyle = 'rgba(10,10,24,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // hoop decor
  const hx = W / 2, hy = H * 0.30;
  const rim = new Path2D(); rim.moveTo(hx - RIM_HALF, hy); rim.lineTo(hx + RIM_HALF, hy);
  fakeGlowRect(ctx, rim, C.cyan, 5);
  ctx.font = 'bold 92px system-ui, sans-serif';
  ctx.fillStyle = C.ink; ctx.fillText('🏀 ' + T('title'), W / 2, H * 0.46);
  ctx.font = '600 30px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText(T('tagline'), W / 2, H * 0.53);
  // buttons (≥44px touch targets: 460×108 logical)
  button(ctx, 'classic', W / 2, H * 0.66, 460, 108, T('classic'), C.cyan);
  button(ctx, 'daily', W / 2, H * 0.66 + 140, 460, 108, T('daily'), C.green, T('dailyTag'));
  // best + streak
  ctx.font = '600 28px system-ui, sans-serif'; ctx.fillStyle = C.gold;
  ctx.fillText('★ ' + T('best') + ' ' + SAVE.best.score, W / 2 - 130, H * 0.66 + 236);
  ctx.fillStyle = C.pink;
  ctx.fillText('🔥 ' + T('streak') + ' ' + SAVE.streak.count + T('days'), W / 2 + 130, H * 0.66 + 236);
  ctx.font = '500 24px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText(T('hintDrag'), W / 2, H - 148);
  ctx.fillText(T('hintKbd'), W / 2, H - 108);
}

function drawPause(ctx) {
  ctx.fillStyle = 'rgba(10,10,24,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 76px system-ui, sans-serif'; ctx.fillStyle = C.ink;
  ctx.fillText(T('paused'), W / 2, H * 0.36);
  button(ctx, 'resume', W / 2, H * 0.52, 460, 108, T('resume'), C.cyan);
  button(ctx, 'menu', W / 2, H * 0.52 + 140, 460, 108, T('menu'), C.violet);
}

function drawOver(ctx) {
  const a = Math.min(1, G.overT * 2.4);
  ctx.fillStyle = 'rgba(10,10,24,' + (0.72 * a).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const r = G.rank || rankFor(G.score);
  // glass panel
  roundRectPath(ctx, 60, H * 0.14, W - 120, H * 0.62, 26);
  ctx.fillStyle = C.panel; ctx.fill();
  ctx.strokeStyle = 'rgba(0,229,255,0.4)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.font = 'bold 54px system-ui, sans-serif'; ctx.fillStyle = C.pink;
  ctx.fillText(T('over'), W / 2, H * 0.14 + 70);
  if (G.newBest) {
    const sweep = ((G.time * 1.2) % 1) * (W - 160) + 80;
    ctx.save();
    ctx.beginPath(); ctx.rect(80, H * 0.14 + 100, W - 160, 70); ctx.clip();
    const g = ctx.createLinearGradient(sweep - 80, 0, sweep + 80, 0);
    g.addColorStop(0, 'rgba(255,213,74,0)'); g.addColorStop(0.5, 'rgba(255,213,74,0.9)'); g.addColorStop(1, 'rgba(255,213,74,0)');
    ctx.fillStyle = g; ctx.fillRect(80, H * 0.14 + 100, W - 160, 70);
    ctx.restore();
    ctx.font = 'bold 46px system-ui, sans-serif'; ctx.fillStyle = C.gold;
    ctx.fillText('★ ' + T('newBest') + ' ★', W / 2, H * 0.14 + 135);
  }
  ctx.font = 'bold 130px system-ui, sans-serif'; ctx.fillStyle = C.ink;
  ctx.fillText(String(G.score), W / 2, H * 0.14 + 240);
  ctx.font = 'bold 60px system-ui, sans-serif'; ctx.fillStyle = C.gold;
  ctx.fillText(r.emoji + ' ' + r.name, W / 2, H * 0.14 + 330);
  if (r.nextKey) {
    ctx.font = '500 26px system-ui, sans-serif'; ctx.fillStyle = C.dim;
    ctx.fillText(T('nextRank') + ': ' + T('ranks' + r.nextKey[0].toUpperCase() + r.nextKey.slice(1)) + ' ' + T('at') + ' ' + r.nextMin + ' ' + T('pts') + ' (+' + r.need + ')', W / 2, H * 0.14 + 380);
  }
  ctx.font = '600 30px system-ui, sans-serif'; ctx.fillStyle = C.ink;
  ctx.fillText(T('makes') + ' ' + G.makes + '/' + G.attempts + ' · ' + T('swishes') + ' ' + G.swishes + ' · ' + T('maxCombo') + ' ×' + G.maxCombo, W / 2, H * 0.14 + 430);
  if (G.mode === 'daily') {
    ctx.font = '500 26px system-ui, sans-serif'; ctx.fillStyle = C.green;
    ctx.fillText('📅 ' + T('dailyDone') + ' · ' + T('comeBack'), W / 2, H * 0.14 + 478);
  }
  // buttons
  button(ctx, 'share', W / 2, H * 0.82, 460, 100, '🔗 ' + T('share'), C.gold);
  button(ctx, 'retry', W / 2 - 125, H * 0.82 + 130, 230, 96, T('retry'), C.cyan);
  button(ctx, 'menu', W / 2 + 125, H * 0.82 + 130, 230, 96, T('menu'), C.violet);
  ctx.globalAlpha = 1;
}

/* ---------------- deterministic hooks (autotest / screenshots / QA) ----------------
   ?autotest=1                        run the in-page self-check, expose window.__autotest
   ?shot=title|play|over[&seed=N]     stage a scene and render one frame */
(function () {
  window.__qaState = () => { // callable in ANY state
    const b = G.ball, hp = G.hoop;
    return {
      state: G.state, mode: G.mode, score: G.score, timeLeft: Math.round(G.timeLeft * 10) / 10,
      combo: G.combo, maxCombo: G.maxCombo, makes: G.makes, attempts: G.attempts, swishes: G.swishes,
      lastGain: G.lastGain, lastEvent: G.lastEvent,
      wind: G.wind, shotIdx: G.shotIdx, netAnim: Math.round(G.netAnim * 100) / 100,
      netAnimEver: G.netAnimEver || 0,
      ball: { x: Math.round(b.x), y: Math.round(b.y), vx: Math.round(b.vx), vy: Math.round(b.vy), live: b.live, scored: b.scored, touched: b.touched },
      hoop: { x: Math.round(hp.x), y: Math.round(hp.y), tx: Math.round(hp.tx), ty: Math.round(hp.ty) },
      rank: G.rank ? G.rank.key : null, newBest: G.newBest,
      best: SAVE.best.score, streak: { count: SAVE.streak.count, last: SAVE.streak.last, best: SAVE.streak.best, protect: SAVE.streak.protect },
      daily: SAVE.daily,
      hitButtons: G.hitRegions.map(r => r.id),
    };
  };
  // direct injection surface for scripted playtests (reliable, testable hoops)
  window.__qa = {
    start(mode) { startRun(mode === 'daily' ? 'daily' : 'classic'); return window.__qaState(); },
    setWind(w) { G.wind = clamp(round1(w), -3, 3); return G.wind; },
    setBall(x, y) {
      const b = G.ball;
      b.x = x; b.y = y; b.vx = 0; b.vy = 0; b.live = true; b.scored = false; b.touched = false;
      b.trail = []; b.respawnT = 0;
      return true;
    },
    setHoop(x, y) {
      G.hoop.x = G.hoop.tx = clamp(x, W * 0.3, W - BOARD_OFF - BOARD_W - 30);
      G.hoop.y = G.hoop.ty = clamp(y, 80, H * 0.6);
      return true;
    },
    launch(vx, vy) { return launch(vx, vy); },
    shoot(angleDeg, power) { return shoot(angleDeg, power); },
    sim(seconds) { // deterministic fixed-step stepping of the engine
      const n = Math.round(seconds * 60);
      for (let i = 0; i < n; i++) {
        update(1 / 60);
        if (G.netAnim > 0.98) G.netAnimEver = (G.netAnimEver || 0) + 1;
        if (G.state === 'TITLE') break;
      }
      return window.__qaState();
    },
    dailyPreview(dateStr) {
      const d = buildDailySeq(dateStr || utcDate());
      return { date: d.date, winds: d.winds.slice(0, 8), hoops: d.hoops.slice(0, 5) };
    },
    rankFor,
    shareText, buildShareCard,
  };

  const q = new URLSearchParams(location.search);
  const mode = q.get('shot');
  const autotest = q.get('autotest');
  if (!mode && !autotest) return;

  const origErr = console.error;
  let consoleErrCount = 0;
  console.error = function () { consoleErrCount++; origErr.apply(console, arguments); };

  let seed = (parseInt(q.get('seed') || '20260915', 10) >>> 0) || 1;
  const srand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  Math.random = srand; // everything in this page is deterministic

  initStars();
  loadStorage();

  const KEYS = [K_BEST, K_TOP10, K_DAILY, K_STREAK, K_STATS, K_WEEKLY, 'np_neon-hoops_settings'];
  function clearSave() { for (const k of KEYS) { try { localStorage.removeItem(k); } catch (e) {} } loadStorage(); }
  function solveShot(bx, by, hx, hy, T, w) { // ballistic solve incl. wind drift, crosses (hx,hy) at t=T
    const ax = (w || 0) * WIND_K;
    return { vx: (hx - bx - 0.5 * ax * T * T) / T, vy: (hy - by - 0.5 * GRAV * T * T) / T };
  }
  function makeAt(bx, by, hx, hy) { // place & sink a dead-center swish (high arc clears the front rim)
    window.__qa.setWind(0); window.__qa.setBall(bx, by); window.__qa.setHoop(hx, hy);
    const s = solveShot(bx, by, hx, hy, 1.3, 0);
    window.__qa.launch(s.vx, s.vy);
    window.__qa.sim(2.2);
    return window.__qaState();
  }
  function missShot() {
    window.__qa.setWind(0); window.__qa.setBall(200, H - 200);
    window.__qa.launch(150, -200); // weak floater to the left, can't reach anything
    window.__qa.sim(3.0);
    return window.__qaState();
  }

  if (autotest) {
    const results = {};
    try {
      // 1) daily seed determinism: same date → identical winds & hoops (global same-wind promise)
      const d1 = window.__qa.dailyPreview('2026-09-15');
      const d2 = window.__qa.dailyPreview('2026-09-15');
      const d3 = window.__qa.dailyPreview('2026-09-16');
      results.dailyDeterministic = JSON.stringify(d1) === JSON.stringify(d2);
      results.dailyDiffersNextDay = JSON.stringify(d1.winds) !== JSON.stringify(d3.winds);
      results.dailyWindRange = d1.winds.every(v => v >= -3 && v <= 3) &&
        [...d1.winds, ...d3.winds].every(v => v >= -3.0001 && v <= 3.0001);
      results.dailyHoopOnScreen = d1.hoops.every(h => h.x > W * 0.5 && h.x < W && h.y > 100 && h.y < H * 0.55);

      // 2) rank thresholds incl. exact boundaries
      results.rankBoundaries = rankFor(0).key === 'bronze' && rankFor(14).key === 'bronze' &&
        rankFor(15).key === 'silver' && rankFor(29).key === 'silver' && rankFor(30).key === 'gold' &&
        rankFor(49).key === 'gold' && rankFor(50).key === 'platinum' && rankFor(74).key === 'platinum' &&
        rankFor(75).key === 'diamond' && rankFor(104).key === 'diamond' && rankFor(105).key === 'master' &&
        rankFor(149).key === 'master' && rankFor(150).key === 'legend';
      results.rankNextNeed = rankFor(104).need === 1 && rankFor(105).need === 45;

      // 3) scoring: swish +3, combo extra +1 capped at +5, miss resets
      clearSave();
      window.__qa.start('classic');
      results.runStarts = window.__qaState().state === 'PLAY' && window.__qaState().timeLeft > 55;
      // normal make (rim touched) scores exactly +2 — own run so the combo chain below stays clean
      window.__qa.setWind(0); window.__qa.setBall(220, H - 200); window.__qa.setHoop(520, 430);
      const sk = solveShot(220, H - 200, 520, 430, 1.3, 0);
      window.__qa.launch(sk.vx, sk.vy);
      window.__qa.sim(0.7);          // still ascending, well before the rim plane
      G.ball.touched = true;         // simulate the rim graze that kills a swish
      window.__qa.sim(1.5);
      const sT = window.__qaState();
      results.makeScores2 = sT.lastEvent === 'make' && sT.lastGain === 2 && sT.makes === 1;
      window.__qa.start('classic');
      const s1 = makeAt(220, H - 200, 520, 430);
      results.swishScores3 = s1.score === 3 && s1.makes === 1 && s1.combo === 1 && s1.lastEvent === 'swish';
      results.netAnimOnMake = s1.netAnimEver >= 1;
      const s2 = makeAt(220, H - 200, 520, 430);
      results.comboExtra1 = s2.score - s1.score === 4; // 3 swish + 1 combo
      const s3 = makeAt(220, H - 200, 500, 400);
      results.comboExtra2 = s3.score - s2.score === 5; // 3 + 2
      for (let i = 4; i <= 8; i++) { // climb the combo to the cap
        makeAt(220, H - 200, 500, 400);
      }
      const sCapped = window.__qaState();
      results.comboCapsAt5 = sCapped.combo === 8 && sCapped.lastGain === 3 + COMBO_CAP;
      const sMiss = missShot();
      results.missResetsCombo = sMiss.combo === 0 && sMiss.lastEvent === 'miss';
      results.ballRespawns = sMiss.ball.live === true && sMiss.ball.vx === 0;

      // 4) wind physics: same shot, opposite wind → lands on opposite side
      window.__qa.start('classic');
      window.__qa.setWind(3); window.__qa.setBall(220, H - 200); window.__qa.setHoop(520, 430);
      window.__qa.launch(500, -1100); window.__qa.sim(1.0);
      const driftR = window.__qaState().ball.x;
      window.__qa.start('classic');
      window.__qa.setWind(-3); window.__qa.setBall(220, H - 200); window.__qa.setHoop(520, 430);
      window.__qa.launch(500, -1100); window.__qa.sim(1.0);
      const driftL = window.__qaState().ball.x;
      results.windPushesBall = driftR - driftL > 60;

      // 5) full timed daily run → settlement with score/makes/rank, marks daily + streak
      window.__qa.start('daily');
      window.__qa.sim(RUN_TIME + 3);
      const fin = window.__qaState();
      results.timedRunEnds = fin.state === 'OVER';
      results.overHasRank = !!fin.rank && typeof fin.score === 'number' && typeof fin.makes === 'number';
      results.dailyMarked = SAVE.daily.done === true && SAVE.daily.date === utcDate();
      results.streakMarked = SAVE.streak.count >= 1 && SAVE.streak.last === utcDate();
      Sound.setMuted(Sound.isMuted()); // normalize the settings key (listed in the design table)

      // 6) persistence: exactly the designed key set, values readable after end of run
      const keys = Object.keys(localStorage).filter(k => k.indexOf('np_neon-hoops') === 0).sort();
      const expected = KEYS.slice().sort();
      results.storageKeysExact = JSON.stringify(keys) === JSON.stringify(expected);
      results.bestPersisted = SAVE.best.score >= 0 && typeof SAVE.best.date === 'string';
      results.statsShape = SAVE.stats.games >= 1 && SAVE.stats.attempts >= 1;

      // 7) streak: yesterday mark + today → +1; 1-day gap eats the mulligan card
      const today = utcDate();
      const backup = lsGet(K_STREAK, null);
      lsSet(K_STREAK, { count: 3, last: dayShift(today, -1), best: 3, protect: 1, pmonth: today.slice(0, 7) });
      loadStorage();
      let st = markDailyDone(today, 10);
      results.streakIncrements = st.count === 4 && st.best === 4;
      lsSet(K_STREAK, { count: 3, last: dayShift(today, -2), best: 3, protect: 1, pmonth: today.slice(0, 7) });
      loadStorage();
      st = markDailyDone(today, 10);
      results.streakMulligan = st.count === 4 && st.protect === 0;
      lsSet(K_STREAK, { count: 3, last: dayShift(today, -3), best: 3, protect: 1, pmonth: today.slice(0, 7) });
      loadStorage();
      st = markDailyDone(today, 10);
      results.streakGapResets = st.count === 1;
      if (backup !== null) lsSet(K_STREAK, backup); else { try { localStorage.removeItem(K_STREAK); } catch (e) {} }
      loadStorage();

      // 8) share card renders non-blank and carries the site link text
      const card = buildShareCard();
      let distinct = 0; const seenCol = new Set();
      try {
        const cx2 = card.getContext('2d');
        for (let i = 0; i < 40; i++) {
          const px3 = cx2.getImageData((i * 37) % card.width, (i * 91) % card.height, 1, 1).data;
          seenCol.add(px3[0] + ',' + px3[1] + ',' + px3[2]);
        }
        distinct = seenCol.size;
      } catch (e) { distinct = -1; }
      results.shareCardDraws = distinct > 4;
      results.shareTextHasLink = shareText().indexOf('seyrs1985.github.io/neonplay') >= 0 &&
        shareText().indexOf(String(G.score)) >= 0;

      // 9) classic mode: wind resampled per shot within range
      window.__qa.start('classic');
      let ok = true;
      for (let i = 0; i < 12; i++) {
        window.__qa.setBall(220, H - 200);
        window.__qa.launch(400, -900); window.__qa.sim(2.0);
        const wv = window.__qaState().wind;
        ok = ok && wv >= -3 && wv <= 3;
      }
      results.classicWindRange = ok;

      // 10) keyboard mode: Space starts from TITLE, arrows set aim, Space fires
      G.state = 'TITLE'; keyAction('Space');
      results.kbdStartsRun = G.state === 'PLAY';
      G.aim.angle = 62; G.aim.power = 0.8;
      keyAction('ArrowLeft'); keyAction('ArrowUp');
      results.kbdAimAdjusts = G.aim.angle === 77 && G.aim.power === 0.85;
      window.__qa.setWind(0);
      const att0 = G.attempts;
      keyAction('Space');
      results.kbdFires = G.attempts === att0 + 1;
      keyAction('KeyP');
      results.kbdPauses = G.state === 'PAUSE';
      keyAction('Space');
      results.kbdResumes = G.state === 'PLAY';
    } catch (e) {
      results.exception = String(e && e.stack || e);
    }
    results.consoleErrors = consoleErrCount;
    results.allPass = Object.keys(results).every(k => k === 'consoleErrors' ? results[k] === 0 : results[k] !== false);
    window.__autotest = results;
    try { document.title = 'AUTOTEST:' + JSON.stringify(results); } catch (e) {}
    return;
  }

  // --- staged screenshots (?shot=title|play|over) ---
  setTimeout(() => {
    try {
      initStars();
      loadStorage();
      if (mode === 'title') {
        G.state = 'TITLE'; G.time = 2.4;
      } else if (mode === 'play') {
        startRun('classic');
        window.__qa.setWind(2.2);
        G.aim.show = 3;
        window.__qa.sim(parseFloat(q.get('t') || '1.2') || 1.2);
        G.combo = 3; // show the combo meter in the shot
      } else if (mode === 'over') {
        startRun('classic');
        window.__qa.sim(1.0);
        G.score = 87; G.makes = 12; G.attempts = 19; G.swishes = 5; G.maxCombo = 6;
        endRun(); G.overT = 1.2;
      }
      G.shake = 0; G.flash = 0;
      window.__qaFreeze = true;
      setTimeout(() => {
        G.shake = 0; G.flash = 0;
        window.__qaRender && window.__qaRender();
        try { document.title = 'SHOT:' + (window.__stageErr || 'ok'); } catch (e) {}
      }, 40);
    } catch (e) {
      window.__stageErr = String(e && e.stack || e);
      try { document.title = 'SHOT:' + window.__stageErr; } catch (e2) {}
    }
  }, 0);
})();

