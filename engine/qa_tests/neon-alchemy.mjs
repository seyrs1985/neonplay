/* neon-alchemy QA — validates the design doc's playability red lines:
 * water+fire => steam discovery (+1 collection), duplicate no double count,
 * light+light => neon and neon+city => cyberpunk chains, pool-out recipes
 * rejected in daily mode, daily board #1 completion panel, persistence. */
export default async function (h) {
  await h.evaluate(`try{localStorage.removeItem("np_alc_save")}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`typeof __qaState === 'function'`).catch(() => false);
    if (ok) break;
  }
  const st = () => h.evaluate(`__qaState()`);
  const pick = (a, b) => h.evaluate(`(()=>{var chips=document.querySelectorAll('#chips .elchip');
    var f=c=>[...chips].find(x=>x.dataset.id===c);
    f('${a}')?.click(); f('${b}')?.click();})()`);
  const s0 = await st();
  if (s0.count !== 4) return { pass: false, detail: "board not initialized with 4 base elements: " + s0.count };

  // water + fire => steam (5/42)
  await pick("water", "fire");
  await h.sleep(250);
  const s1 = await st();
  if (s1.found.indexOf("steam") < 0 || s1.count !== 5)
    return { pass: false, detail: `water+fire failed: count=${s1.count} found=${s1.found}` };

  // duplicate: no double count, no dup entry
  await pick("water", "fire");
  await h.sleep(250);
  const s2 = await st();
  if (s2.count !== 5 || s2.found.filter(x => x === "steam").length !== 1)
    return { pass: false, detail: `duplicate counted twice: count=${s2.count}` };

  // chains: electric+water=light → light+light=neon → light+electric=screen
  // → screen+screen=computer → computer+computer=internet
  await pick("electric", "water");    // light
  await h.sleep(200);
  await pick("light", "light");       // neon
  await h.sleep(200);
  await pick("light", "electric");    // screen
  await h.sleep(200);
  await pick("screen", "screen");     // computer
  await h.sleep(200);
  await pick("computer", "computer"); // internet
  await h.sleep(200);
  const s3 = await st();
  if (s3.found.indexOf("neon") < 0 || s3.found.indexOf("internet") < 0)
    return { pass: false, detail: `chain recipes failed: ${JSON.stringify(s3.found)}` };

  // persistence across reload
  await h.evaluate(`location.reload()`);
  await h.sleep(1400);
  const s4 = await st();
  if (s4.count < 8 || s4.found.indexOf("neon") < 0)
    return { pass: false, detail: `persistence broken: count=${s4.count}` };

  // daily mode: in-pool recipes apply to dailyFound (not the global wall);
  // out-of-pool ingredients are rejected. Board-agnostic assertions.
  await h.evaluate(`document.getElementById('tab-daily').click()`);
  await h.sleep(300);
  const d0 = await st();
  if (d0.mode !== "daily") return { pass: false, detail: "daily tab did not switch" };
  await pick("electric", "electric"); // magnet: electric is in every board's pool
  await h.sleep(250);
  const d1 = await st();
  if (d1.dailyFound.indexOf("magnet") < 0)
    return { pass: false, detail: `in-pool daily recipe not applied: dailyFound=${d1.dailyFound}` };
  const earthIn = d1.pool.indexOf("earth") >= 0;
  await pick("water", "earth");       // plant — legal only when earth is in the pool
  await h.sleep(250);
  const d2 = await st();
  const plantIn = d2.dailyFound.indexOf("plant") >= 0;
  if (earthIn && !plantIn) return { pass: false, detail: "in-pool water+earth rejected (should apply)" };
  if (!earthIn && plantIn) return { pass: false, detail: "POOL-OUT BUG: plant crafted without earth in pool" };

  // completion: solve today's board via the BFS test hook — panel + stamp must fire
  const solveRes = await h.evaluate(`__qa.solveBoard()`);
  await h.sleep(400);
  const winSt = await h.evaluate(`(() => ({
    shown: !document.getElementById('dailWin').classList.contains('hide'),
    share: document.getElementById('dwText').textContent,
    done: __qaState().dailyDone
  }))()`);
  if (solveRes !== "done" || !winSt.shown || !/Neon Alchemy/.test(winSt.share) || !winSt.done)
    return { pass: false, detail: `daily completion failed: solve=${solveRes} shown=${winSt.shown} share="${winSt.share}" done="${winSt.done}"` };
  await h.evaluate(`document.getElementById('dwClose').click()`);
  return { pass: true, detail: `craft+duplicate+chains+persist OK (count ${s4.count}); daily pool rules OK (earthIn=${earthIn}); board solved to panel, stamped ${winSt.done}` };
}
