/* sudoku-daily QA — daily-challenge enhancement acceptance:
 * UTC-seeded daily board is deterministic (pure seed fn + reload), the three
 * difficulty tiers are distinct single-solution boards, the solve timer runs
 * and survives reload, completion stamps the day + builds the streak (with the
 * monthly mulligan), and the rank/share text reflects the solve time.
 * Run: node engine/qa_playtest.mjs --slug sudoku-daily --url <sudoku play url> */
export default async function (h) {
  await h.evaluate(`["np_sd_cache","np_sd_daily_done","np_sd_streak","np_sd_daily_v2","np_sd_timer"]
    .forEach(k=>{try{localStorage.removeItem(k)}catch(e){}}); location.reload()`);
  const s0 = await ready();
  if (s0.mode !== "daily") return fail(`not in daily mode: ${s0.mode}`);
  const u = s0.utc;

  // 1) pure seed path: same UTC date+diff → identical board, matches the live one
  const tiers = [];
  for (const d of [0, 1, 2]) {
    const t = await h.evaluate(`[__qa.dailyGivens(${JSON.stringify(u)},${d}), __qa.dailyGivens(${JSON.stringify(u)},${d})]`);
    if (JSON.stringify(t[0]) !== JSON.stringify(t[1])) return fail(`tier ${d}: not deterministic`);
    tiers.push(t[0]);
  }
  if (JSON.stringify(tiers[1]) !== JSON.stringify(s0.givens))
    return fail("live daily board differs from the deterministic seed path");
  for (const [a, b] of [[0, 1], [1, 2]])
    if (JSON.stringify(tiers[a]) === JSON.stringify(tiers[b])) return fail(`tiers ${a}/${b} identical`);
  const clues = tiers.map(t => t.filter(Boolean).length);
  const targets = [42, 36, 30];
  for (let i = 0; i < 3; i++)
    if (Math.abs(clues[i] - targets[i]) > 4) return fail(`tier ${i} clues ${clues[i]} vs target ${targets[i]}`);
  if (!(clues[0] > clues[1] && clues[1] > clues[2])) return fail(`clue counts not ordered: ${clues}`);
  for (let i = 0; i < 3; i++) {
    const nSol = await h.evaluate(`__qa.uniq(${JSON.stringify(tiers[i])})`);
    if (nSol !== 1) return fail(`tier ${i} admits ${nSol} solutions`);
  }

  // 2) reload determinism on the live board
  const g1 = JSON.stringify(s0.givens);
  await h.evaluate(`location.reload()`);
  const s1 = await ready();
  if (JSON.stringify(s1.givens) !== g1) return fail("daily board differs across reloads");

  // 3) fill cells via the normal path → timer ticks
  const sol = await h.evaluate(`__qa.solution()`);
  const empties = s1.givens.map((v, i) => v ? -1 : i).filter(i => i >= 0).slice(0, 3);
  for (const i of empties) await h.evaluate(`__qa.setCell(${i},${sol[i]})`);
  const s2 = await st();
  for (const i of empties) if (s2.user[i] !== sol[i]) return fail(`cell ${i} not filled`);
  const e1 = s2.elapsedSec;
  await h.sleep(1300);
  const e2 = (await st()).elapsedSec;
  if (!(e2 > e1)) return fail(`timer not running: ${e1} → ${e2}`);

  // 4) reload mid-solve → same board, progress + timer resume
  await h.evaluate(`location.reload()`);
  const s3 = await ready();
  if (JSON.stringify(s3.givens) !== g1) return fail("board changed after mid-solve reload");
  for (const i of empties) if (s3.user[i] !== sol[i]) return fail(`cell ${i} lost on reload`);
  if (s3.elapsedSec < e2 - 1) return fail(`timer did not resume: ${s3.elapsedSec} < ${e2}`);

  // 5) complete today's medium daily → stamp + record + streak + share text
  await h.evaluate(`__qa.autoSolve()`);
  await h.sleep(300);
  const w1 = await win();
  if (!w1.shown) return fail("win panel missing after autoSolve (medium)");
  if (w1.stamp !== u) return fail(`daily stamp ${w1.stamp} != today ${u}`);
  if (!w1.stats || !/⏱/.test(w1.stats)) return fail("win stats missing time");
  if (!/🔥\s*1/.test(w1.stats)) return fail("win stats missing streak");
  const s4 = await st();
  if (!s4.daily || s4.daily.date !== u || s4.daily.done[1] !== true || typeof s4.daily.times[1] !== "number")
    return fail("np_sd_daily_v2 not recorded: " + JSON.stringify(s4.daily));
  if (!s4.streak || s4.streak.count !== 1 || s4.streak.last !== u)
    return fail("streak not started: " + JSON.stringify(s4.streak));
  const share1 = await h.evaluate(`__qa.shareText()`);
  if (!/Neon Sudoku/.test(share1) || !/\d+:\d\d/.test(share1) || !/🔥1/.test(share1) || !/github\.io/.test(share1))
    return fail("share text incomplete: " + share1);
  if (await h.evaluate(`document.getElementById("wShare").offsetHeight`) < 44)
    return fail("share button < 44px");

  // 6) hard daily → rank line (fast solve = Legend tier)
  await h.evaluate(`document.getElementById("win").classList.add("hide"); document.getElementById("d2").click()`);
  await h.sleep(150);
  await h.evaluate(`__qa.autoSolve()`);
  const w2 = await win();
  if (!w2.shown) return fail("win panel missing after autoSolve (hard)");
  if (!/🏆|🥇|💎|🥈|🟡|⚪|🟤/.test(w2.stats)) return fail("hard win missing rank line: " + w2.stats);
  if (!/★/.test(w2.stats)) return fail("hard win missing stars");
  const s5 = await st();
  if (s5.streak.count !== 1) return fail("same-day completion must not bump streak: " + s5.streak.count);
  if (s5.daily.done.filter(Boolean).length !== 2) return fail("today progress should be 2/3");

  // 7) streak across days: +1d → count 2; then gap of 2 → monthly mulligan → count 3, protect 0
  await h.evaluate(`__qa.newDay(1); __qa.reboot()`);
  await h.sleep(200);
  await h.evaluate(`__qa.autoSolve()`);
  const s6 = await st();
  if (s6.streak.count !== 2) return fail("streak did not reach 2 next day: " + JSON.stringify(s6.streak));
  await h.evaluate(`__qa.newDay(2); __qa.reboot()`);
  await h.sleep(200);
  await h.evaluate(`__qa.autoSolve()`);
  const s7 = await st();
  if (s7.streak.count !== 3 || s7.streak.protect !== 0)
    return fail("mulligan path failed: " + JSON.stringify(s7.streak));

  return { pass: true, detail: `daily UTC deterministic (clues ${clues.join("/")}, all unique), timer ran+resumed, stamp/record/streak ok (mulligan burned), rank+stars+share ("${share1}") verified` };

  function fail(d) { return { pass: false, detail: d }; }
  function st() { return h.evaluate(`__qaState()`); }
  function win() {
    return h.evaluate(`(() => ({ shown: !document.getElementById('win').classList.contains('hide'),
      stats: document.getElementById('wStats').textContent,
      stamp: localStorage.getItem('np_sd_daily_done') }))()`);
  }
  async function ready() {
    for (let i = 0; i < 25; i++) {
      await h.sleep(300);
      const ok = await h.evaluate(`typeof __qaState === 'function'`).catch(() => false);
      if (ok) return st();
    }
    throw new Error("page never became ready");
  }
}
