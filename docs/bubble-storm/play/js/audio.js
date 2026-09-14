/* Bubble Storm — procedural WebAudio engine (no audio files, all synthesized) */
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
    try { localStorage.setItem('np_bubble-storm_mute', m ? '1' : '0'); } catch (e) {}
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

  /* ---------- game SFX (shoot / pop / collapse / push / fail) ---------- */
  const sfx = {
    shoot()   { tone(340, 760, 0.09, 'sawtooth', 0.14); noise(0.05, 0.08, 2400); },
    stick()   { tone(220, 160, 0.06, 'sine', 0.14); },
    pop(n, mult) {
      const m = Math.min(mult || 1, 3);
      noise(0.14 + Math.min(n * 0.014, 0.18), 0.3 + Math.min(n * 0.02, 0.3), 800 + n * 55);
      tone(300 + m * 70, 880 + m * 110 + n * 7, 0.11 + Math.min(n * 0.008, 0.1), 'triangle', 0.3);
      if (n >= 6) { tone(160, 46, 0.36, 'sine', 0.42); noise(0.26, 0.3, 420); }
    },
    drop(n) {
      // whole cluster collapses: rumble + descending bounce tones
      noise(0.3 + Math.min(n * 0.02, 0.3), 0.34, 520);
      const k = Math.min(n, 6);
      for (let i = 0; i < k; i++) tone(520 - i * 60, 300 - i * 40, 0.1, 'triangle', 0.16, 0.05 + i * 0.055);
      if (n >= 8) { tone(120, 40, 0.5, 'sine', 0.5); }
    },
    push()    { tone(110, 58, 0.22, 'square', 0.26); noise(0.2, 0.28, 300); tone(70, 70, 0.3, 'sine', 0.3, 0.02); },
    bad()     { tone(150, 88, 0.12, 'sawtooth', 0.16); },
    chainUp(k){ tone(660 * Math.pow(2, k / 12), 880 * Math.pow(2, k / 12), 0.07, 'square', 0.12); },
    click()   { tone(620, 520, 0.05, 'square', 0.12); },
    start()   { tone(440, 880, 0.16, 'triangle', 0.24); tone(660, 1320, 0.18, 'triangle', 0.17, 0.09); },
    over()    { tone(420, 200, 0.3, 'triangle', 0.25); tone(300, 110, 0.45, 'sine', 0.25, 0.12); },
    best()    { [523, 659, 784, 1046, 1318, 1568].forEach((f, i) => tone(f, f * 1.005, 0.22, 'triangle', 0.26, i * 0.09)); noise(0.5, 0.25, 1600, 0.4); },
  };

  /* ---------- ambient music loop (pad + minor pentatonic arp) ---------- */
  const ARP = [164.81, 196.0, 220.0, 261.63, 293.66, 329.63];
  const STEP_MS = 300;

  function arpNote() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const idx = (Math.sin(musicStep * 0.63) * 2.6 + Math.sin(musicStep * 0.211) * 2.2 + 3.4) | 0;
    const f = ARP[((idx % ARP.length) + ARP.length) % ARP.length] * (musicStep % 16 < 8 ? 1 : 1.5);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 1300;
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.03);
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
      fl.type = 'lowpass'; fl.frequency.value = 440;
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

  function initFromStorage() {
    try { muted = localStorage.getItem('np_bubble-storm_mute') === '1'; } catch (e) {}
  }

  return { resume, setMuted, isMuted, sfx, startMusic, stopMusic, initFromStorage };
})();
