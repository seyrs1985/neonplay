/* Per-game scripted playtest for neon-stack (design acceptance criteria).
 * Verifies the LESSONS #9 gameplay red line with the GAME_STANDARD hooks:
 *  - ?autotest=1 in-page suite: 7-bag coverage, daily-seed determinism,
 *    exact 1/2/3/4-line scoring, level curve, Sprint-40 finish, top-out
 *  - rotation/move safety invariant on jagged terrain (kicks never produce
 *    out-of-bounds or overlapping cells)
 *  - daily mode deterministic across a real page reload
 *  - end-state panel becomes visible once the loop unfreezes
 *  - gesture smoke: synthetic pointer drag/tap changes __qaState */
export default async function (h) {
  try {
    await h.evaluate(`location.reload()`);
    let s = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      s = await h.evaluate(`(window.__qaState ? window.__qaState() : null)`).catch(() => null);
      if (s) break;
    }
    if (!s) return { pass: false, detail: 'no __qaState hook (GAME_STANDARD violation)' };

    // 1) in-page deterministic self-check (?autotest=1)
    await h.evaluate(`location.href = location.pathname + '?autotest=1'`);
    let auto = null;
    for (let i = 0; i < 40; i++) {
      await h.sleep(400);
      auto = await h.evaluate(`(window.__autotest || null)`).catch(() => null);
      if (auto) break;
    }
    if (!auto) return { pass: false, detail: '?autotest=1 never exposed window.__autotest' };
    const fails = Object.keys(auto).filter(k => k !== 'allPass' && auto[k] !== true);
    if (fails.length || auto.allPass !== true)
      return { pass: false, detail: 'autotest failed: ' + fails.map(k => k + '=' + JSON.stringify(auto[k])).join(', ') };

    // 2) end-state panel appears once the loop unfreezes (finish/over event drained)
    await h.sleep(700);
    const panelShown = await h.evaluate(
      `!document.getElementById('panel').classList.contains('hide')`);
    if (!panelShown) return { pass: false, detail: 'end-state panel never became visible after autotest' };

    // 3) rotation/move safety invariant on jagged terrain
    await h.evaluate(`location.href = location.pathname`);
    let ready = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      ready = await h.evaluate(`(window.STACK ? true : null)`).catch(() => null);
      if (ready) break;
    }
    if (!ready) return { pass: false, detail: 'STACK API missing after reload' };
    const safe = await h.evaluate(`(() => {
      STACK.start('marathon', 11);
      const st = STACK.st();
      for (let x = 0; x < 10; x++) {
        const hgt = 4 + (x % 3) * 3;
        for (let y = 19; y > 19 - hgt; y--) st.board[y][x] = 'J';
      }
      const rng = STACK.mulberry32(11);
      let rots = 0, moves = 0, ok = true;
      for (let i = 0; i < 200 && st.state === 'PLAY'; i++) {
        const r = rng();
        if (r < 0.4) { if (STACK.rotate(rng() < 0.5 ? 1 : -1)) rots++; }
        else if (r < 0.8) { if (STACK.move(rng() < 0.5 ? -1 : 1)) moves++; }
        else STACK.softDrop();
        const pc = st.piece;
        if (pc) {
          for (const off of STACK.SHAPES[pc.type][pc.rot]) {
            const x = pc.x + off[0], y = pc.y + off[1];
            if (x < 0 || x >= 10 || y >= 20 || (y >= 0 && st.board[y][x])) ok = false;
          }
        }
      }
      // wall-adjacent rotation must still be possible and legal
      st.piece = { type: 'L', rot: 0, x: 0, y: 4 };
      const rotWall = STACK.rotate(1);
      if (rotWall) {
        for (const off of STACK.SHAPES.L[st.piece.rot]) {
          const x = st.piece.x + off[0];
          if (x < 0 || x >= 10) ok = false;
        }
      }
      return { ok, rots, moves, rotWall, state: st.state };
    })()`);
    if (!safe.ok) return { pass: false, detail: 'piece left bounds / overlapped terrain during 200 seeded ops' };
    if (safe.rots < 20 || safe.moves < 20) return { pass: false, detail: `too few successful ops: rots=${safe.rots} moves=${safe.moves}` };
    if (!safe.rotWall) return { pass: false, detail: 'rotation impossible even with kicks at wall' };

    // 4) daily mode deterministic across a real reload
    const before = await h.evaluate(`(() => {
      STACK.start('daily');
      const out = [];
      for (let i = 0; i < 8 && window.__qaState().state === 'PLAY'; i++) {
        out.push(STACK.st().next); STACK.hardDrop(); STACK.tick(0.26);
      }
      return out.join('');
    })()`);
    if (before.length < 8) return { pass: false, detail: 'daily stream shorter than 8 pieces' };
    await h.evaluate(`location.reload()`);
    let s2 = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      s2 = await h.evaluate(`(window.STACK ? true : null)`).catch(() => null);
      if (s2) break;
    }
    if (!s2) return { pass: false, detail: 'page did not reload' };
    const after = await h.evaluate(`(() => {
      STACK.start('daily');
      const out = [];
      for (let i = 0; i < 8 && window.__qaState().state === 'PLAY'; i++) {
        out.push(STACK.st().next); STACK.hardDrop(); STACK.tick(0.26);
      }
      return out.join('');
    })()`);
    if (before !== after) return { pass: false, detail: `daily stream differs across reloads: ${before} vs ${after}` };

    // 5) gesture smoke: synthetic pointer drag + tap must move/rotate the piece
    const g1 = await h.evaluate(`window.__qaState().piece`);
    await h.evaluate(`(() => {
      const cv = document.getElementById('cv');
      const r = cv.getBoundingClientRect();
      const opts = { bubbles: true, cancelable: true, pointerId: 7,
                     clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      cv.dispatchEvent(new PointerEvent('pointerdown', opts));
      for (let i = 1; i <= 4; i++) {
        cv.dispatchEvent(new PointerEvent('pointermove',
          Object.assign({}, opts, { clientX: opts.clientX + i * 40 })));
      }
      cv.dispatchEvent(new PointerEvent('pointerup', opts));
    })()`);
    const g2 = await h.evaluate(`window.__qaState().piece`);
    if (!g1 || !g2) return { pass: false, detail: 'piece missing before/after gesture' };
    if (g2.x === g1.x && g2.rot === g1.rot)
      return { pass: false, detail: `gesture produced no state change (x ${g1.x}->${g2.x}, rot ${g1.rot}->${g2.rot})` };

    return {
      pass: true,
      detail: `autotest allPass (7-bag/scoring/level/sprint/topout/persist); ` +
        `terrain invariant clean (rots=${safe.rots} moves=${safe.moves}); ` +
        `daily stream stable across reload (${before.slice(0, 8)}); end panel shown; gestures move pieces`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
