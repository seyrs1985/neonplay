/* Neon Tide — procedural WebAudio engine (no audio files, all synthesized) */
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
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain();
    sfxGain.gain.value = 0.8;
    sfxGain.connect(master);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.35;
    musicGain.connect(master);
    return true;
  }

  function resume() {
    if (ensure() && ctx.state === 'suspended') ctx.resume();
  }

  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('nt_mute', m ? '1' : '0'); } catch (e) {}
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
    o.frequency.setValueAtTime(freq0, t);
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
    const len = Math.floor(ctx.sampleRate * dur);
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
    pickup()  { tone(880, 1420, 0.09, 'sine', 0.35); tone(1320, 1760, 0.07, 'sine', 0.18, 0.05); },
    shield()  { [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, 0.14, 'triangle', 0.25, i * 0.07)); },
    click()   { tone(600, 500, 0.05, 'square', 0.12); },
    hit()     { noise(0.25, 0.5, 900); tone(220, 60, 0.22, 'sawtooth', 0.3); },
    death()   { noise(0.5, 0.6, 700); tone(400, 40, 0.6, 'sawtooth', 0.35); tone(300, 30, 0.7, 'square', 0.2, 0.08); },
    fall()    { tone(700, 120, 0.45, 'sine', 0.28); },
    best()    { [784, 988, 1175, 1568].forEach((f, i) => tone(f, f, 0.16, 'triangle', 0.22, i * 0.09)); },
    start()   { tone(440, 880, 0.18, 'triangle', 0.25); tone(660, 1320, 0.2, 'triangle', 0.18, 0.1); },
  };

  /* ---------- ambient music loop (pads + pentatonic arp) ---------- */
  // A minor pentatonic: A C D E G
  const ARP = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
  const STEP_MS = 340;

  function arpNote() {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const idx = (Math.sin(musicStep * 0.7) * 2.4 + Math.sin(musicStep * 0.23) * 2.1 + 3.5) | 0;
    const f = ARP[((idx % ARP.length) + ARP.length) % ARP.length] * (musicStep % 16 < 8 ? 1 : 1.5);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const fl = ctx.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 1400;
    o.type = 'triangle';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
    o.connect(fl); fl.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.65);
    musicStep++;
  }

  function startPad() {
    if (!ctx || padVoices.length) return;
    [[110, 0.045], [164.81, 0.035], [220, 0.028]].forEach(([f, v]) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lfoG = ctx.createGain();
      lfo.frequency.value = 0.13 + Math.random() * 0.1;
      lfoG.gain.value = f * 0.004;
      lfo.connect(lfoG); lfoG.connect(o.frequency);
      o.type = 'sawtooth';
      o.frequency.value = f;
      const fl = ctx.createBiquadFilter();
      fl.type = 'lowpass'; fl.frequency.value = 480;
      g.gain.value = v;
      o.connect(fl); fl.connect(g); g.connect(musicGain);
      o.start(); lfo.start();
      padVoices.push({ o, lfo, g });
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
    try { muted = localStorage.getItem('nt_mute') === '1'; } catch (e) {}
  }

  return { resume, setMuted, isMuted, sfx, startMusic, stopMusic, initFromStorage };
})();
