/* Reflex Rush — procedural WebAudio engine (no audio files, all synthesized) */
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
    musicGain.gain.value = 0.26;
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
    try {
      const cur = JSON.parse(localStorage.getItem('np_reflex-rush_settings') || 'null');
      localStorage.setItem('np_reflex-rush_settings', JSON.stringify({ sound: !m, zen: cur && cur.zen ? cur.zen : false }));
    } catch (e) {}
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

  function noise(dur, vol, freq = 1200, q = 0.8) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t);
  }

  /* ---------- game SFX ---------- */
  const sfx = {
    // faster reaction = brighter, shorter chirp; multiplier lifts the pitch
    hit(ms, mult) {
      const fast = Math.max(0, Math.min(1, (500 - ms) / 400)); // 1 = very fast
      const base = 420 + fast * 420 + (mult - 1) * 60;
      noise(0.07, 0.16 + fast * 0.12, 2600);
      tone(base, base * 1.9, 0.09 + fast * 0.05, 'triangle', 0.26);
      if (fast > 0.7) tone(base * 2, base * 2.6, 0.07, 'sine', 0.12, 0.05);
    },
    miss()    { tone(200, 90, 0.16, 'sawtooth', 0.2); noise(0.14, 0.14, 500); },
    timeout() { tone(160, 60, 0.3, 'square', 0.16); noise(0.24, 0.16, 380); },
    comboUp(k){ [523, 659, 784].slice(0, Math.min(k, 3)).forEach((f, i) => tone(f * Math.pow(2, k / 12), f * Math.pow(2, k / 12) * 1.02, 0.09, 'square', 0.12, i * 0.06)); },
    start()   { tone(440, 880, 0.16, 'triangle', 0.24); tone(660, 1320, 0.18, 'triangle', 0.16, 0.09); },
    over()    { [392, 494, 587, 784].forEach((f, i) => tone(f, f * 1.005, 0.22, 'triangle', 0.2, i * 0.11)); },
    newBest() { [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f * 1.005, 0.2, 'triangle', 0.22, i * 0.08)); noise(0.4, 0.18, 1800, 0.4); },
    click()   { tone(620, 520, 0.05, 'square', 0.1); },
  };

  /* ---------- ambient music loop (soft pad + sparse arp; tension rises late-run) ---------- */
  const ARP = [164.81, 196.0, 220.0, 261.63, 293.66, 329.63];
  const STEP_MS = 300;

  function arpNote(urgency) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const idx = (Math.sin(musicStep * 0.63) * 2.6 + Math.sin(musicStep * 0.211) * 2.2 + 3.4) | 0;
    const f = ARP[((idx % ARP.length) + ARP.length) % ARP.length] * (musicStep % 16 < 8 ? 1 : 1.5);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 1100 + urgency * 900;
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.06 + urgency * 0.03, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(fl); fl.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.6);
    musicStep++;
  }

  function startPad() {
    if (!ctx || padVoices.length) return;
    [[82.41, 0.045], [123.47, 0.034], [164.81, 0.028]].forEach(([f, v]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.11 + Math.random() * 0.1;
      lfoG.gain.value = f * 0.004;
      lfo.connect(lfoG); lfoG.connect(o.frequency);
      o.type = 'sawtooth';
      o.frequency.value = f;
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = 420;
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
    musicTimer = setInterval(() => arpNote(0), STEP_MS);
  }
  function setUrgency(u) {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = setInterval(() => arpNote(u), Math.max(140, STEP_MS - u * 120)); }
  }
  function stopMusic() {
    if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
    padVoices.forEach(v => { try { v.o.stop(); v.lfo.stop(); } catch (e) {} });
    padVoices = [];
  }

  function initFromStorage() {
    try {
      const s = JSON.parse(localStorage.getItem('np_reflex-rush_settings') || 'null');
      muted = s ? s.sound === false : false;
    } catch (e) {}
  }

  return { resume, setMuted, isMuted, sfx, startMusic, stopMusic, setUrgency, initFromStorage };
})();
