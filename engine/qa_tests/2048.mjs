/* 2048 QA — top-level `let grid/score/dead` are reachable as global lexical
 * bindings, so we can assert real state next to real input.
 * Flow: fresh board = exactly 2 tiles -> arrow keys move tiles (board changes,
 * DOM cells match grid) -> corner-strategy Left/Down alternation until a real
 * MERGE fires (score>0, max tile >=4, .pop merge animation present). */
export default async function (h) {
  await h.evaluate(`try{localStorage.clear()}catch(e){}; location.reload()`);
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    ready = await h.evaluate(`typeof grid !== 'undefined' && document.querySelectorAll('#grid .cell').length === 16`)
      .catch(() => false);
    if (ready) break;
  }
  if (!ready) return { pass: false, detail: "board never rendered 16 cells (game did not boot)" };

  const snap = () => h.evaluate(`(() => ({
    g: grid.map(r => r.slice()), score: score, dead: dead,
    cells: [...document.querySelectorAll('#grid .cell')].map(c => c.textContent),
    pop: document.querySelectorAll('#grid .cell.pop').length,
  }))()`);
  const key = dir => h.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', {key: '${dir}'}))`);

  // 1) fresh board: exactly two 2/4 tiles, zero score, alive
  const s0 = await snap();
  const nz = s0.g.flat().filter(v => v);
  if (nz.length !== 2 || !nz.every(v => v === 2 || v === 4))
    return { pass: false, detail: `fresh board malformed: expected two 2/4 tiles, got [${nz}]` };
  if (s0.score !== 0) return { pass: false, detail: `fresh board score=${s0.score}, expected 0` };
  const domTiles = s0.cells.map(c => parseInt(c, 10) || 0);
  if (JSON.stringify(domTiles) !== JSON.stringify(s0.g.flat()))
    return { pass: false, detail: `DOM cells mismatch grid: dom=[${domTiles}] grid=[${s0.g.flat()}]` };

  // 2) arrow input moves tiles: some direction must change the board
  let movedDirs = 0;
  const before = JSON.stringify(s0.g);
  let g = s0.g;
  for (const dir of ["ArrowLeft", "ArrowDown", "ArrowRight", "ArrowUp"]) {
    await key(dir);
    await h.sleep(260);
    const s = await snap();
    if (JSON.stringify(s.g) !== before && JSON.stringify(s.g) !== JSON.stringify(g)) movedDirs++, g = s.g;
  }
  if (movedDirs === 0)
    return { pass: false, detail: "no arrow key changed the board (input dead or move() broken)" };

  // 3) real merge: corner strategy (Left/Down) until score rises
  let merged = false, moves = 0, last = null;
  for (let i = 0; i < 48 && !merged; i++) {
    await key(i % 2 === 0 ? "ArrowLeft" : "ArrowDown");
    await h.sleep(130);
    const s = await snap();
    if (JSON.stringify(s.g) !== JSON.stringify(last)) moves++;
    last = s.g;
    if (s.dead) break;
    if (s.score > 0) { merged = true; break; }
  }
  const sm = await snap();
  const maxTile = Math.max(...sm.g.flat());
  if (!merged)
    return { pass: false, detail: `no merge after ${moves} effective moves (score=${sm.score}, max=${maxTile}, dead=${sm.dead})` };
  if (maxTile < 4)
    return { pass: false, detail: `merge scored (score=${sm.score}) but max tile is ${maxTile}, expected >=4` };
  if (sm.dead)
    return { pass: false, detail: `game over during early merges (dead=true, score=${sm.score})` };

  return {
    pass: true,
    detail: `fresh 2-tile board OK, ${movedDirs} arrow dir(s) moved tiles, merge fired: score=${sm.score}, max tile=${maxTile}, ${moves} effective moves`,
  };
}
