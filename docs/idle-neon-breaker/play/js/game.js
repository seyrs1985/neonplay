/* Idle Neon Breaker — game core (idle-neon-breaker.md MVP).
 * Time-based logic tick (1s granularity, background-safe) + rAF render (foreground only).
 * Balls bounce off four walls (no paddle); numbered bricks merge 2048-style every 20s. */
'use strict';

// ---- i18n (np_core.js: np_lang shared with site switcher) ----
var L = {
  en: { ball: "Ball +1", dmg: "Damage +1", spd: "Speed +10%", cnt: "Coins +25%",
        max: "MAX", lv: "Lv", welcome: "Welcome back!", away: "You earned while away",
        claim: "Claim", afford: "", mergeIn: "next merge",
        note: "No forced ads · unlimited offline earnings · autosaves in your browser" },
  zh: { ball: "弹球 +1", dmg: "伤害 +1", spd: "弹速 +10%", cnt: "金币 +25%",
        max: "已满级", lv: "级", welcome: "欢迎回来！", away: "你不在的时候也在赚钱",
        claim: "收下", afford: "", mergeIn: "下次合并",
        note: "零强制广告 · 离线收益无上限 · 浏览器自动存档" },
  es: { ball: "Bola +1", dmg: "Daño +1", spd: "Velocidad +10%", cnt: "Monedas +25%",
        max: "MÁX", lv: "Nv", welcome: "¡Bienvenido de nuevo!", away: "Ganaste mientras no estabas",
        claim: "Recoger", afford: "", mergeIn: "próxima fusión",
        note: "Sin anuncios forzosos · ganancias sin conexión ilimitadas · autoguardado en tu navegador" },
  pt: { ball: "Bola +1", dmg: "Dano +1", spd: "Velocidade +10%", cnt: "Moedas +25%",
        max: "MÁX", lv: "Nv", welcome: "Bem-vindo de volta!", away: "Você ganhou enquanto estava fora",
        claim: "Pegar", afford: "", mergeIn: "próxima fusão",
        note: "Sem anúncios forçados · ganhos offline ilimitados · salvamento automático no navegador" },
  ru: { ball: "Мяч +1", dmg: "Урон +1", spd: "Скорость +10%", cnt: "Монеты +25%",
        max: "МАКС", lv: "Ур", welcome: "С возвращением!", away: "Вы заработали, пока вас не было",
        claim: "Забрать", afford: "", mergeIn: "следующее слияние",
        note: "Без принудительной рекламы · безграничный офлайн-доход · автосохранение в браузере" },
  ja: { ball: "ボール +1", dmg: "ダメージ +1", spd: "スピード +10%", cnt: "コイン +25%",
        max: "最大", lv: "Lv", welcome: "おかえりなさい！", away: "不在の間も稼いでいました",
        claim: "受け取る", afford: "", mergeIn: "次のマージまで",
        note: "強制広告なし · オフライン収益は無限 · ブラウザに自動セーブ" },
  ko: { ball: "공 +1", dmg: "데미지 +1", spd: "속도 +10%", cnt: "코인 +25%",
        max: "최대", lv: "Lv", welcome: "다시 오셨네요!", away: "자리를 비운 동안 벌었어요",
        claim: "받기", afford: "", mergeIn: "다음 합병",
        note: "강제 광고 없음 · 오프라인 수익 무제한 · 브라우저 자동 저장" },
  de: { ball: "Ball +1", dmg: "Schaden +1", spd: "Tempo +10%", cnt: "Münzen +25%",
        max: "MAX", lv: "St", welcome: "Willkommen zurück!", away: "Du hast verdient, während du weg warst",
        claim: "Abholen", afford: "", mergeIn: "nächstes Verschmelzen",
        note: "Keine erzwungene Werbung · unbegrenzter Offline-Verdienst · Autospeichern im Browser" },
  fr: { ball: "Balle +1", dmg: "Dégâts +1", spd: "Vitesse +10%", cnt: "Pièces +25%",
        max: "MAX", lv: "Nv", welcome: "Bon retour !", away: "Tu as gagné pendant ton absence",
        claim: "Récupérer", afford: "", mergeIn: "prochaine fusion",
        note: "Aucune pub forcée · gains hors ligne illimités · sauvegarde auto dans le navigateur" },
  id: { ball: "Bola +1", dmg: "Kerusakan +1", spd: "Kecepatan +10%", cnt: "Koin +25%",
        max: "MAKS", lv: "Lv", welcome: "Selamat datang kembali!", away: "Kamu menghasilkan selama pergi",
        claim: "Ambil", afford: "", mergeIn: "penggabungan berikutnya",
        note: "Tanpa iklan paksa · penghasilan luring tanpa batas · tersimpan otomatis di browser" }
};
function T(k) { return npT(L, k); }

