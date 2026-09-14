/* Tile Rush — procedural WebAudio engine (zero audio files). */
'use strict';
var TRSound = (function () {
  var ctx = null, sfx = null, muted = false, KEY = "np_tile-rush_settings";
  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try { ctx = new AC(); } catch (e) { return false; }
    var master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
    sfx = ctx.createGain();
    sfx.gain.value = 0.7;
    sfx.connect(master);
    return true;
  }
  function resume() {
    if (ensure() && ctx.state === "suspended") {
      var p = ctx.resume(); if (p && p.catch) p.catch(function () {});
    }
  }
  function tone(f0, f1, dur, type, vol, when) {
    if (!ctx || muted) return;
    var t = ctx.currentTime + (when || 0);
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(sfx);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function noise(dur, vol, freq) {
    if (!ctx || muted) return;
    var t = ctx.currentTime;
    var len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = freq || 1600;
    var g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(sfx);
    src.start(t);
  }
  return {
    resume: resume,
    pick: function () { tone(660, 880, 0.07, "triangle", 0.16); },
    match: function () { noise(0.16, 0.22, 2400); tone(520, 1040, 0.14, "square", 0.1); tone(780, 1560, 0.16, "sine", 0.12, 0.06); },
    bad: function () { tone(220, 110, 0.22, "sawtooth", 0.14); },
    fail: function () { tone(320, 70, 0.7, "sawtooth", 0.2); noise(0.4, 0.18, 700); },
    win: function () {
      var seq = [523, 659, 784, 1046, 1318];
      for (var i = 0; i < seq.length; i++) tone(seq[i], seq[i], 0.16, "triangle", 0.16, i * 0.09);
      noise(0.3, 0.15, 3000);
    },
    propSfx: function () { tone(400, 900, 0.18, "sine", 0.15); },
    isMuted: function () { return muted; },
    setMuted: function (m) {
      muted = m;
      try {
        var s = JSON.parse(localStorage.getItem(KEY) || "{}");
        s.sound = !m; localStorage.setItem(KEY, JSON.stringify(s));
      } catch (e) {}
    },
    loadMuted: function () {
      try { var s = JSON.parse(localStorage.getItem(KEY) || "{}"); muted = s.sound === false; } catch (e) {}
      return muted;
    }
  };
})();
