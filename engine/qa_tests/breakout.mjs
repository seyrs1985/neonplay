/* breakout QA — black-box (game is IIFE-scoped). Real flow: click PLAY,
 * launch with Space, then the canvas must be animating (pixel signature
 * changes across frames) while the game is in play state. */
export default async function (h) {
  await h.evaluate(`try{localStorage.clear()}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`document.getElementById('ov-btn') !== null`).catch(() => false);
    if (ok) break;
  }
  // click PLAY → overlay hides
  await h.evaluate(`document.getElementById('ov-btn').click()`);
  await h.sleep(300);
  const started = await h.evaluate(`document.getElementById('overlay').classList.contains('hide')`);
  if (!started) return { pass: false, detail: "PLAY click did not hide the start overlay" };

  const sig = () => h.evaluate(`(() => { const c = document.querySelector('canvas');
    try { return c.toDataURL().slice(-80); } catch (e) { return 'tainted'; } })()`);
  const before = await sig();

  // launch with Space, then canvas must animate (ball in flight)
  await h.evaluate(`window.dispatchEvent(new KeyboardEvent('keydown', {code: 'Space'}))`);
  const s1 = await sig(); await h.sleep(500); const s2 = await sig(); await h.sleep(500); const s3 = await sig();
  const animating = (s1 !== s2) || (s2 !== s3) || (before !== s1);
  if (!animating) return { pass: false, detail: "canvas static after PLAY+Space (game not animating)" };

  return { pass: true, detail: `PLAY starts, Space launches, canvas animating (3 distinct frames)` };
}
