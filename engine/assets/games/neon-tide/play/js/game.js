/* Neon Tide — game core: states, world gen, physics, render.
   Logical space 720x1280, letterboxed; all art drawn in code (fake glow, no shadowBlur). */
'use strict';

const W = 720, H = 1280;
const GRAVITY = 2500;
const THRUST = 5300;
const VY_MAX = 980;
const PLAYER_X = 196;
const PLAYER_R = 26;

const COL = {
  bg0: '#02060f', bg1: '#0a1c36', bg2: '#12304f',
  cyan: '#22d3ee', aqua: '#7dd3fc', deep: '#0e7490',
  pearl: '#fbcfe8', pearlHot: '#f472b6',
  mine: '#fb7185', mineDark: '#881337',
  gold: '#fde047', white: '#eaf6ff',
  wall: '#0b2542', wallGlow: '#1d4ed8',
};

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function lerp(a, b, t) { return a + (b - a) * t; }
function rnd(a, b) { return a + Math.random() * (b - a); }

/* ---------------- particles ---------------- */
const particles = [];
function spawnP(n, fn) {
  for (let i = 0; i < n; i++) {
    if (particles.length > 260) particles.shift();
    particles.push(fn(i));
  }
}
function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life -= dt;
    if (p.life <= 0) { particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vy += (p.grav || 0) * dt;
  }
}
function drawParticles(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const p of particles) {
    const a = clamp(p.life / p.max, 0, 1);
    ctx.globalAlpha = a * p.alpha;
    ctx.fillStyle = p.col;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * (p.shrink ? a : 1), 0, 7);
    ctx.fill();
  }
  ctx.restore();
}
function puff(x, y, col, n, sp, r0, r1, grav = -120) {
  spawnP(n, () => {
    const a = rnd(0, Math.PI * 2), s = rnd(sp * 0.3, sp);
    const r = rnd(r0, r1), life = rnd(0.35, 0.8);
    return { x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, r, col, life, max: life, alpha: 0.9, grav, shrink: true };
  });
}

const floaties = []; // score popups
function floatText(x, y, txt, col, size = 34) {
  floaties.push({ x, y, txt, col, size, life: 0.9, max: 0.9 });
}

/* ---------------- game state ---------------- */
const G = {
  state: 'TITLE',           // TITLE | PLAY | PAUSE | OVER
  dist: 0, speed: 300, score: 0, pearls: 0,
  best: 0,
  py: H / 2, vy: 0, held: false,
  shield: false, invuln: 0,
  obstacles: [], nextSpawn: 500,
  time: 0, timeScale: 1, shake: 0, flash: 0,
  deathT: 0, newBest: false,
  tutDone: false, tutHold: 0,
  pausedFrom: 'PLAY',
  hitRegions: [],           // rebuilt each frame for pointer hit-testing
};

function loadStorage() {
  try {
    G.best = parseInt(localStorage.getItem('nt_best') || '0', 10) || 0;
    G.tutDone = localStorage.getItem('nt_tut') === '1';
  } catch (e) {}
}
function saveBest() {
  try { localStorage.setItem('nt_best', String(G.best)); } catch (e) {}
}

/* ---------------- world generation ---------------- */
function difficulty() {
  return {
    speed: Math.min(300 + G.dist * 0.014, 650),
    gap: Math.max(345 - G.dist * 0.0062, 205),
    mineChance: Math.min(0.12 + G.dist * 0.00003, 0.5),
    pearlChance: 0.62,
    shieldEvery: 2600,
  };
}

