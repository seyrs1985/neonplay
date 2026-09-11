/* Per-game scripted playtest for neon-pop (initial deployment round).
 * Uses the GAME_STANDARD testability hooks: window.__qaState() must report a
 * fresh PLAY board, a synthesized PointerEvent tap on a real ≥2 group must
 * remove blocks and raise the score, and the board must stay compacted.
 */
export default async function (h) {
  await h.evaluate(`location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const s = await h.evaluate(`(window.__qaState ? window.__qaState() : null)`)
      .catch(() => null);
    if (s && s.state === 'PLAY') break;
  }
  const fresh = await h.evaluate(`(window.__qaState ? window.__qaState() : null)`)
    .catch(() => null);
  if (!fresh) return { pass: false, detail: 'no __qaState hook (GAME_STANDARD violation)' };
  if (fresh.state !== 'PLAY') return { pass: false, detail: `state=${fresh.state}, expected PLAY` };
  if (fresh.blocks !== 100) return { pass: false, detail: `fresh board has ${fresh.blocks} blocks, expected 100` };

  // find a real >=2 group from the live game state, tap its first cell center
  const cell = await h.evaluate(`(() => {
    const seen = new Set();
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
      const k = r * 10 + c;
      if (G.grid[r][c] < 0 || seen.has(k)) continue;
      const st = [[r, c]], out = [];
      while (st.length) {
        const [a, b] = st.pop(); out.push([a, b]);
        for (const [x, y] of [[a-1,b],[a+1,b],[a,b-1],[a,b+1]])
          if (x >= 0 && x < 10 && y >= 0 && y < 10 && G.grid[x][y] === G.grid[r][c] && !seen.has(x*10+y)) {
            seen.add(x*10+y); st.push([x, y]);
          }
      }
      if (out.length >= 2) return { r: out[0][0], c: out[0][1], n: out.length };
    }
    return null;
  })()`);
  if (!cell) return { pass: false, detail: 'no >=2 group on a fresh board (impossible)' };

  const tap = await h.evaluate(`(() => {
    const cv = document.getElementById('c');
    const rect = cv.getBoundingClientRect();
    const s = Math.min(rect.width / 720, rect.height / 1280);
    const ox = (rect.width - 720 * s) / 2, oy = (rect.height - 1280 * s) / 2;
    const x = rect.left + ox + (40 + ${cell.c} * 64 + 32) * s;
    const y = rect.top + oy + (320 + ${cell.r} * 64 + 32) * s;
    cv.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y
    }));
    return true;
  })()`);
  if (!tap) return { pass: false, detail: 'pointer dispatch failed' };
  await h.sleep(500);

  const after = await h.evaluate(`window.__qaState()`);
  if (after.blocks !== fresh.blocks - cell.n)
    return { pass: false, detail: `tap removed ${fresh.blocks - after.blocks} blocks, expected ${cell.n}` };
  if (after.score <= 0)
    return { pass: false, detail: `score did not increase after a valid pop (score=${after.score})` };
  if (after.state !== 'PLAY' && after.state !== 'OVER')
    return { pass: false, detail: `unexpected state after pop: ${after.state}` };
  return { pass: true, detail: `popped ${cell.n} blocks, score=${after.score}, state=${after.state}` };
}
