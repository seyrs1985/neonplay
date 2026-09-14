/* Neon Mahjong — programmatic audio (WebAudio, zero assets).
 * Same pattern as neon-solitaire / memory-pairs: lazy AudioContext on first
 * gesture, master gain, tone(f0,f1,dur,type,vol) primitive, mute persisted. */
'use strict';
var Sound = (function () {
  var ctx = null, master = null, muted = false;
  try { muted = localStorage.getItem("np_neon-mahjong_mute") === "1"; } catch (e) {}
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
      try { localStorage.setItem("np_neon-mahjong_mute", muted ? "1" : "0"); } catch (e) {}
      if (master) master.gain.value = muted ? 0 : 0.4;
      return muted;
    },
    select: function () { tone(420, 520, 0.05, "triangle", 0.16); },            // pick a free tile
    match: function (chain) {                                                   // pair cleared (rises with combo)
      var f = 500 + Math.min(chain || 1, 10) * 38;
      tone(f, f * 1.5, 0.12, "sine", 0.26);
      tone(f * 1.5, f * 2, 0.09, "triangle", 0.1);
    },
    locked: function () { tone(160, 90, 0.14, "sawtooth", 0.12); },             // blocked tile buzz
    dead: function () { tone(220, 80, 0.3, "sawtooth", 0.14); },                // dead board (pre-shuffle moan)
    shuffle: function () { tone(320, 130, 0.22, "square", 0.1); },              // reshuffle sweep
    hint: function () { tone(880, 990, 0.08, "sine", 0.14); },
    win: function () {
      [523, 659, 784, 1047, 1319].forEach(function (f, i) {
        setTimeout(function () { tone(f, f, 0.16, "triangle", 0.3); }, i * 110);
      });
    }
  };
})();
