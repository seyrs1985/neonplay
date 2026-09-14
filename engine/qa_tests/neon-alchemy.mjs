/* neon-alchemy QA — rewritten board-agnostic (the previous script assumed
 * "electric" is in every daily pool; boards #0/#5 lack it and failed 2 days
 * out of 10). Uses the GAME_STANDARD hooks (__qaState/__qa) but drives the
 * real chip DOM. Covers: water+fire=>steam discovery (+collection wall/recipe
 * log/progress), duplicate no double count, light+light=>neon chain,
 * persistence, daily in-pool recipe accepted, out-of-pool ingredient
 * rejected, and board completion via the real combine() path. */
export default async function (h) {
  await h.evaluate(`try{localStorage.removeItem("np_alc_save")}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`typeof __qaState === 'function'`).catch(() => false);
    if (ok) break;
  }
  const st = () => h.evaluate(`__qaState()`);
  const pick = (a, b) => h.evaluate(`(() => {
    var f = id => document.querySelector('#chips .elchip[data-id="' + id + '"]');
    var x = f('${a}'); if (!x) return "no-chip:${a}";
    x.click();                                   // re-render replaces the chips
    var y = f('${b}'); if (!y) return "no-chip:${b}";
    y.click();
    return "ok";
  })()`);

  const s0 = await st();
  if (s0.count !== 4) return { pass: false, detail: "board not initialized with 4 base elements: " + s0.count };

  // water + fire => steam, collection wall + recipe log + progress update
  let pr = await pick("water", "fire");
  await h.sleep(300);
  const s1 = await st();
  if (pr !== "ok" || s1.found.indexOf("steam") < 0 || s1.count !== 5)
    return { pass: false, detail: `water+fire failed: pick=${pr} count=${s1.count} found=${s1.found}` };
  const wall1 = await h.evaluate(`(() => ({
    progress: document.getElementById('progress').textContent,
    unlocked: document.querySelectorAll('#wall .wcell:not(.locked)').length,
    rxKnown: document.querySelectorAll('#rx .r:not(.locked)').length,
  }))()`);
  if (wall1.progress !== "5/42" || wall1.unlocked !== 5)
    return { pass: false, detail: `collection wall not updated: progress="${wall1.progress}" unlocked=${wall1.unlocked}, expected 5/42, 5` };
  if (wall1.rxKnown < 1) return { pass: false, detail: "recipe log shows no known recipe after steam discovery" };

  // duplicate: no double count
  await pick("water", "fire");
  await h.sleep(250);
  const s2 = await st();
  if (s2.count !== 5 || s2.found.filter(x => x === "steam").length !== 1)
    return { pass: false, detail: `duplicate counted twice: count=${s2.count}` };

  // chain: electric+water=>light, light+light=>neon
  await pick("electric", "water");
  await h.sleep(250);
  await pick("light", "light");
  await h.sleep(250);
  const s3 = await st();
  if (s3.found.indexOf("light") < 0 || s3.found.indexOf("neon") < 0 || s3.count !== 7)
    return { pass: false, detail: `chain recipes failed: count=${s3.count} found=${s3.found}` };

  // persistence across reload
  await h.evaluate(`location.reload()`);
  await h.sleep(1400);
  const s4 = await st();
  if (s4.count < 7 || s4.found.indexOf("neon") < 0)
    return { pass: false, detail: `persistence broken: count=${s4.count} found=${s4.found}` };

  // daily mode — board-agnostic: derive a legal in-pool pair from the live pool
  await h.evaluate(`document.getElementById('tab-daily').click()`);
  await h.sleep(300);
  const d0 = await st();
  if (d0.mode !== "daily") return { pass: false, detail: "daily tab did not switch" };
  const pair = await h.evaluate(`(() => {
    var pool = __qaState().pool;
    for (var i = 0; i < pool.length; i++) for (var j = 0; j <= i; j++) {
      if (RX[[pool[i], pool[j]].sort().join('+')]) return [pool[i], pool[j]];
    }
    return null;
  })()`);
  if (!pair) return { pass: false, detail: `no craftable pair inside pool [${d0.pool}] (board unsolvable?)` };
  const res = await h.evaluate(`RX[['${pair[0]}','${pair[1]}'].sort().join('+')]`);
  pr = await pick(pair[0], pair[1]);
  await h.sleep(300);
  const d1 = await st();
  if (pr !== "ok" || d1.dailyFound.indexOf(res) < 0)
    return { pass: false, detail: `in-pool recipe ${pair[0]}+${pair[1]}=>${res} not applied: pick=${pr} dailyFound=${d1.dailyFound}` };

  // out-of-pool ingredient must be rejected (any element not in board scope)
  const rej = await h.evaluate(`(() => {
    var s = __qaState();
    var out = ELEMENTS.map(e => e[0]).find(id =>
      s.pool.indexOf(id) < 0 && s.dailyFound.indexOf(id) < 0 && id !== '${pair[0]}' && id !== '${pair[1]}');
    return out || null;
  })()`);
  if (rej) {
    const before = await st();
    await pick(rej, d0.pool[0]);
    await h.sleep(300);
    const after = await st();
    if (after.dailyFound.length !== before.dailyFound.length)
      return { pass: false, detail: `POOL-OUT BUG: ${rej} crafted outside the daily pool (dailyFound=${after.dailyFound})` };
  }

  // completion: solve today's board via real combine() calls — panel must fire
  const solveRes = await h.evaluate(`__qa.solveBoard()`);
  await h.sleep(400);
  const winSt = await h.evaluate(`(() => ({
    shown: !document.getElementById('dailWin').classList.contains('hide'),
    share: document.getElementById('dwText').textContent,
    done: __qaState().dailyDone,
  }))()`);
  if (solveRes !== "done" || !winSt.shown || !/Neon Alchemy/.test(winSt.share) || !winSt.done)
    return { pass: false, detail: `daily completion failed: solve=${solveRes} shown=${winSt.shown} share="${winSt.share}" done="${winSt.done}"` };
  await h.evaluate(`document.getElementById('dwClose').click()`);
  return {
    pass: true,
    detail: `craft+duplicate+neon chain+persist OK (count ${s4.count}); daily pool rules OK (${pair[0]}+${pair[1]}=>${res}, out-of-pool rejected=${!!rej}); board #${d0.board + 1} solved to panel, stamped ${winSt.done}`,
  };
}
