/* Neon Blackjack — bootstrap: DOM rendering (cards, chips, coach panel),
 * input (buttons, keyboard H/S/D, double-tap), audio wiring.
 * No game rules here (see game.js). */
'use strict';
(function () {
  var RANKS = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  var SUITS = ["♠", "♥", "♦", "♣"];
  function rankStr(r) { return RANKS[r] || String(r); }

  var L = {
    en: {
      classic: "CLASSIC", daily: "DAILY 20",
      chips: "CHIPS", bet: "BET", deal: "DEAL", clear: "CLEAR",
      hit: "HIT", stand: "STAND", double: "DOUBLE",
      coach: "COACH", coachOn: "Coach ON", coachOff: "Coach OFF",
      win: "WIN!", lose: "DEALER WINS", push: "PUSH", blackjack: "BLACKJACK!",
      bust: "BUST", dealerbj: "DEALER BLACKJACK", relief: "Bust-out relief: chips reset to 1,000",
      playFun: "Play for fun only — virtual chips, no real money",
      handsLeft: "Hand", profit: "Profit", dailyDone: "DAILY RUN COMPLETE",
      again: "↻ NEW RUN", hint: "Coach says",
      why: {
        bustCard: "dealer bust card — let them break", strong: "dealer is strong — you need more",
        weak: "small total vs weak dealer", low: "too low to stand", vsAce: "never double vs an ace",
        dbl11: "11 is the double-down dream", dbl10: "10 vs weak dealer = double",
        dbl9: "9 doubles vs 3-6", dblSoft18: "soft 18 doubles vs 3-6",
        softDraw: "you can't bust — keep building", stand17: "17+ stands",
        stand19: "19+ is a fortress"
      },
      record: "W:%1 L:%2 P:%3 BJ:%4", coachScore: "Coach followed: %1/%2"
    },
    zh: {
      classic: "经典", daily: "每日20手",
      chips: "筹码", bet: "下注", deal: "发牌", clear: "清空",
      hit: "要牌", stand: "停牌", double: "加倍",
      coach: "教练", coachOn: "教练 开", coachOff: "教练 关",
      win: "你赢了！", lose: "庄家胜", push: "平局", blackjack: "黑杰克！",
      bust: "爆牌", dealerbj: "庄家黑杰克", relief: "破产补助：筹码已重置为 1000",
      playFun: "仅供娱乐——虚拟筹码，不涉及真实货币",
      handsLeft: "第", profit: "盈亏", dailyDone: "每日 20 手完成",
      again: "↻ 新一轮", hint: "教练建议",
      why: {
        bustCard: "庄家爆牌点——等他爆", strong: "庄家明牌强——你需要更大的点数",
        weak: "点数小但庄家弱", low: "点数太低不能停", vsAce: "永远别对 A 加倍",
        dbl11: "11 点是加倍良机", dbl10: "10 点对弱牌=加倍",
        dbl9: "9 点对 3-6 加倍", dblSoft18: "软 18 对 3-6 加倍",
        softDraw: "有 A 在手不会爆——继续要", stand17: "17 点以上停牌",
        stand19: "19 点以上稳了"
      },
      record: "胜:%1 负:%2 平:%3 BJ:%4", coachScore: "采纳教练: %1/%2"
    }
  };
  function T(k) { return npT(L, k); }
  function fmt(t) { return t.replace("%1", arguments[1]).replace("%2", arguments[2]).replace("%3", arguments[3]).replace("%4", arguments[4]); }

  // ---------- rendering ----------
  function cardHtml(c, extra) {
    if (!c || c.hidden) return '<div class="card back ' + (extra || "") + '"><span class="bk"></span></div>';
    var red = c.s === 1 || c.s === 2;
    return '<div class="card ' + (extra || "") + (red ? " red" : "") + '">' +
      '<span class="cr">' + rankStr(c.r) + '</span>' +
      '<span class="cs">' + SUITS[c.s] + '</span></div>';
  }
  function render() {
    var s = window.__qaState();
    document.getElementById("v-chips").textContent = s.chips;
    document.getElementById("v-bet").textContent = s.bet;
    document.getElementById("tab-classic").classList.toggle("on", s.mode === "classic");
    document.getElementById("tab-daily").classList.toggle("on", s.mode === "daily");
    document.getElementById("handNo").textContent = s.mode === "daily"
      ? T("handsLeft") + " " + (s.dailyHand + 1) + "/" + BJ.DAILY_HANDS : "";

    var dealer = document.getElementById("dealerCards");
    dealer.innerHTML = s.dealer.map(function (c, i) { return cardHtml(c, i === 0 ? "" : (c.hidden ? "" : "flip")); }).join("");
    var pv = BJ.handValue(s.player.map(function (c) { return { r: c.r, s: c.s }; }));
    var dv = BJ.handValue(s.dealer.filter(function (c) { return !c.hidden; }).map(function (c) { return { r: c.r, s: c.s }; }));
    document.getElementById("dealerVal").textContent = s.dealer.length ? (s.dealer[1] && s.dealer[1].hidden ? "?" : dv.total) : "";
    var player = document.getElementById("playerCards");
    player.innerHTML = s.player.map(function (c) { return cardHtml(c); }).join("");
    document.getElementById("playerVal").textContent = s.player.length ? pv.total + (pv.soft && pv.total <= 21 ? "+" : "") : "";

    // result banner
    var banner = document.getElementById("banner");
    if (s.result) {
      var map = { win: "win", lose: "lose", push: "push", bj: "bj", bust: "bust", dealerbj: "bust" };
      var kind = map[s.result.kind] || "push";
      var delta = s.result.delta;
      banner.className = "banner show " + kind;
      banner.textContent = T(kind === "bj" ? "blackjack" : kind) + (delta !== 0 ? "  " + (delta > 0 ? "+" : "") + delta : "");
    } else { banner.className = "banner"; banner.textContent = ""; }

    // coach panel
    var coach = document.getElementById("coach");
    if (s.phase === "player" && s.hint && s.coach.on) {
      var why = T("why")[s.hint.why] || "";
      var actTxt = { H: T("hit"), S: T("stand"), D: T("double") }[s.hint.a];
      coach.innerHTML = '<b>💡 ' + T("hint") + ': ' + actTxt + '</b><span>' + why + '</span>';
      coach.className = "coach show " + s.hint.a;
    } else if (s.phase === "player") {
      coach.innerHTML = '<b>💡 ' + (s.coach.on ? T("coachOn") : T("coachOff")) + '</b>';
      coach.className = "coach show off";
    } else { coach.className = "coach"; coach.innerHTML = ""; }

    // controls
    var inBet = s.phase === "bet";
    var inPlay = s.phase === "player";
    document.getElementById("betBtns").style.display = inBet ? "flex" : "none";
    document.getElementById("actionBtns").style.display = inPlay ? "flex" : "none";
    document.getElementById("nextBtn").style.display = (s.phase === "result") ? "inline-block" : "none";
    var dbl = document.getElementById("btnDouble");
    dbl.disabled = !(s.player.length === 2 && s.chips >= s.baseBet && s.baseBet > 0);
    document.getElementById("btnDeal").disabled = s.bet < BJ.MIN_BET;
    // stats line
    document.getElementById("stats").textContent =
      fmt(T("record"), s.stats.w, s.stats.l, s.stats.p, s.stats.bj) + " · " +
      fmt(T("coachScore"), s.coach.ok, s.coach.ok + s.coach.no);
  }

  // ---------- wiring ----------
  function wire(id, fn) { document.getElementById(id).addEventListener("click", function () { Sound.resume(); fn(); }); }
  [["chip10", 10], ["chip25", 25], ["chip50", 50], ["chip100", 100]].forEach(function (p) {
    wire(p[0], function () { if (BJ.setBet(p[1])) Sound.sfx("move"); render(); });
  });
  wire("clearBtn", function () { BJ.clearBet(); Sound.sfx("move"); render(); });
  wire("btnDeal", function () { if (BJ.deal()) Sound.sfx("double"); render(); });
  wire("btnHit", function () { BJ.hit(); render(); });
  wire("btnStand", function () { BJ.stand(); render(); });
  wire("btnDouble", function () { if (BJ.double()) Sound.sfx("clear", { rows: 2 }); render(); });
  wire("nextBtn", function () { BJ.nextHand(); Sound.sfx("ui"); render(); });
  wire("tab-classic", function () { BJ.start("classic"); Sound.sfx("ui"); render(); });
  wire("tab-daily", function () { BJ.start("daily"); Sound.sfx("ui"); render(); });
  wire("coachBtn", function () {
    var st = BJ.st(); st.coach.on = !st.coach.on;
    try { localStorage.setItem("np_bj_coach", JSON.stringify({ ok: st.coach.ok, no: st.coach.no, on: st.coach.on })); } catch (e) {}
    Sound.sfx("ui"); render();
  });
  // double-tap player cards = double
  var lastTap = 0;
  document.getElementById("playerCards").addEventListener("pointerup", function () {
    var now = performance.now();
    if (now - lastTap < 320) { if (BJ.double()) Sound.sfx("clear", { rows: 2 }); render(); }
    lastTap = now;
  });
  document.addEventListener("keydown", function (e) {
    var k = e.key.toLowerCase();
    var s = window.__qaState();
    if (k === "m") { toggleMute(); return; }
    if (s.phase === "player") {
      if (k === "h") { BJ.hit(); render(); }
      else if (k === "s") { BJ.stand(); render(); }
      else if (k === "d") { if (BJ.double()) Sound.sfx("clear", { rows: 2 }); render(); }
    } else if (s.phase === "bet") {
      if (k === "enter" || k === " ") { e.preventDefault(); if (BJ.deal()) Sound.sfx("double"); render(); }
      if (k === "b") { BJ.setBet(25); Sound.sfx("move"); render(); }
    } else if (s.phase === "result") {
      if (k === "enter" || k === " ") { e.preventDefault(); BJ.nextHand(); render(); }
    }
  });
  function toggleMute() {
    var m = Sound.toggleMute();
    document.getElementById("muteBtn").textContent = m ? "🔇" : "🔊";
  }
  document.getElementById("muteBtn").addEventListener("click", toggleMute);
  document.getElementById("muteBtn").textContent = Sound.isMuted() ? "🔇" : "🔊";

  var HANDLERS = {
    deal: function () { Sound.sfx("move"); },
    hit: function () { Sound.sfx("rotate"); },
    win: function (d) { Sound.sfx("clear", { rows: 2 }); },
    bj: function () { Sound.sfx("finish"); },
    lose: function () { Sound.sfx("deny"); },
    push: function () { Sound.sfx("move"); },
    bust: function () { Sound.sfx("over"); },
    dealerbj: function () { Sound.sfx("over"); },
    relief: function () { Sound.sfx("finish"); },
    dailyDone: function () { Sound.sfx("finish"); showDailyDone(); },
    shuffle: function () { Sound.sfx("move"); },
    start: function () {}
  };
  function pump() { BJ.drainEvents(HANDLERS); }

  function showDailyDone() {
    var s = window.__qaState();
    var profit = s.chips - BJ.START_CHIPS;
    var panel = document.getElementById("panel"), box = document.getElementById("panelBox");
    box.innerHTML = '<h2>' + T("dailyDone") + '</h2>' +
      '<div class="bigscore ' + (profit >= 0 ? "pos" : "neg") + '">' + (profit >= 0 ? "+" : "") + profit + '</div>' +
      '<p class="sub">' + T("profit") + ' · ' + T("chips") + ' ' + s.chips + '</p>' +
      '<button id="pAgain" class="primary">' + T("again") + '</button>';
    panel.classList.remove("hide");
    document.getElementById("pAgain").addEventListener("click", function () {
      panel.classList.add("hide"); BJ.start("daily"); render();
    });
  }

  // ---------- ?autotest=1 ----------
  function autotest() {
    var R = {};
    function chk(name, ok, detail) { R[name] = ok === true ? true : (detail || false); }
    try {
      // 1) hand values incl. soft ace handling
      function C(r, s) { return { r: r, s: s || 0 }; }
      chk("handAK", BJ.handValue([C(1), C(13)]).total === 21 && BJ.handValue([C(1), C(13)]).soft);
      chk("handSoftDowngrade", BJ.handValue([C(1), C(5), C(10)]).total === 16 && !BJ.handValue([C(1), C(5), C(10)]).soft);
      chk("handAA", BJ.handValue([C(1), C(1)]).total === 12 && BJ.handValue([C(1), C(1)]).soft);
      chk("handBJ", BJ.isBlackjack([C(1), C(12)]));

      // 2) basic strategy spot checks (S17 table)
      var S = BJ.basicStrategy;
      chk("st16v10", S([C(10), C(6)], C(10), true).a === "H");
      chk("st12v4", S([C(7), C(5)], C(4), true).a === "S");
      chk("stA7v3", S([C(1), C(7)], C(3), true).a === "D");
      chk("stA7v2", S([C(1), C(7)], C(2), true).a === "S");
      chk("stA7v9", S([C(1), C(7)], C(9), true).a === "H");
      chk("st11v6", S([C(6), C(5)], C(6), true).a === "D");
      chk("st11vA", S([C(6), C(5)], C(1), true).a === "H");
      chk("st9v2", S([C(4), C(5)], C(2), true).a === "H");
      chk("st10v9", S([C(3), C(7)], C(9), true).a === "D");
      chk("stA4v4", S([C(1), C(4)], C(4), true).a === "D");
      chk("st17vA", S([C(10), C(7)], C(1), true).a === "S");
      chk("stA8v6noDbl", S([C(1), C(8)], C(6), false).a === "S");
      chk("stA7v3noDbl", S([C(1), C(7)], C(3), false).a === "S");
      chk("st9v3noDbl", S([C(4), C(5)], C(3), false).a === "H");

      // 3) S17 dealer: hits to 17, stands soft 17
      var d1 = BJ.dealerPlay([C(10), C(2)], function () { return C(5); });
      chk("dealerHits", d1.length === 3 && BJ.handValue(d1).total === 17);
      var d2 = BJ.dealerPlay([C(1), C(6)], function () { return C(13); });
      chk("dealerS17", d2.length === 2 && BJ.handValue(d2).total === 17);

      // 4) rigged shoe: player BJ pays 3:2
      function freshChips() { BJ.st().chips = BJ.START_CHIPS; }
      BJ.start("classic", 1);
      BJ.forceShoe([C(1, 0), C(13, 2), C(2, 1), C(3, 3)]);  // player A+K, dealer 2+3
      freshChips(); BJ.setBet(100); BJ.deal();
      var s1 = window.__qaState();
      chk("bjPayout32", s1.result && s1.result.kind === "bj" && s1.result.delta === 150 && s1.chips === 1150,
        JSON.stringify(s1.result) + " chips=" + s1.chips);

      // 5) rigged shoe: hit -> bust loses
      BJ.start("classic", 1);
      BJ.forceShoe([C(10, 0), C(9, 2), C(2, 1), C(3, 3), C(5, 0)]);
      freshChips(); BJ.setBet(50); BJ.deal(); BJ.hit();   // 19 -> hit 5 -> 24
      var s2 = window.__qaState();
      chk("bustLoses", s2.result && s2.result.kind === "bust" && s2.chips === 950,
        JSON.stringify(s2.result) + " chips=" + s2.chips);

      // 6) stand -> dealer 17 stands, player 19 wins
      BJ.start("classic", 1);
      BJ.forceShoe([C(10, 0), C(9, 2), C(7, 1), C(10, 3), C(6, 0)]);
      freshChips(); BJ.setBet(50); BJ.deal(); BJ.stand();
      var s3 = window.__qaState();
      chk("standDealerPlays", s3.result && s3.result.kind === "win" && s3.chips === 1050,
        JSON.stringify(s3.result) + " chips=" + s3.chips);

      // 7) dealer draws from shoe: 12 -> hits 6 -> 18 < 19
      BJ.start("classic", 1);
      BJ.forceShoe([C(10, 0), C(9, 2), C(10, 1), C(2, 3), C(6, 0)]);
      freshChips(); BJ.setBet(50); BJ.deal(); BJ.stand();
      var s4 = window.__qaState();
      chk("dealerDrawSequence", s4.result && s4.result.kind === "win" && s4.dealer.length === 3,
        JSON.stringify(s4.result) + " dealer=" + s4.dealer.length);

      // 8) daily determinism: same seed -> same shoe order
      BJ.start("daily", 20260919);
      var shoeA = BJ.st().shoe.slice(0, 10).map(function (c) { return c.r + "." + c.s; }).join("|");
      BJ.start("daily", 20260919);
      var shoeB = BJ.st().shoe.slice(0, 10).map(function (c) { return c.r + "." + c.s; }).join("|");
      BJ.start("daily", 20260920);
      var shoeC = BJ.st().shoe.slice(0, 10).map(function (c) { return c.r + "." + c.s; }).join("|");
      chk("dailyDeterminism", shoeA === shoeB && shoeA !== shoeC);

      // 9) bankruptcy relief (fires when betting with too few chips)
      BJ.start("classic", 1);
      BJ.st().chips = 5;
      BJ.setBet(10);
      chk("bankruptcyRelief", BJ.st().chips === BJ.START_CHIPS, "chips=" + BJ.st().chips);

      // 10) peek: dealer up A + hole K vs non-BJ player -> dealerbj
      BJ.start("classic", 1);
      BJ.forceShoe([C(5, 0), C(7, 2), C(1, 1), C(13, 3)]);  // player 5+7, dealer A+K
      freshChips(); BJ.setBet(100); BJ.deal();
      var s5 = window.__qaState();
      chk("dealerPeekBJ", s5.result && s5.result.kind === "dealerbj" && s5.chips === 900,
        JSON.stringify(s5.result) + " chips=" + s5.chips);
    } catch (ex) {
      chk("exception", false, String(ex && ex.message || ex));
    }
    R.allPass = Object.keys(R).every(function (k) { return k === "allPass" || R[k] === true; });
    window.__autotest = R;
    return R;
  }

  // ---------- ?shot= ----------
  function shot() {
    var q = new URLSearchParams(location.search);
    var kind = q.get("shot") || "bet";
    window.__qaFreeze = true;
    BJ.start("daily", 42);
    if (kind === "play") {
      BJ.setBet(100); BJ.deal();
      while (window.__qaState().phase === "player" && BJ.st().player.length < 3) BJ.hit();
      if (window.__qaState().phase === "player") BJ.stand();
      // force coach panel visible on a live decision if hand ended
      if (window.__qaState().phase === "result") { BJ.nextHand(); BJ.setBet(100); BJ.deal(); }
    }
    pump(); render();
  }

  // ---------- boot ----------
  var q = new URLSearchParams(location.search);
  BJ.start("daily");
  document.getElementById("lb-chips").textContent = T("chips");
  document.getElementById("lb-bet").textContent = T("bet");
  document.getElementById("btnDeal").textContent = T("deal");
  document.getElementById("clearBtn").textContent = T("clear");
  document.getElementById("btnHit").textContent = T("hit");
  document.getElementById("btnStand").textContent = T("stand");
  document.getElementById("btnDouble").textContent = T("double");
  document.getElementById("nextBtn").textContent = T("again");
  document.getElementById("tab-classic").textContent = T("classic");
  document.getElementById("tab-daily").textContent = T("daily");
  document.getElementById("coachBtn").textContent = "💡 " + T("coach");
  document.getElementById("funOnly").textContent = T("playFun");
  render();
  if (q.get("autotest") === "1") { setTimeout(function () { autotest(); render(); }, 50); }
  else if (q.get("shot")) { shot(); }
  requestAnimationFrame(function loop() {
    requestAnimationFrame(loop);
    if (!window.__qaFreeze) pump();
  });
})();