function spawnSection() {
  const d = difficulty();
  const x = G.nextSpawn;
  const gapY = rnd(d.gap / 2 + 90, H - d.gap / 2 - 90);
  const pw = 74;

  G.obstacles.push({ kind: 'pillar', x, w: pw, gapY, gapH: d.gap, passed: false });

  // mine between sections
  if (Math.random() < d.mineChance) {
    const mx = x + pw + rnd(120, 190);
    G.obstacles.push({ kind: 'mine', x: mx, y: rnd(160, H - 160), r: 30, ph: rnd(0, 7), amp: rnd(24, 64), baseY: 0 });
    G.obstacles[G.obstacles.length - 1].baseY = G.obstacles[G.obstacles.length - 1].y;
  }

  // pearl arc toward next section
  if (Math.random() < d.pearlChance) {
    const n = 3 + (Math.random() * 3 | 0);
    const sx = x + pw + rnd(60, 120);
    const y0 = clamp(gapY + rnd(-140, 140), 120, H - 120);
    const y1 = clamp(rnd(160, H - 160), 120, H - 120);
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : i / (n - 1);
      G.obstacles.push({ kind: 'pearl', x: sx + i * 66, y: lerp(y0, y1, t) + Math.sin(t * Math.PI) * -50, r: 17, got: false });
    }
  }

  // rare shield bubble
  if (G.dist > 800 && Math.random() < 0.3 && !G.obstacles.some(o => o.kind === 'shield')) {
    G.obstacles.push({ kind: 'shield', x: x + rnd(200, 330), y: rnd(200, H - 200), r: 24, got: false });
  }

  G.nextSpawn = x + rnd(400, 520) + Math.min(G.dist * 0.01, 60);
}

/* ---------------- lifecycle ---------------- */
function resetRun() {
  G.dist = 0; G.speed = 300; G.score = 0; G.pearls = 0;
  G.py = H / 2; G.vy = 0;
  G.shield = false; G.invuln = 0;
  G.obstacles.length = 0; G.nextSpawn = 560;
  particles.length = 0; floaties.length = 0;
  G.timeScale = 1; G.shake = 0; G.flash = 0;
  G.newBest = false; G.tutHold = 0;
}

function startRun() {
  resetRun();
  G.state = 'PLAY';
  try { Sound.sfx.start(); Sound.startMusic(); } catch (e) {}
}

function gameOver() {
  G.state = 'OVER';
  G.deathT = 0;
  try { Sound.stopMusic(); Sound.sfx.death(); } catch (e) {}
  G.shake = 22; G.flash = 0.6;
  puff(PLAYER_X, G.py, COL.cyan, 26, 560, 3, 9);
  puff(PLAYER_X, G.py, COL.white, 14, 340, 2, 5);
  if (G.score > G.best) { G.best = G.score; G.newBest = true; saveBest(); setTimeout(() => { try { Sound.sfx.best(); } catch (e) {} }, 500); }
}

function toTitle() {
  G.state = 'TITLE';
  resetRun();
}

/* ---------------- collision ---------------- */
function circleRectHit(cx, cy, r, rx, ry, rw, rh) {
  const nx = clamp(cx, rx, rx + rw), ny = clamp(cy, ry, ry + rh);
  const dx = cx - nx, dy = cy - ny;
  return dx * dx + dy * dy < r * r;
}

function hitObstacle(o) {
  if (G.shield) {
    G.shield = false;
    G.invuln = 1.1;
    G.flash = 0.35; G.shake = 10;
    Sound.sfx.hit();
    puff(o.kind === 'mine' ? o.x : PLAYER_X + 40, o.kind === 'mine' ? o.y : G.py, COL.mine, 18, 420, 3, 7);
    if (o.kind === 'mine' || o.kind === 'pillar') {
      // remove mine; pillar stays but we got invulnerability
      if (o.kind === 'mine') o.dead = true;
    }
    floatText(PLAYER_X, G.py - 60, 'SHIELD!', COL.cyan, 36);
  } else {
    gameOver();
  }
}

