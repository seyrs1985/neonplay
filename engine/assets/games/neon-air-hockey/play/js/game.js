/* Neon Air Hockey — game core: state machine / puck physics / AI / juice / render */
'use strict';

/* ---------------- constants ---------------- */
const W = 480, H = 800;
const TABLE = { x0: 0, y0: 40, x1: W, y1: 760 };   // 480×720 vertical table
const MID = 400;                                    // center line
const GOAL_HALF = 80;                               // goal mouth 160px wide
const GOAL_L = W / 2 - GOAL_HALF, GOAL_R = W / 2 + GOAL_HALF;
const POST_R = 9;                                   // goal post collision circles
const PUCK_R = 20, MAL_R = 36;
const PUCK_MAXV = 1400;                             // px/s speed cap (anti-tunnel)
const PUCK_FRIC = 0.995;                            // per 1/60s frame
const WALL_E = 0.92;                                // wall restitution
const SUB_DT = 1 / 240;                             // physics substep (tunnel guard)
const MAL_HUMAN_V = 2000;                           // human mallet speed cap (anti-teleport)
const WIN_SCORE = 7, DAILY_WIN = 5;
const AI_LEVELS = {
  easy:   { speed: 430, err: 46, aggr: 0.5,  react: 5.0, predict: 0 },
  normal: { speed: 600, err: 26, aggr: 0.72, react: 7.5, predict: 0.55 },
  hard:   { speed: 800, err: 10, aggr: 0.95, react: 10.5, predict: 1 },
};
const MAX_PARTICLES = 260;
const sfxCd = { hit: 0, wall: 0 }; // per-frame sound cooldowns (240Hz substep spam guard)

/* physics exposed for QA scripts (authoritative, single source) */
window.__PHYS = { W, H, TABLE, MID, GOAL_HALF, GOAL_L, GOAL_R, POST_R, PUCK_R, MAL_R,
  PUCK_MAXV, PUCK_FRIC, WALL_E, SUB_DT, MAL_HUMAN_V, WIN_SCORE, DAILY_WIN };

const C = {
  bg: '#0a0a18', cyan: '#00e5ff', violet: '#7c4dff', pink: '#ff2d95',
  green: '#39ff88', red: '#ff5470', gold: '#ffd54a', puck: '#f4f6ff',
  ink: '#e8ecff', dim: 'rgba(232,236,255,0.55)', panel: 'rgba(16,18,40,0.88)',
};

