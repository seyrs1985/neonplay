/* Neon Air Hockey — bootstrap: canvas scaling, multi-touch pointer routing, input, main loop (no game logic) */
'use strict';

(() => {
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');

  let scale = 1, offX = 0, offY = 0, dpr = 1;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = window.innerWidth, ch = window.innerHeight;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    scale = Math.min((cw * dpr) / W, (ch * dpr) / H);
    offX = (canvas.width - W * scale) / 2;
    offY = (canvas.height - H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  loadStorage();
  Sound.initFromStorage();

  function frame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.033); // clamp spikes (tab switch, GC)
    if (!window.__qaFreeze) { kbUpdate(pressed); update(dt); }
    draw(ctx);
    requestAnimationFrame(frame);
  }
  let last = performance.now();
  // one synchronous composed frame, independent of rAF (screenshots / CI)
  window.__qaRender = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    draw(ctx);
  };
  requestAnimationFrame(frame);

  function logical(e) {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * dpr;
    const py = (e.clientY - rect.top) * dpr;
    return { x: clamp((px - offX) / scale, 0, W), y: clamp((py - offY) / scale, 0, H) };
  }

  /* ---- multi-touch routing: pointerId -> mallet ownership decided by half ---- */
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    const p = logical(e);
    onPress(p.x, p.y, e.pointerId);
  }, { passive: false });
  canvas.addEventListener('pointermove', e => {
    const p = logical(e);
    onMove(p.x, p.y, e.pointerId);
  });
  // release/cancel on the window: a drag that leaves the canvas must not stick
  window.addEventListener('pointerup', e => {
    const p = logical(e);
    onMove(p.x, p.y, e.pointerId);
    onRelease(e.pointerId, false);
  });
  window.addEventListener('pointercancel', e => onRelease(e.pointerId, true)); // interrupted drag releases the mallet

  /* ---- keyboard: held-key set drives continuous mallet movement ---- */
  const pressed = new Set();
  window.addEventListener('keydown', e => {
    pressed.add(e.code);
    if (e.code === 'Space' || e.code === 'Enter' || e.code.startsWith('Arrow')) {
      e.preventDefault();
      if (!e.repeat) {
        Sound.resume();
        keyAction(e.code);
      }
    } else if (e.code === 'KeyP' || e.code === 'Escape' || e.code === 'KeyR' || e.code === 'KeyM') {
      if (!e.repeat) keyAction(e.code);
    }
  });
  window.addEventListener('keyup', e => pressed.delete(e.code));
  window.addEventListener('blur', () => pressed.clear());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'PLAY') G.state = 'PAUSE';
  });
  window.addEventListener('blur', () => { if (G.state === 'PLAY') G.state = 'PAUSE'; });
  document.addEventListener('contextmenu', e => e.preventDefault());

  // Android shell hooks (MainActivity)
  window.__ntBack = () => {
    if (G.state === 'PLAY') { G.state = 'PAUSE'; return 'handled'; }
    if (G.state === 'PAUSE') { G.state = 'PLAY'; return 'handled'; }
    return 'exit';
  };
  window.__ntLifecycle = ev => {
    if (ev === 'pause' && G.state === 'PLAY') G.state = 'PAUSE';
    if (ev === 'resume') Sound.resume();
  };

  // QA helper: dispatch REAL PointerEvents at logical coordinates (synthetic
  // multi-touch with independent pointerIds exercises the exact input path)
  window.__qaPointer = (type, id, lx, ly) => {
    const rect = canvas.getBoundingClientRect();
    const cx = rect.left + (offX + lx * scale) / dpr;
    const cy = rect.top + (offY + ly * scale) / dpr;
    canvas.dispatchEvent(new PointerEvent(type, {
      pointerId: id, pointerType: 'touch', isPrimary: id === 1,
      clientX: cx, clientY: cy, bubbles: true, cancelable: true,
    }));
  };
})();
