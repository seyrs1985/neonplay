/* Neon Typing — game core: state machine, word stream, scoring, particles,
 * rendering. Data + logic here; bootstrap/input in main.js; audio in audio.js. */
'use strict';

/* ---------- i18n (UI chrome only — the typed words are always English) ---------- */
const L = {
  en: {
    sub: '60-second neon typing sprint', daily: 'Daily Challenge', practice: 'Practice',
    dailySub: 'same word stream worldwide · UTC date', hintTitle: 'Type each word before it crosses the red line',
    startHint: 'press SPACE or tap a button — then just type', wpm: 'WPM', acc: 'ACC', combo: 'COMBO',
    score: 'SCORE', best: 'BEST', typeHint: 'type the highlighted word…', paused: 'PAUSED',
    resume: 'press Esc or P to resume', overTime: 'TIME UP!', overLives: 'WORDS BREACHED THE LINE',
    again: 'Play Again', share: 'Share', copied: 'Copied to clipboard!', newBest: 'NEW BEST!',
    rank: 'RANK', maxCombo: 'MAX COMBO', lives: 'LIVES', streak: 'day streak',
    dailyDone: 'Today\u2019s daily is done — beat your score?', mobileHint: 'tap the box below to type',
    wrong: 'WRONG KEY — combo lost', progress: 'your last runs',
  },
  zh: {
    sub: '60 秒霓虹打字冲刺', daily: '每日挑战', practice: '自由练习',
    dailySub: '全球同词流 · UTC 日期', hintTitle: '在单词越过红线前把它打完',
    startHint: '按空格或点按钮开始——直接开打', wpm: 'WPM', acc: '准确率', combo: '连击',
    score: '分数', best: '最佳', typeHint: '输入高亮的单词…', paused: '已暂停',
    resume: '按 Esc 或 P 继续', overTime: '时间到！', overLives: '单词越线了',
    again: '再来一局', share: '分享', copied: '已复制到剪贴板！', newBest: '新纪录！',
    rank: '段位', maxCombo: '最高连击', lives: '生命', streak: '天连续',
    dailyDone: '今日挑战已完成——超越自己？', mobileHint: '点下方输入框开始打字', wrong: '打错了——连击清零',
    progress: '最近成绩',
  },
};
const T = k => npT(L, k);

/* ---------- constants ---------- */
const W = 720, H = 1280;
const DANGER_X = 168;                 // words lose a life past this line
const BAND_TOP = 210, BAND_BOT = 800; // word stream band
const RUN_TIME = 60;
const COMBO_WINDOW = 2.0;             // seconds between words to keep the chain
const MAX_PARTICLES = 260;

const RANKS = [
  { key: 'bronze',   name: 'Bronze',   min: 0,   col: '#cd7f32' },
  { key: 'silver',   name: 'Silver',   min: 20,  col: '#c9d4e4' },
  { key: 'gold',     name: 'Gold',     min: 35,  col: '#ffd700' },
  { key: 'platinum', name: 'Platinum', min: 50,  col: '#9ff3ff' },
  { key: 'diamond',  name: 'Diamond',  min: 70,  col: '#00e5ff' },
  { key: 'master',   name: 'Master',   min: 90,  col: '#7c4dff' },
  { key: 'legend',   name: 'Legend',   min: 110, col: '#ff2d95' },
];
function rankFor(wpm) {
  let r = RANKS[0];
  for (const x of RANKS) if (wpm >= x.min) r = x;
  return r;
}
function comboMult(combo) { return combo >= 12 ? 3 : combo >= 5 ? 2 : 1; }
const lerp = (a, b, t) => a + (b - a) * t;