/* ---------------- i18n ---------------- */
var NP_L = {
  en: {
    title: 'NEON AIR HOCKEY', tagline: 'one phone, two players — first to 7 wins',
    vsEasy: 'VS EASY AI', vsNormal: 'VS NORMAL AI', vsHard: 'VS HARD AI',
    twoP: '2P SAME SCREEN', twoPTag: 'two thumbs, one phone',
    daily: 'DAILY AI', dailyTag: 'same seeded AI worldwide · first to 5',
    hintDrag: 'Drag inside your half — mallet speed = shot power',
    hintKbd: '←→↑↓ your mallet · WASD player 2 · Space serve · P pause · M mute',
    you: 'YOU', ai: 'AI', p2: 'P2', easy: 'EASY AI', normal: 'NORMAL AI', hard: 'HARD AI',
    goal: 'GOAL!', paused: 'PAUSED', resume: 'RESUME', menu: 'MENU',
    retry: 'REMATCH', share: 'SHARE', win: 'YOU WIN!', lose: 'YOU LOSE',
    rank: 'RANK', nextRank: 'next rank', best: 'BEST', streak: 'STREAK', days: 'd',
    goalsFor: 'goals for', goalsAgainst: 'against', shutouts: 'shutouts',
    copied: 'Result copied — paste it anywhere!', copyFail: 'Could not copy — long-press the card',
    dailyDone: 'Daily result saved', comeBack: 'come back tomorrow for a new AI',
    combo: 'COMBO', ready: 'GET READY', dailyChip: 'same AI worldwide', firstTo: 'first to',
    ranksBronze: 'Bronze', ranksSilver: 'Silver', ranksGold: 'Gold', ranksPlatinum: 'Platinum',
    ranksDiamond: 'Diamond', ranksMaster: 'Master', ranksLegend: 'Legend',
    condLegend: 'shut out Hard AI 7:0', condMaster: 'beat Hard AI once',
    condDiamond: '3 shutout wins vs Normal', condPlatinum: '5 wins vs Normal',
    condGold: '3 shutout wins vs Easy', condSilver: '3 wins vs Easy', condBronze: 'finish 1 match',
  },
  zh: {
    title: '霓虹冰球', tagline: '一台手机，两人开战 —— 先进 7 球赢',
    vsEasy: '单人·简单 AI', vsNormal: '单人·普通 AI', vsHard: '单人·困难 AI',
    twoP: '双人同屏', twoPTag: '一台手机 两根手指',
    daily: '每日 AI 挑战', dailyTag: '全球同一套 AI · 5 球制',
    hintDrag: '在本方半场拖动击球器——拖得越快打得越狠',
    hintKbd: '←→↑↓ 移动击球器 · WASD 二号位 · 空格发球 · P 暂停 · M 静音',
    you: '你', ai: 'AI', p2: '二号位', easy: '简单 AI', normal: '普通 AI', hard: '困难 AI',
    goal: '进球！', paused: '已暂停', resume: '继续', menu: '回主页',
    retry: '再来一把', share: '分享', win: '你赢了！', lose: '你输了',
    rank: '段位', nextRank: '距下一段位', best: '最高', streak: '连胜', days: '天',
    goalsFor: '总进球', goalsAgainst: '总失球', shutouts: '零封',
    copied: '成绩已复制，去粘贴吧！', copyFail: '复制失败，请长按成绩卡',
    dailyDone: '每日成绩已保存', comeBack: '明天来挑战新的 AI',
    combo: '连击', ready: '准备', dailyChip: '全球同参数', firstTo: '先到',
    ranksBronze: '青铜', ranksSilver: '白银', ranksGold: '黄金', ranksPlatinum: '白金',
    ranksDiamond: '钻石', ranksMaster: '大师', ranksLegend: '传奇',
    condLegend: '7:0 零封困难 AI', condMaster: '击败一次困难 AI',
    condDiamond: '零封普通 AI ×3', condPlatinum: '击败普通 AI ×5',
    condGold: '零封简单 AI ×3', condSilver: '击败简单 AI ×3', condBronze: '完成 1 场',
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
function round2(v) { return Math.round(v * 100) / 100; }

/* ---------------- seeded daily AI (mulberry32 on UTC date) ---------------- */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function utcDate(d) { return (d || new Date()).toISOString().slice(0, 10); }
function dayShift(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
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
const DAILY_COLS = [
  ['#00e5ff', '#ff2d95'], ['#39ff88', '#7c4dff'], ['#ffd54a', '#00e5ff'], ['#ff2d95', '#39ff88'],
];
// every player worldwide faces this exact AI today (UTC date seed)
function buildDaily(dateStr) {
  const seed = (parseInt(dateStr.replace(/-/g, ''), 10) >>> 0) || 1;
  const r = mulberry32(seed);
  const speed = Math.round(430 + r() * 380);        // 430..810 px/s
  const err = round1(8 + r() * 52);                 // aim wobble px
  const aggr = round2(0.35 + r() * 0.55);           // attack appetite
  const cols = DAILY_COLS[Math.floor(r() * DAILY_COLS.length)];
  const d = new Date(dateStr + 'T00:00:00Z');
  const dayN = Math.floor((d - Date.UTC(d.getUTCFullYear(), 0, 0)) / 86400000); // day of year
  const level = speed >= 680 ? 'hard' : (speed >= 530 ? 'normal' : 'easy');
  return { date: dateStr, dayN, speed, err, aggr, react: 6 + round2(r() * 4), predict: round2(r()), cols, level };
}

/* ---------------- ranks (anchored to beaten AI level, lifetime) ---------------- */
const RANKS = [
  { key: 'legend', emoji: '🏆', cond: 'condLegend' },
  { key: 'master', emoji: '🥇', cond: 'condMaster' },
  { key: 'diamond', emoji: '💎', cond: 'condDiamond' },
  { key: 'platinum', emoji: '🥈', cond: 'condPlatinum' },
  { key: 'gold', emoji: '🟡', cond: 'condGold' },
  { key: 'silver', emoji: '⚪', cond: 'condSilver' },
  { key: 'bronze', emoji: '🟤', cond: 'condBronze' },
];
function rankIdx(k) { const i = RANKS.findIndex(r => r.key === k); return i < 0 ? RANKS.length : i; }
function computeRank(b) {
  if (!b) return null;
  if (b.legend) return 'legend';
  if (b.winsVsHard >= 1) return 'master';
  if (b.shutNormal >= 3) return 'diamond';
  if (b.winsVsNormal >= 5) return 'platinum';
  if (b.shutEasy >= 3) return 'gold';
  if (b.winsVsEasy >= 3) return 'silver';
  if (b.games >= 1) return 'bronze';
  return null;
}
function rankInfo(key) {
  const i = RANKS.findIndex(r => r.key === key);
  if (i < 0) return null;
  const r = RANKS[i];
  const next = i > 0 ? RANKS[i - 1] : null;
  return {
    key: r.key, emoji: r.emoji, min: 0,
    name: T('ranks' + r.key[0].toUpperCase() + r.key.slice(1)),
    condKey: r.cond,
    cond: T(r.cond),
    nextKey: next ? next.key : null,
    nextCond: next ? T(next.cond) : null,
  };
}

/* ---------------- storage (design key table — no unlisted keys) ---------------- */
const K_BEST = 'np_neon-air-hockey_best', K_TOP10 = 'np_neon-air-hockey_top10', K_DAILY = 'np_neon-air-hockey_daily',
      K_STREAK = 'np_neon-air-hockey_streak', K_STATS = 'np_neon-air-hockey_stats', K_WEEKLY = 'np_neon-air-hockey_weekly',
      K_BADGES = 'np_neon-air-hockey_badges', K_SETTINGS = 'np_neon-air-hockey_settings';
const SAVE_KEYS = [K_BEST, K_TOP10, K_DAILY, K_STREAK, K_STATS, K_WEEKLY, K_BADGES, K_SETTINGS];
function lsGet(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

const SAVE = {
  best: { rank: null, games: 0, winsVsEasy: 0, winsVsNormal: 0, winsVsHard: 0, shutEasy: 0, shutNormal: 0, legend: 0, date: '' },
  top10: [], daily: { date: '', diff: 0, done: false },
  streak: { count: 0, last: '', best: 0, protect: 1, pmonth: '' },
  stats: { games: 0, wins: 0, goalsFor: 0, goalsAgainst: 0, shutouts: 0 },
  weekly: { weekKey: '', wins: 0 },
  badges: [],
};
function loadStorage() {
  const b = lsGet(K_BEST, null); if (b && typeof b === 'object') SAVE.best = Object.assign(SAVE.best, b);
  const t = lsGet(K_TOP10, null); if (Array.isArray(t)) SAVE.top10 = t;
  const d = lsGet(K_DAILY, null); if (d && typeof d === 'object') SAVE.daily = d;
  const s = lsGet(K_STREAK, null); if (s && typeof s === 'object') SAVE.streak = Object.assign(SAVE.streak, s);
  const st = lsGet(K_STATS, null); if (st && typeof st === 'object') SAVE.stats = Object.assign(SAVE.stats, st);
  const wk = lsGet(K_WEEKLY, null); if (wk && typeof wk === 'object') SAVE.weekly = Object.assign(SAVE.weekly, wk);
  const bd = lsGet(K_BADGES, null); if (Array.isArray(bd)) SAVE.badges = bd;
}
function refillProtect(streak, today) {
  const m = today.slice(0, 7);
  if (streak.pmonth !== m) { streak.pmonth = m; streak.protect = 1; }
  return streak;
}
// winning the daily challenge marks the day: +1 streak (mulligan card covers a 1-day gap)
function markDailyDone(today) {
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
function dailyLevel() { return G.ai && G.ai.level ? G.ai.level : 'normal'; }
function oppKey() { return G.mode === '2p' ? 'p2' : G.mode; }
function grantBadge(id) { if (SAVE.badges.indexOf(id) < 0) SAVE.badges.push(id); }
function persistMatch() {
  const today = utcDate();
  const won = G.scoreUs > G.scoreThem;
  const shut = won && G.scoreThem === 0;
  const b = SAVE.best;
  b.games += 1;
  if (G.mode !== '2p') {
    const lvl = G.mode === 'daily' ? dailyLevel() : G.mode;
    if (won) {
      if (lvl === 'hard') { b.winsVsHard += 1; if (shut) b.legend = 1; }
      else if (lvl === 'normal') { b.winsVsNormal += 1; if (shut) b.shutNormal += 1; }
      else if (lvl === 'easy') { b.winsVsEasy += 1; if (shut) b.shutEasy += 1; }
    }
  }
  const rk = computeRank(b);
  if (rk && rankIdx(rk) < rankIdx(b.rank || 'zz')) { b.rank = rk; G.rankUp = rankInfo(rk); }
  b.date = today;
  SAVE.stats.games += 1;
  if (won) SAVE.stats.wins += 1;
  SAVE.stats.goalsFor += G.scoreUs;
  SAVE.stats.goalsAgainst += G.scoreThem;
  if (shut) SAVE.stats.shutouts += 1;
  SAVE.top10.push({ opp: oppKey(), scoreUs: G.scoreUs, scoreThem: G.scoreThem, date: today });
  SAVE.top10.sort((a, b2) => ((b2.scoreUs - b2.scoreThem) - (a.scoreUs - a.scoreThem)) || (b2.scoreUs - a.scoreUs));
  SAVE.top10 = SAVE.top10.slice(0, 10);
  const wk = isoWeekKey(today);
  if (SAVE.weekly.weekKey !== wk) SAVE.weekly = { weekKey: wk, wins: 0 };
  if (won) SAVE.weekly.wins += 1;
  // badges (design R1 set)
  if (won) grantBadge('first_win');
  if (shut) grantBadge('shutout');
  if (SAVE.weekly.wins >= 3) grantBadge('wins3');
  if (won && G.mode === 'normal') grantBadge('beat_normal');
  if (won && G.mode === 'hard') grantBadge('beat_hard');
  if (b.legend) grantBadge('legend_shut');
  if (won && G.mode === 'daily') grantBadge('daily_first');
  if (SAVE.stats.goalsFor >= 100) grantBadge('goals100');
  if (G.mode === 'daily') {
    if (SAVE.daily.date !== today) SAVE.daily = { date: today, diff: 0, done: false };
    if (won) {
      SAVE.daily.done = true;
      SAVE.daily.diff = Math.max(SAVE.daily.diff, G.scoreUs - G.scoreThem);
      markDailyDone(today);
    }
    lsSet(K_DAILY, SAVE.daily);
  }
  lsSet(K_BEST, SAVE.best);
  lsSet(K_TOP10, SAVE.top10);
  lsSet(K_STATS, SAVE.stats);
  lsSet(K_WEEKLY, SAVE.weekly);
  lsSet(K_BADGES, SAVE.badges);
}
function autosave() {
  const today = utcDate(), wk = isoWeekKey(today);
  if (SAVE.weekly.weekKey !== wk) SAVE.weekly = { weekKey: wk, wins: 0 };
  lsSet(K_WEEKLY, SAVE.weekly);
  lsSet(K_STATS, SAVE.stats);
}

/* ---------------- state ---------------- */
function mkMallet(y, minY, maxY, col) {
  return { x: W / 2, y, tx: W / 2, ty: y, vx: 0, vy: 0, minY, maxY, col, pointerId: null };
}
const G = {
  state: 'TITLE', mode: 'easy', ai: AI_LEVELS.normal, winScore: WIN_SCORE,
  time: 0, countT: 0, goalT: 0, overT: 0, autosaveT: 0,
  scoreUs: 0, scoreThem: 0, comboUs: 0, comboThem: 0, conceded: 'us', firstServe: true,
  won: false, rankUp: null, lastEvent: '',
  puck: { x: W / 2, y: MID + 130, vx: 0, vy: 0, trail: [] },
  p1: mkMallet(TABLE.y1 - 150, MID, TABLE.y1 - MAL_R, C.cyan),
  p2: mkMallet(TABLE.y0 + 150, TABLE.y0 + MAL_R, MID, C.violet),
  kb: { x: 0, y: 0, idleT: 9 }, kb2: { x: 0, y: 0, idleT: 9 },
  particles: [], popups: [], banners: [],
  shake: 0, flash: 0, goalFlash: 0, goalFlashSide: '',
  toast: '', toastT: 0, hitRegions: [], stars: [], goalFxEver: 0,
};
function initAmbient() {
  G.stars = [];
  for (let i = 0; i < 60; i++) G.stars.push({ x: rnd(0, W), y: rnd(0, H), r: rnd(0.6, 2), p: rnd(0, 6.28) });
}

/* ---------------- run control ---------------- */
function startRun(mode) {
  G.mode = (mode === 'normal' || mode === 'hard' || mode === '2p' || mode === 'daily') ? mode : 'easy';
  G.ai = G.mode === 'daily' ? buildDaily(utcDate()) :
    (G.mode === '2p' ? AI_LEVELS.normal : AI_LEVELS[G.mode]);
  G.winScore = G.mode === 'daily' ? DAILY_WIN : WIN_SCORE;
  G.scoreUs = 0; G.scoreThem = 0; G.comboUs = 0; G.comboThem = 0;
  G.conceded = 'us'; G.firstServe = true; G.lastEvent = ''; G.rankUp = null;
  G.p1 = mkMallet(TABLE.y1 - 150, MID, TABLE.y1 - MAL_R, C.cyan);
  G.p2 = mkMallet(TABLE.y0 + 150, TABLE.y0 + MAL_R, MID,
    G.mode === '2p' ? C.gold : (G.mode === 'daily' ? G.ai.cols[0] : C.violet));
  G.particles = []; G.popups = []; G.banners = [];
  G.shake = 0; G.flash = 0; G.goalFlash = 0; G.overT = 0; G.autosaveT = 0;
  G.kb.idleT = 9; G.kb2.idleT = 9;
  serve();
}
function serve() {
  const pk = G.puck;
  const m = G.conceded === 'us' ? G.p1 : G.p2; // receiver must not spawn inside their own mallet
  let sx = W / 2;
  if (Math.abs(m.x - W / 2) < 110) sx = m.x < W / 2 ? W / 2 + 120 : W / 2 - 120;
  pk.x = clamp(sx, PUCK_R + 20, W - PUCK_R - 20);
  pk.y = G.conceded === 'us' ? MID + 130 : MID - 130; // conceding side serves
  pk.vx = 0; pk.vy = 0; pk.trail = [];
  if (G.firstServe) { G.firstServe = false; G.state = 'COUNT'; G.countT = 1.8; }
  else G.state = 'PLAY';
}
function onGoal(side) {
  if (side === 'us') { G.scoreUs += 1; G.comboUs += 1; G.comboThem = 0; }
  else { G.scoreThem += 1; G.comboThem += 1; G.comboUs = 0; }
  G.conceded = side === 'us' ? 'them' : 'us';
  G.state = 'GOAL'; G.goalT = 1.0;
  G.goalFlash = 1; G.goalFlashSide = side; G.goalFxEver += 1;
  G.shake = 14; G.flash = 0.45;
  const gy = side === 'us' ? TABLE.y0 : TABLE.y1;
  const col = side === 'us' ? C.cyan : oppColor();
  burst(W / 2, gy, 30, col, 540);
  popup(W / 2, gy + (side === 'us' ? 120 : -120), '+1', col, true);
  banner(T('goal'), col);
  if (side === 'us') Sound.sfx.goal(); else Sound.sfx.concede();
  G.lastEvent = 'goal-' + side;
}
function endMatch() {
  G.state = 'OVER'; G.overT = 0;
  G.won = G.scoreUs > G.scoreThem;
  persistMatch();
  Sound.stopMusic();
  if (G.won) { Sound.sfx.win(); confetti(); } else Sound.sfx.lose();
}

/* ---------------- AI controller (top mallet) ---------------- */
function reflectX(x) { // fold a predicted x into the table with wall mirrors
  const lo = PUCK_R, span = W - 2 * PUCK_R;
  let v = (x - lo) % (2 * span);
  if (v < 0) v += 2 * span;
  if (v > span) v = 2 * span - v;
  return lo + v;
}
function aiControl(dt) {
  const m = G.p2, P = G.ai, pk = G.puck;
  const homeY = TABLE.y0 + 120;
  const jx = (Math.sin(G.time * 2.17) + Math.sin(G.time * 5.31) * 0.5) * P.err * 0.4; // aim wobble
  let tx, ty;
  const inHalf = pk.y < MID;
  const fleeing = pk.vy > 620 && pk.y < MID - 60;         // puck running away downhill
  const slamming = pk.vy < -820 && pk.y < MID * 0.85;     // too hot to attack safely
  if (inHalf && P.aggr >= 0.4 && !fleeing && !slamming) {
    // attack: stand off behind the puck on the line to the player goal, then strike through
    let dx = W / 2 - pk.x, dy = TABLE.y1 - pk.y;
    const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
    const behind = MAL_R + PUCK_R + 10;
    tx = pk.x - dx * behind * 0.85 + jx;
    ty = pk.y - dy * behind * 0.85;
    if (m.y > pk.y - MAL_R * 0.6) { // wrong side of the puck: swing around, don't own-goal
      const side = m.x <= pk.x ? -1 : 1;
      tx = pk.x + side * (MAL_R + PUCK_R + 30);
      ty = Math.max(TABLE.y0 + MAL_R, pk.y - MAL_R * 1.7);
    }
    if (Math.hypot(pk.x - m.x, pk.y - m.y) > 270 && P.aggr < 0.6) { // lazy AI holds shape
      tx = clamp(pk.x, GOAL_L, GOAL_R) + jx * 0.5;
      ty = homeY;
    }
  } else {
    // defend: sit on the goal line and mirror the (predicted) puck x
    let px = pk.x;
    if (P.predict > 0 && pk.vy < -40) {
      const t = (homeY - pk.y) / pk.vy;
      if (t > 0 && t < 3) px = reflectX(pk.x + pk.vx * t * (0.4 + 0.6 * P.predict));
    }
    tx = clamp(px, GOAL_L - 30, GOAL_R + 30) + jx * 0.5;
    ty = homeY + Math.sin(G.time * 1.3) * 8;
  }
  m.tx = lerp(m.tx, clamp(tx, MAL_R, W - MAL_R), Math.min(1, P.react * dt));
  m.ty = lerp(m.ty, clamp(ty, TABLE.y0 + MAL_R, MID), Math.min(1, P.react * dt));
}
function moveMallet(m, dt, maxV) {
  const dx = m.tx - m.x, dy = m.ty - m.y;
  const d = Math.hypot(dx, dy);
  const step = maxV * dt;
  let nx = m.tx, ny = m.ty;
  if (d > step && d > 0.0001) { nx = m.x + dx / d * step; ny = m.y + dy / d * step; }
  nx = clamp(nx, MAL_R, W - MAL_R);
  ny = clamp(ny, m.minY, m.maxY);
  m.vx = (nx - m.x) / Math.max(dt, 0.0001);
  m.vy = (ny - m.y) / Math.max(dt, 0.0001);
  m.x = nx; m.y = ny;
}

/* ---------------- puck physics (240Hz substeps, tunnel-proof) ---------------- */
function malletCollide(m) {
  const pk = G.puck;
  const dx = pk.x - m.x, dy = pk.y - m.y;
  const d = Math.hypot(dx, dy), rr = PUCK_R + MAL_R;
  if (d < rr && d > 0.0001) {
    const nx = dx / d, ny = dy / d;
    pk.x = m.x + nx * rr; pk.y = m.y + ny * rr;
    const rvx = pk.vx - m.vx, rvy = pk.vy - m.vy;
    const vn = rvx * nx + rvy * ny;
    if (vn < 0) {
      const e = 1.02; // lively mallet transfer
      pk.vx -= (1 + e) * vn * nx;
      pk.vy -= (1 + e) * vn * ny;
      const impact = Math.min(1, (-vn + Math.hypot(m.vx, m.vy) * 0.4) / 1300);
      const cx = m.x + nx * MAL_R, cy = m.y + ny * MAL_R;
      burst(cx, cy, 4 + Math.round(impact * 8), m.col, 200 + impact * 300);
      if (sfxCd.hit <= 0) { Sound.sfx.hit(impact); sfxCd.hit = 0.06; }
      G.lastEvent = 'mallet';
    }
  }
}
function postCollide(px, py) {
  const pk = G.puck;
  const dx = pk.x - px, dy = pk.y - py;
  const d = Math.hypot(dx, dy), rr = PUCK_R + POST_R;
  if (d < rr && d > 0.0001) {
    const nx = dx / d, ny = dy / d;
    pk.x = px + nx * rr; pk.y = py + ny * rr;
    const vn = pk.vx * nx + pk.vy * ny;
    if (vn < 0) {
      pk.vx -= 1.7 * vn * nx; pk.vy -= 1.7 * vn * ny;
      if (sfxCd.wall <= 0) { Sound.sfx.wall(); sfxCd.wall = 0.08; }
      burst(px, py, 5, C.pink, 240);
    }
  }
}
function substep(h) {
  const pk = G.puck;
  const f = Math.pow(PUCK_FRIC, h * 60); // ice friction
  pk.vx *= f; pk.vy *= f;
  const sp = Math.hypot(pk.vx, pk.vy);
  if (sp > PUCK_MAXV) { const k = PUCK_MAXV / sp; pk.vx *= k; pk.vy *= k; }
  const px0 = pk.x, py0 = pk.y;
  pk.x += pk.vx * h; pk.y += pk.vy * h;

  // mallets first (infinite-mass impulse), then walls re-clamp
  malletCollide(G.p1);
  malletCollide(G.p2);

  // side walls
  if (pk.x < TABLE.x0 + PUCK_R) {
    pk.x = TABLE.x0 + PUCK_R;
    if (pk.vx < 0) { pk.vx = -pk.vx * WALL_E; Sound.sfx.wall(); burst(pk.x - PUCK_R * 0.6, pk.y, 4, C.cyan, 220); }
  } else if (pk.x > TABLE.x1 - PUCK_R) {
    pk.x = TABLE.x1 - PUCK_R;
    if (pk.vx > 0) { pk.vx = -pk.vx * WALL_E; Sound.sfx.wall(); burst(pk.x + PUCK_R * 0.6, pk.y, 4, C.cyan, 220); }
  }

  // goal crossings — continuous segment test (no tunneling through the line)
  if (py0 > TABLE.y0 && pk.y <= TABLE.y0 && pk.vy < 0) {
    const t = (TABLE.y0 - py0) / (pk.y - py0);
    const cx = px0 + (pk.x - px0) * t;
    if (cx > GOAL_L + 2 && cx < GOAL_R - 2) { onGoal('us'); return; }
  }
  if (py0 < TABLE.y1 && pk.y >= TABLE.y1 && pk.vy > 0) {
    const t = (TABLE.y1 - py0) / (pk.y - py0);
    const cx = px0 + (pk.x - px0) * t;
    if (cx > GOAL_L + 2 && cx < GOAL_R - 2) { onGoal('them'); return; }
  }
  // end walls outside the goal mouth
  if (pk.y < TABLE.y0 + PUCK_R && !(pk.x > GOAL_L && pk.x < GOAL_R)) {
    pk.y = TABLE.y0 + PUCK_R;
    if (pk.vy < 0) { pk.vy = -pk.vy * WALL_E; Sound.sfx.wall(); burst(pk.x, pk.y - PUCK_R * 0.6, 4, goalColor(), 220); }
  } else if (pk.y > TABLE.y1 - PUCK_R && !(pk.x > GOAL_L && pk.x < GOAL_R)) {
    pk.y = TABLE.y1 - PUCK_R;
    if (pk.vy > 0) { pk.vy = -pk.vy * WALL_E; Sound.sfx.wall(); burst(pk.x, pk.y + PUCK_R * 0.6, 4, goalColor(), 220); }
  }
  // goal posts
  postCollide(GOAL_L, TABLE.y0); postCollide(GOAL_R, TABLE.y0);
  postCollide(GOAL_L, TABLE.y1); postCollide(GOAL_R, TABLE.y1);
}
function stepPuck(dt) {
  const pk = G.puck;
  const steps = Math.max(1, Math.ceil(dt / SUB_DT));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    substep(h);
    if (G.state !== 'PLAY') break; // goal fired mid-step
  }
  pk.trail.push({ x: pk.x, y: pk.y });
  if (pk.trail.length > 12) pk.trail.shift();
}

/* ---------------- particles / popups / banners ---------------- */
function burst(x, y, n, col, spd) {
  for (let i = 0; i < n && G.particles.length < MAX_PARTICLES; i++) {
    const a = rnd(0, Math.PI * 2), v = rnd(0.3, 1) * (spd || 420);
    G.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rnd(0.35, 0.85), max: 0.85, r: rnd(2, 5), col, g: 700, shrink: true });
  }
}
function confetti() {
  const cols = [C.cyan, C.pink, C.gold, C.green, C.violet];
  for (let i = 0; i < 90 && G.particles.length < MAX_PARTICLES; i++) {
    G.particles.push({ x: rnd(0, W), y: rnd(-160, -10), vx: rnd(-60, 60), vy: rnd(120, 320), life: rnd(1.2, 2.4), max: 2.4, r: rnd(3, 6), col: cols[i % cols.length], g: 140, shrink: false });
  }
}
function popup(x, y, txt, col, big) { G.popups.push({ x, y, txt, col, t: 0, life: 1.0, big: !!big }); }
function banner(txt, col) { G.banners.push({ txt, col, t: 0, life: 1.1 }); }

/* ---------------- update ---------------- */
function kbUpdate(set) {
  if (!set) return;
  let x = 0, y = 0;
  if (set.has('ArrowLeft')) x -= 1;
  if (set.has('ArrowRight')) x += 1;
  if (set.has('ArrowUp')) y -= 1;
  if (set.has('ArrowDown')) y += 1;
  G.kb.x = x; G.kb.y = y;
  let x2 = 0, y2 = 0;
  if (set.has('KeyA')) x2 -= 1;
  if (set.has('KeyD')) x2 += 1;
  if (set.has('KeyW')) y2 -= 1;
  if (set.has('KeyS')) y2 += 1;
  G.kb2.x = x2; G.kb2.y = y2;
}
function update(dt) {
  G.time += dt;
  sfxCd.hit = Math.max(0, sfxCd.hit - dt);
  sfxCd.wall = Math.max(0, sfxCd.wall - dt);
  G.shake *= Math.pow(0.001, dt);
  G.flash = Math.max(0, G.flash - dt * 2.2);
  G.goalFlash = Math.max(0, G.goalFlash - dt * 1.4);
  G.toastT = Math.max(0, G.toastT - dt);
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

  if (G.state === 'PLAY' || G.state === 'COUNT' || G.state === 'GOAL') {
    // keyboard assist for P1 (arrows), P2 (WASD in 2P)
    if (G.kb.x || G.kb.y) {
      G.p1.tx = clamp(G.p1.x + G.kb.x * 170, MAL_R, W - MAL_R);
      G.p1.ty = clamp(G.p1.y + G.kb.y * 170, G.p1.minY, G.p1.maxY);
      G.kb.idleT = 0;
    } else {
      G.kb.idleT += dt;
      if (G.kb.idleT > 1.4 && G.p1.pointerId === null) G.p1.ty = lerp(G.p1.ty, MID + 170, Math.min(1, dt * 1.6)); // auto return-to-guard
    }
    if (G.mode === '2p') {
      if (G.kb2.x || G.kb2.y) {
        G.p2.tx = clamp(G.p2.x + G.kb2.x * 170, MAL_R, W - MAL_R);
        G.p2.ty = clamp(G.p2.y + G.kb2.y * 170, G.p2.minY, G.p2.maxY);
        G.kb2.idleT = 0;
      } else {
        G.kb2.idleT += dt;
        if (G.kb2.idleT > 1.4 && G.p2.pointerId === null) G.p2.ty = lerp(G.p2.ty, TABLE.y0 + 170, Math.min(1, dt * 1.6));
      }
    } else {
      aiControl(dt);
    }
    moveMallet(G.p1, dt, MAL_HUMAN_V);
    moveMallet(G.p2, dt, G.mode === '2p' ? MAL_HUMAN_V : G.ai.speed);
  }

  if (G.state === 'PLAY') {
    stepPuck(dt);
    G.autosaveT += dt;
    if (G.autosaveT >= 10) { G.autosaveT = 0; autosave(); }
  } else if (G.state === 'COUNT') {
    const prev = G.countT;
    G.countT -= dt;
    if (Math.ceil(prev / 0.6) !== Math.ceil(G.countT / 0.6) && G.countT > 0) Sound.sfx.count();
    if (G.countT <= 0) { G.countT = 0; G.state = 'PLAY'; Sound.sfx.go(); }
  } else if (G.state === 'GOAL') {
    G.goalT -= dt;
    if (G.goalT <= 0) {
      if (G.scoreUs >= G.winScore || G.scoreThem >= G.winScore) endMatch();
      else serve();
    }
  } else if (G.state === 'OVER') {
    G.overT += dt;
  }
}

/* ---------------- share ---------------- */
function isZh() { try { return (window.npLang ? npLang() : 'en') === 'zh'; } catch (e) { return false; } }
function oppLabel() {
  if (G.mode === '2p') return T('p2');
  if (G.mode === 'daily') return T('daily') + ' #' + (G.ai.dayN || 0);
  return T(G.mode === 'hard' || G.mode === 'normal' ? G.mode : 'easy');
}
function oppColor() { return G.p2.col; }
function goalColor() { return G.mode === 'daily' ? G.ai.cols[1] : C.pink; }
function shareText() {
  const score = G.scoreUs + ':' + G.scoreThem;
  const link = 'seyrs1985.github.io/neonplay/neon-air-hockey/';
  const r = rankInfo(SAVE.best.rank);
  const rk = r ? ' ' + r.emoji + r.name : '';
  let vs;
  if (G.mode === '2p') vs = isZh() ? '同屏对决' : 'same-screen duel';
  else if (G.mode === 'daily') vs = (isZh() ? '每日 AI #' : 'Daily AI #') + (G.ai.dayN || 0);
  else vs = T(G.mode);
  let base;
  if (isZh()) base = '🏒 霓虹冰球 ' + score + (G.mode === '2p' ? ' ' : ' 击败 ') + vs + rk + (G.mode === '2p' ? '，不服再来！' : '');
  else base = '🏒 Neon Air Hockey ' + score + (G.mode === '2p' ? ' ' : ' beat ') + vs + rk + (G.mode === '2p' ? ' — rematch!' : '');
  if (G.mode === 'daily') return base + ' #NeonAirHockeyDaily ' + utcDate().slice(5) + ' | ' + link;
  return base + ' | ' + link;
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
  x.fillStyle = C.ink; x.font = 'bold 52px system-ui, sans-serif';
  x.fillText('🏒 NEON AIR HOCKEY', cw / 2, 120);
  x.font = 'bold 150px system-ui, sans-serif'; x.fillStyle = C.gold;
  x.fillText(G.scoreUs + ':' + G.scoreThem, cw / 2, 300);
  x.font = '600 34px system-ui, sans-serif'; x.fillStyle = C.dim;
  x.fillText((G.won ? 'WIN' : 'LOSS') + ' vs ' + oppLabel() + ' · ' + utcDate(), cw / 2, 360);
  const r = rankInfo(SAVE.best.rank);
  if (r) {
    x.font = 'bold 72px system-ui, sans-serif'; x.fillStyle = C.pink;
    x.fillText(r.emoji + '  ' + r.name.toUpperCase(), cw / 2, 490);
  }
  // mini table motif
  x.strokeStyle = 'rgba(0,229,255,0.5)'; x.lineWidth = 4;
  x.strokeRect(cw / 2 - 180, 540, 360, 220);
  x.beginPath(); x.moveTo(cw / 2 - 180, 650); x.lineTo(cw / 2 + 180, 650); x.stroke();
  x.beginPath(); x.arc(cw / 2, 650, 52, 0, 7); x.stroke();
  x.fillStyle = C.puck; x.beginPath(); x.arc(cw / 2, 620, 16, 0, 7); x.fill();
  x.fillStyle = C.cyan; x.beginPath(); x.arc(cw / 2 - 60, 690, 22, 0, 7); x.fill();
  x.fillStyle = C.violet; x.beginPath(); x.arc(cw / 2 + 60, 610, 22, 0, 7); x.fill();
  if (G.mode === 'daily') { x.fillStyle = C.green; x.font = '600 30px system-ui, sans-serif'; x.fillText('#NeonAirHockeyDaily ' + utcDate().slice(5), cw / 2, 810); }
  x.strokeStyle = 'rgba(0,229,255,0.35)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(80, 830); x.lineTo(cw - 80, 830); x.stroke();
  x.fillStyle = C.cyan; x.font = '600 32px system-ui, sans-serif';
  x.fillText('seyrs1985.github.io/neonplay/neon-air-hockey/', cw / 2, 870);
  return cv;
}
async function doShare() {
  const text = shareText();
  let shared = false;
  try {
    if (navigator.share) {
      const cv = buildShareCard();
      const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'neon-air-hockey.png', { type: 'image/png' })] })) {
        await navigator.share({ files: [new File([blob], 'neon-air-hockey.png', { type: 'image/png' })], title: 'Neon Air Hockey', text });
        shared = true;
      } else {
        await navigator.share({ title: 'Neon Air Hockey', text });
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

/* ---------------- input (called from main.js, logical coords + pointerId) ---------------- */
function onPress(x, y, pointerId) {
  Sound.resume();
  for (const r of G.hitRegions) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { pressButton(r.id); return; }
  }
  if (G.state === 'PLAY' || G.state === 'COUNT' || G.state === 'GOAL') {
    if (y >= MID) { // bottom half always drives P1
      G.p1.pointerId = pointerId;
      G.p1.tx = x; G.p1.ty = y;
      G.kb.idleT = 9;
    } else if (G.mode === '2p') { // top half: only in same-screen mode
      G.p2.pointerId = pointerId;
      G.p2.tx = x; G.p2.ty = y;
      G.kb2.idleT = 9;
    } else {
      Sound.sfx.bad(); G.shake = 3; // top half is the AI's side — negative feedback
    }
  } else if (G.state === 'TITLE' || G.state === 'OVER') {
    Sound.sfx.bad(); G.shake = 3;
  }
}
function onMove(x, y, pointerId) {
  if (G.p1.pointerId === pointerId) { G.p1.tx = x; G.p1.ty = y; }
  if (G.p2.pointerId === pointerId) { G.p2.tx = x; G.p2.ty = y; }
}
function onRelease(pointerId) {
  if (G.p1.pointerId === pointerId) G.p1.pointerId = null;
  if (G.p2.pointerId === pointerId) G.p2.pointerId = null;
}
function pressButton(id) {
  Sound.sfx.click();
  if (id === 'easy' || id === 'normal' || id === 'hard' || id === '2p' || id === 'daily') {
    startRun(id); Sound.sfx.start(); Sound.startMusic();
  }
  else if (id === 'retry') { startRun(G.mode); Sound.sfx.start(); Sound.startMusic(); }
  else if (id === 'menu') { G.state = 'TITLE'; Sound.stopMusic(); }
  else if (id === 'resume') { G.state = 'PLAY'; }
  else if (id === 'pause') { G.state = 'PAUSE'; }
  else if (id === 'share') { doShare(); }
}
function keyAction(code) {
  if (code === 'KeyM') { Sound.setMuted(!Sound.isMuted()); return; }
  if (G.state === 'TITLE') {
    if (code === 'Space' || code === 'Enter') { startRun('easy'); Sound.sfx.start(); Sound.startMusic(); }
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
  if (G.state === 'COUNT') {
    if (code === 'Space' || code === 'Enter') { G.countT = 0.01; }
    return;
  }
  if (G.state === 'PLAY' || G.state === 'GOAL') {
    if (code === 'KeyP' || code === 'Escape') { G.state = 'PAUSE'; return; }
    if (code === 'KeyR') { startRun(G.mode); Sound.sfx.start(); return; }
  }
}

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
  if (p.roundRect) p.roundRect(cx - w / 2, cy - h / 2, w, h, 18);
  else p.rect(cx - w / 2, cy - h / 2, w, h);
  fakeGlowRect(x, p, accent, 2);
  x.strokeStyle = accent; x.lineWidth = 3; x.stroke();
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillStyle = C.ink; x.font = 'bold 36px system-ui, sans-serif';
  x.fillText(label, cx, cy - (sub ? 13 : 0));
  if (sub) { x.font = '500 21px system-ui, sans-serif'; x.fillStyle = C.dim; x.fillText(sub, cx, cy + 23); }
  G.hitRegions.push({ id, x: cx - w / 2, y: cy - h / 2, w, h });
}

