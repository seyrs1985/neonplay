/* Neon Wordle — procedural audio (WebAudio synthesis only, zero assets).
 * IIFE module exposing NPWD_Sound: key tap / flip tick / invalid buzz /
 * win arpeggio / lose slide + persisted mute. AudioContext resumes on first
 * user gesture (autoplay policy). */
'use strict';
var NPWD_Sound = (function () {
  var ctx = null, master = null, sfx = null, muted = false;
  try { muted = localStorage.getItem("np_wd_mute") === "1"; } catch (e) {}
  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      sfx = ctx.createGain(); sfx.gain.value = 1; sfx.connect(master);
    } catch (e) { ctx = null; return false; }
    return true;
  }
  function resume() { if (ensure() && ctx.state === "suspended") ctx.resume(); }
  function tone(f0, f1, dur, type, vol) {
    if (!ensure() || muted) return;
    try {
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || "sine";
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(sfx); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }
  function noise(dur, vol) {
    if (!ensure() || muted) return;
    try {
      var n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf; g.gain.value = vol || 0.15;
      src.connect(g); g.connect(sfx); src.start();
    } catch (e) {}
  }
  return {
    resume: resume,
    key: function () { tone(560, 470, 0.055, "triangle", 0.14); },
    del: function () { tone(300, 220, 0.06, "triangle", 0.12); },
    flip: function (i) { tone(330 + (i % 5) * 46, 330 + (i % 5) * 46, 0.085, "sine", 0.11); },
    bad: function () { tone(190, 120, 0.16, "sawtooth", 0.13); },
    win: function () {
      [523, 659, 784, 1047].forEach(function (f, i) { setTimeout(function () { tone(f, f, 0.15, "triangle", 0.2); }, i * 105); });
      setTimeout(function () { noise(0.18, 0.1); }, 430);
    },
    lose: function () { tone(340, 110, 0.55, "sawtooth", 0.17); },
    toggle: function () {
      muted = !muted;
      try { localStorage.setItem("np_wd_mute", muted ? "1" : "0"); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    muted: function () { return muted; }
  };
})();
