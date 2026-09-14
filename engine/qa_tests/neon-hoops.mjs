/* Per-game scripted playtest for neon-hoops (design doc acceptance criteria).
 * Uses the GAME_STANDARD hooks: __qaState() from any state, __qa.shoot/launch for
 * forced shots, __qa.sim() for deterministic stepping. Verifies the LESSONS #9
 * gameplay red line: a makeable shot raises the score and fires the net animation,
 * a forced miss clears the combo, a full timed run reaches the settlement panel,
 * persistence keys survive, the daily seed is deterministic — and finally runs
 * the in-page ?autotest=1 self-check.
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

    const phys = await h.evaluate(`window.__PHYS`);
    if (!phys || !phys.GRAV) return { pass: false, detail: 'no window.__PHYS constants' };

    // start a classic run via the injection surface (generic poke may have left us anywhere)
    s = await h.evaluate(`window.__qa.start('classic')`);
    if (s.state !== 'PLAY' || s.mode !== 'classic')
      return { pass: false, detail: `state=${s.state} mode=${s.mode}, expected PLAY/classic` };
    if (s.timeLeft < 55) return { pass: false, detail: `timeLeft=${s.timeLeft}, expected ~60` };

    // ballistic solve in the page (uses the game's own constants): dead-center swish
    const shot = (bx, by, hx, hy) => {
      const T = 1.3, g = phys.GRAV;
      return { vx: (hx - bx) / T, vy: (hy - by - 0.5 * g * T * T) / T };
    };
    const sink = async (bx, by, hx, hy) => {
      const v = shot(bx, by, hx, hy);
      return await h.evaluate(`window.__qa.setWind(0);window.__qa.setBall(${bx},${by});` +
        `window.__qa.setHoop(${hx},${hy});window.__qa.launch(${v.vx.toFixed(4)},${v.vy.toFixed(4)});` +
        `window.__qa.sim(2.2)`);
    };

    // 1) makeable shot → score up, net animation, combo 1, clean swish +3
    s = await sink(220, phys.H - 200, 520, 430);
    if (s.makes !== 1 || s.combo !== 1)
      return { pass: false, detail: `forced makeable shot did not score (makes=${s.makes}, lastEvent=${s.lastEvent})` };
    if (s.lastGain !== 3 || s.lastEvent !== 'swish')
      return { pass: false, detail: `dead-center shot expected swish +3, got ${s.lastEvent} +${s.lastGain}` };
    if (s.netAnimEver < 1)
      return { pass: false, detail: 'net animation never triggered on make' };
    if (s.score !== 3)
      return { pass: false, detail: `score=${s.score} after one swish, expected 3` };

    // 2) second consecutive make → combo extra +1 (3 + 1 = 4)
    s = await sink(220, phys.H - 200, 520, 430);
    if (s.combo !== 2 || s.lastGain !== 4)
      return { pass: false, detail: `combo=${s.combo} gain=${s.lastGain}, expected 2 / 4` };

    // 3) forced airball → combo resets, attempt counted
    s = await h.evaluate(`window.__qa.setWind(0);window.__qa.setBall(200,${phys.H - 200});` +
      `window.__qa.launch(150,-200);window.__qa.sim(3.0)`);
    if (s.combo !== 0 || s.lastEvent !== 'miss')
      return { pass: false, detail: `miss did not clear combo (combo=${s.combo}, lastEvent=${s.lastEvent})` };
    if (s.attempts !== 3)
      return { pass: false, detail: `attempts=${s.attempts}, expected 3` };
    if (!s.ball.live)
      return { pass: false, detail: 'ball did not respawn within 3s of leaving the screen' };

    // 4) wind is real: identical shots drift apart under +3 vs -3 wind
    s = await h.evaluate(`window.__qa.setWind(3);window.__qa.setBall(220,${phys.H - 200});` +
      `window.__qa.launch(500,-1100);window.__qa.sim(1.0)`);
    const driftR = s.ball.x;
    s = await h.evaluate(`window.__qa.setWind(-3);window.__qa.setBall(220,${phys.H - 200});` +
      `window.__qa.launch(500,-1100);window.__qa.sim(1.0)`);
    if (driftR - s.ball.x < 60)
      return { pass: false, detail: `wind drift not applied (+3: ${driftR}, -3: ${s.ball.x})` };

    // 5) full timed daily run → settlement with score/makes/rank; persistence keys
    s = await h.evaluate(`window.__qa.start('daily');window.__qa.sim(63)`);
    if (s.state !== 'OVER')
      return { pass: false, detail: `60s run did not end (state=${s.state}, timeLeft=${s.timeLeft})` };
    if (!s.rank || typeof s.makes !== 'number' || typeof s.score !== 'number')
      return { pass: false, detail: 'settlement missing score/makes/rank' };
    const keys = await h.evaluate(`Sound.setMuted(Sound.isMuted());` +
      `Object.keys(localStorage).filter(k=>k.indexOf('np_neon-hoops')===0).sort()`);
    const want = ['np_neon-hoops_best', 'np_neon-hoops_daily', 'np_neon-hoops_settings',
      'np_neon-hoops_stats', 'np_neon-hoops_streak', 'np_neon-hoops_top10', 'np_neon-hoops_weekly'];
    const missing = want.filter(k => !keys.includes(k));
    if (missing.length)
      return { pass: false, detail: 'missing storage keys: ' + missing.join(',') + ' (got ' + keys.join(',') + ')' };

    // 6) daily seed determinism: first 5 winds + hoop coords identical across reads
    const det = await h.evaluate(`(() => {
      const a = window.__qa.dailyPreview(), b = window.__qa.dailyPreview();
      return { same: JSON.stringify(a) === JSON.stringify(b), a: a };
    })()`);
    if (!det.same || !det.a || !Array.isArray(det.a.winds) || det.a.winds.length < 5)
      return { pass: false, detail: 'daily preview not deterministic' };
    if (!det.a.winds.every(w => w >= -3 && w <= 3))
      return { pass: false, detail: 'daily wind out of [-3,3]' };

    // 7) share card non-blank + link text
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

    // 8) in-page deterministic self-check (?autotest=1)
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
      detail: `swish +3 / combo +1 / miss resets verified; daily run rank=${s.rank}; ` +
        `daily seed deterministic (w[0]=${det.a.winds[0]}); autotest allPass; share card ok`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
