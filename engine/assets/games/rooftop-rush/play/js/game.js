/* Rooftop Rush — game core: state machine / auto-run physics / juice / render */
'use strict';

const P = RR.PHYS, W = P.W, H = P.H;
const HW = P.PW_HALF;
window.__PHYS = P; // QA surface (single source of truth)

const C = {
  bg: '#0a0a18', cyan: '#00e5ff', violet: '#7c4dff', pink: '#ff2d95',
  green: '#39ff88', red: '#ff5470', gold: '#ffd54a',
  roof: '#1e2a4a', roofEdge: '#00e5ff',
  ink: '#e8ecff', dim: 'rgba(232,236,255,0.55)', panel: 'rgba(16,18,40,0.88)',
};

/* ---------------- i18n (np_core np_lang, en fallback) ---------------- */
var NP_L = {
  en: {
    title: 'ROOFTOP RUSH', tagline: 'one-button parkour · track of the day',
    classic: 'CLASSIC RUN', classicTag: 'endless · random blocks · distance = score',
    daily: 'TRACK OF THE DAY', dailyTag: 'same route worldwide · race the clock',
    hint: 'Tap / Space to jump — hold for height',
    best: 'BEST', streak: 'STREAK', days: 'd', rank: 'RANK', m: 'm', combo: 'COMBO',
    time: 'TIME', dist: 'DISTANCE', newBest: 'NEW BEST!', finish: 'FINISH!',
    over: 'RUN OVER', retry: 'RETRY', menu: 'MENU', share: 'SHARE', paused: 'PAUSED',
    resume: 'RESUME', copied: 'Result copied — paste it anywhere!', copyFail: 'Could not copy — long-press the card',
    dailyBest: "today's best", nextRank: 'next rank', at: 'at',
    finished: 'Track complete!', reached: 'reached', jumps: 'jumps',
    ranksBronze: 'Bronze', ranksSilver: 'Silver', ranksGold: 'Gold', ranksPlatinum: 'Platinum',
    ranksDiamond: 'Diamond', ranksMaster: 'Master', ranksLegend: 'Legend',
  },
  zh: {
    title: '天台狂奔', tagline: '单键跑酷 · 每日同题赛道',
    classic: '经典无尽', classicTag: '无限随机 · 距离即分数',
    daily: '每日赛道', dailyTag: '全球同一条路线 · 刷完赛时间',
    hint: '点按 / 空格 起跳——长按跳更高',
    best: '最佳', streak: '连胜', days: '天', rank: '段位', m: '米', combo: '连跳',
    time: '用时', dist: '距离', newBest: '新纪录！', finish: '完赛！',
    over: '本局结束', retry: '再来一局', menu: '回主页', share: '分享', paused: '已暂停',
    resume: '继续', copied: '成绩已复制，去粘贴吧！', copyFail: '复制失败，请长按成绩卡',
    dailyBest: '今日最佳', nextRank: '距下一段位', at: '需',
    finished: '赛道完成！', reached: '跑到', jumps: '跳',
    ranksBronze: '青铜', ranksSilver: '白银', ranksGold: '黄金', ranksPlatinum: '白金',
    ranksDiamond: '钻石', ranksMaster: '大师', ranksLegend: '传奇',
  },
};
function T(k) {
  if (window.npT) return npT(NP_L, k);
  let lang = 'en';
  try {
    lang = new URLSearchParams(location.search).get('lang') || localStorage.getItem('np_lang') || 'en';
  } catch (e) {}
  lang = String(lang).slice(0, 2).toLowerCase();
  return (NP_L[lang] && NP_L[lang][k]) || NP_L.en[k] || k;
}

function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function round1(v) { return Math.round(v * 10) / 10; }
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

/* ---------------- ranks (classic best distance, design §3⑤) ---------------- */
const RANKS = [
  { key: 'legend', min: 3500, emoji: '🏆' }, { key: 'master', min: 2750, emoji: '🥇' },
  { key: 'diamond', min: 2000, emoji: '💎' }, { key: 'platinum', min: 1500, emoji: '🥈' },
  { key: 'gold', min: 1000, emoji: '🟡' }, { key: 'silver', min: 500, emoji: '⚪' },
  { key: 'bronze', min: 0, emoji: '🟤' },
];
function rankFor(meters) {
  for (let i = 0; i < RANKS.length; i++) {
    if (meters >= RANKS[i].min) {
      const next = i > 0 ? RANKS[i - 1] : null;
      const name = T('ranks' + RANKS[i].key[0].toUpperCase() + RANKS[i].key.slice(1));
      return { key: RANKS[i].key, emoji: RANKS[i].emoji, name: name, min: RANKS[i].min,
               nextMin: next ? next.min : null, need: next ? next.min - meters : 0 };
    }
  }
  return { key: 'bronze', emoji: '🟤', name: T('ranksBronze'), min: 0, nextMin: 500, need: 500 - meters };
}

/* ---------------- storage (design key table — no unlisted keys) ---------------- */
const K_BEST = 'np_rooftop-rush_best', K_TOP10 = 'np_rooftop-rush_top10', K_DAILY = 'np_rooftop-rush_daily',
      K_STREAK = 'np_rooftop-rush_streak', K_STATS = 'np_rooftop-rush_stats', K_WEEKLY = 'np_rooftop-rush_weekly';
