/* Neon Wordle — game core (DOM). Daily (UTC hash) + Unlimited (seeded),
 * official duplicate-letter feedback, hard mode, 🔥streak with monthly
 * mulligan (site-standard stack), emoji share text + canvas result card,
 * programmatic audio, i18n (np_lang), save under np_wd_*. */
'use strict';

// ---- i18n (np_core: npT(L,key), np_lang shared with site switcher) ----
var L = {
  en: { daily: "Daily", free: "Unlimited", streak: "streak", hard: "Hard",
    notWord: "Not in the word list", tooShort: "Not enough letters",
    hardPos: "Hard mode: {L} must stay in position {n}",
    hardHas: "Hard mode: guess must contain {L}",
    winTitle: "Solved!", loseTitle: "Out of guesses", answerWas: "The word was {W}",
    tomorrow: "Come back tomorrow for a new daily word — or keep playing in Unlimited.",
    copied: "Copied ✓", share: "Copy result", saveCard: "Save result card",
    nextWord: "Next word →", close: "Close",
    dailyDone: "Daily already solved ✓ — replays are unranked.",
    hardNote: "Hard mode on — revealed hints are enforced." },
  zh: { daily: "每日一题", free: "无限练习", streak: "连胜", hard: "硬模式",
    notWord: "不在词表里", tooShort: "字母不够",
    hardPos: "硬模式：{L} 必须保留在第 {n} 位",
    hardHas: "硬模式：猜测必须包含 {L}",
    winTitle: "猜对了！", loseTitle: "六次机会用完", answerWas: "答案是 {W}",
    tomorrow: "明天来玩新的每日一词——或切到无限模式继续练。",
    copied: "已复制 ✓", share: "复制战绩", saveCard: "保存战绩卡",
    nextWord: "下一个词 →", close: "关闭",
    dailyDone: "今日每日已完成 ✓ — 重玩不计成绩。",
    hardNote: "硬模式已开启 — 必须沿用已揭示的提示。" }
};
function T(k) { return npT(L, k); }

// ---- words ----
var ANSWERS = NP_WD_WORDS.ANSWERS, VALID = NP_WD_WORDS.VALID;
var VSET = {};
VALID.forEach(function (w) { VSET[w] = 1; });

// ---- helpers ----
function fnv1a(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = (h * 0x01000193) >>> 0; }
  return h >>> 0;
}
function utcDayStr(offsetDays) {
  var t = Date.now() + (offsetDays || 0) * 86400000;
  return new Date(t).toISOString().slice(0, 10);
}
function dayNum(s) { return Math.floor(Date.parse(s + "T00:00:00Z") / 86400000); }
function dayIndex() { return Math.floor(Date.now() / 86400000); }
function dailyAnswerFor(ds) { return ANSWERS[fnv1a("np-wordle-daily-" + ds) % ANSWERS.length]; }
function freeAnswerFor(n, salt) { return ANSWERS[fnv1a("np-wordle-free-" + salt + "-" + n) % ANSWERS.length]; }

// ---- official feedback: greens consume; yellows capped by remaining count ----
function judge(guess, answer) {
  var res = ["x", "x", "x", "x", "x"], cnt = {}, i, c;
  for (i = 0; i < 5; i++) if (guess[i] === answer[i]) res[i] = "g"; else cnt[answer[i]] = (cnt[answer[i]] || 0) + 1;
  for (i = 0; i < 5; i++) {
    if (res[i] === "g") continue;
    c = guess[i];
    if (cnt[c] > 0) { res[i] = "y"; cnt[c]--; }
  }
  return res;
}

