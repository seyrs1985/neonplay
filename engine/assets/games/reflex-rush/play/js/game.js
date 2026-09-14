/* Reflex Rush — game core: state machine / targets / ranks / retention / juice / render */
'use strict';

/* ---------------- constants ---------------- */
const W = 720, H = 1280;
const RUN_SECONDS = 30;
const TARGET_TTL = 2.2;          // seconds before a target times out
const R_MAX = 64;                // ring outer radius at spawn
const ARENA = { x0: 120, x1: 600, y0: 310, y1: 1090 };
const PAUSE_BTN = { x: W - 64, y: 64, r: 34 };
const SITE_URL = 'https://seyrs1985.github.io/neonplay/';

const RANKS = [
  { key: 'legend',   emoji: '🏆', max: 200,      color: '#ffd54a' },
  { key: 'master',   emoji: '🥇', max: 230,      color: '#7c4dff' },
  { key: 'diamond',  emoji: '💎', max: 260,      color: '#00e5ff' },
  { key: 'platinum', emoji: '🥈', max: 290,      color: '#c9d5e8' },
  { key: 'gold',     emoji: '🟡', max: 330,      color: '#ffb300' },
  { key: 'silver',   emoji: '⚪', max: 400,      color: '#aeb8c8' },
  { key: 'bronze',   emoji: '🟤', max: Infinity, color: '#c88a5a' },
];

/* ---------------- i18n ---------------- */
var L = {
  en: {
    title1: 'REFLEX', title2: 'RUSH',
    tagline: 'How many milliseconds are your reflexes?',
    classic: 'CLASSIC', classicSub: 'random sequence · 30 seconds',
    daily: 'DAILY CHALLENGE', dailySub: 'same board worldwide · streak',
    anyStart: 'tap anywhere to start',
    kbHint: 'Space start · Enter hit target · P pause · M mute',
    score: 'SCORE', best: 'BEST', combo: 'COMBO', hits: 'HITS',
    miss: 'MISS', timeUp: 'TIME UP', paused: 'PAUSED',
    resume: 'RESUME', menu: 'MENU', retry: 'RETRY', share: 'SHARE',
    avgMs: 'average reaction', bestSingle: 'best single', maxCombo: 'max combo',
    hitsLabel: 'targets hit', noHits: 'no targets hit — go again!',
    nextRank: 'next: {r} — shave off {n}ms', topRank: 'highest rank reached!',
    newBest: 'NEW BEST!', copied: 'copied to clipboard', copyFail: 'share not available',
    streak: 'day streak', todayBest: 'today', done: 'done',
    rank_legend: 'Legend', rank_master: 'Master', rank_diamond: 'Diamond',
    rank_platinum: 'Platinum', rank_gold: 'Gold', rank_silver: 'Silver', rank_bronze: 'Bronze',
    shareText: 'I scored {s} pts on Reflex Rush — average reaction {m}ms ({r} rank). How fast are you?',
    dailyShare: 'Reflex Rush daily {d} — {s} pts, avg {m}ms ({r}). Same board for everyone today!',
  },
  zh: {
    title1: 'REFLEX', title2: 'RUSH',
    tagline: '你的反应到底多少毫秒？',
    classic: '经典模式', classicSub: '随机序列 · 30 秒',
    daily: '每日挑战', dailySub: '全球同题 · 连胜打卡',
    anyStart: '点按任意位置开始',
    kbHint: '空格开始 · 回车击中目标 · P 暂停 · M 静音',
    score: '得分', best: '最佳', combo: '连击', hits: '命中',
    miss: '失误', timeUp: '时间到', paused: '已暂停',
    resume: '继续', menu: '回主页', retry: '再来一局', share: '分享',
    avgMs: '平均反应', bestSingle: '最佳单次', maxCombo: '最高连击',
    hitsLabel: '命中目标', noHits: '一个都没点中——再来！',
    nextRank: '下一段位：{r} —— 再快 {n}ms', topRank: '已达最高段位！',
    newBest: '新纪录！', copied: '已复制到剪贴板', copyFail: '分享不可用',
    streak: '天连胜', todayBest: '今日', done: '已完成',
    rank_legend: '传奇', rank_master: '大师', rank_diamond: '钻石',
    rank_platinum: '白金', rank_gold: '黄金', rank_silver: '白银', rank_bronze: '青铜',
    shareText: '我在 Neon Play《Reflex Rush》打出 {s} 分（均速 {m}ms，{r}段位），你的反应多少毫秒？',
    dailyShare: 'Reflex Rush 每日挑战 {d} —— {s} 分，均速 {m}ms（{r}）。今天全球同一套题！',
  },
};
function T(k) {
  if (window.npT) return npT(L, k);
  let lang = 'en';
  try {
    lang = new URLSearchParams(location.search).get('lang') ||
      localStorage.getItem('np_lang') || 'en';
  } catch (e) {}
  lang = String(lang).slice(0, 2).toLowerCase();
  return (L[lang] && L[lang][k]) || L.en[k] || k;
}
function rankName(key) { return T('rank_' + key); }