// ---- constants (design doc: cost formulas fixed, bases in 1.5–2.0 band) ----
var W = 480, H = 640;
var COLS = 5, ROWS = 2, SLOTS = COLS * ROWS;
// bricks span the full canvas width — side lanes would let balls orbit forever
// without ever touching the band (verified offline: 20px margins = 0 coins)
var BRICK_W = W / COLS, BRICK_H = 44, BRICK_TOP = 64, BRICK_LEFT = 0;
var MERGE_EVERY = 20;          // seconds
var MAX_BALLS = 30, MAX_SPD = 5;
var BASE_SPEED = 170;          // px/s
var COIN_COLORS = { 2: "#00e5ff", 4: "#7c4dff", 8: "#ff2d95", 16: "#ffd54a" };
function brickColor(v) { return COIN_COLORS[v] || "#ffffff"; }

function costBall(n) { return Math.ceil(25 * Math.pow(1.7, n - 1)); }
function costDmg(d) { return Math.ceil(50 * Math.pow(1.8, d - 1)); }
function costSpd(s) { return Math.ceil(80 * Math.pow(2, s)); }
function costCnt(c) { return Math.ceil(100 * Math.pow(2.2, c)); }
function coinMult() { return 1 + 0.25 * S.coinLvl; }

// ---- state ----
var S = {
  coins: 0, totalEarned: 0, highest: 2,
  damage: 1, speedLvl: 0, coinLvl: 0, ballCount: 1,
  rate: 0,                       // coins per minute (EMA)
  bricks: [],                    // SLOTS entries: value or 0 (empty)
  mergeT: 0                      // seconds toward next merge
};
var balls = [], particles = [], floats = [];
var earnWindow = [];             // [{t, amt}] rolling 60s
var pendingOffline = 0;
var shake = 0;

function newBrick() { return { v: 2, fx: 0 }; }
function resetBricks() {
  S.bricks = [];
  for (var i = 0; i < SLOTS; i++) S.bricks.push(newBrick());
}
function spawnBall() {
  var a = -Math.PI / 2 + (Math.random() - .5) * 1.2;
  var sp = BASE_SPEED * (1 + 0.1 * S.speedLvl);
  balls.push({ x: W / 2, y: H - 80, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 5, px: W / 2, py: H - 80 });
}
function syncBalls() {
  while (balls.length < S.ballCount) spawnBall();
  while (balls.length > S.ballCount) balls.pop();
}
function ballSpeed() { return BASE_SPEED * (1 + 0.1 * S.speedLvl); }

