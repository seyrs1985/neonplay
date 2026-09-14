/* Neon Air Hockey — procedural WebAudio engine (no audio files, all synthesized) */
'use strict';

const Sound = (() => {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let sfxGain = null;
  let muted = false;
  let musicTimer = null;
  let musicStep = 0;
  let padVoices = [];
  const SET_KEY = 'np_neon-air-hockey_settings'; // {skin:'classic',sound:true} — design key table

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
      raw.skin = raw.skin || 'classic';
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
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.22;
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
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
  }
  function isMuted() { return muted; }

  /* ---------- SFX primitives ---------- */
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

  /* ---------- game SFX ---------- */
  const sfx = {
    click()  { tone(640, 520, 0.05, 'square', 0.12); },
    start()  { tone(440, 880, 0.16, 'triangle', 0.24); tone(660, 1320, 0.18, 'triangle', 0.16, 0.09); },
    hit(k) { // mallet strikes puck — click + scrape, brightness scales with impact
      const kk = Math.max(0.15, Math.min(1, k || 0.4));
      tone(220 + 500 * kk, 140 + 220 * kk, 0.07 + 0.04 * kk, 'square', 0.14 + 0.16 * kk);
      noise(0.05 + 0.08 * kk, 0.1 + 0.16 * kk, 900 + 1800 * kk, 1.1);
    },
    wall()   { tone(190, 120, 0.09, 'sine', 0.26); noise(0.06, 0.16, 700, 1); },
    goal()   { // scored on the opponent
      noise(0.25, 0.2, 900, 0.5, 300);
      [523, 784, 1046, 1318].forEach((f, i) => tone(f, f * 1.006, 0.2, 'triangle', 0.24, i * 0.08));
    },
    concede() { tone(320, 96, 0.5, 'sawtooth', 0.2); noise(0.3, 0.14, 400, 0.6, 160); },
    win()    { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, f * 1.004, 0.24, 'triangle', 0.24, i * 0.09)); },
    lose()   { tone(420, 200, 0.3, 'triangle', 0.24); tone(300, 110, 0.45, 'sine', 0.24, 0.12); },
    count()  { tone(560, 560, 0.09, 'square', 0.16); },
    go()     { tone(840, 1120, 0.16, 'square', 0.2); },
    bad()    { tone(150, 88, 0.12, 'sawtooth', 0.14); },
  };

  /* ---------- ambient music loop (soft pad + sparse arp) ---------- */
  const ARP = [164.81, 196.0, 220.0, 261.63, 293.66];
  const STEP_MS = 340;

  function arpNote() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const idx = (Math.sin(musicStep * 0.63) * 2.4 + Math.sin(musicStep * 0.211) * 1.9 + 2.9) | 0;
    const f = ARP[((idx % ARP.length) + ARP.length) % ARP.length];
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 1100;
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(fl); fl.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.6);
    musicStep++;
  }

  function startPad() {
    if (!ctx || padVoices.length) return;
    [[82.41, 0.04], [123.47, 0.03]].forEach(([f, v]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.1 + Math.random() * 0.1;
      lfoG.gain.value = f * 0.004;
      lfo.connect(lfoG); lfoG.connect(o.frequency);
      o.type = 'sawtooth';
      o.frequency.value = f;
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = 380;
      g.gain.value = v;
      o.connect(fl); fl.connect(g); g.connect(musicGain);
      o.start(); lfo.start();
      padVoices.push({ o, lfo });
    });
  }

  function startMusic() {
    if (!ensure()) return;
    resume();
    startPad();
    if (musicTimer) return;
    musicTimer = setInterval(arpNote, STEP_MS);
  }

  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    padVoices.forEach(v => { try { v.o.stop(); v.lfo.stop(); } catch (e) {} });
    padVoices = [];
  }

  function initFromStorage() { muted = readMuted(); }

  return { resume, setMuted, isMuted, sfx, startMusic, stopMusic, initFromStorage };
})();
