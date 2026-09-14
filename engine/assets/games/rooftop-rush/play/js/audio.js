/* Rooftop Rush — procedural WebAudio engine (no audio files, all synthesized) */
'use strict';

const Sound = (() => {
  let ctx = null, master = null, sfxGain = null, muted = false;
  const SET_KEY = 'np_rooftop-rush_settings'; // {sound:true} — design key table

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

  function tone(f0, f1, dur, type, vol, when) {
    if (!ctx || muted) return;
    when = when || 0;
    const t = ctx.currentTime + when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq, q) {
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
    f.frequency.value = freq || 900;
    f.Q.value = q || 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t);
  }

  const sfx = {
    click() { tone(640, 520, 0.05, 'square', 0.1); },
    start() { tone(330, 660, 0.14, 'triangle', 0.2); tone(494, 988, 0.16, 'triangle', 0.14, 0.08); },
    jump(combo) { // rising blip, pitch climbs with the jump streak
      const k = Math.min(combo || 1, 8);
      tone(300 + k * 18, 620 + k * 40, 0.12, 'square', 0.16);
    },
    land() { noise(0.06, 0.16, 320, 0.7); tone(150, 90, 0.07, 'sine', 0.18); },
    die() { tone(340, 55, 0.42, 'sawtooth', 0.26); noise(0.28, 0.24, 700, 0.6); },
    finish() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f * 1.004, 0.22, 'triangle', 0.22, i * 0.09)); },
    best() { [659, 880, 1174, 1568].forEach((f, i) => tone(f, f * 1.004, 0.2, 'square', 0.14, i * 0.08)); },
  };

  function initFromStorage() { muted = readMuted(); }
  return { resume: resume, setMuted: setMuted, isMuted: isMuted, sfx: sfx, initFromStorage: initFromStorage };
})();
