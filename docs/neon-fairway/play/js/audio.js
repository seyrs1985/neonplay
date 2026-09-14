/* Neon Fairway audio — procedural WebAudio, zero asset files. */
'use strict';
var Sound = (function () {
  var ctx = null, master = null, muted = false;
  try { muted = localStorage.getItem("np_neon-fairway_mute") === "1"; } catch (e) {}
  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.4;
    master.connect(ctx.destination);
    return true;
  }
  function resume() { if (ensure() && ctx.state === "suspended") ctx.resume(); }
  function tone(f0, f1, dur, type, vol, when) {
    if (!ctx || muted) return;
    try {
      var t = ctx.currentTime + (when || 0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  }
  function noise(dur, vol) {
    if (!ctx || muted) return;
    try {
      var n = Math.floor(ctx.sampleRate * dur);
      var buf = ctx.createBuffer(1, n, ctx.sampleRate);
      var d = buf.getChannelData(0);
      for (var i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
      var src = ctx.createBufferSource(), g = ctx.createGain();
      src.buffer = buf;
      g.gain.value = vol;
      src.connect(g); g.connect(master);
      src.start();
    } catch (e) {}
  }
  return {
    resume: resume,
    isMuted: function () { return muted; },
    toggleMute: function () {
      muted = !muted;
      try { localStorage.setItem("np_neon-fairway_mute", muted ? "1" : "0"); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.4;
      return muted;
    },
    flip: function () { tone(340, 470, 0.07, "triangle", 0.2); noise(0.03, 0.05); },          // stock flip
    collect: function (chain) {                                                                 // card played (pitch rides the chain)
      var f = 420 + Math.min(chain, 12) * 46;
      tone(f, f * 1.5, 0.1, "sine", 0.26);
    },
    chain: function () { tone(660, 990, 0.12, "triangle", 0.24); tone(990, 1320, 0.14, "sine", 0.18, 0.06); }, // multiplier up
    joker: function () { [392, 523, 659, 784].forEach(function (f, i) { tone(f, f, 0.12, "triangle", 0.24, i * 0.07); }); },
    deny: function () { tone(180, 140, 0.12, "sawtooth", 0.14); },                              // illegal tap
    win: function () { [523, 659, 784, 1047, 1319].forEach(function (f, i) { tone(f, f, 0.16, "triangle", 0.28, i * 0.1); }); },
    dead: function () { tone(300, 120, 0.35, "sawtooth", 0.16); tone(150, 80, 0.4, "sine", 0.14, 0.05); }
  };
})();