/* ---------- storage (np_tp_ prefix) ---------- */
const K_BEST = 'np_tp_best', K_HIST = 'np_tp_history', K_DAILY = 'np_tp_daily', K_STREAK = 'np_tp_streak';
let best = 0, history = [], daily = null, streak = { count: 0, last: '', best: 0 };
function lsJson(key, def) {
  try { const v = JSON.parse(localStorage.getItem(key) || 'null'); return v || def; }
  catch (e) { return def; }
}
function lsSet(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) {} }
function loadStorage() {
  best = npBest(K_BEST, 0) || 0;
  history = lsJson(K_HIST, []);
  daily = lsJson(K_DAILY, null);
  streak = lsJson(K_STREAK, { count: 0, last: '', best: 0 });
}
function dayShift(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function markDailyDone(dateStr) {
  if (streak.last === dateStr) return streak;
  streak = {
    count: streak.last === dayShift(dateStr, -1) ? streak.count + 1 : 1,
    last: dateStr,
    best: Math.max(streak.best, streak.last === dayShift(dateStr, -1) ? streak.count + 1 : 1),
  };
  lsSet(K_STREAK, streak);
  return streak;
}

/* ---------- game state ---------- */
const G = {
  state: 'TITLE', mode: 'daily', t: 0,
  seed: '', queue: [], qi: 0, words: [], active: null,
  timeLeft: RUN_TIME, played: 0, spawnT: 0,
  score: 0, combo: 0, comboMax: 0, comboT: 0, lives: 3,
  correct: 0, errors: 0, keys: 0,
  result: null, toast: 0, toastMsg: '',
  shake: 0, errFlash: 0, redFlash: 0, multFlash: 0, multFlashV: 1,
};
const particles = [];
const stars = [];
for (let i = 0; i < 70; i++)
  stars.push({ x: Math.random() * W, y: Math.random() * H, s: Math.random() * 1.8 + 0.4, v: Math.random() * 14 + 5 });
let hotspots = [];

function isTouchLike() { return !!window.NT_TOUCH; }

function startRun(mode, seedStr) {
  G.mode = mode || 'daily';
  G.seed = G.mode === 'daily' ? WT.dailySeed() : String(seedStr || 'practice:' + Math.floor(Math.random() * 1e9));
  G.queue = WT.buildQueue(G.seed, isTouchLike() && G.mode !== 'daily');
  G.qi = 0; G.words = []; G.active = null;
  G.timeLeft = RUN_TIME; G.played = 0; G.spawnT = 0;
  G.score = 0; G.combo = 0; G.comboMax = 0; G.comboT = 0; G.lives = 3;
  G.correct = 0; G.errors = 0; G.keys = 0; G.result = null;
  G.errFlash = 0; G.redFlash = 0; G.multFlash = 0; G.shake = 0;
  particles.length = 0;
  G.state = 'PLAY';
  spawnWord();
  Sound.sfx.start();
}

function progress() { return Math.min(1, Math.max(0, 1 - G.timeLeft / RUN_TIME)); }

function spawnWord() {
  if (!G.queue.length) return;
  const w = G.queue[G.qi++ % G.queue.length];
  const p = progress();
  const spd = lerp(70, 152, p) * (0.88 + Math.random() * 0.26);
  let y = 0;
  for (let tries = 0; tries < 12; tries++) {
    y = BAND_TOP + 30 + Math.random() * (BAND_BOT - BAND_TOP - 60);
    let ok = true;
    for (const o of G.words) if (Math.abs(o.y - y) < 62 && o.x > W - 420) { ok = false; break; }
    if (ok) break;
  }
  G.words.push({ w, x: W + 30, y, typed: 0, spd });
}

function completeWord(word) {
  const chained = G.combo > 0 && G.comboT > 0;
  G.combo = chained ? G.combo + 1 : 1;
  G.comboT = COMBO_WINDOW;
  G.comboMax = Math.max(G.comboMax, G.combo);
  const mult = comboMult(G.combo);
  G.score += word.w.length * 10 * mult;
  Sound.sfx.word(mult);
  burst(word.x + word.w.length * 9, word.y, word.w.length * 3 + 8, mult);
  if (mult > 1) { G.multFlash = 0.5; G.multFlashV = mult; }
  G.words.splice(G.words.indexOf(word), 1);
  if (G.active === word) G.active = null;
}

/* one typed letter through the whole pipeline (keyboard, mobile input, QA) */
function typeLetter(ch) {
  if (G.state === 'TITLE') { startRun('daily'); }
  if (G.state !== 'PLAY') return;
  ch = String(ch).toLowerCase();
  if (!/^[a-z]$/.test(ch)) return;
  G.keys++;
  let word = G.active;
  if (!word) {
    // target the word whose next letter matches, closest to the danger line
    let bestW = null;
    for (const o of G.words) {
      if (o.typed < o.w.length && o.w[o.typed] === ch) {
        if (!bestW || o.x < bestW.x) bestW = o;
      }
    }
    word = bestW;
  }
  if (word && word.typed < word.w.length && word.w[word.typed] === ch) {
    word.typed++;
    G.correct++;
    Sound.sfx.tick(word.typed / word.w.length);
    if (word.typed >= word.w.length) completeWord(word);
    else G.active = word;
  } else {
    G.errors++; G.combo = 0; G.comboT = 0;
    G.errFlash = 1; G.shake = 7;
    Sound.sfx.err();
  }
}

function liveWpm() {
  const mins = Math.max(G.played, 1 / 60) / 60;
  return Math.round(G.correct / 5 / mins);
}
function liveAcc() { return G.keys > 0 ? Math.round((G.correct / G.keys) * 100) : 100; }

function endRun(reason) {
  if (G.state === 'OVER') return;
  G.state = 'OVER';
  const wpm = liveWpm(), acc = liveAcc();
  const rank = rankFor(wpm);
  const isBest = wpm > best;
  G.result = { wpm, acc, rank, score: G.score, combo: G.comboMax, reason, isBest };
  if (isBest) best = wpm;
  npBest(K_BEST, best); // persist unconditionally so the key exists after any run
  history.push({ d: WT.utcDate(), wpm });
  if (history.length > 20) history = history.slice(-20);
  lsSet(K_HIST, history);
  if (G.mode === 'daily') {
    if (!daily || daily.date !== WT.utcDate() || wpm > daily.wpm) {
      daily = { date: WT.utcDate(), wpm, acc, score: G.score };
      lsSet(K_DAILY, daily);
    }
    markDailyDone(WT.utcDate());
  }
  Sound.sfx.over();
}

function update(dt) {
  G.t += dt;
  for (const s of stars) { s.x -= s.v * dt; if (s.x < -4) { s.x = W + 4; s.y = Math.random() * H; } }
  G.shake = Math.max(0, G.shake - dt * 26);
  G.errFlash = Math.max(0, G.errFlash - dt * 2.4);
  G.redFlash = Math.max(0, G.redFlash - dt * 1.8);
  G.multFlash = Math.max(0, G.multFlash - dt);
  G.toast = Math.max(0, G.toast - dt);
  // particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt; p.vx *= 0.99;
  }
  if (G.state !== 'PLAY') return;
  G.played += dt;
  G.timeLeft -= dt;
  const p = progress();
  // spawn cadence
  G.spawnT -= dt;
  const interval = lerp(2.05, 1.02, p);
  const maxWords = 5 + Math.floor(p * 3);
  if (G.spawnT <= 0) {
    if (G.words.length < maxWords) spawnWord();
    G.spawnT = interval;
  }
  // drift + danger line
  for (let i = G.words.length - 1; i >= 0; i--) {
    const o = G.words[i];
    o.x -= o.spd * dt;
    if (o.x < DANGER_X - 26) {
      G.words.splice(i, 1);
      if (G.active === o) G.active = null;
      G.lives--; G.redFlash = 1; G.shake = 10;
      Sound.sfx.life();
      if (G.lives <= 0) { endRun('lives'); return; }
    }
  }
  // combo window timeout
  if (G.combo > 0) {
    G.comboT -= dt;
    if (G.comboT <= 0) { G.combo = 0; G.comboT = 0; }
  }
  if (G.timeLeft <= 0) endRun('time');
}

