/* tile-rush QA — design doc acceptance red lines:
 * construction invariants (3k tiles, face counts %3, no same-layer overlap),
 * daily determinism, solveStep clears via construction order -> win panel,
 * tray overflow -> lose panel, 7th-slot triple must clear not lose,
 * props (pull-out / shuffle, 1 per run), score formula, rank thresholds,
 * retention keys + cross-day streak. */
export default async (h) => {
  const fail = (d) => ({ pass: false, detail: d });
  await h.evaluate(`__qa.clearSave(); location.reload()`);
  let ready = false;
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    ready = await h.evaluate(`typeof __qaState === 'function' && !!__qaState()`).catch(() => false);
    if (ready) break;
  }
  if (!ready) return fail("game did not boot");
  const st = () => h.evaluate(`__qaState()`);
  await h.evaluate(`window.__qaFreeze = true`); // deterministic timer (score)

  /* 1) construction invariants on the daily board */
  let s = await st();
  if (s.mode !== "daily") return fail(`expected daily mode, got ${s.mode}`);
  if (s.tilesLeft !== s.k * 3) return fail(`tile count != 3k: ${s.tilesLeft} vs ${s.k * 3}`);
  const counts = {};
  s.tiles.forEach((t) => { counts[t.face] = (counts[t.face] || 0) + 1; });
  for (const f in counts) if (counts[f] % 3 !== 0)
    return fail(`face ${f} count ${counts[f]} not multiple of 3`);
  const byLayer = {};
  s.tiles.forEach((t) => { (byLayer[t.layer] = byLayer[t.layer] || []).push(t); });
  for (const ly in byLayer) {
    const arr = byLayer[ly];
    for (let i = 0; i < arr.length; i++)
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        // same layer shares one offset -> distinct col/row cells never overlap
        if (a.col === b.col && a.row === b.row)
          return fail(`same-layer overlap L${ly} (${a.col},${a.row})`);
      }
  }
  if (Math.max(...Object.keys(byLayer).map(Number)) >= s.L)
    return fail("layer index out of range");

  /* 2) daily determinism: same day -> identical layout (first 10 tiles) */
  const sig = s.tiles.slice(0, 10).map((t) => [t.face, t.col, t.row, t.layer].join(",")).join(";");
  await h.evaluate(`__qa.newGame('daily')`);
  s = await st();
  const sig2 = s.tiles.slice(0, 10).map((t) => [t.face, t.col, t.row, t.layer].join(",")).join(";");
  if (sig !== sig2) return fail("daily seed not deterministic across reloads");
  const dseed = await h.evaluate(`__qa.dailySeed()`);
  const tstr = await h.evaluate(`__qa.todayStr()`);
  if (dseed !== parseInt(tstr.replace(/-/g, ""), 10))
    return fail(`daily seed ${dseed} != YYYYMMDD of ${tstr}`);

  /* 3) solveStep x3: construction-order triples clear, board drains */
  for (let g = 1; g <= 3; g++) {
    await h.evaluate(`__qa.solveStep()`);
    s = await st();
    if (s.tilesLeft !== s.k * 3 - g * 3) return fail(`tilesLeft after group ${g}: ${s.tilesLeft}`);
    if (s.trayLen !== 0) return fail(`tray not drained after group ${g}: ${s.trayLen}`);
    if (s.triples !== g) return fail(`triples counter ${s.triples} != ${g}`);
  }

  /* 4) solve to the end -> win panel, score formula (frozen timer: 500+900+2*150) */
  let guard = 0;
  while (s.state === "playing" && guard++ < 40) { await h.evaluate(`__qa.solveStep()`); s = await st(); }
  await h.sleep(800); // panel reveal + confetti timers
  s = await st();
  if (s.state !== "won") return fail(`daily not solvable via construction order: ${s.state}`);
  const panelUp = await h.evaluate(`!document.getElementById('endPanel').classList.contains('hide')`);
  if (!panelUp) return fail("win panel not shown");
  if (s.score !== 1700) return fail(`score ${s.score} != 500+900+2*150 (no props, 0s)`);
  if (s.streak.count !== 1) return fail(`streak after first daily win: ${s.streak.count}`);
  if (!s.daily.done || s.daily.date !== tstr) return fail("daily done stamp missing");
  const keys = await h.evaluate(`["best","top10","daily","streak","stats","weekly"].map(k=>"np_tile-rush_"+k in localStorage)`);
  if (keys.some((x) => !x)) return fail("retention keys missing: " + JSON.stringify(keys));

  /* 5) cross-day streak +1 */
  await h.evaluate(`__qa.setDay(1); __qa.newGame('daily')`);
  guard = 0; s = await st();
  while (s.state === "playing" && guard++ < 40) { await h.evaluate(`__qa.solveStep()`); s = await st(); }
  await h.sleep(600);
  s = await st();
  if (s.state !== "won" || s.streak.count !== 2)
    return fail(`cross-day streak broken: state=${s.state} streak=${s.streak.count}`);
  await h.evaluate(`__qa.setDay(0)`); // restore clock

  /* 6) tray overflow (bad order) -> lose panel, retry keeps the same deal */
  await h.evaluate(`__qa.newGame('endless','casual', 424242)`);
  s = await st();
  if (s.tilesLeft !== 36) return fail(`casual board size ${s.tilesLeft} != 36`);
  const seen = [];
  for (let p = 0; p < 7; p++) {
    const cur = await st();
    const trayCnt = {}; cur.tray.forEach((f) => { trayCnt[f] = (trayCnt[f] || 0) + 1; });
    const t = cur.tiles.find((x) => x.alive && !x.covered && !seen.includes(x.face)) ||
              cur.tiles.find((x) => x.alive && !x.covered && (trayCnt[x.face] || 0) < 2);
    if (!t) return fail(`cannot build a 7-mismatch tray (pick ${p})`);
    seen.push(t.face);
    await h.evaluate(`__qa.clickTile(${t.id})`);
  }
  s = await st();
  if (s.state !== "lost") return fail(`7 mismatched picks did not lose: state=${s.state} tray=${s.trayLen}`);
  await h.sleep(900); // lose panel delay
  const loseUp = await h.evaluate(`!document.getElementById('endPanel').classList.contains('hide')`);
  if (!loseUp) return fail("lose panel not shown");
  await h.evaluate(`document.getElementById('epRetry').click()`);
  await h.sleep(300);
  s = await st();
  if (s.state !== "playing" || s.seed !== 424242 || s.tilesLeft !== 36)
    return fail(`retry did not restart the same deal: state=${s.state} seed=${s.seed}`);

  /* 7) 7th-slot triple must CLEAR, not lose (order[0] = whole group on the
   *    top layer, so all 3 of its tiles are free from the start) */
  await h.evaluate(`__qa.newGame('endless','casual', 777)`);
  s = await st();
  const top = s.order[0];
  const face0 = s.tiles[top[0]].face;
  await h.evaluate(`__qa.clickTile(${top[0]}); __qa.clickTile(${top[1]})`);
  s = await st();
  if (s.trayLen !== 2) return fail(`7th-slot staging: tray ${s.trayLen} != 2`);
  for (let p = 0; p < 4; p++) {
    const cur = await st();
    const trayCnt = {}; cur.tray.forEach((f) => { trayCnt[f] = (trayCnt[f] || 0) + 1; });
    const t = cur.tiles.find((x) => x.alive && !x.covered && x.face !== face0 && (trayCnt[x.face] || 0) < 2);
    if (!t) return fail(`7th-slot staging stalled at fill ${p}`);
    await h.evaluate(`__qa.clickTile(${t.id})`);
  }
  s = await st();
  if (s.trayLen !== 6) return fail(`pre-7th tray is ${s.trayLen}, expected 6`);
  await h.evaluate(`__qa.clickTile(${top[2]})`);
  s = await st();
  if (s.state !== "playing" || s.trayLen !== 4)
    return fail(`7th-slot triple did not clear: state=${s.state} tray=${s.trayLen}`);

  /* 8) props: pull-out refused on empty tray + once per run; shuffle once */
  await h.evaluate(`__qa.newGame('endless','casual', 999)`);
  const emptyPull = await h.evaluate(`__qa.pullOut()`);
  if (emptyPull) return fail("pull-out fired on empty tray");
  const sh1 = await h.evaluate(`__qa.shuffle()`);
  const sh2 = await h.evaluate(`__qa.shuffle()`);
  if (!sh1 || sh2) return fail(`shuffle prop not limited to 1/run: first=${sh1} second=${sh2}`);
  const ft = (await st()).tiles.filter((t) => t.alive && !t.covered);
  await h.evaluate(`__qa.clickTile(${ft[0].id}); __qa.clickTile(${ft[1].id})`);
  await h.evaluate(`__qa.pullOut()`);
  s = await st();
  if (s.trayLen !== 0 || s.props.pull) return fail(`pull-out failed: tray=${s.trayLen}`);
  if (s.tilesLeft !== 36) return fail(`pull-out did not return tiles: ${s.tilesLeft}`);
  await h.evaluate(`__qa.clickTile(${(await st()).tiles.find((t) => t.alive && !t.covered).id})`);
  const again = await h.evaluate(`__qa.pullOut()`);
  if (again) return fail("pull-out allowed twice in one run");

  /* 9) rank thresholds */
  const rk = await h.evaluate(`[0,599,600,899,900,1199,1200,1499,1500,1799,1800,2099,2100,2500].map(s=>__qa.rankOf(s))`);
  const want = ["bronze","bronze","silver","silver","gold","gold","platinum","platinum","diamond","diamond","master","master","legend","legend"];
  if (JSON.stringify(rk) !== JSON.stringify(want))
    return fail("rank thresholds wrong: " + JSON.stringify(rk));

  const rendered = await h.evaluate(`__qaRender()`);
  if (!rendered) return fail("__qaRender failed");
  return { pass: true, detail: `daily solved by construction order (1700pts), lose+retry same deal, 7th-slot triple clears, props 1/run, rank thresholds, retention keys + cross-day streak OK` };
};
