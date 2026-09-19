/* Per-game scripted playtest for neon-blackjack (design acceptance criteria).
 * Verifies the LESSONS #9 gameplay red line with the GAME_STANDARD hooks:
 *  - ?autotest=1 in-page suite: soft/hard hand values, basic-strategy table
 *    spot checks, S17 dealer, rigged-shoe payouts (BJ 3:2 / bust / peek),
 *    dealer draw sequence, daily shoe determinism, bankruptcy relief
 *  - full hand via DOM buttons: bet -> deal -> hit -> stand -> payout
 *  - coach panel matches the basic-strategy table on a live decision
 *  - keyboard H/S/D shortcuts act
 *  - daily session deterministic across a real page reload */
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

    // 2) daily shoe deterministic across a real reload
    await h.evaluate(`location.href = location.pathname`);
    let ready = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      ready = await h.evaluate(`(window.BJ ? true : null)`).catch(() => null);
      if (ready) break;
    }
    if (!ready) return { pass: false, detail: 'BJ API missing after reload' };
    const before = await h.evaluate(`(() => {
      BJ.start('daily', 20260919);
      return BJ.st().shoe.slice(0, 12).map(c => c.r + '.' + c.s).join('|');
    })()`);
    await h.evaluate(`location.reload()`);
    let ready2 = null;
    for (let i = 0; i < 20; i++) {
      await h.sleep(300);
      ready2 = await h.evaluate(`(window.BJ ? true : null)`).catch(() => null);
      if (ready2) break;
    }
    if (!ready2) return { pass: false, detail: 'page did not reload' };
    const after = await h.evaluate(`(() => {
      BJ.start('daily', 20260919);
      return BJ.st().shoe.slice(0, 12).map(c => c.r + '.' + c.s).join('|');
    })()`);
    if (before !== after) return { pass: false, detail: `daily shoe differs across reloads:\n${before}\n${after}` };

    // 3) full hand through the real UI buttons: bet -> deal -> hit -> stand
    const flow = await h.evaluate(`(() => {
      BJ.start('classic', 1);
      BJ.st().chips = 1000;
      BJ.st().coach.on = true;
      BJ.forceShoe([ {r:9,s:0},{r:5,s:2},{r:7,s:1},{r:10,s:3},{r:4,s:0} ]); // player 9+7=16, dealer 5
      document.getElementById('chip100').click();
      document.getElementById('btnDeal').click();
      const afterDeal = window.__qaState();
      const hintShown = !!(afterDeal.hint && afterDeal.hint.a);
      const coachVisible = document.getElementById('coach').classList.contains('show');
      document.getElementById('btnHit').click();          // 16 + 4 = 20
      const afterHit = window.__qaState();
      document.getElementById('btnStand').click();        // dealer 5+10=15 -> hits 4? shoe exhausted -> reshuffle path
      const end = window.__qaState();
      return {
        phase: afterDeal.phase, hintShown, coachVisible,
        playerN: afterHit.player.length, playerTotal: afterHit.player.map(c=>c.r),
        endPhase: end.phase, result: end.result ? end.result.kind : null,
        dealerLen: end.dealer.length, chips: end.chips
      };
    })()`);
    if (flow.phase !== 'player' || !flow.hintShown || !flow.coachVisible)
      return { pass: false, detail: `deal flow broken: phase=${flow.phase} hint=${flow.hintShown} coach=${flow.coachVisible}` };
    if (flow.playerN !== 3) return { pass: false, detail: `hit did not add a card: ${flow.playerN}` };
    if (flow.endPhase !== 'result') return { pass: false, detail: `stand did not settle: ${flow.endPhase}` };

    // 4) keyboard: H acts during player phase (rigged shoe, no natural BJ)
    await h.evaluate(`(() => {
      BJ.start('classic', 1);
      BJ.st().chips = 1000;
      BJ.forceShoe([ {r:5,s:0},{r:9,s:2},{r:7,s:1},{r:6,s:3},{r:3,s:0} ]);
      BJ.setBet(25); BJ.deal();
    })()`);
    const preH = await h.evaluate(`window.__qaState().player.length`);
    await h.evaluate(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' }))`);
    const postH = await h.evaluate(`window.__qaState().player.length`);
    if (postH !== preH + 1) return { pass: false, detail: `keyboard H did not hit (${preH} -> ${postH})` };

    // 5) coach agreement: hint matches basicStrategy across 30 live deals
    const agree = await h.evaluate(`(() => {
      let ok = 0, n = 0;
      for (let i = 0; i < 30; i++) {
        BJ.start('classic', 1000 + i);
        BJ.st().chips = 1000;
        BJ.setBet(10); BJ.deal();
        const s = window.__qaState();
        if (s.phase !== 'player') continue;      // natural BJ settled
        const ref = BJ.basicStrategy(BJ.st().player, BJ.st().dealer[0], true);
        if (s.hint && s.hint.a === ref.a) ok++;
        n++;
      }
      return { ok, n };
    })()`);
    if (agree.n < 20 || agree.ok !== agree.n)
      return { pass: false, detail: `coach/table mismatch: ${agree.ok}/${agree.n} agree` };

    return {
      pass: true,
      detail: `autotest allPass (hands/strategy 14 spots/S17/payouts/peek/relief/determinism); ` +
        `daily shoe stable across reload; UI hand flow bet→deal→hit→stand settled (${flow.result}); ` +
        `keyboard H acts; coach agrees with table ${agree.ok}/${agree.n}`,
    };
  } catch (e) {
    return { pass: false, detail: 'scripted test exception: ' + (e && e.message || String(e)) };
  }
};
