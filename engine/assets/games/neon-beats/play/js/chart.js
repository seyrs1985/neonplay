/* Neon Beats — deterministic track/chart generator + scoring math.
 * Pure functions only (no DOM, no audio): given the same integer seed the
 * exact same track (scale / BPM / timbre / melody / lanes / drum grid) is
 * produced on every device — that is the "same song for the whole planet"
 * core of the design. Also loadable from Node for the seed-sweep self-test.
 */
(function (global) {
  'use strict';

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  var EPOCH = Date.UTC(2026, 0, 1); // Track #1 = 2026-01-01
  function seedForDate(dateStr) {
    return (parseInt(String(dateStr).replace(/-/g, ''), 10) >>> 0) || 1;
  }
  function trackNumberFor(dateStr) {
    var d = Date.parse(dateStr + 'T00:00:00Z');
    if (isNaN(d)) return 1;
    return Math.floor((d - EPOCH) / 86400000) + 1;
  }
  function utcDate(d) { return (d || new Date()).toISOString().slice(0, 10); }

  /* ---------- music theory tables ---------- */
  var SCALES = [
    { key: 'majPent', root: 60, steps: [0, 2, 4, 7, 9] },   // C major pentatonic
    { key: 'minPent', root: 57, steps: [0, 3, 5, 7, 10] },  // A minor pentatonic
    { key: 'blues', root: 60, steps: [0, 3, 5, 6, 7, 10] }, // C blues
  ];
  var TIMBRES = ['square', 'triangle', 'sawtooth'];

  function midiFreq(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  var LEAD = 2.0;       // silent-ish count-in before the first melody note (s)
  var MIN_NOTES = 96, MAX_NOTES = 128;

  /* ---------- the generator ---------- */
  function buildTrack(seed) {
    var r = mulberry32(seed >>> 0);
    var scale = SCALES[(r() * SCALES.length) | 0];
    var bpm = 110 + ((r() * 31) | 0);            // 110-140
    var timbre = TIMBRES[(r() * TIMBRES.length) | 0];
    var stepDur = 30 / bpm;                       // 8th note
    var targetDur = 44 + r() * 12;                // 44-56s of steps
    var bars = Math.max(8, Math.round(targetDur / (stepDur * 8)));
    var steps = bars * 8;

    // extended degree ladder: two octaves of the pentatonic/blues scale
    var ladder = scale.steps.concat(scale.steps.map(function (s) { return s + 12; }));
    ladder.push(scale.steps[0] + 24);

    /* pass 1: rhythm (which steps carry a note) — phrase arch + breath bars */
    var stepNote = new Array(steps).fill(false);
    for (var s = 0; s < steps; s++) {
      var pos = s / steps;
      var density = 0.55 + 0.18 * Math.sin(pos * Math.PI);
      if (((s / 8) | 0) % 4 === 3) density *= 0.55; // every 4th bar breathes
      if (s % 32 === 0) continue;                    // one rest step each 4 bars
      stepNote[s] = r() < density;
    }
    /* pass 2: clamp note count into [96,128] (design: ~96-128 notes) */
    var count = 0;
    for (s = 0; s < steps; s++) if (stepNote[s]) count++;
    for (s = 1; s < steps && count < MIN_NOTES; s++) if (!stepNote[s]) { stepNote[s] = true; count++; }
    for (s = steps - 1; s > 0 && count > MAX_NOTES; s--) if (stepNote[s]) { stepNote[s] = false; count--; }

    /* pass 3: melody random walk over the ladder */
    var deg = 2 + ((r() * 3) | 0);
    var notes = [];
    var stepIdx = [];
    for (s = 0; s < steps; s++) {
      if (!stepNote[s]) continue;
      var mv = ((r() * 3) | 0) - 1;                 // -1 / 0 / +1 walk
      if (r() < 0.12) mv = mv * 3 - (mv > 0 ? 1 : -1); // occasional leap
      deg = Math.max(0, Math.min(ladder.length - 1, deg + mv));
      notes.push({
        t: +(LEAD + s * stepDur).toFixed(4),
        midi: scale.root + ladder[deg],
        lane: 0,                                     // pass 4 fills this
        judged: false, hit: false,
      });
      stepIdx.push(s);
    }

    /* pass 4: lane assignment — no same-lane pair inside 250ms */
    var lastT = [-9, -9, -9], lastLane = -1;
    for (var i = 0; i < notes.length; i++) {
      var n = notes[i];
      var cands = [0, 1, 2].filter(function (l) { return n.t - lastT[l] >= 0.25; });
      if (!cands.length) cands = [(lastLane + 1) % 3];
      var prefer = cands.filter(function (l) { return l !== lastLane; });
      var pool = (prefer.length && r() < 0.8) ? prefer : cands;
      n.lane = pool[(r() * pool.length) | 0];
      lastT[n.lane] = n.t; lastLane = n.lane;
    }

    /* backing grid (auto-played: bass on quarters, kick 1&3, hat on 8ths) */
    var bass = [], drums = [];
    for (s = 0; s < steps; s++) {
      var t = LEAD + s * stepDur;
      if (s % 2 === 0) {
        var bmidi = scale.root - 24 + ((s % 8 === 4) ? 7 : 0);
        bass.push({ t: t, midi: bmidi, dur: stepDur * 1.7 });
      }
      drums.push({ t: t, k: (s % 8 === 0 || s % 8 === 4) ? 'kick' : (s % 8 === 2 || s % 8 === 6) ? 'snare' : 'hat' });
    }

    // note sustain: until the next note (or 1.8 steps), for hit playback
    for (i = 0; i < notes.length; i++) {
      var nx = notes[i + 1];
      notes[i].dur = nx ? Math.min(nx.t - notes[i].t, stepDur * 1.8) : stepDur * 1.8;
      notes[i].freq = +midiFreq(notes[i].midi).toFixed(3);
    }

    return {
      seed: seed >>> 0,
      scale: scale.key, root: scale.root, bpm: bpm, timbre: timbre,
      stepDur: stepDur, steps: steps,
      notes: notes, bass: bass, drums: drums,
      firstT: notes.length ? notes[0].t : LEAD,
      lastT: notes.length ? notes[notes.length - 1].t : LEAD,
      duration: +(LEAD + steps * stepDur).toFixed(4), // song timeline length
      melodyWave: notes.map(function (n) { return n.midi; }), // chart DNA
    };
  }

  /* ---------- judging + scoring (design: ±60ms P / ±130ms G) ---------- */
  var WIN_P = 0.060, WIN_G = 0.130, PTS_P = 300, PTS_G = 150;

  function judgeDelta(d) { // d = tapTime - noteTime
    var a = Math.abs(d);
    if (a <= WIN_P) return 'perfect';
    if (a <= WIN_G) return 'good';
    return null;
  }
  function comboMult(combo) { return combo >= 50 ? 3 : combo >= 20 ? 2 : 1; }
  function accuracy(perfects, goods, total) {
    var v = total > 0 ? (PTS_P * perfects + PTS_G * goods) / (PTS_P * total) * 100 : 0;
    return Math.round(v * 10) / 10; // 1-decimal, kills float edge cases at 95
  }
  function gradeFor(acc) { return acc >= 95 ? 'S' : acc >= 85 ? 'A' : acc >= 70 ? 'B' : 'C'; }

  var RANKS = [
    { key: 'legend', min: 99, emoji: '🏆' },
    { key: 'master', min: 96, emoji: '🥇' },
    { key: 'diamond', min: 95, emoji: '💎' }, // acceptance: 94.9→platinum, 95→diamond (pairs with grade S≥95)
    { key: 'platinum', min: 85, emoji: '🥈' },
    { key: 'gold', min: 75, emoji: '🟡' },
    { key: 'silver', min: 60, emoji: '⚪' },
    { key: 'bronze', min: 0, emoji: '🟤' },
  ];
  function rankFor(acc) {
    for (var i = 0; i < RANKS.length; i++) {
      if (acc >= RANKS[i].min) {
        var next = i > 0 ? RANKS[i - 1] : null;
        return {
          key: RANKS[i].key, emoji: RANKS[i].emoji, min: RANKS[i].min,
          nextKey: next ? next.key : null, nextMin: next ? next.min : null,
          need: next ? +(next.min - acc).toFixed(1) : 0,
        };
      }
    }
    var last = RANKS[RANKS.length - 1];
    return { key: last.key, emoji: last.emoji, min: 0, nextKey: RANKS[RANKS.length - 2].key, nextMin: 60, need: +(60 - acc).toFixed(1) };
  }

  var api = {
    mulberry32: mulberry32, seedForDate: seedForDate, trackNumberFor: trackNumberFor,
    utcDate: utcDate, buildTrack: buildTrack, midiFreq: midiFreq,
    judgeDelta: judgeDelta, comboMult: comboMult, accuracy: accuracy,
    gradeFor: gradeFor, rankFor: rankFor, RANKS: RANKS,
    WIN_P: WIN_P, WIN_G: WIN_G, PTS_P: PTS_P, PTS_G: PTS_G,
    LEAD: LEAD, MIN_NOTES: MIN_NOTES, MAX_NOTES: MAX_NOTES,
    SCALES: SCALES, TIMBRES: TIMBRES,
  };
  global.NB = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