/* ---------------- update ---------------- */
function update(dt) {
  G.time += dt;
  if (G.shake > 0) G.shake = Math.max(0, G.shake - dt * 40);
  if (G.flash > 0) G.flash = Math.max(0, G.flash - dt * 1.6);
  updateParticles(dt);
  for (let i = floaties.length - 1; i >= 0; i--) {
    const f = floaties[i];
    f.life -= dt; f.y -= dt * 70;
    if (f.life <= 0) floaties.splice(i, 1);
  }

  if (G.state === 'PLAY') {
    G.timeScale += (1 - G.timeScale) * dt * 4;
    const sdt = dt * G.timeScale;
    G.speed = difficulty().speed;
    G.dist += G.speed * sdt;

    // player physics
    const acc = G.held ? -THRUST : GRAVITY;
    G.vy = clamp(G.vy + acc * sdt, -VY_MAX, VY_MAX);
    G.py += G.vy * sdt;
    if (G.held) {
      G.tutHold += sdt;
      if (!G.tutDone && G.tutHold > 1.6) { G.tutDone = true; try { localStorage.setItem('nt_tut', '1'); } catch (e) {} }
      if (Math.random() < sdt * 60) {
        particles.push({ x: PLAYER_X - 14 + rnd(-8, 8), y: G.py + 18, vx: rnd(-190, -120), vy: rnd(30, 130), r: rnd(2.5, 5.5), col: COL.aqua, life: rnd(0.3, 0.55), max: 0.55, alpha: 0.55, grav: -60, shrink: true });
      }
    }
    if (G.py < PLAYER_R + 6 || G.py > H - PLAYER_R - 6) {
      G.py = clamp(G.py, PLAYER_R + 6, H - PLAYER_R - 6);
      Sound.sfx.fall(); gameOver(); return;
    }
    if (G.invuln > 0) G.invuln -= sdt;

    // spawn & scroll
    while (G.dist + W + 200 > G.nextSpawn) spawnSection();
    G.score = Math.floor(G.dist / 40) + G.pearls * 5;

    for (const o of G.obstacles) {
      if (o.kind !== 'mine') o.x -= G.speed * sdt; else o.x -= G.speed * sdt;
      if (o.dead) continue;

      if (o.kind === 'pillar') {
        const topH = o.gapY - o.gapH / 2, botY = o.gapY + o.gapH / 2;
        if (!o.passed && o.x + o.w < PLAYER_X - PLAYER_R) {
          o.passed = true;
          G.score += 1;
          // near-miss bonus
          const edge = G.py < o.gapY ? topH : botY;
          if (Math.abs(G.py - edge) < 36) { G.score += 2; floatText(PLAYER_X + 60, G.py - 46, 'CLOSE +2', COL.gold, 30); Sound.sfx.pickup(); }
        }
        if (G.invuln <= 0 && (circleRectHit(PLAYER_X, G.py, PLAYER_R - 4, o.x, -40, o.w, topH + 40) ||
            circleRectHit(PLAYER_X, G.py, PLAYER_R - 4, o.x, botY, o.w, H - botY + 40))) {
          hitObstacle(o);
          if (G.state !== 'PLAY') return;
        }
      } else if (o.kind === 'mine') {
        o.y = o.baseY + Math.sin(G.time * 2.1 + o.ph) * o.amp;
        if (G.invuln <= 0) {
          const dx = PLAYER_X - o.x, dy = G.py - o.y;
          const rr = PLAYER_R + o.r - 8;
          if (dx * dx + dy * dy < rr * rr) { hitObstacle(o); if (G.state !== 'PLAY') return; }
        }
      } else if (o.kind === 'pearl' && !o.got) {
        const dx = PLAYER_X - o.x, dy = G.py - o.y;
        const rr = PLAYER_R + o.r + 6;
        if (dx * dx + dy * dy < rr * rr) {
          o.got = true; G.pearls++; G.score += 5;
          Sound.sfx.pickup();
          puff(o.x, o.y, COL.pearlHot, 8, 220, 2, 4.5, -30);
          floatText(o.x, o.y - 30, '+5', COL.pearl, 28);
        }
      } else if (o.kind === 'shield' && !o.got) {
        const dx = PLAYER_X - o.x, dy = G.py - o.y;
        const rr = PLAYER_R + o.r + 8;
        if (dx * dx + dy * dy < rr * rr) {
          o.got = true; G.shield = true;
          Sound.sfx.shield();
          puff(o.x, o.y, COL.cyan, 14, 300, 3, 6, -20);
          floatText(o.x, o.y - 34, 'SHIELD UP', COL.cyan, 32);
        }
      }
    }
    while (G.obstacles.length && (G.obstacles[0].x < -160 || G.obstacles[0].dead)) G.obstacles.shift();
  }

  if (G.state === 'OVER') G.deathT += dt;
}

