/* Neon Worms — core: arena world sim (player + 37 AI worms, layered
 * behaviors), food economy, boost-burn, kill collisions, spatial hash,
 * particles, daily-seeded layout. No DOM/rAF/input here. */
'use strict';
(function () {
  var WORLD = 4000;              // square arena, border kills
  var SEG_SPACING = 7;           // px between body path points
  var BASE_SPEED = 165, BOOST_SPEED = 295;
  var TURN_RATE = 4.4;           // rad/s
  var START_LEN = 12;
  var BOT_COUNT = 37;
  var FOOD_TARGET = 430;
  var HASH_CELL = 80;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dateSeed(dateStr) {
    var h = 2166136261;
    for (var i = 0; i < dateStr.length; i++) {
      h ^= dateStr.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function utcDateStr(offsetDays) {
    return new Date(Date.now() + (offsetDays || 0) * 86400000).toISOString().slice(0, 10);
  }

  var RANKS = [
    { min: 0, en: "Slug", zh: "蚯蚓" },
    { min: 30, en: "Hatchling", zh: "幼蛇" },
    { min: 60, en: "Coiler", zh: "盘蛇" },
    { min: 120, en: "Viper", zh: "毒蛇" },
    { min: 240, en: "Serpent", zh: "巨蟒" },
    { min: 400, en: "Radiant", zh: "光辉蚺" },
    { min: 700, en: "Neon Python", zh: "霓虹巨蟒" }
  ];
  function rankOf(len) {
    var r = RANKS[0];
    for (var i = 0; i < RANKS.length; i++) if (len >= RANKS[i].min) r = RANKS[i];
    return r;
  }

  var st = null;
  function freshState() {
    return {
      state: "TITLE",          // TITLE|PLAY|OVER
      rng: Math.random,
      dateStr: null,
      worms: [], food: [], parts: [],
      cam: { x: WORLD / 2, y: WORLD / 2, scale: 1 },
      time: 0, hitstop: 0, shake: 0,
      hash: new Map(),
      nextId: 1,
      events: [],
      foodEaten: 0
    };
  }
  function emit(name, data) { st.events.push({ name: name, data: data || null }); }

  // ---------- spatial hash over body points ----------
  function rebuildHash() {
    st.hash.clear();
    for (var w = 0; w < st.worms.length; w++) {
      var worm = st.worms[w];
      if (!worm.alive) continue;
      for (var p = 1; p < worm.pts.length; p += 2) {   // every 2nd point is enough
        var key = ((worm.pts[p].x / HASH_CELL) | 0) + "," + ((worm.pts[p].y / HASH_CELL) | 0);
        var arr = st.hash.get(key);
        if (!arr) { arr = []; st.hash.set(key, arr); }
        arr.push({ worm: worm, x: worm.pts[p].x, y: worm.pts[p].y });
      }
    }
  }
  function hashNear(x, y, r) {
    var out = [];
    var c0x = ((x - r) / HASH_CELL) | 0, c1x = ((x + r) / HASH_CELL) | 0;
    var c0y = ((y - r) / HASH_CELL) | 0, c1y = ((y + r) / HASH_CELL) | 0;
    for (var cx = c0x; cx <= c1x; cx++) {
      for (var cy = c0y; cy <= c1y; cy++) {
        var arr = st.hash.get(cx + "," + cy);
        if (arr) for (var i = 0; i < arr.length; i++) out.push(arr[i]);
      }
    }
    return out;
  }

  // ---------- worms ----------
  function radiusOf(len) { return 6.5 + Math.min(11, len / 55); }
  function makeWorm(o) {
    var len = o.len || START_LEN;
    var pts = [];
    for (var i = 0; i < len; i++) pts.push({ x: o.x - Math.cos(o.angle) * i * SEG_SPACING, y: o.y - Math.sin(o.angle) * i * SEG_SPACING });
    return {
      id: st.nextId++, isPlayer: !!o.isPlayer, alive: true,
      x: o.x, y: o.y, angle: o.angle, target: o.angle,
      len: len, pts: pts, boost: false,
      hue: o.hue, killerHue: null,
      kills: 0, aiTimer: st.rng() * 0.3, aiMode: "wander",
      wanderA: o.angle, name: o.name || null, respawnT: 0
    };
  }
  function aiHue(len) { return len > 120 ? "#ff2d95" : len > 60 ? "#ffd54a" : "#7c4dff"; }

  function spawnFood(x, y, v, hue) {
    if (st.food.length > FOOD_TARGET + 240) return;
    st.food.push({ x: x, y: y, v: v || 1, hue: hue || "#00e5ff", ph: st.rng() * 6.28 });
  }
  function safeSpot(margin) {
    for (var tries = 0; tries < 40; tries++) {
      var x = margin + st.rng() * (WORLD - margin * 2);
      var y = margin + st.rng() * (WORLD - margin * 2);
      var near = hashNear(x, y, 120);
      var ok = true;
      for (var i = 0; i < near.length; i++) {
        var dx = near[i].x - x, dy = near[i].y - y;
        if (dx * dx + dy * dy < 120 * 120) { ok = false; break; }
      }
      if (ok) return { x: x, y: y };
    }
    return { x: margin + st.rng() * (WORLD - margin * 2), y: margin + st.rng() * (WORLD - margin * 2) };
  }

  function grow(worm, n) {
    worm.len += n;
    var tail = worm.pts[worm.pts.length - 1];
    for (var i = 0; i < n; i++) worm.pts.push({ x: tail.x, y: tail.y });
  }
  function eatFood(worm) {
    var r = radiusOf(worm.len);
    var ate = 0;
    for (var i = st.food.length - 1; i >= 0; i--) {
      var f = st.food[i];
      var dx = f.x - worm.x, dy = f.y - worm.y;
      if (dx * dx + dy * dy < (r + 14) * (r + 14)) {
        ate += f.v;
        st.food.splice(i, 1);
        if (st.food.length < FOOD_TARGET) scatterFood(1);
        if (worm.isPlayer) emit("eat");
      }
    }
    if (ate > 0) { grow(worm, ate); st.foodEaten += worm.isPlayer ? ate : 0; }
    return ate;
  }
  function scatterFood(n) {
    for (var i = 0; i < n; i++) {
      var v = st.rng() < 0.06 ? 5 : 1;
      spawnFood(60 + st.rng() * (WORLD - 120), 60 + st.rng() * (WORLD - 120), v,
        v > 1 ? "#ffd54a" : (st.rng() < 0.5 ? "#00e5ff" : "#7c4dff"));
    }
  }

  function killWorm(worm, killer) {
    worm.alive = false;
    // body -> food burst
    for (var i = 0; i < worm.pts.length; i += 2) {
      spawnFood(worm.pts[i].x + (st.rng() - 0.5) * 14, worm.pts[i].y + (st.rng() - 0.5) * 14,
        2, worm.isPlayer ? "#ff2d95" : "#ffd54a");
    }
    for (var p = 0; p < 26; p++) {
      var a = st.rng() * 6.28, v = 60 + st.rng() * 240;
      st.parts.push({ x: worm.x, y: worm.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                      life: 0.6 + st.rng() * 0.5, max: 1.1, hue: worm.isPlayer ? "#ff2d95" : worm.hue, r: 2 + st.rng() * 3 });
    }
    if (killer && killer.alive) killer.kills++;
    if (worm.isPlayer) {
      st.state = "OVER";
      emit("over", { len: worm.len, kills: worm.kills, time: st.time });
      try {
        var bl = parseInt(localStorage.getItem("np_worms_best_len") || "0", 10) || 0;
        if (worm.len > bl) localStorage.setItem("np_worms_best_len", String(worm.len));
        var bk = parseInt(localStorage.getItem("np_worms_best_kills") || "0", 10) || 0;
        if (worm.kills > bk) localStorage.setItem("np_worms_best_kills", String(worm.kills));
      } catch (e) {}
    } else {
      emit("kill", { victim: worm, killer: killer || null });
      worm.respawnT = 2.5 + st.rng() * 3.5;
    }
  }

  function steer(worm, dt) {
    var d = worm.target - worm.angle;
    while (d > Math.PI) d -= 6.283185307179586;
    while (d < -Math.PI) d += 6.283185307179586;
    var turn = TURN_RATE * dt * (worm.boost ? 0.82 : 1);
    if (d > turn) d = turn; else if (d < -turn) d = -turn;
    worm.angle += d;
    var spd = worm.boost && worm.len > 10 ? BOOST_SPEED : BASE_SPEED;
    if (worm.boost && worm.len <= 10) worm.boost = false;
    worm.x += Math.cos(worm.angle) * spd * dt;
    worm.y += Math.sin(worm.angle) * spd * dt;
    // path points: push head when it moved a spacing away
    var h = worm.pts[0];
    var dx = worm.x - h.x, dy = worm.y - h.y;
    if (dx * dx + dy * dy >= SEG_SPACING * SEG_SPACING) {
      worm.pts.unshift({ x: worm.x, y: worm.y });
      while (worm.pts.length > worm.len) worm.pts.pop();
    }
    // boost burn: 2 segments per second, dropping food behind
    if (worm.boost && worm.len > 10) {
      worm.burnT = (worm.burnT || 0) + dt;
      while (worm.burnT >= 0.5) {
        worm.burnT -= 0.5;
        if (worm.len > 12) {
          worm.len--;
          worm.pts.pop();
          if (st.rng() < 0.6) spawnFood(worm.pts[worm.pts.length - 1].x, worm.pts[worm.pts.length - 1].y, 1, "#ff9f1a");
        }
      }
    }
  }

  // ---------- AI brain (cheap, layered) ----------
  function aiThink(worm) {
    worm.aiTimer = 0.12 + st.rng() * 0.18;
    var len = worm.len;
    // 1) flee: enemy head nearby & heading at me
    var threat = null, tScore = 0;
    for (var i = 0; i < st.worms.length; i++) {
      var o = st.worms[i];
      if (!o.alive || o === worm) continue;
      var dx = o.x - worm.x, dy = o.y - worm.y;
      var d2 = dx * dx + dy * dy;
      if (d2 > 260 * 260) continue;
      var heading = Math.cos(o.angle) * dx + Math.sin(o.angle) * dy;
      if (heading > 0 && d2 < 120 * 120) {          // close and closing in
        var s = (260 - Math.sqrt(d2)) * (o.len > len ? 2 : 1);
        if (s > tScore) { tScore = s; threat = o; }
      }
    }
    if (threat) {
      worm.aiMode = "flee";
      worm.target = Math.atan2(worm.y - threat.y, worm.x - threat.x) + (st.rng() - 0.5) * 0.6;
      worm.boost = len > 22;
      return;
    }
    // 2) hunt: intercept a smaller worm's future head
    var prey = null, pD = 380 * 380;
    for (var j = 0; j < st.worms.length; j++) {
      var q = st.worms[j];
      if (!q.alive || q === worm) continue;
      if (q.len * 1.3 >= len) continue;
      var dx2 = q.x - worm.x, dy2 = q.y - worm.y;
      var d22 = dx2 * dx2 + dy2 * dy2;
      if (d22 < pD) { pD = d22; prey = q; }
    }
    if (prey) {
      worm.aiMode = "hunt";
      var lead = 60 + Math.min(140, Math.sqrt(pD) * 0.5);
      worm.target = Math.atan2(prey.y + Math.sin(prey.angle) * lead - worm.y,
                               prey.x + Math.cos(prey.angle) * lead - worm.x);
      worm.boost = len > 24 && pD < 220 * 220;
      return;
    }
    // 3) seek nearest food (coarse scan on a sample)
    var f = null, fD = 520 * 520;
    for (var k = (st.rng() * 97) | 0, seen = 0; seen < 90 && k < st.food.length; k++, seen++) {
      var fo = st.food[k]; if (!fo) break;
      var dx3 = fo.x - worm.x, dy3 = fo.y - worm.y;
      var d32 = dx3 * dx3 + dy3 * dy3;
      if (d32 < fD) { fD = d32; f = fo; }
    }
    if (f) {
      worm.aiMode = "seek";
      worm.target = Math.atan2(f.y - worm.y, f.x - worm.x);
      worm.boost = false;
      return;
    }
    // 4) wander: smooth drift
    worm.aiMode = "wander";
    worm.wanderA += (st.rng() - 0.5) * 1.2;
    worm.target = worm.wanderA;
    worm.boost = false;
  }
  function aiAvoid(worm) {
    // border: steer inward when close
    var M = 260;
    if (worm.x < M) worm.target = 0;
    else if (worm.x > WORLD - M) worm.target = Math.PI;
    else if (worm.y < M) worm.target = Math.PI / 2;
    else if (worm.y > WORLD - M) worm.target = -Math.PI / 2;
    if (worm.x < M || worm.x > WORLD - M || worm.y < M || worm.y > WORLD - M) { worm.aiMode = "avoid"; return; }
    // body ray probe: three short rays, veer away from blockage
    var probe = 90 + Math.min(70, worm.len);
    var hits = [0, 0, 0];
    var angs = [0, -0.55, 0.55];
    for (var a = 0; a < 3; a++) {
      var ang = worm.angle + angs[a];
      var px = worm.x + Math.cos(ang) * probe, py = worm.y + Math.sin(ang) * probe;
      var near = hashNear(px, py, 26);
      for (var i = 0; i < near.length; i++) {
        if (near[i].worm === worm) continue;
        var dx = near[i].x - px, dy = near[i].y - py;
        if (dx * dx + dy * dy < 26 * 26) { hits[a] = 1; break; }
      }
    }
    if (hits[0]) {
      worm.aiMode = "avoid";
      worm.target = worm.angle + (hits[2] ? -1.1 : hits[1] ? 1.1 : (st.rng() < 0.5 ? -1.1 : 1.1));
      worm.boost = false;
    } else if (hits[1] && !hits[2]) {
      worm.aiMode = "avoid"; worm.target = worm.angle + 0.5;
    } else if (hits[2] && !hits[1]) {
      worm.aiMode = "avoid"; worm.target = worm.angle - 0.5;
    }
  }

  function collisions(worm) {
    // border
    if (worm.x < 8 || worm.x > WORLD - 8 || worm.y < 8 || worm.y > WORLD - 8) {
      killWorm(worm, null);
      return;
    }
    var r = radiusOf(worm.len);
    var near = hashNear(worm.x, worm.y, r + 24);
    for (var i = 0; i < near.length; i++) {
      var b = near[i];
      if (b.worm === worm) continue;
      var dx = b.x - worm.x, dy = b.y - worm.y;
      var rr = r + radiusOf(b.worm.len) - 3;
      if (dx * dx + dy * dy < rr * rr) {
        killWorm(worm, b.worm);
        return;
      }
    }
  }

  function step(dt) {
    if (st.state !== "PLAY") return;
    if (st.hitstop > 0) { st.hitstop -= dt; return; }
    st.time += dt;
    rebuildHash();
    // AI decisions + steering
    for (var i = 0; i < st.worms.length; i++) {
      var w = st.worms[i];
      if (!w.alive) {
        if (!w.isPlayer) {
          w.respawnT -= dt;
          if (w.respawnT <= 0) {
            var spot = safeSpot(300);
            var nl = 10 + (st.rng() * 40) | 0;
            var nw = makeWorm({ x: spot.x, y: spot.y, angle: st.rng() * 6.28, len: nl, hue: aiHue(nl) });
            st.worms[i] = nw;
          }
        }
        continue;
      }
      if (!w.isPlayer && !w.qaNoAI) { aiThink(w); aiAvoid(w); }
      steer(w, dt);
    }
    // eating + collisions
    for (var j = 0; j < st.worms.length; j++) {
      var w2 = st.worms[j];
      if (!w2.alive) continue;
      eatFood(w2);
      collisions(w2);
      if (st.state === "OVER") break;
    }
    // particles
    for (var p = st.parts.length - 1; p >= 0; p--) {
      var q = st.parts[p];
      q.life -= dt;
      if (q.life <= 0) { st.parts.splice(p, 1); continue; }
      q.x += q.vx * dt; q.y += q.vy * dt;
      q.vx *= 0.96; q.vy *= 0.96;
    }
    // camera follow + zoom by length
    var pl = player();
    if (pl && pl.alive) {
      st.cam.x += (pl.x - st.cam.x) * Math.min(1, dt * 6);
      st.cam.y += (pl.y - st.cam.y) * Math.min(1, dt * 6);
      st.cam.scale = Math.max(0.62, 1.02 - pl.len / 1100);
    }
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 30);
  }

  function player() { return st.worms[0]; }

  function start(mode, seed) {
    st = freshState();
    if (mode === "daily" || typeof seed === "number") {
      st.dateStr = utcDateStr();
      st.rng = mulberry32(seed === undefined ? dateSeed(st.dateStr) : seed >>> 0);
    }
    st.state = "PLAY";
    st.time = 0;
    // player at center
    var ps = { x: WORLD / 2, y: WORLD / 2 };
    var pl = makeWorm({ x: ps.x, y: ps.y, angle: -Math.PI / 2, len: START_LEN, hue: "#00e5ff", isPlayer: true });
    st.worms.push(pl);
    st.cam.x = ps.x; st.cam.y = ps.y;
    // bots (hash rebuilt per spawn so safeSpot sees prior bodies)
    for (var b = 0; b < BOT_COUNT; b++) {
      var s2 = safeSpot(220);
      var bl = 10 + (st.rng() * 60) | 0;
      st.worms.push(makeWorm({ x: s2.x, y: s2.y, angle: st.rng() * 6.28, len: bl, hue: aiHue(bl) }));
      rebuildHash();
    }
    // daily-seeded food layout
    for (var f = 0; f < FOOD_TARGET; f++) {
      var v = st.rng() < 0.055 ? 5 : 1;
      spawnFood(60 + st.rng() * (WORLD - 120), 60 + st.rng() * (WORLD - 120), v,
        v > 1 ? "#ffd54a" : (st.rng() < 0.5 ? "#00e5ff" : "#7c4dff"));
    }
    emit("start");
  }

  function leaderboard(n) {
    var alive = st.worms.filter(function (w) { return w.alive; });
    alive.sort(function (a, b) { return b.len - a.len; });
    return alive.slice(0, n || 5).map(function (w) {
      return { isPlayer: w.isPlayer, len: w.len, kills: w.kills };
    });
  }
  function snapshot() {
    var pl = player();
    return {
      state: st.state, len: pl ? pl.len : 0, kills: pl ? pl.kills : 0,
      time: Math.round(st.time * 1000) / 1000, alive: !!(pl && pl.alive),
      bots: st.worms.reduce(function (n, w) { return n + (w.alive && !w.isPlayer ? 1 : 0); }, 0),
      food: st.food.length, eaten: st.foodEaten,
      rank: rankOf(pl ? pl.len : 0),
      date: st.dateStr,
      board: leaderboard(5),
      boost: !!(pl && pl.boost),
      aiModes: st.worms.reduce(function (m, w) { if (w.alive && !w.isPlayer) m[w.aiMode] = (m[w.aiMode] || 0) + 1; return m; }, {})
    };
  }

  var API = {
    WORLD: WORLD, START_LEN: START_LEN, BOT_COUNT: BOT_COUNT,
    mulberry32: mulberry32, dateSeed: dateSeed, utcDateStr: utcDateStr,
    rankOf: rankOf, radiusOf: radiusOf,
    start: start, step: step, snapshot: snapshot, leaderboard: leaderboard,
    st: function () { return st; },
    player: player,
    drainEvents: function (handlers) {
      for (var i = 0; i < st.events.length; i++) {
        var e = st.events[i];
        if (handlers[e.name]) handlers[e.name](e.data);
      }
      st.events.length = 0;
    },
    // qa helpers: place deterministic scenarios
    qaPlacePlayer: function (x, y, angle, len) {
      var pl = player();
      pl.x = x; pl.y = y; pl.angle = angle; pl.target = angle; pl.len = len || pl.len;
      pl.pts = [];
      for (var i = 0; i < pl.len; i++) pl.pts.push({ x: x - Math.cos(angle) * i * SEG_SPACING, y: y - Math.sin(angle) * i * SEG_SPACING });
    },
    qaSpawnBot: function (x, y, angle, len) {
      var b = makeWorm({ x: x, y: y, angle: angle, len: len || 30, hue: aiHue(len || 30) });
      b.aiTimer = 1e9;              // no AI decisions; straight line under qa
      b.qaNoAI = true;              // skip border/ray avoidance so scenarios stay put
      st.worms.push(b);
      return b;
    },
    qaSetTarget: function (worm, angle) { worm.target = angle; },
    qaClearBots: function () {
      st.worms = st.worms.filter(function (w) { return w.isPlayer; });
    },
    burstAt: function (x, y, hue, n) {
      for (var i = 0; i < (n || 10); i++) {
        var a = st.rng() * 6.28, v = 60 + st.rng() * 200;
        st.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, max: 0.5, hue: hue, r: 2.5 });
      }
    }
  };
  window.WORMS = API;
  window.__qaState = snapshot;
})();
