/* Per-game scripted playtest for neon-pop (deployment round).
 * Uses the GAME_STANDARD testability hooks: poll window.__qaState() from any
 * state, start the run from TITLE if needed, then a synthesized PointerEvent
 * tap on a real >=2 group must remove exactly those blocks and raise score.
 */
export default async function (h) {
  await h.evaluate(`location.reload()`);
  // poll until the page is back and the hook answers in ANY state
  let s = null;
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    s = await h.evaluate(`(window.__qaState ? window.__qaState() : null)`).catch(() => null);
    if (s) break;
  }
  if (!s) return { pass: false, detail: 'no __qaState hook (GAME_STANDARD violation)' };

  // generic poke may leave us anywhere; from TITLE one tap starts the run
  if (s.state === 'TITLE') {
    await h.evaluate(`(() => {
      const cv = document.getElementById('c');
      const r = cv.getBoundingClientRect();
      cv.dispatchEvent(new PointerEvent('pointerdown', {
        bubbles: true, cancelable: true, pointerId: 1,
        clientX: r.left + r.width / 2, clientY: r.top + r.height / 2
      }));
      return true;
    })()`);
    await h.sleep(500);
    s = await h.evaluate(`window.__qaState()`);
  }
  if (s.state !== 'PLAY') return { pass: false, detail: `state=${s.state}, expected PLAY` };
  if (s.blocks !== 100) return { pass: false, detail: `fresh board has ${s.blocks} blocks, expected 100` };

  // find a real >=2 group from the live game state, tap its first cell center
  const cell = await h.evaluate(`(() => {
    const seen = new Set();
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
      const k = r * 10 + c;
      if (G.grid[r][c] < 0 || seen.has(k)) continue;
      seen.add(k);                       // seed the start cell (else it's counted twice)
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
    const sc = Math.min(rect.width / 720, rect.height / 1280);
    const ox = (rect.width - 720 * sc) / 2, oy = (rect.height - 1280 * sc) / 2;
    const x = rect.left + ox + (40 + ${cell.c} * 64 + 32) * sc;
    const y = rect.top + oy + (320 + ${cell.r} * 64 + 32) * sc;
    cv.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 1, clientX: x, clientY: y
    }));
    return true;
  })()`);
  if (!tap) return { pass: false, detail: 'pointer dispatch failed' };
  await h.sleep(500);

  const after = await h.evaluate(`window.__qaState()`);
  if (after.blocks !== s.blocks - cell.n)
    return { pass: false, detail: `tap removed ${s.blocks - after.blocks} blocks, expected ${cell.n}` };
  if (after.score <= 0)
    return { pass: false, detail: `score did not increase after a valid pop (score=${after.score})` };
  if (after.state !== 'PLAY' && after.state !== 'OVER')
    return { pass: false, detail: `unexpected state after pop: ${after.state}` };
  return { pass: true, detail: `popped ${cell.n} blocks, score=${after.score}, state=${after.state}` };
}