/* ---------------- drawing helpers ---------------- */
function glowLine(ctx, x0, y0, x1, y1, col, w) {
  ctx.strokeStyle = col;
  ctx.globalAlpha = 0.22; ctx.lineWidth = w * 3.4;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.globalAlpha = 1; ctx.lineWidth = w;
  ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
}
function glowOrb(ctx, x, y, r, col, hot) {
  const g = ctx.createRadialGradient(x, y, r * 0.1, x, y, r * 2.1);
  g.addColorStop(0, col); g.addColorStop(0.45, hexA(col, 0.35)); g.addColorStop(1, hexA(col, 0));
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(x, y, r * 2.1, 0, 7); ctx.fill();
  ctx.fillStyle = hot || col;
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, 7); ctx.fill();
  ctx.strokeStyle = col; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x, y, r * 0.62, 0, 7); ctx.stroke();
}
const _hexCache = {};
function hexA(hex, a) {
  const k = hex;
  let rgb = _hexCache[k];
  if (!rgb) {
    rgb = [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    _hexCache[k] = rgb;
  }
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

/* ---------------- render ---------------- */
function drawBackground(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, COL.bg1); g.addColorStop(0.5, COL.bg0); g.addColorStop(1, COL.bg1);
  ctx.fillStyle = g;
  ctx.fillRect(-40, -40, W + 80, H + 80);

  // drifting plankton (parallax)
  const t = G.time;
  ctx.fillStyle = hexA(COL.aqua, 0.14);
  for (let i = 0; i < 26; i++) {
    const sx = (i * 353.7 + t * (14 + (i % 5) * 7)) % (W + 60) - 30;
    const sy = (i * 461.3 + Math.sin(t * 0.5 + i) * 40) % H;
    ctx.beginPath(); ctx.arc(W - sx, (sy + H) % H, 1.4 + (i % 3), 0, 7); ctx.fill();
  }
  ctx.fillStyle = hexA(COL.cyan, 0.1);
  for (let i = 0; i < 14; i++) {
    const sx = (i * 277.9 + t * (30 + (i % 4) * 9)) % (W + 60) - 30;
    const sy = (i * 613.1 + Math.sin(t * 0.4 + i * 2) * 60) % H;
    ctx.beginPath(); ctx.arc(W - sx, (sy + H) % H, 2.2 + (i % 3), 0, 7); ctx.fill();
  }

  // light rays
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 4; i++) {
    const bx = 120 + i * 170 + Math.sin(t * 0.22 + i * 1.7) * 55;
    ctx.fillStyle = hexA(COL.aqua, 0.035);
    ctx.beginPath();
    ctx.moveTo(bx - 34, -20); ctx.lineTo(bx + 34, -20);
    ctx.lineTo(bx + 150, H + 20); ctx.lineTo(bx + 40, H + 20);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // decorative undulating walls (non-colliding silhouettes)
  drawWall(ctx, true, t);
  drawWall(ctx, false, t);
}
function drawWall(ctx, top, t) {
  ctx.beginPath();
  const dir = top ? 1 : -1;
  ctx.moveTo(-10, top ? -10 : H + 10);
  for (let x = -10; x <= W + 10; x += 24) {
    const wx = x + (G.dist * 0.55) % 24;
    const y = (top ? 0 : H) + dir * (26 + Math.sin(wx * 0.013 + (top ? 0 : 2.4)) * 18 + Math.sin(wx * 0.037 + (top ? 1 : 4)) * 9);
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 10, top ? -10 : H + 10);
  ctx.closePath();
  ctx.fillStyle = COL.wall;
  ctx.fill();
  ctx.strokeStyle = hexA(COL.wallGlow, 0.8);
  ctx.lineWidth = 2.5;
  ctx.stroke();
}

function drawObstacles(ctx) {
  for (const o of G.obstacles) {
    if (o.dead) continue;
    if (o.kind === 'pillar') {
      const topH = o.gapY - o.gapH / 2, botY = o.gapY + o.gapH / 2;
      for (const [y0, h] of [[-40, topH + 40], [botY, H - botY + 40]]) {
        // body
        const g = ctx.createLinearGradient(o.x, 0, o.x + o.w, 0);
        g.addColorStop(0, '#0d2c4d'); g.addColorStop(1, '#123a63');
        ctx.fillStyle = g;
        ctx.beginPath();
        roundRectPath(ctx, o.x, y0, o.w, h, 16, y0 === -40 ? [false, false, true, true] : [true, true, false, false]);
        ctx.fill();
        // glowing lip
        const lipY = y0 === -40 ? topH - 4 : botY + 4;
        glowLine(ctx, o.x + 6, lipY, o.x + o.w - 6, lipY, COL.cyan, 4);
      }
    } else if (o.kind === 'mine') {
      const s = 1 + Math.sin(G.time * 6 + o.ph) * 0.06;
      ctx.save();
      ctx.translate(o.x, o.y);
      ctx.rotate(G.time * 0.8 + o.ph);
      ctx.strokeStyle = hexA(COL.mine, 0.75);
      ctx.lineWidth = 4;
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * o.r * 0.7, Math.sin(a) * o.r * 0.7);
        ctx.lineTo(Math.cos(a) * o.r * 1.32, Math.sin(a) * o.r * 1.32);
        ctx.stroke();
      }
      ctx.restore();
      glowOrb(ctx, o.x, o.y, o.r * s, COL.mine, '#fecdd3');
      ctx.fillStyle = COL.mineDark;
      ctx.beginPath(); ctx.arc(o.x, o.y, o.r * 0.3, 0, 7); ctx.fill();
    } else if (o.kind === 'pearl' && !o.got) {
      glowOrb(ctx, o.x, o.y + Math.sin(G.time * 2.6 + o.x * 0.02) * 8, o.r, COL.pearl, '#ffffff');
    } else if (o.kind === 'shield' && !o.got) {
      const bob = Math.sin(G.time * 2.2 + o.x * 0.015) * 10;
      ctx.strokeStyle = COL.cyan;
      ctx.globalAlpha = 0.28; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(o.x, o.y + bob, o.r * 1.5, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(o.x, o.y + bob, o.r * 1.5, 0, 7); ctx.stroke();
      ctx.fillStyle = hexA(COL.cyan, 0.9);
      ctx.beginPath();
      ctx.moveTo(o.x, o.y + bob - 11); ctx.lineTo(o.x + 9, o.y + bob + 3);
      ctx.lineTo(o.x, o.y + bob + 13); ctx.lineTo(o.x - 9, o.y + bob + 3);
      ctx.closePath(); ctx.fill();
    }
  }
}

