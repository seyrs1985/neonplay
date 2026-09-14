/* Per-game scripted playtest for neon-typing (design doc acceptance criteria).
 * Driven entirely through __qa-injected words/keys on the game's own clock —
 * never a human typing speed. Verifies the LESSONS #9 gameplay red line:
 *   - daily determinism: same UTC day = same word queue (across reloads too),
 *     neighbor day differs, seed format = "neon-typing:<UTC date>"
 *   - correct word -> score + combo chain, x2 multiplier at combo 5
 *   - wrong key -> error count + combo reset
 *   - combo window (2s) keeps a chain alive across a 1.8s sim gap
 *   - 60s run end -> settlement panel values: WPM = chars/5 / minutes (exact),
 *     accuracy = correct/keys, rank from the 7-tier ladder
 *   - inaction -> words breach the red line -> 3 lives -> game over "lives"
 *   - daily run stamps np_tp_daily + streak; storage keys exactly np_tp_*
 *   - REAL KeyboardEvent pipeline works (window keydown -> typed letter)
 *   - share text carries the site link; ?autotest=1 self-check passes
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

    // 1) daily determinism + word stream sanity
    const det = await h.evaluate(`(() => {
      const a = window.__qa.preview(), b = window.__qa.preview(), c = window.__qa.preview('2026-09-16');
      return { a: a.words, same: JSON.stringify(a) === JSON.stringify(b),
               diffNext: JSON.stringify(a) !== JSON.stringify(c), seed: a.seed };
    })()`);
    if (!det.same) return { pass: false, detail: 'daily queue not deterministic across calls' };
    if (!det.diffNext) return { pass: false, detail: 'neighbor day queue identical (seed ignored)' };
    const today = await h.evaluate(`new Date().toISOString().slice(0,10)`);
    if (det.seed !== 'neon-typing:' + today)
      return { pass: false, detail: `seed ${det.seed} != neon-typing:${today}` };
    if (det.a.length !== 24 || !det.a.every(w => /^[a-z]{3,9}$/.test(w)))
      return { pass: false, detail: 'preview words malformed: ' + det.a.slice(0, 4).join(',') };

    // 2) REAL keyboard event pipeline (window keydown -> game)
    s = await h.evaluate(`window.__qa.start('practice', 20260915)`);
    if (s.state !== 'PLAY') return { pass: false, detail: 'start(practice) state=' + s.state };
    s = await h.evaluate(`(() => {
      window.__probe = [];
      window.addEventListener('keydown', e => window.__probe.push('kd:' + e.code + ':' + e.key), true);
      const w0 = window.__qaState().onScreen[0];
      const before = window.__qaState().correct;
      window.__qa.key('Key' + w0[0].toUpperCase(), w0[0]);
      return { before, after: window.__qaState(), w0, probe: window.__probe };
    })()`);
    if (s.after.correct !== s.before + 1)
      return { pass: false, detail: `real keydown did not type (correct ${s.before}->${s.after.correct}) probe=${JSON.stringify(s.probe)} w0=${s.w0} state=${s.after.state} act=${s.after.active}` };

    // 3) scoring: chained words, combo ladder, x2 at combo 5
    const run = await h.evaluate(`(() => {
      let st = window.__qa.start('practice', 20260915);
      st = window.__qa.sim(6.5);              // 4 words on screen, none near the line
      const seq = [];
      const typeOldest = () => {
        const w = window.__qaState().onScreen[0];
        if (!w) return false;
        const a = window.__qa.type(w);
        seq.push({ len: w.length, combo: a.combo, mult: a.mult });
        return true;
      };
      for (let i = 0; i < 4; i++) typeOldest();   // rapid chain: no game time passes
      window.__qa.sim(1.8);                       // < 2s combo window -> chain survives
      let guard = 0;
      while (window.__qaState().combo < 5 && guard++ < 8) {
        if (!typeOldest()) window.__qa.sim(0.5);
      }
      const mid = window.__qaState();
      // wrong key: no active word, nothing on screen matches -> error + combo reset
      const bad = ['q', 'j', 'z', 'x']
        .find(c => !window.__qaState().onScreen.some(w => w[0] === c)) || 'q';
      const before = window.__qaState();
      const after = window.__qa.type(bad);
      return { seq, mid, before, after, bad };
    })()`);
    if (run.seq.length < 5 || run.mid.combo !== 5 || run.mid.mult !== 2)
      return { pass: false, detail: `combo ladder wrong: ${run.seq.length} words, combo=${run.mid.combo} mult=${run.mid.mult}` };
    const expScore = run.seq.reduce((t, w) => t + w.len * 10 * w.mult, 0);
    if (run.mid.score !== expScore)
      return { pass: false, detail: `score ${run.mid.score} != expected ${expScore}` };
    if (run.after.errors !== run.before.errors + 1 || run.after.combo !== 0)
      return { pass: false, detail: `wrong key: errors ${run.before.errors}->${run.after.errors}, combo=${run.after.combo}` };

    // 4) natural timeout -> settlement with EXACT WPM / accuracy / rank
    s = await h.evaluate(`window.__qa.finish()`);
    if (s.state !== 'OVER' || !s.result) return { pass: false, detail: 'finish() did not settle: ' + s.state };
    const expWpm = Math.round((s.correct / 5) / (s.played / 60));
    const expAcc = Math.round((s.correct / s.keys) * 100);
    if (s.result.wpm !== expWpm) return { pass: false, detail: `wpm ${s.result.wpm} != ${expWpm}` };
    if (s.result.acc !== expAcc) return { pass: false, detail: `acc ${s.result.acc} != ${expAcc}` };
    const rankOk = await h.evaluate(`window.__qa.rankFor(${expWpm}).key === ${JSON.stringify(s.result.rank)}`);
    if (!rankOk) return { pass: false, detail: `rank ${s.result.rank} inconsistent with wpm ${expWpm}` };

    // 5) inaction -> red-line breaches -> 3 lives -> OVER('lives')
    s = await h.evaluate(`window.__qa.start('practice', 20260916); window.__qa.sim(40)`);
    if (s.state !== 'OVER' || s.lives !== 0 || s.result.reason !== 'lives')
      return { pass: false, detail: `inaction run: state=${s.state} lives=${s.lives} reason=${s.result && s.result.reason}` };

    // 6) daily run stamps np_tp_daily + streak
    s = await h.evaluate(`(() => {
      window.__qa.start('daily');
      const w = window.__qaState().onScreen[0];
      window.__qa.type(w);
      return window.__qa.finish();
    })()`);
    if (!s.dailyDone) return { pass: false, detail: 'daily not stamped after daily run' };
    const dailyRec = await h.evaluate(`JSON.parse(localStorage.getItem('np_tp_daily')||'null')`);
    if (!dailyRec || dailyRec.date !== today) return { pass: false, detail: 'np_tp_daily record wrong: ' + JSON.stringify(dailyRec) };

    // 7) storage keys exactly np_tp_* set
    const keys = await h.evaluate(`Object.keys(localStorage).filter(k=>k.indexOf('np_tp_')===0).sort()`);
    const want = ['np_tp_best', 'np_tp_daily', 'np_tp_history', 'np_tp_settings', 'np_tp_streak'];
    const missing = want.filter(k => !keys.includes(k));
    if (missing.length) return { pass: false, detail: 'missing storage keys: ' + missing.join(',') };
    if (keys.length !== want.length) return { pass: false, detail: 'extra storage keys: ' + keys.join(',') };

    // 8) rank ladder + combo multiplier boundaries (pure functions)
    const nums = await h.evaluate(`(() => ({
      ranks: window.__qa.rankFor(0).key==='bronze' && window.__qa.rankFor(20).key==='silver' &&
             window.__qa.rankFor(35).key==='gold' && window.__qa.rankFor(50).key==='platinum' &&
             window.__qa.rankFor(70).key==='diamond' && window.__qa.rankFor(90).key==='master' &&
             window.__qa.rankFor(110).key==='legend',
      mult: [1,1,2,2,3,3].every((v,i)=>window.__qa.comboMult([0,4,5,11,12,99][i])===v),
    }))()`);
    if (!nums.ranks) return { pass: false, detail: 'rank ladder thresholds wrong' };
    if (!nums.mult) return { pass: false, detail: 'combo multiplier boundaries wrong' };

    // 9) streak transitions (yesterday +1 / 3-day gap reset)
    const st = await h.evaluate(`(() => {
      const X = window.__qa.expose, K = 'np_tp_streak';
      const backup = localStorage.getItem(K);
      const y = new Date(Date.now() - 86400000).toISOString().slice(0,10);
      const y3 = new Date(Date.now() - 3*86400000).toISOString().slice(0,10);
      localStorage.setItem(K, JSON.stringify({ count: 3, last: y, best: 3 }));
      X.loadStorage();
      const inc = window.__qa.markDaily(new Date().toISOString().slice(0,10)).count === 4;
      localStorage.setItem(K, JSON.stringify({ count: 3, last: y3, best: 3 }));
      X.loadStorage();
      const reset = window.__qa.markDaily(new Date().toISOString().slice(0,10)).count === 1;
      if (backup === null) localStorage.removeItem(K); else localStorage.setItem(K, backup);
      X.loadStorage();
      return { inc, reset };
    })()`);
    if (!(st.inc && st.reset)) return { pass: false, detail: `streak transitions failed ${JSON.stringify(st)}` };

    // 10) determinism across a real page reload
    const det2 = await h.evaluate(`location.reload()`)
      .then(() => null).catch(() => null);
    let again = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      again = await h.evaluate(`window.__qa ? window.__qa.preview().words : null`).catch(() => null);
      if (again) break;
    }
    if (!again || JSON.stringify(again) !== JSON.stringify(det.a))
      return { pass: false, detail: 'daily queue changed across reload (not deterministic)' };

    // 11) share text carries the site link
    const share = await h.evaluate(`window.__qa.shareText()`);
    if (!/seyrs1985\.github\.io\/neonplay/.test(share) || !/WPM/.test(share))
      return { pass: false, detail: 'share text missing link/wpm: ' + share.slice(0, 60) };

    // 12) in-page deterministic self-check (?autotest=1)
    await h.evaluate(`location.href = location.pathname + '?autotest=1'`);
    let auto = null;
    for (let i = 0; i < 40; i++) {
      await h.sleep(400);
      auto = await h.evaluate(`(window.__autotest || null)`).catch(() => null);
      if (auto) break;
    }
    if (!auto) return { pass: false, detail: '?autotest=1 never exposed window.__autotest' };
    const fails = Object.keys(auto).filter(k => k !== 'allPass' && auto[k] === false);
    if (fails.length || auto.allPass !== true) {
      const dbg = await h.evaluate(`JSON.stringify(window.__autotestDbg||{})`).catch(() => '{}');
      return { pass: false, detail: 'autotest failed: ' + fails.join(',') + ' dbg=' + String(dbg).slice(0, 400) };
    }

    return {
      pass: true,
      detail: `daily queue deterministic (seed ${det.seed}); real-key pipeline ok; ${run.seq.length}-word chain -> combo x${run.mid.mult}, score ${run.mid.score} exact; ` +
        `wrong-key reset ok; timeout settle wpm=${s.result ? s.result.wpm : '?'}/acc exact; lives-over + daily stamp + 5 storage keys + streak ok; autotest allPass`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
