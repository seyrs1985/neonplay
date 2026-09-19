/* Neon Runner — core: ground physics (variable jump, duck), seeded
 * obstacle generator with a passable-gap guarantee, speed tiers per 500m,
 * collisions, particles. No DOM/rAF/input here. */
'use strict';
(function () {
  var G = 2400, JUMPV = 830, JUMP_CUT = 300;   // jump ~143px high, 0.69s air
  var BASE_SPEED = 340, TIER_STEP = 45, MAX_TIER = 8;
  var PLAYER_X = 130;
  var M_PER_PX = 0.1;

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
  function speedAt(meters) {
    return BASE_SPEED + Math.min(MAX_TIER, Math.floor(meters / 500)) * TIER_STEP;
  }
  var AIR_T = (2 * JUMPV) / G;                 // 0.69s
  // minimum gap between obstacle STARTS that any human reaction can clear
  function minGap(speed) { return speed * (AIR_T + 0.42); }

  // obstacle generator: types gated by tier, guaranteed-passable gaps
  // types: spikes(w), barrier(h), double(h), drone()
  function pickType(rng, tier) {
    var r = rng();
    if (tier >= 2 && r < 0.22) return "drone";
    if (tier >= 4 && r < 0.34) return "double";
    if (tier >= 1 && r < 0.62) return "barrier";
    return "spikes";
  }
  function obstacleSpec(type, rng) {
    if (type === "spikes") return { type: type, w: 38 + Math.round(rng() * 34), h: 34 };
    if (type === "barrier") return { type: type, w: 26, h: 54 + Math.round(rng() * 30) };
    if (type === "double") return { type: type, w: 26, h: 50 + Math.round(rng() * 24), gap2: 88 + Math.round(rng() * 26) };
    return { type: "drone", w: 46, h: 30, air: 34 + Math.round(rng() * 12) };  // air = bottom above ground (34-46: standing 58 hits, ducking 30 clears)
  }
  // pure: full obstacle list for a seed (qa + daily preview)
  function route(seed, count) {
    var rng = mulberry32(seed >>> 0);
    var out = [], x = 900 + rng() * 400;
    for (var i = 0; i < (count || 200); i++) {
      var m = x * M_PER_PX;
      var tier = Math.min(MAX_TIER, Math.floor(m / 500));
      var spec = obstacleSpec(pickType(rng, tier), rng);
      spec.x = x;
      out.push(spec);
      var span = spec.type === "double" ? spec.w + spec.gap2 + spec.w : spec.w;
      var v = speedAt(m);
      x += span + v * (AIR_T + 0.42) + rng() * 340;
    }
    return out;
  }

  var st = null;
  function freshState() {
    return {
      state: "TITLE", mode: "daily", dateStr: null,
      rng: Math.random, routeIdx: 0, routePlan: null,
      scrollX: 0, dist: 0, speed: BASE_SPEED, tier: 0,
      obstacles: [], parts: [],
      py: 0, vy: 0, grounded: true, ducking: false, jumpHeld: false,
      runT: 0, events: [], pulse: 0, shake: 0, best: null
    };
  }
  function emit(name, data) { st.events.push({ name: name, data: data || null }); }

  function playerBox() {
    // y-down space with ground at 0; py is height above ground
    var h = st.ducking ? 30 : 58;
    return { x: PLAYER_X - 16, w: 32, y: -(st.py + h), h: h };
  }
  function obstacleBoxes(o, groundY) {
    if (o.type === "drone") {
      return [{ x: o.sx, w: o.w, y: groundY - o.air - o.h, h: o.h }];
    }
    if (o.type === "double") {
      return [{ x: o.sx, w: o.w, y: groundY - o.h, h: o.h },
              { x: o.sx + o.w + o.gap2, w: o.w, y: groundY - o.h, h: o.h }];
    }
    return [{ x: o.sx, w: o.w, y: groundY - o.h, h: o.h }];
  }
  function hits(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }

  function spawnLogic() {
    // keep obstacles coming from the deterministic route plan
    while (st.routeIdx < st.routePlan.length) {
      var spec = st.routePlan[st.routeIdx];
      var sx = spec.x - st.scrollX + PLAYER_X;    // plan built in world px with player at 0
      if (sx > canvasW() + 200) break;
      var o = Object.assign({}, spec, { sx: sx, passed: false });
      st.obstacles.push(o);
      st.routeIdx++;
    }
  }
  var _cw = 960;
  function canvasW() { return _cw; }
  function setCanvasW(w) { _cw = Math.max(480, Math.min(1400, w)); }

  function step(dt) {
    if (st.state !== "PLAY") return;
    st.runT += dt;
    st.speed = speedAt(st.dist);
    st.scrollX += st.speed * dt;
    st.dist = st.scrollX * M_PER_PX;
    var tier = Math.min(MAX_TIER, Math.floor(st.dist / 500));
    if (tier > st.tier) { st.tier = tier; st.pulse = 1; emit("milestone", { tier: tier }); }
    // player physics
    if (!st.grounded) {
      st.vy -= G * dt;
      st.py += st.vy * dt;
      if (st.py <= 0) { st.py = 0; st.vy = 0; st.grounded = true; emit("land"); }
    }
    // obstacles
    for (var i = st.obstacles.length - 1; i >= 0; i--) {
      var o = st.obstacles[i];
      o.sx -= st.speed * dt;
      if (o.sx + o.w < -60) st.obstacles.splice(i, 1);
    }
    spawnLogic();
    // collisions (drone bob is visual only for determinism)
    var groundY = 0;                 // logical ground reference = 0; boxes measured up
    var pb = playerBox();
    for (var j = 0; j < st.obstacles.length; j++) {
      var boxes = obstacleBoxes(st.obstacles[j], 0);
      for (var b = 0; b < boxes.length; b++) {
        var bx = boxes[b];
        // convert both to "up from ground" space: player y is st.py (up), box y is up too
        if (hits({ x: pb.x, w: pb.w, y: pb.y, h: pb.h }, bx)) {
          die();
          return;
        }
      }
    }
    // particles
    for (var p = st.parts.length - 1; p >= 0; p--) {
      var q = st.parts[p];
      q.life -= dt;
      if (q.life <= 0) { st.parts.splice(p, 1); continue; }
      q.x -= st.speed * dt * 0.4;
      q.x += q.vx * dt; q.y += q.vy * dt; q.vy += 900 * dt;
    }
    if (st.pulse > 0) st.pulse = Math.max(0, st.pulse - dt * 2);
    if (st.shake > 0) st.shake = Math.max(0, st.shake - dt * 40);
    if (st.grounded && !st.ducking && st.runT % 0.28 < dt) emit("step");
  }
  function die() {
    st.state = "OVER";
    st.shake = 14;
    for (var i = 0; i < 30; i++) {
      var a = Math.random() * 6.28, v = 80 + Math.random() * 260;
      st.parts.push({ x: PLAYER_X, y: -(st.py + 30), vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                      life: 0.7, max: 0.7, hue: "#00e5ff", r: 2.5 });
    }
    emit("over", { dist: st.dist, mode: st.mode });
    try {
      if (st.mode === "classic") {
        var b = parseInt(localStorage.getItem("np_runner_best_classic") || "0", 10) || 0;
        if (st.dist > b) localStorage.setItem("np_runner_best_classic", String(Math.round(st.dist)));
      } else {
        var k = "np_runner_best_daily_" + st.dateStr;
        var bd = parseInt(localStorage.getItem(k) || "0", 10) || 0;
        if (st.dist > bd) localStorage.setItem(k, String(Math.round(st.dist)));
      }
    } catch (e) {}
  }

  function jump(on) {
    st.jumpHeld = !!on;
    if (on && st.state === "PLAY" && st.grounded) {
      st.vy = JUMPV; st.grounded = false; st.ducking = false;
      emit("jump");
    }
    if (!on && !st.grounded && st.vy > JUMP_CUT) st.vy = JUMP_CUT;   // short hop
  }
  function duck(on) {
    if (st.state !== "PLAY") return;
    st.ducking = !!on && st.grounded;
  }
  function start(mode, seed) {
    st = freshState();
    st.mode = mode;
    if (mode === "daily") {
      st.dateStr = utcDateStr();
      st.routePlan = route(seed === undefined ? dateSeed(st.dateStr) : seed >>> 0, 400);
    } else if (typeof seed === "number") {
      st.routePlan = route(seed >>> 0, 400);
    } else {
      st.routePlan = null;
    }
    if (!st.routePlan) {
      // classic: seeded by Math.random each run
      var s = (Math.random() * 4294967295) >>> 0;
      st.routePlan = route(s, 400);
    }
    st.state = "PLAY";
    emit("start");
  }
  function snapshot() {
    var nxt = st.obstacles.length ? st.obstacles[0].type : (st.routePlan[st.routeIdx] ? st.routePlan[st.routeIdx].type : null);
    return {
      state: st.state, mode: st.mode, dist: Math.round(st.dist),
      speed: Math.round(st.speed), tier: st.tier, grounded: st.grounded,
      ducking: st.ducking, next: nxt, date: st.dateStr,
      py: Math.round(st.py), dead: st.state === "OVER"
    };
  }

  var API = {
    G: G, JUMPV: JUMPV, AIR_T: AIR_T, BASE_SPEED: BASE_SPEED, PLAYER_X: PLAYER_X,
    mulberry32: mulberry32, dateSeed: dateSeed, utcDateStr: utcDateStr,
    speedAt: speedAt, minGap: minGap, route: route,
    start: start, step: step, jump: jump, duck: duck,
    setCanvasW: setCanvasW, snapshot: snapshot,
    st: function () { return st; },
    burstAt: function (x, y, hue, n) {
      for (var i = 0; i < (n || 8); i++) {
        var a = Math.random() * 6.28, v = 60 + Math.random() * 200;
        st.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, max: 0.5, hue: hue, r: 2.5 });
      }
    },
    drainEvents: function (handlers) {
      for (var i = 0; i < st.events.length; i++) {
        var e = st.events[i];
        if (handlers[e.name]) handlers[e.name](e.data);
      }
      st.events.length = 0;
    }
  };
  window.RUNNER = API;
  window.__PHYS = { G: G, JUMPV: JUMPV, VMAX: BASE_SPEED + MAX_TIER * TIER_STEP };
  window.__qaState = snapshot;
})();