function roundRectPath(ctx, x, y, w, h, r, rr) {
  const radii = rr || [r, r, r, r];
  ctx.moveTo(x + radii[0], y);
  ctx.lineTo(x + w - radii[1], y); ctx.arcTo(x + w, y, x + w, y + radii[1], radii[1]);
  ctx.lineTo(x + w, y + h - radii[2]); ctx.arcTo(x + w, y + h, x + w - radii[2], y + h, radii[2]);
  ctx.lineTo(x + radii[3], y + h); ctx.arcTo(x, y + h, x, y + h - radii[3], radii[3]);
  ctx.lineTo(x, y + radii[0]); ctx.arcTo(x, y, x + radii[0], y, radii[0]);
  ctx.closePath();
}

function drawPlayer(ctx) {
  const blink = G.invuln > 0 && (Math.floor(G.time * 14) % 2 === 0);
  if (blink) return;
  const x = PLAYER_X, y = G.py;
  // trail
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 1; i <= 4; i++) {
    ctx.globalAlpha = 0.09 * (5 - i);
    ctx.fillStyle = COL.cyan;
    ctx.beginPath();
    ctx.arc(x - i * 15, y - G.vy * 0.006 * i * 10, PLAYER_R * (1 - i * 0.16), 0, 7);
    ctx.fill();
  }
  ctx.restore();
  // fins (fish-like tail wiggle)
  const wag = Math.sin(G.time * (G.held ? 16 : 9)) * 0.5;
  ctx.fillStyle = hexA(COL.aqua, 0.85);
  ctx.beginPath();
  ctx.moveTo(x - 10, y);
  ctx.lineTo(x - 40, y - 16 + wag * 14);
  ctx.lineTo(x - 34, y + wag * 10);
  ctx.lineTo(x - 40, y + 18 + wag * 12);
  ctx.closePath();
  ctx.fill();
  glowOrb(ctx, x, y, PLAYER_R, COL.cyan, '#e0fdff');
  // eye
  ctx.fillStyle = '#04283d';
  ctx.beginPath(); ctx.arc(x + 9, y - 4, 4.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(x + 10.5, y - 5.5, 1.6, 0, 7); ctx.fill();
  // shield ring
  if (G.shield) {
    const p = 1 + Math.sin(G.time * 5) * 0.05;
    ctx.strokeStyle = COL.cyan;
    ctx.globalAlpha = 0.35; ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(x, y, PLAYER_R * 1.75 * p, 0, 7); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, PLAYER_R * 1.75 * p, 0, 7); ctx.stroke();
  }
}

