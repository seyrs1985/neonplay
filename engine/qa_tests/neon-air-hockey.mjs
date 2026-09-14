/* Per-game scripted playtest for neon-air-hockey (design doc acceptance criteria).
 * Uses the GAME_STANDARD hooks: __qaState() from any state, __qa.setPuck to inject
 * position/velocity, __qa.sim for deterministic stepping, plus __qaPointer for
 * REAL synthetic multi-touch PointerEvents. Verifies the LESSONS #9 gameplay red
 * line: a forced puck into the top net scores for the player and resets the
 * serve on the conceding side, a forced puck into the bottom net scores for the
 * AI, a full first-to-7 match reaches the settlement panel with persistence
 * keys, both mallets track independent pointerIds with half constraints, the
 * daily AI seed is deterministic, the share card renders — and finally runs the
 * in-page ?autotest=1 self-check with zero window.onerror.
 */
export default async (h) => {
  try {
    await h.evaluate(`location.reload()`);
    let s = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      s = await h.evaluate(`(window.__qaState ? window.__qaState() : null)`).catch(() => null);
      if (s) break;
    }
    if (!s) return { pass: false, detail: 'no __qaState hook (GAME_STANDARD violation)' };

    const phys = await h.evaluate(`window.__PHYS`);
    if (!phys || !phys.PUCK_MAXV || !phys.TABLE)
      return { pass: false, detail: 'no window.__PHYS constants' };

    // 1) start an easy AI match; countdown resolves into PLAY
    s = await h.evaluate(`window.__qa.start('easy')`);
    if (!['COUNT', 'PLAY'].includes(s.state) || s.mode !== 'easy')
      return { pass: false, detail: `state=${s.state} mode=${s.mode}, expected COUNT|PLAY/easy` };
    if (s.winScore !== 7) return { pass: false, detail: `winScore=${s.winScore}, expected 7` };
    s = await h.evaluate(`window.__qa.sim(2.2)`);
    if (s.state !== 'PLAY')
      return { pass: false, detail: `countdown did not reach PLAY (state=${s.state})` };

    // 2) forced puck into the TOP net → player scores, AI (conceder) serves
    s = await h.evaluate(`window.__qa.setPuck(${phys.W / 2},${phys.TABLE.y0 + 26},0,-1300);window.__qa.sim(1.05)`);
    if (s.scoreUs !== 1 || s.lastEvent !== 'goal-us')
      return { pass: false, detail: `forced top-net puck did not score (scoreUs=${s.scoreUs}, lastEvent=${s.lastEvent})` };
    if (s.state !== 'PLAY' || s.puck.y >= phys.MID)
      return { pass: false, detail: `serve not reset to conceding half (state=${s.state}, puck.y=${s.puck.y})` };

    // 3) forced puck into the BOTTOM net → AI scores, player serves
    s = await h.evaluate(`window.__qa.setPuck(${phys.W / 2},${phys.TABLE.y1 - 26},0,1300);window.__qa.sim(1.05)`);
    if (s.scoreThem !== 1 || s.lastEvent !== 'goal-them')
      return { pass: false, detail: `forced bottom-net puck did not score for AI (scoreThem=${s.scoreThem}, lastEvent=${s.lastEvent})` };
    if (s.state !== 'PLAY' || s.puck.y <= phys.MID)
      return { pass: false, detail: `serve not on player half after conceding (puck.y=${s.puck.y})` };
    if (s.goalFxEver < 2) return { pass: false, detail: 'goal fx never triggered' };

    // 4) puck speed hard-capped at 1400
    s = await h.evaluate(`window.__qa.setPuck(${phys.W / 2},${phys.MID},5000,0);window.__qa.sim(0.1)`);
    if (s.puck.speed > phys.PUCK_MAXV)
      return { pass: false, detail: `puck speed ${s.puck.speed} exceeds cap ${phys.PUCK_MAXV}` };

    // 5) multi-touch: two pointerIds drive both mallets independently, halves locked
    s = await h.evaluate(`window.__qa.start('2p');window.__qa.sim(2.2)`);
    if (s.state !== 'PLAY') return { pass: false, detail: `2p match did not start (state=${s.state})` };
    const P = phys;
    s = await h.evaluate(`window.__qaPointer('pointerdown', 21, 140, 620);` +
      `window.__qaPointer('pointerdown', 22, 340, 180);` +
      `window.__qaPointer('pointermove', 21, 300, 520);` +
      `window.__qaPointer('pointermove', 22, 160, 300);window.__qa.sim(0.3)`);
    if (Math.abs(s.p1.x - 300) > 90 || Math.abs(s.p1.y - 520) > 90)
      return { pass: false, detail: `P1 mallet did not follow pointer 21 (p1=${s.p1.x},${s.p1.y})` };
    if (Math.abs(s.p2.x - 160) > 150 || Math.abs(s.p2.y - 300) > 150)
      return { pass: false, detail: `P2 mallet did not follow pointer 22 (p2=${s.p2.x},${s.p2.y})` };
    s = await h.evaluate(`window.__qaPointer('pointermove', 21, 240, 120);` +
      `window.__qaPointer('pointermove', 22, 240, 700);window.__qa.sim(0.5)`);
    if (s.p1.y > P.MID || s.p2.y < P.MID || Math.abs(s.p1.y - P.MID) > 2 || Math.abs(s.p2.y - P.MID) > 2)
      return { pass: false, detail: `half constraint violated (p1.y=${s.p1.y}, p2.y=${s.p2.y}, MID=${P.MID})` };
    s = await h.evaluate(`window.__qaPointer('pointerup', 21, 240, 120);` +
      `window.__qaPointer('pointerup', 22, 240, 700);window.__qa.sim(0.05)`);
    if (s.p1.pointerId !== null || s.p2.pointerId !== null)
      return { pass: false, detail: 'pointer ownership not released on pointerup' };

    // 6) full first-to-7 match vs AI → settlement panel + rank + stats
    s = await h.evaluate(`window.__qa.start('easy');window.__qa.sim(2.2)`);
    for (let i = 0; i < 7; i++) {
      s = await h.evaluate(`window.__qa.setPuck(${phys.W / 2},${phys.TABLE.y0 + 26},0,-1300);window.__qa.sim(1.05)`);
      if (s.scoreUs !== i + 1)
        return { pass: false, detail: `goal ${i + 1} not counted (scoreUs=${s.scoreUs})` };
    }
    if (s.state !== 'OVER' || s.won !== true)
      return { pass: false, detail: `7-goal match did not settle (state=${s.state}, won=${s.won})` };
    if (!s.rank) return { pass: false, detail: 'settlement missing rank' };

    // 7) daily challenge: first to 5, seeded AI identical across reads, marks daily
    const det = await h.evaluate(`(() => {
      const a = window.__qa.dailyPreview(), b = window.__qa.dailyPreview(), c = window.__qa.dailyPreview('2026-09-16');
      return { same: JSON.stringify(a) === JSON.stringify(b), diff: JSON.stringify(a) !== JSON.stringify(c),
               speed: a.speed, err: a.err, aggr: a.aggr, dayN: a.dayN };
    })()`);
    if (!det.same || !det.diff)
      return { pass: false, detail: 'daily AI seed not deterministic' };
    s = await h.evaluate(`window.__qa.start('daily');window.__qa.sim(2.2)`);
    if (s.winScore !== 5) return { pass: false, detail: `daily winScore=${s.winScore}, expected 5` };
    if (s.ai.speed !== det.speed) return { pass: false, detail: 'live daily params differ from preview' };
    for (let i = 0; i < 5; i++) {
      s = await h.evaluate(`window.__qa.setPuck(${phys.W / 2},${phys.TABLE.y0 + 26},0,-1300);window.__qa.sim(1.05)`);
    }
    if (s.state !== 'OVER' || s.scoreUs !== 5)
      return { pass: false, detail: `daily match did not settle at 5 (state=${s.state}, scoreUs=${s.scoreUs})` };

    // 8) persistence: full designed key set survives settled matches
    const keys = await h.evaluate(`Sound.setMuted(Sound.isMuted());` +
      `Object.keys(localStorage).filter(k=>k.indexOf('np_neon-air-hockey')===0).sort()`);
    const want = ['np_neon-air-hockey_badges', 'np_neon-air-hockey_best', 'np_neon-air-hockey_daily',
      'np_neon-air-hockey_settings', 'np_neon-air-hockey_stats', 'np_neon-air-hockey_streak',
      'np_neon-air-hockey_top10', 'np_neon-air-hockey_weekly'];
    const missing = want.filter(k => !keys.includes(k));
    if (missing.length)
      return { pass: false, detail: 'missing storage keys: ' + missing.join(',') + ' (got ' + keys.join(',') + ')' };

    // 9) share card non-blank + site link
    const share = await h.evaluate(`(() => {
      const cv = window.__qa.buildShareCard();
      const x = cv.getContext('2d');
      const cols = new Set();
      for (let i = 0; i < 30; i++) {
        const p = x.getImageData((i * 37) % cv.width, (i * 91) % cv.height, 1, 1).data;
        cols.add(p[0] + ',' + p[1] + ',' + p[2]);
      }
      return { distinct: cols.size, text: window.__qa.shareText() };
    })()`);
    if (share.distinct < 5)
      return { pass: false, detail: 'share card looks blank (' + share.distinct + ' colors)' };
    if (!/seyrs1985\.github\.io\/neonplay/.test(share.text))
      return { pass: false, detail: 'share text missing site link' };

    // 10) in-page deterministic self-check (?autotest=1)
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
      detail: `goals both ways + serve reset verified; 2p multi-touch + half clamp ok; ` +
        `7-goal match & daily-5 settle; daily AI deterministic (speed=${det.speed}, err=${det.err}); ` +
        `autotest allPass; share card ok`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
