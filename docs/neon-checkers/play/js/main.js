/* Neon Checkers — bootstrap: input routing (pointer 3-piece + keyboard), UI wiring,
 * i18n labels, deterministic ?autotest=1 self-check. No game logic here. */
'use strict';

(() => {
  const CK = window.CK, qa = window.__qa;
  const boardEl = document.getElementById('board');
  const el = id => document.getElementById(id);

  /* ---- i18n labels ---- */
  el('lbEasy').textContent = T('easy');
  el('lbMed').textContent = T('med');
  el('lbHard').textContent = T('hard');
  el('lb2p').textContent = '2P';
  el('lbDaily').textContent = T('daily');
  el('lbNew').textContent = T('newG');
  el('lbDraw').textContent = T('draw');
  el('lbResign').textContent = T('resign');
  el('lbAgain').textContent = T('again');

  function syncLevelButtons() {
    const g = CK.G;
    el('bEasy').classList.toggle('on', g.mode !== '2p' && g.mode !== 'daily' && g.level === 'easy');
    el('bMed').classList.toggle('on', g.mode !== '2p' && g.mode !== 'daily' && g.level === 'medium');
    el('bHard').classList.toggle('on', g.mode !== '2p' && g.mode !== 'daily' && g.level === 'hard');
    el('b2p').classList.toggle('on', g.mode === '2p');
    el('bDaily').classList.toggle('on', g.mode === 'daily');
  }
  CK.onRender = syncLevelButtons;

  /* ---- pointer: down/up/cancel synthesized into cell taps (drag never misfires) ---- */
  let ptr = null;
  boardEl.addEventListener('pointerdown', e => {
    const cell = e.target.closest('.cell.dark');
    if (!cell) return;
    e.preventDefault();
    Sound.resume();
    ptr = { r: +cell.dataset.r, c: +cell.dataset.c, id: e.pointerId };
  }, { passive: false });
  window.addEventListener('pointerup', e => {
    if (!ptr || ptr.id !== e.pointerId) return;
    const cell = e.target.closest ? e.target.closest('.cell.dark') : null;
    const p = ptr; ptr = null;
    if (cell && +cell.dataset.r === p.r && +cell.dataset.c === p.c) CK.clickCell(p.r, p.c);
  });
  window.addEventListener('pointercancel', e => { // interrupted drag = no stray tap
    if (ptr && ptr.id === e.pointerId) ptr = null;
  });

  /* ---- keyboard: arrows walk dark cells, Enter/Space taps, Esc deselects ---- */
  let kcur = [5, 2];
  function drawKcur() {
    const cells = boardEl.querySelectorAll('.kcur');
    for (const c of cells) c.classList.remove('kcur');
    const cell = CK.cellAt(kcur);
    if (cell) cell.classList.add('kcur');
  }
  CK.onRender = () => { syncLevelButtons(); drawKcur(); };
  function stepCursor(dr, dc) {
    let r = kcur[0], c = kcur[1];
    for (let i = 0; i < 8; i++) {
      r += dr; c += dc;
      if (r < 0 || r > 7 || c < 0 || c > 7) return;
      if ((r + c) % 2 === 1) { kcur = [r, c]; drawKcur(); Sound.sfx.click(); return; }
    }
  }
  window.addEventListener('keydown', e => {
    Sound.resume();
    const m = { ArrowUp: [-1, -1], ArrowRight: [-1, 1], ArrowDown: [1, 1], ArrowLeft: [1, -1] };
    if (m[e.code]) { e.preventDefault(); stepCursor(m[e.code][0], m[e.code][1]); return; }
    if (e.code === 'Enter' || e.code === 'Space') { e.preventDefault(); if (!e.repeat) CK.clickCell(kcur[0], kcur[1]); return; }
    if (e.code === 'Escape') { CK.deselect(); return; }
    if (e.code === 'KeyN') { CK.newGame(CK.G.mode, CK.G.level); return; }
    if (e.code === 'KeyM') { toggleSound(); return; }
  });

  /* ---- buttons ---- */
  function newAi(level) { Sound.sfx.click(); CK.newGame('ai', level); }
  el('bEasy').addEventListener('click', () => newAi('easy'));
  el('bMed').addEventListener('click', () => newAi('medium'));
  el('bHard').addEventListener('click', () => newAi('hard'));
  el('b2p').addEventListener('click', () => { Sound.sfx.click(); CK.newGame('2p'); });
  el('bDaily').addEventListener('click', () => { Sound.sfx.click(); CK.newGame('daily'); });
  el('bNew').addEventListener('click', () => { Sound.sfx.click(); CK.newGame(CK.G.mode, CK.G.level); });
  el('bDraw').addEventListener('click', () => CK.offerDraw());
  el('bResign').addEventListener('click', () => CK.resign());
  el('bAgain').addEventListener('click', () => { Sound.sfx.click(); CK.newGame(CK.G.mode, CK.G.level); });
  function toggleSound() {
    Sound.setMuted(!Sound.isMuted());
    el('bSound').textContent = Sound.isMuted() ? '🔇' : '🔊';
  }
  el('bSound').addEventListener('click', toggleSound);
  el('bSound').textContent = Sound.isMuted() ? '🔇' : '🔊';
  document.addEventListener('contextmenu', e => e.preventDefault());

  CK.renderAll(); // initial paint (game.js already built; this syncs buttons + cursor)

  /* ---- ?autotest=1 deterministic self-check (LESSONS #9: prove rules, not layout) ---- */
  function runAutotest() {
    const r = {};
    let st, mv;
    // 1) forced capture: quiet move rejected with must-capture, capture accepted
    qa.load(['........', '........', '...b....', '..r.....', '........', '........', '........', '........'], 1);
    st = qa.state();
    r.mustCapFlag = st.legalN === 1 && st.mustCap === true;
    mv = qa.move([3, 2], [4, 3]);
    r.mustCapReject = mv.ok === false && mv.reason === 'must-capture';
    mv = qa.move([3, 2], [1, 4]);
    r.captureDone = mv.ok === true && mv.counts.p2 === 0 && mv.counts.p1 === 1;
    // 2) maximal multi-jump: stopping halfway is illegal, full path captures 2
    qa.load(['........', '........', '...b....', '........', '...b....', '..r.....', '........', '........'], 1);
    st = qa.state();
    const lgd = qa.legal();
    r.doubleOnly = lgd.length >= 1 && lgd.every(m => m.caps.length >= 2);
    mv = qa.move([5, 2], [3, 4]);
    r.jumpForced = mv.ok === false && mv.reason === 'incomplete-jump';
    mv = qa.move([5, 2], [1, 2]);
    r.doubleJump = mv.ok === true && mv.capturedNow === 2 && mv.counts.p2 === 0 && mv.counts.p1 === 1;
    // 3) king retreats, man does not
    qa.load(['........', '........', '........', '........', '....R...', '........', '........', '........'], 1);
    mv = qa.move([4, 4], [5, 5]);
    r.kingRetreat = mv.ok === true;
    qa.load(['........', '........', '........', '........', '....r...', '........', '........', '........'], 1);
    mv = qa.move([4, 4], [5, 5]);
    r.manNoRetreat = mv.ok === false;
    // 4) crowning on far row (jump lands on row 0 -> king, move ends)
    qa.load(['........', '.b......', '..r.....', '........', '........', '........', '........', '........'], 1);
    mv = qa.move([2, 2], [0, 0]);
    r.crownEnds = mv.ok === true && mv.crownedNow === true && mv.board[0][0] === 'R';
    // 5) no legal moves -> loss for side to move; no pieces -> loss too
    qa.load(['..b.....', '.b......', 'r.......', '........', '........', '........', '........', '........'], 1);
    st = qa.state();
    r.blockedZero = st.legalN === 0;
    st = qa.settle();
    r.blockedLoss = st.state === 'OVER' && st.winner === 2 && st.endReason === 'rBlocked';
    qa.load(['........', '.b......', '.b......', '........', '........', '........', '........', '........'], 1);
    st = qa.settle();
    r.noPiecesLoss = st.state === 'OVER' && st.winner === 2 && st.endReason === 'rPieces';
    // 6) full seeded game vs hard AI: settles, AI replies < 800ms every move
    qa.newGame('ai', 'hard', 20260915);
    let maxMs = 0, guard = 0;
    while (qa.state().state === 'PLAY' && guard++ < 300) {
      st = qa.state();
      if (st.turn === 1) {
        const lg = qa.legal();
        lg.sort((a, b) => b.caps.length - a.caps.length);
        mv = qa.move(lg[0].from, lg[0].path[lg[0].path.length - 1]);
        if (!mv.ok) break;
      } else {
        mv = qa.aiMove();
        if (!mv.ok) break;
        if (mv.ai.ms > maxMs) maxMs = mv.ai.ms;
      }
    }
    st = qa.state();
    r.fullGameSettles = st.state === 'OVER' && (st.winner === 1 || st.winner === 2 || st.winner === 0);
    r.aiUnder800ms = maxMs < 800;
    r.gameHadCaptures = st.fx.captures > 0;
    // 7) daily deterministic + differs tomorrow
    const d1 = qa.dailyInfo('2026-09-15'), d2 = qa.dailyInfo('2026-09-15'), d3 = qa.dailyInfo('2026-09-16');
    r.dailyDeterministic = JSON.stringify(d1) === JSON.stringify(d2) && JSON.stringify(d1) !== JSON.stringify(d3);
    // 8) persistence key set present
    r.storageKeys = ['np_ck_stats', 'np_ck_streak', 'np_ck_daily', 'np_ck_settings'].every(k => localStorage.getItem(k) !== null);
    // restore a fresh human game
    CK.newGame('ai', 'medium');
    r.allPass = Object.keys(r).filter(k => k !== 'allPass').every(k => r[k] === true);
    window.__autotest = r;
  }
  if (new URLSearchParams(location.search).get('autotest')) {
    try { runAutotest(); } catch (e) {
      window.__autotest = { allPass: false, exception: String(e && e.message || e) };
    }
  }
})();