function burst(x, y, n, mult) {
  const cols = mult >= 3 ? ['#ff2d95', '#7c4dff', '#00e5ff'] : mult >= 2 ? ['#7c4dff', '#00e5ff'] : ['#00e5ff'];
  for (let i = 0; i < n && particles.length < MAX_PARTICLES; i++) {
    const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 320;
    particles.push({
      x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60,
      life: 0.4 + Math.random() * 0.5, max: 0.9,
      c: cols[Math.floor(Math.random() * cols.length)], s: 2 + Math.random() * 3.4,
    });
  }
}

function shareText() {
  const r = G.result || { wpm: liveWpm(), acc: liveAcc(), rank: rankFor(liveWpm()), combo: G.comboMax };
  const daily = G.mode === 'daily' ? ' (Daily ' + WT.utcDate().slice(5) + ')' : '';
  return 'Neon Typing' + daily + ' — ' + r.wpm + ' WPM · ' + r.acc + '% acc · x' +
    Math.max(1, G.comboMax) + ' combo · ' + r.rank.name + ' rank. Beat that: ' +
    'https://seyrs1985.github.io/neonplay/games/neon-typing/';
}
function doShare() {
  const txt = shareText();
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt);
    else { const ta = document.createElement('textarea'); ta.value = txt; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
  } catch (e) {}
  G.toast = 2; G.toastMsg = T('copied');
}

