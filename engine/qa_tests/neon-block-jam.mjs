/* Per-game scripted playtest for neon-block-jam.
 * White-box smoke: reset to level 1, physically drag the block onto its gate
 * via real browser input, assert the CLEAR! panel appears with correct moves.
 * This exact flow shipped broken on 2026-09-11 (exit crash + win never fired).
 */
export default async function (h) {
  await h.evaluate(`(() => {
    try { localStorage.removeItem("np_nbj_progress"); } catch (e) {}
    if (typeof loadLevel !== "function") throw new Error("loadLevel missing");
    loadLevel(0);
  })()`);
  await h.sleep(250);
  await h.drag(".blk", 210, 0, 4); // slide the block right onto its gate (3 cells @70px grid)
  await h.sleep(550);              // vanish animation + postVanish
  const r = await h.evaluate(`(() => {
    const winShown = document.getElementById("win").style.display === "flex";
    return {
      winShown,
      moves: document.getElementById("mv").textContent,
      stars: document.getElementById("wstars").textContent,
      left: (typeof blocks !== "undefined") ? blocks.length : -1,
    };
  })()`);
  const pass = r.winShown === true && r.left === 0 && r.moves === "1";
  return { pass, detail: `moves=${r.moves} win=${r.winShown} stars=${r.stars} left=${r.left}` };
}