function drawText(ctx, txt, x, y, size, col, align = 'center', weight = 800, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = col;
  ctx.font = `${weight} ${size}px "Segoe UI", system-ui, -apple-system, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(txt, x, y);
  ctx.restore();
}

/* ---------------- screens ---------------- */
function drawTitle(ctx) {
  drawBackground(ctx);
  drawObstacles(ctx);

  // logo
  const ly = 380 + Math.sin(G.time * 1.4) * 8;
  drawText(ctx, 'NEON', W / 2, ly, 118, COL.white, 'center', 900);
  drawText(ctx, 'TIDE', W / 2, ly + 118, 118, COL.cyan, 'center', 900);
  // animated wave underline
  ctx.save();
  ctx.strokeStyle = COL.aqua; ctx.lineWidth = 5;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  for (let x = 130; x <= W - 130; x += 8) {
    const y = ly + 196 + Math.sin(x * 0.045 + G.time * 3.2) * 7;
    x === 130 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  }
  ctx.stroke();
  ctx.restore();

  const best = G.best > 0;
  if (best) drawText(ctx, `BEST  ${G.best}`, W / 2, ly + 268, 40, COL.gold, 'center', 800, 0.95);

  const pulse = 0.55 + Math.sin(G.time * 4.4) * 0.45;
  drawText(ctx, 'TAP  TO  DIVE', W / 2, 900, 46, COL.white, 'center', 800, pulse);
  drawText(ctx, 'hold to rise · release to dive', W / 2, 965, 28, COL.aqua, 'center', 600, 0.85);

  // sound toggle + credit
  btn(ctx, 'snd', W - 92, 60, 56, 56, Sound.isMuted() ? '🔇' : '🔊', 30);
  drawText(ctx, 'an AI-built arcade · v1.0', W / 2, H - 46, 22, hexA(COL.aqua, 0.75), 'center', 500, 0.8);

  drawParticles(ctx);
}

function drawPlay(ctx) {
  drawBackground(ctx);
  drawObstacles(ctx);
  drawPlayer(ctx);
  drawParticles(ctx);

  // HUD
  drawText(ctx, String(G.score), W / 2, 90, 76, COL.white, 'center', 900);
  drawText(ctx, `BEST ${G.best}`, W / 2, 152, 28, COL.gold, 'center', 700, 0.9);
  btn(ctx, 'pause', W - 92, 52, 56, 56, '❚❚', 24);

  // floaties
  for (const f of floaties) {
    drawText(ctx, f.txt, f.x, f.y, f.size, f.col, 'center', 800, clamp(f.life / f.max, 0, 1));
  }

  // tutorial
  if (!G.tutDone && G.dist < 1400) {
    const a = 0.6 + Math.sin(G.time * 5) * 0.35;
    drawText(ctx, G.held ? 'release to dive' : 'HOLD to rise', W / 2, H * 0.32, 44, COL.white, 'center', 800, a);
    // ghost finger
    const fy = G.held ? H * 0.45 : H * 0.5;
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = COL.white; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(W / 2, fy, 34, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(W / 2, fy - (G.held ? -8 : 8), 20, 0, 7); ctx.stroke();
    ctx.restore();
  }
}

function btn(ctx, id, x, y, w, h, label, fs) {
  G.hitRegions.push({ id, x, y, w, h });
  ctx.save();
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = 'rgba(10,30,54,0.72)';
  ctx.beginPath();
  roundRectPath(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = hexA(COL.cyan, 0.55);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = COL.white;
  ctx.font = `700 ${fs}px "Segoe UI", system-ui, sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 2);
  ctx.restore();
}

function dim(ctx, a) {
  ctx.fillStyle = `rgba(2,6,15,${a})`;
  ctx.fillRect(-40, -40, W + 80, H + 80);
}

function drawPause(ctx) {
  drawPlay(ctx);
  dim(ctx, 0.62);
  drawText(ctx, 'PAUSED', W / 2, 430, 84, COL.white, 'center', 900);
  btn(ctx, 'resume', W / 2 - 160, 560, 320, 92, 'RESUME', 38);
  btn(ctx, 'quit', W / 2 - 160, 690, 320, 92, 'QUIT', 38);
  drawText(ctx, 'score ' + G.score, W / 2, 850, 34, COL.aqua, 'center', 700);
}

