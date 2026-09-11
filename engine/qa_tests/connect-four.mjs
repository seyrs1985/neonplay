/* Per-game scripted playtest for connect-four (art/bugfix round).
 * Regression for the 2026-09-11 softlock: drop() flipped turns AND the board
 * click handler flipped again + scheduled a second AI timer, so the AI moved
 * twice per turn and cur stuck at 2 (player locked out after round 1).
 * Asserts: exactly one AI reply per human move, turn returns to player,
 * and a second round is possible.
 */
export default async function (h) {
  // generic poke may have pressed buttons — reload for a clean board
  await h.evaluate(`location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const n = await h.evaluate(`document.querySelectorAll('.hole').length`).catch(() => 0);
    if (n === 42) break;
  }

  // round 1: human center column
  await h.evaluate(`document.querySelector('.hole[data-c="3"]').click()`);
  await h.sleep(900);
  const s1 = await h.evaluate(`(() => ({
    p1: document.querySelectorAll('.disc.p1').length,
    p2: document.querySelectorAll('.disc.p2').length,
    cur: (typeof cur !== 'undefined') ? cur : -1,
    msg: document.getElementById('msg').textContent
  }))()`);
  if (s1.p1 !== 1 || s1.p2 !== 1)
    return { pass: false, detail: `round1 discs p1=${s1.p1} p2=${s1.p2} (expected 1/1 — double-move bug back?)` };
  if (s1.cur !== 1)
    return { pass: false, detail: `round1 turn did not return to player: cur=${s1.cur} msg="${s1.msg}"` };

  // round 2: proves no softlock
  await h.evaluate(`document.querySelector('.hole[data-c="2"]').click()`);
  await h.sleep(900);
  const s2 = await h.evaluate(`(() => ({
    p1: document.querySelectorAll('.disc.p1').length,
    p2: document.querySelectorAll('.disc.p2').length,
    cur: (typeof cur !== 'undefined') ? cur : -1
  }))()`);
  if (s2.p1 !== 2 || s2.p2 !== 2)
    return { pass: false, detail: `round2 discs p1=${s2.p1} p2=${s2.p2} (expected 2/2)` };
  if (s2.cur !== 1)
    return { pass: false, detail: `round2 turn stuck: cur=${s2.cur}` };

  return { pass: true, detail: `turn alternation OK over 2 rounds (one AI reply each), msg="${s1.msg.slice(0, 28)}"` };
}
