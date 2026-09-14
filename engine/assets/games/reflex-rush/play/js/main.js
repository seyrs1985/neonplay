/* Reflex Rush — bootstrap: canvas scaling, input, main loop (no game logic) */
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
    dt = Math.min(dt, 0.033); // clamp spikes (tab switch, GC) — timer is time-based, drift-free
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

  // logical -> client coords (QA/tests dispatch real pointer events through this)
  window.__qaToClient = (x, y) => {
    const r = canvas.getBoundingClientRect();
    const s = Math.min(r.width / W, r.height / H);
    return { x: r.left + (r.width - W * s) / 2 + x * s, y: r.top + (r.height - H * s) / 2 + y * s };
  };

  function pointerPos(e) {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * dpr;
    const py = (e.clientY - rect.top) * dpr;
    return { px, py };
  }

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    const { px, py } = pointerPos(e);
    const x = (px - offX) / scale, y = (py - offY) / scale;
    onPress(clamp(x, 0, W), clamp(y, 0, H));
  }, { passive: false });
  window.addEventListener('pointerup', () => {});
  window.addEventListener('pointercancel', () => {}); // tap game: nothing held

  window.addEventListener('keydown', e => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      if (!e.repeat) {
        Sound.resume();
        if (G.state === 'TITLE') { startRun('classic'); Sound.sfx.start(); Sound.startMusic(); }
        else if (G.state === 'PLAY') { keyboardHit(); } // accessibility: strike the current target
        else if (G.state === 'PAUSE') { G.state = 'PLAY'; }
        else if (G.state === 'OVER' && G.overT > 0.5) { startRun(G.mode); Sound.sfx.start(); Sound.startMusic(); }
      }
    } else if (e.code === 'KeyC') {
      if (G.state === 'TITLE') { startRun('classic'); Sound.sfx.start(); Sound.startMusic(); }
    } else if (e.code === 'KeyD') {
      if (G.state === 'TITLE') { startRun('daily'); Sound.sfx.start(); Sound.startMusic(); }
    } else if (e.code === 'KeyP' || e.code === 'Escape') {
      if (G.state === 'PLAY') G.state = 'PAUSE';
      else if (G.state === 'PAUSE') G.state = 'PLAY';
    } else if (e.code === 'KeyM') {
      Sound.setMuted(!Sound.isMuted());
    }
  });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && G.state === 'PLAY') G.state = 'PAUSE';
  });
  window.addEventListener('blur', () => { if (G.state === 'PLAY') G.state = 'PAUSE'; });
  document.addEventListener('contextmenu', e => e.preventDefault());
})();