/* ---------------- deterministic RNG (daily seed: mulberry32 + FNV-1a of UTC date) ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var x = Math.imul(a ^ a >>> 15, 1 | a);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}
function hashStr(s) {
  var h = 2166136261;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function todayStr() { // UTC date — the daily board is the same worldwide
  var d = new Date();
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
}
function daysBetween(a, b) {
  if (!a) return 0;
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}
function monthOf(s) { return s.slice(0, 7); }
function weekKey(str) { // ISO week "2026-W37"
  const [y, m, d] = str.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const dayNum = (dt.getUTCDay() + 6) % 7;
  dt.setUTCDate(dt.getUTCDate() - dayNum + 3);
  const ft = new Date(Date.UTC(dt.getUTCFullYear(), 0, 4));
  const fd = (ft.getUTCDay() + 6) % 7;
  ft.setUTCDate(ft.getUTCDate() - fd + 3);
  const wk = 1 + Math.round((dt - ft) / (7 * 86400000));
  return dt.getUTCFullYear() + '-W' + (wk < 10 ? '0' + wk : wk);
}
// one target draw from a stream: exactly 3 draws per target (x, y, next-delay)
function nextTargetFrom(src) {
  return {
    x: ARENA.x0 + src() * (ARENA.x1 - ARENA.x0),
    y: ARENA.y0 + src() * (ARENA.y1 - ARENA.y0),
    delay: 0.25 + src() * 0.4,
  };
}
function dailySeq(n) {
  const rng = mulberry32(hashStr('rr-daily-' + todayStr()));
  const out = [];
  for (let i = 0; i < n; i++) { const p = nextTargetFrom(rng); out.push({ x: Math.round(p.x), y: Math.round(p.y) }); }
  return out;
}

/* ---------------- storage (keys exactly per design doc §3) ---------------- */
const K = {
  best: 'np_reflex-rush_best',
  top10: 'np_reflex-rush_top10',
  daily: 'np_reflex-rush_daily',
  streak: 'np_reflex-rush_streak',
  stats: 'np_reflex-rush_stats',
  weekly: 'np_reflex-rush_weekly',
  settings: 'np_reflex-rush_settings',
};
function lsGet(k, d) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; }
}
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

function updateStreak(today) {
  const s = lsGet(K.streak, { count: 0, last: '', best: 0, protect: 1 });
  if (s.last !== today) {
    // one makeup card per calendar month (replenishes when the month changes)
    if (s.last && monthOf(s.last) !== monthOf(today)) s.protect = 1;
    if (!('protect' in s)) s.protect = 1;
    const gap = daysBetween(s.last, today);
    if (!s.last || gap === 1) s.count = (s.count || 0) + 1;
    else if (gap === 2 && s.protect > 0) { s.protect -= 1; s.count = (s.count || 0) + 1; } // card covers one missed day
    else s.count = 1;
    s.last = today;
    s.best = Math.max(s.best || 0, s.count);
    lsSet(K.streak, s);
  }
  return lsGet(K.streak, s);
}

/* ---------------- state ---------------- */
const G = {
  state: 'TITLE', time: 0, runT: 0,
  mode: 'classic', rng: Math.random,
  target: null, spawnDelay: 0.15,
  score: 0, hits: 0, misses: 0, combo: 0, maxCombo: 0,
  sumMs: 0, lastMs: 0, bestSingleMs: 0,
  comboTierT: -9, comboTier: 1,
  particles: [], popups: [], rings: [], stars: [],
  shake: 0, flash: 0, goldT: -9,
  overT: 0, newBest: false, resultRank: null, nextRankInfo: null,
  bannerMsg: '', bannerT: 99,
  best: { score: 0, avgMs: 0, date: '' },
  streak: { count: 0, last: '', best: 0, protect: 1 },
  daily: { date: '', score: 0, avgMs: 0, done: false },
  displayScore: 0, cardURL: '',
  hitRegions: [],
};

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function comboMult(c) { return c >= 10 ? 4 : c >= 6 ? 3 : c >= 3 ? 2 : 1; }
function hitScore(ms, mult) { return Math.max(10, Math.floor((500 - Math.min(ms, 500)) / 5)) * mult; }
function rankOf(avg) { for (const r of RANKS) if (avg < r.max) return r; return RANKS[RANKS.length - 1]; }
function curAvg() { return G.hits ? Math.round(G.sumMs / G.hits) : 0; }

function loadStorage() {
  G.best = lsGet(K.best, G.best);
  G.streak = lsGet(K.streak, G.streak);
  G.daily = lsGet(K.daily, G.daily);
}

/* ---------------- flow ---------------- */
function startRun(mode) {
  G.mode = mode || 'classic';
  G.rng = G.mode === 'daily' ? mulberry32(hashStr('rr-daily-' + todayStr())) : Math.random;
  G.state = 'PLAY';
  G.runT = 0; G.score = 0; G.displayScore = 0;
  G.hits = 0; G.misses = 0; G.combo = 0; G.maxCombo = 0;
  G.sumMs = 0; G.lastMs = 0; G.bestSingleMs = 0;
  G.comboTier = 1; G.comboTierT = -9;
  G.target = null; G.spawnDelay = 0.4;
  G.particles.length = 0; G.popups.length = 0; G.rings.length = 0;
  G.shake = 0; G.flash = 0; G.goldT = -9; G.overT = 0;
  G.newBest = false; G.resultRank = null; G.nextRankInfo = null; G.cardURL = '';
}
function toTitle() { G.state = 'TITLE'; Sound.stopMusic(); loadStorage(); }

function endRun() {
  if (G.state !== 'PLAY') return;
  G.state = 'OVER';
  G.overT = 0;
  const avg = curAvg();
  G.resultRank = G.hits ? rankOf(avg) : null;
  G.nextRankInfo = null;
  const idx = G.resultRank ? RANKS.indexOf(G.resultRank) : -1;
  if (idx > 0) {
    const need = Math.ceil(avg - RANKS[idx - 1].max) + 1;
    G.nextRankInfo = { r: RANKS[idx - 1], ms: Math.max(need, 1) };
  }
  persistRun();
  if (G.newBest) { G.goldT = 0; Sound.sfx.newBest(); } else Sound.sfx.over();
  Sound.stopMusic();
}