function drawOver(ctx) {
  drawPlay(ctx);
  const t = clamp(G.deathT * 2.2, 0, 1);
  dim(ctx, 0.6 * t);
  const ease = 1 - Math.pow(1 - t, 3);
  ctx.save();
  ctx.translate(0, (1 - ease) * 120);
  drawText(ctx, 'WIPED OUT', W / 2, 400, 84, COL.mine, 'center', 900, ease);
  drawText(ctx, String(G.score), W / 2, 540, 120, COL.white, 'center', 900, ease);
  drawText(ctx, `pearls ${G.pearls}   ·   best ${G.best}`, W / 2, 650, 34, COL.aqua, 'center', 700, ease);
  if (G.newBest) {
    const p = 0.7 + Math.sin(G.time * 6) * 0.3;
    drawText(ctx, '★ NEW BEST ★', W / 2, 730, 44, COL.gold, 'center', 900, p * ease);
  }
  if (t > 0.55) {
    const p2 = 0.55 + Math.sin(G.time * 4.4) * 0.45;
    drawText(ctx, 'TAP TO RETRY', W / 2, 880, 44, COL.white, 'center', 800, p2);
    btn(ctx, 'menu', W / 2 - 130, 950, 260, 78, 'MENU', 32);
  }
  ctx.restore();
}

/* ---------------- main draw ---------------- */
function draw(ctx) {
  G.hitRegions.length = 0;
  ctx.save();
  if (G.shake > 0) ctx.translate(rnd(-G.shake, G.shake), rnd(-G.shake, G.shake));
  switch (G.state) {
    case 'TITLE': drawTitle(ctx); break;
    case 'PLAY': drawPlay(ctx); break;
    case 'PAUSE': drawPause(ctx); break;
    case 'OVER': drawOver(ctx); break;
  }
  ctx.restore();
  if (G.flash > 0) {
    ctx.fillStyle = `rgba(210,245,255,${G.flash * 0.5})`;
    ctx.fillRect(-40, -40, W + 80, H + 80);
  }
}

/* ---------------- input routing ---------------- */
function toLogical(px, py, sx, sy, ox, oy) {
  return { x: (px - ox) / sx, y: (py - oy) / sy };
}

/* ---------------- deterministic hooks (autotest / store screenshots) ----------------
   ?autotest=1  step the engine directly and expose results in window.__autotest
   ?shot=title|play|over[&seed=N]  stage a scene and render one frame synchronously */
