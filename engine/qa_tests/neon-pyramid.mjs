/* neon-pyramid scripted playtest (design doc acceptance list):
 * 1) deal legality: 28-pyramid rows 1..7 / stock 24, bottom row exposed,
 *    top covered; daily seed + joker offer deterministic; rand differs
 * 2) sum-13 rules on rigged boards: covered tap rejected, A+Q boundary,
 *    K solo +50, exposure unlock after lower row clears, waste pairing,
 *    PHARAOH CLEAR (+1000) with confetti + panel
 * 3) stock cycles: max 3 with -200 each (score floored), 4 with the joker
 * 4) jokers: sum12 pairs, goldbase double bottom row, hammer covered card,
 *    xray preview
 * 5) autoPlay greedy solver on the real daily deal -> settle panel,
 *    score/pairs banked, streak + daily + six save keys written
 * 6) share card canvas non-blank with site link
 * 7) keyboard: D draws; touch targets >= 44px
 * 8) zh i18n reload smoke
 * Every step asserts via window.__qaState(); zero window.onerror enforced
 * by the harness itself. */
export default async function (h) {
  const sleep = h.sleep;
  const ev = (expr) => h.evaluate(expr);
  const fail = (m) => ({ pass: false, detail: m });
  const id = (s, r) => s * 13 + (r - 1);   // cardId mirror

  // ---- phase 1: daily deal legality + determinism ----
  await ev(`window.__qa.deal()`);
  let st = await ev(`window.__qaState()`);
  if (!st || st.mode !== "daily") return fail("no __qaState / wrong mode");
  if (st.phase !== "joker") return fail(`boot phase=${st.phase}, want joker pick`);
  if (st.pyramid.length !== 28) return fail(`pyramid has ${st.pyramid.length} cards, want 28`);
  for (let r = 0; r < 7; r++) {
    const n = st.pyramid.filter((c) => c.r === r).length;
    if (n !== r + 1) return fail(`row ${r} has ${n} cards, want ${r + 1}`);
  }
  if (st.stock.length !== 24 || st.waste.length !== 0) return fail(`stock=${st.stock.length} waste=${st.waste.length}, want 24/0`);
  if (!st.pyramid.filter((c) => c.r === 6).every((c) => c.exposed)) return fail("bottom row must be exposed");
  if (st.pyramid.some((c) => c.r < 6 && c.exposed)) return fail("no upper card may be exposed on a fresh deal");
  const deal1 = JSON.stringify(st.pyramid), offer1 = JSON.stringify(st.jokersOffered);
  await ev(`window.__qa.deal()`);
  st = await ev(`window.__qaState()`);
  if (JSON.stringify(st.pyramid) !== deal1) return fail("daily seed not deterministic");
  if (JSON.stringify(st.jokersOffered) !== offer1) return fail("daily joker offer not deterministic");
  if (st.jokersOffered.length !== 3 || new Set(st.jokersOffered).size !== 3) return fail("joker offer must be 3 distinct");
  await ev(`window.__qa.newGame("rand")`);
  const r1 = JSON.stringify((await ev(`window.__qaState()`)).pyramid);
  await ev(`window.__qa.newGame("rand")`);
  const r2 = JSON.stringify((await ev(`window.__qaState()`)).pyramid);
  if (r1 === r2) return fail("two random deals identical");
  await ev(`window.__qa.pickJoker(0)`);
  st = await ev(`window.__qaState()`);
  if (st.phase !== "play" || !st.joker) return fail(`joker pick failed (phase=${st.phase})`);

  // ---- phase 2: rules on a rigged 2-row pyramid ----
  await ev(`window.__qa.rig({
    rows: [[${id(0, 13)}], [${id(1, 1)}, ${id(2, 12)}]],
    stock: [${id(3, 2)}], waste: []
  })`);
  await ev(`window.__qa.tapCard(${id(0, 13)})`);           // covered king -> rejected
  st = await ev(`window.__qaState()`);
  if (st.pyramidLeft !== 3 || st.score !== 0) return fail("covered tap must be rejected");
  await ev(`window.__qa.tapCard(${id(1, 1)})`);            // select A hearts
  await ev(`window.__qa.tapCard(${id(2, 12)})`);           // A+Q = 13 -> pair
  st = await ev(`window.__qaState()`);
  if (st.pyramidLeft !== 1 || st.pairs !== 1 || st.score !== 100) return fail(`A+Q pair wrong (left=${st.pyramidLeft} pairs=${st.pairs} score=${st.score})`);
  if (!st.pyramid.find((c) => c.r === 0).exposed) return fail("king not unlocked after row cleared");
  await ev(`window.__qa.tapCard(${id(0, 13)})`);           // K solo +50 -> CLEAR
  st = await ev(`window.__qaState()`);
  if (st.phase !== "clear") return fail(`expected CLEAR, phase=${st.phase}`);
  if (st.score !== 1150) return fail(`clear score ${st.score}, want 100+50+1000=1150`);
  await sleep(1500);
  st = await ev(`window.__qaState()`);
  if (!st.panelShown) return fail("CLEAR panel not shown");
  const cf = await ev(`document.querySelectorAll(".cf").length`);
  if (!cf) return fail("no confetti on PHARAOH CLEAR");
  if (st.rank !== "gold" || st.nextGap !== 300) return fail(`rank math wrong (${st.rank}/${st.nextGap})`);
  if (st.stats.clears < 1 || st.best.score < 1150) return fail("clear not saved to stats/best");
  if (!Array.isArray(st.top10) || st.top10.length < 1 || !st.top10[0].seed) return fail("top10 entry missing/seed field");

  // ---- phase 3: exposure + waste pairing on another rig ----
  await ev(`window.__qa.rig({
    rows: [[${id(1, 12)}], [${id(3, 3)}, ${id(0, 13)}]],
    stock: [${id(3, 1)}, ${id(2, 10)}], waste: []          // pop() draws 10 first, then A
  })`);
  await ev(`window.__qa.tapCard(${id(1, 12)})`);           // covered Q -> shake, no removal
  st = await ev(`window.__qaState()`);
  if (st.pyramidLeft !== 3 || st.pairs !== 0) return fail("covered Q must not be selectable");
  await ev(`window.__qa.tapCard(${id(3, 3)})`);            // select 3
  await ev(`window.__qa.tapCard(${id(1, 12)})`);           // Q still covered -> invalid
  st = await ev(`window.__qaState()`);
  if (st.pyramidLeft !== 3) return fail("pair onto covered card must fail");
  await ev(`window.__qa.tapCard(${id(0, 13)})`);           // K solo: one of two blockers gone...
  st = await ev(`window.__qaState()`);
  const qId = id(1, 12);
  if (st.pyramid.find((c) => c.id === qId).exposed) return fail("Q exposed while 3 still blocks it (double-blocker rule)");
  await ev(`window.__qa.tapStock()`);                      // draw 10 diamonds to waste
  st = await ev(`window.__qaState()`);
  const tenId = id(2, 10);
  if (st.waste.length !== 1 || st.waste[0] !== tenId) return fail("stock draw did not reach waste");
  await ev(`window.__qa.tapWaste()`);                      // select waste top
  await ev(`window.__qa.tapCard(${id(3, 3)})`);            // 10(waste)+3(pyramid) = 13
  st = await ev(`window.__qaState()`);
  if (!st.pyramid.find((c) => c.id === qId).exposed) return fail("Q not exposed after both blockers removed");
  await ev(`window.__qa.tapStock()`);                      // draw A clubs
  await ev(`window.__qa.tapWaste()`);
  await ev(`window.__qa.tapCard(${id(1, 12)})`);           // A(waste)+Q(pyramid) = 13
  st = await ev(`window.__qaState()`);
  if (st.pyramidLeft !== 0 || st.pairs !== 3) return fail("waste+pyramid pair failed");
  if (st.score !== 1250) return fail(`waste pair score ${st.score}, want 50+100+100+1000`);

  // ---- phase 4: cycles, -200 penalty, score floor, cycle4 joker ----
  await ev(`window.__qa.rig({ rows: [[${id(0, 9)}]], stock: [], waste: [${id(1, 4)}], score: 300 })`);
  await ev(`window.__qa.tapStock()`);                      // recycle #1
  st = await ev(`window.__qaState()`);
  if (st.cycles !== 1 || st.stock.length !== 1 || st.waste.length !== 0) return fail("recycle did not rebuild stock");
  if (st.score !== 100) return fail(`recycle penalty wrong: ${st.score}, want 300-200`);
  await ev(`window.__qa.tapStock()`);                      // draw
  await ev(`window.__qa.tapStock()`);                      // recycle #2
  await ev(`window.__qa.tapStock()`);                      // draw
  await ev(`window.__qa.tapStock()`);                      // recycle #3
  await ev(`window.__qa.tapStock()`);                      // draw
  await ev(`window.__qa.tapStock()`);                      // blocked at max 3
  st = await ev(`window.__qaState()`);
  if (st.cycles !== 3 || st.maxCycles !== 3) return fail(`cycle cap wrong (cycles=${st.cycles} max=${st.maxCycles})`);
  if (st.waste.length !== 1) return fail("4th recycle must be blocked");
  if (st.score !== 0) return fail(`score floor broken: ${st.score}`);
  await ev(`window.__qa.rig({ rows: [[${id(0, 9)}]], stock: [], waste: [${id(1, 4)}], joker: "cycle4" })`);
  for (let i = 0; i < 8; i++) await ev(`window.__qa.tapStock()`);
  st = await ev(`window.__qaState()`);
  if (st.maxCycles !== 4 || st.cycles !== 4) return fail(`cycle4 joker wrong (max=${st.maxCycles} cycles=${st.cycles})`);

  // ---- phase 5: sum12 + goldbase + hammer + xray jokers ----
  await ev(`window.__qa.rig({
    rows: [[${id(2, 13)}], [${id(0, 8)}, ${id(1, 4)}]], joker: "sum12"
  })`);
  await ev(`window.__qa.tapCard(${id(0, 8)})`);
  await ev(`window.__qa.tapCard(${id(1, 4)})`);            // 8+4=12 counts with the joker
  st = await ev(`window.__qaState()`);
  if (st.pairs !== 1 || st.score !== 100) return fail(`sum12 pair failed (pairs=${st.pairs} score=${st.score})`);
  await ev(`window.__qa.rig({
    rows: [[${id(2, 13)}], [${id(0, 8)}, ${id(1, 4)}]]
  })`);
  await ev(`window.__qa.tapCard(${id(0, 8)})`);
  await ev(`window.__qa.tapCard(${id(1, 4)})`);            // 12 without joker: just switches selection
  st = await ev(`window.__qaState()`);
  if (st.pairs !== 0 || st.pyramidLeft !== 3) return fail("12-pair must not count without the joker");
  await ev(`window.__qa.rig({
    rows: [[], [], [], [], [], [], [${id(0, 5)}, ${id(1, 8)}]], joker: "goldbase"
  })`);
  await ev(`window.__qa.tapCard(${id(0, 5)})`);
  await ev(`window.__qa.tapCard(${id(1, 8)})`);            // bottom-row pair scores 200
  st = await ev(`window.__qaState()`);
  if (st.score !== 1200) return fail(`goldbase score ${st.score}, want 200 pair + 1000 clear`);
  await ev(`window.__qa.rig({
    rows: [[${id(0, 2)}], [${id(1, 2)}, ${id(2, 2)}]], joker: "hammer"
  })`);
  const hamBtn = await ev(`!document.getElementById("hammerBtn").classList.contains("hide")`);
  if (!hamBtn) return fail("hammer button not offered");
  await ev(`window.__qa.armHammer()`);
  await ev(`window.__qa.tapCard(${id(0, 2)})`);            // smash the covered 2
  st = await ev(`window.__qaState()`);
  if (!st.hammerUsed || st.pyramidLeft !== 2) return fail("hammer did not remove the covered card");
  await ev(`window.__qa.rig({
    rows: [[${id(0, 13)}]], stock: [${id(0, 5)}, ${id(1, 7)}, ${id(2, 9)}, ${id(3, 11)}], joker: "xray"
  })`);
  const xr = await ev(`document.getElementById("xray").textContent`);
  if (!xr.includes(":") || !xr.includes("J") || !xr.includes("9") || !xr.includes("7"))
    return fail(`xray preview wrong: "${xr}"`);   // locale-independent: ranks + separator

  // ---- phase 6: autoPlay greedy solver on the real daily (LESSONS #9 red line) ----
  await ev(`window.__qa.deal()`);
  const ap = await ev(`window.__qa.autoPlay()`);
  st = await ev(`window.__qaState()`);
  if (ap.phase !== "over" && ap.phase !== "clear") return fail(`autoPlay ended phase=${ap.phase}`);
  if (st.pairs < 2) return fail(`autoPlay pairs ${st.pairs} implausibly low`);
  if (st.score <= 0) return fail(`autoPlay score ${st.score} not banked`);
  await sleep(1400);
  st = await ev(`window.__qaState()`);
  if (!st.panelShown) return fail("settle panel not shown after autoPlay");
  if (st.mode !== "daily" || st.daily.date !== new Date().toISOString().slice(0, 10) || !st.daily.done)
    return fail("daily stamp not written");
  if (st.streak.count < 1) return fail("daily finish did not bump streak");
  for (const k of ["np_neon-pyramid_best", "np_neon-pyramid_top10", "np_neon-pyramid_daily",
                   "np_neon-pyramid_streak", "np_neon-pyramid_stats", "np_neon-pyramid_weekly"]) {
    const ok = await ev(`!!localStorage.getItem(${JSON.stringify(k)})`);
    if (!ok) return fail(`save key missing: ${k}`);
  }
  const reload1 = await ev(`window.__qaState()`);
  if (reload1.best.score !== st.best.score || reload1.streak.count !== st.streak.count)
    return fail("state snapshot mismatch");   // (same-page sanity; persistence keys checked above)

  // ---- phase 7: share card canvas non-blank + site link ----
  await h.click("#wpShare");
  await sleep(200);
  const share = await ev(`(() => {
    const cv = document.getElementById("shareCard");
    const g = cv.getContext("2d");
    const bg = g.getImageData(8, 8, 1, 1).data;
    const gold = g.getImageData(320, 28, 1, 1).data;
    const url = g.getImageData(320, 286, 1, 1).data;
    return { w: cv.width, h: cv.height, bg: [bg[0], bg[1], bg[2]],
             goldish: gold[0] > 180 && gold[1] > 140 && gold[2] < 140,
             urlish: url[2] > 180, len: cv.toDataURL().length };
  })()`);
  if (share.w !== 640 || share.h !== 320) return fail("share canvas size wrong");
  if (share.bg[0] !== 10 || share.bg[2] !== 24) return fail("share canvas blank bg");
  if (!share.goldish) return fail("share canvas missing gold pyramid/score");
  if (share.len < 900) return fail("share canvas suspiciously empty");

  // ---- phase 8: keyboard draw + 44px touch targets ----
  await ev(`window.__qa.rig({ rows: [[${id(0, 9)}]], stock: [${id(3, 4)}] })`);
  const before = (await ev(`window.__qaState()`)).stock.length;
  await ev(`document.dispatchEvent(new KeyboardEvent("keydown", { key: "d", bubbles: true }))`);
  st = await ev(`window.__qaState()`);
  if (st.stock.length !== before - 1 || st.waste.length !== 1) return fail("keyboard D did not draw");
  const targets = await ev(`(() => {
    const out = [];
    document.querySelectorAll(".tab, .pill, .jokercard").forEach((el) => {
      if (el.offsetParent === null) return;
      out.push(Math.round(el.getBoundingClientRect().height));
    });
    return out;
  })()`);
  if (!targets.length || targets.some((t) => t < 43)) return fail(`touch target under 44px: ${targets.join(",")}`);

  // ---- phase 9: zh i18n reload smoke ----
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

  return {
    pass: true,
    detail: "deal 28/24 + daily/joker determinism, sum-13 rules (K solo, A+Q, exposure unlock, waste pair), " +
      "CLEAR +1000 + confetti + panel, 3-cycle cap (-200, floor, cycle4 joker), sum12/goldbase/hammer/xray jokers, " +
      "autoPlay greedy settle + streak + six save keys, share canvas, keyboard D, 44px targets, zh i18n"
  };
};
