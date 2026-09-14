/* Neon Typing — bootstrap: canvas scaling, input (keyboard / pointer / mobile
 * input box), main loop. No game logic here (game.js) and no audio (audio.js). */
'use strict';

(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  const tin = document.getElementById('tin');

  /* touch-first device (phone/tablet) -> on-screen keyboard via a real input
   * box (>=44px, styled in style.css) + simple short-word practice mode.
   * A touch-capable laptop with a mouse/trackpad stays desktop. */
  const coarse = window.matchMedia && matchMedia('(pointer: coarse)').matches;
  const TOUCH = (('ontouchstart' in window) && coarse) || /Android|iPhone|iPad|Mobi/i.test(navigator.userAgent);
  window.NT_TOUCH = TOUCH;

  let scale = 1, offX = 0, offY = 0, dpr = 1;
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = window.innerWidth, ch = window.innerHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    scale = Math.min(canvas.width / W, canvas.height / H);
    offX = (canvas.width - W * scale) / 2;
    offY = (canvas.height - H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  loadStorage();
  Sound.initFromStorage();

  function paint() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    draw(ctx);
  }
  window.__qaRender = paint; // synchronous frame for screenshots / headless QA

  let last = performance.now();
  function frame() {
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.033); // clamp spikes (tab switch, GC)
    if (!window.__qaFreeze) update(dt);
    paint();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  /* ---------- pointer ---------- */
  function toLogical(e) {
    const r = canvas.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    return { x: Math.max(0, Math.min(W, x)), y: Math.max(0, Math.min(H, y)) };
  }
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    Sound.resume();
    const { x, y } = toLogical(e);
    onPress(x, y);
    if (TOUCH && G.state === 'PLAY' && tin) { tin.classList.add('show'); try { tin.focus({ preventScroll: true }); } catch (err) { tin.focus(); } }
  }, { passive: false });
  window.addEventListener('pointerup', () => {});
  window.addEventListener('pointercancel', () => {});
  if (TOUCH && tin) {
    // simple mode on touch: the input box opens the OS keyboard; feed letters
    tin.classList.add('show');
    tin.placeholder = '';
    tin.addEventListener('pointerdown', e => e.stopPropagation());
    tin.addEventListener('input', () => {
      Sound.resume();
      const v = tin.value;
      tin.value = '';
      for (const ch of v) typeLetter(ch);
    });
    tin.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); keyAction('Enter', 'Enter'); }
      if (e.code === 'KeyM' && e.ctrlKey) return; // let browser shortcuts through
      e.stopPropagation();
    });
  }

  /* ---------- physical keyboard (desktop-first) ---------- */
  window.addEventListener('keydown', e => {
    // ignore IME composition and plain modifier keys
    if (e.isComposing || e.key === 'Process') return;
    if (['ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight', 'AltLeft', 'AltRight',
      'MetaLeft', 'MetaRight', 'CapsLock', 'Tab'].includes(e.code)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return; // browser shortcuts stay
    // page has no scroll, but stop Space paging inside the iframe anyway
    if (e.code === 'Space' || e.code === 'Enter' || /^Key[A-Z]$/.test(e.code)) e.preventDefault();
    if (e.target === tin) return; // mobile input path handles its own keys
    Sound.resume();
    keyAction(e.code, e.key);
  });

  /* ---------- lifecycle ---------- */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'PLAY') G.state = 'PAUSE';
  });
  window.addEventListener('blur', () => { if (G.state === 'PLAY') G.state = 'PAUSE'; });
  document.addEventListener('contextmenu', e => e.preventDefault());

  window.__ntBack = () => {
    if (G.state === 'PLAY') { G.state = 'PAUSE'; return 'handled'; }
    if (G.state === 'PAUSE') { G.state = 'PLAY'; return 'handled'; }
    return 'exit';
  };
  window.__ntLifecycle = ev => {
    if (ev === 'pause' && G.state === 'PLAY') G.state = 'PAUSE';
    if (ev === 'resume') Sound.resume();
  };
})();