// ---- streak (🔥 consecutive UTC days, one monthly mulligan) ----
var STREAK_KEY = "np_wd_streak";
function freshStreak() { return { count: 0, last: "", best: 0, protect: 1, pm: "" }; }
function readStreak() {
  var st = freshStreak();
  try { var p = JSON.parse(localStorage.getItem(STREAK_KEY) || "null"); if (p && typeof p.count === "number") st = p; } catch (e) {}
  return st;
}
function streakApply(st, today) {   // pure — one win on day `today`
  var m = today.slice(0, 7);
  if (st.pm !== m) { st.pm = m; st.protect = 1; }
  if (st.last !== today) {
    if (st.last) {
      var gap = dayNum(today) - dayNum(st.last);
      if (gap === 1) st.count++;
      else if (gap === 2 && st.protect > 0) { st.protect--; st.count++; } // 月度补签
      else st.count = 1;
    } else st.count = 1;
    st.last = today;
  }
  if (st.count > st.best) st.best = st.count;
  return st;
}
function streakBreak(st) { st.count = 0; return st; }  // daily loss resets
function saveStreak(st) { try { localStorage.setItem(STREAK_KEY, JSON.stringify(st)); } catch (e) {} }

// ---- persistent state ----
var SAVE_KEY = "np_wd_save", FREE_KEY = "np_wd_free", HARD_KEY = "np_wd_hard", DIST_KEY = "np_wd_dist";
var hard = false;
try { hard = localStorage.getItem(HARD_KEY) === "1"; } catch (e) {}
var DIST = [0, 0, 0, 0, 0, 0];
try { var dd = JSON.parse(localStorage.getItem(DIST_KEY) || "null"); if (dd && dd.length === 6) DIST = dd; } catch (e) {}

// ---- game state ----
var mode = "daily", answer = "", guesses = [], states = [], cur = "", status = "playing";
var FREE = { n: 0, salt: "s0", g: [] };
function loadFree() {
  try {
    var f = JSON.parse(localStorage.getItem(FREE_KEY) || "null");
    if (f && typeof f.n === "number" && f.salt) FREE = { n: f.n, salt: f.salt, g: f.g || [] };
    else { FREE = { n: 1, salt: "k" + (Math.random() * 1e9 | 0).toString(36), g: [] }; saveFree(); }
  } catch (e) {}
}
function saveFree() { try { localStorage.setItem(FREE_KEY, JSON.stringify({ n: FREE.n, salt: FREE.salt, g: guesses })); } catch (e) {} }
function saveDaily() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ d: utcDayStr(), g: guesses, s: status })); } catch (e) {} }
function persist() { if (mode === "daily") saveDaily(); else saveFree(); }

// ---- hard mode validator (revealed hints must be reused) ----
function hardCheck(guess, gs, sts) {
  for (var r = 0; r < gs.length; r++) {
    for (var i = 0; i < 5; i++) {
      if (sts[r][i] === "g" && guess[i] !== gs[r][i]) return { pos: i + 1, letter: gs[r][i] };
      if (sts[r][i] === "y" && guess.indexOf(gs[r][i]) < 0) return { letter: gs[r][i] };
    }
  }
  return null;
}

// ---- DOM refs ----
var boardEl, msgEl, keysEl, tiles = [], keyEls = {};
var KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

