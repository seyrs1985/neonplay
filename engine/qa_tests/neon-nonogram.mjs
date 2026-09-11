/* neon-nonogram QA — design doc acceptance red lines:
 * clues derived from the bitmap are correct; a wrong filled cell flashes red
 * on check and does NOT count as complete; solving the Heart bitmap by
 * clicking every solution cell (with a mis-tap corrected first) fires the
 * PICTURE UNLOCKED panel and unlocks ❤️ in the gallery; daily stamps. */
export default async function (h) {
  await h.evaluate(`try{localStorage.removeItem("np_nn_save")}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`typeof __qaState === 'function'`).catch(() => false);
    if (ok) break;
  }
  const st = () => h.evaluate(`__qaState()`);
  const fill = async (i) => { await h.evaluate(`__qa.click(${i})`); await h.sleep(60); };

  // switch to library board 6 = Heart (❤️, index 5)
  await h.evaluate(`document.getElementById('tab-lib').click()`);
  await h.evaluate(`__qa.setDay ? null : null`); // no-op guard
  await h.evaluate(`(function(){ window.__qaSetBoardN = function(n){}; })()`);
  // start puzzle n=6 (1-based) via state: mode lib starts puzzle 0; cycle to 6 via tabs is complex — use direct check on puzzle 6 by clicking through gallery isn't available, so emulate: __qa has no board switch; instead reload with day offset so DAILY board = Heart? dayIndex%12==5
  // simplest: the game starts in lib mode on puzzle 1 (Bell). We test the HEART bitmap via daily mode with day offset:
  // dayIndex now D, daily board = D%12. Choose offset so (D+n)%12 == 5.
  const off = await h.evaluate(`(function(){var d=Math.floor(Date.now()/86400000);return (5 - (d%12) + 12) % 12;})()`);
  await h.evaluate(`__qa.setDay(${off}); document.getElementById('tab-daily').click();`);
  await h.sleep(400);
  const sBoard = await st();
  if (sBoard.board !== 6) return { pass: false, detail: `daily board is not Heart (got n=${sBoard.board})` };

  // mis-tap an empty cell then correct it (three-state: fill -> cross -> clear)
  const emptyCell = 0; // (0,0) is '.' in Heart bitmap
  await fill(emptyCell);                 // becomes FILL (wrong)
  const wrongState = (await st()).grid[0];
  await fill(emptyCell); await fill(emptyCell); // -> cross -> clear
  if ((await st()).grid[0] !== 0) return { pass: false, detail: "three-state cycle broken" };
  if (wrongState !== 1) return { pass: false, detail: "first tap did not fill" };

  // check with incomplete board must NOT unlock
  await h.evaluate(`__qa.check()`);
  await h.sleep(200);
  const notYet = await h.evaluate(`document.getElementById('unlock').classList.contains('hide')`);
  if (!notYet) return { pass: false, detail: "check passed an incomplete board" };

  // fill all Heart solution cells
  const heart = [[1,0],[1,1],[1,2],[1,3],[1,4],[2,0],[2,1],[2,2],[2,3],[2,4],[3,1],[3,2],[3,3],[0,1],[0,3],[4,1]];
  for (const [r, c] of [[1,0],[2,0],[1,1],[2,1],[1,2],[2,2],[1,3],[2,3],[1,4],[2,4],[3,1],[3,2],[3,3],[0,1],[0,3],[4,2]]) {
    await fill(r * 5 + c);
  }
  await h.evaluate(`__qa.check()`);
  await h.sleep(500);
  const winSt = await h.evaluate(`(() => ({
    shown: !document.getElementById('unlock').classList.contains('hide'),
    solved: __qaState().solved,
    stamp: __qaState().dailyDone
  }))()`);
  if (!winSt.shown) return { pass: false, detail: "PICTURE UNLOCKED panel did not appear" };
  if (winSt.solved.indexOf(6) < 0) return { pass: false, detail: `gallery did not unlock #6: ${JSON.stringify(winSt.solved)}` };
  if (!winSt.stamp) return { pass: false, detail: `daily stamp missing: "${winSt.stamp}"` };

  return { pass: true, detail: `Heart solved via clicks (16 cells), panel shown, gallery ❤️ unlocked, daily stamped ${winSt.stamp}` };
}