function lsGet(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

const SAVE = {
  best: { meters: 0, date: '' }, top10: [],
  daily: { date: '', meters: 0, finished: false, timeSec: 0 },
  streak: { count: 0, last: '', best: 0, protect: 1 },
  stats: { games: 0, meters: 0, finishes: 0, bestCombo: 0 },
  weekly: { weekKey: '', best: { meters: 0 } },
};
function loadStorage() {
  const b = lsGet(K_BEST, null); if (b && typeof b.meters === 'number') SAVE.best = b;
  const t = lsGet(K_TOP10, null); if (Array.isArray(t)) SAVE.top10 = t;
  const d = lsGet(K_DAILY, null); if (d && typeof d === 'object' && d.date) SAVE.daily = d;
  const st = lsGet(K_STREAK, null); if (st && typeof st === 'object') SAVE.streak = st;
  const ss = lsGet(K_STATS, null); if (ss && typeof ss === 'object') SAVE.stats = ss;
  const wk = lsGet(K_WEEKLY, null); if (wk && typeof wk === 'object') SAVE.weekly = wk;
}
function dayShift(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function markDailyRun(today, meters, finished, timeSec) {
  const st = Object.assign({}, SAVE.streak);
  const m = today.slice(0, 7);
  if (st.pmonth !== m) { st.pmonth = m; st.protect = 1; }
  if (st.last !== today) {
    if (st.last === dayShift(today, -1)) st.count += 1;
    else if (st.last === dayShift(today, -2) && st.protect > 0) { st.protect -= 1; st.count += 1; }
    else st.count = 1;
    st.last = today;
  }
  st.best = Math.max(st.best || 0, st.count);
  SAVE.streak = st; lsSet(K_STREAK, st);
  if (SAVE.daily.date !== today) SAVE.daily = { date: today, meters: 0, finished: false, timeSec: 0 };
  SAVE.daily.meters = Math.max(SAVE.daily.meters, meters);
  if (finished && !SAVE.daily.finished) { SAVE.daily.finished = true; SAVE.daily.timeSec = timeSec; }
  else if (finished && timeSec < SAVE.daily.timeSec) SAVE.daily.timeSec = timeSec;
  lsSet(K_DAILY, SAVE.daily);
}
function persistRun(meters, finished, timeSec, combo) {
  const today = utcDate();
  SAVE.stats.games += 1;
  SAVE.stats.meters += meters;
  if (finished) SAVE.stats.finishes += 1;
  SAVE.stats.bestCombo = Math.max(SAVE.stats.bestCombo || 0, combo || 0);
  lsSet(K_STATS, SAVE.stats);
  const entry = { meters: meters, mode: G.mode, date: today, dailyDate: G.mode === 'daily' ? G.routeDate : undefined };
  SAVE.top10.push(entry);
  SAVE.top10.sort((a, b) => b.meters - a.meters);
  SAVE.top10 = SAVE.top10.slice(0, 10);
  lsSet(K_TOP10, SAVE.top10);
  const wk = isoWeekKey(today);
  if (SAVE.weekly.weekKey !== wk) SAVE.weekly = { weekKey: wk, best: { meters: 0 } };
  if (meters > SAVE.weekly.best.meters) SAVE.weekly.best = { meters: meters };
  lsSet(K_WEEKLY, SAVE.weekly);
  if (G.mode === 'classic' && meters > SAVE.best.meters) SAVE.best = { meters: meters, date: today };
  lsSet(K_BEST, SAVE.best); // classic best drives the rank
  if (G.mode === 'daily') markDailyRun(today, meters, finished, timeSec);
}
function autosave() {
  const today = utcDate(), wk = isoWeekKey(today);
  if (SAVE.weekly.weekKey !== wk) SAVE.weekly = { weekKey: wk, best: { meters: 0 } };
  if (metersNow() > SAVE.weekly.best.meters) SAVE.weekly.best = { meters: metersNow() };
  lsSet(K_WEEKLY, SAVE.weekly);
  lsSet(K_STATS, SAVE.stats);
}

/* ---------------- state ---------------- */
const G = {
  state: 'TITLE', mode: 'daily', routeDate: '',
  route: null, runT: 0, autosaveT: 0,
  p: null, deaths: 0, sessionDeaths: 0, jumps: 0, combo: 0, deadT: 0, deadCause: '', deadMeters: 0,
  finished: false, finishTime: 0, overT: 0, newBest: false, finishFlash: 0,
  autoJump: false, holding: false, bufT: 0, coyoteT: 0,
  particles: [], popups: [], hitRegions: [], shake: 0, flash: 0,
  toast: '', toastT: 0, bg: null, phase: 0, lastEvent: '', deathX: 0, bestFlash: 0,
};
const MAX_PARTICLES = 260;

function metersNow() { return G.p ? Math.max(0, Math.floor((G.p.x - G.route.startX) / 10)) : 0; }
function speedNow() { return RR.speedFor(G.runT); }

function buildBg(seed) {
  const rng = RR.mulberry32(seed || 20260915);
  const mk = (n, hMin, hMax) => {
    const arr = []; let x = -80;
    while (x < 4200) {
      const bw = 50 + rng() * 110, bh = hMin + rng() * (hMax - hMin);
      arr.push({ x: x, w: bw, h: bh, win: rng() });
      x += bw + 8 + rng() * 34;
    }
    return arr;
  };
  G.bg = { far: mk(0, 110, 250), near: mk(0, 60, 150), stars: [] };
  for (let i = 0; i < 60; i++) G.bg.stars.push({ x: rng() * W, y: rng() * H * 0.5, r: 0.6 + rng() * 1.6, p: rng() * 6.28 });
}

function newPlayer(route) {
  route.roofs.forEach(r => { r._ti = 0; });
  return { x: route.startX, y: route.roofs[0].top, vy: 0, grounded: true, ri: 0,
           sx: 1, sy: 1, leg: 0, air: 0 };
}

function startRun(mode, dateStr) {
  G.mode = mode === 'classic' ? 'classic' : 'daily';
  G.routeDate = G.mode === 'daily' ? (dateStr || utcDate()) : '';
  if (G.mode === 'daily') {
    G.route = G._dailyCache && G._dailyCacheDate === G.routeDate ? G._dailyCache : RR.buildDailyRoute(G.routeDate);
    G._dailyCache = G.route; G._dailyCacheDate = G.routeDate;
  } else {
    G.route = RR.buildClassicRoute();
  }
  buildBg(G.route.seed || 20260915);
  G.p = newPlayer(G.route);
  G.state = 'PLAY';
  G.runT = 0; G.autosaveT = 0;
  G.jumps = 0; G.combo = 0; G.deaths = 0;
  G.finished = false; G.finishTime = 0; G.overT = 0; G.newBest = false;
  G.autoJump = false; G.holding = false; G.bufT = 0; G.coyoteT = 0;
  G.particles = []; G.popups = []; G.shake = 0; G.flash = 0;
  G.lastEvent = 'start';
}

function doJump(auto) {
  const p = G.p;
  p.vy = -P.JUMPV; p.grounded = false; p.air = 1;
  G.jumps += 1; G.combo += 1;
  G.holding = auto ? true : true; // full jump while held; release cuts
  G.bufT = 0; G.coyoteT = 0;
  p.sy = 1.22; p.sx = 0.82; // stretch
  burst(p.x, p.y, 6, C.cyan, 180, true);
  Sound.sfx.jump(G.combo);
  G.lastEvent = auto ? 'autojump' : 'jump';
}

function jumpDown() {
  if (G.state !== 'PLAY') return;
  const p = G.p;
  if (p.grounded) doJump(false);
  else if (G.coyoteT > 0) doJump(false);
  else G.bufT = 0.1; // buffer: jump fires the instant we land
}
function jumpUp() {
  G.holding = false;
  const p = G.p;
  if (!p.grounded && p.vy < P.JUMP_CUT) p.vy = P.JUMP_CUT; // variable jump cut
}

function die(cause) {
  if (G.state !== 'PLAY') return;
  const p = G.p;
  G.state = 'DEAD'; G.deadT = 0; G.deadCause = cause; G.deaths += 1; G.sessionDeaths += 1; G.deathX = p.x;
  G.deadMeters = metersNow();
  G.newBest = G.mode === 'classic' && G.deadMeters > SAVE.best.meters && G.deadMeters > 0;
  persistRun(G.deadMeters, false, 0, G.combo);
  G.shake = 10; G.flash = 0.5;
  burst(p.x, Math.min(p.y, P.ROOF_Y + 60), 26, cause === 'spike' ? C.gold : C.pink, 460);
  burst(p.x, Math.min(p.y, P.ROOF_Y + 60), 12, C.cyan, 300);
  Sound.sfx.die();
  G.lastEvent = 'death:' + cause;
}
function finishRun() {
  if (G.state !== 'PLAY') return;
  G.state = 'FINISH'; G.overT = 0;
  G.finished = true; G.finishTime = G.runT;
  const m = metersNow();
  G.newBest = !SAVE.daily.finished || G.finishTime < SAVE.daily.timeSec;
  persistRun(m, true, G.runT, G.combo);
  G.finishFlash = 1;
  for (let i = 0; i < 40; i++) {
    burstCam(G.p.x + (Math.random() * 2 - 1) * 160, 260 + Math.random() * 180, 2,
      [C.gold, C.cyan, C.pink, C.green][i % 4], 380);
  }
  Sound.sfx.finish();
  G.lastEvent = 'finish';
}

/* ---------------- particles / popups ---------------- */
function burst(x, y, n, col, spd, dust) {
  for (let i = 0; i < n && G.particles.length < MAX_PARTICLES; i++) {
    const a = dust ? (-Math.PI / 2 + (Math.random() - 0.5) * 1.6) : Math.random() * Math.PI * 2;
    const v = (0.3 + Math.random() * 0.7) * (spd || 420);
    G.particles.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (dust ? 60 : 120),
      life: 0.35 + Math.random() * 0.5, max: 0.85, r: 1.5 + Math.random() * 3, col: col,
      g: dust ? 260 : 900, shrink: !dust });
  }
}
function burstCam(x, y, n, col, spd) { burst(x, y, n, col, spd); }
function popup(txt, col) { G.popups.push({ txt: txt, col: col, t: 0, life: 1.0 }); }