function persistRun() {
  const today = todayStr();
  const avg = curAvg();
  if (G.score > (G.best.score || 0)) {
    G.best = { score: G.score, avgMs: avg, date: today };
    lsSet(K.best, G.best);
    G.newBest = true;
  }
  const top = lsGet(K.top10, []);
  top.push({ score: G.score, avgMs: avg, date: today });
  top.sort((a, b) => b.score - a.score);
  lsSet(K.top10, top.slice(0, 10));
  const st = lsGet(K.stats, { games: 0, hits: 0, targets: 0, sumMs: 0 });
  st.games = (st.games || 0) + 1;
  st.hits = (st.hits || 0) + G.hits;
  st.targets = (st.targets || 0) + G.hits + G.misses;
  st.sumMs = (st.sumMs || 0) + G.sumMs;
  lsSet(K.stats, st);
  const wk = weekKey(today);
  const w = lsGet(K.weekly, { weekKey: '', best: { score: 0, avgMs: 0 } });
  if (w.weekKey !== wk || G.score > (w.best && w.best.score || 0)) {
    lsSet(K.weekly, { weekKey: wk, best: { score: G.score, avgMs: avg } });
  }
  if (G.mode === 'daily') {
    const d = lsGet(K.daily, { date: '', score: 0, avgMs: 0, done: false });
    if (d.date !== today || G.score > (d.score || 0)) {
      G.daily = { date: today, score: G.score, avgMs: avg, done: true };
      lsSet(K.daily, G.daily);
    }
    G.streak = updateStreak(today);
  }
}

/* ---------------- targets ---------------- */
function spawnTarget() {
  const p = nextTargetFrom(G.rng);
  G.target = { x: p.x, y: p.y, born: G.runT, ttl: TARGET_TTL };
  G.spawnDelay = p.delay; // cooldown for the target after this one resolves
  Sound.sfx.click();
}
function targetR() {
  if (!G.target) return 0;
  const k = clamp((G.runT - G.target.born) / TARGET_TTL, 0, 1);
  return R_MAX * (1 - k);
}
function hitRadius() { return Math.max(targetR() + 8, 44); } // ring + 8px grace, min 44px touch target

function registerHit() {
  const t = G.target;
  const ms = Math.max(1, Math.round((G.runT - t.born) * 1000));
  G.hits++; G.sumMs += ms; G.lastMs = ms;
  if (!G.bestSingleMs || ms < G.bestSingleMs) G.bestSingleMs = ms;
  G.combo++;
  G.maxCombo = Math.max(G.maxCombo, G.combo);
  const mult = comboMult(G.combo);
  if (mult > G.comboTier) { G.comboTierT = G.time; Sound.sfx.comboUp(mult); }
  G.comboTier = mult;
  const gain = hitScore(ms, mult);
  G.score += gain;
  addPopup(t.x, t.y - 40, ms + 'ms', ms < 260 ? '#ffd54a' : '#ffffff');
  addPopup(t.x, t.y + 26, '+' + gain + (mult > 1 ? ' ×' + mult : ''), mult >= 4 ? '#ffd54a' : mult === 3 ? '#b39dff' : mult === 2 ? '#39ff88' : '#cfe9ff');
  burst(t.x, t.y, '#00e5ff', 10);
  addRing(t.x, t.y, '#00e5ff');
  G.shake = Math.max(G.shake, 2);
  Sound.sfx.hit(ms, mult);
  G.target = null;
}
function registerMiss(kind, x, y) {
  G.misses++;
  G.combo = 0; G.comboTier = 1;
  burst(x, y, '#ff2d95', 8);
  addPopup(x, y - 30, T('miss'), '#ff2d95');
  G.shake = Math.max(G.shake, 7);
  if (kind === 'timeout') { Sound.sfx.timeout(); G.target = null; }
  else Sound.sfx.miss();
}

/* ---------------- juice ---------------- */
function burst(x, y, color, count) {
  if (G.particles.length > 260) return;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const sp = 120 + Math.random() * 300;
    G.particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      life: 0, max: 0.4 + Math.random() * 0.35,
      size: 3 + Math.random() * 5, color: Math.random() < 0.3 ? '#ffffff' : color,
      rot: Math.random() * Math.PI, spin: (Math.random() - 0.5) * 10,
    });
  }
}
function addRing(x, y, color) { G.rings.push({ x, y, r: 14, maxR: 130, life: 0, dur: 0.42, color }); }
function addPopup(x, y, text, color) {
  G.popups.push({ x, y, text, life: 0, dur: 0.9, size: text.length > 6 ? 40 : 46, color });
}
function banner(msg) { G.bannerMsg = msg; G.bannerT = 0; }

/* ---------------- update ---------------- */
function update(dt) {
  G.time += dt;
  G.shake *= Math.pow(0.0005, dt);
  if (G.shake < 0.15) G.shake = 0;
  G.flash = Math.max(0, G.flash - dt * 1.8);
  G.bannerT += dt;

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
    else g.r = 14 + (g.maxR - 14) * (g.life / g.dur);
  }
  for (let i = G.popups.length - 1; i >= 0; i--) {
    const p = G.popups[i];
    p.life += dt;
    if (p.life >= p.dur) G.popups.splice(i, 1);
  }

  if (G.state === 'PLAY') {
    G.runT += dt;
    if (G.runT >= RUN_SECONDS) { G.runT = RUN_SECONDS; endRun(); return; }
    const urg = G.runT > RUN_SECONDS - 8 ? 1 : 0;
    Sound.setUrgency(urg);
    if (G.target) {
      if (G.runT - G.target.born >= TARGET_TTL) registerMiss('timeout', G.target.x, G.target.y);
    } else {
      G.spawnDelay -= dt;
      if (G.spawnDelay <= 0) spawnTarget();
    }
  } else if (G.state === 'OVER') {
    G.overT += dt;
    G.displayScore += (G.score - G.displayScore) * Math.min(1, dt * 6);
    if (Math.abs(G.score - G.displayScore) < 1) G.displayScore = G.score;
    if (G.newBest && G.overT < 1.6 && Math.random() < dt * 5) {
      burst(120 + Math.random() * (W - 240), 360 + Math.random() * 420, '#ffd54a', 8);
    }
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
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
function easeOutBack(t) { const k = 1.35; const s = t - 1; return 1 + (k + 1) * s * s * s + k * s * s; }
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
  // breathing grid
  ctx.globalAlpha = 0.04 + 0.02 * Math.sin(G.time * 0.8);
  ctx.strokeStyle = '#00e5ff';
  ctx.lineWidth = 1;
  for (let x = 80; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
  for (let y = 80; y < H; y += 80) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
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

function drawTarget(ctx) {
  const t = G.target;
  if (!t) return;
  const r = targetR();
  const warn = clamp((G.runT - t.born) / TARGET_TTL, 0, 1) > 0.72;
  const main = warn ? '#ff2d95' : '#00e5ff';
  const pulse = 1 + 0.05 * Math.sin(G.time * 14);
  // fake glow: layered wide strokes
  ctx.strokeStyle = main;
  ctx.globalAlpha = 0.14; ctx.lineWidth = 12;
  ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(r * 1.3, 30), 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.3; ctx.lineWidth = 7;
  ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(r * 1.15, 24), 0, Math.PI * 2); ctx.stroke();
  // outer ring
  ctx.globalAlpha = 0.95; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(r * pulse, 6), 0, Math.PI * 2); ctx.stroke();
  // rotating focus arc (keyboard a11y focus cue)
  const a0 = G.time * 3.4;
  ctx.globalAlpha = 0.55; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(r, 22) + 10, a0, a0 + 1.25); ctx.stroke();
  // mid ring + core
  ctx.globalAlpha = 0.7; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(r * 0.68, 5), 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = warn ? '#ff8fc2' : '#a5f3fc';
  ctx.beginPath(); ctx.arc(t.x, t.y, Math.max(r * 0.22, 6), 0, Math.PI * 2); ctx.fill();
  ctx.globalAlpha = 1;
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
    const y = p.y - 60 * easeOutCubic(t);
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

