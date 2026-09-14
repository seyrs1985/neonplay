/* Per-game scripted playtest for neon-othello (GAME_STANDARD + design acceptance).
 * Drives the Reversi rule engine through the __qa injection surface to prove the
 * mandated rule classes AND a real flip-flow game, with real DOM clicks:
 *  1. ray flips: playing (3,3) flips exactly 3 discs across 3 directions
 *  2. illegal moves rejected ('no-flip' empty square, 'occupied' square)
 *  3. forced pass: stuck side auto-passes; both stuck -> game over by disc count
 *  4. full board -> game over by disc count
 *  5. corner-weight AI: hard takes the 1-flip corner over a 2-flip move; easy is greedy
 *  6. full game vs hard AI settles, every AI reply < 800ms (search fuse)
 *  7. real UI taps: hint dot click -> disc lands + flips -> scheduled AI replies
 *  8. np_ot_* persistence keys + ?autotest=1 in-page self-check allPass
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

    // 1+2) rays and rejections on the 3-ray position
    s = await evl(`window.__qa.load(['........','.b.b....','..ww....','.bw.....','........','........','........','........'],1)`);
    const m33 = s.legal.find(m => m.r === 3 && m.c === 3);
    if (!m33 || m33.n !== 3)
      return { pass: false, detail: `(3,3) should flip 3, got ${JSON.stringify(m33)}` };
    let mv = await evl(`window.__qa.move([5,5])`);
    if (mv.ok !== false || mv.reason !== 'no-flip')
      return { pass: false, detail: `no-flip move not rejected: ${JSON.stringify(mv).slice(0, 120)}` };
    mv = await evl(`window.__qa.move([2,2])`);
    if (mv.ok !== false || mv.reason !== 'occupied')
      return { pass: false, detail: `occupied move not rejected: ${JSON.stringify(mv).slice(0, 120)}` };
    mv = await evl(`window.__qa.move([3,3])`);
    if (mv.ok !== true || mv.flippedNow !== 3 || mv.counts.p1 !== 7 || mv.counts.p2 !== 0)
      return { pass: false, detail: `3-ray flip not applied (${mv.flippedNow}, counts=${JSON.stringify(mv.counts)})` };
    if (mv.board[2][3] !== 'b' || mv.board[3][2] !== 'b' || mv.board[2][2] !== 'b' || mv.board[3][3] !== 'b')
      return { pass: false, detail: `flipped cells wrong board: ${JSON.stringify(mv.board.slice(0, 4))}` };

    // initial position sanity: 4 legal, wipeout ends game
    s = await evl(`window.__qa.newGame('ai','medium')`);
    if (s.legalN !== 4 || s.counts.p1 !== 2 || s.counts.p2 !== 2)
      return { pass: false, detail: `initial position wrong (${s.legalN} legal, ${JSON.stringify(s.counts)})` };

    // 3) forced pass then double-pass endgame
    s = await evl(`window.__qa.load(['.b.bbbbb','.wwbbbbb','wbbbbbbb','wbbbbbbb','wbbbbbbb','wbbbbbbb','wbbbbbbb','wbbbbbbb'],2,{mode:'2p'})`);
    if (s.legalN !== 0) return { pass: false, detail: `pink should be stuck (${s.legalN} moves)` };
    s = await evl(`window.__qa.settle()`);
    if (s.state !== 'PLAY' || s.turn !== 1 || s.passCount !== 1)
      return { pass: false, detail: `auto-pass wrong (state=${s.state} turn=${s.turn} passes=${s.passCount})` };
    s = await evl(`window.__qa.load(['.bbbbbbb','.bbbbbbb','wbbbbbbb','wbbbbbbb','wbbbbbbb','wbbbbbbb','wbbbbbbb','wbbbbbbb'],1,{mode:'2p'}) && window.__qa.settle()`);
    if (s.state !== 'OVER' || s.winner !== 1 || s.endReason !== 'rNoMoves' || s.counts.p1 !== 56 || s.counts.p2 !== 6)
      return { pass: false, detail: `double-pass end wrong (${s.state}/${s.winner}/${s.endReason} ${JSON.stringify(s.counts)})` };

    // 4) full board ends by count
    s = await evl(`window.__qa.load(['bwbwbwbw','wbwbwbwb','bwbwbwbw','wbwbwbwb','bwbwbwbw','wbwbwbwb','bwbwbwbw','wbwbwbwb'],1,{mode:'2p'}) && window.__qa.settle()`);
    if (s.state !== 'OVER' || s.endReason !== 'rFull' || s.counts.p1 + s.counts.p2 !== 64)
      return { pass: false, detail: `full-board end wrong (${s.state}/${s.endReason})` };

    // 5) corner-weight behavior: hard prefers corner (1 flip) over 2-flip move; easy greedy
    const CORN = `['........','bw......','w.b.....','...b....','........','........','........','........']`;
    s = await evl(`window.__qa.load(${CORN},2,{mode:'ai',level:'hard'})`);
    if (s.legalN !== 2 || !s.legal.some(m => m.r === 0 && m.c === 0 && m.n === 1) || !s.legal.some(m => m.r === 4 && m.c === 4 && m.n === 2))
      return { pass: false, detail: `corner-test position wrong: ${JSON.stringify(s.legal)}` };
    mv = await evl(`window.__qa.aiMove()`);
    if (mv.ok !== true || !mv.lastMoveInfo || mv.lastMoveInfo.r !== 0 || mv.lastMoveInfo.c !== 0)
      return { pass: false, detail: `hard AI did not take corner: ${JSON.stringify(mv.lastMoveInfo)}` };
    mv = await evl(`window.__qa.load(${CORN},2,{mode:'ai',level:'easy'}) && window.__qa.aiMove()`);
    if (mv.ok !== true || !mv.lastMoveInfo || mv.lastMoveInfo.flipped !== 2)
      return { pass: false, detail: `easy AI not greedy: ${JSON.stringify(mv.lastMoveInfo)}` };

    // 6) full game vs hard AI: settles, AI < 800ms per reply, flips happened
    await evl(`window.__qa.newGame('ai','hard',20260915)`);
    let maxMs = 0, guard = 0, lastCounts = null;
    while (guard++ < 200) {
      s = await evl(`window.__qaState()`);
      if (s.state !== 'PLAY') break;
      if (s.turn === 1) {
        const r = await evl(`(() => { const lg = window.__qa.legal();
          lg.sort((a,b)=>b.flips.length-a.flips.length); const m = lg[0];
          return window.__qa.move([m.r, m.c]); })()`);
        if (!r.ok) return { pass: false, detail: `human scripted move failed: ${JSON.stringify(r).slice(0, 120)}` };
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
    if (s.counts.p1 + s.counts.p2 !== 64) return { pass: false, detail: `disc count corrupted: ${JSON.stringify(s.counts)}` };
    if (maxMs >= 800) return { pass: false, detail: `AI reply took ${maxMs}ms (budget 800ms)` };
    if (s.fx.flips < 20) return { pass: false, detail: `suspiciously few flips (${s.fx.flips})` };

    // 7) real UI: fresh game, REAL click on a hinted cell -> disc lands -> AI replies via timer
    await evl(`window.__qa.newGame('ai','easy',7)`);
    let dom = await evl(`({ hints: document.querySelectorAll('#board .hint').length,
      pieces: document.querySelectorAll('#board .piece').length })`);
    if (dom.hints !== 4 || dom.pieces !== 4)
      return { pass: false, detail: `initial UI wrong (hints=${dom.hints}, pieces=${dom.pieces})` };
    await h.click(`#board .cell[data-r="2"][data-c="3"]`);
    // sample immediately: the human move lands synchronously with the pointerup,
    // while the scheduled AI reply needs >=360ms — no race window this way
    const landed = await evl(`window.__qaState()`);
    if (landed.turn !== 2 || !landed.lastMoveInfo || landed.lastMoveInfo.r !== 2 || landed.lastMoveInfo.c !== 3)
      return { pass: false, detail: `UI click did not land (turn=${landed.turn}, last=${JSON.stringify(landed.lastMoveInfo)})` };
    const flipDom = await evl(`(() => { const p = window.OT.cellAt([3,3]).querySelector('.piece');
      return { flippedClass: p ? p.className : null, pieces: document.querySelectorAll('#board .piece').length }; })()`);
    if (!flipDom.flippedClass || flipDom.flippedClass.indexOf('d1') < 0 || flipDom.pieces !== 5)
      return { pass: false, detail: `flip animation state wrong: ${JSON.stringify(flipDom)}` };
    let aiMoved = false;
    for (let i = 0; i < 30; i++) {
      await h.sleep(200);
      const st2 = await evl(`window.__qaState()`);
      if (st2.turn === 1 || st2.state === 'OVER') { aiMoved = true; break; }
    }
    if (!aiMoved) return { pass: false, detail: 'scheduled AI reply never fired (timer path broken)' };

    // 8) persistence keys + daily determinism + in-page autotest
    const keys = await evl(`Object.keys(localStorage).filter(k=>k.indexOf('np_ot_')===0).sort()`);
    const want = ['np_ot_daily', 'np_ot_rank', 'np_ot_settings', 'np_ot_stats'];
    const missing = want.filter(k => !keys.includes(k));
    if (missing.length) return { pass: false, detail: 'missing storage keys: ' + missing.join(',') };
    const det = await evl(`(() => {
      const a = window.__qa.dailyInfo(), b = window.__qa.dailyInfo(), c = window.__qa.dailyInfo('2026-09-16');
      return { same: JSON.stringify(a) === JSON.stringify(b), diff: JSON.stringify(a) !== JSON.stringify(c), level: a.level, open: a.open.length };
    })()`);
    if (!det.same || !det.diff || det.open !== 4) return { pass: false, detail: 'daily seed not deterministic' };
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
      detail: `rules verified (3-ray flips/no-flip+occupied rejection/auto-pass/double-pass+full-board ends); ` +
        `corner-weight AI ok; hard game settled in ${guard} plies (winner=${s.winner}, AI max ${maxMs}ms, flips=${s.fx.flips}); ` +
        `real-click move+flip+AI-timer ok; daily=${det.level}; autotest allPass; keys ${keys.length}`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