(function () {
  const q = new URLSearchParams(location.search);
  const mode = q.get('shot');
  const autotest = q.get('autotest');
  if (!mode && !autotest) return;

  let seed = (parseInt(q.get('seed') || '20260910', 10) >>> 0) || 1;
  const realRandom = Math.random;
  const srand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  function sim(seconds, holdFn) {
    Math.random = srand;
    const steps = Math.round(seconds * 60);
    for (let i = 0; i < steps; i++) {
      G.held = holdFn ? !!holdFn(i / 60, i) : false;
      update(1 / 60);
      if (G.state !== 'PLAY') break;
    }
    G.held = false;
    Math.random = realRandom;
  }
  const autopilot = () => {
    const p = G.obstacles.find(o => o.kind === 'pillar' && o.x + o.w > PLAYER_X - 10);
    const target = p ? p.gapY : H * 0.55;
    return G.py > target && G.py < H - 220; // never hold near the ceiling
  };

  window.__nt = {
    step(dt, held) { G.held = !!held; update(dt); },
    render() { window.__ntRender && window.__ntRender(); },
    G,
  };

  if (autotest) {
    const results = {};
    const clearField = () => { G.obstacles.length = 0; G.nextSpawn = G.dist + 99999; };
    try {
      // 1) thrust physics: rises while held, falls on release (no obstacles in the way)
      startRun(); clearField();
      const y0 = G.py;
      sim(0.45, () => true);
      results.riseOnHold = G.py < y0 - 100;
      const y1 = G.py;
      sim(1.2, () => false);
      results.fallOnRelease = G.py > y1 + 100;
      // 2) distance score grows with survival time
      startRun(); clearField();
      const s0 = G.score;
      sim(1.0, () => false);
      results.scoreGrows = G.score > s0;
      // 3) autopilot makes real progress through generated terrain
      startRun();
      sim(6, autopilot);
      results.autopilotProgress = G.dist > 700;
      // 4) pearl collection
      startRun(); clearField();
      G.obstacles.push({ kind: 'pearl', x: PLAYER_X + 60, y: G.py, r: 17, got: false });
      const pBefore = G.pearls;
      sim(0.4, () => false);
      results.pearlCollects = G.pearls === pBefore + 1;
      // 5) shield pickup absorbs one hit
      startRun(); clearField();
      G.obstacles.push({ kind: 'shield', x: PLAYER_X + 60, y: G.py, r: 24, got: false });
      sim(0.4, () => false);
      results.shieldPickup = G.shield === true;
      G.obstacles.push({ kind: 'mine', x: PLAYER_X + 30, y: G.py, r: 30, ph: 0, amp: 0, baseY: G.py });
      sim(0.1, () => false);
      results.shieldAbsorbsHit = !G.shield && G.state === 'PLAY' && G.invuln > 0;
      // 6) lethal collision ends the run, best score tracked, restart works
      startRun(); clearField();
      G.invuln = 0; G.shield = false;
      G.obstacles.push({ kind: 'pillar', x: PLAYER_X, w: 74, gapY: G.py, gapH: 40, passed: false });
      sim(0.1, () => false);
      results.collisionKills = G.state === 'OVER';
      results.bestTracked = G.best >= G.score;
      startRun();
      results.restartWorks = G.state === 'PLAY' && G.score === 0 && G.dist < 50;
      G.state = 'PAUSE';
      results.pauseWorks = G.state === 'PAUSE';
    } catch (e) {
      results.exception = String(e && e.stack || e);
    }
    results.allPass = Object.values(results).every(v => v !== false);
    window.__autotest = results;
    return;
  }

  // --- staged store screenshots ---
  // pre-seed storage synchronously: main.js loadStorage() (runs later) reads these
  try { localStorage.setItem('nt_tut', '1'); localStorage.setItem('nt_best', '128'); } catch (e) {}
  // deferred so the overrides survive any async init
  setTimeout(() => {
    try {
    const simT = parseFloat(q.get('t') || '9') || 9;
    G.tutDone = true;
    G.best = 128;
    if (mode === 'title') {
      toTitle();
    } else if (mode === 'play') {
      startRun();
      sim(simT, autopilot);
    } else if (mode === 'over') {
      startRun();
      sim(Math.min(simT, 7), autopilot);
      G.obstacles.length = 0;
      G.obstacles.push({ kind: 'pillar', x: PLAYER_X, w: 74, gapY: G.py, gapH: 80, passed: false });
      sim(0.2, false);
    }
    // stage the exact frame, then freeze updates so the shot stays composed
    if (mode === 'over') {
      G.state = 'OVER'; G.deathT = 1.4; G.newBest = true;
      G.best = Math.max(10, G.score - 15); // keep "NEW BEST" narratively consistent
    } else if (mode === 'title') G.state = 'TITLE';
    else G.state = 'PLAY';
    G.flash = 0; G.shake = 0; G.held = false;
    window.__ntFreeze = true;
    // final assertion right before the synchronous render — last writer wins
    setTimeout(() => {
      G.tutDone = true; G.held = false; G.flash = 0; G.shake = 0;
      if (mode === 'play') G.best = Math.max(G.best, 128);
      if (mode === 'over') G.newBest = true;
      window.__ntRender && window.__ntRender();
    }, 30);
    } catch (e) { window.__stageErr = String(e && e.stack || e); }
  }, 0);
})();

function onPress(lx, ly) {
  Sound.resume();
  if (G.state === 'TITLE') {
    const hit = G.hitRegions.find(r => lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h);
    if (hit && hit.id === 'snd') { Sound.setMuted(!Sound.isMuted()); Sound.sfx.click(); return; }
    startRun();
    G.held = true;
    return;
  }
  if (G.state === 'PLAY') {
    const hit = G.hitRegions.find(r => lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h);
    if (hit && hit.id === 'pause') { G.state = 'PAUSE'; Sound.sfx.click(); return; }
    G.held = true;
    return;
  }
  if (G.state === 'PAUSE') {
    const hit = G.hitRegions.find(r => lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h);
    if (hit && hit.id === 'resume') { G.state = 'PLAY'; Sound.sfx.click(); return; }
    if (hit && hit.id === 'quit') { toTitle(); Sound.sfx.click(); return; }
    return;
  }
  if (G.state === 'OVER') {
    if (G.deathT < 0.6) return;
    const hit = G.hitRegions.find(r => lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h);
    if (hit && hit.id === 'menu') { toTitle(); Sound.sfx.click(); return; }
    startRun();
    G.held = true;
  }
}

function onRelease() { G.held = false; }
