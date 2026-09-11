/* minesweeper QA (art + i18n round). Black-box (game is IIFE-scoped).
 * Asserts: np_core i18n applies (zh labels), first reveal opens cells without
 * a lose message (first-click safety), flag mode decrements the counter. */
export default async function (h) {
  await h.evaluate(`try{localStorage.setItem("np_lang","zh")}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`typeof npT === 'function'`).catch(() => false);
    if (ok) break;
  }
  const st = await h.evaluate(`(() => ({
    flagLbl: document.getElementById('flagLbl').textContent,
    again: document.getElementById('againLbl').textContent
  }))()`);
  if (st.flagLbl !== "旗标:关" || st.again !== "再来一局")
    return { pass: false, detail: `zh labels not applied: flag="${st.flagLbl}" again="${st.again}"` };

  // first click: cells open, no lose message (first-click safety)
  await h.evaluate(`document.querySelector('.cell[data-i="40"]').click()`);
  await h.sleep(300);
  const play = await h.evaluate(`(() => ({
    opened: document.querySelectorAll('.cell.open').length,
    msg: document.getElementById('msg').textContent
  }))()`);
  if (play.opened < 1 || play.msg !== "")
    return { pass: false, detail: `first click suspicious: opened=${play.opened} msg="${play.msg}"` };

  // flag mode: button toggles, flagging decrements the counter
  await h.evaluate(`document.getElementById('flagBtn').click()`);
  await h.evaluate(`document.querySelector('.cell:not(.open)').click()`);
  await h.sleep(200);
  const flag = await h.evaluate(`(() => ({
    flags: document.querySelectorAll('.cell.flag').length,
    counter: document.getElementById('mines').textContent,
    lbl: document.getElementById('flagLbl').textContent
  }))()`);
  if (flag.flags !== 1 || flag.counter !== "9" || flag.lbl !== "旗标:开")
    return { pass: false, detail: `flag flow broken: flags=${flag.flags} counter=${flag.counter} lbl="${flag.lbl}"` };

  return { pass: true, detail: `zh i18n OK, first-click safe (opened=${play.opened}), flag flow OK` };
}
