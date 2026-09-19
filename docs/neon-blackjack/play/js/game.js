/* Neon Blackjack — core: 6-deck shoe, S17 dealer, basic-strategy coach
 * (hard/soft tables), betting/payout economy, daily seeded session.
 * Pure logic — no DOM/rAF/input here. */
'use strict';
(function () {
  var DECKS = 6, SHOE_CUT = 78;        // reshuffle below 78 cards (25%)
  var START_CHIPS = 1000, MIN_BET = 10, DAILY_HANDS = 20;

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

  // cards: {r:1..13 (1=A), s:0..3} ♠♥♦♣
  function cardPts(r) { return r === 1 ? 11 : Math.min(10, r); }
  function handValue(cards) {
    var total = 0, aces = 0;
    for (var i = 0; i < cards.length; i++) {
      total += cardPts(cards[i].r);
      if (cards[i].r === 1) aces++;
    }
    while (total > 21 && aces > 0) { total -= 10; aces--; }
    return { total: total, soft: aces > 0 };
  }
  function isBlackjack(cards) {
    return cards.length === 2 && handValue(cards).total === 21;
  }

  // ---------- basic strategy (S17, 4-8 decks, no split/surrender) ----------
  // returns {a: 'H'|'S'|'D', why: key}; D falls back per table when doubling unavailable
  function basicStrategy(cards, dealerUp, canDouble) {
    var hv = handValue(cards);
    var up = cardPts(dealerUp.r);                 // A counts 11
    var soft = hv.soft && hv.total <= 21;
    function act(a, why) {
      if (a === "D" && !canDouble) {
        if (soft && hv.total === 18) return { a: "S", why: why };
        return { a: hv.total >= 18 ? "S" : "H", why: why };
      }
      return { a: a, why: why };
    }
    if (!soft) {
      var t = hv.total;
      if (t >= 17) return act("S", "stand17");
      if (t === 11) return (up >= 2 && up <= 10) ? act("D", "dbl11") : act("H", "vsAce");
      if (t === 10) return (up >= 2 && up <= 9) ? act("D", "dbl10") : act("H", "strong");
      if (t === 9) return (up >= 3 && up <= 6) ? act("D", "dbl9") : act("H", "strong");
      if (t === 12) return (up >= 4 && up <= 6) ? act("S", "bustCard") : act("H", "weak");
      if (t >= 13 && t <= 16) return (up >= 2 && up <= 6) ? act("S", "bustCard") : act("H", "strong");
      return act("H", "low");
    }
    var s = hv.total;                             // 13..20 with ace as 11
    if (s >= 19) return act("S", "stand19");
    if (s === 18) {
      if (up >= 3 && up <= 6) return act("D", "dblSoft18");
      if (up === 2 || up === 7 || up === 8) return act("S", "bustCard");
      return act("H", "strong");
    }
    if (s === 17) return (up >= 3 && up <= 6) ? act("D", "softDraw") : act("H", "softDraw");
    if (s >= 15) return (up >= 4 && up <= 6) ? act("D", "softDraw") : act("H", "softDraw");
    return (up >= 5 && up <= 6) ? act("D", "softDraw") : act("H", "softDraw");
  }

  // ---------- state ----------
  var st = null;
  function freshState() {
    return {
      phase: "bet",                // bet|player|dealer|result|dailyDone
      mode: "classic",             // classic|daily
      dateStr: null, rng: Math.random,
      shoe: [], dealt: 0,
      chips: START_CHIPS, bet: 0, baseBet: 0,
      player: [], dealer: [], hideHole: true,
      result: null,                // {kind:'win'|'lose'|'push'|'bj'|'bust'|'dealerbj', delta}
      dailyHand: 0, dailyBase: START_CHIPS,
      stats: { w: 0, l: 0, p: 0, bj: 0 },
      coach: { ok: 0, no: 0, on: true },
      events: []
    };
  }
  function emit(name, data) { st.events.push({ name: name, data: data || null }); }

  function loadPersist() {
    try {
      var c = parseInt(localStorage.getItem("np_bj_chips") || "0", 10);
      if (c > 0) st.chips = c;
      var s = JSON.parse(localStorage.getItem("np_bj_stats") || "null");
      if (s && typeof s.w === "number") st.stats = s;
      var co = JSON.parse(localStorage.getItem("np_bj_coach") || "null");
      if (co && typeof co.ok === "number") st.coach.ok = co.ok;
      if (co && typeof co.no === "number") st.coach.no = co.no;
    } catch (e) {}
  }
  function savePersist() {
    try {
      localStorage.setItem("np_bj_chips", String(st.chips));
      localStorage.setItem("np_bj_stats", JSON.stringify(st.stats));
      localStorage.setItem("np_bj_coach", JSON.stringify({ ok: st.coach.ok, no: st.coach.no, on: st.coach.on }));
    } catch (e) {}
  }

  function buildShoe(rng) {
    var cards = [];
    for (var d = 0; d < DECKS; d++)
      for (var s = 0; s < 4; s++)
        for (var r = 1; r <= 13; r++) cards.push({ r: r, s: s });
    for (var i = cards.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = cards[i]; cards[i] = cards[j]; cards[j] = t;
    }
    return cards;
  }
  function draw() {
    if (!st.shoe.length) { st.shoe = buildShoe(st.rng); emit("shuffle"); }
    st.dealt++;
    return st.shoe.shift();
  }

  // dealer plays by house rule; drawFn injectable (qa). Returns revealed hand.
  function dealerPlay(hand, drawFn) {
    var v = handValue(hand);
    while (v.total < 17) {                       // S17: soft 17 stands
      hand.push(drawFn());
      v = handValue(hand);
    }
    return hand;
  }

  function start(mode, seed) {
    st = freshState();
    st.mode = mode;
    if (mode === "daily") {
      st.dateStr = utcDateStr();
      st.rng = mulberry32(seed === undefined ? dateSeed(st.dateStr) : seed >>> 0);
      st.chips = START_CHIPS;                    // fresh daily pool
    }
    loadPersistSafe(mode);
    st.shoe = buildShoe(st.rng);
    st.phase = "bet";
    emit("start");
  }
  function loadPersistSafe(mode) {
    if (mode === "classic") loadPersist();
    if (mode === "classic" && st.chips < MIN_BET) {
      st.chips = START_CHIPS;                    // bankruptcy relief
      emit("relief");
    }
  }
  function forceShoe(cards) {                    // qa: deterministic rigging
    st.shoe = cards.slice();
  }

  function ensurePlayable() {                 // bust-out relief before a stuck state
    if (st.chips < MIN_BET) {
      st.chips = START_CHIPS;
      emit("relief");
    }
  }
  function setBet(n) {
    if (st.phase !== "bet") return false;
    ensurePlayable();
    var v = st.bet + n;
    if (v > st.chips) v = st.chips;
    if (v < 0) v = 0;
    st.bet = v;
    return true;
  }
  function clearBet() { if (st.phase === "bet") st.bet = 0; }

  function deal() {
    if (st.phase !== "bet" || st.bet < MIN_BET || st.bet > st.chips) return false;
    if (st.shoe.length < 4) { st.shoe = buildShoe(st.rng); emit("shuffle"); }
    st.chips -= st.bet;
    st.baseBet = st.bet;
    st.player = [draw(), draw()];
    st.dealer = [draw(), draw()];
    st.hideHole = true;
    st.result = null;
    emit("deal");
    var up = st.dealer[0];
    var playerBJ = isBlackjack(st.player);
    var dealerBJ = (cardPts(up.r) >= 10 || up.r === 1) && isBlackjack(st.dealer);
    if (playerBJ || dealerBJ) {                  // peeked immediately on A/10
      st.hideHole = false;
      if (playerBJ && dealerBJ) return settle("push", 0);
      if (playerBJ) return settle("bj", Math.round(st.baseBet * 1.5));
      return settle("dealerbj", -st.baseBet);
    }
    st.phase = "player";
    return true;
  }
  function hint() {
    if (st.phase !== "player") return null;
    return basicStrategy(st.player, st.dealer[0], canDouble());
  }
  function canDouble() {
    return st.player.length === 2 && st.chips >= st.baseBet;
  }
  function coachScore(action) {
    var h = hint();
    if (h) {
      if (h.a === action) st.coach.ok++; else st.coach.no++;
    }
  }
  function hit() {
    if (st.phase !== "player") return false;
    coachScore("H");
    st.player.push(draw());
    emit("hit");
    var v = handValue(st.player);
    if (v.total > 21) { settle("bust", -st.baseBet); }
    return true;
  }
  function stand() {
    if (st.phase !== "player") return false;
    coachScore("S");
    dealerTurn();
    return true;
  }
  function double() {
    if (st.phase !== "player" || !canDouble()) return false;
    coachScore("D");
    st.chips -= st.baseBet;
    st.bet = st.baseBet * 2;
    st.player.push(draw());
    emit("double");
    if (handValue(st.player).total > 21) { settle("bust", -st.bet); }
    else dealerTurn();
    return true;
  }
  function dealerTurn() {
    st.phase = "dealer";
    st.hideHole = false;
    dealerPlay(st.dealer, draw);
    var pv = handValue(st.player).total, dv = handValue(st.dealer).total;
    if (dv > 21) settle("win", st.bet);
    else if (pv > dv) settle("win", st.bet);
    else if (pv < dv) settle("lose", -st.bet);
    else settle("push", 0);
  }
  function settle(kind, delta) {
    st.result = { kind: kind, delta: delta };
    // bet was deducted at deal (and again on double). Winning hands get the
    // stake back plus profit; losing hands get nothing back.
    st.chips += (delta >= 0 ? st.bet : 0) + Math.max(0, delta);
    st.bet = 0;
    if (kind === "win") st.stats.w++;
    else if (kind === "bj") { st.stats.w++; st.stats.bj++; }
    else if (kind === "lose" || kind === "bust" || kind === "dealerbj") st.stats.l++;
    else st.stats.p++;
    st.phase = "result";
    emit(kind, { delta: delta });
    if (st.mode === "daily") {
      st.dailyHand++;
      if (st.dailyHand >= DAILY_HANDS) {
        var profit = st.chips - st.dailyBase;
        try {
          var k = "np_bj_daily_" + st.dateStr;
          var best = parseInt(localStorage.getItem(k) || "0", 10) || 0;
          if (profit > best) localStorage.setItem(k, String(profit));
        } catch (e) {}
        st.phase = "dailyDone";
        emit("dailyDone", { profit: profit });
      }
    }
    savePersist();
  }
  function nextHand() {
    if (st.phase !== "result" && st.phase !== "dailyDone") return false;
    if (st.mode === "daily" && st.phase === "dailyDone") return false;
    st.phase = "bet";
    st.bet = 0;
    st.player = []; st.dealer = [];
    st.result = null;
    if (st.mode === "classic" && st.chips < MIN_BET) {
      st.chips = START_CHIPS;
      emit("relief");
    }
    if (st.shoe.length < SHOE_CUT) { st.shoe = buildShoe(st.rng); emit("shuffle"); }
    return true;
  }

  function snapshot() {
    return {
      phase: st.phase, mode: st.mode, date: st.dateStr,
      player: st.player.map(function (c) { return { r: c.r, s: c.s }; }),
      dealer: st.dealer.map(function (c, i) {
        var hidden = st.hideHole && i === 1;
        return { r: hidden ? null : c.r, s: hidden ? null : c.s, hidden: hidden };
      }),
      bet: st.bet, chips: st.chips, baseBet: st.baseBet,
      hint: hint(), result: st.result,
      dailyHand: st.dailyHand, dailyLeft: Math.max(0, DAILY_HANDS - st.dailyHand),
      stats: { w: st.stats.w, l: st.stats.l, p: st.stats.p, bj: st.stats.bj },
      coach: { ok: st.coach.ok, no: st.coach.no, on: st.coach.on },
      shoeLeft: st.shoe.length
    };
  }

  var API = {
    DECKS: DECKS, START_CHIPS: START_CHIPS, MIN_BET: MIN_BET, DAILY_HANDS: DAILY_HANDS,
    mulberry32: mulberry32, dateSeed: dateSeed, utcDateStr: utcDateStr,
    handValue: handValue, isBlackjack: isBlackjack, cardPts: cardPts,
    basicStrategy: basicStrategy, dealerPlay: dealerPlay, buildShoe: buildShoe,
    start: start, setBet: setBet, clearBet: clearBet, deal: deal,
    hit: hit, stand: stand, double: double, nextHand: nextHand,
    forceShoe: forceShoe,
    st: function () { return st; },
    snapshot: snapshot,
    drainEvents: function (handlers) {
      for (var i = 0; i < st.events.length; i++) {
        var e = st.events[i];
        if (handlers[e.name]) handlers[e.name](e.data);
      }
      st.events.length = 0;
    }
  };
  window.BJ = API;
  window.__qaState = snapshot;
})();
