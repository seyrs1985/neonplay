/* sudoku QA — acceptance: seeded daily board is deterministic (same grid on
 * reload), clues admit exactly ONE solution (counting solver), auto-solving
 * fires the win panel and stamps the day, free mode is a separate board. */
export default async function (h) {
  await h.evaluate(`try{localStorage.removeItem("np_sd_cache")}catch(e){}; location.reload()`);
  for (let i = 0; i < 25; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`typeof __qaState === 'function'`).catch(() => false);
    if (ok) break;
  }
  const s0 = await st();
  if (s0.mode !== "daily" || s0.filled < 20)
    return { pass: false, detail: `daily board not ready: mode=${s0.mode} filled=${s0.filled}` };

  // determinism: reload → identical givens
  const g1 = JSON.stringify(s0.givens);
  await h.evaluate(`location.reload()`);
  await h.sleep(1500);
  const s1 = await st();
  if (JSON.stringify(s1.givens) !== g1)
    return { pass: false, detail: `daily board differs across reloads` };

  // uniqueness: counting solver must find exactly 1 solution for the clues
  const unique = await h.evaluate(`__qa.solverCount()`);
  if (unique !== 1) return { pass: false, detail: `clues admit ${unique} solutions (expected 1)` };

  // auto-solve → win panel + daily stamp
  await h.evaluate(`__qa.autoSolve()`);
  await h.sleep(400);
  const winSt = await h.evaluate(`(() => ({
    shown: !document.getElementById('win').classList.contains('hide'),
    stamp: localStorage.getItem('np_sd_daily_done')
  }))()`);
  if (!winSt.shown) return { pass: false, detail: "win panel did not appear after autoSolve" };
  if (!winSt.stamp) return { pass: false, detail: `daily stamp missing` };

  // free mode: switching tabs yields a different (non-daily) board
  await h.evaluate(`document.getElementById('tab-free').click()`);
  await h.sleep(1200);
  const s2 = await st();
  if (s2.mode !== "free" || JSON.stringify(s2.givens) === g1)
    return { pass: false, detail: `free mode did not produce a distinct board` };

  return { pass: true, detail: `daily deterministic, clues unique (1 solution), autoSolve → panel + stamp ${winSt.stamp}, free mode separate board` };

  function st() { return h.evaluate(`__qaState()`); }
}
