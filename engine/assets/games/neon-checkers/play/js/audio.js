/* Neon Checkers — procedural WebAudio engine (all sounds synthesized, zero assets) */
'use strict';

const Sound = (() => {
  let ctx = null, master = null, musicGain = null, sfxGain = null, muted = false;
  const SET_KEY = 'np_ck_settings'; // {sound:true, level:'medium'} — shared with game.js

  function readMuted() {
    try {
      const raw = JSON.parse(localStorage.getItem(SET_KEY) || 'null');
      if (raw && typeof raw.sound === 'boolean') return !raw.sound;
    } catch (e) {}
    return false;
  }
  function writeMuted() {
    try {
      let raw = {};
      try { raw = JSON.parse(localStorage.getItem(SET_KEY) || '{}') || {}; } catch (e) {}
      raw.sound = !muted;
      localStorage.setItem(SET_KEY, JSON.stringify(raw));
    } catch (e) {}
  }

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.8;
    sfxGain.connect(master);
    musicGain = ctx.createGain(); // bus kept for parity with GAME_STANDARD (board game: SFX only)
    musicGain.gain.value = 0.0;
    musicGain.connect(master);
    return true;
  }
  function resume() {
    if (ensure() && ctx.state === 'suspended') {
      const p = ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
  }
  function setMuted(m) {
    muted = m;
    writeMuted();
    if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
  }
  function isMuted() { return muted; }

  function tone(freq0, freq1, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, freq0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, freq1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq = 1200, q = 0.8, sweepTo = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo > 0) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t);
  }

  const sfx = {
    click()  { tone(640, 520, 0.05, 'square', 0.12); },
    select() { tone(520, 700, 0.06, 'triangle', 0.14); },
    move()   { tone(340, 480, 0.08, 'triangle', 0.2); noise(0.04, 0.06, 900, 1); },  // place a piece
    jump()   { tone(300, 620, 0.12, 'square', 0.18); noise(0.08, 0.12, 1000, 1.1); }, // capture hop
    capture(){ noise(0.22, 0.22, 1100, 0.6, 260); tone(220, 110, 0.16, 'sawtooth', 0.14); },
    crown()  { [660, 880, 1108].forEach((f, i) => tone(f, f * 1.004, 0.16, 'triangle', 0.2, i * 0.07)); },
    win()    { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, f * 1.004, 0.24, 'triangle', 0.22, i * 0.09)); },
    lose()   { tone(420, 200, 0.3, 'triangle', 0.22); tone(300, 110, 0.45, 'sine', 0.22, 0.12); },
    draw()   { tone(440, 440, 0.2, 'sine', 0.16); tone(392, 392, 0.26, 'sine', 0.16, 0.16); },
    bad()    { tone(150, 88, 0.12, 'sawtooth', 0.14); },
  };

  function initFromStorage() { muted = readMuted(); }
  return { resume, setMuted, isMuted, sfx, initFromStorage };
})();
