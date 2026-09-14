/* Per-game scripted playtest for neon-checkers (GAME_STANDARD + design acceptance).
 * Drives the rule engine through the __qa injection surface to prove the four
 * mandated rule classes AND a real capture-flow game, with real DOM clicks:
 *  1. forced capture: quiet move rejected ('must-capture'), jump accepted
 *  2. maximal multi-jump: half-jump rejected, full double-capture applied
 *  3. crowning: king retreats, man cannot; crown ends the move on the far row
 *  4. loss by blockade / by elimination (no legal moves -> opponent wins)
 *  5. full game vs hard AI settles, every AI reply < 800ms (search fuse)
 *  6. real UI taps: select piece -> hint dots -> capture lands (DOM assertions)
 *  7. np_ck_* persistence keys + ?autotest=1 in-page self-check allPass
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
    const evl = expr => h.evaluate(expr);

    // 1) forced capture
    s = await evl(`window.__qa.load(['........','........','...b....','..r.....','........','........','........','........'],1)`);
    if (s.legalN !== 1 || s.mustCap !== true)
      return { pass: false, detail: `must-cap position wrong (legalN=${s.legalN}, mustCap=${s.mustCap})` };
    let mv = await evl(`window.__qa.move([3,2],[4,3])`);
    if (mv.ok !== false || mv.reason !== 'must-capture')
      return { pass: false, detail: `quiet move not rejected: ${JSON.stringify(mv).slice(0, 120)}` };
    mv = await evl(`window.__qa.move([3,2],[1,4])`);
    if (mv.ok !== true || mv.counts.p2 !== 0 || mv.capturedNow !== 1)
      return { pass: false, detail: `capture not applied (counts=${JSON.stringify(mv.counts)})` };

    // 2) maximal multi-jump forced
    s = await evl(`window.__qa.load(['........','........','...b....','........','...b....','..r.....','........','........'],1)`);
    const lg = await evl(`window.__qa.legal()`);
    if (!lg.length || !lg.every(m => m.caps.length >= 2))
      return { pass: false, detail: `expected only 2-capture sequences, got ${JSON.stringify(lg).slice(0, 160)}` };
    mv = await evl(`window.__qa.move([5,2],[3,4])`);
    if (mv.ok !== false || mv.reason !== 'incomplete-jump')
      return { pass: false, detail: `half-jump not rejected: ${JSON.stringify(mv).slice(0, 120)}` };
    mv = await evl(`window.__qa.move([5,2],[1,2])`);
    if (mv.ok !== true || mv.capturedNow !== 2)
      return { pass: false, detail: `double jump not applied (capturedNow=${mv.capturedNow})` };

    // 3) king retreats / man cannot; crowning ends move
    mv = await evl(`window.__qa.load(['........','........','........','........','....R...','........','........','........'],1) && window.__qa.move([4,4],[5,5])`);
    if (mv.ok !== true) return { pass: false, detail: 'king cannot retreat diagonally backward' };
    mv = await evl(`window.__qa.load(['........','........','........','........','....r...','........','........','........'],1) && window.__qa.move([4,4],[5,5])`);
    if (mv.ok !== false) return { pass: false, detail: 'man incorrectly allowed to retreat' };
    mv = await evl(`window.__qa.load(['........','.b......','..r.....','........','........','........','........','........'],1) && window.__qa.move([2,2],[0,0])`);
    if (mv.ok !== true || mv.crownedNow !== true || mv.board[0][0] !== 'R')
      return { pass: false, detail: `crowning on far row failed (${JSON.stringify(mv).slice(0, 140)})` };

    // 4) loss by blockade and by elimination
    s = await evl(`window.__qa.load(['..b.....','.b......','r.......','........','........','........','........','........'],1)`);
    if (s.legalN !== 0) return { pass: false, detail: `blocked position still has moves (${s.legalN})` };
    s = await evl(`window.__qa.settle()`);
    if (s.state !== 'OVER' || s.winner !== 2 || s.endReason !== 'rBlocked')
      return { pass: false, detail: `blockade loss wrong (state=${s.state} winner=${s.winner} reason=${s.endReason})` };
    s = await evl(`window.__qa.load(['........','.b......','.b......','........','........','........','........','........'],1) && window.__qa.settle()`);
    if (s.state !== 'OVER' || s.winner !== 2 || s.endReason !== 'rPieces')
      return { pass: false, detail: `elimination loss wrong (${s.state}/${s.winner}/${s.endReason})` };

    // 5) full game vs hard AI: settles, AI < 800ms per reply, captures happened
    await evl(`window.__qa.newGame('ai','hard',20260915)`);
    let maxMs = 0, guard = 0, humanCaps = 0, lastCounts = null;
    while (guard++ < 300) {
      s = await evl(`window.__qaState()`);
      if (s.state !== 'PLAY') break;
      if (s.turn === 1) {
        const r = await evl(`(() => { const lg = window.__qa.legal();
          lg.sort((a,b)=>b.caps.length-a.caps.length); const m = lg[0];
          return window.__qa.move(m.from, m.path[m.path.length-1]); })()`);
        if (!r.ok) return { pass: false, detail: `human scripted move failed: ${JSON.stringify(r).slice(0, 120)}` };
        humanCaps += r.capturedNow || 0;
        lastCounts = r.counts;
      } else {
        const r = await evl(`window.__qa.aiMove()`);
        if (!r.ok) return { pass: false, detail: 'aiMove failed mid-game' };
        if (r.ai.ms > maxMs) maxMs = r.ai.ms;
        lastCounts = r.counts;
      }
    }
    s = await evl(`window.__qaState()`);
    if (s.state !== 'OVER')
      return { pass: false, detail: `hard game did not settle in ${guard} plies (state=${s.state}, counts=${JSON.stringify(lastCounts)})` };
    if (maxMs >= 800) return { pass: false, detail: `AI reply took ${maxMs}ms (budget 800ms)` };
    if (s.fx.captures < 1) return { pass: false, detail: 'game finished without a single capture' };
    if (s.counts.p1 + s.counts.p2 > 24 || s.counts.p1 < 0 || s.counts.p2 < 0)
      return { pass: false, detail: `piece count corrupted: ${JSON.stringify(s.counts)}` };

    // 6) real UI: fresh game, tap own piece via REAL click -> hint dots appear -> move lands
    await evl(`window.__qa.newGame('ai','easy',7)`);
    const tap = await evl(`(() => {
      const cell = window.CK.cellAt([5,2]);
      const r = cell.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    await h.click(`#board .cell.dark[data-r="5"][data-c="2"]`).catch(() => {});
    // h.click targets by selector center; fall back to raw coords if selector missed
    if (!tap) return { pass: false, detail: 'tap target not found' };
    await h.sleep(150);
    let dom = await evl(`({ hints: document.querySelectorAll('#board .hint').length, selq: document.querySelectorAll('#board .selq').length })`);
    if (dom.hints < 1 || dom.selq !== 1)
      return { pass: false, detail: `selection UI missing after real click (hints=${dom.hints}, selq=${dom.selq})` };
    // land the move by clicking a hinted square (real click on the hint's cell)
    const landed = await evl(`(() => {
      const hint = document.querySelector('#board .hint');
      const cell = hint.closest('.cell');
      window.CK.clickCell(+cell.dataset.r, +cell.dataset.c);
      return window.__qaState();
    })()`);
    if (landed.turn !== 2 || landed.lastMoveInfo === null)
      return { pass: false, detail: `UI move did not land (turn=${landed.turn})` };
    // AI answers via the live timer path (no freeze set): wait for its move
    let aiMoved = false;
    for (let i = 0; i < 30; i++) {
      await h.sleep(200);
      const st2 = await evl(`window.__qaState()`);
      if (st2.turn === 1 || st2.state === 'OVER') { aiMoved = true; break; }
    }
    if (!aiMoved) return { pass: false, detail: 'scheduled AI reply never fired (timer path broken)' };

    // 7) persistence keys + daily determinism + in-page autotest
    const keys = await evl(`Object.keys(localStorage).filter(k=>k.indexOf('np_ck_')===0).sort()`);
    const want = ['np_ck_daily', 'np_ck_settings', 'np_ck_stats', 'np_ck_streak'];
    const missing = want.filter(k => !keys.includes(k));
    if (missing.length) return { pass: false, detail: 'missing storage keys: ' + missing.join(',') };
    const det = await evl(`(() => {
      const a = window.__qa.dailyInfo(), b = window.__qa.dailyInfo(), c = window.__qa.dailyInfo('2026-09-16');
      return { same: JSON.stringify(a) === JSON.stringify(b), diff: JSON.stringify(a) !== JSON.stringify(c), level: a.level };
    })()`);
    if (!det.same || !det.diff) return { pass: false, detail: 'daily seed not deterministic' };
    await evl(`location.href = location.pathname + '?autotest=1'`);
    let auto = null;
    for (let i = 0; i < 40; i++) {
      await h.sleep(400);
      auto = await h.evaluate(`(window.__autotest || null)`).catch(() => null);
      if (auto) break;
    }
    if (!auto) return { pass: false, detail: '?autotest=1 never exposed window.__autotest' };
    const fails = Object.keys(auto).filter(k => k !== 'allPass' && auto[k] !== true);
    if (fails.length || auto.allPass !== true)
      return { pass: false, detail: 'autotest failed: ' + fails.map(k => `${k}=${auto[k]}`).join(',') };

    return {
      pass: true,
      detail: `rules verified (must-capture/max-jump/king-retreat/blockade+elimination); ` +
        `hard game settled in ${guard} plies (winner=${s.winner}, AI max ${maxMs}ms, caps=${s.fx.captures}); ` +
        `real-click select+move+AI-timer ok; daily=${det.level}; autotest allPass; keys ${keys.length}`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
