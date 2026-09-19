/* Neon Stack — procedural audio (WebAudio, zero assets).
 * IIFE module exposing: Sound.resume/tone/noise/sfx/toggleMute/isMuted. */
'use strict';
var Sound = (function () {
  var ctx = null, master = null, sfxGain = null;
  var muted = false;
  try { muted = localStorage.getItem("np_muted") === "1"; } catch (e) {}

  function ensure() {
    if (ctx) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = 1; sfxGain.connect(master);
    return true;
  }
  function resume() { if (ensure() && ctx.state === "suspended") ctx.resume(); }
  function tone(f0, f1, dur, type, vol) {
    if (!ensure() || muted) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(Math.max(30, f0), t);
    o.frequency.exponentialRampToValueAtTime(Math.max(30, f1 || f0), t + dur);
    g.gain.setValueAtTime(vol || 0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(sfxGain);
    o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, f) {
    if (!ensure() || muted) return;
    var t = ctx.currentTime;
    var len = Math.max(1, (dur * ctx.sampleRate) | 0);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = ctx.createBufferSource(); src.buffer = buf;
    var g = ctx.createGain(); g.gain.value = vol || 0.2;
    var fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = f || 1400;
    src.connect(fl); fl.connect(g); g.connect(sfxGain);
    src.start(t);
  }
  function sfx(name, data) {
    switch (name) {
      case "move": tone(660, 660, 0.03, "square", 0.05); break;
      case "rotate": tone(520, 760, 0.05, "square", 0.08); break;
      case "lock": noise(0.06, 0.14, 900); tone(180, 140, 0.06, "triangle", 0.12); break;
      case "harddrop": noise(0.1, 0.22, 700); tone(220, 90, 0.1, "sawtooth", 0.14); break;
      case "clear": {
        var n = (data && data.rows) || 1;
        var base = 440 + n * 110;
        tone(base, base * 1.5, 0.12, "square", 0.16);
        if (n >= 4) { tone(base * 1.5, base * 2, 0.18, "square", 0.16); tone(880, 1320, 0.25, "triangle", 0.12); }
        break;
      }
      case "levelup": tone(523, 784, 0.12, "square", 0.14); setTimeout(function () { tone(784, 1046, 0.16, "square", 0.14); }, 110); break;
      case "finish": { var seq = [523, 659, 784, 1046]; for (var i = 0; i < seq.length; i++) (function (f, i) { setTimeout(function () { tone(f, f, 0.14, "square", 0.15); }, i * 120); })(seq[i], i); break; }
      case "over": tone(400, 60, 0.7, "sawtooth", 0.18); break;
      case "ui": tone(700, 900, 0.04, "square", 0.07); break;
      case "deny": tone(160, 120, 0.09, "square", 0.1); break;
    }
  }
  function toggleMute() {
    muted = !muted;
    try { localStorage.setItem("np_muted", muted ? "1" : "0"); } catch (e) {}
    if (master) master.gain.value = muted ? 0 : 0.5;
    return muted;
  }
  return { resume: resume, tone: tone, noise: noise, sfx: sfx, toggleMute: toggleMute, isMuted: function () { return muted; } };
})();