/* ---------------- update ---------------- */
function update(dt) {
  if (G.state === 'PLAY') updatePlay(dt);
  else if (G.state === 'DEAD') {
    G.deadT += dt;
    if (G.deadT >= 1.0) startRun(G.mode, G.routeDate); // zero-friction restart, same daily route
  } else if (G.state === 'FINISH') G.overT += dt;
  stepFx(dt);
}

function updatePlay(dt) {
  const p = G.p, route = G.route, roofs = route.roofs;
  G.runT += dt;
  const v = RR.speedFor(G.runT);
  G.autosaveT += dt;
  if (G.autosaveT >= 10) { G.autosaveT = 0; autosave(); }

  if (p.grounded) {
    const r = roofs[p.ri];
    p.x += v * dt;
    // planned auto-jump fires on the first frame past the planned x
    if (G.autoJump && r.takeoffs && r._ti < r.takeoffs.length && p.x >= r.takeoffs[r._ti]) {
      r._ti += 1;
      doJump(true);
    } else if (G.bufT > 0) {
      doJump(false); // buffered human tap lands -> jump immediately
    } else {
      if (r.spike && p.x + HW > r.spike.x && p.x - HW < r.spike.x + r.spike.w) { die('spike'); return; }
      const nx = roofs[p.ri + 1];
      if (nx && p.x + HW > nx.x && p.y > nx.top + 2) { die('wall'); return; }
      if (p.x > r.x + r.w) {
        p.grounded = false; p.vy = 0; p.air = 1;
        G.coyoteT = 0.08;
      }
    }
    p.leg += v * dt * 0.055;
  }

  if (!p.grounded) {
    G.bufT = Math.max(0, G.bufT - dt);
    G.coyoteT = Math.max(0, G.coyoteT - dt);
    const px = p.x, py = p.y;
    p.vy += P.G * dt; p.x += v * dt; p.y += p.vy * dt;
    let dead = false, landed = -1, lx = 0, cause = '';
    for (let j = Math.max(0, p.ri - 1); j <= Math.min(roofs.length - 1, p.ri + 3); j++) {
      const r = roofs[j];
      if (r.spike && p.x > r.spike.x - HW && p.x < r.spike.x + r.spike.w + HW && p.y > r.top - P.SPIKE_H) {
        dead = true; cause = 'spike'; break;
      }
      if (j > p.ri && px < r.x && p.x >= r.x && p.y > r.top + 2) { dead = true; cause = 'wall'; break; }
      if (p.vy > 0 && py <= r.top && p.y >= r.top && p.x >= r.x + 1 && p.x <= r.x + r.w - 1) {
        const f = (r.top - py) / (p.y - py);
        lx = px + (p.x - px) * f; landed = j; break;
      }
    }
    if (dead) { die(cause); return; }
    if (landed >= 0) {
      p.grounded = true; p.ri = landed; p.y = roofs[landed].top; p.vy = 0; p.x = lx;
      p.sy = 0.74; p.sx = 1.26; // squash
      G.holding = false;
      burst(p.x, p.y, 8, 'rgba(0,229,255,0.8)', 200, true);
      Sound.sfx.land();
      G.lastEvent = 'land';
    } else if (p.y > P.DEATH_Y) { die('fall'); return; }
  }

  if (G.mode === 'classic') RR.extendRoute(route, p.x + 2.4 * W);
  if (route.finishX && p.x >= route.finishX) { finishRun(); return; }

  // speed lines
  if (v > 340 && Math.random() < 0.5) {
    G.particles.push({ x: p.x + 140 + Math.random() * 260, y: 60 + Math.random() * 380,
      vx: -v * 1.6, vy: 0, life: 0.3, max: 0.3, r: 1.2, col: 'rgba(0,229,255,0.5)', g: 0, shrink: false, line: true });
  }
}

