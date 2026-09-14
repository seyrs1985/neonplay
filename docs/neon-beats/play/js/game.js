/* Neon Beats — game core: state machine, judging, scoring, persistence,
 * rendering. Data (chart) comes from chart.js; sound from audio.js.
 * Judging runs on the LOGICAL song clock (accumulated clamped dt), fully
 * decoupled from audio — the game is 100% playable muted/headless. */
'use strict';

/* ---------------- i18n (np_core npT, np_lang shared with site) ---------------- */
const L = {
  en: {
    title: 'NEON BEATS', sub: 'A NEW CHIPTRACK EVERY DAY',
    daily: "TODAY'S TRACK", practice: 'PRACTICE', retry: 'RETRY', menu: 'MENU',
    resume: 'RESUME', share: 'SHARE', paused: 'PAUSED',
    track: 'TRACK', best: 'BEST', streak: 'STREAK', days: 'd',
    score: 'SCORE', acc: 'ACC', combo: 'COMBO',
    perfect: 'PERFECT', good: 'GOOD', miss: 'MISS',
    over: 'TRACK COMPLETE', newBest: 'NEW BEST!', nextRank: 'next rank',
    at: 'at', pct: '%', notes: 'NOTES', maxCombo: 'MAX COMBO',
    copied: 'Copied to clipboard', copyFail: 'Copy failed — select & copy manually',
    tapHint: 'TAP LANES OR A S D / ARROWS', mute: 'MUTE', sound: 'SOUND',
    todayDone: 'PLAYED TODAY', scale: 'SCALE',
    ranksLegend: 'Legend', ranksMaster: 'Master', ranksDiamond: 'Diamond',
    ranksPlatinum: 'Platinum', ranksGold: 'Gold', ranksSilver: 'Silver', ranksBronze: 'Bronze',
    scaleMajPent: 'Major Pentatonic', scaleMinPent: 'Minor Pentatonic', scaleBlues: 'Blues',
    timSquare: 'Square', timTriangle: 'Triangle', timSawtooth: 'Saw',
  },
  zh: {
    title: '霓虹节拍', sub: '每天一首全新芯片乐曲',
    daily: '今日曲目', practice: '随机练习', retry: '再来一曲', menu: '返回',
    resume: '继续', share: '分享', paused: '已暂停',
    track: '曲目', best: '最佳', streak: '连胜', days: '天',
    score: '得分', acc: '准确率', combo: '连击',
    perfect: '完美', good: '良好', miss: '错失',
    over: '曲目完成', newBest: '新纪录！', nextRank: '下一段位',
    at: '', pct: '%', notes: '音符', maxCombo: '最高连击',
    copied: '已复制到剪贴板', copyFail: '复制失败——请手动复制',
    tapHint: '点按三轨 或 A S D / 方向键', mute: '静音', sound: '声音',
    todayDone: '今日已玩', scale: '音阶',
    ranksLegend: '传奇', ranksMaster: '大师', ranksDiamond: '钻石',
    ranksPlatinum: '白金', ranksGold: '黄金', ranksSilver: '白银', ranksBronze: '青铜',
    scaleMajPent: '大调五声', scaleMinPent: '小调五声', scaleBlues: '布鲁斯',
    timSquare: '方波', timTriangle: '三角波', timSawtooth: '锯齿波',
  },
};
function T(k) { return npT(L, k); }

/* ---------------- constants ---------------- */
const W = 720, H = 1280;
const APPROACH = 1.5;              // seconds a note needs to fall into view
const JUDGE_Y = H - 300;           // hit line
const C = {
  bg: '#0a0a18', lane: 'rgba(255,255,255,0.028)', laneLine: '#1e2a4a',
  cyan: '#00e5ff', pink: '#ff2d95', gold: '#ffd54a', violet: '#7c4dff',
  ink: '#e8ecff', dim: '#8a93b8', green: '#3ddc84', red: '#ff4d6d',
};
const LANE_COLORS = [C.cyan, C.pink, C.gold];
const LANE_W = W / 3;
function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

/* ---------------- storage (design key table) ---------------- */
const K_BEST = 'np_neon-beats_best', K_TOP10 = 'np_neon-beats_top10', K_DAILY = 'np_neon-beats_daily',
      K_STREAK = 'np_neon-beats_streak', K_STATS = 'np_neon-beats_stats', K_WEEKLY = 'np_neon-beats_weekly',
      K_SET = 'np_neon-beats_settings';
const KEYS = [K_BEST, K_TOP10, K_DAILY, K_STREAK, K_STATS, K_WEEKLY, K_SET];
function lsGet(k, def) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : def; } catch (e) { return def; } }
function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