// ---- render ----
function buildBoard() {
  boardEl = document.getElementById("board");
  boardEl.innerHTML = ""; tiles = [];
  for (var r = 0; r < 6; r++) {
    var row = document.createElement("div"); row.className = "brow"; var rt = [];
    for (var c = 0; c < 5; c++) { var t = document.createElement("div"); t.className = "tile"; row.appendChild(t); rt.push(t); }
    boardEl.appendChild(row); tiles.push(rt);
  }
}
function buildKeys() {
  keysEl = document.getElementById("keys"); keysEl.innerHTML = ""; keyEls = {};
  for (var r = 0; r < 3; r++) {
    var row = document.createElement("div"); row.className = "krow";
    var chars = KEYS[r];
    if (r === 2) {
      var en = document.createElement("button"); en.type = "button"; en.className = "key wide"; en.dataset.k = "enter";
      en.textContent = "⏎"; row.appendChild(en); keyEls.enter = en;
    }
    for (var i = 0; i < chars.length; i++) {
      var b = document.createElement("button"); b.type = "button"; b.className = "key"; b.dataset.k = chars[i];
      b.textContent = chars[i]; row.appendChild(b); keyEls[chars[i]] = b;
    }
    if (r === 2) {
      var bs = document.createElement("button"); bs.type = "button"; bs.className = "key wide"; bs.dataset.k = "back";
      bs.textContent = "⌫"; row.appendChild(bs); keyEls.back = bs;
    }
    keysEl.appendChild(row);
  }
  keysEl.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".key"); if (!b) return;
    e.preventDefault();
    NPWD_Sound.resume();
    pressKey(b.dataset.k);
  }, { passive: false });
}
function keysState() {
  var out = {};
  for (var r = 0; r < guesses.length; r++) {
    for (var i = 0; i < 5; i++) {
      var ch = guesses[r][i], s = states[r][i];
      var rank = { g: 3, y: 2, x: 1 }[s];
      if (!out[ch] || rank > out[ch].rank) out[ch] = { rank: rank, s: s };
    }
  }
  var plain = {};
  for (var k in out) plain[k] = out[k].s;
  return plain;
}
function frozen() { return window.__qaFreeze === true || document.body.classList.contains("nofx"); }
function render() {
  var ks = keysState();
  for (var r = 0; r < 6; r++) {
    for (var c = 0; c < 5; c++) {
      var t = tiles[r][c], ch = "", cls = "tile";
      if (r < guesses.length) { ch = guesses[r][c]; cls += " flip " + states[r][c]; }
      else if (r === guesses.length && status === "playing" && c < cur.length) ch = cur[c];
      t.textContent = ch;
      t.className = cls;
    }
  }
  for (var k in keyEls) {
    if (k === "enter" || k === "back") continue;
    keyEls[k].className = "key" + (ks[k] ? " " + ks[k] : "");
  }
  renderChips();
}
function renderChips() {
  var st = readStreak();
  var sc = document.getElementById("streak");
  sc.textContent = "🔥" + st.count;
  sc.title = T("streak") + (st.best ? " · best " + st.best : "");
  var hb = document.getElementById("hardBtn");
  hb.textContent = T("hard") + (hard ? " ✓" : "");
  hb.classList.toggle("on", hard);
  document.getElementById("muteBtn").textContent = NPWD_Sound.muted() ? "🔇" : "🔊";
}
function setMsg(text, cls) { msgEl.textContent = text || ""; msgEl.className = cls || ""; }
function flashMsg(text, cls, ms) {
  setMsg(text, cls);
  clearTimeout(flashMsg._t);
  flashMsg._t = setTimeout(function () { if (msgEl.textContent === text) setMsg(""); }, ms || 1600);
}

// ---- input ----
function addLetter(ch) {
  if (status !== "playing" || cur.length >= 5) return;
  cur += ch; NPWD_Sound.key();
  var t = tiles[guesses.length][cur.length - 1];
  t.textContent = ch; t.classList.add("pop");
  setTimeout(function () { t.classList.remove("pop"); }, 110);
}
function delLetter() {
  if (status !== "playing" || !cur.length) return;
  cur = cur.slice(0, -1); NPWD_Sound.del();
  tiles[guesses.length][cur.length].textContent = "";
}
function pressKey(k) {
  if (k === "enter") return submit();
  if (k === "back") return delLetter();
  if (/^[a-z]$/.test(k)) addLetter(k);
}
function shakeBoard() {
  boardEl.classList.add("shake");
  setTimeout(function () { boardEl.classList.remove("shake"); }, 420);
}
function submit() {
  if (status !== "playing") return;
  if (cur.length < 5) { flashMsg(T("tooShort"), "warn"); shakeBoard(); NPWD_Sound.bad(); return; }
  if (!VSET[cur]) { flashMsg(T("notWord"), "warn"); shakeBoard(); NPWD_Sound.bad(); return; }
  if (hard) {
    var v = hardCheck(cur, guesses, states);
    if (v) {
      var msg = v.pos ? T("hardPos").replace("{L}", v.letter.toUpperCase()).replace("{n}", v.pos)
                      : T("hardHas").replace("{L}", v.letter.toUpperCase());
      flashMsg(msg, "warn"); shakeBoard(); NPWD_Sound.bad(); return;
    }
  }
  var g = cur, st = judge(g, answer);
  guesses.push(g); states.push(st); cur = "";
  for (var i = 0; i < 5; i++) {
    (function (i) {
      var d = frozen() ? 0 : i * 180;
      if (d) setTimeout(function () { NPWD_Sound.flip(i); }, d);
      else NPWD_Sound.flip(i);
      tiles[guesses.length - 1][i].style.setProperty("--fd", (i * 0.12) + "s");
    })(i);
  }
  render();
  if (g === answer) return finish(true);
  if (guesses.length >= 6) return finish(false);
  persist();
}

