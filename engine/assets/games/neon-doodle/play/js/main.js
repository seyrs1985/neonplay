/* Neon Doodle — bootstrap: canvas scaling, pointer/keyboard input, main loop.
 * No game logic here (see game.js). Logical space 480x720, letterboxed. */
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
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    scale = Math.min((cw * dpr) / W, (ch * dpr) / H);
    offX = (canvas.width - W * scale) / 2;
    offY = (canvas.height - H * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  loadStorage();
  Sound.loadMute();

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
  window.__qaRender = () => {   // one synchronous composed frame (screenshots / CI)
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0a18';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offX, offY);
    draw(ctx);
  };
  requestAnimationFrame(frame);

  /* logical <- client coords */
  function toLogical(e) {
    const rect = canvas.getBoundingClientRect();
    const px = (e.clientX - rect.left) * dpr;
    const py = (e.clientY - rect.top) * dpr;
    return {
      x: clamp((px - offX) / scale, 0, W),
      y: clamp((py - offY) / scale, 0, H),
    };
  }
  /* logical -> client coords (QA synthetic-event replay surface) */
  window.__qaToClient = (x, y) => {
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + (offX + x * scale) / dpr, y: rect.top + (offY + y * scale) / dpr };
  };

  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    Sound.resume();
    const p = toLogical(e);
    if (!onPress(p.x, p.y)) penDown(p.x, p.y);   // not on a button -> start a stroke
  }, { passive: false });
  window.addEventListener('pointermove', e => {
    if (!G.cur) return;
    const p = toLogical(e);
    penMove(p.x, p.y);
  }, { passive: true });
  window.addEventListener('pointerup', () => penUp());
  window.addEventListener('pointercancel', () => penCancel()); // interrupted line lands as segments

  // mouse right-click = eraser (design: MVP right-click clears the drawing)
  document.addEventListener('contextmenu', e => {
    e.preventDefault();
    if (G.state === 'PLAY') eraseAll();
  });

  window.addEventListener('keydown', e => {
    const codes = ['Space', 'Enter', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
    if (codes.indexOf(e.code) >= 0) e.preventDefault();
    if (e.repeat && e.code !== 'ArrowLeft' && e.code !== 'ArrowRight' &&
      e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;
    onKey(e.code);
  });

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { last = performance.now(); } // avoid a giant dt on return
  });
  window.addEventListener('blur', () => penCancel());
})();
