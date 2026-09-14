/* Neon Othello — bootstrap: input routing (pointer 3-piece + keyboard), UI wiring,
 * i18n labels, deterministic ?autotest=1 self-check. No game logic here. */
'use strict';

(() => {
  const OT = window.OT, qa = window.__qa;
  const boardEl = document.getElementById('board');
  const el = id => document.getElementById(id);

  /* ---- i18n labels ---- */
  el('lbEasy').textContent = T('easy');
  el('lbMed').textContent = T('med');
  el('lbHard').textContent = T('hard');
  el('lb2p').textContent = '2P';
  el('lbDaily').textContent = T('daily');
  el('lbNew').textContent = T('newG');
  el('lbShare').textContent = T('share');
  el('lbResign').textContent = T('resign');
  el('lbAgain').textContent = T('again');

  function syncLevelButtons() {
    const g = OT.G;
    el('bEasy').classList.toggle('on', g.mode !== '2p' && g.mode !== 'daily' && g.level === 'easy');
    el('bMed').classList.toggle('on', g.mode !== '2p' && g.mode !== 'daily' && g.level === 'medium');
    el('bHard').classList.toggle('on', g.mode !== '2p' && g.mode !== 'daily' && g.level === 'hard');
    el('b2p').classList.toggle('on', g.mode === '2p');
    el('bDaily').classList.toggle('on', g.mode === 'daily');
  }
  OT.onRender = syncLevelButtons;

  /* ---- pointer: down/up/cancel synthesized into cell taps (drag never misfires) ---- */
  let ptr = null;
  boardEl.addEventListener('pointerdown', e => {
    const cell = e.target.closest('.cell');
    if (!cell) return;
    e.preventDefault();
    Sound.resume();
    ptr = { r: +cell.dataset.r, c: +cell.dataset.c, id: e.pointerId };
  }, { passive: false });
  window.addEventListener('pointerup', e => {
    if (!ptr || ptr.id !== e.pointerId) return;
    const cell = e.target.closest ? e.target.closest('.cell') : null;
    const p = ptr; ptr = null;
    if (cell && +cell.dataset.r === p.r && +cell.dataset.c === p.c) OT.clickCell(p.r, p.c);
  });
  window.addEventListener('pointercancel', e => { // interrupted drag = no stray tap
    if (ptr && ptr.id === e.pointerId) ptr = null;
  });

  /* ---- keyboard: arrows walk cells, Enter/Space plays, N new, M mute ---- */
  let kcur = [2, 3];
  function drawKcur() {
    const cells = boardEl.querySelectorAll('.kcur');
    for (const c of cells) c.classList.remove('kcur');
    const cell = OT.cellAt(kcur);
    if (cell) cell.classList.add('kcur');
  }
  OT.onRender = () => { syncLevelButtons(); drawKcur(); };
  function stepCursor(dr, dc) {
    const r = kcur[0] + dr, c = kcur[1] + dc;
    if (r < 0 || r > 7 || c < 0 || c > 7) return;
    kcur = [r, c]; drawKcur(); Sound.sfx.tick();
  }
  window.addEventListener('keydown', e => {
    Sound.resume();
    const m = { ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowDown: [1, 0], ArrowLeft: [0, -1] };
    if (m[e.code]) { e.preventDefault(); stepCursor(m[e.code][0], m[e.code][1]); return; }
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) OT.clickCell(kcur[0], kcur[1]); return; }
    if (e.code === 'KeyN') { OT.newGame(OT.G.mode, OT.G.level); return; }
    if (e.code === 'KeyM') { toggleSound(); return; }
  });

  /* ---- buttons ---- */
  function newAi(level) { Sound.sfx.click(); OT.newGame('ai', level); }
  el('bEasy').addEventListener('click', () => newAi('easy'));
  el('bMed').addEventListener('click', () => newAi('medium'));
  el('bHard').addEventListener('click', () => newAi('hard'));
  el('b2p').addEventListener('click', () => { Sound.sfx.click(); OT.newGame('2p'); });
  el('bDaily').addEventListener('click', () => { Sound.sfx.click(); OT.newGame('daily'); });
  el('bNew').addEventListener('click', () => { Sound.sfx.click(); OT.newGame(OT.G.mode, OT.G.level); });
  el('bShare').addEventListener('click', () => OT.doShare());
  el('bResign').addEventListener('click', () => OT.resign());
  el('bAgain').addEventListener('click', () => { Sound.sfx.click(); OT.newGame(OT.G.mode, OT.G.level); });
  function toggleSound() {
    Sound.setMuted(!Sound.isMuted());
    el('bSound').textContent = Sound.isMuted() ? '🔇' : '🔊';
  }
  el('bSound').addEventListener('click', toggleSound);
  el('bSound').textContent = Sound.isMuted() ? '🔇' : '🔊';
  document.addEventListener('contextmenu', e => e.preventDefault());

  OT.renderAll(); // initial paint (game.js already built; this syncs buttons + cursor)

  /* ---- ?autotest=1 deterministic self-check (LESSONS #9: prove rules, not layout) ---- */
  function runAutotest() {
    const r = {};
    let st, mv;
    // 1) flip counts + rays: playing (3,3) flips exactly 3 discs (up, left, up-left rays)
    qa.load(['........', '.b.b....', '..ww....', '.bw.....', '........', '........', '........', '........'], 1);
    st = qa.state();
    const m33 = st.legal.find(m => m.r === 3 && m.c === 3);
    r.rayCount3 = !!m33 && m33.n === 3;
    // 2) illegal moves rejected first: no-flip square + occupied square
    mv = qa.move([5, 5]);
    r.rejectNoFlip = mv.ok === false && mv.reason === 'no-flip';
    mv = qa.move([2, 2]);
    r.rejectOccupied = mv.ok === false && mv.reason === 'occupied';
    mv = qa.move([3, 3]);
    r.flip3Applied = mv.ok === true && mv.flippedNow === 3 && mv.counts.p1 === 7 && mv.counts.p2 === 0;
    r.rayCells = mv.ok && mv.board[2][3] === 'b' && mv.board[3][2] === 'b' && mv.board[2][2] === 'b' && mv.board[3][3] === 'b';
    // 3) open ray without closing disc never counts: initial board, far corner illegal
    qa.newGame('ai', 'medium');
    st = qa.state();
    r.initial4Legal = st.legalN === 4 && st.counts.p1 === 2 && st.counts.p2 === 2;
    mv = qa.move([0, 0]);
    r.rejectFarCorner = mv.ok === false && mv.reason === 'no-flip';
    // 4) forced pass: side to move empty-handed -> auto-pass to opponent
    qa.load(['.b.bbbbb', '.wwbbbbb', 'wbbbbbbb', 'wbbbbbbb', 'wbbbbbbb', 'wbbbbbbb', 'wbbbbbbb', 'wbbbbbbb'], 2, { mode: '2p' });
    st = qa.state();
    r.whiteStuck = st.legalN === 0;
    st = qa.settle();
    r.autoPass = st.state === 'PLAY' && st.turn === 1 && st.passCount === 1;
    // 5) both stuck -> game over by count (56 cyan vs 6 pink)
    qa.load(['.bbbbbbb', '.bbbbbbb', 'wbbbbbbb', 'wbbbbbbb', 'wbbbbbbb', 'wbbbbbbb', 'wbbbbbbb', 'wbbbbbbb'], 1, { mode: '2p' });
    st = qa.settle();
    r.doublePassEnd = st.state === 'OVER' && st.winner === 1 && st.endReason === 'rNoMoves' && st.counts.p1 === 56 && st.counts.p2 === 6;
    // 6) full board -> over by count
    qa.load(['bwbwbwbw', 'wbwbwbwb', 'bwbwbwbw', 'wbwbwbwb', 'bwbwbwbw', 'wbwbwbwb', 'bwbwbwbw', 'wbwbwbwb'], 1, { mode: '2p' });
    st = qa.settle();
    r.fullBoardEnd = st.state === 'OVER' && st.endReason === 'rFull' && st.counts.p1 + st.counts.p2 === 64;
    // 7) corner-weight AI: corner (1 flip) beats a 2-flip center move at hard; easy is greedy
    qa.load(['........', 'bw......', 'w.b.....', '...b....', '........', '........', '........', '........'], 2, { mode: 'ai', level: 'hard' });
    st = qa.state();
    r.cornerChoiceSetup = st.legalN === 2 && st.legal.some(m => m.r === 0 && m.c === 0 && m.n === 1) && st.legal.some(m => m.r === 4 && m.c === 4 && m.n === 2);
    mv = qa.aiMove();
    r.hardTakesCorner = mv.ok === true && mv.lastMoveInfo && mv.lastMoveInfo.r === 0 && mv.lastMoveInfo.c === 0;
    qa.load(['........', 'bw......', 'w.b.....', '...b....', '........', '........', '........', '........'], 2, { mode: 'ai', level: 'easy' });
    mv = qa.aiMove();
    r.easyGreedyFlips = mv.ok === true && mv.lastMoveInfo && mv.lastMoveInfo.flipped === 2;
    // 8) full seeded game vs hard AI: settles, AI < 800ms every reply, 64 discs
    qa.newGame('ai', 'hard', 20260915);
    let maxMs = 0, guard = 0;
    while (qa.state().state === 'PLAY' && guard++ < 200) {
      st = qa.state();
      if (st.turn === 1) {
        const lg = qa.legal();
        lg.sort((a, b) => b.flips.length - a.flips.length);
        mv = qa.move([lg[0].r, lg[0].c]);
        if (!mv.ok) break;
      } else {
        mv = qa.aiMove();
        if (!mv.ok) break;
        if (mv.ai.ms > maxMs) maxMs = mv.ai.ms;
      }
    }
    st = qa.state();
    r.fullGameSettles = st.state === 'OVER' && st.counts.p1 + st.counts.p2 === 64;
    r.aiUnder800ms = maxMs < 800;
    r.gameHadFlips = st.fx.flips > 20;
    // 9) daily deterministic + differs tomorrow
    const d1 = qa.dailyInfo('2026-09-15'), d2 = qa.dailyInfo('2026-09-15'), d3 = qa.dailyInfo('2026-09-16');
    r.dailyDeterministic = JSON.stringify(d1) === JSON.stringify(d2) && JSON.stringify(d1) !== JSON.stringify(d3) && d1.open.length === 4;
    // 10) persistence key set present
    r.storageKeys = ['np_ot_stats', 'np_ot_rank', 'np_ot_daily', 'np_ot_settings'].every(k => localStorage.getItem(k) !== null);
    // restore a fresh human game
    OT.newGame('ai', 'medium');
    r.allPass = Object.keys(r).filter(k => k !== 'allPass').every(k => r[k] === true);
    window.__autotest = r;
  }
  if (new URLSearchParams(location.search).get('autotest')) {
    try { runAutotest(); } catch (e) {
      window.__autotest = { allPass: false, exception: String(e && e.message || e) };
    }
  }
})();
