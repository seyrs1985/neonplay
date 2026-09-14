/* Neon Typing — WebAudio SFX engine (all synthesized, zero audio files).
 * Voices: key tick (pitch rises with word progress), word burst (noise + up
 * chord), error buzz, life-lost sweep, start whoosh, gameover arpeggio. */
'use strict';

const Sound = (() => {
  let ctx = null, master = null, sfxGain = null;
  let muted = false;
  let tickCount = 0, errCount = 0, wordCount = 0; // QA counters

  const K_SET = 'np_tp_settings';

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 0.7; sfxGain.connect(master);
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
    try { localStorage.setItem(K_SET, JSON.stringify({ muted: m })); } catch (e) {}
    if (ctx && master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
  }
  function isMuted() { return muted; }
  function initFromStorage() {
    try {
      const raw = localStorage.getItem(K_SET);
      const v = raw ? JSON.parse(raw) : null;
      if (v && typeof v.muted === 'boolean') muted = v.muted;
      if (!raw) localStorage.setItem(K_SET, JSON.stringify({ muted: false }));
    } catch (e) {}
  }

  function toneAt(t, f0, f1, dur, type, vol) {
    if (!ctx || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noiseAt(t, dur, hp, vol) {
    if (!ctx || muted) return;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t);
  }

  const sfx = {
    /* correct keystroke: short blip, pitch climbs with progress 0..1 */
    tick(prog) {
      tickCount++;
      if (!ctx || muted) return;
      const f = 620 + 480 * Math.max(0, Math.min(1, prog));
      toneAt(ctx.currentTime, f, f * 1.12, 0.045, 'square', 0.07);
    },
    /* word destroyed: noise pop + rising two-note chord scaled by combo mult */
    word(mult) {
      wordCount++;
      if (!ctx || muted) return;
      const t = ctx.currentTime, base = 520 * (mult || 1);
      noiseAt(t, 0.09, 1400, 0.18);
      toneAt(t + 0.01, base, base * 1.26, 0.1, 'triangle', 0.16);
      toneAt(t + 0.06, base * 1.5, base * 1.9, 0.12, 'triangle', 0.13);
    },
    err() {
      errCount++;
      if (!ctx || muted) return;
      toneAt(ctx.currentTime, 140, 82, 0.14, 'sawtooth', 0.12);
    },
    life() {
      if (!ctx || muted) return;
      toneAt(ctx.currentTime, 340, 70, 0.32, 'sawtooth', 0.16);
    },
    start() {
      if (!ctx || muted) return;
      toneAt(ctx.currentTime, 440, 880, 0.16, 'triangle', 0.2);
    },
    over() {
      if (!ctx || muted) return;
      [523, 659, 784, 1046].forEach((f, i) =>
        toneAt(ctx.currentTime + i * 0.11, f, f * 1.01, 0.2, 'triangle', 0.18));
    },
    click() {
      if (!ctx || muted) return;
      toneAt(ctx.currentTime, 640, 520, 0.05, 'square', 0.09);
    },
  };

  return {
    resume, setMuted, isMuted, initFromStorage, sfx,
    get tickCount() { return tickCount; },
    get errCount() { return errCount; },
    get wordCount() { return wordCount; },
  };
})();
