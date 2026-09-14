/* Per-game scripted playtest for reflex-rush (design doc §8 acceptance).
 * Exercises the GAME_STANDARD hooks (__qaState / __qaToClient / __qaFF) with
 * REAL pointer events: hit targets, timeout a target, blank-tap miss, finish a
 * full 30s run, verify the settlement panel data, persistence across reload,
 * daily determinism across reloads, daily stamp + streak, share card render.
 */
export default async function (h) {
  const out = [];
  const ok = (name, cond, extra) => {
    out.push((cond ? 'PASS ' : 'FAIL ') + name + (extra ? ' [' + extra + ']' : ''));
    return !!cond;
  };
  const st = () => h.evaluate(`window.__qaState ? window.__qaState() : null`).catch(() => null);
  const tap = (x, y) => h.evaluate(`(() => {
    const p = window.__qaToClient(${x}, ${y});
    const cv = document.getElementById('c');
    cv.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true, cancelable: true, pointerId: 1, clientX: p.x, clientY: p.y
    }));
    return true;
  })()`);

  // fresh load
  await h.evaluate(`location.reload()`);
  let s = null;
  for (let i = 0; i < 25; i++) { await h.sleep(250); s = await st(); if (s) break; }
  if (!s) return { pass: false, detail: 'no __qaState hook (GAME_STANDARD violation)' };
  // wipe our own storage for a deterministic baseline
  await h.evaluate(`(() => { Object.values(K).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} }); loadStorage(); return true; })()`);

  // ---- 1) start a classic run with a real pointer tap ----
  s = await st();
  if (s.state !== 'TITLE') return { pass: false, detail: 'expected TITLE, got ' + s.state };
  await tap(360, 620); // CLASSIC button
  await h.sleep(400);
  s = await st();
  if (!ok('start-run', s.state === 'PLAY', 'state=' + s.state)) return { pass: false, detail: out.join('; ') };

  // ---- 2) real pointerdown on the first target: ms popup + combo ----
  let t0 = null;
  for (let i = 0; i < 20; i++) { s = await st(); if (s && s.targetAlive) { t0 = s; break; } await h.sleep(120); }
  if (!t0) return { pass: false, detail: 'no target spawned within 2.4s' };
  await tap(t0.tx, t0.ty);
  await h.sleep(250);
  s = await st();
  ok('hit-records-ms', s.hits === 1 && s.lastMs >= 1, `lastMs=${s.lastMs}`);
  ok('ms-popup', typeof s.msPopup === 'string' && s.msPopup.indexOf('ms') >= 0, 'popup=' + s.msPopup);
  ok('combo-counter', s.combo === 1 && s.score > 0, `combo=${s.combo} score=${s.score}`);

  // two more hits -> combo 3 -> x2 multiplier tier
  for (let n = 0; n < 2; n++) {
    let tt = null;
    for (let i = 0; i < 24; i++) { s = await st(); if (s && s.targetAlive) { tt = s; break; } await h.sleep(110); }
    if (!tt) break;
    await tap(tt.tx, tt.ty);
    await h.sleep(200);
  }
  s = await st();
  ok('combo-x2-tier', s.combo >= 3 && s.mult === 2, `combo=${s.combo} mult=${s.mult}`);

  // ---- 3) let a target expire: miss + combo reset ----
  const missBefore = s.misses;
  let seen = false;
  for (let i = 0; i < 20; i++) { s = await st(); if (s && s.targetAlive) { seen = true; break; } await h.sleep(110); }
  if (!seen) return { pass: false, detail: 'no target appeared before timeout test' };
  for (let i = 0; i < 26; i++) { await h.sleep(130); s = await st(); if (s.misses > missBefore) break; }
  s = await st();
  ok('timeout-miss', s.misses > missBefore && s.combo === 0, `misses=${s.misses} combo=${s.combo}`);

  // ---- 4) blank tap = miss ----
  const m0 = s.misses;
  await tap(60, 1200);
  await h.sleep(250);
  s = await st();
  ok('blank-tap-miss', s.misses === m0 + 1, `misses=${s.misses}`);

  // ---- 5) finish the full 30s run -> settlement panel data ----
  await h.evaluate(`window.__qaFF(35)`);
  s = await st();
  ok('run-ends-over', s.state === 'OVER', 'state=' + s.state);
  ok('settlement-panel', s.score > 0 && s.avgMs > 0 && !!s.rank, `score=${s.score} avg=${s.avgMs}ms rank=${s.rank}`);
  ok('new-best-saved', s.newBest === true && s.best === s.score, `best=${s.best}`);

  // persistence: classic run wrote best/top10/stats/weekly (not daily)
  const keyMap = () => h.evaluate(`(() => {
    const o = {}; Object.values(K).forEach(k => { try { o[k] = localStorage.getItem(k) !== null; } catch (e) {} }); return o;
  })()`);
  const keys1 = await keyMap();
  ok('persist-classic', keys1['np_reflex-rush_best'] && keys1['np_reflex-rush_top10'] &&
    keys1['np_reflex-rush_stats'] && keys1['np_reflex-rush_weekly'] && !keys1['np_reflex-rush_daily'],
  JSON.stringify(keys1));

  // ---- 6) reload: persistence survives ----
  await h.evaluate(`location.reload()`);
  for (let i = 0; i < 25; i++) { await h.sleep(250); s = await st(); if (s) break; }
  ok('persist-reload', s.best > 0 && s.top10n >= 1 && s.games >= 1, `best=${s.best} top10=${s.top10n} games=${s.games}`);

  // ---- 7) daily determinism across reloads ----
  const seq1 = await h.evaluate(`JSON.stringify(window.__qaDailySeq(5))`);
  await h.evaluate(`location.reload()`);
  for (let i = 0; i < 25; i++) { await h.sleep(250); s = await st(); if (s) break; }
  const seq2 = await h.evaluate(`JSON.stringify(window.__qaDailySeq(5))`);
  ok('daily-seed-deterministic', seq1 === seq2 && seq1.length > 10, seq1.slice(0, 80));

  // ---- 8) daily run via page hooks -> stamp + streak, then reload-verify ----
  const daily = await h.evaluate(`(() => {
    startRun('daily');
    let guard = 0;
    while (G.state === 'PLAY' && guard++ < 400) {
      if (G.target && G.runT - G.target.born > 0.12) registerHit();
      window.__qaFF(0.1);
    }
    return window.__qaState();
  })()`);
  ok('daily-run-over', daily.state === 'OVER' && daily.hits > 0, `hits=${daily.hits}`);
  ok('daily-stamp', daily.dailyDone === true, 'dailyDone=' + daily.dailyDone);
  ok('streak-count', daily.streak >= 1, 'streak=' + daily.streak);
  await h.evaluate(`location.reload()`);
  for (let i = 0; i < 25; i++) { await h.sleep(250); s = await st(); if (s) break; }
  const persist2 = await keyMap();
  const dailyJson = await h.evaluate(`localStorage.getItem('np_reflex-rush_daily') || ''`);
  const streakJson = await h.evaluate(`localStorage.getItem('np_reflex-rush_streak') || ''`);
  const today = await h.evaluate(`todayStr()`);
  ok('daily-persist', persist2['np_reflex-rush_daily'] === true && dailyJson.indexOf('"done":true') >= 0 && dailyJson.indexOf(today) >= 0, dailyJson.slice(0, 90));
  ok('streak-persist', persist2['np_reflex-rush_streak'] === true && streakJson.indexOf('"count":1') >= 0, streakJson.slice(0, 90));

  // ---- 9) share card renders non-blank with the site link text ----
  const card = await h.evaluate(`(() => {
    startRun('classic');
    let guard = 0;
    while (G.state === 'PLAY' && guard++ < 400) {
      if (G.target && G.runT - G.target.born > 0.12) registerHit();
      window.__qaFF(0.1);
    }
    const cv = renderShareCard();
    const d = cv.getContext('2d').getImageData(0, 700, 720, 140).data; // strip where the URL is drawn
    let lit = 0;
    for (let i = 0; i < d.length; i += 40) if (d[i] > 60 || d[i + 1] > 60 || d[i + 2] > 60) lit++;
    return { len: cv.toDataURL('image/png').length, lit };
  })()`);
  ok('share-card', card.len > 8000 && card.lit > 20, `len=${card.len} lit=${card.lit}`);

  const fails = out.filter(x => x.indexOf('FAIL') === 0);
  return { pass: fails.length === 0, detail: fails.length ? fails.join('; ') : out.join(' | ') };
}
