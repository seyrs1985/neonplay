/* Neon Pyramid — programmatic audio (WebAudio, zero assets).
 * Family pattern (neon-solitaire / Neon Tide): lazy AudioContext on first
 * gesture, master gain, tone() primitive, mute persisted. */
'use strict';
var Sound = (function () {
  var ctx = null, master = null, muted = false;
  try { muted = (JSON.parse(localStorage.getItem("np_neon-pyramid_settings") || "{}").sound === false); } catch (e) {}
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
  function tone(f0, f1, dur, type, vol) {
    if (!ctx || muted) return;
    try {
      var t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(master);
      o.start(t); o.stop(t + dur + 0.05);
    } catch (e) {}
  }
  function saveMute() {
    try {
      var s = JSON.parse(localStorage.getItem("np_neon-pyramid_settings") || "{}");
      s.sound = !muted;
      localStorage.setItem("np_neon-pyramid_settings", JSON.stringify(s));
    } catch (e) {}
  }
  return {
    resume: resume,
    isMuted: function () { return muted; },
    toggleMute: function () {
      muted = !muted;
      saveMute();
      if (master) master.gain.value = muted ? 0 : 0.4;
      return muted;
    },
    flip: function () { tone(340, 470, 0.06, "triangle", 0.2); },        // stock draw
    select: function () { tone(500, 560, 0.05, "sine", 0.14); },        // card selected
    pair: function () { tone(620, 990, 0.16, "sine", 0.3); },           // pair summing 13
    king: function () { tone(700, 1170, 0.2, "triangle", 0.3); },       // king solo
    rowClear: function () {                                              // a pyramid row dismantled
      [660, 880].forEach(function (f, i) {
        setTimeout(function () { tone(f, f * 1.25, 0.1, "triangle", 0.2); }, i * 90);
      });
    },
    cycle: function () { tone(300, 120, 0.28, "sawtooth", 0.16); },     // stock recycle (-200)
    invalid: function () { tone(150, 90, 0.16, "sawtooth", 0.12); },    // illegal tap buzz
    joker: function () { tone(420, 840, 0.18, "square", 0.18); },       // joker picked
    hammer: function () { tone(180, 60, 0.18, "square", 0.28); },       // hammer smash
    over: function () {                                                 // settle panel
      [440, 330, 262].forEach(function (f, i) {
        setTimeout(function () { tone(f, f, 0.18, "triangle", 0.22); }, i * 140);
      });
    },
    win: function () {                                                  // PHARAOH CLEAR
      [523, 659, 784, 1047, 1319, 1568].forEach(function (f, i) {
        setTimeout(function () { tone(f, f, 0.16, "triangle", 0.3); }, i * 100);
      });
    }
  };
})();
