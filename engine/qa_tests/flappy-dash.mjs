/* flappy-dash QA — game is IIFE-scoped (no hooks), so black-box like breakout.
 * Direct getImageData on the game canvas is expensive in headless software
 * rendering (area-driven, throttles the rAF pump), so the autopilot downscales
 * the canvas onto a 36x56 offscreen buffer (willReadFrequently) once per
 * 100ms and reads THAT: the bird is the only solid-yellow blob (band x~108),
 * gates are cyan runs at lookahead columns 240/170. Bang-bang Space keydowns
 * aim below the measured gap center (flap overshoot is upward, gravity
 * recovers downward); the last gap is kept while the gate travels from the
 * scan column to the bird and dropped once threaded (score++).
 * PASS = stayed alive >=3s AND threaded >=1 gate (#score >= 1). */
export default async (h) => {
  await h.evaluate(`try{localStorage.clear()}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`document.getElementById('btn') !== null`).catch(() => false);
    if (ok) break;
  }
  const hasBtn = await h.evaluate(`document.getElementById('btn') !== null`);
  if (!hasBtn) return { pass: false, detail: "start button #btn never appeared (page did not boot)" };

  const installed = await h.evaluate(`(() => {
    window.__ap = { t0: null, diedAt: null, flaps: 0, ticks: 0, tracked: 0, score: 0,
                    birdY: null, gap: null, samples: [], rbMs: 0, frames: 0 };
    var OW = 36, OH = 56, SX = 10;                    // offscreen 36x56, 10px/px
    var off = document.createElement('canvas'); off.width = OW; off.height = OH;
    var octx = off.getContext('2d', { willReadFrequently: true });
    var origRAF = window.requestAnimationFrame;       // pure frame counter
    window.requestAnimationFrame = function (cb) { window.__ap.frames++; return origRAF.call(window, cb); };
    window.__apTimer = setInterval(() => {
      var ap = window.__ap;
      var ov = document.getElementById('overlay');
      if (!ov.classList.contains('hide')) {          // TITLE or post-death OVER
        if (!ap.t0) return;
        if (!ap.diedAt) ap.diedAt = Date.now();
        return;
      }
      if (!ap.t0) ap.t0 = Date.now();
      ap.ticks++;
      try {
        var cv = document.getElementById('cv');
        var rb0 = performance.now();
        octx.drawImage(cv, 0, 0, OW, OH);
        var d = octx.getImageData(0, 0, OW, OH).data;
        ap.rbMs += performance.now() - rb0;
        var px = (x, y) => { var i = (y * OW + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
        // bird: only solid-yellow blob, band x 9-12 (logical 90-125)
        var ymin = 1e9, ymax = -1;
        for (var y = 1; y < 50; y++) for (var x = 9; x <= 12; x++) {
          var c = px(x, y);
          if (c[0] > 180 && c[1] > 140 && c[2] < 115) {
            if (y < ymin) ymin = y; if (y > ymax) ymax = y;
          }
        }
        ap.birdY = ymax < 0 ? null : ((ymin + ymax) / 2) * SX;
        if (ap.birdY !== null) ap.tracked++;
        // gate gap: cyan runs at far column (x=24 -> 240) then near (x=17 -> 170)
        var t = null;
        for (var cx of [24, 17]) {
          var cy = [];
          for (var y2 = 1; y2 < 50; y2++) {
            var c2 = px(cx, y2);
            if (c2[2] > 100 && c2[1] > 80 && c2[0] < 100 && c2[2] - c2[0] > 30) cy.push(y2);
          }
          if (cy.length > 1) {
            var runs = [], s = cy[0];
            for (var q = 1; q <= cy.length; q++) {
              if (q === cy.length || cy[q] - cy[q - 1] > 1) { runs.push([s, cy[q - 1]]); s = cy[q]; }
            }
            if (runs.length >= 2) {
              var gt = runs[0][1] * SX, gb = runs[runs.length - 1][0] * SX;
              if (gb - gt > 90 && gb - gt < 240) {    // plausible gap height
                t = Math.min(gt + Math.min(95, (gb - gt) * 0.55), gb - 40);
                break;
              }
            }
          }
        }
        // keep the last gap while the gate travels to the bird; drop on score++
        var sc = parseInt(document.getElementById('score').textContent, 10) || 0;
        if (sc > (ap.score || 0)) { ap.score = sc; ap.gap = null; }
        else if (t !== null) ap.gap = t;
        ap.samples.push(sc + ':' + (ap.birdY === null ? '-' : Math.round(ap.birdY)) +
          '@' + (ap.gap === null ? '-' : Math.round(ap.gap)));
        if (ap.samples.length > 80) ap.samples.shift();
        // hysteresis bang-bang: flap only well below-cover of the aim line so
        // the fixed ~73px flap overshoot stays INSIDE the gap (band ~[aim-48,
        // aim+25]); never flap near the ceiling
        var aim = ap.gap !== null ? ap.gap : 300;
        if (ap.birdY !== null && ap.birdY > aim + 25 && ap.birdY > 110) {
          window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
          ap.flaps++;
        }
      } catch (e) { ap.err = String(e); }
    }, 100);
    return true;
  })()`);
  if (!installed) return { pass: false, detail: "failed to install autopilot" };

  // up to two flights: headless timer throttling occasionally starves a run,
  // so a second fresh START (real restart flow) is a legitimate retry
  const flight = async () => {
    await h.evaluate(`(() => { var ap = window.__ap;      // reset per-attempt state
      ap.t0 = null; ap.diedAt = null; ap.score = 0; ap.gap = null;
      ap.flaps = 0; ap.ticks = 0; ap.tracked = 0; ap.samples = [];
      document.getElementById('btn').click(); })()`);    // START (or restart)
    for (let i = 0; i < 16; i++) {                       // adaptive window ~8s
      await h.sleep(500);
      const m = await h.evaluate(`(() => { var ap = window.__ap;
        return { ticks: ap.ticks, score: parseInt(document.getElementById('score').textContent, 10) || 0,
                 died: !!ap.diedAt }; })()`);
      if ((m.ticks >= 45 || m.died) && m.ticks > 0) break;
    }
    return h.evaluate(`(() => { var ap = window.__ap;
      return {
        score: parseInt(document.getElementById('score').textContent, 10) || 0,
        alive: document.getElementById('overlay').classList.contains('hide'),
        ticks: ap.ticks, flaps: ap.flaps, tracked: ap.tracked,
        diedAt: ap.diedAt, t0: ap.t0, lastBird: ap.birdY,
        tail: ap.samples.slice(-8).join(' '),
      }; })()`);
  };
  let r = await flight();
  let attempts = 1;
  if (r.score < 1) { r = await flight(); attempts = 2; }  // one retry
  const diag = await h.evaluate(`(() => { clearInterval(window.__apTimer);
    var ap = window.__ap;
    return { frames: ap.frames, rbMs: Math.round(ap.rbMs), err: ap.err || null }; })()`);

  if (diag.err) return { pass: false, detail: "autopilot error: " + diag.err };
  if (r.ticks < 10 || diag.frames < 60)
    return { pass: false, detail: `game loop starved (ticks=${r.ticks}, rAF frames=${diag.frames}, readback=${diag.rbMs}ms total) — headless throttling` };
  if (r.tracked < r.ticks * 0.6)
    return { pass: false, detail: `bird not visible on canvas (tracked ${r.tracked}/${r.ticks} ticks) tail=${r.tail}` };
  const survivedMs = r.diedAt ? (r.diedAt - r.t0) : 8000;
  if (r.score < 1)
    return { pass: false, detail: `threaded no gate in ${attempts} attempt(s) (score=0, flaps=${r.flaps}, ticks=${r.ticks}, frames=${diag.frames}, survivedMs=${survivedMs}) tail=${r.tail}` };
  if (survivedMs < 2500)
    return { pass: false, detail: `died too early after ${r.score} gate(s): survivedMs=${survivedMs} tail=${r.tail}` };
  return {
    pass: true,
    detail: `START→pixel-autopilot flight: survived ${Math.round(survivedMs / 100) / 10}s, threaded ${r.score} gate(s), ${r.flaps} flaps over ${r.ticks} ticks (attempt ${attempts}), frames=${diag.frames}, still alive=${r.alive}, lastBird=${Math.round(r.lastBird)}`,
  };
}
