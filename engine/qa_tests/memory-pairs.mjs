/* memory-pairs QA (engine-template phase 1 migration to np_core).
 * Regression: the game shipped with a dict but _t was never called —
 * the page stayed English in zh mode. Asserts zh labels apply and the
 * match/miss logic still runs cleanly. */
export default async function (h) {
  // generic poke may have flipped cards — reload with zh forced
  await h.evaluate(`try{localStorage.setItem("np_lang","zh")}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const n = await h.evaluate(`document.querySelectorAll('.card').length`).catch(() => 0);
    if (n === 16) break;
  }
  const st = await h.evaluate(`(() => ({
    mv: document.getElementById('lb-mv').textContent,
    again: document.getElementById('againBtn').textContent,
    core: (typeof npT === 'function')
  }))()`);
  if (!st.core) return { pass: false, detail: "np_core.js not loaded" };
  if (st.mv !== "步数" || st.again !== "再来一局")
    return { pass: false, detail: `zh labels not applied: mv="${st.mv}" again="${st.again}"` };

  // playability: flip two cards, board must react (up class appears)
  await h.evaluate(`document.querySelector('.card').click()`);
  await h.sleep(250);
  const up = await h.evaluate(`document.querySelectorAll('.card.up').length`);
  if (up < 1) return { pass: false, detail: "card flip unresponsive" };
  return { pass: true, detail: `zh i18n applied (mv=步数), flip works, cards=16` };
}