function stepFx(dt) {
  G.shake = Math.max(0, G.shake - dt * 26);
  G.flash = Math.max(0, G.flash - dt * 2.4);
  G.toastT = Math.max(0, G.toastT - dt);
  G.bestFlash = Math.max(0, G.bestFlash - dt);
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const q = G.particles[i];
    q.life -= dt;
    if (q.life <= 0) { G.particles.splice(i, 1); continue; }
    q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.g || 0) * dt;
  }
  for (let i = G.popups.length - 1; i >= 0; i--) {
    G.popups[i].t += dt;
    if (G.popups[i].t > G.popups[i].life) G.popups.splice(i, 1);
  }
  const p = G.p;
  if (p) { p.sx += (1 - p.sx) * Math.min(1, dt * 12); p.sy += (1 - p.sy) * Math.min(1, dt * 12); }
}

/* ---------------- share ---------------- */
function shareText() {
  const m = G.finished ? metersNow() : G.deadMeters;
  if (G.mode === 'daily' && G.finished) {
    return '🏁 Rooftop Rush Daily ' + G.routeDate + ': FINISHED in ' + round1(G.finishTime) +
      's (' + m + 'm + 500 bonus) | seyrs1985.github.io/neonplay/rooftop-rush/';
  }
  if (G.mode === 'daily') {
    const pct = Math.min(100, Math.round(100 * G.deathX / (G.route ? G.route.finishX : 1)));
    return '🏃 Rooftop Rush Daily ' + G.routeDate + ': ran ' + (G.deathX - G.route.startX) +
      'px (' + pct + '% of the track, ' + G.route.chunkIds.length + ' blocks) | seyrs1985.github.io/neonplay/rooftop-rush/';
  }
  const r = rankFor(SAVE.best.meters);
  return '🏃 Rooftop Rush: ' + m + 'm · ' + r.emoji + ' ' + r.name + ' | seyrs1985.github.io/neonplay/rooftop-rush/';
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
    x.fillStyle = 'rgba(232,236,255,' + (0.08 + 0.22 * ((i * 37) % 10) / 10).toFixed(2) + ')';
    x.fillRect((i * 89) % cw, (i * 131) % ch, 2, 2);
  }
  x.strokeStyle = C.cyan; x.lineWidth = 3;
  x.strokeRect(24, 24, cw - 48, ch - 48);
  x.textAlign = 'center';
  x.fillStyle = C.ink; x.font = 'bold 52px system-ui, sans-serif';
  x.fillText('🏃 ROOFTOP RUSH', cw / 2, 120);
  if (G.mode === 'daily' && G.finished) {
    x.fillStyle = C.gold; x.font = 'bold 150px system-ui, sans-serif';
    x.fillText(round1(G.finishTime) + 's', cw / 2, 310);
    x.fillStyle = C.dim; x.font = '600 34px system-ui, sans-serif';
    x.fillText('DAILY TRACK ' + G.routeDate + ' · ' + metersNow() + 'm + 500', cw / 2, 366);
  } else {
    const m = G.mode === 'daily' ? G.deadMeters : metersNow();
    x.fillStyle = C.gold; x.font = 'bold 150px system-ui, sans-serif';
    x.fillText(String(m) + 'm', cw / 2, 310);
    x.fillStyle = C.dim; x.font = '600 34px system-ui, sans-serif';
    x.fillText((G.mode === 'daily' ? 'DAILY ' + G.routeDate : 'CLASSIC RUN') + ' · ' + utcDate(), cw / 2, 366);
  }
  const r = rankFor(SAVE.best.meters);
  x.font = 'bold 72px system-ui, sans-serif'; x.fillStyle = C.pink;
  x.fillText(r.emoji + '  ' + r.name.toUpperCase(), cw / 2, 500);
  x.font = '600 38px system-ui, sans-serif'; x.fillStyle = C.ink;
  x.fillText(G.jumps + ' ' + T('jumps') + ' · ' + T('combo') + ' ×' + G.combo, cw / 2, 580);
  // today's-route progress bar
  const px0 = 100, px1 = cw - 100, py = 640;
  x.fillStyle = 'rgba(232,236,255,0.16)';
  x.fillRect(px0, py, px1 - px0, 16);
  const frac = G.route && G.route.finishX ? clamp((G.finished ? G.route.finishX : G.deathX) - G.route.startX, 0, G.route.finishX - G.route.startX) / (G.route.finishX - G.route.startX) : 0;
  x.fillStyle = C.cyan;
  x.fillRect(px0, py, (px1 - px0) * frac, 16);
  x.font = '600 28px system-ui, sans-serif'; x.fillStyle = C.dim;
  x.fillText(Math.round(frac * 100) + '% ' + T('dailyBest').toUpperCase(), cw / 2, 692);
  x.strokeStyle = 'rgba(0,229,255,0.35)'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(80, 740); x.lineTo(cw - 80, 740); x.stroke();
  x.fillStyle = C.cyan; x.font = '600 32px system-ui, sans-serif';
  x.fillText('seyrs1985.github.io/neonplay/rooftop-rush/', cw / 2, 796);
  return cv;
}
async function doShare() {
  const text = shareText();
  let shared = false;
  try {
    if (navigator.share) {
      const cv = buildShareCard();
      const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'rooftop-rush.png', { type: 'image/png' })] })) {
        await navigator.share({ files: [new File([blob], 'rooftop-rush.png', { type: 'image/png' })], title: 'Rooftop Rush', text: text });
        shared = true;
      } else { await navigator.share({ title: 'Rooftop Rush', text: text }); shared = true; }
    }
  } catch (e) { /* cancel / unsupported -> clipboard */ }
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
  for (const r of G.hitRegions) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { pressButton(r.id); return; }
  }
  if (G.state === 'PLAY') jumpDown();
}
function onRelease() { if (G.state === 'PLAY') jumpUp(); }
function pressButton(id) {
  Sound.sfx.click();
  if (id === 'classic') { startRun('classic'); Sound.sfx.start(); }
  else if (id === 'daily') { startRun('daily'); Sound.sfx.start(); }
  else if (id === 'retry') { startRun(G.mode, G.routeDate); Sound.sfx.start(); }
  else if (id === 'menu') { G.state = 'TITLE'; G.route = G._dailyCache || null; }
  else if (id === 'resume') { G.state = 'PLAY'; }
  else if (id === 'share') { doShare(); }
}

