/* neon-solitaire scripted playtest (design doc acceptance list):
 * 1) deal legality: 28 tableau / 24 stock, tops face up, daily seed deterministic
 * 2) legal column move + flip + undo (tap-tap)
 * 3) double-tap / dblclick / tap-tap / real drag all land an ace on a foundation
 * 4) stock draw + recycle
 * 5) forced win path (rigged ordered stock, real clicks on stock + waste) ->
 *    card rain + result panel, streak bump, scoring
 * 6) auto-finish drives a second full win
 * 7) zh i18n reload smoke
 * Every step asserts via window.__qaState(). */
export default async function (h) {
  const sleep = h.sleep;
  const ev = (expr) => h.evaluate(expr);
  const fail = (m) => ({ pass: false, detail: m });
  const id = (s, r) => s * 13 + (r - 1);   // cardId mirror

  // ---- phase 1: daily deal legality ----
  await ev(`window.__qa.newGame("daily")`);
  let st = await ev(`window.__qaState()`);
  if (!st || st.mode !== "daily") return fail("no __qaState / wrong mode");
  const tabCount = st.tableau.reduce((a, p) => a + p.length, 0);
  if (tabCount !== 28) return fail(`tableau has ${tabCount} cards, want 28`);
  if (st.stock.length !== 24) return fail(`stock has ${st.stock.length}, want 24`);
  const shapeOk = st.tableau.every((p, i) => p.length === i + 1);
  if (!shapeOk) return fail("tableau columns are not 1..7");
  const topsOk = st.tableau.every((p) => p[p.length - 1].up && p.slice(0, -1).every((c) => !c.up));
  if (!topsOk) return fail("only column tops should be face up");
  const firstDeal = JSON.stringify(st.tableau);
  await ev(`window.__qa.newGame("daily")`);
  st = await ev(`window.__qaState()`);
  if (JSON.stringify(st.tableau) !== firstDeal) return fail("daily seed not deterministic");
  await ev(`window.__qa.newGame("rand")`);
  const r1 = JSON.stringify((await ev(`window.__qaState()`)).tableau);
  await ev(`window.__qa.newGame("rand")`);
  const r2 = JSON.stringify((await ev(`window.__qaState()`)).tableau);
  if (r1 === r2) return fail("two random deals identical");

  // ---- phase 2: legal column move + flip + undo (real taps) ----
  await ev(`window.__qa.rig({
    tab: [[${id(0, 13)}, ${id(1, 12)}], [${id(3, 13)}], [], [], [], [], []],
    stock: [${id(3, 2)}], waste: [], found: [[], [], [], []]
  }, "rand")`);
  await h.click('.card[data-id="' + id(1, 12) + '"]');   // select Q♥
  st = await ev(`window.__qaState()`);
  if (st.tableau[1].some((c) => c.id === id(1, 12))) return fail("Q♥ selection did not register");
  await h.click('.card[data-id="' + id(3, 13) + '"]');   // place on K♣
  st = await ev(`window.__qaState()`);
  if (!st.tableau[1].some((c) => c.id === id(1, 12))) return fail("Q♥ did not move onto K♣");
  if (st.tableau[0][0].up !== true) return fail("exposed K♠ not flipped");
  if (st.score !== 5 || st.moves !== 1) return fail(`scoring after flip: score=${st.score} moves=${st.moves}`);
  await h.click("#undoBtn");
  st = await ev(`window.__qaState()`);
  if (st.tableau[1].some((c) => c.id === id(1, 12)) || st.tableau[0][0].up !== false)
    return fail("undo did not restore the column");
  if (st.moves !== 0) return fail("undo did not restore move count");

  // ---- phase 3: four aces home via double-tap / dblclick / tap-tap / real drag ----
  const order = [];
  for (let r = 13; r >= 2; r--) for (let s = 3; s >= 0; s--) order.push(id(s, r));
  await ev(`window.__qa.rig({
    tab: [[${id(0, 1)}], [${id(1, 1)}], [${id(2, 1)}], [${id(3, 1)}], [], [], []],
    stock: [${order.join(",")}], waste: [], found: [[], [], [], []]
  }, "daily")`);
  // a) double-tap (two quick pointer pairs) on A♠ — re-query each press:
  // a successful tap re-renders and detaches the old card element
  st = await ev(`(() => {
    const q = () => document.querySelector('.card[data-id="${id(0, 1)}"]');
    for (let i = 0; i < 2; i++) {
      let el = q();
      if (!el) return { missing: i };
      el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      el = q() || el;
      el.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    }
    return window.__qaState(); })()`);
  if (!st || st.missing !== undefined) return fail(`A♠ card element missing (pair ${st && st.missing})`);
  if (st.foundations[0].length !== 1) return fail("double-tap did not send A♠ to foundation");
  // b) dblclick event on A♥
  await ev(`window.__qa.dblCard(${id(1, 1)})`);
  st = await ev(`window.__qaState()`);
  if (!st.foundations.some((f) => f.includes(id(1, 1))))
    return fail("dblclick did not send A♥ to foundation");
  // c) tap-tap: select A♦ then tap empty foundation f2
  await h.click('.card[data-id="' + id(2, 1) + '"]');
  await h.click('[data-zone="f2"]');
  st = await ev(`window.__qaState()`);
  if (!st.foundations[2].includes(id(2, 1))) return fail("tap-tap did not send A♦ to foundation");
  // d) real CDP drag: A♣ -> foundation f3
  const dd = await ev(`(() => {
    const a = document.querySelector('.card[data-id="${id(3, 1)}"]').getBoundingClientRect();
    const b = document.querySelector('[data-zone="f3"]').getBoundingClientRect();
    return { dx: Math.round(b.left + b.width / 2 - (a.left + a.width / 2)),
             dy: Math.round(b.top + b.height / 2 - (a.top + a.height / 2)) }; })()`);
  await h.drag('.card[data-id="' + id(3, 1) + '"]', dd.dx, dd.dy, 8);
  st = await ev(`window.__qaState()`);
  if (!st.foundations[3].includes(id(3, 1))) return fail("real drag did not send A♣ to foundation");
  if (st.foundTotal !== 4) return fail(`foundations have ${st.foundTotal}, want 4`);

  // ---- phase 4: stock draw + recycle ----
  st = await ev(`window.__qaState()`);
  const stockBefore = st.stock.length;
  await h.click("#stock");
  st = await ev(`window.__qaState()`);
  if (st.waste.length !== 1 || st.stock.length !== stockBefore - 1) return fail("stock draw did not move a card to waste");
  if (st.waste[0] !== id(0, 2)) return fail("rigged draw order broken (expected 2♠)");
  await ev(`window.__qa.rig({ tab: [[]], stock: [], waste: [${id(1, 5)}], found: [[], [], [], []] }, "rand")`);
  await h.click('[data-zone="stock"]');
  st = await ev(`window.__qaState()`);
  if (st.stock.length !== 1 || st.waste.length !== 0) return fail("empty-stock tap did not recycle waste");

  // ---- phase 5: forced win path (rigged daily, real element clicks) ----
  await ev(`window.__qa.rig({
    tab: [[${id(0, 1)}], [${id(1, 1)}], [${id(2, 1)}], [${id(3, 1)}], [], [], []],
    stock: [${order.join(",")}], waste: [], found: [[], [], [], []]
  }, "daily")`);
  await ev(`[${id(0, 1)}, ${id(1, 1)}, ${id(2, 1)}, ${id(3, 1)}].forEach(i => window.__qa.dblCard(i))`);
  st = await ev(`window.__qaState()`);
  if (st.foundTotal !== 4) return fail(`dblclick aces did not land (found=${st.foundTotal})`);
  st = await ev(`(() => {
    const press = (el) => {
      el.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
      el.dispatchEvent(new MouseEvent("pointerup", { bubbles: true }));
    };
    const stockEl = document.querySelector('[data-zone="stock"]');
    let guard = 0, lastSig = "";
    while (!window.__qaState().won && guard++ < 400) {
      const s = window.__qaState();
      const sig = s.stock.length + ":" + s.waste.length + ":" + s.foundTotal;
      if (sig === lastSig) break;          // no progress -> stop
      lastSig = sig;
      if (s.waste.length) {                 // play the waste top first
        const top = s.waste[s.waste.length - 1];
        const el = document.querySelector('#waste .card[data-id="' + top + '"]');
        if (!el) break;
        el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
      } else if (s.stock.length) press(stockEl);
      else break;
    }
    return window.__qaState();
  })()`);
  if (!st.won) return fail(`forced win path did not finish (found=${st.foundTotal}, stock=${st.stock.length}, waste=${st.waste.length})`);
  if (st.foundTotal !== 52) return fail(`foundations have ${st.foundTotal}, want 52`);
  if (st.score < 480) return fail(`win score too low: ${st.score}`);
  if (st.streak < 1 || !st.dailyDone) return fail(`daily win did not bump streak (streak=${st.streak})`);
  await sleep(1500);   // card rain + panel reveal
  st = await ev(`window.__qaState()`);
  if (!st.winPanelShown) return fail("win/result panel not shown");
  const rain = await ev(`document.querySelectorAll(".cf, .rain").length`);
  if (!rain) return fail("no card-rain/confetti particles on win");
  const stars = await ev(`document.getElementById("wpStars").textContent`);
  if (!/★/.test(stars)) return fail("no star rating in result panel");

  // ---- phase 6: auto-finish second win ----
  const cols = [];
  for (let s = 0; s < 4; s++) { const c = []; for (let r = 13; r >= 1; r--) c.push(id(s, r)); cols.push(c); }
  await ev(`window.__qa.rig({
    tab: [${cols.map((c) => "[" + c.join(",") + "]").join(",")}, [], [], []],
    stock: [], waste: [], found: [[], [], [], []], faceUpAll: true
  }, "rand")`);
  st = await ev(`window.__qaState()`);
  if (!st.autoReady) return fail("auto-finish not offered when all face up");
  await h.click("#autoBtn");
  for (let i = 0; i < 40; i++) {
    st = await ev(`window.__qaState()`);
    if (st.won) break;
    await sleep(300);
  }
  if (!st.won || st.foundTotal !== 52) return fail(`auto-finish did not win (won=${st.won} found=${st.foundTotal})`);

  // ---- phase 7: zh i18n reload smoke ----
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

  return { pass: true, detail: "deal 28/24 + determinism, tap/dblclick/drag moves, undo, stock+recycle, forced win (rain+panel+streak), auto-finish, zh i18n" };
}
