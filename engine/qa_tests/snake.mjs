/* snake QA (engine-template phase 1 migration to np_core).
 * Regression: six t() label lines were stranded after </html> (rendered as
 * visible text). Asserts: no stray code after </html>, np_core loaded,
 * zh labels applied, keyboard input turns the snake. */
export default async function (h) {
  await h.evaluate(`try{localStorage.setItem("np_lang","zh")}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`typeof npT === 'function' && document.getElementById('lb-score').textContent.length > 0`).catch(() => false);
    if (ok) break;
  }
  const st = await h.evaluate(`(() => ({
    score: document.getElementById('lb-score').textContent,
    msg: document.getElementById('msg').textContent,
    bodyEndsClean: (document.body.innerText.indexOf('document.getElementById') === -1)
  }))()`);
  if (st.score !== "得分") return { pass: false, detail: `zh label not applied: score="${st.score}"` };
  if (!st.bodyEndsClean) return { pass: false, detail: "stranded JS code still rendered as text" };

  // input response: fresh reset, freeze the tick timer (it drains `queue`
  // every 110ms), then ArrowDown must enqueue a direction change
  await h.evaluate(`(typeof reset === 'function') && reset(); clearInterval(timer); timer = null;`);
  await h.sleep(80);
  const before = await h.evaluate(`(typeof queue !== 'undefined') ? queue.length : -1`);
  await h.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}))`);
  await h.sleep(150);
  const after = await h.evaluate(`(typeof queue !== 'undefined') ? queue.length : -1`);
  if (after <= before) return { pass: false, detail: `keyboard input unresponsive (queue ${before}->${after})` };
  return { pass: true, detail: `zh i18n applied, no stranded code, key input OK (queue ${before}->${after})` };
}