function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }

function drawHUD(ctx) {
  textGlow(ctx, T('score'), W / 2, 52, 20, '#00e5ff');
  textGlow(ctx, fmt(G.score), W / 2, 104, 60, '#00e5ff');
  // timer bar
  const left = clamp(1 - G.runT / RUN_SECONDS, 0, 1);
  const bw = 340, bx = (W - bw) / 2, by = 152;
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  rr(ctx, bx, by, bw, 10, 5); ctx.fill();
  const low = left < 0.27;
  ctx.fillStyle = low ? '#ff2d95' : '#00e5ff';
  if (left > 0) { rr(ctx, bx, by, Math.max(bw * left, 8), 10, 5); ctx.fill(); }
  ctx.font = '700 22px ' + FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = low ? '#ff8fc2' : '#9fb8d8';
  ctx.fillText((RUN_SECONDS - G.runT).toFixed(1) + 's', W / 2, by + 32);
  // best + live rank (top-left)
  ctx.textAlign = 'left';
  ctx.font = '700 24px ' + FONT;
  ctx.fillStyle = '#ffd54d';
  ctx.fillText('★ ' + fmt(G.best.score || 0), 28, 56);
  if (G.hits > 0) {
    const rk = rankOf(curAvg());
    ctx.font = '600 21px ' + FONT;
    ctx.fillStyle = rk.color;
    ctx.fillText(rk.emoji + ' ' + rankName(rk.key), 28, 94);
  }
  // combo capsule (top-right, below pause)
  if (G.combo >= 2) {
    const mult = comboMult(G.combo);
    const colors = { 1: '#cfe9ff', 2: '#39ff88', 3: '#b39dff', 4: '#ffd54a' };
    const col = colors[mult] || '#cfe9ff';
    const bounce = G.time - G.comboTierT < 0.3 ? 1 + 0.18 * Math.sin((G.time - G.comboTierT) * 21) : 1;
    const label = T('combo') + ' ' + G.combo + (mult > 1 ? '  ×' + mult : '');
    ctx.font = '800 24px ' + FONT;
    const tw = ctx.measureText(label).width + 36;
    ctx.save();
    ctx.translate(W - 28 - tw / 2, 136);
    ctx.scale(bounce, bounce);
    ctx.fillStyle = 'rgba(10,10,26,0.72)';
    ctx.strokeStyle = col; ctx.lineWidth = 2.5;
    rr(ctx, -tw / 2, -24, tw, 48, 24); ctx.fill(); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = col;
    ctx.fillText(label, 0, 1);
    ctx.restore();
  }
  // pause button
  ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  ctx.beginPath(); ctx.arc(PAUSE_BTN.x, PAUSE_BTN.y, 30, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  rr(ctx, PAUSE_BTN.x - 9, PAUSE_BTN.y - 10, 6, 20, 2); ctx.fill();
  rr(ctx, PAUSE_BTN.x + 3, PAUSE_BTN.y - 10, 6, 20, 2); ctx.fill();
  // arena frame + counters
  ctx.strokeStyle = '#00e5ff';
  ctx.globalAlpha = 0.14 + 0.05 * Math.sin(G.time * 1.4);
  ctx.lineWidth = 2;
  rr(ctx, ARENA.x0 - 76, ARENA.y0 - 60, (ARENA.x1 - ARENA.x0) + 152, (ARENA.y1 - ARENA.y0) + 120, 26); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.font = '600 22px ' + FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9fb8d8';
  ctx.fillText(T('hits') + ' ' + G.hits + '   ·   ' + T('miss') + ' ' + G.misses, W / 2, H - 36);
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

function modeButton(ctx, btn, main, sub, accent) {
  ctx.fillStyle = 'rgba(0,229,255,0.1)';
  ctx.strokeStyle = accent; ctx.lineWidth = 2.5;
  rr(ctx, btn.x, btn.y, btn.w, btn.h, 22); ctx.fill(); ctx.stroke();
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = '800 32px ' + FONT;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(main, W / 2, btn.y + 36);
  ctx.font = '500 21px ' + FONT;
  ctx.fillStyle = '#9fb8d8';
  ctx.fillText(sub, W / 2, btn.y + 68);
}

function drawTitle(ctx) {
  textGlow(ctx, T('title1'), W / 2, 300, 108, '#00e5ff', 'center', '#00e5ff');
  textGlow(ctx, T('title2'), W / 2, 412, 108, '#ff2d95', 'center', '#ff2d95');
  ctx.globalAlpha = 0.6;
  ctx.font = '500 24px ' + FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9fb8d8';
  ctx.fillText(T('tagline'), W / 2, 492);
  ctx.globalAlpha = 1;

  const b1 = { x: 130, y: 560, w: 460, h: 96 };
  const b2 = { x: 130, y: 692, w: 460, h: 96 };
  modeButton(ctx, b1, '⚡ ' + T('classic'), T('classicSub'), '#00e5ff');
  const dsub = G.daily && G.daily.date === todayStr() && G.daily.done
    ? T('done') + ' · ' + T('todayBest') + ' ' + fmt(G.daily.score) : todayStr() + ' · ' + T('dailySub');
  modeButton(ctx, b2, '📅 ' + T('daily'), dsub, '#7c4dff');

  ctx.font = '700 26px ' + FONT;
  ctx.fillStyle = '#ffd54d';
  ctx.fillText('★ ' + fmt(G.best.score || 0), W / 2 - 110, 828);
  if (G.streak && G.streak.count > 0) {
    ctx.fillStyle = '#ff8fc2';
    ctx.fillText('🔥 ' + G.streak.count + ' ' + T('streak'), W / 2 + 110, 828);
  }
  const pulse = 0.6 + 0.4 * Math.sin(G.time * 3);
  ctx.globalAlpha = 0.45 + 0.55 * pulse;
  textGlow(ctx, T('anyStart'), W / 2, 906, 30, '#22e58c');
  ctx.globalAlpha = 0.5;
  ctx.font = '500 20px ' + FONT;
  ctx.fillStyle = '#9fb8d8';
  ctx.fillText(T('kbHint'), W / 2, 960);
  ctx.globalAlpha = 1;
  drawSoundIcon(ctx, W - 72, H - 84);
  G.hitRegions = [
    { id: 'classic', x: b1.x, y: b1.y, w: b1.w, h: b1.h },
    { id: 'daily', x: b2.x, y: b2.y, w: b2.w, h: b2.h },
    { id: 'snd', x: W - 72 - 34, y: H - 84 - 34, w: 68, h: 68 },
  ];
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
  const a = clamp((G.overT - 0.35) / 0.4, 0, 1);
  if (a <= 0) return;
  ctx.fillStyle = 'rgba(5,5,16,' + 0.74 * a + ')';
  ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  const px = 80, py = 250, pw = W - 160, ph = 760;
  ctx.fillStyle = 'rgba(20,22,48,0.92)';
  ctx.strokeStyle = G.resultRank ? G.resultRank.color : '#7c4dff';
  ctx.lineWidth = 2.5;
  rr(ctx, px, py, pw, ph, 28); ctx.fill(); ctx.stroke();

  textGlow(ctx, T('timeUp'), W / 2, py + 62, 40, '#7c4dff');
  // rank badge
  if (G.resultRank) {
    const rk = G.resultRank;
    const pulse = 1 + 0.05 * Math.sin(G.time * 6);
    ctx.save();
    ctx.translate(W / 2, py + 168); ctx.scale(pulse, pulse);
    textGlow(ctx, rk.emoji + ' ' + rankName(rk.key), 0, 0, 56, rk.color, 'center', rk.color);
    ctx.restore();
  } else {
    textGlow(ctx, T('noHits'), W / 2, py + 168, 30, '#ff2d95');
  }
  // total score (rolls up)
  ctx.globalAlpha = a * 0.55;
  ctx.font = '600 22px ' + FONT;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#9fb8d8';
  ctx.fillText(T('score'), W / 2, py + 246);
  ctx.globalAlpha = a;
  textGlow(ctx, fmt(Math.round(G.displayScore)), W / 2, py + 306, 78, '#00e5ff');
  if (G.newBest) {
    const pulse = 1 + 0.08 * Math.sin(G.time * 8);
    ctx.save(); ctx.translate(W / 2, py + 380); ctx.scale(pulse, pulse);
    textGlow(ctx, T('newBest'), 0, 0, 34, '#ffd54d');
    ctx.restore();
  }
  // stat rows
  const avg = curAvg();
  const rows = [
    [T('avgMs'), G.hits ? avg + 'ms' : '—'],
    [T('bestSingle'), G.hits ? G.bestSingleMs + 'ms' : '—'],
    [T('maxCombo'), '×' + G.maxCombo],
    [T('hitsLabel'), String(G.hits)],
  ];
  ctx.font = '600 25px ' + FONT;
  rows.forEach(([k, v], i) => {
    const y = py + 438 + i * 44;
    ctx.textAlign = 'left'; ctx.fillStyle = '#9fb8d8';
    ctx.fillText(k, px + 70, y);
    ctx.textAlign = 'right'; ctx.fillStyle = '#ffffff';
    ctx.fillText(v, px + pw - 70, y);
  });
  // next-rank ladder line
  ctx.textAlign = 'center';
  ctx.font = '500 21px ' + FONT;
  if (G.nextRankInfo) {
    ctx.fillStyle = G.nextRankInfo.r.color;
    const msg = T('nextRank').replace('{r}', G.nextRankInfo.r.emoji + ' ' + rankName(G.nextRankInfo.r.key)).replace('{n}', String(G.nextRankInfo.ms));
    ctx.fillText(msg, W / 2, py + 632);
  } else if (G.resultRank && G.resultRank.key === 'legend') {
    ctx.fillStyle = '#ffd54d';
    ctx.fillText(T('topRank'), W / 2, py + 632);
  }
  if (G.mode === 'daily' && G.streak && G.streak.count > 0) {
    ctx.fillStyle = '#ff8fc2';
    ctx.fillText('🔥 ' + G.streak.count + ' ' + T('streak'), W / 2, py + 666);
  }
  // buttons
  const shareB = { x: 130, y: py + 700, w: 460, h: 72 };
  ctx.fillStyle = 'rgba(255,213,74,0.14)';
  ctx.strokeStyle = '#ffd54d'; ctx.lineWidth = 2.5;
  rr(ctx, shareB.x, shareB.y, shareB.w, shareB.h, 20); ctx.fill(); ctx.stroke();
  ctx.font = '800 28px ' + FONT;
  ctx.fillStyle = '#ffd54d';
  ctx.fillText('🔗 ' + T('share'), W / 2, shareB.y + shareB.h / 2 + 1);
  const rb = { x: 130, y: shareB.y + 88, w: 220, h: 68 };
  const mb = { x: W - 130 - 220, y: shareB.y + 88, w: 220, h: 68 };
  for (const [b, label] of [[rb, T('retry')], [mb, T('menu')]]) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
    rr(ctx, b.x, b.y, b.w, b.h, 18); ctx.stroke();
    ctx.font = '700 25px ' + FONT;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(label, b.x + b.w / 2, b.y + b.h / 2 + 1);
  }
  ctx.globalAlpha = 1;
  // NEW BEST gold sweep
  if (G.newBest && G.overT < 2.2) {
    const sw = clamp((G.overT - 0.5) / 1.4, 0, 1);
    const gx = px - 60 + (pw + 120) * easeOutCubic(sw);
    const g = ctx.createLinearGradient(gx - 90, 0, gx + 90, 0);
    g.addColorStop(0, 'rgba(255,213,74,0)');
    g.addColorStop(0.5, 'rgba(255,213,74,' + 0.35 * (1 - sw * 0.6) + ')');
    g.addColorStop(1, 'rgba(255,213,74,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px, py, pw, ph);
  }
  G.hitRegions = [
    { id: 'share', x: shareB.x, y: shareB.y, w: shareB.w, h: shareB.h },
    { id: 'retry', x: rb.x, y: rb.y, w: rb.w, h: rb.h },
    { id: 'menu', x: mb.x, y: mb.y, w: mb.w, h: mb.h },
  ];
}

function drawBanner(ctx) {
  if (G.bannerT < 1.4) {
    const t = G.bannerT;
    const a = t < 1.0 ? 1 : 1 - (t - 1.0) / 0.4;
    const sc = t < 0.15 ? easeOutBack(t / 0.15) : 1;
    ctx.save();
    ctx.translate(W / 2, 240);
    ctx.scale(sc, sc);
    ctx.globalAlpha = a;
    textGlow(ctx, G.bannerMsg, 0, 0, 40, '#ffd54d');
    ctx.restore();
    ctx.globalAlpha = 1;
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
    drawParticles(ctx);
    drawTarget(ctx);
    drawPopups(ctx);
    drawHUD(ctx);
    if (G.state === 'PAUSE') drawPause(ctx);
    if (G.state === 'OVER') drawOver(ctx);
  }
  drawBanner(ctx);
  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,250,230,' + (G.flash * 0.5) + ')';
    ctx.fillRect(-40, -40, W + 80, H + 80);
  }
  ctx.restore();
}

