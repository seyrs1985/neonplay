/* Per-game scripted playtest for bubble-storm (design doc acceptance criteria).
 * Drives the real engine through the GAME_STANDARD hooks:
 *  - __qa.testVectors(): doc T1/T2/T3 (incl. the six-way offset-row trap)
 *  - injected bubble colors/positions -> real __qa.shoot() triple pop + collapse x20
 *  - 6 dry shots push a row; pushing past the death line settles with reason 'line'
 *  - 40-shot terminal; daily board determinism cross-checked against a
 *    node-computed mulberry32(20260915) reference vector
 *  - retention keys, share card, i18n, then the in-page ?autotest=1 suite. */
export default async function (h) {
  try {
    await h.evaluate(`try{localStorage.clear()}catch(e){}; location.reload()`);
    let s = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      s = await h.evaluate(`(window.__qaState ? window.__qaState() : null)`).catch(() => null);
      if (s) break;
    }
    if (!s) return { pass: false, detail: 'no __qaState hook (GAME_STANDARD violation)' };

    const phys = await h.evaluate(`window.__PHYS`);
    if (!phys || !phys.D || !phys.ROWH) return { pass: false, detail: 'no window.__PHYS constants' };

    // 1) design-doc test vectors T1/T2/T3 + offset trap (algorithm red line)
    const tv = await h.evaluate(`window.__qa.testVectors()`);
    const vecFail = ['T1', 'T2', 'T3'].filter(k => !tv[k] || !tv[k].pass);
    if (vecFail.length || !tv.offsetTrap)
      return { pass: false, detail: 'grid vectors failed: ' + vecFail.join(',') + ' trap=' + tv.offsetTrap + ' ' + JSON.stringify(tv) };

    // 2) REAL physics shot: inject a two-color board, straight shot pops exactly 5
    s = await h.evaluate(`window.__qa.start('classic');
      window.__qa.loadRows([[0,0,0,0,1,1,1,1],[-1,-1,-1,-1,-1,-1,-1]],0);
      window.__qa.setBall(0); window.__qa.shoot(-90)`);
    if (s.state !== 'PLAY' || s.pops !== 5 || s.score !== 50)
      return { pass: false, detail: `physical shot: state=${s.state} pops=${s.pops} score=${s.score} (want PLAY/5/50)` };

    // 3) collapse: pop the support bubble -> floating cluster drops, x20 at raised mult
    //    pop 3 x10 = 30, mult 1->1.3, drop 3 x20 x1.3 = 78, total 108
    s = await h.evaluate(`window.__qa.start('classic');
      window.__qa.loadRows([[2,-1,-1,5,-1,-1,-1,-1],[2,-1,-1,-1,-1,-1,-1],[1,1,1,-1,-1,-1,-1,-1]],0);
      window.__qa.setBall(2); window.__qa.landShot(1,1)`);
    if (s.lastPop !== 3 || s.drops !== 3 || s.score !== 108 || s.mult !== 1.3)
      return { pass: false, detail: `collapse: pop=${s.lastPop} drop=${s.drops} score=${s.score} mult=${s.mult} (want 3/3/108/1.3)` };
    if (s.bestDrop !== 3) return { pass: false, detail: 'bestDrop not tracked (' + s.bestDrop + ')' };

    // 4) combo window expiry resets the multiplier
    s = await h.evaluate(`window.__qa.sim(3.2)`);
    if (s.mult !== 1) return { pass: false, detail: `combo window: mult=${s.mult} after 3.2s, want 1` };

    // 5) six non-popping shots push exactly one row
    s = await h.evaluate(`window.__qa.start('classic');
      window.__qa.loadRows([[0,1,0,1,0,1,0,1]],0);
      [[1,0],[1,1],[1,2],[1,3],[1,4],[1,5]].forEach(([r,c],i)=>{
        window.__qa.setBall(i%2?3:4); window.__qa.landShot(r,c); });
      window.__qaState()`);
    if (s.pushed !== 1 || s.rows !== 3 || s.state !== 'PLAY')
      return { pass: false, detail: `push: pushed=${s.pushed} rows=${s.rows} state=${s.state} (want 1/3/PLAY — 1 base + 1 landed row + 1 push)` };

    // 6) push into the death line -> settlement with reason 'line'
    let over = false;
    for (let i = 0; i < 30 && !over; i++) over = await h.evaluate(`window.__qa.push().state === 'OVER'`);
    s = await h.evaluate(`window.__qaState()`);
    if (!over || s.state !== 'OVER' || s.reason !== 'line')
      return { pass: false, detail: `death: state=${s.state} reason=${s.reason}` };
    if (typeof s.score !== 'number' || !s.rank || typeof s.pops !== 'number' || typeof s.drops !== 'number')
      return { pass: false, detail: 'settlement missing score/pops/drops/rank' };

    // 7) retention keys from the classic settle
    let keys = await h.evaluate(`Object.keys(localStorage).filter(k=>k.indexOf('np_bubble-storm')===0).sort()`);
    let want = ['np_bubble-storm_best', 'np_bubble-storm_stats', 'np_bubble-storm_top10', 'np_bubble-storm_weekly'];
    let missing = want.filter(k => !keys.includes(k));
    if (missing.length) return { pass: false, detail: 'missing keys after classic: ' + missing.join(',') };

    // 8) 40th shot terminal in daily mode -> daily + streak keys too
    s = await h.evaluate(`window.__qa.start('daily');
      window.__qa.loadRows([[0,1,0,1,0,1,0,1],[-1,-1,-1,-1,-1,-1,-1]],0);
      window.__qa.setShots(39); window.__qa.setBall(4); window.__qa.landShot(1,3)`);
    if (s.state !== 'OVER' || s.reason !== 'shots' || s.shotsUsed !== 40)
      return { pass: false, detail: `shots terminal: state=${s.state} reason=${s.reason} used=${s.shotsUsed}` };
    keys = await h.evaluate(`Object.keys(localStorage).filter(k=>k.indexOf('np_bubble-storm')===0).sort()`);
    want = ['np_bubble-storm_best', 'np_bubble-storm_daily', 'np_bubble-storm_stats',
      'np_bubble-storm_streak', 'np_bubble-storm_top10', 'np_bubble-storm_weekly'];
    missing = want.filter(k => !keys.includes(k));
    if (missing.length) return { pass: false, detail: 'missing retention keys: ' + missing.join(',') + ' (got ' + keys.join(',') + ')' };

    // 9) daily determinism: same date twice in-page, plus cross-check against the
    //    independently node-computed mulberry32(20260915) reference board
    const REF_20260915 = '1,2,0,1,1,0,2,0,1,1,4,1,1,2,3,3';
    const det = await h.evaluate(`(() => {
      const a = window.__qa.dailyPreview(20260915), b = window.__qa.dailyPreview(20260915);
      return { same: JSON.stringify(a) === JSON.stringify(b), head: a.cells.slice(0,16).join(',') };
    })()`);
    if (!det.same || det.head !== REF_20260915)
      return { pass: false, detail: `daily board not deterministic/cross-match: ${det.head} vs ${REF_20260915}` };
    const boards = await h.evaluate(`(() => {
      window.__qa.start('daily');
      const g1 = window.__qa.grid().rows.map(r=>r.join(',')).join('|');
      window.__qa.start('daily');
      const g2 = window.__qa.grid().rows.map(r=>r.join(',')).join('|');
      return { same: g1 === g2, rows: g1.split('|').length };
    })()`);
    if (!boards.same || boards.rows !== 6)
      return { pass: false, detail: 'two daily starts differ or rows != 6' };

    // 10) share card non-blank + share text carries the site link
    const share = await h.evaluate(`(() => {
      const cv = window.__qa.buildShareCard();
      const x = cv.getContext('2d');
      const cols = new Set();
      for (let i = 0; i < 30; i++) {
        const p = x.getImageData((i*37)%cv.width, (i*91)%cv.height, 1, 1).data;
        cols.add(p[0]+','+p[1]+','+p[2]);
      }
      return { distinct: cols.size, text: window.__qa.shareText() };
    })()`);
    if (share.distinct < 5) return { pass: false, detail: 'share card looks blank (' + share.distinct + ' colors)' };
    if (!/seyrs1985\.github\.io\/neonplay/.test(share.text))
      return { pass: false, detail: 'share text missing site link' };

    // 11) i18n wired to np_lang (site switcher key)
    await h.evaluate(`try{localStorage.setItem('np_lang','zh')}catch(e){}`);
    await h.evaluate(`location.reload()`);
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      s = await h.evaluate(`(window.__qaState ? window.__qaState() : null)`).catch(() => null);
      if (s) break;
    }
    if (!s || s.lang !== 'zh')
      return { pass: false, detail: 'np_lang=zh not reflected (__qaState.lang=' + (s && s.lang) + ')' };
    await h.evaluate(`try{localStorage.setItem('np_lang','en')}catch(e){}`);

    // 12) in-page deterministic self-check (?autotest=1)
    await h.evaluate(`location.href = location.pathname + '?autotest=1&seed=20260915'`);
    let auto = null;
    for (let i = 0; i < 40; i++) {
      await h.sleep(400);
      auto = await h.evaluate(`(window.__autotest || null)`).catch(() => null);
      if (auto) break;
    }
    if (!auto) return { pass: false, detail: '?autotest=1 never exposed window.__autotest' };
    const fails = Object.keys(auto).filter(k => k !== 'allPass' && auto[k] !== true);
    if (fails.length || auto.allPass !== true)
      return { pass: false, detail: 'autotest failed: ' + fails.join(',') };

    return {
      pass: true,
      detail: `vectors T1/T2/T3+trap ok; physical shot popped 5; collapse 3x10+3x20x1.3=108; ` +
        `push/death/40-shot terminals ok; daily board matches node reference (${det.head.slice(0, 8)}...); ` +
        `6 retention keys; share card ok; autotest allPass`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
