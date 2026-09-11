/* Neon Tide — bootstrap: canvas scaling, input, main loop */
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

  function frame() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COL.bg0;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    dt = Math.min(dt, 0.033); // clamp spikes (tab switch, GC)
    if (!window.__ntFreeze) update(dt);
    draw(ctx);
    requestAnimationFrame(frame);
  }
  let last = performance.now();
  // one synchronous composed frame, independent of rAF (store shots / CI)
  window.__ntRender = () => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COL.bg0;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    draw(ctx);
  };
  requestAnimationFrame(frame);

  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * dpr;
    const py = (e.clientY - rect.top) * dpr;
    return { px, py };
  }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    const { px, py } = pointerPos(e);
    const p = toLogical(px, py, scale, scale, offX, offY);
    onPress(clamp(p.x, 0, W), clamp(p.y, 0, H));
  }, { passive: false });
  window.addEventListener('pointerup', () => onRelease());
  window.addEventListener('pointercancel', () => onRelease());

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (!e.repeat) {
        Sound.resume();
        if (G.state === 'TITLE') { startRun(); G.held = true; }
        else if (G.state === 'OVER' && G.deathT > 0.6) { startRun(); G.held = true; }
        else if (G.state === 'PAUSE') { G.state = 'PLAY'; }
        else G.held = true;
      }
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (G.state === 'PLAY') G.state = 'PAUSE';
      else if (G.state === 'PAUSE') G.state = 'PLAY';
    } else if (e.code === 'KeyM') {
      Sound.setMuted(!Sound.isMuted());
    }
  });
  window.addEventListener('keyup', e => {
    if (e.code === 'Space' || e.code === 'ArrowUp') onRelease();
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'PLAY') G.state = 'PAUSE';
  });
  window.addEventListener('blur', () => { if (G.state === 'PLAY') G.state = 'PAUSE'; });
  document.addEventListener('contextmenu', e => e.preventDefault());

  loadStorage();
  Sound.initFromStorage();

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