/* ---------------- share ---------------- */
function shareText() {
  const avg = curAvg();
  const rk = G.resultRank;
  const rkLabel = rk ? rk.emoji + rankName(rk.key) : T('rank_bronze');
  let s = G.mode === 'daily' ? T('dailyShare') : T('shareText');
  return s.replace('{s}', fmt(G.score)).replace('{m}', String(avg)).replace('{r}', rkLabel).replace('{d}', todayStr());
}

function renderShareCard() {
  const cv = document.createElement('canvas');
  cv.width = 720; cv.height = 900;
  const c = cv.getContext('2d');
  const g = c.createLinearGradient(0, 0, 0, 900);
  g.addColorStop(0, '#0d0d24'); g.addColorStop(1, '#080814');
  c.fillStyle = g; c.fillRect(0, 0, 720, 900);
  c.strokeStyle = '#00e5ff'; c.globalAlpha = 0.12; c.lineWidth = 2;
  for (let x = 60; x < 720; x += 60) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, 900); c.stroke(); }
  c.globalAlpha = 1;
  const rk = G.resultRank;
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = '800 54px ' + FONT;
  c.fillStyle = '#00e5ff'; c.fillText('REFLEX', 360, 96);
  c.fillStyle = '#ff2d95'; c.fillText('RUSH', 360, 160);
  c.font = '600 26px ' + FONT; c.fillStyle = '#9fb8d8';
  c.fillText(todayStr() + (G.mode === 'daily' ? ' · DAILY' : ''), 360, 226);
  c.font = '800 110px ' + FONT; c.fillStyle = '#ffffff';
  c.fillText(fmt(G.score), 360, 350);
  c.font = '600 26px ' + FONT; c.fillStyle = '#9fb8d8';
  c.fillText(T('score'), 360, 424);
  c.font = '800 52px ' + FONT; c.fillStyle = '#ffd54a';
  c.fillText(curAvg() + 'ms', 360, 506);
  c.font = '600 24px ' + FONT; c.fillStyle = '#9fb8d8';
  c.fillText(T('avgMs'), 360, 552);
  if (rk) {
    c.font = '800 56px ' + FONT; c.fillStyle = rk.color;
    c.fillText(rk.emoji + ' ' + rankName(rk.key), 360, 646);
  }
  c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(120, 720); c.lineTo(600, 720); c.stroke();
  c.font = '500 26px ' + FONT; c.fillStyle = '#cfe9ff';
  c.fillText('seyrs1985.github.io/neonplay', 360, 770);
  c.font = '500 22px ' + FONT; c.fillStyle = '#9fb8d8';
  c.fillText(T('tagline'), 360, 830);
  return cv;
}