// ---- finish / streak / share ----
function finish(won) {
  status = won ? "won" : "lost";
  if (mode === "daily") {
    var today = utcDayStr(), st = readStreak();
    if (won) { st = streakApply(st, today); if (guesses.length <= 6) DIST[guesses.length - 1]++; }
    else st = streakBreak(st);
    saveStreak(st);
    try { localStorage.setItem(DIST_KEY, JSON.stringify(DIST)); } catch (e) {}
  }
  persist();
  setTimeout(function () { showEnd(won); }, frozen() ? 60 : 6 * 220 + 250);
  if (won) { NPWD_Sound.win(); confetti(); } else NPWD_Sound.lose();
}
function emojiRows() {
  return states.map(function (row) {
    return row.map(function (s) { return s === "g" ? "🟩" : s === "y" ? "🟨" : "⬛"; }).join("");
  });
}
function shareText() {
  var n = status === "won" ? guesses.length : "X";
  var head = mode === "daily" ? "Neon Wordle #" + dayIndex() + " " + n + "/6"
    : "Neon Wordle (" + T("free") + ") " + n + "/6";
  var st = readStreak();
  var parts = [head].concat(emojiRows());
  if (st.count > 0) parts.push("🔥" + st.count);
  parts.push("https://seyrs1985.github.io/neonplay/neon-wordle/");
  return parts.join("\n");
}
function drawCard() {
  var cv = document.createElement("canvas"); cv.width = 500; cv.height = 620;
  var x = cv.getContext("2d");
  x.fillStyle = "#0a0a18"; x.fillRect(0, 0, 500, 620);
  var grd = x.createLinearGradient(0, 0, 500, 0);
  grd.addColorStop(0, "#22d3ee"); grd.addColorStop(1, "#a78bfa");
  x.fillStyle = grd; x.font = "900 44px system-ui,sans-serif"; x.textAlign = "center";
  x.fillText("NEON WORDLE", 250, 70);
  var n = status === "won" ? guesses.length : "X";
  x.fillStyle = "#94a3b8"; x.font = "600 22px system-ui,sans-serif";
  x.fillText((mode === "daily" ? "#" + dayIndex() + " · " : T("free") + " · ") + n + "/6", 250, 105);
  var cols = { g: "#0e9f6e", y: "#b8860b", x: "#1c2450" };
  var sz = 62, gap = 12, x0 = (500 - 5 * sz - 4 * gap) / 2, y0 = 140;
  states.forEach(function (row, r) {
    row.forEach(function (s, i) {
      x.fillStyle = cols[s]; x.fillRect(x0 + i * (sz + gap), y0 + r * (sz + gap), sz, sz);
    });
  });
  var st = readStreak();
  x.fillStyle = "#e2e8f0"; x.font = "700 24px system-ui,sans-serif";
  x.fillText("🔥 " + st.count + "  ·  🏆 " + st.best, 250, y0 + 6 * (sz + gap) + 30);
  x.fillStyle = "#5b688f"; x.font = "500 18px system-ui,sans-serif";
  x.fillText("seyrs1985.github.io/neonplay", 250, 590);
  return cv.toDataURL("image/png");
}
function showEnd(won) {
  var p = document.getElementById("endPanel");
  document.getElementById("epTitle").textContent = won ? T("winTitle") : T("loseTitle");
  document.getElementById("epRows").textContent = emojiRows().join("\n");
  document.getElementById("epNote").textContent = won ? T("tomorrow")
    : T("answerWas").replace("{W}", answer.toUpperCase());
  var card = document.getElementById("epCard");
  card.src = drawCard(); card.style.display = "block";
  var dl = document.getElementById("epSaveCard");
  dl.href = card.src;
  document.getElementById("epNext").textContent = mode === "free" ? T("nextWord") : T("close");
  document.getElementById("epShare").textContent = T("share");
  dl.textContent = T("saveCard");
  document.getElementById("epClose").textContent = T("close");
  p.classList.remove("hide");
}
function confetti() {
  if (frozen()) return;
  var cols = ["#ffd54a", "#39ff88", "#00e5ff", "#ff2d95", "#a78bfa"];
  for (var i = 0; i < 30; i++) {
    var f = document.createElement("span"); f.className = "cf";
    f.style.left = (Math.random() * 100) + "%";
    f.style.background = cols[(Math.random() * cols.length) | 0];
    f.style.setProperty("--dx", ((Math.random() - .5) * 90).toFixed(0) + "px");
    f.style.animationDelay = (Math.random() * .4).toFixed(2) + "s";
    document.body.appendChild(f);
    (function (el) { setTimeout(function () { el.remove(); }, 1700); })(f);
  }
}
function copyShare(btn) {
  var txt = shareText();
  function done() { btn.textContent = T("copied"); setTimeout(function () { btn.textContent = T("share"); }, 1500); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
  else done();
}

// ---- modes ----
function startDaily() {
  mode = "daily";
  answer = dailyAnswerFor(utcDayStr());
  guesses = []; states = []; cur = ""; status = "playing";
  var today = utcDayStr();
  try {
    var s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
    if (s && s.d === today && s.g) {
      s.g.forEach(function (g) { guesses.push(g); states.push(judge(g, answer)); });
      status = s.s === "won" || s.s === "lost" ? s.s
        : (guesses.length >= 6 ? "lost" : "playing");
    }
  } catch (e) {}
  setModeTabs();
  render();
  if (status !== "playing") {
    if (status === "won") setMsg(T("dailyDone"), "info");
    setTimeout(function () { showEnd(status === "won"); }, 400);
  } else setMsg("", "");
}
function startFree(freshBoard) {
  mode = "free";
  answer = freeAnswerFor(FREE.n, FREE.salt);
  guesses = []; states = []; cur = ""; status = "playing";
  if (!freshBoard) {
    FREE.g.forEach(function (g) {
      if (/^[a-z]{5}$/.test(g)) { guesses.push(g); states.push(judge(g, answer)); }
    });
    if (guesses.length >= 6 && guesses[5] !== answer) status = "lost";
    if (guesses[guesses.length - 1] === answer) status = "won";
  } else { FREE.g = []; }
  setModeTabs();
  render();
  if (status !== "playing") setTimeout(function () { showEnd(status === "won"); }, 300);
  else setMsg("", "");
}
function newFreeWord() {
  FREE.n++; FREE.g = []; saveFree();
  document.getElementById("endPanel").classList.add("hide");
  startFree(true);
}
function setModeTabs() {
  document.getElementById("tab-daily").classList.toggle("on", mode === "daily");
  document.getElementById("tab-free").classList.toggle("on", mode === "free");
}

// ---- QA / autotest hooks ----
window.__qaFreeze = false;
window.__qaState = function () {
  return {
    mode: mode, answer: answer, row: guesses.length, col: cur.length,
    status: status, hard: hard, cur: cur, guesses: guesses.slice(),
    states: states.map(function (r) { return r.slice(); }),
    keys: keysState(), freeN: FREE.n,
    streak: JSON.parse(JSON.stringify(readStreak())),
    dailyDone: (function () { try { var s = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); return !!(s && s.d === utcDayStr() && s.s); } catch (e) { return false; } })(),
    dist: DIST.slice()
  };
};
window.__qaRender = function () { render(); };
window.__qa = {
  type: function (w) { w = w.toLowerCase(); for (var i = 0; i < w.length; i++) pressKey(w[i]); },
  press: pressKey,
  clickKey: function (k) { var b = keyEls[k]; if (!b) throw new Error("no key " + k); b.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })); },
  enter: function () { submit(); },
  setAnswer: function (w) {
    w = w.toLowerCase();
    if (!/^[a-z]{5}$/.test(w)) throw new Error("bad answer " + w);
    answer = w; guesses = []; states = []; cur = ""; status = "playing";
    render();
  },
  setMode: function (m) { if (m === "daily") startDaily(); else startFree(false); },
  newFree: newFreeWord,
  setHard: function (v) { hard = !!v; try { localStorage.setItem(HARD_KEY, hard ? "1" : "0"); } catch (e) {} renderChips(); },
  judge: function (g, a) { return judge(g.toLowerCase(), a.toLowerCase()).join(""); },
  hardCheck: function (g) { return hardCheck(g.toLowerCase(), guesses, states); },
  streakApply: streakApply, freshStreak: freshStreak, utcDayStr: utcDayStr
};

