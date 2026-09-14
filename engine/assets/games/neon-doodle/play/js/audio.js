/* Neon Doodle — procedural WebAudio engine (zero audio files, all synthesized) */
'use strict';

const Sound = (() => {
  let ctx = null, master = null, sfxGain = null, musicGain = null;
  let muted = false;

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
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.25;
    musicGain.connect(master);
    return true;
  }

  function resume() {
    if (ensure() && ctx.state === 'suspended') {
      const p = ctx.resume();
      if (p && p.catch) p.catch(() => {});
    }
  }

  function loadMute() {
    try {
      const s = JSON.parse(localStorage.getItem('np_neon-doodle_settings') || '{}');
      muted = (s.sound === false);
    } catch (e) {}
  }
  function setMuted(m) {
    muted = m;
    try {
      const s = JSON.parse(localStorage.getItem('np_neon-doodle_settings') || '{}');
      s.sound = !m;
      localStorage.setItem('np_neon-doodle_settings', JSON.stringify(s));
    } catch (e) {}
    if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
  }
  function isMuted() { return muted; }

  /* ---------- primitives ---------- */
  function tone(f0, f1, dur, type, vol, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
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
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(Math.max(1, sweepTo), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t);
  }

  /* ---------- game SFX ---------- */
  const sfx = {
    // pen scratch: tiny bandpass noise ticks as ink flows (throttled by caller)
    scratch() { noise(0.045, 0.10, 2400 + Math.random() * 900, 1.6); },
    // ball rolling on a line: soft tick, pitch tracks speed
    roll(speed) { tone(170 + Math.min(speed, 900) * 0.28, 150, 0.05, 'sine', 0.07); },
    // hard impact thock
    thock(vn) { noise(0.07, Math.min(0.3, 0.1 + Math.abs(vn) / 4000), 500, 1.1); tone(180, 90, 0.08, 'triangle', 0.16); },
    // DROP: falling whoosh
    drop() { noise(0.35, 0.16, 600, 0.7, 2200); },
    // ball captured in the cup: watery splash
    splash() { noise(0.3, 0.3, 900, 0.5, 300); tone(920, 340, 0.25, 'sine', 0.2); },
    // victory fanfare
    win() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f * 1.004, 0.24, 'triangle', 0.24, i * 0.1));
      noise(0.5, 0.18, 1800, 0.4);
    },
    star(i) { tone(700 + i * 180, 1050 + i * 220, 0.14, 'square', 0.14); },
    // dead ball / reset nudge
    dead() { tone(220, 110, 0.35, 'sine', 0.2); },
    // eraser sweep (ink NOT refunded — sound is a "spent" sweep)
    erase() { noise(0.22, 0.2, 300, 0.8, 1600); tone(300, 140, 0.18, 'sine', 0.1); },
    bad() { tone(160, 95, 0.12, 'sawtooth', 0.16); },
    click() { tone(640, 540, 0.05, 'square', 0.12); },
    start() { tone(440, 880, 0.16, 'triangle', 0.22); tone(660, 1320, 0.18, 'triangle', 0.15, 0.09); },
  };

  return { resume, setMuted, isMuted, loadMute, sfx };
})();