async function doShare() {
  let shared = false;
  let card = null;
  try {
    card = renderShareCard();
    G.cardURL = card.toDataURL('image/png');
  } catch (e) { /* card generation must never break sharing */ }
  const text = shareText();
  try {
    if (navigator.share) {
      if (card && navigator.canShare) {
        const blob = await new Promise(r => card.toBlob(r, 'image/png'));
        if (blob) {
          const file = new File([blob], 'reflex-rush.png', { type: 'image/png' });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({ files: [file], title: 'Reflex Rush', text, url: SITE_URL });
            shared = true;
          }
        }
      }
      if (!shared) {
        await navigator.share({ title: 'Reflex Rush', text: text + ' ' + SITE_URL });
        shared = true;
      }
    }
  } catch (e) { /* cancel or unsupported — fall through to clipboard */ }
  if (!shared) {
    try {
      await navigator.clipboard.writeText(text + ' ' + SITE_URL);
      banner(T('copied'));
    } catch (e) { banner(T('copyFail')); }
  }
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
    const mode = h && h.id === 'daily' ? 'daily' : 'classic';
    startRun(mode);
    Sound.sfx.start();
    Sound.startMusic();
    return;
  }
  if (G.state === 'PLAY') {
    const dx = lx - PAUSE_BTN.x, dy = ly - PAUSE_BTN.y;
    if (dx * dx + dy * dy < 44 * 44) { G.state = 'PAUSE'; Sound.sfx.click(); return; }
    if (G.target) {
      const t = G.target;
      const d2 = (lx - t.x) * (lx - t.x) + (ly - t.y) * (ly - t.y);
      const hr = hitRadius();
      if (d2 <= hr * hr) { registerHit(); return; }
      registerMiss('blank', lx, ly); // accuracy is part of the game
    } else {
      registerMiss('blank', lx, ly);
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
    if (G.overT < 0.5) return;
    const h = hitAt(lx, ly);
    if (!h) return;
    if (h.id === 'retry') { startRun(G.mode); Sound.sfx.start(); Sound.startMusic(); }
    else if (h.id === 'menu') { toTitle(); Sound.sfx.click(); }
    else if (h.id === 'share') { Sound.sfx.click(); doShare(); }
    return;
  }
}

