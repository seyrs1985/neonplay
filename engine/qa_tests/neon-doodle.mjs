/* Per-game scripted playtest for neon-doodle (design doc acceptance criteria).
 * Red lines covered:
 *  - LESSONS #9 gameplay proof: __qa.solveLevel(k) replays the planner's
 *    reference line as SYNTHETIC PointerEvents (real pen pipeline), then
 *    __qa.drop() -> the ball is captured and the star settlement panel shows
 *    for all 5 levels.
 *  - physics constants == design doc (__qaState().physics).
 *  - no free win: dropping with no line never wins (anti-cheat).
 *  - ink economy: deduction == drawn length (+-5%); erase never refunds.
 *  - retention: storage keys, streak math, daily seed determinism, share card.
 *  - in-page ?autotest=1 self-check exposes window.__autotest.allPass.
 */
export default async function (h) {
  try {
    await h.evaluate(`location.reload()`);
    let s = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      s = await h.evaluate(`(window.__qaState ? window.__qaState() : null)`).catch(() => null);
      if (s) break;
    }
    if (!s) return { pass: false, detail: 'no __qaState hook (GAME_STANDARD violation)' };

    // 1) physics constants exactly as the design doc
    const phys = await h.evaluate(`window.__PHYS`);
    if (!phys || phys.W !== 480 || phys.H !== 720 || phys.GRAV !== 1500 || phys.R !== 12 ||
      Math.abs(phys.DT - 1 / 240) > 1e-9 || phys.REST !== 0.35 || phys.FRICTION !== 0.02)
      return { pass: false, detail: 'physics constants differ from design doc: ' + JSON.stringify(phys) };
    const sp = await h.evaluate(`window.__qaState().physics`);
    if (JSON.stringify(sp) !== JSON.stringify({ W: 480, H: 720, GRAV: 1500, R: 12, DT: 1 / 240, REST: 0.35, FRICTION: 0.02 }))
      return { pass: false, detail: '__qaState().physics mismatch: ' + JSON.stringify(sp) };

    // 2) solve all 5 levels via synthetic-PointerEvent replay of the reference line
    const stars = [];
    for (let k = 0; k < 5; k++) {
      const drawn = await h.evaluate(`window.__qa.solveLevel(${k})`);
      if (drawn.state !== 'PLAY' || drawn.strokes < 1 || drawn.drawnLen <= 0)
        return { pass: false, detail: `L${k + 1} refLine replay drew nothing (strokes=${drawn.strokes}, len=${drawn.drawnLen})` };
      if (drawn.ink < 0)
        return { pass: false, detail: `L${k + 1} ink went negative (${drawn.ink})` };
      const win = await h.evaluate(`window.__qa.drop(); window.__qa.sim(8)`);
      if (win.state !== 'WIN' || win.stars < 1)
        return { pass: false, detail: `L${k + 1} reference line did not win (state=${win.state}, stars=${win.stars}, evt=${win.lastEvent})` };
      if (win.winT < 0.3)
        return { pass: false, detail: `L${k + 1} settlement panel not shown (winT=${win.winT})` };
      stars.push(win.stars);
    }
    if (stars[0] !== 2)
      return { pass: false, detail: `L1 reference line expected exactly 2 stars (ink economy), got ${stars[0]}` };

    // 3) no free win: no line, straight drop must never be captured
    const before = await h.evaluate(`window.__qa.start(0); window.__qaState()`);
    const nf = await h.evaluate(`window.__qa.drop(); window.__qa.sim(9)`);
    if (nf.state === 'WIN' || nf.wins !== before.wins)
      return { pass: false, detail: `no-line drop won (state=${nf.state})` };
    if (nf.state !== 'PLAY' || nf.hint !== 'hintDead' || nf.deadStops < 1)
      return { pass: false, detail: `dead-ball reset missing (state=${nf.state}, hint=${nf.hint}, deadStops=${nf.deadStops})` };

    // 4) ink accounting: deduction == drawn length (+-5%); erase does not refund
    const s0 = await h.evaluate(`window.__qa.start(1); window.__qaState()`);
    const s1 = await h.evaluate(
      `window.__qa.penLine([[60,120],[200,120],[200,300],[400,300]]); window.__qaState()`);
    const used = s0.ink - s1.ink;
    if (Math.abs(used - s1.drawnLen) > Math.max(0.5, s1.drawnLen * 0.05))
      return { pass: false, detail: `ink deduction ${used.toFixed(1)} != drawn length ${s1.drawnLen}` };
    const s2 = await h.evaluate(`window.__qa.erase(); window.__qaState()`);
    if (s2.strokes !== 0 || Math.abs(s2.ink - s1.ink) > 0.001)
      return { pass: false, detail: `erase refunded ink or kept strokes (ink ${s1.ink} -> ${s2.ink})` };

    // 5) star thresholds (design rule 5)
    const cs = await h.evaluate(`[window.__qa.computeStars(300,600), window.__qa.computeStars(210,600),` +
      ` window.__qa.computeStars(204,600), window.__qa.computeStars(1,600), window.__qa.computeStars(0,600)]`);
    if (JSON.stringify(cs) !== JSON.stringify([3, 3, 2, 2, 1]))
      return { pass: false, detail: 'star thresholds wrong: ' + JSON.stringify(cs) };

    // 6) retention keys present after the 5 wins (design section-3 key list)
    const keys = await h.evaluate(`window.__qa.storageKeys()`);
    const want = ['np_neon-doodle_best', 'np_neon-doodle_daily', 'np_neon-doodle_levels',
      'np_neon-doodle_stats', 'np_neon-doodle_streak', 'np_neon-doodle_top10', 'np_neon-doodle_weekly'];
    const missing = want.filter(k => !keys.includes(k));
    if (missing.length)
      return { pass: false, detail: 'missing storage keys: ' + missing.join(',') + ' (got ' + keys.join(',') + ')' };
    const survive = await h.evaluate(`(() => {
      const lv = JSON.parse(localStorage.getItem('np_neon-doodle_levels') || '{}');
      const top = JSON.parse(localStorage.getItem('np_neon-doodle_top10') || '[]');
      return { levelsOk: Object.keys(lv).length >= 5, topOk: top.length >= 5 && top[0].score >= top[top.length - 1].score };
    })()`);
    if (!survive.levelsOk || !survive.topOk)
      return { pass: false, detail: 'levels stars / top10 order corrupted' };

    // 7) daily seed determinism (same level + tighter budget on repeated reads)
    const det = await h.evaluate(`(() => {
      const a = window.__qa.dailyInfo(), b = window.__qa.dailyInfo();
      return { same: JSON.stringify(a) === JSON.stringify(b), a };
    })()`);
    if (!det.same || det.a.level < 0 || det.a.level > 4)
      return { pass: false, detail: 'daily selection not deterministic' };
    const LV = await h.evaluate(`window.__PHYS && window.__qa.dailyInfo()`);
    const base = await h.evaluate(`window.__qa.start(0,true); window.__qaState()`);
    if (base.mode !== 'daily' || base.inkMax !== det.a.budget)
      return { pass: false, detail: `daily budget not applied (inkMax=${base.inkMax}, want ${det.a.budget})` };
    const dwin = await h.evaluate(`window.__qa.solveLevel(${det.a.level}, true); window.__qa.drop(); window.__qa.sim(8)`);
    if (dwin.state !== 'WIN')
      return { pass: false, detail: `daily (L${det.a.level + 1} x0.9) not solvable within budget (inkMax=${det.a.budget})` };
    const dailyRec = await h.evaluate(`JSON.parse(localStorage.getItem('np_neon-doodle_daily'))`);
    if (!dailyRec || dailyRec.done !== true || dailyRec.level !== det.a.level + 1)
      return { pass: false, detail: 'daily record not persisted: ' + JSON.stringify(dailyRec) };

    // 8) streak math: cross-day +1 / break -> 1 / monthly protect card consumed
    const st = await h.evaluate(`window.__qa.streakSim(['2026-09-10','2026-09-11','2026-09-12','2026-09-14','2026-09-17'])`);
    if (JSON.stringify(st.counts) !== JSON.stringify([1, 2, 3, 4, 1]) || st.final.protect !== 0)
      return { pass: false, detail: 'streak math wrong: ' + JSON.stringify(st) };

    // 9) share card: non-blank canvas with trajectory thumbnail + site link
    const share = await h.evaluate(`(() => {
      const cv = window.__qa.buildShareCard();
      const x = cv.getContext('2d');
      const cols = new Set();
      for (let i = 0; i < 40; i++) {
        const p = x.getImageData((i * 37) % cv.width, (i * 91) % cv.height, 1, 1).data;
        cols.add(p[0] + ',' + p[1] + ',' + p[2]);
      }
      return { distinct: cols.size, text: window.__qa.shareText(), w: cv.width, h: cv.height };
    })()`);
    if (share.distinct < 5)
      return { pass: false, detail: 'share card looks blank (' + share.distinct + ' colors)' };
    if (!/seyrs1985\.github\.io\/neonplay/.test(share.text))
      return { pass: false, detail: 'share text missing site link' };

    // 10) pointercancel safety: an interrupted stroke lands as segments, nothing dangles
    const pc = await h.evaluate(`window.__qa.start(2);
      window.__qa.pen(60,200,'down'); window.__qa.pen(200,300,'move'); window.__qa.pen(0,0,'cancel');
      window.__qaState()`);
    if (pc.drawing || pc.strokes < 1)
      return { pass: false, detail: 'pointercancel left no stroke or dangling pen' };

    // 11) in-page deterministic self-check (?autotest=1)
    await h.evaluate(`location.href = location.pathname + '?autotest=1&seed=20260915'`);
    let auto = null;
    for (let i = 0; i < 40; i++) {
      await h.sleep(400);
      auto = await h.evaluate(`(window.__autotest || null)`).catch(() => null);
      if (auto) break;
    }
    if (!auto) return { pass: false, detail: '?autotest=1 never exposed window.__autotest' };
    const fails = Object.keys(auto).filter(k => k !== 'allPass' && auto[k] === false);
    if (fails.length || auto.allPass !== true)
      return { pass: false, detail: 'autotest failed: ' + fails.join(',') };

    return {
      pass: true,
      detail: `5/5 levels solved via synthetic PointerEvents (stars ${stars.join(',')}); no-free-win + ` +
        `dead-stop verified; ink accounting exact; daily L${det.a.level + 1} x${det.a.budget} won & persisted; ` +
        `streak/protect ok; share card ${share.distinct} colors; autotest allPass`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