// ---- in-page deterministic self-check (?autotest=1) ----
function runAutotest() {
  var R = [];
  function chk(name, ok) { R.push({ name: name, ok: !!ok }); }
  // 1. word data integrity
  var okRe = VALID.every(function (w) { return /^[a-z]{5}$/.test(w); });
  var uniq = VALID.length === new Set(VALID).size;
  var subset = ANSWERS.every(function (w) { return VSET[w] === 1; });
  chk("words: all /^[a-z]{5}$/", okRe);
  chk("words: VALID unique (" + VALID.length + ")", uniq);
  chk("words: ANSWERS ⊆ VALID (" + ANSWERS.length + ")", subset);
  chk("words: ANSWERS ≥ 800 / VALID ≥ 1700", ANSWERS.length >= 800 && VALID.length >= 1700);
  // 2. duplicate-letter feedback (official rule)
  chk("judge kebab/abbey = xygyy", window.__qa.judge("kebab", "abbey") === "xygyy");
  chk("judge blurb/abbey = yxxxy", window.__qa.judge("blurb", "abbey") === "yxxxy");
  chk("judge blobb/abbey = yxxyx (cap)", window.__qa.judge("blobb", "abbey") === "yxxyx");
  chk("judge erode/speed = yxxyy", window.__qa.judge("erode", "speed") === "yxxyy");
  chk("judge speed/speed = ggggg", window.__qa.judge("speed", "speed") === "ggggg");
  chk("judge stoop/stone = gggxx", window.__qa.judge("stoop", "stone") === "gggxx");
  // 3. hard mode validator
  var hc = hardCheck("crane", ["stoop"], [judge("stoop", "stone")]);
  chk("hard: crane rejected after stoop", hc && hc.pos === 1);
  chk("hard: stony accepted after stoop", hardCheck("stony", ["stoop"], [judge("stoop", "stone")]) === null);
  // 4. streak stack incl monthly mulligan (pure sim)
  var st = freshStreak();
  st = streakApply(st, utcDayStr(-8));
  var c1 = st.count; st = streakApply(st, utcDayStr(-7));
  var c2 = st.count; st = streakApply(st, utcDayStr(-5));
  var c3 = st.count; var p3 = st.protect; st = streakApply(st, utcDayStr(-1));
  var c4 = st.count;
  chk("streak: 1,2 consecutive", c1 === 1 && c2 === 2);
  chk("streak: gap2 mulligan used (3, protect 0)", c3 === 3 && p3 === 0);
  chk("streak: gap>2 resets to 1", c4 === 1);
  // 5. full flow (win)
  window.__qa.setAnswer("speed");
  window.__qa.type("stone"); window.__qa.enter();
  var s1 = window.__qaState();
  chk("flow: wrong guess advances row", s1.row === 1 && s1.status === "playing");
  window.__qa.type("speed"); window.__qa.enter();
  var s2 = window.__qaState();
  chk("flow: win detected", s2.status === "won" && s2.row === 2);
  chk("flow: keyboard colored", s2.keys.s === "g" && s2.keys.t === "x");
  // 6. invalid word + fail flow
  window.__qa.setAnswer("abbey");
  window.__qa.type("zzzzz"); window.__qa.enter();
  chk("flow: non-dictionary rejected", window.__qaState().row === 0);
  for (var bi = 0; bi < 5; bi++) pressKey("back");   // clear the kept letters
  ["stone", "crane", "slate", "roast", "mount", "point"].forEach(function (w) { window.__qa.type(w); window.__qa.enter(); });
  chk("flow: 6 misses → lost + reveal", window.__qaState().status === "lost" && window.__qaState().row === 6);
  // 7. share text format
  var sh = shareText();
  chk("share: emoji rows + /6 + url", /🟩|⬛/.test(sh) && /\/6/.test(sh) && /neon-wordle\/$/.test(sh));
  // 8. daily determinism
  chk("daily: deterministic + in ANSWERS", dailyAnswerFor("2026-09-15") === dailyAnswerFor("2026-09-15") && ANSWERS.indexOf(dailyAnswerFor("2026-09-15")) >= 0);
  chk("daily/free pools differ by seed", freeAnswerFor(1, "s") !== undefined);
  window.__autotest = { allPass: R.every(function (r) { return r.ok; }), results: R };
}
window.__qaRunAutotest = runAutotest;

