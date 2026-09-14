/* neon-fairway QA — design doc acceptance red lines:
 * seeded-deal determinism (same seed => same 35-card field, different seed differs);
 * +/-1 rule incl. A-2 / K-Q boundaries and A<->K only under the Wraparound joker;
 * chain economy (x1 -> x1.5 -> x2 ... capped x5 / x7.5), stock flip resets chain;
 * illegal tap rejected; greedy autoPlay finishes a round => end panel + persistence
 * (best/top10/stats keys written); daily deal identical across two page loads. */
export default async function (h) {
  const reset = `try{Object.keys(localStorage).filter(k=>k.indexOf("np_neon-fairway_")===0).forEach(k=>localStorage.removeItem(k))}catch(e){}`;
  await h.evaluate(reset + "; location.reload()");
  let ok = false;
  for (let i = 0; i < 30; i++) {
    await h.sleep(300);
    ok = await h.evaluate(`typeof __qaState === "function" && typeof __qa === "object"`).catch(() => false);
    if (ok) break;
  }
  if (!ok) return { pass: false, detail: "game did not boot (__qaState missing)" };
  const st = () => h.evaluate(`__qaState()`);

  /* 1) seeded determinism: same seed twice identical, other seed differs */
  const a1 = await h.evaluate(`__qa.deal("qa-seed-A")`);
  const a2 = await h.evaluate(`__qa.deal("qa-seed-A")`);
  const b1 = await h.evaluate(`__qa.deal("qa-seed-B")`);
  if (JSON.stringify(a1) !== JSON.stringify(a2))
    return { pass: false, detail: "same seed deals differ" };
  if (JSON.stringify(a1) === JSON.stringify(b1))
    return { pass: false, detail: "different seeds produced identical fields" };
  let s = await st();
  if (s.state !== "playing" || s.jokerPanel)
    return { pass: false, detail: `joker not auto-picked: state=${s.state}` };
  if (!s.joker || ["wrap", "chain", "deep"].indexOf(s.joker) < 0)
    return { pass: false, detail: `joker offer contains non-implemented pick: ${s.joker}` };

  /* 2) pure rule math: +/-1, A-2 and K-Q edges, A-K only with wrap */
  const rule = await h.evaluate(`({
    a2: __qa.ranksAdjacent(1, 2), ka: __qa.ranksAdjacent(13, 12),
    akPlain: __qa.ranksAdjacent(1, 13), akWrap: __qa.ranksAdjacent(1, 13, true),
    kaWrap: __qa.ranksAdjacent(13, 1, true), same: __qa.ranksAdjacent(7, 7), far: __qa.ranksAdjacent(3, 9)
  })`);
  if (!rule.a2 || !rule.ka || rule.akPlain || !rule.akWrap || !rule.kaWrap || rule.same || rule.far)
    return { pass: false, detail: "rank adjacency rule wrong: " + JSON.stringify(rule) };

  /* 3) live +/-1 play + chain economy: play 2 chained cards, check score math */
  s = await st();
  if (!s.playable.length) return { pass: false, detail: "no playable card after deal" };
  const p0 = s.playable[0];
  if (Math.abs(s.wasteTop - s.fieldRanks[p0]) !== 1)
    return { pass: false, detail: `playable card not +/-1 (waste ${s.wasteTop} vs rank ${s.fieldRanks[p0]})` };
  const illegal = s.fieldRanks.findIndex((r, i) => Math.abs(s.wasteTop - r) !== 1 && (s.joker !== "wrap" || !(s.wasteTop === 1 && r === 13) && !(s.wasteTop === 13 && r === 1)));
  await h.evaluate(`__qa.play(${p0})`);
  await h.sleep(120);
  s = await st();
  if (s.cleared !== 1 || s.score !== 10 || s.chain !== 1 || s.mult !== 1)
    return { pass: false, detail: `first play scoring wrong: cleared=${s.cleared} score=${s.score} chain=${s.chain} mult=${s.mult}` };
  if (illegal >= 0) {
    await h.evaluate(`__qa.play(${illegal})`);
    await h.sleep(100);
    const s2 = await st();
    if (s2.cleared !== 1 || s2.score !== 10 || s2.chain !== 1)
      return { pass: false, detail: `illegal card was accepted: cleared=${s2.cleared} score=${s2.score}` };
  }
  if (s.playable.length) {
    await h.evaluate(`__qa.play(${s.playable[0]})`);
    await h.sleep(120);
    s = await st();
    if (s.chain !== 2 || s.mult !== 1.5 || s.score !== 25)
      return { pass: false, detail: `chain math wrong: chain=${s.chain} mult=${s.mult} score=${s.score} (want 2/1.5/25)` };
  }
  /* stock flip resets chain and changes waste top */
  const beforeTop = s.wasteTop;
  await h.evaluate(`__qa.flip()`);
  await h.sleep(100);
  s = await st();
  if (s.chain !== 0 || s.mult !== 1)
    return { pass: false, detail: `flip did not reset chain: ${s.chain}/${s.mult}` };
  if (s.wasteTop === beforeTop)
    return { pass: false, detail: "flip did not change waste top" };

  /* 4) joker effects: chain master cap 7.5; deep stock +6 */
  await h.evaluate(`__qa.deal("qa-seed-C", "chain")`);
  s = await st();
  if (s.joker !== "chain" || s.multCap !== 7.5)
    return { pass: false, detail: `Chain Master cap wrong: ${s.multCap}` };
  await h.evaluate(`__qa.deal("qa-seed-D", "deep")`);
  s = await st();
  if (s.joker !== "deep" || s.stockLeft !== 22)
    return { pass: false, detail: `Deep Stock wrong: stockLeft=${s.stockLeft} (want 22 = 17-1 flip +6)` };
  await h.evaluate(`__qa.deal("qa-seed-E", "wrap")`);
  s = await st();
  if (s.stockLeft !== 16) return { pass: false, detail: `plain deal stock ${s.stockLeft} != 16 (17 - opening flip)` };

  /* 5) tier thresholds (design: 1399 platinum / 1400 diamond / 1800 legend) */
  const tiers = await h.evaluate(`[__qa.tierFor(749).key, __qa.tierFor(750).key, __qa.tierFor(1399).key, __qa.tierFor(1400).key, __qa.tierFor(1800).key]`);
  if (JSON.stringify(tiers) !== JSON.stringify(["bronze", "silver", "platinum", "diamond", "legend"]))
    return { pass: false, detail: "tier thresholds wrong: " + JSON.stringify(tiers) };

  /* 6) greedy autoPlay round => game over, panel, persistence written */
  await h.evaluate(`__qa.deal("qa-auto-1", "wrap")`);
  const res = await h.evaluate(`__qa.autoPlay()`);
  await h.sleep(400);
  s = await st();
  if (!res.over || s.state !== "over" || !s.panel)
    return { pass: false, detail: `autoPlay did not finish: ${JSON.stringify(res)} state=${s.state}` };
  if (s.cleared < 1 || s.score < 10)
    return { pass: false, detail: `autoPlay cleared/score broken: ${s.cleared}/${s.score}` };
  const saved = await h.evaluate(`(function(){
    var out = {};
    ["best","top10","stats"].forEach(function(k){
      try { out[k] = JSON.parse(localStorage.getItem("np_neon-fairway_" + k)); } catch (e) { out[k] = null; }
    });
    return out;
  })()`);
  if (!saved.best || saved.best.score !== s.score)
    return { pass: false, detail: "best key not persisted: " + JSON.stringify(saved.best) };
  if (!Array.isArray(saved.top10) || !saved.top10.length || saved.top10[0].score !== s.score)
    return { pass: false, detail: "top10 not persisted" };
  if (!saved.stats || saved.stats.games < 1)
    return { pass: false, detail: "stats not persisted" };

  /* 7) share card is a real render (non-blank canvas) */
  const shareLen = await h.evaluate(`__qa.shareCard()`);
  if (shareLen < 2000) return { pass: false, detail: "share canvas blank: len=" + shareLen };

  /* 8) daily deal determinism across two page loads (same UTC day => same field) */
  const d1 = await h.evaluate(`__qa.daily().fieldRanks`);
  await h.evaluate(reset + "; location.reload()");
  for (let i = 0; i < 30; i++) {
    await h.sleep(300);
    ok = await h.evaluate(`typeof __qaState === "function"`).catch(() => false);
    if (ok) break;
  }
  const d2 = await h.evaluate(`__qa.daily().fieldRanks`);
  if (JSON.stringify(d1) !== JSON.stringify(d2))
    return { pass: false, detail: "daily deal differs across two loads (same day)" };

  /* 9) finish the daily deal => daily + streak keys written */
  const dres = await h.evaluate(`(function(){ __qa.daily(); var j = __qaState().offer.find(function(id){return id==="wrap"||id==="chain"||id==="deep"}); __qa.pickJoker(j); return __qa.autoPlay(); })()`);
  const dst = await h.evaluate(`(function(){
    var out = {};
    ["daily","streak","weekly"].forEach(function(k){
      try { out[k] = JSON.parse(localStorage.getItem("np_neon-fairway_" + k)); } catch (e) { out[k] = null; }
    });
    return out;
  })()`);
  if (!dst.daily || dst.daily.done !== true || !(dst.daily.score > 0))
    return { pass: false, detail: "daily key not stamped after finishing the daily deal: " + JSON.stringify(dst.daily) };
  if (!dst.streak || dst.streak.count < 1 || !dst.streak.last)
    return { pass: false, detail: "streak key not updated: " + JSON.stringify(dst.streak) };
  if (!dst.weekly || !dst.weekly.weekKey)
    return { pass: false, detail: "weekly key not written: " + JSON.stringify(dst.weekly) };

  return {
    pass: true,
    detail: `seed determinism OK; ±1+wrap rule OK (A2/KQ/A-K edges); chain 10/15 & ×1.5 OK, flip resets; ` +
      `chain-cap 7.5 + deep-stock 22 OK; tiers OK; autoPlay ${res.cleared}/35 → ${res.score} pts, panel+persistence OK; share canvas ${shareLen}B; ` +
      `daily deal stable across reloads; daily/streak/weekly keys stamped (daily ${dres.cleared}/35)`
  };
}
