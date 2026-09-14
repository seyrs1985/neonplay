/* neon-mahjong scripted playtest (design doc acceptance list):
 * 1) generation QA: 5 date seeds x 3 layouts -> deterministic, zero-shuffle
 *    (replay-asserted clearing order), face counts even, tiles == pairs*2
 * 2) freeness unit cases: covered tile not free / both sides blocked not free /
 *    one side open free (rigged custom board)
 * 3) solveStep() drives 3 real pair clears -> vanish FX present, combo scoring
 *    100 + 110 + 121, pairs counter drops
 * 4) deadlock: rigged board with no free matching pair -> auto reshuffle fires,
 *    -100 penalty, a move exists afterwards
 * 5) full clear via solveStep loop -> win panel + confetti + rank + scoring
 *    formula (time bonus at rig-frozen sec, zero-shuffle +100)
 * 6) daily win -> dailyDone stamped, streak >= 1, save keys written
 *    (np_neon-mahjong_best/top10/daily/streak/stats/weekly)
 * 7) share card canvas non-blank with site link
 * 8) zh i18n reload smoke
 * Every step asserts via window.__qaState() / window.__qa. */
export default async function (h) {
  const sleep = h.sleep;
  const ev = (expr) => h.evaluate(expr);
  const fail = (m) => ({ pass: false, detail: m });

  // ---- phase 1: generation QA over 5 date seeds x 3 layouts ----
  const g = await ev(`(() => {
    const seeds = ["2026-09-10","2026-09-11","2026-09-12","2026-09-13","2026-09-14"];
    const out = { deals: 0, zero: 0, even: 0, det: 0, ms: 0 };
    for (const s of seeds) for (const ly of ["casual","standard","expert"]) {
      const a = window.__qa.genCheck(ly, "neon-mahjong:" + s);
      const b = window.__qa.genCheck(ly, "neon-mahjong:" + s);
      out.deals++; out.ms += a.ms;
      if (a.zeroShuffle) out.zero++;
      if (a.pairsEven && a.tiles === window.__mjLogic.LAYOUTS[ly].length) out.even++;
      if (JSON.stringify(a.faces) === JSON.stringify(b.faces)) out.det++;
    }
    return out; })()`);
  if (!g || g.deals !== 15) return fail("genCheck did not run 15 deals");
  if (g.zero !== 15) return fail(`zero-shuffle replay failed on ${15 - g.zero}/15 deals`);
  if (g.even !== 15) return fail("face pair counts not even everywhere");
  if (g.det !== 15) return fail("date-seeded deals not deterministic");

  // ---- phase 2: freeness unit cases (rigged custom board, no auto-shuffle) ----
  await ev(`window.__qa.rig({
    cells: [[0,0,1],[1,0,1],[2,0,1],[3,0,1],[4,0,1],[0,0,2],[2,0,2]],
    faces: window.__mjLogic.FACES.slice(0, 7), autoShuffle: false })`);
  const fr = await ev(`window.__qa.board().map(t => t.free)`);
  if (!fr || fr[0] !== false) return fail("covered tile (L2 above) must not be free");
  if (fr[1] !== false) return fail("both-sides-blocked tile must not be free");
  if (fr[4] !== true) return fail("one-side-open edge tile must be free");

  // ---- phase 3: solveStep drives 3 real pair clears with FX + combo scoring ----
  await ev(`window.__qa.newGame("casual", "qa-casual-3")`);
  const fxCounts = await ev(`(() => {
    const c = { vanish: 0, pt: 0 };
    for (let i = 0; i < 3; i++) {
      if (!window.__qa.solveStep()) return null;
      c.vanish += document.querySelectorAll(".vanish").length;
      c.pt += document.querySelectorAll(".pt").length;
    }
    return c; })()`);
  if (!fxCounts) return fail("solveStep could not find a free pair on a fresh casual deal");
  let st = await ev(`window.__qaState()`);
  if (st.tilesLeft !== 22) return fail(`3 solveSteps should leave 22 tiles, got ${st.tilesLeft}`);
  if (st.pairsLeft !== 11) return fail(`pairsLeft should be 11, got ${st.pairsLeft}`);
  if (st.score !== 331) return fail(`combo scoring 100+110+121 expected, got ${st.score}`);
  if (fxCounts.vanish < 3 || fxCounts.pt < 6) return fail(`match FX missing (vanish=${fxCounts.vanish} particles=${fxCounts.pt})`);

  // ---- phase 4: rigged deadlock -> auto reshuffle + penalty + move exists ----
  await ev(`window.__qa.rig({
    cells: [[0,0,1],[1,0,1],[2,0,1],[3,0,1]],
    faces: ["🍉","🍇","🍋","🍇"], score: 500 })`);
  st = await ev(`window.__qaState()`);
  if (st.shuffles !== 1) return fail(`dead board should auto-reshuffle once, shuffles=${st.shuffles}`);
  if (st.score !== 400) return fail(`reshuffle penalty -100 expected (500->400), got ${st.score}`);
  if (!st.hasMove) return fail("no free pair after auto-reshuffle");

  // ---- phase 5: full clear -> win panel, rank, scoring formula ----
  await ev(`window.__qa.rig({
    cells: [[0,0,1],[1,0,1],[2,0,1],[3,0,1]],
    faces: ["🍉","🍇","🍇","🍉"], sec: 100, score: 0 })`);
  const won = await ev(`(() => {
    window.__qaFreeze = true;
    let guard = 0;
    while (!window.__qaState().won && guard++ < 20) { if (!window.__qa.solveStep()) break; }
    window.__qaFreeze = false;
    return window.__qaState(); })()`);
  if (!won.won) return fail("rigged clearable board did not reach won state");
  if (won.timeBonus !== 300) return fail(`time bonus max(0,400-100) expected 300, got ${won.timeBonus}`);
  if (won.zeroBonus !== 100) return fail(`zero-shuffle bonus expected 100, got ${won.zeroBonus}`);
  if (won.score !== 610) return fail(`final score expected 610 (100+110 combo + 300 + 100), got ${won.score}`);
  await sleep(1300);
  st = await ev(`window.__qaState()`);
  if (!st.winPanelShown) return fail("win panel not shown after clearing");
  const cf = await ev(`document.querySelectorAll(".cf").length`);
  if (!cf) return fail("no confetti on win");

  // ---- phase 6: real casual + daily wins -> records, streak, save keys ----
  await ev(`window.__qa.newGame("casual", "qa-casual-full")`);
  const cleared = await ev(`(() => {
    let guard = 0, steps = 0;
    while (!window.__qaState().won && guard++ < 40) { if (!window.__qa.solveStep()) break; steps++; }
    return { won: window.__qaState().won, steps }; })()`);
  // 14 pairs normally; 13 when the final stacked pair is auto-cleared by the
  // 2-tiles-left safety valve inside ensureMoves (both paths are a full clear)
  if (!cleared.won || (cleared.steps !== 14 && cleared.steps !== 13)) return fail(`casual clear failed (steps=${cleared.steps})`);
  await ev(`window.__qa.newGame("daily")`);
  st = await ev(`window.__qaState()`);
  if (st.layout !== "standard" || st.tilesLeft !== 48) return fail(`daily should deal standard 48 tiles, got ${st.layout}/${st.tilesLeft}`);
  const dw = await ev(`(() => {
    let guard = 0;
    while (!window.__qaState().won && guard++ < 40) { if (!window.__qa.solveStep()) break; }
    return window.__qaState(); })()`);
  if (!dw.won) return fail("daily board did not clear via solveStep loop");
  if (dw.streak < 1) return fail(`daily win should bump streak, streak=${dw.streak}`);
  const saves = await ev(`(() => {
    const P = "np_neon-mahjong_";
    const keys = ["best","top10","daily","streak","stats","weekly"];
    const out = {};
    for (const k of keys) {
      try { out[k] = JSON.parse(localStorage.getItem(P + k)); } catch (e) { out[k] = null; }
    }
    return out; })()`);
  if (!saves.best || typeof saves.best.timeSec !== "number" || saves.best.layout !== "standard") return fail("best save malformed: " + JSON.stringify(saves.best));
  if (!Array.isArray(saves.top10) || !saves.top10.length || saves.top10.length > 10) return fail("top10 save malformed");
  if (!saves.daily || saves.daily.done !== true || !saves.daily.date) return fail("daily save malformed: " + JSON.stringify(saves.daily));
  if (!saves.streak || saves.streak.count < 1) return fail("streak save malformed: " + JSON.stringify(saves.streak));
  if (!saves.stats || saves.stats.wins < 2 || saves.stats.pairs < 42) return fail("stats save malformed: " + JSON.stringify(saves.stats));
  if (!saves.weekly || !saves.weekly.weekKey || !saves.weekly.best || typeof saves.weekly.best.timeSec !== "number") return fail("weekly save malformed: " + JSON.stringify(saves.weekly));

  // ---- phase 7: share card canvas non-blank + site link in text ----
  const sh = await ev(`window.__qa.share()`);
  if (!sh || sh.dataLen < 5000) return fail(`share canvas looks blank (dataLen=${sh && sh.dataLen})`);
  if (!/neonplay/.test(sh.text || "")) return fail("share text missing site link");

  // ---- phase 8: zh i18n reload smoke (last: reload wipes state) ----
  await ev(`try{localStorage.setItem("np_lang","zh")}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await sleep(300);
    const t = await ev(`document.getElementById("tab-daily") && document.getElementById("tab-daily").textContent`).catch(() => null);
    if (t) {
      if (t.indexOf("每日") < 0) return fail(`zh i18n not applied: tab="${t}"`);
      break;
    }
  }
  await ev(`try{localStorage.setItem("np_lang","en")}catch(e){}`);

  return { pass: true, detail: "gen 15/15 zero-shuffle+deterministic, freeness 3 cases, 3 solveSteps with FX + combo 331, deadlock auto-reshuffle -100, win formula 610 (combo 210 + bonus 300+100), casual+daily clears, streak+saves, share card, zh i18n" };
}