// ---- save / load (np_inb_save, every 10s + key events) ----
var SAVE_KEY = "np_inb_save";
function save() {
  S.rate = currentRate() || S.rate;
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      v: 1, t: Date.now(), coins: S.coins, totalEarned: S.totalEarned,
      highest: S.highest, damage: S.damage, speedLvl: S.speedLvl, coinLvl: S.coinLvl,
      ballCount: S.ballCount, rate: S.rate, mergeT: S.mergeT,
      bricks: S.bricks.map(function (b) { return b ? b.v : 0; })
    }));
  } catch (e) {}
}
function load() {
  var d = null;
  try { d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch (e) {}
  if (!d || d.v !== 1) { resetBricks(); return; }
  S.coins = d.coins || 0; S.totalEarned = d.totalEarned || 0; S.highest = d.highest || 2;
  S.damage = d.damage || 1; S.speedLvl = d.speedLvl || 0; S.coinLvl = d.coinLvl || 0;
  S.ballCount = Math.min(d.ballCount || 1, MAX_BALLS); S.rate = d.rate || 0; S.mergeT = d.mergeT || 0;
  S.bricks = (d.bricks || []).slice(0, SLOTS).map(function (v) { return v > 0 ? { v: v, fx: 0 } : null; });
  while (S.bricks.length < SLOTS) S.bricks.push(newBrick());
  // offline earnings: full rate, no cap (design red line)
  var awayMs = Date.now() - (d.t || Date.now());
  if (awayMs > 60000 && S.rate > 0) {
    pendingOffline = Math.floor(S.rate * (awayMs / 60000));
  }
}

// ---- economy ----
function currentRate() {
  var now = Date.now();
  earnWindow = earnWindow.filter(function (e) { return now - e.t < 60000; });
  var sum = 0; earnWindow.forEach(function (e) { sum += e.amt; });
  return sum; // earnings in last 60s == coins/min
}
function earn(amt, x, y) {
  var gain = Math.round(amt * coinMult());
  S.coins += gain; S.totalEarned += gain;
  earnWindow.push({ t: Date.now(), amt: gain });
  if (x !== undefined) floats.push({ x: x, y: y, txt: "+" + gain, life: 1, col: "#facc15" });
  return gain;
}
function burst(x, y, color, n) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * 6.28, sp = 1 + Math.random() * 2.8;
    particles.push({ x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color: color });
  }
}

// ---- merge pulse (2048-style: per row, adjacent equal → double, shift left, refill 2s) ----
function mergePulse() {
  var mergedAny = false;
  for (var r = 0; r < ROWS; r++) {
    var row = [], vals = [];
    for (var c = 0; c < COLS; c++) vals.push(S.bricks[r * COLS + c] ? S.bricks[r * COLS + c].v : 0);
    // collapse + merge left
    var compact = vals.filter(function (v) { return v > 0; });
    var out = [];
    for (var i = 0; i < compact.length; i++) {
      if (i + 1 < compact.length && compact[i] === compact[i + 1]) {
        out.push(compact[i] * 2); i++; mergedAny = true;
      } else out.push(compact[i]);
    }
    while (out.length < COLS) out.push(2);
    for (var c2 = 0; c2 < COLS; c2++) {
      var v2 = out[c2];
      S.bricks[r * COLS + c2] = { v: v2, fx: (vals[c2] !== v2 && v2 > 2) ? performance.now() : 0 };
      if (v2 > S.highest) { S.highest = v2; recordFx(v2); }
    }
  }
  if (mergedAny) shake = 6;
}
var recordUntil = 0;
function recordFx(v) {
  var el = document.getElementById("recordFx");
  document.getElementById("recordNum").textContent = v;
  el.classList.remove("show"); void el.offsetWidth; el.classList.add("show");
  recordUntil = performance.now() + 1100;
}

