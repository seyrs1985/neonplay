/* neon-hangman QA — acceptance red lines (per designs/pending/neon-hangman.md):
 * 1) injected-answer win flow via virtual-key DOM pointerdown clicks
 * 2) 6-miss fail flow: gallows full + answer revealed + retry unranked
 * 3) hint sentence always displayed and matches the bank entry
 * 4) keyboard letter coloring (hit cyan=g / miss pink=x)
 * 5) category switch picks a word from the new category bank
 * 6) daily determinism: same UTC day => same word+category for everyone
 * 7) physical keyboard wiring (synthetic keydown drives guesses)
 * 8) 375px viewport: no horizontal overflow */
export default async function (h) {
  await h.evaluate(`try{["np_hg_daily","np_hg_free","np_hg_streak","np_hg_stats"].forEach(k=>localStorage.removeItem(k))}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    if (await h.evaluate(`typeof __qaState === 'function'`).catch(() => false)) break;
  }
  const st = () => h.evaluate(`__qaState()`);
  await h.evaluate(`window.__qaFreeze = true; document.body.classList.add("nofx")`);
  await h.sleep(100);

  // 1) win flow with real DOM key clicks (proves virtual keyboard is tappable)
  await h.evaluate(`__qa.setAnswer("TIGER")`);
  for (const ch of ["T", "I", "G"]) await h.evaluate(`__qa.clickKey("${ch}")`);
  let s = await st();
  if (s.status !== "playing" || s.guessed !== "GIT")
    return { pass: false, detail: `virtual key clicks not registered: guessed=${s.guessed} status=${s.status}` };
  await h.evaluate(`__qa.clickKey("E"); __qa.clickKey("R")`);
  await h.sleep(150);
  s = await st();
  if (s.status !== "won" || s.wrong !== 0) return { pass: false, detail: `win flow broken: ${s.status}/${s.wrong}` };
  if (s.wordCells.join("") !== "TIGER") return { pass: false, detail: `word not fully revealed: ${s.wordCells.join("")}` };
  if (!s.panelOpen) return { pass: false, detail: "win end panel not shown" };

  // 4) keyboard coloring: hits g
  if (s.keys.T !== "g" || s.keys.I !== "g")
    return { pass: false, detail: `hit keys not colored g: T=${s.keys.T} I=${s.keys.I}` };

  // 2) fail flow: 6 misses -> lost + reveal + retry unranked
  await h.evaluate(`__qa.setAnswer("ZEBRA"); document.getElementById("endPanel").classList.add("hide")`);
  for (const ch of ["X", "Y", "J", "Q", "W"]) await h.evaluate(`__qa.clickKey("${ch}")`);
  s = await st();
  if (s.status !== "playing" || s.wrong !== 5) return { pass: false, detail: `misses not counted: ${s.wrong} status=${s.status}` };
  if (s.keys.X !== "x" || s.keys.W !== "x")
    return { pass: false, detail: `miss keys not colored x: X=${s.keys.X} W=${s.keys.W}` };
  await h.evaluate(`__qa.clickKey("V")`);
  await h.sleep(200);
  s = await st();
  if (s.status !== "lost" || s.wrong !== 6) return { pass: false, detail: `6-miss loss broken: ${s.status}/${s.wrong}` };
  if (s.parts !== 6) return { pass: false, detail: `gallows parts drawn ${s.parts} want 6` };
  if (s.wordCells.join("") !== "ZEBRA") return { pass: false, detail: `answer not revealed on loss: ${s.wordCells.join("")}` };
  const epWord = await h.evaluate(`document.getElementById("epWord").textContent`);
  if (epWord !== "ZEBRA") return { pass: false, detail: `end panel word wrong: "${epWord}"` };
  // retry same word: state resets, unranked, word identical
  await h.evaluate(`__qa.retry()`);
  s = await st();
  if (s.status !== "playing" || s.guessed !== "" || s.answer !== "ZEBRA" || s.ranked !== false)
    return { pass: false, detail: `retry-same-word broken: ${s.status}/${s.guessed}/${s.answer}/ranked=${s.ranked}` };

  // 3) hint sentence always visible (word-meaning display)
  await h.evaluate(`__qa.setAnswer("PENGUIN")`);
  s = await st();
  if (!s.hint || s.hint.length < 8) return { pass: false, detail: `bank hint missing: "${s.hint}"` };
  if (s.hintText.indexOf(s.hint) < 0 || s.hintShown !== true)
    return { pass: false, detail: `hint not displayed on board: "${s.hintText}"` };

  // 5) category switch (practice mode): word comes from the new bank
  await h.evaluate(`__qa.setMode("practice"); __qa.setCat("food")`);
  s = await st();
  const inFood = await h.evaluate(`NP_HG_WORDS.BY.food.some(e => e.w === __qaState().answer)`);
  if (s.mode !== "practice" || s.cat !== "food" || !inFood)
    return { pass: false, detail: `category switch broken: mode=${s.mode} cat=${s.cat} inFood=${inFood}` };
  await h.evaluate(`__qa.setCat("geo")`);
  s = await st();
  const inGeo = await h.evaluate(`NP_HG_WORDS.BY.geo.some(e => e.w === __qaState().answer)`);
  if (s.cat !== "geo" || !inGeo) return { pass: false, detail: `second category switch broken: cat=${s.cat} inGeo=${inGeo}` };

  // 6) daily determinism: same UTC day => same word + category (global same-word)
  const det = await h.evaluate(`(() => {
    const a = __qa.dailyFor(__qa.utcDayStr()), b = __qa.dailyFor(__qa.utcDayStr());
    const okBank = NP_HG_WORDS.BY[a.cat].some(e => e.w === a.w);
    const rot = new Set(); for (let i = 0; i < 14; i++) rot.add(__qa.dailyFor(__qa.utcDayStr(-i)).cat);
    return { same: a.w === b.w && a.cat === b.cat, w: a.w, cat: a.cat, okBank, rot: rot.size };
  })()`);
  if (!det.same || !det.okBank) return { pass: false, detail: `daily word not deterministic/in-bank: ${JSON.stringify(det)}` };
  if (det.rot < 2) return { pass: false, detail: `daily category rotation stuck (${det.rot} cats in 14 days)` };
  // daily board actually serves today's deterministic word
  await h.evaluate(`__qa.setMode("daily")`);
  s = await st();
  if (s.answer !== det.w || s.cat !== det.cat) return { pass: false, detail: `daily board mismatch: ${s.answer}/${s.cat} want ${det.w}/${det.cat}` };

  // 7) physical keyboard wiring (synthetic keydown reaches the game)
  await h.evaluate(`__qa.setAnswer("SHARK")`);
  await h.evaluate(`document.dispatchEvent(new KeyboardEvent("keydown", {key: "s", bubbles: true}));
    document.dispatchEvent(new KeyboardEvent("keydown", {key: "H", bubbles: true}))`);
  s = await st();
  if (s.guessed !== "HS" || s.wordCells.join("") !== "SH")
    return { pass: false, detail: `physical keyboard guesses broken: guessed=${s.guessed} cells=${s.wordCells.join("")}` };

  // streak stack sanity (pure sim, site-standard monthly mulligan)
  const sim = await h.evaluate(`(() => {
    const st = __qa.freshStreak();
    __qa.streakApply(st, __qa.utcDayStr(-3));
    const c1 = st.count;
    __qa.streakApply(st, __qa.utcDayStr(-1));
    return { c1, c2: st.count, protect: st.protect };
  })()`);
  if (sim.c1 !== 1 || sim.c2 !== 2 || sim.protect !== 0)
    return { pass: false, detail: `streak/mulligan sim wrong: ${JSON.stringify(sim)}` };

  // 8) mobile width sanity + zero console errors is enforced by the harness
  const overflow = await h.evaluate(`document.documentElement.scrollWidth - document.documentElement.clientWidth`);
  if (overflow > 1) return { pass: false, detail: `horizontal overflow ${overflow}px` };

  return { pass: true, detail: `win/6-miss-reveal/retry-unranked, hint shown, key colors, cat switch ×2, daily same-word (${det.w}/${det.cat}, rot ${det.rot}), physical keys, streak mulligan, overflow 0 — OK` };
}