/* ---------- input from main.js ---------- */
function onPress(x, y) {
  Sound.resume();
  if (G.state === 'TITLE' || G.state === 'OVER') {
    for (const h of hotspots) {
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) {
        Sound.sfx.click();
        if (h.act === 'daily') startRun('daily');
        else if (h.act === 'practice') startRun('practice');
        else if (h.act === 'again') startRun(G.mode === 'daily' ? 'daily' : 'practice');
        else if (h.act === 'share') doShare();
        else if (h.act === 'mute') Sound.setMuted(!Sound.isMuted());
        return;
      }
    }
  }
}
function keyAction(code, key) {
  // letters are gameplay: A-Z always type while PLAY (M/P shortcuts would
  // eat real letters — mute lives on the button, pause on Esc)
  if (G.state === 'TITLE') {
    if (code === 'KeyM') { Sound.setMuted(!Sound.isMuted()); return; }
    if (code === 'Space' || code === 'Enter') { startRun('daily'); return; }
    if (/^Key[A-Z]$/.test(code)) { startRun('daily'); typeLetter(key); }
    return;
  }
  if (G.state === 'PLAY') {
    if (code === 'Escape') { G.state = 'PAUSE'; return; } // only Esc — 'p' is a letter!
    if (code === 'Space') return; // space is never part of a word — ignore
    if (/^Key[A-Z]$/.test(code)) typeLetter(key);
    return;
  }
  if (G.state === 'PAUSE') {
    if (code === 'KeyM') { Sound.setMuted(!Sound.isMuted()); return; }
    if (code === 'KeyP' || code === 'Escape' || code === 'Space' || code === 'Enter') G.state = 'PLAY';
    return;
  }
  if (G.state === 'OVER') {
    if (code === 'KeyM') { Sound.setMuted(!Sound.isMuted()); return; }
    if (code === 'Enter' || code === 'Space') startRun(G.mode === 'daily' ? 'daily' : 'practice');
    else if (code === 'KeyS') doShare();
  }
}