// keyboard accessibility: Enter/Space strikes the current target
function keyboardHit() {
  if (G.state !== 'PLAY') return false;
  if (G.target) { registerHit(); return true; }
  return false;
}

/* ---------------- deterministic + QA hooks ---------------- */
window.__qaState = () => ({
  state: G.state, mode: G.mode,
  score: G.score, timeLeft: Math.max(0, RUN_SECONDS - G.runT),
  hits: G.hits, misses: G.misses, combo: G.combo, maxCombo: G.maxCombo,
  mult: comboMult(G.combo), lastMs: G.lastMs, avgMs: curAvg(),
  bestSingleMs: G.bestSingleMs, rank: G.resultRank ? G.resultRank.key : null,
  liveRank: G.hits ? rankOf(curAvg()).key : null,
  newBest: G.newBest, best: G.best.score || 0,
  streak: G.streak ? G.streak.count : 0,
  dailyDone: !!(G.daily && G.daily.date === todayStr() && G.daily.done),
  top10n: lsGet(K.top10, []).length,
  games: lsGet(K.stats, { games: 0 }).games || 0,
  targetAlive: !!G.target,
  tx: G.target ? Math.round(G.target.x) : null,
  ty: G.target ? Math.round(G.target.y) : null,
  tr: G.target ? Math.round(hitRadius()) : null,
  lastPopup: G.popups.length ? G.popups[G.popups.length - 1].text : null,
  msPopup: (() => { for (let i = G.popups.length - 1; i >= 0; i--) if (G.popups[i].text.indexOf('ms') >= 0) return G.popups[i].text; return null; })(),
  cardURLLen: G.cardURL ? G.cardURL.length : 0,
});
// first N daily target coordinates (pure function of the UTC date seed)
window.__qaDailySeq = dailySeq;
// step the engine synchronously (deterministic tests / fast-forward)
window.__qaFF = (sec) => {
  const steps = Math.round(sec * 60);
  for (let i = 0; i < steps; i++) update(1 / 60);
};