/* ---------------- render ---------------- */
function draw(ctx) {
  G.hitRegions = [];
  const p = G.p;
  const camX = p ? p.x - 140 : 0;
  const shx = G.shake > 0 ? (Math.random() * 2 - 1) * G.shake : 0;
  const shy = G.shake > 0 ? (Math.random() * 2 - 1) * G.shake : 0;

  // sky
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#0a0a18'); g.addColorStop(0.7, '#141a3c'); g.addColorStop(1, '#1a1040');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

  if (G.bg) {
    // stars
    ctx.fillStyle = '#e8ecff';
    for (const s of G.bg.stars) {
      const tw = 0.35 + 0.45 * Math.sin(G.phase + s.p);
      ctx.globalAlpha = tw * 0.8;
      ctx.fillRect(s.x, s.y, s.r, s.r);
    }
    ctx.globalAlpha = 1;
    drawSkyline(ctx, G.bg.far, camX * 0.2, '#141c3e', 0.55);
    drawSkyline(ctx, G.bg.near, camX * 0.45, '#0e1430', 0.8);
  }

  ctx.save();
  ctx.translate(-camX + shx, shy);

  const roofs = G.route ? G.route.roofs : [];
  for (const r of roofs) {
    if (r.x + r.w < camX - 60 || r.x > camX + W + 60) continue;
    drawRoof(ctx, r);
  }
  if (G.route && G.route.finishX) drawFinish(ctx, G.route);

  // particles (additive glow)
  ctx.globalCompositeOperation = 'lighter';
  for (const q of G.particles) {
    const a = clamp(q.life / q.max, 0, 1);
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = q.col;
    if (q.line) ctx.fillRect(q.x, q.y, 26, q.r);
    else ctx.fillRect(q.x - q.r / 2, q.y - q.r / 2, q.r, q.r * (q.shrink ? a : 1));
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  if (p && G.state !== 'TITLE') drawRunner(ctx, p);
  ctx.restore();

  drawHud(ctx, camX);

  if (G.flash > 0) {
    ctx.fillStyle = 'rgba(255,42,110,' + (G.flash * 0.35).toFixed(2) + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (G.toastT > 0) {
    ctx.globalAlpha = Math.min(1, G.toastT);
    ctx.font = '600 22px system-ui, sans-serif';
    ctx.textAlign = 'center'; ctx.fillStyle = C.ink;
    ctx.fillText(G.toast, W / 2, H - 40);
    ctx.globalAlpha = 1;
  }
  G.phase += 0.05;
}

function drawSkyline(ctx, arr, ox, col, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = col;
  const period = 4200;
  for (const b of arr) {
    for (let rep = -1; rep <= 1; rep++) {
      const x = ((b.x - ox) % period + period * 1.5) % period + rep * period - 200;
      if (x < -160 || x > W + 160) continue;
      ctx.fillRect(x, H - 170 - b.h, b.w, b.h + 170);
      if (b.win > 0.55) {
        ctx.fillStyle = 'rgba(255,213,74,0.25)';
        ctx.fillRect(x + 6, H - 150 - b.h, b.w - 12, Math.min(40, b.h * 0.5));
        ctx.fillStyle = col;
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawRoof(ctx, r) {
  const top = r.top;
  // facade
  ctx.fillStyle = r.soft ? '#22305' + '6' : C.roof;
  ctx.fillRect(r.x, top, r.w, H - top);
  // windows (deterministic pattern)
  ctx.fillStyle = 'rgba(0,229,255,0.10)';
  for (let wy = top + 26; wy < H - 10; wy += 34) {
    for (let wx = r.x + 14; wx < r.x + r.w - 12; wx += 30) {
      const hsh = ((wx * 7 + wy * 13) | 0) % 5;
      if (hsh === 0) { ctx.fillStyle = 'rgba(255,213,74,0.32)'; ctx.fillRect(wx, wy, 10, 14); ctx.fillStyle = 'rgba(0,229,255,0.10)'; }
      else if (hsh < 3) ctx.fillRect(wx, wy, 10, 14);
    }
  }
  // fake glow: layered translucent top edge, no shadowBlur
  ctx.fillStyle = 'rgba(0,229,255,0.14)'; ctx.fillRect(r.x, top - 6, r.w, 10);
  ctx.fillStyle = 'rgba(0,229,255,0.30)'; ctx.fillRect(r.x, top - 3, r.w, 6);
  ctx.fillStyle = C.cyan; ctx.fillRect(r.x, top - 1.5, r.w, 3);
  // side edges
  ctx.fillStyle = 'rgba(0,229,255,0.5)';
  ctx.fillRect(r.x, top, 2, Math.min(24, H - top));
  ctx.fillRect(r.x + r.w - 2, top, 2, Math.min(24, H - top));
  // spike strip
  if (r.spike) {
    const s = r.spike;
    const pulse = 0.55 + 0.35 * Math.sin(G.phase * 2);
    ctx.fillStyle = 'rgba(255,84,112,' + (0.18 * pulse).toFixed(2) + ')';
    ctx.fillRect(s.x - 4, r.top - 22, s.w + 8, 22);
    ctx.fillStyle = C.gold;
    const n = Math.max(2, Math.round(s.w / 14));
    const sw = s.w / n;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      ctx.moveTo(s.x + i * sw, r.top);
      ctx.lineTo(s.x + i * sw + sw / 2, r.top - P.SPIKE_H);
      ctx.lineTo(s.x + (i + 1) * sw, r.top);
    }
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillRect(s.x, r.top - P.SPIKE_H, s.w, 1.5);
  }
}

function drawFinish(ctx, route) {
  const fx = route.finishX;
  const top = P.ROOF_Y;
  // checkered gate
  ctx.fillStyle = '#e8ecff';
  ctx.fillRect(fx - 3, top - 150, 6, 150);
  for (let i = 0; i < 6; i++) {
    for (let j = 0; j < 2; j++) {
      ctx.fillStyle = (i + j) % 2 ? '#e8ecff' : '#101438';
      ctx.fillRect(fx + j * 16 - 16, top - 150 + i * 16, 16, 16);
    }
  }
  ctx.fillStyle = 'rgba(255,213,74,' + (0.5 + 0.4 * Math.sin(G.phase * 3)).toFixed(2) + ')';
  ctx.fillRect(fx - 2, top - 170, 4, 170);
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = C.gold;
  ctx.fillText('FINISH', fx, top - 182);
}

function drawRunner(ctx, p) {
  const x = p.x, y = p.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(p.sx, p.sy);
  // fake glow underlay
  ctx.strokeStyle = 'rgba(255,45,149,0.30)'; ctx.lineWidth = 9; ctx.lineCap = 'round';
  pose(ctx, p, true);
  ctx.strokeStyle = C.pink; ctx.lineWidth = 4;
  pose(ctx, p, false);
  ctx.fillStyle = C.pink;
  ctx.beginPath(); ctx.arc(0, -40, 6.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,45,149,0.35)';
  ctx.beginPath(); ctx.arc(0, -40, 10, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  function pose(c, pl, glow) {
    const grounded = pl.grounded;
    const sw = grounded ? Math.sin(pl.leg) : 0.9;
    const sw2 = grounded ? Math.sin(pl.leg + Math.PI) : -0.6;
    const armA = grounded ? Math.sin(pl.leg + Math.PI) * 0.8 : -1.1;
    c.beginPath();
    // legs
    c.moveTo(0, -14); c.lineTo(sw * 11, grounded ? 0 : -4 + Math.abs(sw) * 3);
    c.moveTo(0, -14); c.lineTo(sw2 * 11, grounded ? 0 : -10);
    // body
    c.moveTo(0, -14); c.lineTo(0, -33);
    // arms
    c.moveTo(0, -28); c.lineTo(armA * 10, -20 - Math.abs(armA) * 4);
    c.moveTo(0, -28); c.lineTo(-armA * 10, -20 - Math.abs(armA) * 4);
    c.stroke();
  }
}

function drawHud(ctx, camX) {
  ctx.textAlign = 'left';
  if (G.state === 'PLAY' || G.state === 'DEAD') {
    ctx.font = 'bold 46px system-ui, sans-serif';
    ctx.fillStyle = C.ink;
    ctx.fillText(metersNow() + T('m'), 18, 52);
    ctx.font = '600 18px system-ui, sans-serif';
    ctx.fillStyle = C.dim;
    ctx.fillText(Math.round(speedNow()) + ' px/s', 18, 78);
    if (G.combo >= 3) {
      ctx.textAlign = 'right';
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillStyle = C.cyan;
      ctx.fillText(T('combo') + ' ×' + G.combo, W - 18, 46);
    }
    if (G.mode === 'daily') {
      ctx.textAlign = 'right';
      ctx.font = 'bold 34px system-ui, sans-serif';
      ctx.fillStyle = C.gold;
      ctx.fillText(round1(G.runT) + 's', W - 18, 86);
      // progress bar
      const frac = G.route && G.route.finishX ? clamp((G.p.x - G.route.startX) / (G.route.finishX - G.route.startX), 0, 1) : 0;
      ctx.fillStyle = 'rgba(232,236,255,0.14)';
      ctx.fillRect(18, H - 26, W - 36, 8);
      ctx.fillStyle = C.cyan;
      ctx.fillRect(18, H - 26, (W - 36) * frac, 8);
    }
  }
  if (G.state === 'DEAD') {
    panel(ctx, W / 2 - 170, 250, 340, 150);
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px system-ui, sans-serif';
    ctx.fillStyle = C.red;
    ctx.fillText(T('over'), W / 2, 296);
    ctx.font = 'bold 44px system-ui, sans-serif';
    ctx.fillStyle = C.ink;
    ctx.fillText(G.deadMeters + T('m'), W / 2, 348);
    if (G.newBest) {
      ctx.font = 'bold 24px system-ui, sans-serif';
      ctx.fillStyle = C.gold;
      ctx.fillText(T('newBest'), W / 2, 382);
    }
  }
  if (G.state === 'FINISH') drawFinishPanel(ctx);
  if (G.state === 'TITLE') drawTitle(ctx);
  if (G.state === 'PAUSE') {
    ctx.fillStyle = 'rgba(6,8,20,0.72)'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center';
    ctx.font = 'bold 44px system-ui, sans-serif'; ctx.fillStyle = C.ink;
    ctx.fillText(T('paused'), W / 2, H / 2 - 40);
    button(ctx, W / 2 - 120, H / 2 + 10, 240, 64, T('resume'), 'resume');
  }
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = C.panel;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(0,229,255,0.5)'; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
}
function button(ctx, x, y, w, h, txt, id) {
  ctx.fillStyle = id === 'daily' ? 'rgba(255,45,149,0.22)' : 'rgba(0,229,255,0.16)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = id === 'daily' ? C.pink : C.cyan; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = C.ink;
  ctx.font = 'bold 26px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(txt, x + w / 2, y + h / 2 + 9);
  G.hitRegions.push({ x: x, y: y, w: w, h: h, id: id });
}

function drawTitle(ctx) {
  ctx.fillStyle = 'rgba(6,8,20,0.55)'; ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px system-ui, sans-serif';
  ctx.fillStyle = C.pink;
  ctx.fillText(T('title'), W / 2, 150);
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillStyle = C.dim;
  ctx.fillText(T('tagline'), W / 2, 184);
  button(ctx, W / 2 - 150, 240, 300, 68, T('daily'), 'daily');
  ctx.font = '500 15px system-ui, sans-serif';
  ctx.fillStyle = C.dim;
  ctx.fillText(T('dailyTag'), W / 2, 328);
  button(ctx, W / 2 - 150, 356, 300, 68, T('classic'), 'classic');
  ctx.font = '500 15px system-ui, sans-serif';
  ctx.fillStyle = C.dim;
  ctx.fillText(T('classicTag'), W / 2, 444);
  const r = rankFor(SAVE.best.meters);
  ctx.font = '600 19px system-ui, sans-serif';
  ctx.fillStyle = C.ink;
  ctx.fillText(T('best') + ' ' + SAVE.best.meters + T('m') + ' · ' + T('streak') + ' ' + SAVE.streak.count + T('days') +
    ' · ' + r.emoji + ' ' + r.name, W / 2, 496);
  if (r.nextMin !== null) {
    ctx.font = '500 15px system-ui, sans-serif';
    ctx.fillStyle = C.dim;
    ctx.fillText(T('nextRank') + ' ' + r.nextMin + T('m'), W / 2, 522);
  }
  if (SAVE.daily.date === utcDate() && SAVE.daily.meters > 0) {
    ctx.font = '500 15px system-ui, sans-serif';
    ctx.fillStyle = C.green;
    ctx.fillText(T('dailyBest') + ': ' + SAVE.daily.meters + T('m') +
      (SAVE.daily.finished ? ' · ' + round1(SAVE.daily.timeSec) + 's' : ''), W / 2, 550);
  }
  ctx.font = '500 16px system-ui, sans-serif';
  ctx.fillStyle = C.cyan;
  ctx.fillText(T('hint'), W / 2, H - 88);
  if (SAVE.best.meters > 0) button(ctx, W / 2 - 90, H - 70, 180, 48, T('share'), 'share');
}

function drawFinishPanel(ctx) {
  const slide = Math.min(1, G.overT * 2.2);
  ctx.save();
  ctx.translate(0, (1 - slide) * -60);
  // FINISH banner
  ctx.save();
  ctx.translate(W / 2, 170);
  ctx.rotate(-0.06);
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,213,74,0.25)';
  ctx.fillText(T('finish'), 3, 3);
  ctx.fillStyle = C.gold;
  ctx.fillText(T('finish'), 0, 0);
  ctx.restore();
  panel(ctx, W / 2 - 180, 230, 360, 260);
  ctx.textAlign = 'center';
  ctx.font = 'bold 62px system-ui, sans-serif';
  ctx.fillStyle = C.gold;
  ctx.fillText(round1(G.finishTime) + 's', W / 2, 320);
  ctx.font = '600 22px system-ui, sans-serif';
  ctx.fillStyle = C.ink;
  ctx.fillText(T('finished') + ' ' + metersNow() + T('m') + ' + 500', W / 2, 360);
  ctx.fillStyle = C.dim;
  ctx.fillText(G.route.chunkIds.length + ' blocks · ' + G.jumps + ' ' + T('jumps') + ' · ' + T('combo') + ' ×' + G.combo, W / 2, 392);
  if (G.newBest) {
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillStyle = C.green;
    ctx.fillText(T('newBest'), W / 2, 428);
  }
  ctx.restore();
  if (G.overT > 0.5) {
    button(ctx, W / 2 - 150, 520, 300, 60, T('retry'), 'retry');
    button(ctx, W / 2 - 150, 596, 142, 60, T('menu'), 'menu');
    button(ctx, W / 2 + 8, 596, 142, 60, T('share'), 'share');
  }
}

/* ---------------- deterministic hooks (GAME_STANDARD + design acceptance §8) ---------------- */
(function () {
  window.__qaState = () => ({
    state: G.state, mode: G.mode, routeDate: G.routeDate,
    x: G.p ? Math.round(G.p.x) : 0, meters: G.p ? metersNow() : 0,
    speed: Math.round(speedNow() * 10) / 10, runT: Math.round(G.runT * 100) / 100,
    jumps: G.jumps, combo: G.combo, deaths: G.sessionDeaths, deadCause: G.deadCause,
    finished: G.finished, finishTime: Math.round(G.finishTime * 100) / 100,
    score: G.finished ? metersNow() + 500 : metersNow(),
    best: SAVE.best.meters, streak: { count: SAVE.streak.count, last: SAVE.streak.last, best: SAVE.streak.best, protect: SAVE.streak.protect },
    daily: SAVE.daily,
    finishX: G.route ? Math.round(G.route.finishX) : 0,
    chunks: G.route ? G.route.chunkIds.length : 0,
    chunkIds: G.route ? G.route.chunkIds.slice() : [],
    routeLen: G.route ? Math.round(G.route.roofs[G.route.roofs.length - 1].x + G.route.roofs[G.route.roofs.length - 1].w) : 0,
    lastEvent: G.lastEvent, hitButtons: G.hitRegions.map(r => r.id),
    grounded: G.p ? G.p.grounded : false,
  });

  window.__qa = {
    start(mode, dateStr) { startRun(mode === 'classic' ? 'classic' : 'daily', dateStr); return window.__qaState(); },
    sim(seconds) {
      const n = Math.max(1, Math.round(seconds * 60));
      for (let i = 0; i < n; i++) {
        update(1 / 60);
        if (G.state === 'FINISH' && G.overT > 3) break;
      }
      return window.__qaState();
    },
    autoJump(on) { G.autoJump = !!on; return G.autoJump; },
    jumpDown() { jumpDown(); return true; },
    jumpUp() { jumpUp(); return true; },
    route(dateStr) {
      const r = RR.buildDailyRoute(dateStr || utcDate());
      return {
        date: r.date, seed: r.seed, attempt: r.attempt, adjustments: r.adjustments,
        chunkIds: r.chunkIds, finishX: Math.round(r.finishX),
        lenPx: Math.round(r.roofs[r.roofs.length - 1].x + r.roofs[r.roofs.length - 1].w - r.startX),
        chunks: r.chunkIds.length,
        roofs: r.roofs.map(rr => ({
          x: Math.round(rr.x), w: rr.w, top: rr.top, chunk: rr.chunk,
          gapAfter: rr.gapAfter, spikeW: rr.spike ? rr.spike.w : 0,
          wallH: rr.wallH, takeoffs: rr.takeoffs.slice(),
        })),
        envelope: RR.verifyEnvelope(r),
        sim: RR.simulateRun(r),
      };
    },
    speedAt: RR.speedAt, rankFor: rankFor,
    shareText: shareText, buildShareCard: buildShareCard,
  };

  const q = new URLSearchParams(location.search);
  const autotest = q.get('autotest');
  const shot = q.get('shot');
  if (!autotest && !shot) return;

  // deterministic everything for shot/autotest modes
  let seed = (parseInt(q.get('seed') || '20260915', 10) >>> 0) || 1;
  Math.random = function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  if (shot) {
    loadStorage();
    if (shot === 'title') { G.state = 'TITLE'; buildBg(20260915); }
    else if (shot === 'play') { startRun('daily', '2026-09-15'); G.runT = 6; G.p.x = G.route.startX + 1700; G.p.ri = 4; }
    else if (shot === 'over') { startRun('daily', '2026-09-15'); G.state = 'FINISH'; G.finished = true; G.finishTime = 32.4; G.overT = 1; }
    return;
  }

  /* ---- ?autotest=1 in-page self-check ---- */
  const results = {};
  const KEYS = [K_BEST, K_TOP10, K_DAILY, K_STREAK, K_STATS, K_WEEKLY];
  function clearSave() {
    for (const k of KEYS) { try { localStorage.removeItem(k); } catch (e) {} }
    loadStorage();
  }
  try {
    // 1) daily seed determinism + next-day difference (design acceptance #4)
    const d1 = window.__qa.route('2026-09-15'), d2 = window.__qa.route('2026-09-15');
    const d3 = window.__qa.route('2026-09-16');
    results.dailyDeterministic = JSON.stringify(d1.roofs) === JSON.stringify(d2.roofs) && JSON.stringify(d1.chunkIds) === JSON.stringify(d2.chunkIds);
    results.dailyDiffersNextDay = JSON.stringify(d1.chunkIds) !== JSON.stringify(d3.chunkIds);
    results.dailyChunks14 = d1.chunks === 14;
    // 2) reachability envelope (design acceptance #3): gaps within chunk band,
    //    walls <=118, spikes within data and half airborne distance
    results.envelopeClean = d1.envelope.length === 0 && d3.envelope.length === 0;
    // 3) full-route playability via the auto-jump policy
    results.routeSimClean = d1.sim.finished && d1.sim.deaths === 0;
    results.finishTimeSane = d1.sim.timeSec >= 20 && d1.sim.timeSec <= 45;
    // 4) physics numbers (design acceptance #5)
    results.speedRamp = RR.speedFor(0) === 240 && RR.speedFor(10) === 300 && RR.speedFor(31) === 420;
    results.jumpHeight = Math.abs(P.JUMP_H - 138) / 138 <= 0.03;
    results.airTime = Math.abs(P.AIR_T - 0.71) / 0.71 <= 0.03;
    // 5) rank thresholds incl. exact boundaries
    results.rankBoundaries = rankFor(0).key === 'bronze' && rankFor(499).key === 'bronze' &&
      rankFor(500).key === 'silver' && rankFor(999).key === 'silver' && rankFor(1000).key === 'gold' &&
      rankFor(1499).key === 'gold' && rankFor(1500).key === 'platinum' && rankFor(1999).key === 'platinum' &&
      rankFor(2000).key === 'diamond' && rankFor(2749).key === 'diamond' && rankFor(2750).key === 'master' &&
      rankFor(3499).key === 'master' && rankFor(3500).key === 'legend';
    // 6) variable jump cut: full hold reaches ~138px, early release far less
    results.jumpCut = (function () {
      function fly(cut) {
        let vy = -P.JUMPV, y = 0;
        const dt = 1 / 240;
        for (let i = 0; i < 2000; i++) {
          vy += P.G * dt; y += vy * dt;
          if (cut && i === 8) vy = P.JUMP_CUT; // released ~33ms in
          if (vy >= 0) return -y;
        }
        return -y;
      }
      const full = fly(false), hop = fly(true);
      return Math.abs(full - P.JUMP_H) < 6 && hop < full * 0.6;
    })();
    // 7) full daily run in-page via sim + autoJump (LESSONS #9 red line)
    clearSave();
    let s = window.__qa.start('daily', '2026-09-15');
    window.__qa.autoJump(true);
    let mono = true, lastX = -1, maxMeters = 0;
    for (let step = 0; step < 45; step++) {
      s = window.__qa.sim(1);
      maxMeters = Math.max(maxMeters, s.meters);
      if (lastX >= 0 && s.x < lastX - 600 && s.state === 'PLAY') mono = false; // respawn resets allowed
      lastX = s.x;
      if (s.state === 'FINISH') break;
    }
    results.autoRunFinishes = s.state === 'FINISH' && s.finished;
    results.autoRunNoDeaths = s.deaths === 0;
    results.autoRunMetersGrew = maxMeters > 500;
    results.finishBonus500 = s.score === s.meters + 500;
    // 8) death -> auto-restart <=1s (design acceptance #6)
    window.__qa.start('classic');
    window.__qa.autoJump(false);
    let sd = window.__qa.sim(2.6);
    results.deathByNoJump = sd.deaths >= 1 || sd.state === 'DEAD';
    if (sd.state === 'PLAY') results.autoRestart = sd.deaths >= 1; // already respawned
    else if (sd.state === 'DEAD') {
      sd = window.__qa.sim(1.15);
      results.autoRestart = sd.state === 'PLAY';
    } else results.autoRestart = false;
    // 9) storage keys after settled runs (design acceptance #4)
    const keys = [];
    try { for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch (e) {}
    results.storageKeys = KEYS.every(k => keys.indexOf(k) >= 0);
    // 10) share card non-blank + site link (design acceptance #4)
    const cv = buildShareCard();
    const cx2 = cv.getContext('2d');
    const cols = new Set();
    for (let i = 0; i < 30; i++) {
      const d = cx2.getImageData((i * 37) % cv.width, (i * 91) % cv.height, 1, 1).data;
      cols.add(d[0] + ',' + d[1] + ',' + d[2]);
    }
    results.shareCard = cols.size >= 5;
    results.shareTextLink = /seyrs1985\.github\.io\/neonplay\/rooftop-rush\//.test(shareText());
  } catch (e) {
    results.exception = String(e && e.message || e);
  }
  results.allPass = Object.keys(results).every(k => k === 'allPass' ? true : results[k] === true);
  window.__autotest = results;
})();
