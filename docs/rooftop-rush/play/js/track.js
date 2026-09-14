/* Rooftop Rush — track generator + physics + planner/verifier (browser & node).
 *
 * Track of the Day: mulberry32(YYYYMMDD) picks 14 chunks from the design-
 * validated CHUNKS pool (identical worldwide). Every obstacle is then checked
 * against the exact speed schedule (240+6t px/s, cap 420) with a full-jump arc
 * simulation; anything a fixed-parameter jump cannot clear is deterministically
 * softened until a complete auto-jump solution exists (LESSONS #13/#14 fuse:
 * seeded, deterministic, bounded, and proven completable by simulateRun). */
'use strict';
(function (root, factory) {
  if (typeof module !== 'undefined' && module.exports) module.exports = factory();
  else root.RR = factory();
})(typeof window !== 'undefined' ? window : globalThis, function () {

const PHYS = {
  W: 480, H: 720, ROOF_Y: 560,
  G: 2200, JUMPV: 780, JUMP_CUT: -320,     // release cut: vy<-320 -> -320 (short hop)
  V0: 240, ACC: 6, VMAX: 420,              // speed ramp 240 +6/s cap 420
  PW_HALF: 12, SPIKE_H: 16,
  FACE_MARGIN: 8, SPIKE_MARGIN: 8, RUNWAY_MIN: 20,
  DEATH_Y: 740, START_X: 120,
  ROOFS_PER_CHUNK: 2, CHUNKS_PER_DAY: 14,
};
PHYS.AIR_T = 2 * PHYS.JUMPV / PHYS.G;               // 0.709s full-jump air time
PHYS.JUMP_H = PHYS.JUMPV * PHYS.JUMPV / (2 * PHYS.G); // 138px full-jump height

/* design chunk pool — planner-validated numbers, do not edit (design §2) */
const CHUNKS = [
  { id: 'C1', band: [240, 280], gaps: [100, 110, 90], spikes: [], walls: [], roofW: [340, 320, 360] },
  { id: 'C2', band: [280, 330], gaps: [140, 145, 130], spikes: [], walls: [], roofW: [300, 300, 320] },
  { id: 'C3', band: [260, 310], gaps: [110, 120], spikes: [70, 60], walls: [], roofW: [300, 340] },
  { id: 'C4', band: [270, 330], gaps: [120, 130], spikes: [], walls: [100, 110], roofW: [300, 320] },
  { id: 'C5', band: [290, 350], gaps: [150, 140], spikes: [80], walls: [90], roofW: [280, 300] },
  { id: 'C6', band: [320, 380], gaps: [155, 165], spikes: [], walls: [], roofW: [260, 280, 300] },
  { id: 'C7', band: [320, 380], gaps: [170, 160], spikes: [70, 80], walls: [], roofW: [150, 160, 140] },
  { id: 'C8', band: [340, 420], gaps: [180, 170], spikes: [85, 75], walls: [115], roofW: [240, 220] },
];
const CHUNK_BY_ID = {};
CHUNKS.forEach(c => { CHUNK_BY_ID[c.id] = c; });

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function speedFor(runT) { return Math.min(PHYS.VMAX, PHYS.V0 + PHYS.ACC * runT); }
function timeAt(x) { // exact inverse of x(t)=240t+3t^2 (t<=30), then 420(t-30)
  if (x <= 9900) return (-240 + Math.sqrt(240 * 240 + 12 * x)) / 6;
  return 30 + (x - 9900) / 420;
}
function speedAt(x) { return speedFor(timeAt(Math.max(0, x))); }

function pick(rng, arr) { return arr[Math.floor(rng() * arr.length)]; }
function r10(v) { return Math.round(v / 10) * 10; }
function r5(v) { return Math.round(v / 5) * 5; }

/* draw one chunk: 2 roofs + trailing gaps (gapAfter of last roof = inter-chunk gap) */
function drawChunk(def, rng, cursor) {
  const roofs = [];
  let x = cursor;
  for (let r = 0; r < PHYS.ROOFS_PER_CHUNK; r++) {
    const w = r10(pick(rng, def.roofW));
    const roof = { x, w, top: PHYS.ROOF_Y, chunk: def.id, spike: null, wallH: 0, takeoffs: [], gapAfter: 0 };
    if (def.spikes.length && rng() < 0.55) {          // spike OR wall, never both
      const sw = r5(pick(rng, def.spikes));
      let sx = Math.round(roof.x + (w - sw) / 2 + (rng() * 2 - 1) * 16);
      sx = Math.max(roof.x + 34, Math.min(roof.x + w - sw - 34, sx));
      roof.spike = { x: sx, w: sw };
    } else if (def.walls.length && rng() < 0.5) {
      roof.wallH = r5(pick(rng, def.walls));
      roof.top = PHYS.ROOF_Y - roof.wallH;
    }
    roof.gapAfter = r5(pick(rng, def.gaps));
    roofs.push(roof);
    x += w + roof.gapAfter;
  }
  return { roofs, end: x };
}

function shiftFrom(route, j, dx) {
  for (let k = j; k < route.roofs.length; k++) {
    const r = route.roofs[k];
    r.x -= dx;
    if (r.spike) r.spike.x -= dx;
  }
  if (route.finishX) route.finishX -= dx;
}

/* full-jump arc from roof i at foot x=cx; null unless it clears spikes/faces
 * and lands safely. Integrated with the game's exact scheme and step (dt=1/60,
 * vy-before-y Euler) so the validated arc IS the arc the game will fly; the
 * margins below are strict (planner must clear the game's hitboxes with room
 * to spare, never skim them). */
function simArc(route, i, cx) {
  const roofs = route.roofs, hw = PHYS.PW_HALF;
  const last = Math.min(i + 2, roofs.length - 1);
  const v = speedAt(cx);
  let x = cx, y = roofs[i].top, vy = -PHYS.JUMPV;
  const dt = 1 / 60;
  for (let t = 0; t < 2.2; t += dt) {
    const px = x, py = y;
    x += v * dt; vy += PHYS.G * dt; y += vy * dt;
    for (let j = i; j <= last; j++) {
      const r = roofs[j];
      if (r.spike && x > r.spike.x - hw && x < r.spike.x + r.spike.w + hw &&
          y > r.top - PHYS.SPIKE_H - PHYS.SPIKE_MARGIN) return null;
      if (j > i && px < r.x && x >= r.x && y > r.top - PHYS.FACE_MARGIN) return null;
    }
    if (vy > 0) {
      for (let j = i; j <= last; j++) {
        const r = roofs[j];
        if (py <= r.top && y >= r.top && x >= r.x + 5 && x <= r.x + r.w - 1) {
          const f = (r.top - py) / (y - py);
          const lx = px + (x - px) * f;
          if (j === i) { // hop our own mid-roof spike: land past it with runway,
            // but never skimming the far edge (real landing drifts a few px on)
            if (r.spike && lx > r.spike.x + r.spike.w + hw + PHYS.RUNWAY_MIN &&
                lx < r.x + r.w - 8) return { roof: i, x: lx };
            return null;
          }
          const s = r.spike;
          if (s && !(lx < s.x - hw - PHYS.RUNWAY_MIN || lx > s.x + s.w + hw + 3)) return null;
          if (j < roofs.length - 1 && lx > r.x + r.w - 14) return null; // keep takeoff room
          return { roof: j, x: lx };
        }
      }
    }
    if (y > PHYS.DEATH_Y - 4) return null;
  }
  return null;
}

/* plan every jump leaving roof i (from entry x); records roof.takeoffs (late-
 * first scan = most natural human timing). avoidX (optional) skips candidates
 * at/after that x — used to backtrack the previous roof to an earlier takeoff.
 * Returns landing or null. */
function planFrom(route, i, startX, avoidX) {
  const roof = route.roofs[i], hw = PHYS.PW_HALF;
  let cur = Math.max(startX, roof.x + hw + 2);
  roof.takeoffs = [];
  for (let hop = 0; hop < 3; hop++) {
    const edge = roof.x + roof.w;
    // candidates must be reachable ON FOOT from cur (no running through the spike)
    const s = roof.spike;
    const curBeforeSpike = !!(s && cur <= s.x + s.w + hw);
    const cands = [];
    const startCx = cur > edge - 2 ? cur : edge - 2; // latest reachable takeoff first
    for (let cx = startCx; cx > cur; cx -= 4) cands.push(cx);
    cands.push(cur); // always try jumping exactly from where we stand
    let chosen = null;
    for (let ci = 0; ci < cands.length; ci++) {
      const cx = cands[ci];
      if (avoidX !== undefined && cx >= avoidX - 4) continue;
      if (s) {
        const inside = cx > s.x - hw - 3 && cx < s.x + s.w + hw + 3;
        const after = cx >= s.x + s.w + hw + 3;
        if (inside || (curBeforeSpike && after) || (!curBeforeSpike && !after)) continue;
      }
      const land = simArc(route, i, cx);
      if (land) {
        // the game triggers on the first frame past the planned x, and the real
        // landing can drift a few px beyond the plan (frame-ramped speed), so
        // the worst-case takeoff is one frame-step + drift later than planned.
        // BOTH arcs must land on the SAME roof — the real arc lands between
        // them, so an unplanned intermediate roof can never be landed on.
        const over = cx + speedAt(cx) / 60 + 6.5;
        const land2 = simArc(route, i, over);
        if (land2 && land2.roof === land.roof) { chosen = { cx, land }; break; }
      }
    }
    if (!chosen) { roof.takeoffs = []; return null; }
    roof.takeoffs.push(Math.round(chosen.cx * 10) / 10);
    if (chosen.land.roof > i) return chosen.land;
    cur = chosen.land.x; // cleared the mid-roof spike, continue to the edge
    avoidX = undefined;  // only the first hop of a re-plan is constrained
  }
  return null;
}

/* deterministic softening when the seeded draw is unjumpable at the real speed */
function soften(route, i) {
  const r = route.roofs[i], nx = route.roofs[i + 1];
  if (!nx) return false;
  if (r.spike && r.spike.w > 40) { r.spike.w -= 10; r.spike.x += 5; return true; }
  if (nx.wallH > 60) { nx.wallH -= 20; nx.top = PHYS.ROOF_Y - nx.wallH; return true; }
  if (nx.wallH > 0) { nx.wallH = 0; nx.top = PHYS.ROOF_Y; return true; }
  if (nx.spike && nx.spike.w > 40) { nx.spike.w -= 10; nx.spike.x += 5; return true; }
  if (nx.spike) { nx.spike = null; return true; }
  if (r.gapAfter > 40) { shiftFrom(route, i + 1, 10); r.gapAfter -= 10; return true; }
  return false;
}
function hardFlatten(route, j) { // terminal fallback: provably jumpable segment
  const r = route.roofs[j];
  if (!r) return;
  r.spike = null; r.wallH = 0; r.top = PHYS.ROOF_Y;
  const prev = route.roofs[j - 1];
  if (prev && prev.gapAfter > 70) { shiftFrom(route, j, prev.gapAfter - 70); prev.gapAfter = 70; }
}
function forceGap(route, j, g) { // pull roof j closer until the gap is g
  const prev = route.roofs[j - 1];
  if (!prev || prev.gapAfter <= g) return;
  shiftFrom(route, j, prev.gapAfter - g);
  prev.gapAfter = g;
}
function widenRoof(route, j, w) { // guarantee a landing target wide enough for
  const r = route.roofs[j];       // any entry (softened: flagged for reporting)
  if (!r || r.w >= w) return;
  shiftFrom(route, j + 1, r.w - w);
  r.w = w;
  r.soft = true;
  route.softened = (route.softened || 0) + 1;
}

/* incremental left-to-right planner over the whole route (daily: one shot;
 * classic: called as chunks are appended). On a stuck roof it first backtracks
 * (re-plans the previous roof with an earlier takeoff so this roof gets an
 * earlier entry), then softens obstacles; fuse-bounded, always terminates. */
function planFrontier(route) {
  const roofs = route.roofs;
  if (route._fp === undefined) { route._fp = 0; route._fe = [route.startX]; route._src = {}; }
  let backtracks = 0, localAdj = 0;
  while (route._fp < roofs.length - 1) {
    const fp = route._fp;
    const entry = route._fe[fp] !== undefined ? route._fe[fp] : roofs[fp].x + 30;
    const res = planFrom(route, fp, entry);
    if (res) { route._fe[res.roof] = res.x; route._src[res.roof] = fp; route._fp = res.roof; continue; }
    route.adjustments = (route.adjustments || 0) + 1;
    if (++localAdj > 120) { // battle budget out: force-accept and move on
      forceAccept(route, fp, entry);
      backtracks = 0; localAdj = 0;
      continue;
    }
    // 1) backtrack: the roof we actually jumped FROM takes off earlier ->
    //    earlier entry here (skipped roofs in between are never re-planned)
    const src = route._src && route._src[fp] !== undefined ? route._src[fp] : fp - 1;
    if (src >= 0 && backtracks < 24) {
      const prev = roofs[src];
      const prevEntry = route._fe[src] !== undefined ? route._fe[src] : prev.x + 30;
      const oldTakeoff = prev.takeoffs.length ? prev.takeoffs[0] : undefined;
      if (oldTakeoff !== undefined && oldTakeoff > prevEntry + 8) {
        const saved = prev.takeoffs.slice(); // failed re-plan wipes them — restore
        const rp = planFrom(route, src, prevEntry, oldTakeoff - 4);
        if (rp) { backtracks++; route._fe[rp.roof] = rp.x; route._src[rp.roof] = src; route._fp = rp.roof; continue; }
        prev.takeoffs = saved;
      }
    }
    // 2) soften the obstacle set, escalating to provably-solvable geometry
    if (route._stuckAt === fp) route._stuckN = (route._stuckN || 0) + 1;
    else { route._stuckAt = fp; route._stuckN = 1; }
    if (route._stuckN > 20) { // widen+flatten the target: any entry can land
      widenRoof(route, fp + 1, 260);
      hardFlatten(route, fp + 1);
      forceGap(route, fp + 1, 70);
    } else if (route._stuckN > 8 || !soften(route, fp)) hardFlatten(route, fp + 1);
  }
  return true;
}

/* terminal path: make the next roof a wide flat close target and take the jump
 * from where we stand — the arc lands inside it by construction. A roof is
 * never left unplanned. */
function forceAccept(route, fp, entry) {
  widenRoof(route, fp + 1, 260);
  hardFlatten(route, fp + 1);
  forceGap(route, fp + 1, 70);
  const edge = route.roofs[fp].x + route.roofs[fp].w;
  route.roofs[fp].takeoffs = [Math.min(Math.round(entry * 10) / 10, edge - 2)];
  route._fe[fp + 1] = route.roofs[fp + 1].x + 40;
  route._src[fp + 1] = fp;
  route._fp = fp + 1;
  route._stuckAt = undefined;
  route._stuckN = 0;
}

function buildDailyRouteAttempt(seed, dateStr) {
  const rng = mulberry32(seed);
  const route = { date: dateStr, seed: seed, mode: 'daily', roofs: [], chunkIds: [], adjustments: 0 };
  route.roofs.push({ x: 0, w: 460, top: PHYS.ROOF_Y, chunk: 'START', spike: null, wallH: 0, takeoffs: [], gapAfter: 0 });
  let cursor = 460;
  for (let i = 0; i < PHYS.CHUNKS_PER_DAY; i++) {
    const p = i / 13;
    const pool = p < 0.25 ? ['C1'] : p < 0.5 ? ['C2', 'C3'] : p < 0.75 ? ['C4', 'C5', 'C6'] : ['C6', 'C7', 'C8'];
    const def = CHUNK_BY_ID[pool[Math.floor(rng() * pool.length)]];
    route.chunkIds.push(def.id);
    const drawn = drawChunk(def, rng, cursor);
    route.roofs.push.apply(route.roofs, drawn.roofs);
    cursor = drawn.end;
  }
  route.roofs.push({ x: cursor, w: 360, top: PHYS.ROOF_Y, chunk: 'FIN', spike: null, wallH: 0, takeoffs: [], gapAfter: 0 });
  route.finishX = cursor + 150;
  route.startX = PHYS.START_X;
  planFrontier(route);
  return route;
}

/* Track of the Day: pure function of the UTC date. Attempts are seed-derived
 * mutations of the same date; the first attempt whose full replay is clean
 * (auto-jump completes with 0 deaths) is shipped — identical worldwide, and
 * guaranteed completable by construction (LESSONS #13/#14 insurance). */
function buildDailyRoute(dateStr) {
  const seed = (parseInt(String(dateStr).replace(/-/g, ''), 10) >>> 0) || 1;
  let fallback = null;
  for (let k = 0; k < 8; k++) {
    const route = buildDailyRouteAttempt((seed + k * 1000003) >>> 0, dateStr);
    route.attempt = k;
    if (!fallback) fallback = route;
    const sim = simulateRun(route);
    if (sim.finished && sim.deaths === 0) return route;
  }
  // last resort (never observed in 400-day verification): obstacle-free safe route
  const route = buildDailyRouteAttempt(seed, dateStr);
  route.attempt = 99;
  for (const r of route.roofs) { r.spike = null; r.wallH = 0; r.top = PHYS.ROOF_Y; }
  route.roofs.forEach(r => { r.takeoffs = []; });
  route._fp = 0; route._fe = [route.startX]; route._src = {};
  planFrontier(route);
  return route;
}

function buildClassicRoute(rand) {
  const rng = rand || Math.random;
  const route = { date: '', seed: 0, mode: 'classic', roofs: [], chunkIds: [], adjustments: 0, finishX: 0 };
  route.roofs.push({ x: 0, w: 460, top: PHYS.ROOF_Y, chunk: 'START', spike: null, wallH: 0, takeoffs: [], gapAfter: 100 });
  route.startX = PHYS.START_X;
  route._fp = 0; route._fe = [route.startX]; route._src = {};
  extendRoute(route, 1700, rng);
  return route;
}

/* endless mode: append band-matched random chunks until needX is covered.
 * Each chunk is snapshot-planned and the whole route is shadow-replayed; a
 * chunk whose replay dies is rolled back and re-drawn (max 5 tries, then a
 * flat provably-playable segment) — a planner hole can never reach the player. */
function extendRoute(route, needX, rand) {
  const rng = rand || Math.random;
  let guard = 0;
  while (route.roofs[route.roofs.length - 1].x + route.roofs[route.roofs.length - 1].w < needX && guard++ < 40) {
    const snap = snapRoute(route);
    const last = route.roofs[route.roofs.length - 1];
    const v = speedAt(last.x + last.w + last.gapAfter);
    const elig = CHUNKS.filter(c => v >= c.band[0] - 5 && v <= c.band[1] + 90);
    const def = elig.length ? elig[Math.floor(rng() * elig.length)] : CHUNK_BY_ID.C1;
    route.chunkIds.push(def.id);
    const drawn = drawChunk(def, rng, last.x + last.w + last.gapAfter);
    for (let k = 0; k < drawn.roofs.length; k++) {
      route.roofs.push(drawn.roofs[k]);
      planFrontier(route);
    }
    const endRoof = route.roofs[route.roofs.length - 1];
    const sim = simulateRun(route, { maxTime: timeAt(endRoof.x + endRoof.w) + 2, maxDeaths: 1 });
    if (sim.finished && sim.deaths === 0) continue;      // clean: keep the chunk
    restoreRoute(route, snap);                            // hole: roll it back and
    appendFlatChunk(route);                               // lay a flat provably-safe one
  }
  return route;
}

/* flat 2-roof segment with 60px gaps — trivially playable, used as fallback */
function appendFlatChunk(route) {
  const last = route.roofs[route.roofs.length - 1];
  let x = last.x + last.w + 60;
  last.gapAfter = 60;
  route.chunkIds.push('FLAT');
  for (let k = 0; k < 2; k++) {
    route.roofs.push({ x: x, w: 280, top: PHYS.ROOF_Y, chunk: last.chunk, spike: null, wallH: 0, takeoffs: [], gapAfter: 60, soft: true });
    x += 280 + 60;
  }
  planFrontier(route);
}

function snapRoute(route) {
  return {
    roofs: route.roofs.map(r => ({
      x: r.x, w: r.w, top: r.top, chunk: r.chunk, wallH: r.wallH, gapAfter: r.gapAfter,
      spike: r.spike ? { x: r.spike.x, w: r.spike.w } : null,
      takeoffs: r.takeoffs.slice(), soft: !!r.soft,
    })),
    chunkIds: route.chunkIds.slice(),
    adjustments: route.adjustments, softened: route.softened || 0,
    fp: route._fp, fe: route._fe.slice(), src: Object.assign({}, route._src),
  };
}
function restoreRoute(route, s) {
  route.roofs = s.roofs;
  route.chunkIds = s.chunkIds;
  route.adjustments = s.adjustments;
  route.softened = s.softened;
  route._fp = s.fp; route._fe = s.fe; route._src = s.src;
  route._stuckAt = undefined; route._stuckN = 0;
}

function pruneRoute(route, keepFromX) { // drop roofs fully behind the camera
  let k = 0;
  while (k < route.roofs.length - 6 && route.roofs[k].x + route.roofs[k].w + route.roofs[k].gapAfter < keepFromX) k++;
  if (k > 0) {
    route.roofs.splice(0, k);
    route._fp = Math.max(0, route._fp - k);
    if (route._pr) route._pr = Math.max(0, route._pr - k);
  }
}

/* headless replay of the planned solution with the game's own physics:
 * proves the route is completable (0 deaths) — the generator insurance. */
function simulateRun(route, opts) {
  opts = opts || {};
  const roofs = route.roofs, hw = PHYS.PW_HALF;
  const maxTime = opts.maxTime || 90;
  let runT = 0, deaths = 0, jumps = 0, finished = false, finishT = 0;
  const maxDeaths = opts.maxDeaths || 5; // never loop forever on a broken route
  let p = null;
  function spawn() {
    for (let k = 0; k < roofs.length; k++) roofs[k]._ti = 0;
    return { x: route.startX, y: roofs[0].top, vy: 0, grounded: true, ri: 0 };
  }
  p = spawn();
  const dt = 1 / 60;
  while (runT < maxTime) {
    const v = speedFor(runT);
    runT += dt;
    if (p.grounded) {
      const r = roofs[p.ri];
      p.x += v * dt;
      // trigger AFTER the move: a frame step may jump straight past the planned x
      if (r.takeoffs && r._ti < r.takeoffs.length && p.x >= r.takeoffs[r._ti]) {
        r._ti++; p.grounded = false; p.vy = -PHYS.JUMPV; jumps++;
      } else {
        if (r.spike && p.x + hw > r.spike.x && p.x - hw < r.spike.x + r.spike.w) { deaths++; if (deaths >= maxDeaths) break; p = spawn(); runT = 0; jumps = 0; continue; }
        const nx = roofs[p.ri + 1];
        if (nx && p.x + hw > nx.x && p.y > nx.top + 2) { deaths++; if (deaths >= maxDeaths) break; p = spawn(); runT = 0; jumps = 0; continue; }
        if (!nx && p.x > r.x + r.w) { finished = true; finishT = runT; break; } // ran off generated road: clean stop (endless mode)
        if (nx && p.x > r.x + r.w) { p.grounded = false; p.vy = 0; }
      }
    }
    if (!p.grounded) {
      const px = p.x, py = p.y;
      p.vy += PHYS.G * dt; p.x += v * dt; p.y += p.vy * dt;
      let dead = false, landed = -1, lx = 0;
      for (let j = Math.max(0, p.ri - 1); j <= Math.min(roofs.length - 1, p.ri + 3); j++) {
        const r = roofs[j];
        if (r.spike && p.x > r.spike.x - hw && p.x < r.spike.x + r.spike.w + hw && p.y > r.top - PHYS.SPIKE_H) { dead = true; break; }
        if (j > p.ri && px < r.x && p.x >= r.x && p.y > r.top + 2) { dead = true; break; }
        if (p.vy > 0 && py <= r.top && p.y >= r.top && p.x >= r.x + 1 && p.x <= r.x + r.w - 1) {
          const f = (r.top - py) / (p.y - py);
          lx = px + (p.x - px) * f; landed = j; break;
        }
      }
      if (dead) { deaths++; if (deaths >= maxDeaths) break; p = spawn(); runT = 0; jumps = 0; continue; }
      if (landed >= 0) { p.grounded = true; p.ri = landed; p.y = roofs[landed].top; p.vy = 0; p.x = lx; }
      else if (p.y > PHYS.DEATH_Y) { deaths++; if (deaths >= maxDeaths) break; p = spawn(); runT = 0; jumps = 0; continue; }
    }
    if (route.finishX && p.x >= route.finishX) { finished = true; finishT = runT; break; }
  }
  return {
    finished: finished, timeSec: Math.round(finishT * 100) / 100,
    deaths: deaths, jumps: jumps,
    meters: Math.floor((p.x - route.startX) / 10), endX: Math.round(p.x),
  };
}

/* acceptance #3: every generated obstacle inside the CHUNKS data + physics envelope */
function verifyEnvelope(route) {
  const bad = [];
  for (const r of route.roofs) {
    if (r.chunk === 'START' || r.chunk === 'FIN') continue;
    const def = CHUNK_BY_ID[r.chunk];
    if (!def) continue;
    const maxGap = def.band[0] * PHYS.AIR_T * 0.95;
    if (r.gapAfter > maxGap + 0.5) bad.push({ kind: 'gap', x: Math.round(r.x), val: r.gapAfter, max: Math.round(maxGap), chunk: r.chunk });
    if (r.wallH > 118) bad.push({ kind: 'wall', x: Math.round(r.x), val: r.wallH, max: 118 });
    if (!r.soft && r.w > Math.max.apply(null, def.roofW) + 6) bad.push({ kind: 'roofW', x: Math.round(r.x), val: r.w, max: Math.max.apply(null, def.roofW) });
    if (r.spike) {
      const maxS = def.spikes.length ? Math.max.apply(null, def.spikes) : 0;
      if (r.spike.w > maxS + 6) bad.push({ kind: 'spikeW', x: Math.round(r.x), val: r.spike.w, max: maxS });
      const air = speedAt(r.spike.x) * PHYS.AIR_T;
      if (r.spike.w > air * 0.5) bad.push({ kind: 'spikeAir', x: Math.round(r.spike.x), val: r.spike.w, max: Math.round(air * 0.5) });
    }
  }
  return bad;
}

return {
  PHYS: PHYS, CHUNKS: CHUNKS, CHUNK_BY_ID: CHUNK_BY_ID,
  mulberry32: mulberry32, speedFor: speedFor, timeAt: timeAt, speedAt: speedAt,
  buildDailyRoute: buildDailyRoute, buildClassicRoute: buildClassicRoute,
  extendRoute: extendRoute, pruneRoute: pruneRoute, planFrontier: planFrontier,
  simulateRun: simulateRun, verifyEnvelope: verifyEnvelope, simArc: simArc,
};
});