// ---- shop ----
function shopDefs() {
  return [
    { id: "ball", name: T("ball"), level: S.ballCount, max: MAX_BALLS, cost: costBall(S.ballCount),
      buy: function () { S.ballCount++; syncBalls(); } },
    { id: "dmg", name: T("dmg"), level: S.damage, max: Infinity, cost: costDmg(S.damage),
      buy: function () { S.damage++; } },
    { id: "spd", name: T("spd"), level: S.speedLvl, max: MAX_SPD, cost: costSpd(S.speedLvl),
      buy: function () { S.speedLvl++; balls.forEach(function (b) {
        var m = ballSpeed() / Math.hypot(b.vx, b.vy); b.vx *= m; b.vy *= m; }); } },
    { id: "cnt", name: T("cnt"), level: S.coinLvl, max: Infinity, cost: costCnt(S.coinLvl),
      buy: function () { S.coinLvl++; } }
  ];
}
function renderShop() {
  shopDefs().forEach(function (d) {
    var card = document.getElementById("up-" + d.id);
    var maxed = d.level >= d.max;
    document.getElementById("lv-" + d.id).textContent = T("lv") + " " + d.level + (maxed ? " · " + T("max") : "");
    document.getElementById("cost-" + d.id).textContent = maxed ? "—" : d.cost;
    card.disabled = maxed || S.coins < d.cost;
  });
}
function bindShop() {
  shopDefs().forEach(function (d) {
    document.getElementById("nm-" + d.id).textContent = d.name;
    document.getElementById("up-" + d.id).addEventListener("click", function () {
      var cur = shopDefs().filter(function (x) { return x.id === d.id; })[0];
      if (cur.level >= cur.max || S.coins < cur.cost) return;
      S.coins -= cur.cost; cur.buy(); save(); renderShop();
      var el = document.getElementById("up-" + d.id);
      el.classList.remove("bought"); void el.offsetWidth; el.classList.add("bought");
    });
  });
  // pointercancel: nothing to abort (no drag), but keep the standard contract
  document.addEventListener("pointercancel", function () {}, { passive: true });
}

// ---- logic tick: time-based, background-safe (setInterval fires ≥1/s when hidden) ----
var lastTick = Date.now();
function logicTick() {
  var now = Date.now();
  var dtMs = Math.min(now - lastTick, 2000);   // dt clamp (long absences go through offline path)
  lastTick = now;
  var dt = dtMs / 1000;
  if (!dtMs) return;

  // physics sub-steps (30ms) so background 1s ticks still collide correctly
  var steps = Math.max(1, Math.round(dtMs / 30));
  var sub = dt / steps;
  for (var s = 0; s < steps; s++) physics(sub);

  // merge pulse
  S.mergeT += dt;
  if (S.mergeT >= MERGE_EVERY) { S.mergeT -= MERGE_EVERY; mergePulse(); }

  S.rate = currentRate();
}

function physics(dt) {
  for (var i = 0; i < balls.length; i++) {
    var b = balls[i];
    b.px = b.x; b.py = b.y;
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.x < b.r) { b.x = b.r; b.vx = Math.abs(b.vx); }
    if (b.x > W - b.r) { b.x = W - b.r; b.vx = -Math.abs(b.vx); }
    if (b.y < b.r) { b.y = b.r; b.vy = Math.abs(b.vy); }
    if (b.y > H - b.r) { b.y = H - b.r; b.vy = -Math.abs(b.vy); }
    // brick collisions
    for (var k = 0; k < SLOTS; k++) {
      var br = S.bricks[k]; if (!br) continue;
      var bx = BRICK_LEFT + (k % COLS) * BRICK_W, by = BRICK_TOP + Math.floor(k / COLS) * BRICK_H;
      var cx = Math.max(bx, Math.min(b.x, bx + BRICK_W));
      var cy = Math.max(by, Math.min(b.y, by + BRICK_H));
      var dx = b.x - cx, dy = b.y - cy;
      if (dx * dx + dy * dy <= b.r * b.r) {
        // reflect on min-penetration axis
        if (Math.abs(dx) > Math.abs(dy)) b.vx = dx > 0 ? Math.abs(b.vx) : -Math.abs(b.vx);
        else b.vy = dy > 0 ? Math.abs(b.vy) : -Math.abs(b.vy);
        hitBrick(k, bx, by);
        break;
      }
    }
  }
}

function hitBrick(k, bx, by) {
  var br = S.bricks[k]; if (!br) return;
  br.hp = (br.hp === undefined ? br.v : br.hp) - S.damage;
  burst(bx + BRICK_W / 2, by + BRICK_H / 2, brickColor(br.v), 3);
  if (br.hp <= 0) {
    earn(br.v, bx + BRICK_W / 2, by);
    burst(bx + BRICK_W / 2, by + BRICK_H / 2, brickColor(br.v), 10);
    S.bricks[k] = null;           // stays empty until the next merge pulse refills it
  }
}