/* ---------------- render ---------------- */
function draw(ctx) {
  G.hitRegions = [];
  ctx.save();
  if (G.shake > 0.3) ctx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
  drawBackground(ctx);
  drawTable(ctx);
  if (G.state !== 'TITLE') {
    drawPuck(ctx);
    drawMallet(ctx, G.p2);
    drawMallet(ctx, G.p1);
  }
  drawParticles(ctx);
  drawPopups(ctx);
  drawBanners(ctx);
  drawHud(ctx);
  if (G.state === 'TITLE') drawTitle(ctx);
  else if (G.state === 'PAUSE') drawPause(ctx);
  else if (G.state === 'OVER') drawOver(ctx);
  else if (G.state === 'COUNT') drawCount(ctx);
  if (G.toastT > 0) {
    ctx.globalAlpha = Math.min(1, G.toastT);
    ctx.fillStyle = C.panel; roundRectPath(ctx, W / 2 - 260, H - 150, 520, 60, 14); ctx.fill();
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = C.ink; ctx.font = '600 25px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(G.toast, W / 2, H - 120);
    ctx.globalAlpha = 1;
  }
  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(0,229,255,' + (G.flash * 0.2).toFixed(3) + ')';
    ctx.fillRect(-20, -20, W + 40, H + 40);
  }
  ctx.restore();
}