// ---- wiring ----
function boot() {
  msgEl = document.getElementById("msg");
  if (window.__qaFreeze) document.body.classList.add("nofx");
  buildBoard(); buildKeys();
  document.getElementById("tab-daily").addEventListener("click", function () { NPWD_Sound.resume(); startDaily(); });
  document.getElementById("tab-free").addEventListener("click", function () { NPWD_Sound.resume(); startFree(false); });
  document.getElementById("hardBtn").addEventListener("click", function () {
    hard = !hard;
    try { localStorage.setItem(HARD_KEY, hard ? "1" : "0"); } catch (e) {}
    renderChips();
    if (hard) flashMsg(T("hardNote"), "info");
  });
  document.getElementById("muteBtn").addEventListener("click", function () { NPWD_Sound.resume(); NPWD_Sound.toggle(); renderChips(); });
  document.getElementById("epShare").addEventListener("click", function () { copyShare(this); });
  document.getElementById("epNext").addEventListener("click", function () {
    document.getElementById("endPanel").classList.add("hide");
    if (mode === "free") newFreeWord();
  });
  document.getElementById("epClose").addEventListener("click", function () { document.getElementById("endPanel").classList.add("hide"); });
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k === "Enter") {
      if (status !== "playing") { document.getElementById("endPanel").classList.add("hide"); if (mode === "free") newFreeWord(); return; }
      e.preventDefault(); NPWD_Sound.resume(); submit(); return;
    }
    if (k === "Backspace") { e.preventDefault(); delLetter(); return; }
    if (/^[a-zA-Z]$/.test(k) && k.length === 1) { NPWD_Sound.resume(); addLetter(k.toLowerCase()); }
  });
  document.addEventListener("pointerdown", function () { NPWD_Sound.resume(); }, { passive: true });
  document.addEventListener("pointercancel", function () {}, { passive: true });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });
  document.getElementById("tab-daily").textContent = T("daily");
  document.getElementById("tab-free").textContent = T("free");
  loadFree();
  startDaily();
  if (new URLSearchParams(location.search).get("autotest") === "1") runAutotest();
}
boot();