// ---- render (rAF, foreground only) ----
var cv = document.getElementById("cv"), ctx = cv.getContext("2d");
var dpr = Math.min(window.devicePixelRatio || 1, 2);
cv.width = W * dpr; cv.height = H * dpr;

var gridStars = [];
for (var gi = 0; gi < 40; gi++) gridStars.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + .4, tw: Math.random() * 6.28 });

function draw(tSec) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.save();
  if (shake > 0) { ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= .86; if (shake < .3) shake = 0; }
  // deep-space bg + breathing grid
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#0d0d24"); g.addColorStop(1, "#0a0a18");
  ctx.fillStyle = g; ctx.fillRect(-10, -10, W + 20, H + 20);
  ctx.globalAlpha = .05 + .02 * Math.sin(tSec);
  ctx.strokeStyle = "#22d3ee"; ctx.lineWidth = .5;
  for (var gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (var gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }
  ctx.globalAlpha = 1;
  gridStars.forEach(function (s) {
    ctx.globalAlpha = .3 + .25 * Math.sin(tSec * 1.4 + s.tw);
    ctx.fillStyle = "#c7d4ff"; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill();
  });
  ctx.globalAlpha = 1;
  // bricks (value in big digits, 2048 palette)
  for (var k = 0; k < SLOTS; k++) {
    var br = S.bricks[k]; if (!br) continue;
    var bx = BRICK_LEFT + (k % COLS) * BRICK_W, by = BRICK_TOP + Math.floor(k / COLS) * BRICK_H;
    var col = brickColor(br.v);
    var scale = 1, flash = 0;
    if (br.fx && performance.now() - br.fx < 300) {
      var p = (performance.now() - br.fx) / 300;
      scale = 1 + .25 * Math.sin(p * Math.PI); flash = 1 - p;
    }
    ctx.save();
    ctx.translate(bx + BRICK_W / 2, by + BRICK_H / 2); ctx.scale(scale, scale);
    ctx.shadowColor = col; ctx.shadowBlur = br.v >= 16 ? 18 : 8;
    ctx.fillStyle = col; ctx.globalAlpha = .28;
    ctx.fillRect(-BRICK_W / 2 + 3, -BRICK_H / 2 + 3, BRICK_W - 6, BRICK_H - 6);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = col; ctx.lineWidth = 1.5;
    ctx.strokeRect(-BRICK_W / 2 + 3, -BRICK_H / 2 + 3, BRICK_W - 6, BRICK_H - 6);
    if (flash > 0) { ctx.globalAlpha = flash * .8; ctx.fillStyle = "#fff"; ctx.fillRect(-BRICK_W / 2 + 3, -BRICK_H / 2 + 3, BRICK_W - 6, BRICK_H - 6); ctx.globalAlpha = 1; }
    ctx.shadowBlur = 0;
    ctx.fillStyle = br.v >= 32 ? "#fff" : col;
    ctx.font = "800 22px system-ui"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(br.v, 0, 1);
    // HP pips (damage progress, subtle)
    if (br.hp !== undefined && br.hp < br.v) {
      ctx.fillStyle = "rgba(255,255,255,.35)";
      ctx.fillRect(-BRICK_W / 2 + 6, BRICK_H / 2 - 8, (BRICK_W - 12) * (br.hp / br.v), 2);
    }
    ctx.restore();
  }
  // balls: white core, cyan glow, short trail
  balls.forEach(function (b) {
    ctx.strokeStyle = "rgba(34,211,238,.4)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(b.px, b.py); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.fillStyle = "#00e5ff"; ctx.shadowColor = "#00e5ff"; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(b.x - 1, b.y - 1, b.r * .45, 0, 7); ctx.fill();
  });
  // particles
  particles = particles.filter(function (p) { return p.life > 0; });
  particles.forEach(function (p) {
    p.x += p.vx; p.y += p.vy; p.vy += .05; p.life -= .04;
    ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.color;
    ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
  });
  ctx.globalAlpha = 1;
  // coin floats
  floats = floats.filter(function (f) { return f.life > 0; });
  floats.forEach(function (f) {
    f.y -= .8; f.life -= .02;
    ctx.globalAlpha = Math.max(0, f.life);
    ctx.fillStyle = f.col; ctx.font = "bold 15px system-ui"; ctx.textAlign = "center";
    ctx.fillText(f.txt, f.x, f.y);
  });
  ctx.globalAlpha = 1;
  // merge countdown bar (top edge)
  var mw = (W - 40) * (1 - S.mergeT / MERGE_EVERY);
  ctx.fillStyle = "rgba(167,139,250,.5)"; ctx.fillRect(20, 40, mw, 3);
  ctx.restore();
}