const SAVE = {
  best: { acc: 0, score: 0, track: 0, date: '' },
  top10: [],
  daily: { date: '', track: 0, acc: 0, grade: '', done: false },
  streak: { count: 0, last: '', best: 0, protect: 1, pmonth: '' },
  stats: { tracks: 0, notes: 0, hits: 0, perfects: 0 },
  weekly: { weekKey: '', best: { acc: 0 } },
};
function loadStorage() {
  const b = lsGet(K_BEST, null); if (b && typeof b.acc === 'number') SAVE.best = b;
  const t = lsGet(K_TOP10, null); if (Array.isArray(t)) SAVE.top10 = t;
  const d = lsGet(K_DAILY, null); if (d && typeof d === 'object') SAVE.daily = d;
  const s = lsGet(K_STREAK, null); if (s && typeof s === 'object') SAVE.streak = s;
  const st = lsGet(K_STATS, null); if (st && typeof st === 'object') SAVE.stats = st;
  const wk = lsGet(K_WEEKLY, null); if (wk && typeof wk === 'object') SAVE.weekly = wk;
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
function dayShift(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function refillProtect(streak, today) {
  const m = today.slice(0, 7);
  if (streak.pmonth !== m) { streak.pmonth = m; streak.protect = 1; }
  return streak;
}
function markDailyDone(today) {
  const st = refillProtect(Object.assign({}, SAVE.streak), today);
  if (st.last === today) { st.best = Math.max(st.best, st.count); SAVE.streak = st; lsSet(K_STREAK, st); return st; }
  if (st.last === dayShift(today, -1)) st.count += 1;
  else if (st.last === dayShift(today, -2) && st.protect > 0) { st.protect -= 1; st.count += 1; } // monthly mulligan
  else st.count = 1;
  st.last = today;
  st.best = Math.max(st.best, st.count);
  SAVE.streak = st; lsSet(K_STREAK, st);
  return st;
}

/* ---------------- state ---------------- */
const G = {
  state: 'TITLE', mode: 'daily',
  chart: null, track: 0, dailyDate: '',
  songTime: 0, notePtr: 0,
  score: 0, combo: 0, maxCombo: 0,
  perfects: 0, goods: 0, misses: 0,
  acc: 0, grade: 'C', rank: null, newBest: false,
  overT: 0, autosaveT: 0, beatCount: -1,
  particles: [], judgeFx: [], ripples: [], laneFlash: [0, 0, 0], laneHitGlow: [0, 0, 0],
  comboPop: 0, shake: 0, toast: '', toastT: 0,
  hitRegions: [],
  qaFreq: { samples: 0, match: 0 },
};

function todayChart() { return NB.buildTrack(NB.seedForDate(NB.utcDate())); }
function startRun(mode, seedOverride) {
  let chart, track = 0, dailyDate = '';
  if (mode === 'daily') {
    dailyDate = NB.utcDate();
    chart = NB.buildTrack(NB.seedForDate(dailyDate));
    track = NB.trackNumberFor(dailyDate);
  } else {
    const seed = (seedOverride >>> 0) || ((Math.random() * 4294967295) >>> 0) || 20260915;
    chart = NB.buildTrack(seed);
    track = 0;
  }
  G.mode = mode; G.chart = chart; G.track = track; G.dailyDate = dailyDate;
  G.songTime = 0; G.notePtr = 0;
  G.score = 0; G.combo = 0; G.maxCombo = 0;
  G.perfects = 0; G.goods = 0; G.misses = 0;
  G.acc = 0; G.grade = 'C'; G.rank = null; G.newBest = false;
  G.overT = 0; G.autosaveT = 0; G.beatCount = -1;
  G.particles.length = 0; G.judgeFx.length = 0; G.ripples.length = 0;
  G.laneFlash = [0, 0, 0]; G.laneHitGlow = [0, 0, 0];
  G.comboPop = 0; G.shake = 0; G.qaFreq = { samples: 0, match: 0 };
  G.state = 'PLAY';
  Sound.startGrid(chart);
  Sound.sfx.start();
}
function finishRun() {
  G.state = 'OVER';
  G.overT = 0;
  const total = G.chart.notes.length;
  G.acc = NB.accuracy(G.perfects, G.goods, total);
  G.grade = NB.gradeFor(G.acc);
  G.rank = NB.rankFor(G.acc);
  Sound.stopGrid();
  Sound.sfx.over();
  persistRun();
}
function persistRun() {
  const today = NB.utcDate();
  const total = G.chart.notes.length;
  if (G.acc > SAVE.best.acc) {
    G.newBest = SAVE.best.acc > 0; // first ever run is not a "new best" show
    SAVE.best = { acc: G.acc, score: G.score, track: G.track || SAVE.best.track, date: today };
  }
  lsSet(K_BEST, SAVE.best);
  SAVE.top10.push({ acc: G.acc, score: G.score, track: G.track, date: today });
  SAVE.top10.sort((a, b) => b.acc - a.acc || b.score - a.score);
  SAVE.top10 = SAVE.top10.slice(0, 10);
  lsSet(K_TOP10, SAVE.top10);
  const wk = isoWeekKey(today);
  if (SAVE.weekly.weekKey !== wk) SAVE.weekly = { weekKey: wk, best: { acc: 0 } };
  if (G.acc > SAVE.weekly.best.acc) SAVE.weekly.best = { acc: G.acc };
  lsSet(K_WEEKLY, SAVE.weekly);
  if (G.mode === 'daily') {
    if (SAVE.daily.date !== today) SAVE.daily = { date: today, track: G.track, acc: 0, grade: '', done: false };
    if (G.acc > SAVE.daily.acc) SAVE.daily = { date: today, track: G.track, acc: G.acc, grade: G.grade, done: true };
    SAVE.daily.done = true;
    lsSet(K_DAILY, SAVE.daily);
    markDailyDone(today);
    SAVE.stats.tracks += 1;
  }
  SAVE.stats.notes += total;
  SAVE.stats.hits += G.perfects + G.goods;
  SAVE.stats.perfects += G.perfects;
  lsSet(K_STATS, SAVE.stats);
  lsSet(K_SET, { muted: Sound.isMuted() }); // listed settings key present after a run
}

/* ---------------- judging (logical clock; taps carry their own time) -------- */
function nextUnjudged(from) {
  const ns = G.chart.notes;
  for (let i = from || G.notePtr; i < ns.length; i++) if (!ns[i].judged) return ns[i];
  return null;
}
function judgeLane(lane, when) {
  if (G.state !== 'PLAY') return null;
  const ns = G.chart.notes;
  let best = null, bestD = 1e9;
  for (let i = G.notePtr; i < ns.length; i++) {
    const n = ns[i];
    if (n.t - when > NB.WIN_G) break;           // events sorted: nothing closer ahead
    if (n.judged || n.lane !== lane) continue;
    const d = Math.abs(when - n.t);
    if (d <= NB.WIN_G && d < bestD) { best = n; bestD = d; }
  }
  if (!best) { G.laneFlash[lane] = 0.18; return null; } // empty tap: visual only, zen
  best.judged = true; best.hit = true;
  const q = NB.judgeDelta(when - best.t);
  applyHit(best, q || 'good', lane);
  return q;
}
function applyHit(n, quality, lane) {
  const pts = quality === 'perfect' ? NB.PTS_P : NB.PTS_G;
  G.combo += 1;
  G.maxCombo = Math.max(G.maxCombo, G.combo);
  if (quality === 'perfect') G.perfects += 1; else G.goods += 1;
  const mult = NB.comboMult(G.combo);
  G.score += pts * mult;
  // you play the melody: the hit IS the note
  Sound.melody(n.freq, G.chart.timbre, n.dur, quality === 'perfect' ? 0.3 : 0.22);
  if (Sound.lastNoteFreq === n.freq) G.qaFreq.match += 1;
  G.qaFreq.samples += 1;
  if (quality === 'perfect') Sound.sfx.perfect();
  spawnHitFx(lane, quality);
  G.laneHitGlow[lane] = 1;
  G.comboPop = 1;
}
function registerMiss(n) {
  n.judged = true; n.hit = false;
  G.misses += 1;
  G.combo = 0;
  spawnJudgeFx(n.lane, 'miss');
  G.shake = 2.5;
  Sound.sfx.miss();
}

/* ---------------- update (fixed logical clock, dt clamped upstream) --------- */
function update(dt) {
  // cosmetic timers tick in every state
  for (let i = 0; i < 3; i++) {
    G.laneFlash[i] = Math.max(0, G.laneFlash[i] - dt);
    G.laneHitGlow[i] = Math.max(0, G.laneHitGlow[i] - dt * 2.4);
  }
  G.comboPop = Math.max(0, G.comboPop - dt * 3.2);
  G.shake = Math.max(0, G.shake - dt * 9);
  G.toastT = Math.max(0, G.toastT - dt);
  updateParticles(dt);
  if (G.state === 'OVER') G.overT += dt;

  if (G.state !== 'PLAY' || !G.chart) return;

  G.songTime += dt;
  G.autosaveT += dt;
  if (G.autosaveT >= 10) { // 10s autosave: weekly best snapshot (design ④/五件套)
    G.autosaveT = 0;
    const wk = isoWeekKey(NB.utcDate());
    if (SAVE.weekly.weekKey !== wk) SAVE.weekly = { weekKey: wk, best: { acc: 0 } };
    const live = NB.accuracy(G.perfects, G.goods, G.chart.notes.length);
    if (live > SAVE.weekly.best.acc) SAVE.weekly.best = { acc: live };
    lsSet(K_WEEKLY, SAVE.weekly);
  }

  // schedule backing grid from the song timeline (no-op without AudioContext)
  Sound.schedule(G.songTime);

  // beat-synced ambience
  const beatDur = 60 / G.chart.bpm;
  const bc = Math.floor(G.songTime / beatDur);
  if (bc !== G.beatCount) {
    G.beatCount = bc;
    if (G.ripples.length < 6) G.ripples.push({ t: 0, x: W / 2, y: JUDGE_Y - 140 });
  }
  for (let i = G.ripples.length - 1; i >= 0; i--) {
    G.ripples[i].t += dt;
    if (G.ripples[i].t > 1.6) G.ripples.splice(i, 1);
  }

  // miss scan: pointer walks the sorted event list
  const ns = G.chart.notes;
  while (G.notePtr < ns.length) {
    const n = ns[G.notePtr];
    if (n.judged) { G.notePtr++; continue; }
    if (G.songTime > n.t + NB.WIN_G) { registerMiss(n); G.notePtr++; continue; }
    break;
  }

  if (G.songTime > G.chart.duration + 1.2) finishRun();
}

/* ---------------- fx ---------------- */
const MAX_PARTICLES = 260;
function spawnHitFx(lane, quality) {
  const x = LANE_W * (lane + 0.5);
  const col = quality === 'perfect' ? '#ffffff' : LANE_COLORS[lane];
  const count = quality === 'perfect' ? 20 : 12;
  for (let i = 0; i < count && G.particles.length < MAX_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 140 + Math.random() * 420;
    G.particles.push({
      x, y: JUDGE_Y,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 120,
      life: 0, max: 0.35 + Math.random() * 0.4,
      col: Math.random() < 0.5 ? col : LANE_COLORS[lane],
      sz: 3 + Math.random() * 5,
    });
  }
  spawnJudgeFx(lane, quality);
}
function spawnJudgeFx(lane, quality) {
  const x = LANE_W * (lane + 0.5);
  G.judgeFx.push({ x, y: JUDGE_Y - 90, t: 0, quality });
  if (G.judgeFx.length > 6) G.judgeFx.shift();
}
function updateParticles(dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.life += dt;
    if (p.life > p.max) { G.particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += 780 * dt;
  }
  for (let i = G.judgeFx.length - 1; i >= 0; i--) {
    G.judgeFx[i].t += dt;
    if (G.judgeFx[i].t > 0.7) G.judgeFx.splice(i, 1);
  }
}

/* ---------------- share ---------------- */
function shareText() {
  const r = G.rank || NB.rankFor(G.acc);
  return '🎵 Neon Beats Track #' + (G.track || SAVE.daily.track || 1) + ' 打出 ' +
    G.acc.toFixed(1) + '% (' + G.grade + ') ' + r.emoji + r.name +
    ' | seyrs1985.github.io/neonplay';
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
    x.fillStyle = 'rgba(232,236,255,' + (0.08 + 0.2 * Math.random()).toFixed(2) + ')';
    x.fillRect(Math.random() * cw, Math.random() * ch, 2, 2);
  }
  x.strokeStyle = C.cyan; x.lineWidth = 3;
  x.strokeRect(24, 24, cw - 48, ch - 48);
  x.textAlign = 'center';
  x.fillStyle = C.ink; x.font = 'bold 52px system-ui, sans-serif';
  x.fillText('🎵 NEON BEATS', cw / 2, 120);
  x.font = '600 30px system-ui, sans-serif'; x.fillStyle = C.dim;
  x.fillText('Track #' + (G.track || SAVE.daily.track || 1) + ' · ' + NB.utcDate(), cw / 2, 165);
  x.fillStyle = C.gold; x.font = 'bold 170px system-ui, sans-serif';
  x.fillText(G.acc.toFixed(1) + '%', cw / 2, 350);
  x.font = 'bold 96px system-ui, sans-serif';
  x.fillStyle = G.grade === 'S' ? C.gold : G.grade === 'A' ? C.green : C.cyan;
  x.fillText(G.grade, cw / 2, 470);
  const r = G.rank || NB.rankFor(G.acc);
  x.font = 'bold 60px system-ui, sans-serif'; x.fillStyle = C.pink;
  x.fillText(r.emoji + '  ' + rankName(r.key).toUpperCase(), cw / 2, 555);
  x.font = '600 34px system-ui, sans-serif'; x.fillStyle = C.ink;
  x.fillText(G.score + ' pts · ×' + G.maxCombo + ' ' + T('maxCombo'), cw / 2, 615);
  // melody waveform: this track's DNA
  const wave = G.chart ? G.chart.melodyWave : [];
  if (wave.length) {
    const bw = (cw - 160) / wave.length;
    for (let i = 0; i < wave.length; i++) {
      const hgt = 4 + (wave[i] - 55) * 3.2;
      x.fillStyle = i % 3 === 0 ? LANE_COLORS[0] : i % 3 === 1 ? LANE_COLORS[1] : LANE_COLORS[2];
      x.fillRect(80 + i * bw, 705 - hgt, Math.max(1, bw - 1.5), hgt);
    }
  }
  x.fillStyle = C.cyan; x.font = '600 32px system-ui, sans-serif';
  x.fillText('seyrs1985.github.io/neonplay', cw / 2, 790);
  return cv;
}
async function doShare() {
  const text = shareText();
  let shared = false;
  try {
    if (navigator.share) {
      const cv = buildShareCard();
      const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
      if (blob && navigator.canShare && navigator.canShare({ files: [new File([blob], 'neon-beats.png', { type: 'image/png' })] })) {
        await navigator.share({ files: [new File([blob], 'neon-beats.png', { type: 'image/png' })], title: 'Neon Beats', text });
        shared = true;
      } else {
        await navigator.share({ title: 'Neon Beats', text });
        shared = true;
      }
    }
  } catch (e) { /* user cancel or unsupported — fall through */ }
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
function rankName(key) { return T('ranks' + key[0].toUpperCase() + key.slice(1)); }
function scaleName(key) { return T('scale' + key[0].toUpperCase() + key.slice(1)); }
function timName(t) { return T('tim' + t[0].toUpperCase() + t.slice(1)); }

/* ---------------- input (from main.js, logical coords) ---------------- */
function onPress(x, y) {
  Sound.resume(); // autoplay policy: first gesture unlocks audio
  for (const r of G.hitRegions) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { pressButton(r.id); return; }
  }
  if (G.state === 'PLAY') {
    const lane = clamp(Math.floor(x / LANE_W), 0, 2);
    judgeLane(lane, G.songTime);
  }
}
function pressButton(id) {
  Sound.sfx.click();
  if (id === 'daily') { startRun('daily'); }
  else if (id === 'practice') { startRun('practice'); }
  else if (id === 'retry') { startRun(G.mode); }
  else if (id === 'menu') { G.state = 'TITLE'; Sound.stopGrid(); }
  else if (id === 'resume') { G.state = 'PLAY'; }
  else if (id === 'pause') { if (G.state === 'PLAY') G.state = 'PAUSE'; }
  else if (id === 'share') { doShare(); }
  else if (id === 'mute') { Sound.setMuted(!Sound.isMuted()); }
}
function keyAction(code) {
  if (code === 'Space' || code === 'Enter') {
    if (G.state === 'TITLE') startRun('daily');
    else if (G.state === 'OVER' && G.overT > 0.6) startRun(G.mode);
    else if (G.state === 'PAUSE') G.state = 'PLAY';
    return;
  }
  if (code === 'KeyP' || code === 'Escape') {
    if (G.state === 'PLAY') G.state = 'PAUSE';
    else if (G.state === 'PAUSE') G.state = 'PLAY';
    return;
  }
  if (code === 'KeyM') { Sound.setMuted(!Sound.isMuted()); return; }
  const laneMap = { KeyA: 0, KeyS: 1, KeyD: 2, ArrowLeft: 0, ArrowDown: 1, ArrowRight: 2 };
  if (laneMap[code] !== undefined && G.state === 'PLAY') {
    Sound.resume();
    judgeLane(laneMap[code], G.songTime);
  }
}

/* ---------------- rendering ---------------- */
function draw(ctx) {
  G.hitRegions.length = 0;
  ctx.save();
  if (G.shake > 0) ctx.translate((Math.random() - 0.5) * G.shake * 2, (Math.random() - 0.5) * G.shake * 2);

  drawPlayfield(ctx);

  if (G.state === 'TITLE') drawTitle(ctx);
  else if (G.state === 'PLAY') drawHud(ctx);
  else if (G.state === 'PAUSE') { drawHud(ctx); drawPause(ctx); }
  else if (G.state === 'OVER') drawOver(ctx);

  drawParticles(ctx);
  if (G.toastT > 0) {
    ctx.globalAlpha = Math.min(1, G.toastT);
    ctx.fillStyle = C.ink; ctx.font = '600 30px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(G.toast, W / 2, H - 90);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawPlayfield(ctx) {
  ctx.fillStyle = C.bg; ctx.fillRect(-8, -8, W + 16, H + 16);
  const playing = G.chart && (G.state === 'PLAY' || G.state === 'PAUSE' || G.state === 'OVER');
  // beat ripples behind everything
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const rp of G.ripples) {
    const p = rp.t / 1.6;
    ctx.strokeStyle = 'rgba(0,229,255,' + (0.22 * (1 - p)).toFixed(3) + ')';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(rp.x, rp.y, 40 + p * 460, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
  // lanes
  for (let l = 0; l < 3; l++) {
    ctx.fillStyle = C.lane;
    ctx.fillRect(LANE_W * l, 0, LANE_W, H);
    if (G.laneFlash[l] > 0) {
      ctx.fillStyle = 'rgba(255,255,255,' + (G.laneFlash[l] * 0.5).toFixed(3) + ')';
      ctx.fillRect(LANE_W * l, 0, LANE_W, H);
    }
    if (G.laneHitGlow[l] > 0) {
      ctx.fillStyle = LANE_COLORS[l] + '';
      ctx.globalAlpha = G.laneHitGlow[l] * 0.13;
      ctx.fillRect(LANE_W * l, JUDGE_Y - 320, LANE_W, 320);
      ctx.globalAlpha = 1;
    }
  }
  ctx.strokeStyle = C.laneLine; ctx.lineWidth = 2;
  for (let l = 1; l < 3; l++) {
    ctx.beginPath(); ctx.moveTo(LANE_W * l, 0); ctx.lineTo(LANE_W * l, H); ctx.stroke();
  }
  if (!playing) return;

  // judgement line: cyan band pulsing with the beat
  const beatDur = 60 / G.chart.bpm;
  const phase = G.state === 'PLAY' ? ((G.songTime % beatDur) / beatDur) : 1;
  const pulse = G.state === 'PLAY' ? 0.55 + 0.45 * Math.max(0, 1 - phase * 2.2) : 0.4;
  ctx.fillStyle = 'rgba(0,229,255,' + (0.10 + 0.16 * pulse).toFixed(3) + ')';
  ctx.fillRect(0, JUDGE_Y - 7, W, 14);
  ctx.strokeStyle = 'rgba(0,229,255,' + (0.45 + 0.5 * pulse).toFixed(3) + ')';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, JUDGE_Y); ctx.lineTo(W, JUDGE_Y); ctx.stroke();
  // lane key hints under the line
  ctx.font = '600 26px system-ui, sans-serif'; ctx.textAlign = 'center';
  const keysHint = ['A / ←', 'S / ↓', 'D / →'];
  for (let l = 0; l < 3; l++) {
    ctx.fillStyle = 'rgba(138,147,184,0.7)';
    ctx.fillText(keysHint[l], LANE_W * (l + 0.5), JUDGE_Y + 60);
  }

  // falling notes
  const ns = G.chart.notes;
  for (let i = 0; i < ns.length; i++) {
    const n = ns[i];
    const dtt = n.t - G.songTime;
    if (dtt > APPROACH) break;
    if (n.judged && n.hit) continue;
    const y = JUDGE_Y - (dtt / APPROACH) * (JUDGE_Y + 90);
    if (y < -60) continue;
    if (n.judged && !n.hit) continue; // missed notes vanish at the line
    drawNote(ctx, n.lane, y, n.judged ? 0.4 : 1);
  }
  // judgement text pop
  for (const fx of G.judgeFx) {
    const p = fx.t / 0.7;
    const sc = p < 0.25 ? 0.6 + (p / 0.25) * 0.55 : 1.15 - (p - 0.25) * 0.2;
    ctx.save();
    ctx.translate(fx.x, fx.y - p * 46);
    ctx.scale(sc, sc);
    ctx.font = 'bold 44px system-ui, sans-serif'; ctx.textAlign = 'center';
    const label = fx.quality === 'perfect' ? T('perfect') : fx.quality === 'good' ? T('good') : T('miss');
    const col = fx.quality === 'perfect' ? '#ffffff' : fx.quality === 'good' ? C.dim : C.red;
    ctx.globalAlpha = 1 - p * p;
    ctx.fillStyle = col;
    ctx.fillText(label, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
function drawNote(ctx, lane, y, alpha) {
  const x = LANE_W * lane + 14;
  const w = LANE_W - 28;
  const col = LANE_COLORS[lane];
  ctx.globalAlpha = alpha;
  // fake glow: fat translucent underlay (no shadowBlur — perf)
  ctx.fillStyle = col;
  ctx.globalAlpha = alpha * 0.22;
  roundRect(ctx, x - 6, y - 20, w + 12, 44, 22); ctx.fill();
  ctx.globalAlpha = alpha;
  roundRect(ctx, x, y - 14, w, 32, 16); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  roundRect(ctx, x + 8, y - 9, w - 60, 8, 4); ctx.fill();
  ctx.globalAlpha = 1;
}
function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function drawParticles(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of G.particles) {
    const a = 1 - p.life / p.max;
    ctx.globalAlpha = a;
    ctx.fillStyle = p.col;
    const sz = p.sz * (0.5 + a * 0.5);
    ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
  }
  ctx.restore();
  ctx.globalAlpha = 1;
}
function drawHud(ctx) {
  // score / acc
  ctx.textAlign = 'left';
  ctx.fillStyle = C.ink; ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(String(G.score), 30, 74);
  ctx.fillStyle = C.dim; ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillText(T('score'), 30, 104);
  const total = G.chart.notes.length;
  const liveAcc = NB.accuracy(G.perfects, G.goods, Math.max(1, G.perfects + G.goods + G.misses));
  ctx.textAlign = 'right';
  ctx.fillStyle = C.ink; ctx.font = 'bold 44px system-ui, sans-serif';
  ctx.fillText(liveAcc.toFixed(1) + '%', W - 118, 74);
  ctx.fillStyle = C.dim; ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillText(T('acc'), W - 118, 104);
  // track tag
  ctx.textAlign = 'center';
  ctx.fillStyle = C.dim; ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillText(G.mode === 'daily' ? T('track') + ' #' + G.track : T('practice') + ' · ' + G.chart.bpm + ' BPM', W / 2, 60);
  // pause button (touch target ≥ 44px)
  button(ctx, 'pause', W - 82, 28, 96, 88, '⏸', C.dim, 40);
  // combo bounce
  if (G.combo >= 2) {
    const sc = 1 + G.comboPop * 0.35;
    ctx.save();
    ctx.translate(W / 2, H * 0.30);
    ctx.scale(sc, sc);
    const mult = NB.comboMult(G.combo);
    ctx.textAlign = 'center';
    ctx.font = 'bold 110px system-ui, sans-serif';
    ctx.fillStyle = mult >= 3 ? C.gold : mult >= 2 ? C.pink : C.cyan;
    ctx.globalAlpha = 0.9;
    ctx.fillText(String(G.combo), 0, 0);
    ctx.font = 'bold 34px system-ui, sans-serif';
    ctx.fillStyle = C.dim;
    ctx.fillText(T('combo') + (mult > 1 ? ' ×' + mult : ''), 0, 44);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
function drawTitle(ctx) {
  ctx.textAlign = 'center';
  ctx.fillStyle = C.cyan; ctx.font = 'bold 108px system-ui, sans-serif';
  ctx.fillText(T('title'), W / 2, H * 0.20);
  ctx.fillStyle = C.dim; ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillText(T('sub'), W / 2, H * 0.20 + 48);
  // today's track teaser card
  const tc = NB.buildTrack(NB.seedForDate(NB.utcDate()));
  const tn = NB.trackNumberFor(NB.utcDate());
  ctx.fillStyle = 'rgba(255,255,255,0.045)';
  roundRect(ctx, 60, H * 0.27, W - 120, 190, 24); ctx.fill();
  ctx.strokeStyle = 'rgba(0,229,255,0.35)'; ctx.lineWidth = 2;
  roundRect(ctx, 60, H * 0.27, W - 120, 190, 24); ctx.stroke();
  ctx.fillStyle = C.gold; ctx.font = 'bold 52px system-ui, sans-serif';
  ctx.fillText(T('track') + ' #' + tn, W / 2, H * 0.27 + 66);
  ctx.fillStyle = C.ink; ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText(scaleName(tc.scale) + ' · ' + tc.bpm + ' BPM · ' + timName(tc.timbre), W / 2, H * 0.27 + 112);
  ctx.fillStyle = C.dim; ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillText(tc.notes.length + ' ' + T('notes') + ' · ' + Math.round(tc.duration) + 's', W / 2, H * 0.27 + 150);
  // buttons
  const done = SAVE.daily.date === NB.utcDate() && SAVE.daily.done;
  button(ctx, 'daily', W / 2, H * 0.50, 560, 108, (done ? '✓ ' : '') + T('daily'), C.cyan, 40);
  button(ctx, 'practice', W / 2, H * 0.50 + 140, 560, 96, T('practice'), C.violet, 34);
  button(ctx, 'mute', W / 2, H * 0.50 + 262, 560, 84, (Sound.isMuted() ? '🔇 ' : '🔊 ') + (Sound.isMuted() ? T('mute') : T('sound')), C.dim, 28);
  // stats strip
  ctx.fillStyle = C.ink; ctx.font = '600 30px system-ui, sans-serif';
  ctx.fillText(T('best') + ' ' + (SAVE.best.acc > 0 ? SAVE.best.acc.toFixed(1) + '% (' + NB.gradeFor(SAVE.best.acc) + ')' : '—'), W / 2, H * 0.50 + 420);
  ctx.fillStyle = C.dim; ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText('🔥 ' + T('streak') + ' ' + SAVE.streak.count + T('days') + ' · ' + T('maxCombo') + ' ×' + SAVE.streak.best, W / 2, H * 0.50 + 462);
  ctx.fillStyle = 'rgba(138,147,184,0.65)'; ctx.font = '600 24px system-ui, sans-serif';
  ctx.fillText(T('tapHint'), W / 2, H - 46);
}
function drawPause(ctx) {
  ctx.fillStyle = 'rgba(10,10,24,0.72)';
  ctx.fillRect(0, 0, W, H);
  ctx.textAlign = 'center';
  ctx.fillStyle = C.ink; ctx.font = 'bold 72px system-ui, sans-serif';
  ctx.fillText(T('paused'), W / 2, H * 0.34);
  button(ctx, 'resume', W / 2, H * 0.48, 520, 104, '▶ ' + T('resume'), C.cyan, 36);
  button(ctx, 'menu', W / 2, H * 0.48 + 136, 520, 92, T('menu'), C.dim, 32);
}
function drawOver(ctx) {
  const a = Math.min(1, G.overT / 0.45);
  ctx.fillStyle = 'rgba(10,10,24,' + (0.78 * a).toFixed(3) + ')';
  ctx.fillRect(0, 0, W, H);
  if (G.overT < 0.15) return;
  const y0 = H * 0.16;
  // glass panel
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  roundRect(ctx, 50, y0, W - 100, 740, 28); ctx.fill();
  ctx.strokeStyle = 'rgba(0,229,255,0.4)'; ctx.lineWidth = 2;
  roundRect(ctx, 50, y0, W - 100, 740, 28); ctx.stroke();
  ctx.textAlign = 'center';
  ctx.fillStyle = C.dim; ctx.font = '600 28px system-ui, sans-serif';
  ctx.fillText(T('over'), W / 2, y0 + 58);
  ctx.fillStyle = C.ink; ctx.font = '600 26px system-ui, sans-serif';
  ctx.fillText((G.mode === 'daily' ? T('track') + ' #' + G.track : T('practice')) + ' · ' + (G.dailyDate || NB.utcDate()), W / 2, y0 + 96);
  // accuracy
  ctx.fillStyle = C.gold; ctx.font = 'bold 150px system-ui, sans-serif';
  ctx.fillText(G.acc.toFixed(1) + '%', W / 2, y0 + 250);
  // grade badge
  const gr = G.grade;
  ctx.font = 'bold 92px system-ui, sans-serif';
  ctx.fillStyle = gr === 'S' ? C.gold : gr === 'A' ? C.green : gr === 'B' ? C.cyan : C.dim;
  if (gr === 'S') { // gold glow sweep
    ctx.save();
    ctx.globalAlpha = 0.35 + 0.25 * Math.sin(G.overT * 4);
    ctx.font = 'bold 120px system-ui, sans-serif';
    ctx.fillText('S', W / 2, y0 + 368);
    ctx.restore();
  }
  ctx.fillText(gr, W / 2, y0 + 362);
  // rank + next
  const r = G.rank;
  ctx.font = 'bold 56px system-ui, sans-serif'; ctx.fillStyle = C.pink;
  ctx.fillText(r.emoji + ' ' + rankName(r.key).toUpperCase(), W / 2, y0 + 420);
  ctx.font = '600 26px system-ui, sans-serif'; ctx.fillStyle = C.dim;
  if (r.nextKey) ctx.fillText(T('nextRank') + ': ' + rankName(r.nextKey) + ' ' + T('at') + ' ' + r.nextMin + '% (+' + r.need.toFixed(1) + ')', W / 2, y0 + 462);
  // counts
  ctx.font = '600 30px system-ui, sans-serif'; ctx.fillStyle = C.ink;
  ctx.fillText(G.score + ' pts · ×' + G.maxCombo + ' ' + T('maxCombo'), W / 2, y0 + 516);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(T('perfect') + ' ' + G.perfects + ' · ' + T('good') + ' ' + G.goods + ' · ' + T('miss') + ' ' + G.misses, W / 2, y0 + 560);
  if (G.newBest && G.overT > 0.5) {
    const sweep = ((G.overT * 1.4) % 1) * W;
    ctx.save();
    ctx.beginPath(); ctx.rect(50, y0 + 576, W - 100, 48); ctx.clip();
    ctx.fillStyle = C.gold; ctx.font = 'bold 40px system-ui, sans-serif';
    ctx.fillText('✦ ' + T('newBest') + ' ✦', W / 2, y0 + 610);
    ctx.fillStyle = 'rgba(255,213,74,0.25)';
    ctx.fillRect(sweep - 80, y0 + 576, 120, 48);
    ctx.restore();
  }
  // buttons
  button(ctx, 'retry', W / 2 - 150, y0 + 640, 260, 96, T('retry'), C.cyan, 32);
  button(ctx, 'share', W / 2 + 150, y0 + 640, 260, 96, '🔗 ' + T('share'), C.violet, 32);
  // small menu link below the panel
  const my = y0 + 716;
  ctx.fillStyle = C.dim; ctx.font = '600 28px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('⌂ ' + T('menu'), W / 2, my + 36);
  G.hitRegions.push({ id: 'menu', x: W / 2 - 120, y: my, w: 240, h: 56 });
}
function button(ctx, id, cx, cy, w, h, label, col, fontPx) {
  if (w <= 0) return;
  const x = cx - w / 2, y = cy - h / 2;
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  roundRect(ctx, x, y, w, h, 20); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.globalAlpha = 0.8;
  roundRect(ctx, x, y, w, h, 20); ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = col;
  ctx.font = 'bold ' + fontPx + 'px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, cx, cy + fontPx * 0.35);
  G.hitRegions.push({ id, x, y, w, h });
}

/* ---------------- QA hooks (GAME_STANDARD + design acceptance) ------------- */
window.__qaState = () => ({
  state: G.state, mode: G.mode,
  track: G.track, seed: G.chart ? G.chart.seed : 0, bpm: G.chart ? G.chart.bpm : 0,
  songTime: +G.songTime.toFixed(3), duration: G.chart ? G.chart.duration : 0,
  score: G.score, combo: G.combo, maxCombo: G.maxCombo,
  perfects: G.perfects, goods: G.goods, misses: G.misses,
  notesTotal: G.chart ? G.chart.notes.length : 0,
  acc: G.acc, grade: G.grade, rank: G.rank ? G.rank.key : null, newBest: G.newBest,
  overT: +G.overT.toFixed(2),
  freq: { samples: G.qaFreq.samples, match: G.qaFreq.match },
  best: SAVE.best.acc, streak: { count: SAVE.streak.count, last: SAVE.streak.last, best: SAVE.streak.best, protect: SAVE.streak.protect },
  dailyDone: SAVE.daily.done && SAVE.daily.date === NB.utcDate(),
});
window.__qa = {
  start(mode, seed) { startRun(mode === 'practice' ? 'practice' : 'daily', seed); return window.__qaState(); },
  chart(dateStr) { return NB.buildTrack(NB.seedForDate(dateStr || NB.utcDate())); },
  dailyPreview(dateStr) {
    const c = NB.buildTrack(NB.seedForDate(dateStr || NB.utcDate()));
    return { date: dateStr || NB.utcDate(), track: NB.trackNumberFor(dateStr || NB.utcDate()), seed: c.seed, bpm: c.bpm, timbre: c.timbre, scale: c.scale, notes: c.notes.map(n => [n.t, n.midi, n.lane]), duration: c.duration };
  },
  // virtual clock: advance the song deterministically (no rAF / audio needed)
  sim(seconds, mode) {
    let remaining = Math.min(seconds, 400);
    const step = 1 / 120;
    const advance = sec => {
      let left = sec;
      while (left > 0) {
        const d = Math.min(step, left);
        left -= d;
        update(d);
        if (G.state !== 'PLAY' && G.state !== 'OVER') return;
      }
    };
    while (remaining > 0) {
      if (G.state !== 'PLAY') { advance(Math.min(remaining, 0.5)); remaining -= 0.5; continue; }
      if (mode === 'perfect') {
        const n = nextUnjudged();
        const target = G.songTime + Math.min(remaining, step);
        if (n && n.t > G.songTime && n.t <= target) {
          advance(n.t - G.songTime);
          if (G.state === 'PLAY') judgeLane(n.lane, G.songTime); // delta 0 → perfect
        } else {
          advance(step); remaining -= step;
        }
      } else {
        advance(step); remaining -= step;
      }
    }
    return window.__qaState();
  },
  // full auto-play of the current track: every note tapped at exact time
  autoPlay() {
    while (G.state === 'PLAY') this.sim(5, 'perfect');
    return window.__qaState();
  },
  // inject a virtual tap on a lane at songTime + offset
  tap(lane, offset = 0) { return judgeLane(lane, G.songTime + offset); },
  // advance until just before note idx, then tap with the given delta
  tapNote(idx, offset = 0) {
    const n = G.chart.notes[idx];
    if (!n) return null;
    const when = n.t - offset;
    if (when > G.songTime) this.sim(when - G.songTime);
    return judgeLane(n.lane, when);
  },
  state: () => G,
  expose: { markDailyDone, dayShift, loadStorage, lsGet, lsSet, KEYS, persistRun, judgeLane, NB },
  shareText, buildShareCard,
  get lastNoteFreq() { return Sound.lastNoteFreq; },
};

/* ---------------- in-page deterministic self-check (?autotest=1) ----------- */
function runAutotest() {
  const R = {};
  try {
    // 1) determinism: same date → identical chart; neighbor day differs
    const a = JSON.stringify(window.__qa.dailyPreview('2026-09-15'));
    const b = JSON.stringify(window.__qa.dailyPreview('2026-09-15'));
    const c = JSON.stringify(window.__qa.dailyPreview('2026-09-16'));
    R.deterministic = a === b && a !== c;
    // 2) note density in design band, duration 40-60s, lane spacing ≥250ms
    let densOk = true, durOk = true, laneOk = true, lanesAll = true;
    for (let d = 0; d < 60; d++) {
      const t = NB.buildTrack(NB.seedForDate('2026-0' + (1 + (d % 9)) + '-' + String(1 + (d % 28)).padStart(2, '0')));
      if (t.notes.length < NB.MIN_NOTES || t.notes.length > NB.MAX_NOTES) densOk = false;
      if (t.duration < 40 || t.duration > 60) durOk = false;
      const lastT = [-9, -9, -9];
      for (const n of t.notes) {
        if (n.t - lastT[n.lane] < 0.25) laneOk = false;
        lastT[n.lane] = n.t;
        if (n.lane < 0 || n.lane > 2) lanesAll = false;
      }
    }
    R.noteDensityBand = densOk; R.durationBand = durOk; R.laneSpacing250 = laneOk; R.lanesValid = lanesAll;
    // 3) judging windows: ±60 perfect / ±130 good
    R.windows = NB.judgeDelta(0.059) === 'perfect' && NB.judgeDelta(-0.06) === 'perfect' &&
      NB.judgeDelta(0.061) === 'good' && NB.judgeDelta(0.13) === 'good' && NB.judgeDelta(0.131) === null;
    R.points = NB.PTS_P === 300 && NB.PTS_G === 150;
    R.comboMultSteps = NB.comboMult(19) === 1 && NB.comboMult(20) === 2 && NB.comboMult(49) === 2 && NB.comboMult(50) === 3;
    // 4) boundaries: 94.9 → A/platinum, 95 → S/diamond (rounded acc)
    R.gradeBoundary = NB.gradeFor(94.9) === 'A' && NB.gradeFor(95) === 'S';
    R.rankBoundary = NB.rankFor(94.9).key === 'platinum' && NB.rankFor(95).key === 'diamond';
    R.rankFull = NB.rankFor(99).key === 'legend' && NB.rankFor(96).key === 'master' && NB.rankFor(95).key === 'diamond' &&
      NB.rankFor(85).key === 'platinum' && NB.rankFor(75).key === 'gold' && NB.rankFor(60).key === 'silver' && NB.rankFor(0).key === 'bronze';
    // 5) full virtual perfect play → 100% / S; melody triggers match chart freq
    window.__qa.start('daily');
    const fin = window.__qa.autoPlay();
    R.fullPlayAcc100 = fin.state === 'OVER' && fin.acc === 100 && fin.grade === 'S' && fin.misses === 0;
    R.freqMatch = fin.freq.samples >= 10 && fin.freq.samples === fin.freq.match;
    // 6) persistence: exact designed key set after a finished run
    const keys = Object.keys(localStorage).filter(k => k.indexOf('np_neon-beats') === 0).sort();
    R.storageKeysExact = JSON.stringify(keys) === JSON.stringify(KEYS.slice().sort());
    R.dailyMarked = SAVE.daily.done === true && SAVE.daily.date === NB.utcDate();
    R.streakMarked = SAVE.streak.count >= 1 && SAVE.streak.last === NB.utcDate();
    // 7) streak transitions: yesterday +1, 2-day gap eats mulligan, 3-day gap resets
    const today = NB.utcDate();
    const backup = lsGet(K_STREAK, null);
    lsSet(K_STREAK, { count: 3, last: dayShift(today, -1), best: 3, protect: 1, pmonth: today.slice(0, 7) });
    loadStorage();
    R.streakIncrements = markDailyDone(today).count === 4;
    lsSet(K_STREAK, { count: 3, last: dayShift(today, -2), best: 3, protect: 1, pmonth: today.slice(0, 7) });
    loadStorage();
    const st2 = markDailyDone(today);
    R.streakMulligan = st2.count === 4 && st2.protect === 0;
    lsSet(K_STREAK, { count: 3, last: dayShift(today, -3), best: 3, protect: 1, pmonth: today.slice(0, 7) });
    loadStorage();
    R.streakGapResets = markDailyDone(today).count === 1;
    if (backup !== null) lsSet(K_STREAK, backup); else { try { localStorage.removeItem(K_STREAK); } catch (e) {} }
    loadStorage();
    // 8) share card draws + carries site link
    const card = buildShareCard();
    let distinct = 0; const seen = new Set();
    try {
      const cx = card.getContext('2d');
      for (let i = 0; i < 40; i++) {
        const px = cx.getImageData((i * 37) % card.width, (i * 91) % card.height, 1, 1).data;
        seen.add(px[0] + ',' + px[1] + ',' + px[2]);
      }
      distinct = seen.size;
    } catch (e) { distinct = -1; }
    R.shareCardDraws = distinct > 4;
    R.shareTextHasLink = shareText().indexOf('seyrs1985.github.io/neonplay') >= 0;
    // 9) miss path: combo reset + accuracy/grade drop vs perfect run
    window.__qa.start('practice', 20260915);
    window.__qa.sim(6, 'perfect');
    const midCombo = window.__qaState().combo;
    const need = Math.ceil(window.__qaState().notesTotal * 0.08) + 1; // enough to cross the S line
    let stM = null, guard = 0;
    do { stM = window.__qa.sim(2, 'none'); guard++; } while (stM.state === 'PLAY' && stM.misses < need && guard < 200);
    const afterMiss = stM;
    const missRun = window.__qa.autoPlay();
    R.missResetsCombo = midCombo > 0 && afterMiss.combo === 0 && afterMiss.misses >= 1;
    R.gradeDrops = missRun.acc < 100 && missRun.grade !== 'S' && missRun.acc < fin.acc;
  } catch (e) {
    R.exception = String(e && e.message || e);
  }
  R.allPass = Object.keys(R).every(k => k === 'allPass' || R[k] === true);
  window.__autotest = R;
}
try {
  if (new URLSearchParams(location.search).get('autotest') === '1') {
    setTimeout(runAutotest, 250);
  }
} catch (e) {}
