/* Neon Solitaire — programmatic audio (WebAudio, zero assets).
 * Same pattern as memory-pairs / Neon Tide: lazy AudioContext on first
 * gesture, master gain, tone(f0,f1,dur,type,vol) primitive, mute persisted. */
'use strict';
var Sound = (function () {
  var ctx = null, master = null, muted = false;
  try { muted = localStorage.getItem("np_sol_mute") === "1"; } catch (e) {}
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
  return {
    resume: resume,
    isMuted: function () { return muted; },
    toggleMute: function () {
      muted = !muted;
      try { localStorage.setItem("np_sol_mute", muted ? "1" : "0"); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.4;
      return muted;
    },
    flip: function () { tone(340, 460, 0.06, "triangle", 0.2); },          // stock draw / reveal
    place: function () { tone(190, 150, 0.08, "square", 0.14); },          // card dropped on tableau
    found: function () { tone(520, 900, 0.14, "sine", 0.26); },            // foundation hit
    invalid: function () { tone(150, 90, 0.16, "sawtooth", 0.12); },       // illegal move buzz
    undo: function () { tone(400, 260, 0.09, "triangle", 0.14); },
    win: function () {
      [523, 659, 784, 1047, 1319].forEach(function (f, i) {
        setTimeout(function () { tone(f, f, 0.16, "triangle", 0.3); }, i * 110);
      });
    }
  };
})();
