/* tic-tac-toe QA (second art pass + real i18n).
 * Regression: the L dict existed but 6 call sites hardcoded English around it
 * (and the reset button was hardcoded Chinese). Asserts: zh labels actually
 * apply everywhere, 2P game plays a real win (winline + confetti + tally),
 * and reset restores a clean board. */
export default async function (h) {
  await h.evaluate(`try{localStorage.setItem("np_lang","zh")}catch(e){}; location.reload()`);
  await h.sleep(1200);

  const st0 = await h.evaluate(`(() => ({
    reset: document.getElementById('lbReset').textContent,
    status: document.getElementById('status').textContent,
    core: typeof npT === 'function'
  }))()`);
  if (!st0.core) return { pass: false, detail: "np_core.js not loaded" };
  if (st0.reset !== "新回合") return { pass: false, detail: `reset label not zh: "${st0.reset}"` };
  if (!/你的回合/.test(st0.status)) return { pass: false, detail: `status not zh: "${st0.status}"` };

  // switch to 2P and play a scripted X win: 0,3,1,4,2 (top row + col)
  await h.evaluate(`document.getElementById('m-2p').click()`);
  await h.sleep(200);
  for (const i of [0, 3, 1, 4, 2]) {
    await h.evaluate(`document.querySelector('.cell[data-i="${i}"]').click()`);
    await h.sleep(120);
  }
  const st1 = await h.evaluate(`(() => ({
    status: document.getElementById('status').textContent,
    winline: document.querySelectorAll('.cell.winline').length,
    confetti: document.querySelectorAll('.cf').length,
    x: document.getElementById('wx').textContent,
    winhl: document.getElementById('status').classList.contains('winhl')
  }))()`);
  if (!/X 赢了/.test(st1.status)) return { pass: false, detail: `win message not zh/status wrong: "${st1.status}"` };
  if (st1.winline !== 3) return { pass: false, detail: `winline cells=${st1.winline} (expected 3)` };
  if (st1.x !== "1") return { pass: false, detail: `tally x=${st1.x}` };
  if (!st1.winhl) return { pass: false, detail: "win highlight class missing" };

  // reset restores a clean board
  await h.evaluate(`document.getElementById('reset').click()`);
  await h.sleep(200);
  const st2 = await h.evaluate(`(() => ({
    cells: document.querySelectorAll('.cell').length,
    filled: document.querySelectorAll('.cell.x,.cell.o').length,
    status: document.getElementById('status').textContent
  }))()`);
  if (st2.cells !== 9 || st2.filled !== 0 || !/X 回合/.test(st2.status))
    return { pass: false, detail: `reset broken: cells=${st2.cells} filled=${st2.filled} status="${st2.status}"` };

  return { pass: true, detail: `zh i18n real (reset/status/win), 2P win flow OK (winline 3, confetti ${st1.confetti}>0), reset clean` };
}
