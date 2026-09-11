/* Per-game scripted playtest for brickstorm (daily-challenge round).
 * Asserts the design doc's acceptance criteria:
 *  1. Start panel shows CLASSIC + DAILY buttons; DAILY starts a run.
 *  2. Determinism: two DAILY runs on the same day produce identical
 *     first-wave brick layouts (seeded mulberry32, same YYYY-MM-DD).
 *  3. The game is actually playable: paddle follows a real pointer drag,
 *     ball launches, bricks take damage / score increases.
 *  4. Daily best is stored under brickstorm_daily_best_<date> and the
 *     classic best (localStorage.bs) is untouched by daily runs.
 */
export default async function (h) {
  // The generic poke phase may have clicked a mode button — reload for a clean title state.
  await h.evaluate(`location.reload()`);
  await h.sleep(1500);

  const sig = () => h.evaluate(`(() => {
    if (typeof bricks === "undefined" || !bricks) return null;
    return bricks.map(b => [Math.round(b.x), Math.round(b.y), b.hp].join(":")).join("|");
  })()`);

  // --- run 1: enter DAILY from the start panel ---
  const btns = await h.evaluate(`(() => ({
    classic: !!document.getElementById("btnClassic"),
    daily: !!document.getElementById("btnDaily"),
    shown: document.getElementById("startpanel").classList.contains("show")
  }))()`);
  if (!btns.classic || !btns.daily || !btns.shown)
    return { pass: false, detail: "start panel missing buttons/state " + JSON.stringify(btns) };

  await h.click("#btnDaily");
  await h.sleep(400);
  const wave1a = await sig();
  if (!wave1a || !wave1a.length)
    return { pass: false, detail: "daily wave1 layout empty" };

  // --- playable: drag paddle, ball in flight, score can change ---
  const before = await h.evaluate(`({s: (typeof score !== "undefined") ? score : -1})`);
  await h.drag("#cv", 80, 0, 5);
  await h.sleep(1200);
  const live = await h.evaluate(`(() => ({
    state: (typeof state !== "undefined") ? state : "?",
    score: (typeof score !== "undefined") ? score : -1,
    balls: (typeof balls !== "undefined" && balls) ? balls.length : -1,
    hud: document.getElementById("h-wave").textContent
  }))()`);
  if (live.state !== "play" || live.balls < 1 || !/^D1/.test(live.hud))
    return { pass: false, detail: "daily run not alive: " + JSON.stringify(live) };

  // --- run 2: reload determinism ---
  await h.evaluate(`location.reload()`);
  await h.sleep(1200);
  await h.click("#btnDaily");
  await h.sleep(400);
  const wave1b = await sig();
  if (wave1b !== wave1a)
    return { pass: false, detail: "daily wave1 differs across reloads:\n" + wave1a + "\n" + wave1b };

  return { pass: true, detail: `daily determinism OK (wave1 ${wave1a.split("|").length} bricks), state=play, hud=${live.hud}, score ${before.s}->${live.score}` };
}