// ---- HUD / loop ----
function renderHud() {
  document.getElementById("coins").textContent = S.coins;
  document.getElementById("rate").textContent = S.rate;
  document.getElementById("highest").textContent = S.highest;
  document.getElementById("balln").textContent = S.ballCount;
  document.getElementById("dmg").textContent = S.damage;
}
function welcomePanel() {
  if (pendingOffline <= 0) return;
  document.getElementById("wGain").textContent = "+" + pendingOffline + " 🪙";
  document.getElementById("welcome").classList.add("show");
  coinRain();
  document.getElementById("wClaim").addEventListener("click", function () {
    S.coins += pendingOffline; pendingOffline = 0;
    document.getElementById("welcome").classList.remove("show");
    save(); renderHud();
  }, { once: true });
}
function coinRain() {
  var cols = ["#facc15", "#f97316", "#22d3ee"];
  for (var i = 0; i < 30; i++) {
    var f = document.createElement("span"); f.className = "cfrain";
    f.style.left = (Math.random() * 100) + "%";
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty("--dx", ((Math.random() - .5) * 80).toFixed(0) + "px");
    f.style.animationDelay = (Math.random() * .5).toFixed(2) + "s";
    document.body.appendChild(f);
    (function (el) { setTimeout(function () { el.remove(); }, 1900); })(f);
  }
}

// ---- testability hooks (GAME_STANDARD) ----
window.__qaState = function () {
  return {
    coins: S.coins, highest: S.highest, damage: S.damage, speedLvl: S.speedLvl,
    coinLvl: S.coinLvl, balls: balls.length, rate: S.rate,
    bricks: S.bricks.map(function (b) { return b ? b.v : 0; }),
    nextMergeIn: +(MERGE_EVERY - S.mergeT).toFixed(1),
    pendingOffline: pendingOffline
  };
};
window.__qa = {
  forceMerge: function () { S.mergeT = MERGE_EVERY; mergePulse(); },
  addCoins: function (n) { S.coins += n; renderShop(); },
  setRate: function (r) { S.rate = r; },
  // simulate "come back later": re-read the (backdated) save without triggering
  // the beforeunload save-storm that a real location.reload() would cause
  reloadState: function () { load(); syncBalls(); renderShop(); renderHud(); welcomePanel(); },
  advance: function (sec) {   // deterministic fast-forward: 1s steps of the real pipeline
    for (var i = 0; i < sec; i++) {
      var steps = 33, sub = 1 / steps;
      for (var s = 0; s < steps; s++) physics(sub);
      S.mergeT += 1;
      if (S.mergeT >= MERGE_EVERY) { S.mergeT -= MERGE_EVERY; mergePulse(); }
    }
    S.rate = currentRate(); renderHud(); renderShop();
  }
};

// ---- boot ----
load();
syncBalls();
bindShop();
renderShop();
renderHud();
welcomePanel();
document.getElementById("msgline").textContent = T("note");
setInterval(logicTick, 1000);
setInterval(save, 10000);
setInterval(function () { renderHud(); renderShop(); }, 500);
document.addEventListener("visibilitychange", function () {
  if (document.hidden) save();
  else { lastTick = Date.now(); welcomePanel(); }
});
window.addEventListener("beforeunload", save);
(function raf(t) {
  if (!document.hidden && performance.now() >= recordUntil - 500) draw(t / 1000);
  requestAnimationFrame(raf);
})(0);
