/* Per-game scripted playtest for neon-worms (design acceptance criteria).
 * Verifies the LESSONS #9 gameplay red line with the GAME_STANDARD hooks:
 *  - ?autotest=1 in-page suite: seeded layout determinism, bot population,
 *    orb growth, boost burn, AI-dies-on-body kill + food burst,
 *    player-dies-on-body OVER + persistence, leaderboard order, rank ladder
 *  - daily layout deterministic across a real page reload
 *  - steering input changes the player heading (mouse + joystick events) */
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
    if (s.bots < 30) return { pass: false, detail: `bot population too low at boot: ${s.bots}` };

    // 1) in-page deterministic self-check (?autotest=1)
    await h.evaluate(`location.href = location.pathname + '?autotest=1'`);
    let auto = null;
    for (let i = 0; i < 60; i++) {
      await h.sleep(400);
      auto = await h.evaluate(`(window.__autotest || null)`).catch(() => null);
      if (auto) break;
    }
    if (!auto) return { pass: false, detail: '?autotest=1 never exposed window.__autotest' };
    const fails = Object.keys(auto).filter(k => k !== 'allPass' && auto[k] !== true);
    if (fails.length || auto.allPass !== true)
      return { pass: false, detail: 'autotest failed: ' + fails.map(k => k + '=' + JSON.stringify(auto[k])).join(', ') };

    // 2) daily layout deterministic across a real reload
    await h.evaluate(`location.href = location.pathname`);
    let ready = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      ready = await h.evaluate(`(window.WORMS ? true : null)`).catch(() => null);
      if (ready) break;
    }
    if (!ready) return { pass: false, detail: 'WORMS API missing after reload' };
    const before = await h.evaluate(`(() => {
      WORMS.start('daily', 20260919);
      const f = WORMS.st().food.slice(0, 8).map(o => Math.round(o.x) + ':' + Math.round(o.y) + ':' + o.v);
      return f.join('|');
    })()`);
    await h.evaluate(`location.reload()`);
    let ready2 = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      ready2 = await h.evaluate(`(window.WORMS ? true : null)`).catch(() => null);
      if (ready2) break;
    }
    if (!ready2) return { pass: false, detail: 'page did not reload' };
    const after = await h.evaluate(`(() => {
      WORMS.start('daily', 20260919);
      const f = WORMS.st().food.slice(0, 8).map(o => Math.round(o.x) + ':' + Math.round(o.y) + ':' + o.v);
      return f.join('|');
    })()`);
    if (before !== after) return { pass: false, detail: `daily food map differs across reloads:\n${before}\n${after}` };

    // 3) touch joystick steering (left-half drag changes heading)
    const a1 = await h.evaluate(`(() => { WORMS.start('classic', 5); return WORMS.player().target; })()`);
    const r = await h.evaluate(`(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { w: r.width, h: r.height }; })()`);
    await h.evaluate(`(() => {
      const stg = document.getElementById('stage');
      const base = { bubbles: true, cancelable: true, pointerId: 5, pointerType: 'touch' };
      stg.dispatchEvent(new PointerEvent('pointerdown',
        Object.assign({}, base, { clientX: ${r.w} * 0.25, clientY: ${r.h} * 0.5 })));
      stg.dispatchEvent(new PointerEvent('pointermove',
        Object.assign({}, base, { clientX: ${r.w} * 0.25 + 80, clientY: ${r.h} * 0.5 - 60 })));
    })()`);
    const a2 = await h.evaluate(`WORMS.player().target`);
    if (Math.abs(a2 - a1) < 0.05)
      return { pass: false, detail: `touch joystick did not change heading (${a1} -> ${a2})` };

    // 3b) mouse steering (fine pointer) also steers
    await h.evaluate(`(() => {
      const stg = document.getElementById('stage');
      const opts = { bubbles: true, cancelable: true, pointerId: 3, pointerType: 'mouse',
                     clientX: ${r.w} * 0.85, clientY: ${r.h} * 0.15 };
      stg.dispatchEvent(new PointerEvent('pointermove', opts));
    })()`);
    const a3 = await h.evaluate(`WORMS.player().target`);
    if (Math.abs(a3 - a2) < 0.05)
      return { pass: false, detail: `mouse steering did not change heading (${a2} -> ${a3})` };

    return {
      pass: true,
      detail: `autotest allPass (determinism/population/growth/boost/kill+burst/death+persist/board/ranks); ` +
        `daily map stable across reload; joystick steer ${a1.toFixed(2)}->${a2.toFixed(2)}, mouse steer ->${a3.toFixed(2)}`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
