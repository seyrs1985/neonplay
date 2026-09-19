/* Per-game scripted playtest for neon-runner (design acceptance criteria).
 * Verifies the LESSONS #9 gameplay red line with the GAME_STANDARD hooks:
 *  - ?autotest=1 in-page suite: passable-gap envelope + type gating,
 *    drone bands (stand hits / duck clears), auto-pilot survives 60s of the
 *    daily track, no-duck death on drones, idle death, variable jump,
 *    daily determinism, persistence
 *  - daily track identical across a real page reload
 *  - touch zones: left tap jumps, right hold ducks (synthetic events) */
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
    for (let i = 0; i < 90; i++) {
      await h.sleep(400);
      auto = await h.evaluate(`(window.__autotest || null)`).catch(() => null);
      if (auto) break;
    }
    if (!auto) return { pass: false, detail: '?autotest=1 never exposed window.__autotest' };
    const fails = Object.keys(auto).filter(k => k !== 'allPass' && auto[k] !== true);
    if (fails.length || auto.allPass !== true)
      return { pass: false, detail: 'autotest failed: ' + fails.map(k => k + '=' + JSON.stringify(auto[k])).join(', ') };

    // 2) daily track identical across a real reload
    await h.evaluate(`location.href = location.pathname`);
    let ready = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      ready = await h.evaluate(`(window.RUNNER ? true : null)`).catch(() => null);
      if (ready) break;
    }
    if (!ready) return { pass: false, detail: 'RUNNER API missing after reload' };
    const before = await h.evaluate(`(() => {
      RUNNER.start('daily', 20260919);
      return RUNNER.route(20260919, 14).map(o => o.type + '@' + Math.round(o.x)).join('|');
    })()`);
    await h.evaluate(`location.reload()`);
    let ready2 = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      ready2 = await h.evaluate(`(window.RUNNER ? true : null)`).catch(() => null);
      if (ready2) break;
    }
    if (!ready2) return { pass: false, detail: 'page did not reload' };
    const after = await h.evaluate(`(() => {
      RUNNER.start('daily', 20260919);
      return RUNNER.route(20260919, 14).map(o => o.type + '@' + Math.round(o.x)).join('|');
    })()`);
    if (before !== after) return { pass: false, detail: `daily track differs across reloads:\n${before}\n${after}` };

    // 3) live sim: auto-pilot on the real daily seed survives 20s and gains meters
    const live = await h.evaluate(`(() => {
      RUNNER.start('daily');
      var jumpT = 0;
      for (var k = 0; k < 20 * 60 && RUNNER.st().state === 'PLAY'; k++) {
        var st = RUNNER.st();
        var o = st.obstacles[0];
        if (o) {
          var dx = o.sx - RUNNER.PLAYER_X, v = st.speed;
          if (o.type === 'drone') { RUNNER.duck(dx < v * 0.35); }
          else { RUNNER.duck(false); if (st.grounded && dx < v * 0.32 && dx > 0) { RUNNER.jump(true); jumpT = 0.001; } }
        }
        if (jumpT > 0) { jumpT += 1 / 60; if (jumpT > 0.24) { RUNNER.jump(false); jumpT = 0; } }
        RUNNER.step(1 / 60);
      }
      return window.__qaState();
    })()`);
    if (live.state !== 'PLAY' || live.dist < 600)
      return { pass: false, detail: `live daily run failed too early: state=${live.state} dist=${live.dist}` };

    // 4) touch zone events: left tap -> airborne; right hold -> ducking
    const r = await h.evaluate(`(() => { const r = document.getElementById('stage').getBoundingClientRect(); return { w: r.width, h: r.height }; })()`);
    await h.evaluate(`(() => {
      const stg = document.getElementById('stage');
      const base = { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch' };
      RUNNER.start('classic', 77);
      for (let i = 0; i < 40; i++) RUNNER.step(1 / 60);
      stg.dispatchEvent(new PointerEvent('pointerdown',
        Object.assign({}, base, { clientX: ${r.w} * 0.2, clientY: ${r.h} * 0.6 })));
    })()`);
    const airborne = await h.evaluate(`window.__qaState().grounded === false`);
    await h.evaluate(`(() => {
      const stg = document.getElementById('stage');
      const base = { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch' };
      stg.dispatchEvent(new PointerEvent('pointerup',
        Object.assign({}, base, { clientX: ${r.w} * 0.2, clientY: ${r.h} * 0.6 })));
    })()`);
    await h.evaluate(`(() => {
      const stg = document.getElementById('stage');
      const base = { bubbles: true, cancelable: true, pointerId: 9, pointerType: 'touch' };
      for (let i = 0; i < 80 && !window.__qaState().grounded; i++) RUNNER.step(1 / 60);
      stg.dispatchEvent(new PointerEvent('pointerdown',
        Object.assign({}, base, { clientX: ${r.w} * 0.8, clientY: ${r.h} * 0.6 })));
    })()`);
    const ducking = await h.evaluate(`window.__qaState().ducking === true`);
    if (!airborne) return { pass: false, detail: 'left-zone tap did not jump' };
    if (!ducking) return { pass: false, detail: 'right-zone hold did not duck' };

    return {
      pass: true,
      detail: `autotest allPass (envelope/gating/droneBands/autoPilot 60s/noDuck death/idle death/variableJump/determinism/persist); ` +
        `daily track stable across reload; live daily run reached ${live.dist}m; touch zones verified`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
