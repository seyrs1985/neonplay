/* Neon Hoops — bootstrap: canvas scaling, input, main loop (no game logic) */
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

  initStars();
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
    if (!window.__qaFreeze) update(dt);
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

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    const p = logical(e);
    onPress(p.x, p.y);
  }, { passive: false });
  canvas.addEventListener('pointermove', e => {
    const p = logical(e);
    onMove(p.x, p.y);
  });
  // release/cancel on the window: a drag that leaves the canvas must not stick
  window.addEventListener('pointerup', e => {
    const p = logical(e);
    onMove(p.x, p.y);
    onRelease();
  });
  window.addEventListener('pointercancel', () => onRelease()); // interrupted drag = cancel, no shot

  window.addEventListener('keydown', e => {
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
})();
