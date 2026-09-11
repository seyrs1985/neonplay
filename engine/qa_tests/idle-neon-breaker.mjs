/* idle-neon-breaker QA — validates the design doc's acceptance criteria that
 * are scriptable headlessly: coins flow within seconds, merge pulse doubles
 * bricks, shop upgrade applies, persistence across reload, offline panel. */
export default async function (h) {
  // clean save for deterministic run 1
  await h.evaluate(`try{localStorage.removeItem("np_inb_save")}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`typeof __qaState === 'function'`).catch(() => false);
    if (ok) break;
  }
  const st = () => h.evaluate(`__qaState()`);
  const s0 = await st();
  if (s0.balls < 1 || s0.bricks.filter(v => v > 0).length !== 10)
    return { pass: false, detail: "board not initialized: " + JSON.stringify(s0).slice(0, 120) };

  // idle earnings: deterministic fast-forward (20 logic seconds of play)
  await h.evaluate(`__qa.advance(20)`);
  await h.sleep(300);
  const s1 = await st();
  if (s1.coins < 1) return { pass: false, detail: `no coins after 20s fast-forward (coins=${s1.coins})` };

  // merge pulse: force one, expect a 4 on board and highest bumped
  await h.evaluate(`__qa.forceMerge()`);
  await h.sleep(300);
  const s2 = await st();
  if (!s2.bricks.some(v => v >= 4) || s2.highest < 4)
    return { pass: false, detail: `merge pulse produced nothing (bricks=${s2.bricks} highest=${s2.highest})` };

  // shop: grant coins, buy damage, expect damage 2
  await h.evaluate(`__qa.addCoins(500)`);
  await h.click("#up-dmg");
  await h.sleep(250);
  const s3 = await st();
  if (s3.damage !== 2) return { pass: false, detail: `damage upgrade failed (${s3.damage})` };

  // persistence: reload, coins/highest must survive
  await h.evaluate(`location.reload()`);
  await h.sleep(1500);
  const s4 = await st();
  if (s4.coins < 300 || s4.highest < 4 || s4.damage !== 2)
    return { pass: false, detail: `persistence broken: ${JSON.stringify(s4).slice(0, 140)}` };

  // offline panel: backdate the save, re-read state without reload (the
  // beforeunload save would otherwise re-stamp t=now), panel must appear
  await h.evaluate(`(() => {
    const d = JSON.parse(localStorage.getItem("np_inb_save"));
    d.t = Date.now() - 5 * 60000; d.rate = 60;
    localStorage.setItem("np_inb_save", JSON.stringify(d));
    __qa.reloadState();
  })()`);
  await h.sleep(800);
  const panel = await h.evaluate(`(() => {
    const shown = document.getElementById("welcome").classList.contains("show");
    const gain = document.getElementById("wGain").textContent;
    if (shown) document.getElementById("wClaim").click();
    return { shown, gain, coinsAfter: __qaState().coins };
  })()`);
  if (!panel.shown || !/300/.test(panel.gain) || panel.coinsAfter < s4.coins + 299)
    return { pass: false, detail: `offline panel failed: shown=${panel.shown} gain="${panel.gain}" coinsAfter=${panel.coinsAfter}` };

  return { pass: true, detail: `idle flow OK: earn→merge(4)→shop(dmg2)→persist→offline+300 claimed` };
}
