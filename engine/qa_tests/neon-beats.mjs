/* Per-game scripted playtest for neon-beats (design doc acceptance criteria).
 * Everything runs on the game's VIRTUAL song clock (__qa.sim / autoPlay / tapNote)
 * — never the real audio clock — so the whole daily track is "played" in
 * milliseconds. Verifies the LESSONS #9 gameplay red line end-to-end:
 *   - chart determinism (same day = same notes; neighbor day differs)
 *   - a full auto-played daily track scores 100% accuracy, grade S, panel up
 *   - every hit triggers the matching pitch (__qa freq log vs chart freq)
 *   - judging windows ±60/±130ms, points 300/150, combo mults 20/50
 *   - forced misses reset the combo and drop the final grade
 *   - persistence keys exactly match the design table; streak transitions
 *   - share card renders non-blank with the site link
 *   - ?autotest=1 in-page self-check passes
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

    // 1) chart determinism + structure band (design rule 2)
    const det = await h.evaluate(`(() => {
      const a = window.__qa.dailyPreview(), b = window.__qa.dailyPreview();
      const c = window.__qa.dailyPreview('2026-09-16');
      return { same: JSON.stringify(a) === JSON.stringify(b), diffNext: JSON.stringify(a) !== JSON.stringify(c),
               preview: a };
    })()`);
    if (!det.same) return { pass: false, detail: 'daily chart not deterministic across calls' };
    if (!det.diffNext) return { pass: false, detail: 'neighbor day chart identical (seed ignored)' };
    const p = det.preview;
    const today = await h.evaluate(`new Date().toISOString().slice(0,10)`);
    if (p.date !== today) return { pass: false, detail: `preview date ${p.date} != today ${today}` };
    if (p.notes.length < 96 || p.notes.length > 128)
      return { pass: false, detail: `note count ${p.notes.length} outside 96-128` };
    if (p.duration < 40 || p.duration > 60)
      return { pass: false, detail: `duration ${p.duration}s outside 40-60` };
    if (!(p.bpm >= 110 && p.bpm <= 140)) return { pass: false, detail: `bpm ${p.bpm} outside 110-140` };
    const lastT = [-9, -9, -9];
    for (const [t, midi, lane] of p.notes) {
      if (t - lastT[lane] < 0.25 - 1e-9) return { pass: false, detail: 'same lane inside 250ms window' };
      lastT[lane] = t;
    }

    // 2) full virtual perfect play of TODAY'S track -> 100% / S / settlement
    s = await h.evaluate(`window.__qa.start('daily')`);
    if (s.state !== 'PLAY' || s.mode !== 'daily')
      return { pass: false, detail: `state=${s.state} mode=${s.mode}, expected PLAY/daily` };
    if (s.track !== p.track) return { pass: false, detail: `track ${s.track} != preview ${p.track}` };
    s = await h.evaluate(`window.__qa.autoPlay()`);
    if (s.state !== 'OVER') return { pass: false, detail: `track never finished (state=${s.state}, t=${s.songTime}/${s.duration})` };
    if (s.acc !== 100 || s.grade !== 'S' || s.misses !== 0)
      return { pass: false, detail: `perfect play got acc=${s.acc} grade=${s.grade} misses=${s.misses}` };
    if (s.perfects !== s.notesTotal)
      return { pass: false, detail: `perfects ${s.perfects} != total ${s.notesTotal}` };
    if (s.score !== s.notesTotal * 300 && s.combo !== 0) {
      // score check: with combo mults x2/x3 the exact total depends on ladder; sanity bound only
      if (s.score < s.notesTotal * 300) return { pass: false, detail: `score ${s.score} below base sum` };
    }
    // audio QA: >=10 sampled hits each triggered the chart's own pitch
    if (s.freq.samples < 10 || s.freq.samples !== s.freq.match)
      return { pass: false, detail: `freq mismatch: ${s.freq.match}/${s.freq.samples} samples` };

    // 3) judging windows + points via injected taps (virtual clock)
    //    note[0] tapped at +59ms -> Perfect(+300), +100ms -> Good(+150), +140ms -> nothing
    let w = await h.evaluate(`window.__qa.start('practice', 20260915); window.__qa.tapNote(0, 0.059); window.__qaState()`);
    if (w.perfects !== 1 || w.score !== 300)
      return { pass: false, detail: `+59ms should be Perfect +300, got p=${w.perfects} score=${w.score}` };
    w = await h.evaluate(`window.__qa.start('practice', 20260915); window.__qa.tapNote(0, 0.1); window.__qaState()`);
    if (w.goods !== 1 || w.perfects !== 0 || w.score !== 150)
      return { pass: false, detail: `+100ms should be Good +150, got g=${w.goods} score=${w.score}` };
    w = await h.evaluate(`window.__qa.start('practice', 20260915); window.__qa.tapNote(0, 0.14); window.__qa.sim(1); window.__qaState()`);
    if (w.perfects !== 0 || w.goods !== 0 || w.misses < 1)
      return { pass: false, detail: `+140ms tap should be ignored and the note Missed (p=${w.perfects} g=${w.goods} m=${w.misses})` };
    // empty lane tap: visual only, no penalty
    w = await h.evaluate(`window.__qa.start('practice', 20260915); window.__qa.tap(1, -1.9); window.__qaState()`);
    if (w.misses !== 0 || w.score !== 0)
      return { pass: false, detail: 'empty tap wrongly penalized' };

    // 4) miss run: combo climbs, forced misses reset it, final grade drops
    s = await h.evaluate(`window.__qa.start('practice', 20260915); window.__qa.sim(6, 'perfect'); window.__qaState()`);
    const midCombo = s.combo;
    if (midCombo < 5) return { pass: false, detail: `combo ${midCombo} did not climb on hits` };
    s = await h.evaluate(`(() => {
      const need = Math.ceil(window.__qaState().notesTotal * 0.08) + 1; // enough misses to cross the S line
      let st, g = 0;
      do { st = window.__qa.sim(2, 'none'); g++; } while (st.state === 'PLAY' && st.misses < need && g < 200);
      return st;
    })()`);
    if (s.combo !== 0 || s.misses < 3)
      return { pass: false, detail: `forced misses: combo=${s.combo} misses=${s.misses} (expected reset + >=3)` };
    s = await h.evaluate(`window.__qa.autoPlay()`);
    if (s.acc >= 100 || s.grade === 'S')
      return { pass: false, detail: `grade did not drop after misses (acc=${s.acc} grade=${s.grade})` };

    // 5) persistence: exact designed key set after finished runs
    const keys = await h.evaluate(`Object.keys(localStorage).filter(k=>k.indexOf('np_neon-beats')===0).sort()`);
    const want = ['np_neon-beats_best', 'np_neon-beats_daily', 'np_neon-beats_settings',
      'np_neon-beats_stats', 'np_neon-beats_streak', 'np_neon-beats_top10', 'np_neon-beats_weekly'];
    const missing = want.filter(k => !keys.includes(k));
    if (missing.length) return { pass: false, detail: 'missing storage keys: ' + missing.join(',') };
    if (keys.length !== want.length) return { pass: false, detail: 'extra storage keys: ' + keys.join(',') };
    if (!s.dailyDone) return { pass: false, detail: 'daily stamp not marked after daily run' };

    // 6) streak transitions (yesterday +1 / 2-day gap mulligan / 3-day gap reset)
    const st = await h.evaluate(`(() => {
      const X = window.__qa.expose, K = 'np_neon-beats_streak';
      const today = X.NB.utcDate();
      const backup = X.lsGet(K, null);
      const set = v => { X.lsSet(K, v); X.loadStorage(); };
      set({ count: 3, last: X.dayShift(today, -1), best: 3, protect: 1, pmonth: today.slice(0, 7) });
      const inc = X.markDailyDone(today).count === 4;
      set({ count: 3, last: X.dayShift(today, -2), best: 3, protect: 1, pmonth: today.slice(0, 7) });
      const mull = X.markDailyDone(today);
      const mulligan = mull.count === 4 && mull.protect === 0;
      set({ count: 3, last: X.dayShift(today, -3), best: 3, protect: 1, pmonth: today.slice(0, 7) });
      const reset = X.markDailyDone(today).count === 1;
      if (backup !== null) X.lsSet(K, backup); else { try { localStorage.removeItem(K); } catch (e) {} }
      X.loadStorage();
      return { inc, mulligan, reset };
    })()`);
    if (!(st.inc && st.mulligan && st.reset))
      return { pass: false, detail: `streak transitions failed ${JSON.stringify(st)}` };

    // 7) numeric boundaries + combo mults (design acceptance #5)
    const nums = await h.evaluate(`(() => {
      const NB = window.NB;
      return {
        grade: NB.gradeFor(94.9) === 'A' && NB.gradeFor(95) === 'S',
        rank: NB.rankFor(94.9).key === 'platinum' && NB.rankFor(95).key === 'diamond',
        legend: NB.rankFor(99).key === 'legend', master: NB.rankFor(96).key === 'master',
        acc: NB.accuracy(949, 0, 1000) === 94.9 && NB.accuracy(950, 0, 1000) === 95,
        mult: NB.comboMult(19) === 1 && NB.comboMult(20) === 2 && NB.comboMult(49) === 2 && NB.comboMult(50) === 3,
        windows: NB.judgeDelta(0.06) === 'perfect' && NB.judgeDelta(0.061) === 'good' && NB.judgeDelta(0.131) === null,
      };
    })()`);
    const badNum = Object.entries(nums).filter(([, v]) => !v).map(([k]) => k);
    if (badNum.length) return { pass: false, detail: 'numeric checks failed: ' + badNum.join(',') };

    // 8) share card non-blank + link text
    const share = await h.evaluate(`(() => {
      window.__qa.start('practice', 20260915); window.__qa.autoPlay();
      const cv = window.__qa.buildShareCard();
      const x = cv.getContext('2d');
      const cols = new Set();
      for (let i = 0; i < 30; i++) {
        const p = x.getImageData((i * 37) % cv.width, (i * 91) % cv.height, 1, 1).data;
        cols.add(p[0] + ',' + p[1] + ',' + p[2]);
      }
      return { distinct: cols.size, text: window.__qa.shareText() };
    })()`);
    if (share.distinct < 5) return { pass: false, detail: 'share card looks blank (' + share.distinct + ' colors)' };
    if (!/seyrs1985\.github\.io\/neonplay/.test(share.text))
      return { pass: false, detail: 'share text missing site link' };

    // 9) in-page deterministic self-check (?autotest=1)
    await h.evaluate(`location.href = location.pathname + '?autotest=1'`);
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
      detail: `daily Track #${p.track} (${p.notes.length} notes, ${p.bpm} BPM) auto-played to 100%/S with ${s.freq.samples || 'N/A'} pitch-matched hits; ` +
        `windows/points/mults verified; miss-run grade=${s.grade} acc=${s.acc}%; 7 storage keys exact; streak+1/mulligan/reset ok; autotest allPass`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
