/* word-hive QA — design doc acceptance red lines:
 * board 1: MARS/VENUS/MERCURY/JUPITER submit => yellow banner reveals;
 * one-away feedback on 3-of-4; wrong guesses drain lives => fail reveal;
 * hint ladder limited to 3 uses; library/daily modes switch. */
export default async function (h) {
  await h.evaluate(`try{localStorage.removeItem("np_wh_save")}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`typeof __qaState === 'function'`).catch(() => false);
    if (ok) break;
  }
  const st = () => h.evaluate(`__qaState()`);
  const clickWords = async (words) => {
    for (const w of words) {
      for (let t = 0; t < 5; t++) {
        try { await h.evaluate(`__qa.click('${w}')`); break; }
        catch (e) { await h.sleep(200); if (t === 4) throw e; }
      }
      await h.sleep(60);
    }
  };
  const submit = async () => { await h.evaluate(`__qa.submit()`); await h.sleep(300); };

  await h.evaluate(`document.getElementById('tab-lib').click()`);
  await h.sleep(400);
  await h.evaluate(`[...document.getElementById('libSel').children][0].click()`);
  await h.sleep(400);
  const sLib = await st();
  if (sLib.mode !== "lib" || sLib.board !== 1)
    return { pass: false, detail: `library board 1 not started: mode=${sLib.mode} board=${sLib.board}` };

  // correct group: MARS VENUS MERCURY JUPITER => banner reveals, grid drops to 12
  // (DOM click on MARS proves tiles are tappable; white-box selects the rest)
  await clickWords(['MARS']);
  await h.evaluate(`__qa.selectWords(['MARS','VENUS','MERCURY','JUPITER'])`);
  await submit();
  const banners = await h.evaluate(`document.querySelectorAll('#solvedBanners .banner').length`);
  const gridCount = await h.evaluate(`document.querySelectorAll('.wtile').length`);
  if (banners !== 1) return { pass: false, detail: `group banner not revealed (${banners})` };
  if (gridCount !== 12) return { pass: false, detail: `grid not reduced to 12: ${gridCount}` };

  // one-away: 3 remaining planets + 1 gem
  await h.evaluate(`__qa.selectWords(['VENUS', 'MERCURY', 'JUPITER', 'GOLD'])`);
  await submit();
  const msg1 = await h.evaluate(`document.getElementById('msg').textContent`);
  if (!/away|差/.test(msg1)) return { pass: false, detail: `one-away feedback missing: "${msg1}"` };

  // four more wrong guesses drain the 4 lives => fail reveal + panel
  for (let i = 0; i < 4; i++) {
    await h.evaluate(`__qa.selectWords(['IRON', 'GOLD', 'CRIMSON', 'IVORY'])`);
    await submit();
  }
  await h.sleep(1600); // staged reveal of the 3 remaining groups (~1350ms) before the panel
  const failSt = await st();
  const panelShown = await h.evaluate(`!document.getElementById('endPanel').classList.contains('hide')`);
  if (failSt.lives > 0 || !panelShown)
    return { pass: false, detail: `fail flow broken: lives=${failSt.lives} panel=${panelShown}` };

  // hint ladder: exactly 3 uses then the button disables
  await h.evaluate(`document.getElementById('epRetry').click()`);
  await h.sleep(400);
  for (let i = 0; i < 3; i++) await h.evaluate(`__qa.hint()`);
  await h.sleep(300);
  const hintDisabled = await h.evaluate(`document.getElementById('hintBtn').disabled`);
  if (!hintDisabled) return { pass: false, detail: "hint ladder not limited to 3" };

  return { pass: true, detail: `banner reveal (12 left), one-away OK, fail reveal OK, hints capped at 3` };
}