function drawBackground(ctx) {
  ctx.fillStyle = C.bg; ctx.fillRect(-20, -20, W + 40, H + 40);
  for (const s of G.stars) {
    const tw = 0.5 + 0.5 * Math.sin(G.time * 1.3 + s.p);
    ctx.fillStyle = 'rgba(232,236,255,' + (0.1 + tw * 0.24).toFixed(3) + ')';
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }
}
function drawTable(ctx) {
  const tw = TABLE.x1 - TABLE.x0, th = TABLE.y1 - TABLE.y0;
  // ice
  ctx.fillStyle = '#0b0b1d';
  ctx.fillRect(TABLE.x0, TABLE.y0, tw, th);
  // breathing grid
  const ga = 0.05 + 0.03 * Math.sin(G.time * 0.9);
  ctx.strokeStyle = 'rgba(0,229,255,' + ga.toFixed(3) + ')'; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 60; x < W; x += 60) { ctx.moveTo(x, TABLE.y0); ctx.lineTo(x, TABLE.y1); }
  for (let y = TABLE.y0 + 60; y < TABLE.y1; y += 60) { ctx.moveTo(TABLE.x0, y); ctx.lineTo(TABLE.x1, y); }
  ctx.stroke();
  // frame with fake glow
  const frame = new Path2D();
  frame.rect(TABLE.x0 + 2, TABLE.y0 + 2, tw - 4, th - 4);
  fakeGlowRect(ctx, frame, C.cyan, 2);
  // center line + circle
  ctx.strokeStyle = 'rgba(0,229,255,0.55)'; ctx.lineWidth = 3;
  ctx.setLineDash([16, 12]);
  ctx.beginPath(); ctx.moveTo(TABLE.x0 + 6, MID); ctx.lineTo(TABLE.x1 - 6, MID); ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(W / 2, MID, 70, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(0,229,255,0.5)';
  ctx.beginPath(); ctx.arc(W / 2, MID, 7, 0, 7); ctx.fill();
  // face-off circles
  ctx.strokeStyle = 'rgba(0,229,255,0.28)';
  for (const [fx, fy] of [[120, 220], [360, 220], [120, 580], [360, 580]]) {
    ctx.beginPath(); ctx.arc(fx, fy, 26, 0, 7); ctx.stroke();
  }
  // goal creases
  ctx.strokeStyle = 'rgba(0,229,255,0.4)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(W / 2, TABLE.y0, 95, 0, Math.PI); ctx.stroke();
  ctx.beginPath(); ctx.arc(W / 2, TABLE.y1, 95, Math.PI, Math.PI * 2); ctx.stroke();
  // goals (glowing groove in the margin + mouth line)
  const gc = goalColor();
  const fl = G.goalFlash;
  for (const top of [true, false]) {
    const gy = top ? TABLE.y0 : TABLE.y1;
    const dir = top ? -1 : 1;
    ctx.fillStyle = 'rgba(10,10,26,0.95)';
    ctx.fillRect(GOAL_L, top ? gy - 30 : gy, GOAL_R - GOAL_L, 30);
    // net hatch
    ctx.strokeStyle = 'rgba(232,236,255,0.18)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 1; i < 6; i++) { ctx.moveTo(GOAL_L + i * 26, gy); ctx.lineTo(GOAL_L + i * 26 - 8 * dir, gy + 28 * dir); }
    for (let j = 1; j < 3; j++) { ctx.moveTo(GOAL_L, gy + j * 10 * dir); ctx.lineTo(GOAL_R, gy + j * 10 * dir); }
    ctx.stroke();
    // mouth line with fake glow (bright on goal)
    const line = new Path2D();
    line.moveTo(GOAL_L, gy); line.lineTo(GOAL_R, gy);
    if (fl > 0.02 && ((top && G.goalFlashSide === 'us') || (!top && G.goalFlashSide === 'them'))) {
      const rg = new Path2D();
      rg.moveTo(GOAL_L, gy); rg.lineTo(GOAL_R, gy);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = gc; ctx.lineWidth = 26 * fl; ctx.globalAlpha = 0.4 * fl;
      ctx.stroke(rg);
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    fakeGlowRect(ctx, line, gc, fl > 0.3 ? 5 : 3);
    // posts
    ctx.fillStyle = gc;
    ctx.beginPath(); ctx.arc(GOAL_L, gy, POST_R, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(GOAL_R, gy, POST_R, 0, 7); ctx.fill();
  }
}
function drawPuck(ctx) {
  const pk = G.puck;
  if (G.state === 'GOAL') return; // puck dissolves into the net flash
  // trail
  if (pk.trail.length > 1 && (Math.abs(pk.vx) > 8 || Math.abs(pk.vy) > 8)) {
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < pk.trail.length; i++) {
      const p = pk.trail[i], t = i / pk.trail.length;
      ctx.globalAlpha = t * 0.28;
      ctx.fillStyle = C.puck;
      ctx.beginPath(); ctx.arc(p.x, p.y, PUCK_R * t * 0.85, 0, 7); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
  }
  // glow halo + disc
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.3; ctx.fillStyle = C.puck;
  ctx.beginPath(); ctx.arc(pk.x, pk.y, PUCK_R + 8, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = C.puck;
  ctx.beginPath(); ctx.arc(pk.x, pk.y, PUCK_R, 0, 7); ctx.fill();
  ctx.strokeStyle = 'rgba(0,229,255,0.75)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(pk.x, pk.y, PUCK_R - 4, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(10,10,24,0.5)';
  ctx.beginPath(); ctx.arc(pk.x, pk.y, PUCK_R * 0.4, 0, 7); ctx.fill();
}
function drawMallet(ctx, m) {
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = 0.24; ctx.fillStyle = m.col;
  ctx.beginPath(); ctx.arc(m.x, m.y, MAL_R + 9, 0, 7); ctx.fill();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#101430';
  ctx.beginPath(); ctx.arc(m.x, m.y, MAL_R, 0, 7); ctx.fill();
  ctx.strokeStyle = m.col; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(m.x, m.y, MAL_R - 2, 0, 7); ctx.stroke();
  ctx.strokeStyle = 'rgba(232,236,255,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(m.x, m.y, MAL_R - 12, 0, 7); ctx.stroke();
  ctx.fillStyle = m.col;
  ctx.beginPath(); ctx.arc(m.x, m.y, MAL_R * 0.34, 0, 7); ctx.fill();
}
function drawParticles(ctx) {
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
function drawPopups(ctx) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const p of G.popups) {
    const t = p.t / p.life;
    ctx.globalAlpha = 1 - t * t;
    ctx.font = (p.big ? 'bold 58px' : 'bold 40px') + ' system-ui, sans-serif';
    ctx.fillStyle = p.col;
    ctx.fillText(p.txt, p.x, p.y - t * 80);
  }
  ctx.globalAlpha = 1;
}
function drawBanners(ctx) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const bn of G.banners) {
    const t = bn.t / bn.life;
    const pop = t < 0.15 ? t / 0.15 : 1;
    const fade = t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1;
    ctx.save();
    ctx.translate(W / 2, MID - 40);
    ctx.scale(0.7 + 0.3 * pop, 0.7 + 0.3 * pop);
    ctx.globalAlpha = fade;
    ctx.font = 'bold 104px system-ui, sans-serif';
    ctx.strokeStyle = bn.col; ctx.lineWidth = 16; ctx.globalAlpha *= 0.9;
    ctx.strokeText(bn.txt, 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillText(bn.txt, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}
function drawHud(ctx) {
  if (G.state === 'TITLE') return;
  ctx.textBaseline = 'middle';
  // opponent score (top margin)
  ctx.textAlign = 'center';
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText(oppLabel(), W / 2 - 34, 21);
  ctx.font = 'bold 40px system-ui, sans-serif'; ctx.fillStyle = oppColor();
  ctx.fillText(String(G.scoreThem), W / 2 + 30, 21);
  // player score (bottom margin)
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText(T('you'), W / 2 - 34, H - 20);
  ctx.font = 'bold 40px system-ui, sans-serif'; ctx.fillStyle = C.cyan;
  ctx.fillText(String(G.scoreUs), W / 2 + 30, H - 20);
  // match target chip
  ctx.font = '500 18px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText('· ' + T('firstTo') + ' ' + G.winScore + ' ·', W / 2 - 196, 21);
  // mode / daily chip
  ctx.textAlign = 'left';
  ctx.font = '600 19px system-ui, sans-serif';
  if (G.mode === 'daily') {
    ctx.fillStyle = C.green;
    ctx.fillText(T('daily') + ' #' + (G.ai.dayN || 0) + ' · ' + T('dailyChip'), 14, TABLE.y0 + 26);
  } else if (G.state === 'PLAY' || G.state === 'COUNT' || G.state === 'GOAL') {
    ctx.fillStyle = 'rgba(124,77,255,0.85)';
    ctx.fillText(G.mode === '2p' ? T('twoP') : ('VS ' + T(G.mode)), 14, TABLE.y0 + 26);
  }
  // combo capsule (consecutive goals)
  const combo = Math.max(G.comboUs, G.comboThem);
  if (combo >= 2 && G.state !== 'OVER') {
    const col = G.comboUs >= 2 ? C.cyan : oppColor();
    const bw = 170;
    const cy = G.comboUs >= 2 ? TABLE.y1 - 34 : TABLE.y0 + 58;
    const pulse = 1 + 0.06 * Math.sin(G.time * 10);
    ctx.save(); ctx.translate(14 + bw / 2, cy); ctx.scale(pulse, pulse);
    roundRectPath(ctx, -bw / 2, -22, bw, 44, 22);
    ctx.fillStyle = 'rgba(20,24,56,0.85)'; ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    ctx.textAlign = 'center'; ctx.font = 'bold 26px system-ui, sans-serif'; ctx.fillStyle = col;
    ctx.fillText(T('combo') + ' ×' + combo, 0, 1);
    ctx.restore();
  }
  // pause button (PLAY only, ≥44px target)
  if (G.state === 'PLAY' || G.state === 'COUNT') {
    const px2 = W - 44, py2 = TABLE.y0 + 44;
    ctx.beginPath(); ctx.arc(px2, py2, 30, 0, 7);
    ctx.fillStyle = 'rgba(20,24,56,0.8)'; ctx.fill();
    ctx.strokeStyle = 'rgba(232,236,255,0.5)'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = C.ink;
    ctx.fillRect(px2 - 9, py2 - 10, 6, 20); ctx.fillRect(px2 + 3, py2 - 10, 6, 20);
    G.hitRegions.push({ id: 'pause', x: px2 - 34, y: py2 - 34, w: 68, h: 68 });
  }
}
function drawCount(ctx) {
  ctx.fillStyle = 'rgba(10,10,24,0.45)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const n = Math.ceil(G.countT / 0.6);
  if (G.mode === 'daily') {
    ctx.font = 'bold 40px system-ui, sans-serif'; ctx.fillStyle = C.green;
    ctx.fillText(T('daily') + ' #' + (G.ai.dayN || 0), W / 2, MID - 190);
    ctx.font = '500 24px system-ui, sans-serif'; ctx.fillStyle = C.dim;
    ctx.fillText(T('dailyTag'), W / 2, MID - 148);
  }
  ctx.font = '500 26px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText(T('ready'), W / 2, MID - 90);
  if (n >= 1) {
    const ph = (G.countT % 0.6) / 0.6;
    ctx.save();
    ctx.translate(W / 2, MID + 10);
    ctx.scale(1 + (1 - ph) * 0.25, 1 + (1 - ph) * 0.25);
    ctx.font = 'bold 130px system-ui, sans-serif';
    ctx.strokeStyle = C.cyan; ctx.lineWidth = 10;
    ctx.strokeText(String(Math.min(3, n)), 0, 0);
    ctx.fillStyle = '#fff';
    ctx.fillText(String(Math.min(3, n)), 0, 0);
    ctx.restore();
  }
}
function drawTitle(ctx) {
  ctx.fillStyle = 'rgba(10,10,24,0.6)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // mini center-circle motif
  ctx.strokeStyle = 'rgba(0,229,255,0.6)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(W / 2, H * 0.16, 58, 0, 7); ctx.stroke();
  ctx.fillStyle = C.puck; ctx.beginPath(); ctx.arc(W / 2, H * 0.16, 14, 0, 7); ctx.fill();
  ctx.fillStyle = C.cyan; ctx.beginPath(); ctx.arc(W / 2 - 34, H * 0.16 + 34, 15, 0, 7); ctx.fill();
  ctx.fillStyle = C.violet; ctx.beginPath(); ctx.arc(W / 2 + 34, H * 0.16 - 34, 15, 0, 7); ctx.fill();
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillStyle = C.ink; ctx.fillText('🏒 ' + T('title'), W / 2, H * 0.27);
  ctx.font = '600 24px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText(T('tagline'), W / 2, H * 0.325);
  // buttons (≥44px touch targets: 440×88 logical)
  button(ctx, 'easy', W / 2, 330, 440, 88, T('vsEasy'), C.green);
  button(ctx, 'normal', W / 2, 430, 440, 88, T('vsNormal'), C.cyan);
  button(ctx, 'hard', W / 2, 530, 440, 88, T('vsHard'), C.pink);
  button(ctx, '2p', W / 2 - 118, 628, 224, 84, T('twoP'), C.gold, T('twoPTag'));
  button(ctx, 'daily', W / 2 + 118, 628, 224, 84, T('daily'), C.violet, T('dailyTag'));
  // rank + streak footer
  const r = rankInfo(SAVE.best.rank);
  ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillStyle = r ? C.pink : C.dim;
  ctx.fillText((r ? r.emoji + ' ' + T('rank') + ' ' + r.name : T('rank') + ' —'), W / 2 - 110, 706);
  ctx.fillStyle = C.gold;
  ctx.fillText('🔥 ' + T('streak') + ' ' + SAVE.streak.count + T('days'), W / 2 + 110, 706);
  ctx.font = '500 20px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText(T('hintDrag'), W / 2, 744);
  ctx.fillText(T('hintKbd'), W / 2, 774);
}
function drawPause(ctx) {
  ctx.fillStyle = 'rgba(10,10,24,0.72)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = 'bold 66px system-ui, sans-serif'; ctx.fillStyle = C.ink;
  ctx.fillText(T('paused'), W / 2, H * 0.36);
  button(ctx, 'resume', W / 2, H * 0.52, 440, 96, T('resume'), C.cyan);
  button(ctx, 'menu', W / 2, H * 0.52 + 128, 440, 96, T('menu'), C.violet);
}
function drawOver(ctx) {
  const a = Math.min(1, G.overT * 2.4);
  ctx.fillStyle = 'rgba(10,10,24,' + (0.74 * a).toFixed(3) + ')'; ctx.fillRect(0, 0, W, H);
  ctx.globalAlpha = a;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const r = rankInfo(SAVE.best.rank);
  // glass panel
  roundRectPath(ctx, 40, H * 0.12, W - 80, H * 0.56, 24);
  ctx.fillStyle = C.panel; ctx.fill();
  ctx.strokeStyle = 'rgba(0,229,255,0.4)'; ctx.lineWidth = 3; ctx.stroke();
  ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillStyle = G.won ? C.green : C.red;
  ctx.fillText(G.won ? T('win') : T('lose'), W / 2, H * 0.12 + 64);
  ctx.font = 'bold 96px system-ui, sans-serif'; ctx.fillStyle = C.ink;
  ctx.fillText(G.scoreUs + ' — ' + G.scoreThem, W / 2, H * 0.12 + 160);
  ctx.font = '600 26px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  ctx.fillText('vs ' + oppLabel(), W / 2, H * 0.12 + 212);
  if (r) {
    ctx.font = 'bold 52px system-ui, sans-serif'; ctx.fillStyle = C.pink;
    ctx.fillText(r.emoji + ' ' + r.name, W / 2, H * 0.12 + 272);
    if (r.nextCond) {
      ctx.font = '500 21px system-ui, sans-serif'; ctx.fillStyle = C.dim;
      ctx.fillText(T('nextRank') + ': ' + r.nextCond, W / 2, H * 0.12 + 312);
    }
  }
  ctx.font = '600 22px system-ui, sans-serif'; ctx.fillStyle = C.ink;
  ctx.fillText(SAVE.stats.goalsFor + ' ' + T('goalsFor') + ' · ' + SAVE.stats.goalsAgainst + ' ' + T('goalsAgainst') + ' · ' + SAVE.stats.shutouts + ' ' + T('shutouts'), W / 2, H * 0.12 + 356);
  if (G.rankUp) {
    ctx.font = 'bold 26px system-ui, sans-serif'; ctx.fillStyle = C.gold;
    ctx.fillText('★ ' + T('nextRank') + ': ' + G.rankUp.emoji + G.rankUp.name + ' ★', W / 2, H * 0.12 + 396);
  }
  if (G.mode === 'daily') {
    ctx.font = '500 21px system-ui, sans-serif'; ctx.fillStyle = C.green;
    ctx.fillText('📅 ' + T('dailyDone') + ' · ' + T('comeBack'), W / 2, H * 0.12 + 432);
  }
  // buttons
  button(ctx, 'share', W / 2, H * 0.78, 440, 92, '🔗 ' + T('share'), C.gold);
  button(ctx, 'retry', W / 2 - 118, H * 0.78 + 122, 224, 88, T('retry'), C.cyan);
  button(ctx, 'menu', W / 2 + 118, H * 0.78 + 122, 224, 88, T('menu'), C.violet);
  ctx.globalAlpha = 1;
}

/* ---------------- deterministic hooks (autotest / screenshots / QA) ----------------
   ?autotest=1                        run the in-page self-check, expose window.__autotest
   ?shot=title|play|goal|over[&seed=N] stage a scene and render one frame */
(function () {
  window.__qaState = () => ({ // callable in ANY state
    state: G.state, mode: G.mode, winScore: G.winScore,
    scoreUs: G.scoreUs, scoreThem: G.scoreThem,
    comboUs: G.comboUs, comboThem: G.comboThem,
    conceded: G.conceded, lastEvent: G.lastEvent, won: G.won,
    countT: Math.round(G.countT * 100) / 100, goalT: Math.round(G.goalT * 100) / 100,
    goalFxEver: G.goalFxEver,
    puck: { x: Math.round(G.puck.x * 10) / 10, y: Math.round(G.puck.y * 10) / 10,
      vx: Math.round(G.puck.vx), vy: Math.round(G.puck.vy),
      speed: Math.round(Math.hypot(G.puck.vx, G.puck.vy)) },
    p1: { x: Math.round(G.p1.x), y: Math.round(G.p1.y), tx: Math.round(G.p1.tx), ty: Math.round(G.p1.ty), pointerId: G.p1.pointerId },
    p2: { x: Math.round(G.p2.x), y: Math.round(G.p2.y), tx: Math.round(G.p2.tx), ty: Math.round(G.p2.ty), pointerId: G.p2.pointerId },
    ai: G.ai ? { speed: G.ai.speed, err: G.ai.err, aggr: G.ai.aggr } : null,
    rank: SAVE.best.rank, daily: SAVE.daily,
    streak: { count: SAVE.streak.count, last: SAVE.streak.last, best: SAVE.streak.best, protect: SAVE.streak.protect },
    hitButtons: G.hitRegions.map(r => r.id),
  });
  // direct injection surface for scripted playtests (reliable, testable goals)
  window.__qa = {
    start(mode) { startRun(mode); return window.__qaState(); },
    setPuck(x, y, vx, vy) {
      const pk = G.puck;
      pk.x = x; pk.y = y; pk.vx = vx || 0; pk.vy = vy || 0; pk.trail = [];
      if (G.state === 'GOAL' || G.state === 'COUNT') G.state = 'PLAY';
      return true;
    },
    setMallet(i, x, y) {
      const m = i === 2 ? G.p2 : G.p1;
      m.x = m.tx = x; m.y = m.ty = y;
      return true;
    },
    malletTarget(i, x, y) {
      const m = i === 2 ? G.p2 : G.p1;
      m.tx = x; m.ty = y;
      return true;
    },
    aiMove(dt) { // single deterministic AI step (design: __qa.aiMove())
      const h = dt || 1 / 60;
      aiControl(h);
      moveMallet(G.p2, h, G.ai.speed);
      return { x: Math.round(G.p2.x), y: Math.round(G.p2.y) };
    },
    sim(seconds) { // deterministic fixed-step stepping of the engine
      const n = Math.round(seconds * 60);
      for (let i = 0; i < n; i++) {
        update(1 / 60);
        if (G.state === 'TITLE') break;
      }
      return window.__qaState();
    },
    dailyPreview(dateStr) { return buildDaily(dateStr || utcDate()); },
    computeRank, rankInfo, shareText, buildShareCard,
    save() { return JSON.parse(JSON.stringify(SAVE)); },
    phys: window.__PHYS,
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

  initAmbient();
  loadStorage();

  function clearSave() { for (const k of SAVE_KEYS) { try { localStorage.removeItem(k); } catch (e) {} } loadStorage(); }
  function goalInto(side) { // drive one puck straight into a net
    if (side === 'us') window.__qa.setPuck(W / 2, TABLE.y0 + 26, 0, -1300);
    else window.__qa.setPuck(W / 2, TABLE.y1 - 26, 0, 1300);
    window.__qa.sim(1.05); // 0.02 travel + 1.0 goal freeze + serve settle
    return window.__qaState();
  }

  if (autotest) {
    const results = {};
    try {
      // 1) daily seed determinism: same date → identical AI params; next day differs
      const d1 = window.__qa.dailyPreview('2026-09-15');
      const d2 = window.__qa.dailyPreview('2026-09-15');
      const d3 = window.__qa.dailyPreview('2026-09-16');
      results.dailyDeterministic = JSON.stringify(d1) === JSON.stringify(d2);
      results.dailyDiffersNextDay = JSON.stringify(d1) !== JSON.stringify(d3);
      results.dailyParamsRange = d1.speed >= 430 && d1.speed <= 810 && d1.err >= 8 && d1.err <= 60 &&
        d1.aggr >= 0.35 && d1.aggr <= 0.9 && d3.speed >= 430 && d3.speed <= 810;

      // 2) rank ladder: exact conditions from the design table
      const mk = o => Object.assign({ rank: null, games: 0, winsVsEasy: 0, winsVsNormal: 0, winsVsHard: 0, shutEasy: 0, shutNormal: 0, legend: 0, date: '' }, o);
      results.rankLadder =
        computeRank(mk({})) === null &&
        computeRank(mk({ games: 1 })) === 'bronze' &&
        computeRank(mk({ games: 2, winsVsEasy: 3 })) === 'silver' &&
        computeRank(mk({ games: 2, winsVsEasy: 3, shutEasy: 3 })) === 'gold' &&
        computeRank(mk({ games: 2, winsVsNormal: 5 })) === 'platinum' &&
        computeRank(mk({ games: 2, winsVsNormal: 5, shutNormal: 3 })) === 'diamond' &&
        computeRank(mk({ games: 2, winsVsHard: 1 })) === 'master' &&
        computeRank(mk({ games: 2, winsVsHard: 1, legend: 1 })) === 'legend';

      // 3) scoring both ways + serve reset to the conceding side
      clearSave();
      window.__qa.start('easy');
      results.runStarts = window.__qaState().state === 'COUNT' || window.__qaState().state === 'PLAY';
      window.__qa.sim(2.0); // countdown done
      let s = window.__qaState();
      results.playAfterCount = s.state === 'PLAY';
      s = goalInto('us');
      results.playerGoalScores = s.scoreUs === 1 && s.lastEvent === 'goal-us';
      results.serveOnConceder = s.state === 'PLAY' && s.puck.y < MID; // AI conceded → AI side serve
      s = goalInto('them');
      results.aiGoalScores = s.scoreThem === 1 && s.lastEvent === 'goal-them' &&
        s.puck.y > MID;
      results.goalFxEver = s.goalFxEver >= 2;

      // 4) physics in a mallet-static world (2P mode, no AI interference)
      window.__qa.start('2p');
      window.__qa.sim(2.0);
      window.__qa.setPuck(W / 2, MID, 5000, 0);
      window.__qa.sim(0.1);
      results.puckSpeedCapped = window.__qaState().puck.speed <= PUCK_MAXV;
      window.__qa.setMallet(1, 60, 720);
      window.__qa.setMallet(2, 420, 80);
      window.__qa.setPuck(80, TABLE.y0 + PUCK_R + 2, 0, -1400); // max speed, outside the mouth
      window.__qa.sim(1.2);
      const pk2 = window.__qaState();
      results.noWallTunnel = pk2.lastEvent !== 'goal-us' && pk2.state === 'PLAY' &&
        pk2.puck.y >= TABLE.y0 && pk2.puck.y <= TABLE.y1 && pk2.puck.x >= TABLE.x0;
      // mallet impulse: a driven mallet propels the puck
      window.__qa.setMallet(1, 200, 600);
      window.__qa.setPuck(300, 600, 0, 0);
      window.__qa.malletTarget(1, 400, 600);
      window.__qa.sim(0.25);
      results.malletImpulse = window.__qaState().puck.speed > 250;

      // 5) full match: first to 7 → settlement + persistence + rank
      clearSave();
      window.__qa.start('easy');
      window.__qa.sim(2.0);
      for (let i = 0; i < 7; i++) goalInto('us');
      s = window.__qaState();
      results.matchEndsAt7 = s.state === 'OVER' && s.scoreUs === 7 && s.won === true;
      results.rankBronzeAfterMatch = s.rank === 'bronze';
      results.statsShape = SAVE.stats.games >= 1 && SAVE.stats.goalsFor >= 7;
      Sound.setMuted(Sound.isMuted()); // normalize the settings key (design table)

      // 6) daily match: first to 5, marks daily + streak
      window.__qa.start('daily');
      results.dailyWinScore = window.__qaState().winScore === 5;
      window.__qa.sim(2.0);
      for (let i = 0; i < 5; i++) goalInto('us');
      s = window.__qaState();
      results.dailyMatchEndsAt5 = s.state === 'OVER' && s.scoreUs === 5;
      results.dailyMarked = SAVE.daily.done === true && SAVE.daily.date === utcDate();
      results.streakMarked = SAVE.streak.count >= 1 && SAVE.streak.last === utcDate();

      // 6b) persistence: exactly the designed key set after settled matches
      const keys = Object.keys(localStorage).filter(k => k.indexOf('np_neon-air-hockey') === 0).sort();
      const expected = SAVE_KEYS.slice().sort();
      results.storageKeysExact = JSON.stringify(keys) === JSON.stringify(expected);

      // 7) streak: yesterday +1, 1-day gap eats the mulligan, 2-day gap resets
      const today = utcDate();
      lsSet(K_STREAK, { count: 3, last: dayShift(today, -1), best: 3, protect: 1, pmonth: today.slice(0, 7) });
      loadStorage();
      let st = markDailyDone(today);
      results.streakIncrements = st.count === 4 && st.best === 4;
      lsSet(K_STREAK, { count: 3, last: dayShift(today, -2), best: 3, protect: 1, pmonth: today.slice(0, 7) });
      loadStorage();
      st = markDailyDone(today);
      results.streakMulligan = st.count === 4 && st.protect === 0;
      lsSet(K_STREAK, { count: 3, last: dayShift(today, -3), best: 3, protect: 1, pmonth: today.slice(0, 7) });
      loadStorage();
      st = markDailyDone(today);
      results.streakGapResets = st.count === 1;

      // 8) multi-touch: two pointerIds track independently, half constraint holds
      clearSave();
      window.__qa.start('2p');
      window.__qa.sim(2.0);
      const a2 = window.__qaPointer;
      a2('pointerdown', 21, 140, 620);
      a2('pointerdown', 22, 340, 180);
      a2('pointermove', 21, 300, 520);
      a2('pointermove', 22, 160, 300);
      window.__qa.sim(0.25);
      s = window.__qaState();
      const p1Moved = Math.abs(s.p1.x - 140) > 30 || Math.abs(s.p1.y - 620) > 30;
      const p2Moved = Math.abs(s.p2.x - 340) > 30 || Math.abs(s.p2.y - 180) > 30;
      results.multiTouchBothTrack = p1Moved && p2Moved &&
        Math.abs(s.p1.x - 300) < 120 && Math.abs(s.p2.x - 160) < 160;
      a2('pointermove', 21, 240, 120); // drag P1 deep into the top half
      a2('pointermove', 22, 240, 700); // drag P2 deep into the bottom half
      window.__qa.sim(0.5);
      s = window.__qaState();
      results.halfConstraintHolds = s.p1.y <= MID && s.p2.y >= MID &&
        Math.abs(s.p1.y - MID) < 2 && Math.abs(s.p2.y - MID) < 2;
      results.pointersReleased = (a2('pointerup', 21, 240, 120), a2('pointerup', 22, 240, 700), true);
      window.__qa.sim(0.05);
      results.ownershipCleared = window.__qaState().p1.pointerId === null && window.__qaState().p2.pointerId === null;

      // 9) AI responds: single-step aiMove moves the mallet within its half
      window.__qa.start('normal');
      window.__qa.sim(2.0);
      window.__qa.setPuck(W / 2, MID - 200, 0, 0);
      const ai0 = { x: G.p2.x, y: G.p2.y };
      for (let i = 0; i < 30; i++) window.__qa.aiMove(1 / 60);
      const ai1 = window.__qa.aiMove(1 / 60);
      results.aiMoveSteps = Math.hypot(ai1.x - ai0.x, ai1.y - ai0.y) > 10 && ai1.y <= MID;

      // 10) share card non-blank + site link in text
      const card = buildShareCard();
      let distinct = 0; const seen = new Set();
      try {
        const cx2 = card.getContext('2d');
        for (let i = 0; i < 40; i++) {
          const px3 = cx2.getImageData((i * 37) % card.width, (i * 91) % card.height, 1, 1).data;
          seen.add(px3[0] + ',' + px3[1] + ',' + px3[2]);
        }
        distinct = seen.size;
      } catch (e) { distinct = -1; }
      results.shareCardDraws = distinct > 4;
      results.shareTextHasLink = shareText().indexOf('seyrs1985.github.io/neonplay') >= 0 &&
        shareText().indexOf(G.scoreUs + ':' + G.scoreThem) >= 0;

      // 11) keyboard: starts from TITLE, arrows drive the mallet
      G.state = 'TITLE';
      keyAction('Space');
      results.kbdStartsRun = G.state === 'COUNT' || G.state === 'PLAY';
      window.__qa.sim(2.0);
      const y0 = G.p1.y, x0 = G.p1.x;
      G.kb.x = 1; G.kb.y = 0;
      window.__qa.sim(0.4);
      G.kb.x = 0;
      results.kbdMovesMallet = Math.abs(G.p1.x - x0) > 40 && G.p1.y >= MID - 0.5;
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

  // --- staged screenshots (?shot=title|play|goal|over) ---
  setTimeout(() => {
    try {
      initAmbient();
      loadStorage();
      if (mode === 'title') {
        G.state = 'TITLE'; G.time = 2.4;
      } else if (mode === 'play') {
        startRun('easy');
        window.__qa.sim(2.2);
        window.__qa.setPuck(190, 300, 240, 420);
        window.__qa.sim(0.25);
      } else if (mode === 'goal') {
        startRun('normal');
        window.__qa.sim(2.0);
        window.__qa.setPuck(W / 2, TABLE.y0 + 30, 0, -1300);
        window.__qa.sim(0.12);
      } else if (mode === 'over') {
        startRun('hard');
        window.__qa.sim(2.0);
        G.scoreUs = 7; G.scoreThem = 4;
        endMatch(); G.overT = 1.2;
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
