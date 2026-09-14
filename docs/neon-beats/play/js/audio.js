/* Neon Beats — chiptune WebAudio engine (all synthesized, zero audio files).
 * The melody voice is played BY THE PLAYER: game.js calls melody() on every
 * judged hit, so a missed note simply never sounds. The backing grid (bass +
 * drums) is schedule-ahead from the song timeline. AudioContext is created
 * only from a real user gesture (main.js input paths call resume()).
 */
'use strict';

const Sound = (() => {
  let ctx = null, master = null, musicGain = null, sfxGain = null;
  let muted = false;
  let lastNoteFreq = 0;   // QA: freq of the most recent melody trigger
  let melodyCount = 0;    // QA: how many melody voices were triggered

  const K_SET = 'np_neon-beats_settings';

  function ensure() {
    if (ctx) return true;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.9;
    master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.5; musicGain.connect(master);
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
    if (master) master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.02);
  }
  function isMuted() { return muted; }
  function initFromStorage() {
    try {
      const v = JSON.parse(localStorage.getItem(K_SET) || 'null');
      if (v && typeof v.muted === 'boolean') muted = v.muted;
    } catch (e) {}
  }

  /* ---------- voices ---------- */
  // chiptune melody note: timbre osc + fast attack / exp decay envelope
  function melody(freq, timbre, dur, vol = 0.3) {
    lastNoteFreq = freq; melodyCount++;
    if (!ctx || muted) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = timbre === 'sawtooth' ? 'sawtooth' : timbre === 'triangle' ? 'triangle' : 'square';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.09, dur));
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 3600; // tame square harshness
    o.connect(f); f.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + Math.max(0.09, dur) + 0.05);
  }
  // bass: triangle one octave+ down, soft
  function bass(freq, when, dur = 0.4, vol = 0.22) {
    if (!ctx || muted) return;
    const t = when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + dur + 0.05);
  }
  // kick: pitch-dropping sine thump
  function kick(when, vol = 0.5) {
    if (!ctx || muted) return;
    const t = when;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(150, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    o.connect(g); g.connect(musicGain);
    o.start(t); o.stop(t + 0.2);
  }
  // snare / hat: filtered noise burst
  function noiseHit(when, dur, freq, vol) {
    if (!ctx || muted) return;
    const t = when;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(musicGain);
    src.start(t);
  }
  const snare = (when) => noiseHit(when, 0.09, 900, 0.16);
  const hat = (when) => noiseHit(when, 0.03, 6000, 0.07);

  /* ---------- schedule-ahead backing grid ----------
   * game.js calls schedule(songTime) every frame; events inside the
   * lookahead window are mapped onto the audio clock. Without an
   * AudioContext (muted first run / headless QA) the pointers still
   * advance so nothing piles up — the game is fully playable silent. */
  let grid = null, bassIdx = 0, drumIdx = 0;
  const LOOKAHEAD = 0.12;
  function startGrid(g) { grid = g; bassIdx = 0; drumIdx = 0; }
  function stopGrid() { grid = null; }
  function schedule(songTime) {
    if (!grid) return;
    const horizon = songTime + LOOKAHEAD;
    const base = ctx ? ctx.currentTime : 0;
    while (drumIdx < grid.drums.length && grid.drums[drumIdx].t <= horizon) {
      const ev = grid.drums[drumIdx++];
      if (ctx && !muted) {
        const at = base + Math.max(0, ev.t - songTime);
        if (ev.k === 'kick') kick(at);
        else if (ev.k === 'snare') snare(at);
        else hat(at);
      }
    }
    while (bassIdx < grid.bass.length && grid.bass[bassIdx].t <= horizon) {
      const ev = grid.bass[bassIdx++];
      if (ctx && !muted) bass(NB.midiFreq(ev.midi), base + Math.max(0, ev.t - songTime), ev.dur);
    }
    // release passed events when silent so a late ctx doesn't burst-play them
    if (!ctx || muted) {
      while (drumIdx < grid.drums.length && grid.drums[drumIdx].t <= songTime) drumIdx++;
      while (bassIdx < grid.bass.length && grid.bass[bassIdx].t <= songTime) bassIdx++;
    }
  }

  /* ---------- UI sfx ---------- */
  const sfx = {
    click()  { if (!ctx || muted) return; toneAt(ctx.currentTime, 640, 520, 0.05, 'square', 0.1); },
    start()  { if (!ctx || muted) return; toneAt(ctx.currentTime, 440, 880, 0.16, 'triangle', 0.22); },
    miss()   { if (!ctx || muted) return; toneAt(ctx.currentTime, 150, 90, 0.1, 'sawtooth', 0.07); },
    perfect(){ if (!ctx || muted) return; toneAt(ctx.currentTime, 1760, 2217, 0.06, 'square', 0.06); },
    over()   { if (!ctx || muted) return; [523, 659, 784, 1046].forEach((f, i) => toneAt(ctx.currentTime + i * 0.11, f, f * 1.01, 0.2, 'triangle', 0.2)); },
  };
  function toneAt(t, f0, f1, dur, type, vol) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  return {
    resume, setMuted, isMuted, initFromStorage,
    melody, startGrid, stopGrid, schedule, sfx,
    get lastNoteFreq() { return lastNoteFreq; },
    get melodyCount() { return melodyCount; },
  };
})();
