/* Neon Link — procedural WebAudio engine (no audio files, all synthesized).
 * Sound.select / link(chain) / bad / shuffle / win / start; mute persisted. */
'use strict';
const Sound = (() => {
  let ctx = null, master = null, sfxGain = null, muted = false;
  try { muted = localStorage.getItem('np_neon-link_mute') === '1'; } catch (e) {}

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
      const p = ctx.resume(); if (p && p.catch) p.catch(() => {});
    }
  }
  function setMuted(m) {
    muted = m;
    try { localStorage.setItem('np_neon-link_mute', m ? '1' : '0'); } catch (e) {}
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
  }

  function tone(f0, f1, dur, type, vol, when) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + (when || 0);
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
  function noise(dur, vol, freq) {
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 1200;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfxGain);
    src.start(t);
  }

  const sfx = {
    select() { tone(660, 880, 0.07, 'triangle', 0.16); },
    link(chain) { // neon zap: rising shimmer that climbs with the combo
      const c = Math.min(chain || 1, 5);
      tone(420 + c * 70, 1180 + c * 110, 0.16, 'triangle', 0.28);
      tone(210 + c * 35, 90 + c * 20, 0.22, 'sine', 0.18, 0.02);
      noise(0.1, 0.12, 2400);
    },
    bad() { tone(180, 96, 0.16, 'sawtooth', 0.16); },
    shuffle() { noise(0.3, 0.22, 900); tone(300, 620, 0.24, 'sine', 0.14); },
    hint() { tone(980, 1320, 0.09, 'square', 0.1); },
    win() {
      [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, f * 1.004, 0.22, 'triangle', 0.24, i * 0.09));
      noise(0.5, 0.2, 1800);
    },
    start() { tone(440, 880, 0.14, 'triangle', 0.2); },
  };
  return { resume, setMuted, isMuted: () => muted, sfx };
})();