(function () {
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
  Math.random = srand;

  initStars();
  loadStorage();

  if (autotest) {
    const results = {};
    // clean slate (only our own keys)
    for (const k of Object.values(K)) { try { localStorage.removeItem(k); } catch (e) {} }
    loadStorage();
    try {
      // 1) score formula + combo tiers
      results.scoreFormula = hitScore(250, 1) === 50 && hitScore(450, 1) === 10 && hitScore(700, 1) === 10 && hitScore(250, 3) === 150;
      results.comboTiers = comboMult(1) === 1 && comboMult(2) === 1 && comboMult(3) === 2 && comboMult(5) === 2 &&
        comboMult(6) === 3 && comboMult(9) === 3 && comboMult(10) === 4 && comboMult(30) === 4;

      // 2) rank thresholds (229.9=Master, 230=Diamond ...)
      results.rankBounds = rankOf(150).key === 'legend' && rankOf(199.9).key === 'legend' &&
        rankOf(200).key === 'master' && rankOf(229.9).key === 'master' && rankOf(230).key === 'diamond' &&
        rankOf(260).key === 'platinum' && rankOf(290).key === 'gold' && rankOf(330).key === 'silver' &&
        rankOf(400).key === 'bronze' && rankOf(999).key === 'bronze';

      // 3) daily determinism: same seed → same sequence, twice
      const s1 = dailySeq(5), s2 = dailySeq(5);
      results.dailySeqDeterministic = JSON.stringify(s1) === JSON.stringify(s2) && s1.length === 5 &&
        s1.every(p => p.x >= ARENA.x0 && p.x <= ARENA.x1 && p.y >= ARENA.y0 && p.y <= ARENA.y1);

      // 4) live loop: start → spawn → hit → combo popup
      startRun('classic');
      window.__qaFF(1.0); // spawn happens within ~0.4s
      results.spawnWorks = !!G.target;
      const ms0 = G.lastMs;
      registerHit();
      results.hitRecordsMs = G.hits === 1 && G.lastMs >= 1 && G.lastMs !== ms0 && G.score > 0;
      // timeout path: let the next target expire untouched
      window.__qaFF(0.8);
      if (G.target) window.__qaFF(TARGET_TTL + 0.6);
      results.timeoutMiss = G.misses >= 1 && G.combo === 0;

      // 5) blank tap = miss
      startRun('classic');
      window.__qaFF(0.8);
      const m0 = G.misses;
      onPress(60, 1200); // far corner, no target there by bounds
      results.blankTapMiss = G.misses === m0 + 1 && G.combo === 0;

      // 6) full run end-to-end (classic)
      startRun('classic');
      let guard = 0;
      while (G.state === 'PLAY' && guard++ < 400) {
        if (G.target && G.runT - G.target.born > 0.12) registerHit();
        window.__qaFF(0.1);
      }
      results.fullRunEnds = G.state === 'OVER' && G.hits >= 5;
      results.overFields = !!G.resultRank && curAvg() > 0 && G.score > 0;
      const keysAfter = Object.values(K).filter(k => { try { return localStorage.getItem(k) !== null; } catch (e) { return false; } });
      results.classicPersist = keysAfter.includes(K.best) && keysAfter.includes(K.top10) &&
        keysAfter.includes(K.stats) && keysAfter.includes(K.weekly) && !keysAfter.includes(K.daily);
      const st = lsGet(K.stats, {});
      results.statsCount = (st.games || 0) >= 1 && (st.hits || 0) >= 5;
      const wk = lsGet(K.weekly, {});
      results.weeklyKey = wk.weekKey === weekKey(todayStr());

      // 7) daily run stamps + streak
      startRun('daily');
      guard = 0;
      while (G.state === 'PLAY' && guard++ < 400) {
        if (G.target && G.runT - G.target.born > 0.12) registerHit();
        window.__qaFF(0.1);
      }
      const d = lsGet(K.daily, {});
      results.dailyStamp = d.date === todayStr() && d.done === true && d.score > 0;
      results.streakStart = (lsGet(K.streak, {}).count || 0) === 1;

      // 8) streak ladder: yesterday → +1; 2-day gap burns the makeup card; longer gap → reset
      const t = todayStr();
      const mk = off => {
        const dt = new Date();
        dt.setUTCDate(dt.getUTCDate() - off);
        return dt.getUTCFullYear() + '-' + ('0' + (dt.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + dt.getUTCDate()).slice(-2);
      };
      lsSet(K.streak, { count: 3, last: mk(1), best: 3, protect: 1 });
      let sk = updateStreak(t);
      results.streakConsecutive = sk.count === 4;
      lsSet(K.streak, { count: 4, last: mk(2), best: 4, protect: 1 });
      sk = updateStreak(t);
      results.streakProtectCard = sk.count === 5 && sk.protect === 0;
      lsSet(K.streak, { count: 5, last: mk(2), best: 5, protect: 0 });
      sk = updateStreak(t);
      results.streakBreak = sk.count === 1;
      lsSet(K.streak, { count: 2, last: mk(40), best: 2, protect: 0 });
      sk = updateStreak(t);
      results.streakMonthlyCard = sk.protect === 1; // new month replenishes the card

      // 9) share card renders with content (non-blank canvas + link)
      G.resultRank = G.resultRank || rankOf(250);
      const card = renderShareCard();
      const data = card.getContext('2d').getImageData(0, 0, 720, 900).data;
      let nonBg = 0;
      for (let i = 0; i < data.length; i += 400) {
        if (data[i] > 40 || data[i + 1] > 40 || data[i + 2] > 60) nonBg++;
      }
      const url2 = card.toDataURL('image/png');
      results.shareCardRenders = nonBg > 50 && url2.length > 8000;
      results.shareTextHasLink = (shareText().length > 10);

      // 10) keyboard accessibility can finish a run
      startRun('classic');
      guard = 0;
      while (G.state === 'PLAY' && guard++ < 400) {
        if (G.target && G.runT - G.target.born > 0.12) keyboardHit();
        window.__qaFF(0.1);
      }
      results.keyboardRun = G.state === 'OVER' && G.hits >= 5;

      // 11) pause + resume + title roundtrip
      startRun('classic');
      G.state = 'PAUSE';
      const tl = RUN_SECONDS - G.runT;
      window.__qaFF(2);
      results.pauseFreezes = Math.abs((RUN_SECONDS - G.runT) - tl) < 0.001;
      G.state = 'PLAY';
      toTitle();
      results.titleRoundtrip = G.state === 'TITLE';
    } catch (e) {
      results.exception = String(e && e.stack || e);
    }
    results.consoleErrors = consoleErrCount;
    results.allPass = Object.keys(results).every(k => k === 'consoleErrors' ? results[k] === 0 : results[k] !== false);
    window.__autotest = results;
    try { document.title = 'AUTOTEST:' + JSON.stringify(results); } catch (e) {}
    return;
  }

  // ---- staged screenshots (?shot=title|play|over) ----
  setTimeout(() => {
    try {
      initStars();
      loadStorage();
      if (mode === 'title') {
        G.state = 'TITLE'; G.time = 2.4;
      } else if (mode === 'play') {
        startRun('classic');
        window.__qaFF(parseFloat(q.get('t') || '3') || 3);
        if (!G.target && G.state === 'PLAY') window.__qaFF(0.6);
        if (G.target) registerHit();
        G.combo = 4; G.comboTier = 2; // show the combo capsule
      } else if (mode === 'over') {
        startRun('daily');
        let guard = 0;
        while (G.state === 'PLAY' && guard++ < 400) {
          if (G.target && G.runT - G.target.born > 0.12) registerHit();
          window.__qaFF(0.1);
        }
        G.overT = 1.2; G.displayScore = G.score;
      }
      G.shake = 0; G.flash = 0;
      window.__qaFreeze = true;
      setTimeout(() => {
        G.shake = 0; G.flash = 0;
        if (mode === 'over') G.overT = 1.2;
        window.__qaRender && window.__qaRender();
        try { document.title = 'SHOT:' + (window.__stageErr || 'ok'); } catch (e) {}
      }, 40);
    } catch (e) {
      window.__stageErr = String(e && e.stack || e);
      try { document.title = 'SHOT:' + window.__stageErr; } catch (e2) {}
    }
  }, 0);
})();