/* ---------- rendering ---------- */
const MONO = (s, w) => (w || 'bold ') + s + 'px "Courier New", ui-monospace, monospace';
function glow(ctx, txt, x, y, font, col, align, glowA) {
  ctx.font = font; ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = col;
  if (glowA !== 0) {
    ctx.globalAlpha = glowA == null ? 0.35 : glowA;
    ctx.fillText(txt, x, y);
    ctx.globalAlpha = 1;
  }
  ctx.fillText(txt, x, y);
}
function wordW(ctx, word, size) {
  ctx.font = MONO(size);
  return ctx.measureText(word).width;
}
function drawWord(ctx, o, isActive) {
  const size = isActive ? 40 : 33;
  const x = Math.max(o.x, DANGER_X + 34);
  let cx = x;
  const danger = o.x < DANGER_X + 110;
  if (isActive) {
    ctx.strokeStyle = 'rgba(0,229,255,0.5)'; ctx.lineWidth = 2;
    ctx.strokeRect(x - 16, o.y - 34, wordW(ctx, o.w, size) + 32, 68);
  }
  for (let i = 0; i < o.w.length; i++) {
    const ch = o.w[i];
    let col = '#7e88ad';
    if (i < o.typed) col = '#00e5ff';
    else if (isActive && i === o.typed) col = G.errFlash > 0.4 ? '#ff3b5c' : '#ffffff';
    if (danger && i >= o.typed) col = '#ff5570';
    ctx.font = MONO(size);
    const cw = ctx.measureText(ch).width;
    if (isActive && i === o.typed && Math.floor(G.t * 3) % 2 === 0) {
      ctx.fillStyle = 'rgba(0,229,255,0.9)';
      ctx.fillRect(cx - 1, o.y + size * 0.62, cw + 2, 4);
    }
    glow(ctx, ch, cx + cw / 2, o.y, MONO(size), col, 'center', 0.25);
    cx += cw;
  }
}
function draw(ctx) {
  const sh = G.shake > 0 ? G.shake : 0;
  ctx.save();
  if (sh) ctx.translate((Math.random() - 0.5) * sh, (Math.random() - 0.5) * sh);
  // background
  ctx.fillStyle = '#0a0a18';
  ctx.fillRect(-20, -20, W + 40, H + 40);
  for (const s of stars) {
    ctx.fillStyle = 'rgba(124,77,255,0.28)';
    ctx.fillRect(s.x, s.y, s.s, s.s);
  }
  // band scanlines
  ctx.strokeStyle = 'rgba(0,229,255,0.05)'; ctx.lineWidth = 1;
  for (let y = BAND_TOP; y <= BAND_BOT; y += 48) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  hotspots = [];

  if (G.state === 'TITLE') drawTitle(ctx);
  else drawPlayfield(ctx);

  // particles on top (lighter = fake glow)
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a * 0.9;
    ctx.fillStyle = p.c;
    ctx.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    ctx.globalAlpha = a * 0.35;
    ctx.fillRect(p.x - p.s, p.y - p.s, p.s * 2, p.s * 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // full-screen flashes
  if (G.multFlash > 0) {
    ctx.fillStyle = G.multFlashV >= 3 ? 'rgba(255,45,149,' : 'rgba(124,77,255,';
    ctx.fillStyle += 0.16 * G.multFlash + ')';
    ctx.fillRect(0, 0, W, H);
  }
  if (G.errFlash > 0) {
    ctx.fillStyle = 'rgba(255,59,92,' + 0.16 * G.errFlash + ')';
    ctx.fillRect(0, BAND_TOP - 40, W, BAND_BOT - BAND_TOP + 80);
  }
  if (G.redFlash > 0) {
    ctx.fillStyle = 'rgba(255,59,92,' + 0.22 * G.redFlash + ')';
    ctx.fillRect(0, 0, W, H);
  }
  // toast
  if (G.toast > 0) {
    ctx.globalAlpha = Math.min(1, G.toast);
    glow(ctx, G.toastMsg, W / 2, H - 36, MONO(26), '#00e5ff', 'center', 0.4);
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function button(ctx, label, x, y, w, h, col, act) {
  const pulse = 0.5 + 0.12 * Math.sin(G.t * 3);
  ctx.fillStyle = 'rgba(10,10,24,0.9)';
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = pulse; ctx.strokeRect(x, y, w, h); ctx.globalAlpha = 1;
  glow(ctx, label, x + w / 2, y + h / 2, MONO(30), col, 'center', 0.4);
  hotspots.push({ x, y, w, h, act });
}

function drawTitle(ctx) {
  glow(ctx, 'NEON', W / 2, 330, MONO(110), '#00e5ff', 'center', 0.5);
  glow(ctx, 'TYPING', W / 2, 450, MONO(110), '#ff2d95', 'center', 0.5);
  glow(ctx, T('sub'), W / 2, 545, MONO(30, ''), '#c9d4e4', 'center', 0.15);
  button(ctx, T('daily'), W / 2 - 230, 640, 220, 74, '#00e5ff', 'daily');
  button(ctx, T('practice'), W / 2 + 10, 640, 220, 74, '#7c4dff', 'practice');
  glow(ctx, T('dailySub'), W / 2, 760, MONO(24, ''), '#7e88ad', 'center', 0);
  glow(ctx, T('hintTitle'), W / 2, 830, MONO(26, ''), '#c9d4e4', 'center', 0);
  glow(ctx, T('startHint'), W / 2, 890, MONO(24, ''), '#7e88ad', 'center', 0);
  if (isTouchLike()) glow(ctx, T('mobileHint'), W / 2, 950, MONO(24, ''), '#ff2d95', 'center', 0.2);
  if (best > 0) glow(ctx, T('best') + '  ' + best + ' WPM', W / 2, 1030, MONO(34), '#ffd700', 'center', 0.3);
  const today = WT.utcDate();
  if (daily && daily.date === today)
    glow(ctx, T('dailyDone') + ' (' + daily.wpm + ' WPM)', W / 2, 1100, MONO(24, ''), '#00e5ff', 'center', 0.2);
  if (streak.count > 0)
    glow(ctx, '\u{1F525} ' + streak.count + ' ' + T('streak'), W / 2, 1155, MONO(24, ''), '#ff2d95', 'center', 0.2);
  drawMute(ctx);
}

function drawMute(ctx) {
  const x = W - 84, y = 20, s = 60;
  ctx.strokeStyle = '#7e88ad'; ctx.lineWidth = 2;
  ctx.strokeRect(x, y, s, s);
  glow(ctx, Sound.isMuted() ? '\u{1F507}' : '\u{1F50A}', x + s / 2, y + s / 2, '30px sans-serif', '#c9d4e4', 'center', 0);
  hotspots.push({ x, y, w: s, h: s, act: 'mute' });
}

function drawPlayfield(ctx) {
  // HUD
  const p = progress();
  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  ctx.fillRect(40, 34, W - 80, 14);
  const grad = ctx.createLinearGradient(40, 0, W - 40, 0);
  grad.addColorStop(0, '#00e5ff'); grad.addColorStop(1, '#ff2d95');
  ctx.fillStyle = grad;
  ctx.fillRect(40, 34, (W - 80) * (1 - p), 14);
  glow(ctx, Math.ceil(Math.max(0, G.timeLeft)) + 's', W / 2, 88, MONO(38), G.timeLeft < 10 ? '#ff2d95' : '#c9d4e4', 'center', 0.2);
  glow(ctx, T('wpm') + ' ' + liveWpm(), 110, 88, MONO(34), '#00e5ff', 'center', 0.3);
  glow(ctx, T('acc') + ' ' + liveAcc() + '%', 610, 88, MONO(34), '#9ff3ff', 'center', 0.3);
  // lives
  for (let i = 0; i < 3; i++) {
    const lx = W / 2 - 60 + i * 60;
    ctx.beginPath();
    ctx.moveTo(lx, 132); ctx.lineTo(lx + 16, 150); ctx.lineTo(lx, 168); ctx.lineTo(lx - 16, 150);
    ctx.closePath();
    if (i < G.lives) { ctx.fillStyle = '#ff2d95'; ctx.globalAlpha = 0.9; ctx.fill(); ctx.globalAlpha = 1; }
    else { ctx.strokeStyle = 'rgba(255,45,149,0.3)'; ctx.lineWidth = 2; ctx.stroke(); }
  }
  // danger line
  const pa = 0.45 + 0.3 * Math.sin(G.t * 6);
  ctx.strokeStyle = 'rgba(255,59,92,' + pa + ')';
  ctx.lineWidth = 5;
  ctx.setLineDash([14, 10]);
  ctx.beginPath(); ctx.moveTo(DANGER_X, BAND_TOP - 40); ctx.lineTo(DANGER_X, BAND_BOT + 40); ctx.stroke();
  ctx.setLineDash([]);
  glow(ctx, '\u25B6', DANGER_X - 26, (BAND_TOP + BAND_BOT) / 2, MONO(30), 'rgba(255,59,92,' + pa + ')', 'center', 0.3);

  // words
  for (const o of G.words) drawWord(ctx, o, o === G.active);

  // bottom typing panel
  ctx.strokeStyle = 'rgba(0,229,255,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(40, 880); ctx.lineTo(W - 40, 880); ctx.stroke();

  if (G.state === 'PLAY' || G.state === 'PAUSE') {
    const act = G.active;
    if (act) {
      const size = 58;
      ctx.font = MONO(size);
      let total = ctx.measureText(act.w).width, cx = W / 2 - total / 2;
      for (let i = 0; i < act.w.length; i++) {
        const ch = act.w[i], cw = ctx.measureText(ch).width;
        glow(ctx, ch, cx + cw / 2, 980, MONO(size), i < act.typed ? '#00e5ff' : i === act.typed ? '#ffffff' : '#4a5378', 'center', 0.45);
        cx += cw;
      }
    } else {
      glow(ctx, T('typeHint'), W / 2, 980, MONO(34, ''), '#7e88ad', 'center', 0.1);
    }
    // combo meter
    const m = comboMult(G.combo);
    const label = T('combo') + ' ' + G.combo + (m > 1 ? '  \u00D7' + m : '');
    const col = m >= 3 ? '#ff2d95' : m >= 2 ? '#7c4dff' : '#00e5ff';
    glow(ctx, label, W / 2, 1080, MONO(44), col, 'center', 0.5);
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(W / 2 - 180, 1120, 360, 10);
    ctx.fillStyle = col;
    ctx.fillRect(W / 2 - 180, 1120, 360 * (G.comboT / COMBO_WINDOW), 10);
    glow(ctx, T('score') + ' ' + G.score, W / 2, 1185, MONO(34), '#ffd700', 'center', 0.25);
    if (G.state === 'PAUSE') {
      ctx.fillStyle = 'rgba(10,10,24,0.72)';
      ctx.fillRect(0, 0, W, H);
      glow(ctx, T('paused'), W / 2, 560, MONO(64), '#00e5ff', 'center', 0.4);
      glow(ctx, T('resume'), W / 2, 650, MONO(30, ''), '#c9d4e4', 'center', 0.1);
    }
  } else if (G.state === 'OVER') {
    drawOver(ctx);
  }
  drawMute(ctx);
}

function drawOver(ctx) {
  ctx.fillStyle = 'rgba(10,10,24,0.82)';
  ctx.fillRect(0, 0, W, H);
  const r = G.result || { wpm: 0, acc: 100, rank: RANKS[0], score: 0, combo: 0 };
  glow(ctx, r.reason === 'lives' ? T('overLives') : T('overTime'), W / 2, 250, MONO(46), '#ff2d95', 'center', 0.4);
  glow(ctx, String(r.wpm), W / 2, 380, MONO(150), '#00e5ff', 'center', 0.55);
  glow(ctx, T('wpm'), W / 2, 470, MONO(32, ''), '#c9d4e4', 'center', 0.1);
  glow(ctx, T('acc') + ' ' + r.acc + '%   \u00B7   ' + T('maxCombo') + ' \u00D7' + Math.max(1, r.combo) + '   \u00B7   ' + T('score') + ' ' + r.score,
    W / 2, 540, MONO(30), '#c9d4e4', 'center', 0.1);
  // rank badge
  const badgeY = 640;
  glow(ctx, T('rank'), W / 2, badgeY - 46, MONO(26, ''), '#7e88ad', 'center', 0);
  glow(ctx, r.rank.name.toUpperCase(), W / 2, badgeY, MONO(64), r.rank.col, 'center', 0.55);
  if (r.isBest) glow(ctx, '\u2B50 ' + T('newBest'), W / 2, badgeY + 64, MONO(30), '#ffd700', 'center', 0.35);
  // progress sparkline (last 20 runs, oldest -> newest)
  if (history.length > 1) {
    glow(ctx, T('progress'), W / 2, 790, MONO(24, ''), '#7e88ad', 'center', 0);
    const bw = Math.min(38, 640 / history.length), maxW = Math.max(...history.map(h => h.wpm), 1);
    history.forEach((h, i) => {
      const bh = Math.max(6, (h.wpm / maxW) * 90);
      const x = W / 2 - (history.length * bw) / 2 + i * bw + bw * 0.15;
      ctx.fillStyle = i === history.length - 1 ? '#00e5ff' : 'rgba(124,77,255,0.55)';
      ctx.fillRect(x, 880 - bh, bw * 0.7, bh);
    });
  }
  button(ctx, T('again'), W / 2 - 230, 960, 220, 74, '#00e5ff', 'again');
  button(ctx, T('share'), W / 2 + 10, 960, 220, 74, '#ff2d95', 'share');
  glow(ctx, 'ENTER ' + T('again').toLowerCase() + ' \u00B7 S ' + T('share').toLowerCase() + ' \u00B7 M', W / 2, 1085, MONO(22, ''), '#7e88ad', 'center', 0);
  if (G.mode === 'daily' && streak.count > 0)
    glow(ctx, '\u{1F525} ' + streak.count + ' ' + T('streak'), W / 2, 1145, MONO(26), '#ff2d95', 'center', 0.25);
}

/* ---------- QA hooks ---------- */
function stateSnapshot() {
  return {
    state: G.state, mode: G.mode,
    score: G.score, combo: G.combo, comboMax: G.comboMax, mult: comboMult(G.combo),
    lives: G.lives, words: G.words.length, correct: G.correct, errors: G.errors, keys: G.keys,
    wpm: liveWpm(), acc: liveAcc(),
    timeLeft: Math.max(0, G.timeLeft), played: G.played,
    active: G.active ? G.active.w : null,
    onScreen: G.words.map(o => o.w),
    rank: (G.result ? G.result.rank : rankFor(liveWpm())).key,
    result: G.result ? { wpm: G.result.wpm, acc: G.result.acc, rank: G.result.rank.key, score: G.result.score, combo: G.result.combo, reason: G.result.reason } : null,
    dailyDone: !!(daily && daily.date === WT.utcDate()),
  };
}
window.__qaState = stateSnapshot;
window.__qa = {
  start(mode, seed) {
    startRun(mode === 'practice' ? 'practice' : 'daily', seed);
    return stateSnapshot();
  },
  type(str) {
    for (const ch of String(str)) typeLetter(ch);
    return stateSnapshot();
  },
  key(code, key) { // REAL event pipeline (what main.js keydown uses)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: key || code.replace(/^Key/, '').toLowerCase(), code, bubbles: true, cancelable: true }));
    return stateSnapshot();
  },
  sim(sec) { // deterministic fast-forward of update()
    let left = sec;
    while (left > 0 && G.state !== 'OVER') {
      const dt = Math.min(0.033, left);
      update(dt);
      left -= dt;
    }
    return stateSnapshot();
  },
  finish() {
    G.timeLeft = 0.001;
    let guard = 0;
    while (G.state === 'PLAY' && guard++ < 50) update(0.01);
    return stateSnapshot();
  },
  preview(dateOrSeed) {
    const seed = typeof dateOrSeed === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateOrSeed)
      ? WT.dailySeed(dateOrSeed)
      : (typeof dateOrSeed === 'number' ? String(dateOrSeed) : WT.dailySeed());
    return { seed, words: WT.buildQueue(seed, false).slice(0, 24) };
  },
  comboMult, rankFor, shareText,
  markDaily(dateStr) { return markDailyDone(dateStr); },
  expose: { G, loadStorage, K_BEST, K_HIST, K_DAILY, K_STREAK, stateSnapshot },
};

/* ---------- in-page deterministic self-check (?autotest=1) ---------- */
if (new URLSearchParams(location.search).get('autotest') === '1') {
  setTimeout(() => {
    const out = {};
    const backup = {};
    let dbg = null;
    [K_BEST, K_HIST, K_DAILY, K_STREAK].forEach(k => { backup[k] = localStorage.getItem(k); });
    try {
      const a = window.__qa.preview(), b = window.__qa.preview(), c = window.__qa.preview('2026-09-16');
      out.determinism = JSON.stringify(a) === JSON.stringify(b) && JSON.stringify(a) !== JSON.stringify(c);
      out.bank = WT.TIERSIZES.every(n => n >= 50) && WT.TOTAL >= 300;
      out.mult = [1, 1, 2, 2, 3, 3].every((v, i) => comboMult([0, 4, 5, 11, 12, 99][i]) === v);
      out.rank = rankFor(19).key === 'bronze' && rankFor(20).key === 'silver' &&
        rankFor(69).key === 'platinum' && rankFor(70).key === 'diamond' && rankFor(110).key === 'legend';
      // scoring run on a fixed practice seed
      window.__qa.start('practice', 'autotest-seed');
      const w0 = window.__qaState().onScreen[0]; // the word this device actually spawned
      dbg = { w0, st0: stateSnapshot() };
      let s = window.__qa.type(w0);
      dbg.st1 = s;
      out.scoreWord = s.score === w0.length * 10 && s.combo === 1 && s.correct === w0.length && s.active === null;
      // board is now empty and no word is active: any letter is a wrong key
      s = window.__qa.type('q');
      out.wrongKey = s.errors === 1 && s.combo === 0 && s.keys === w0.length + 1;
      s = window.__qa.sim(2); // let real game time accumulate, then time out
      s = window.__qa.finish();
      const expWpm = Math.round((w0.length / 5) / (s.played / 60));
      const expAcc = Math.round((w0.length / (w0.length + 1)) * 100);
      out.finish = s.state === 'OVER' && s.result && s.result.wpm === expWpm && s.result.acc === expAcc;
      out.storage = [K_BEST, K_HIST].every(k => localStorage.getItem(k) !== null);
      out.share = /seyrs1985\.github\.io\/neonplay/.test(shareText());
      out.audio = Sound.tickCount >= w0.length && Sound.errCount >= 1;
    } catch (e) { out.exception = false; }
    // restore pre-test storage + return to a clean title screen
    Object.keys(backup).forEach(k => {
      if (backup[k] === null) { try { localStorage.removeItem(k); } catch (e) {} }
      else localStorage.setItem(k, backup[k]);
    });
    loadStorage();
    G.state = 'TITLE'; G.words = []; G.active = null; G.result = null; particles.length = 0;
    out.allPass = Object.keys(out).every(k => k === 'allPass' || out[k] === true);
    window.__autotest = out;
    window.__autotestDbg = dbg;
  }, 400);
}
