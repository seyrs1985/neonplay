/* Rooftop Rush — bootstrap: canvas scaling, input, main loop (no game logic) */
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
  buildBg(20260915);

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

  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) * dpr - offX) / scale,
      y: ((e.clientY - rect.top) * dpr - offY) / scale,
    };
  }
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    const p = pointerPos(e);
    onPress(clamp(p.x, 0, W), clamp(p.y, 0, H));
  }, { passive: false });
  window.addEventListener('pointerup', () => onRelease());
  window.addEventListener('pointercancel', () => onRelease());

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
      e.preventDefault();
      if (e.repeat) return; // keydown repeat must not re-jump
      Sound.resume();
      if (G.state === 'TITLE') { startRun('daily'); Sound.sfx.start(); }
      else if (G.state === 'PLAY') jumpDown();
      else if (G.state === 'PAUSE') { G.state = 'PLAY'; }
      else if (G.state === 'DEAD' && G.deadT > 0.35) { startRun(G.mode, G.routeDate); Sound.sfx.start(); }
    } else if (e.code === 'KeyR') {
      if (G.state === 'PLAY' || G.state === 'DEAD' || G.state === 'FINISH') { startRun(G.mode, G.routeDate); Sound.sfx.start(); }
    } else if (e.code === 'KeyM') {
      Sound.setMuted(!Sound.isMuted());
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (G.state === 'PLAY') G.state = 'PAUSE';
      else if (G.state === 'PAUSE') G.state = 'PLAY';
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'PLAY') G.state = 'PAUSE';
  });
  window.addEventListener('blur', () => { if (G.state === 'PLAY') G.state = 'PAUSE'; });
  document.addEventListener('contextmenu', e => e.preventDefault());
})();
