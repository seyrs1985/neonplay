/* Per-game scripted playtest for rooftop-rush (design acceptance criteria §8).
 * Verifies the LESSONS #9 gameplay red line with the GAME_STANDARD hooks:
 *  - daily Track of the Day is deterministic (two builds identical, next day differs)
 *  - every generated obstacle sits inside the CHUNKS data + physics envelope
 *    (gap <= band-min * airtime * 0.95, walls <= 118, spikes <= half air distance)
 *  - the auto-jump policy runs the daily route to the finish with 0 deaths,
 *    distance monotonically increasing, +500 finish bonus applied
 *  - not jumping kills (fall) and auto-restarts within ~1s
 *  - persistence keys (np_rooftop-rush_*) all written, share card non-blank
 *  - ?autotest=1 in-page self-check passes */
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
    if (!phys || !phys.G || phys.G !== 2200 || phys.JUMPV !== 780 || phys.VMAX !== 420)
      return { pass: false, detail: 'bad __PHYS constants: ' + JSON.stringify(phys) };

    // 1) Track of the Day determinism (same date twice identical, next day differs)
    const det = await h.evaluate(`(() => {
      const a = window.__qa.route('2026-09-15'), b = window.__qa.route('2026-09-15');
      const c = window.__qa.route('2026-09-16');
      return { same: JSON.stringify(a.roofs) === JSON.stringify(b.roofs) && JSON.stringify(a.chunkIds) === JSON.stringify(b.chunkIds),
               nextDiffers: JSON.stringify(a.chunkIds) !== JSON.stringify(c.chunkIds),
               a, c };
    })()`);
    if (!det.same) return { pass: false, detail: 'daily route not deterministic for 2026-09-15' };
    if (!det.nextDiffers) return { pass: false, detail: 'next day route identical (seed not date-driven)' };
    if (det.a.chunks !== 14) return { pass: false, detail: `daily route has ${det.a.chunks} chunks, expected 14` };

    // 2) reachability envelope (acceptance #3) — inside CHUNKS data + physics bounds
    if (det.a.envelope.length)
      return { pass: false, detail: 'envelope violations 09-15: ' + JSON.stringify(det.a.envelope.slice(0, 3)) };
    if (det.c.envelope.length)
      return { pass: false, detail: 'envelope violations 09-16: ' + JSON.stringify(det.c.envelope.slice(0, 3)) };
    const envCheck = await h.evaluate(`(() => {
      const P = window.__PHYS, RR2 = window.RR;
      const r = window.__qa.route('2026-09-15');
      let worst = { margin: 1e9 };
      for (const roof of r.roofs) {
        const def = RR2.CHUNK_BY_ID[roof.chunk];
        if (!def) continue;
        const cap = def.band[0] * P.AIR_T * 0.95;
        const margin = cap - roof.gapAfter;
        if (margin < worst.margin) worst = { margin: Math.round(margin), gap: roof.gapAfter, cap: Math.round(cap), chunk: roof.chunk };
        if (roof.wallH > 118) return { ok: false, why: 'wall ' + roof.wallH };
        if (roof.spikeW > (RR2.speedAt(roof.x) * P.AIR_T) * 0.5) return { ok: false, why: 'spike ' + roof.spikeW };
      }
      return { ok: true, worst };
    })()`);
    if (!envCheck.ok) return { pass: false, detail: 'envelope: ' + envCheck.why };
    if (envCheck.worst.margin < -0.5)
      return { pass: false, detail: `gap over band envelope: ${JSON.stringify(envCheck.worst)}` };

    // 3) autoJump plays the daily route: first 3 chunks without dying, distance grows
    s = await h.evaluate(`window.__qa.start('daily','2026-09-15')`);
    if (s.state !== 'PLAY' || s.mode !== 'daily' || s.routeDate !== '2026-09-15')
      return { pass: false, detail: `start(daily) gave state=${s.state} mode=${s.mode}` };
    await h.evaluate(`window.__qa.autoJump(true)`);
    let sawDeath = false, prevX = -1, monotone = true, maxMeters = 0;
    for (let step = 0; step < 40; step++) {
      s = await h.evaluate(`window.__qa.sim(1)`);
      maxMeters = Math.max(maxMeters, s.meters);
      if (s.state === 'DEAD' || s.deadCause) sawDeath = true;
      if (prevX > 0 && s.x < prevX - 700) monotone = monotone && s.state === 'PLAY'; // respawn reset is fine
      prevX = s.x;
      if (s.state === 'FINISH') break;
    }
    if (sawDeath) return { pass: false, detail: `auto-jump died on the daily route (${s.deadCause} at x=${s.x})` };
    if (s.state !== 'FINISH' || !s.finished)
      return { pass: false, detail: `daily route not finished in 40s sim (state=${s.state}, x=${s.x}, finishX=${s.finishX})` };
    if (s.score !== s.meters + 500)
      return { pass: false, detail: `finish bonus wrong: score=${s.score} meters=${s.meters}` };
    if (s.finishTime < 20 || s.finishTime > 50)
      return { pass: false, detail: `finish time ${s.finishTime}s outside 20-50s` };
    if (maxMeters < 500) return { pass: false, detail: 'distance never grew past 500m' };
    if (!monotone) return { pass: false, detail: 'distance went backwards mid-run' };

    // 4) no-jump death + 1s auto-restart (design acceptance #6)
    s = await h.evaluate(`window.__qa.start('classic'); window.__qa.autoJump(false); window.__qa.sim(2.6)`);
    const died = s.state === 'DEAD' || s.deaths >= 1;
    if (!died) return { pass: false, detail: `refusing to jump did not kill (state=${s.state} x=${s.x} grounded=${s.grounded})` };
    s = await h.evaluate(`window.__qa.sim(1.3)`);
    if (s.state !== 'PLAY' || s.deaths < 1)
      return { pass: false, detail: `no 1s auto-restart after death (state=${s.state} deaths=${s.deaths})` };

    // 5) persistence keys (design §3 storage table)
    const keys = await h.evaluate(`(() => { const out = [];
      for (let i = 0; i < localStorage.length; i++) out.push(localStorage.key(i)); return out; })()`);
    const want = ['np_rooftop-rush_best', 'np_rooftop-rush_daily', 'np_rooftop-rush_stats',
                  'np_rooftop-rush_streak', 'np_rooftop-rush_top10', 'np_rooftop-rush_weekly'];
    const missing = want.filter(k => !keys.includes(k));
    if (missing.length)
      return { pass: false, detail: 'missing storage keys: ' + missing.join(',') + ' (got ' + keys.filter(k => k.indexOf('rooftop') >= 0).join(',') + ')' };

    // 6) share card non-blank + site link
    const share = await h.evaluate(`(() => {
      const cv = window.__qa.buildShareCard();
      const x = cv.getContext('2d');
      const cols = new Set();
      for (let i = 0; i < 30; i++) {
        const d = x.getImageData((i * 37) % cv.width, (i * 91) % cv.height, 1, 1).data;
        cols.add(d[0] + ',' + d[1] + ',' + d[2]);
      }
      return { distinct: cols.size, text: window.__qa.shareText() };
    })()`);
    if (share.distinct < 5) return { pass: false, detail: 'share card looks blank (' + share.distinct + ' colors)' };
    if (!/seyrs1985\.github\.io\/neonplay\/rooftop-rush\//.test(share.text))
      return { pass: false, detail: 'share text missing site link' };

    // 7) in-page deterministic self-check (?autotest=1)
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
      detail: `daily 14-chunk route deterministic + envelope-clean (tightest gap margin ${envCheck.worst.margin}px); ` +
        `autoJump finished the route (meters ${maxMeters}, +500 bonus verified); death->restart <1.3s; ` +
        `6 storage keys present; share card ok; autotest allPass`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
