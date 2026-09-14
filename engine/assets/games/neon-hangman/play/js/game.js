/* Neon Hangman — game core (DOM, event-driven). 6 category banks x 60 words
 * with one hint sentence each. Daily (UTC hash, category rotation) +
 * Practice (seeded per category), 6-miss gallows drawn stroke by stroke,
 * always-visible hint, 🔥streak with monthly mulligan (site-standard stack),
 * emoji share text, programmatic audio, i18n (np_lang), save under np_hg_*. */
'use strict';

// ---- i18n (np_core: npT(L,key), np_lang shared with site switcher) ----
var L = {
  en: {
    daily: "Daily", practice: "Practice", streak: "streak",
    winTitle: "Saved him!", loseTitle: "Out of guesses",
    tomorrow: "Come back tomorrow for a new daily word — or practice any category.",
    missedNote: "Six misses — the little guy is gone. Retry the same word (unranked) or try a new one.",
    solved: "Solved with {n}/6 misses", outMiss: "Out of guesses 6/6 — the word was {W}",
    already: "Already tried {L}", dailyDone: "Daily already finished ✓ — replays are unranked.",
    retry: "Retry this word (unranked)", nextWord: "New word →",
    keepPlaying: "Practice this category →", close: "Close",
    share: "Copy result", copied: "Copied ✓", record: "Record {w}W–{l}L",
    hintHidden: "Hint hidden — tap 💡 to show it again"
  },
  zh: {
    daily: "每日一词", practice: "分类练习", streak: "连胜",
    winTitle: "救成功了！", loseTitle: "六次机会用完",
    tomorrow: "明天来玩新的每日词——或随便挑一个分类继续练。",
    missedNote: "六次猜错——小人没了。可重试本词（不计成绩）或换一个新词。",
    solved: "猜错 {n}/6 次后猜中", outMiss: "机会用完（6/6）——答案是 {W}",
    already: "已经猜过 {L} 了", dailyDone: "今日每日已完成 ✓ — 重玩不计成绩。",
    retry: "重试本词（不计成绩）", nextWord: "换一个词 →",
    keepPlaying: "练这个分类 →", close: "关闭",
    share: "复制战绩", copied: "已复制 ✓", record: "战绩 {w}胜{l}负",
    hintHidden: "提示已隐藏——点 💡 重新显示"
  }
};
function T(k) { return npT(L, k); }

// ---- words ----
var CATS = NP_HG_WORDS.CATS, BY = NP_HG_WORDS.BY, ALL = NP_HG_WORDS.ALL;
var catName = NP_HG_WORDS.catName, catEmoji = NP_HG_WORDS.catEmoji;
var LANG = "en";
try { LANG = localStorage.getItem("np_lang") || "en"; } catch (e) {}

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
function dailyPick(ds) {
  var cat = CATS[fnv1a("np-hg-cat-" + ds) % CATS.length].id;
  var list = BY[cat];
  var e = list[fnv1a("np-hg-w-" + cat + "-" + ds) % list.length];
  return { cat: cat, w: e.w, h: e.h };
}
function practicePick(salt, cat, n) {
  var list = BY[cat];
  return list[fnv1a("np-hg-f-" + salt + "-" + cat + "-" + n) % list.length];
}

// ---- streak (🔥 consecutive UTC days, one monthly mulligan) ----
var STREAK_KEY = "np_hg_streak";
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
var DAILY_KEY = "np_hg_daily", FREE_KEY = "np_hg_free", STATS_KEY = "np_hg_stats";
var STATS = { w: 0, l: 0 };
try { var sd = JSON.parse(localStorage.getItem(STATS_KEY) || "null"); if (sd && typeof sd.w === "number") STATS = sd; } catch (e) {}
function saveStats() { try { localStorage.setItem(STATS_KEY, JSON.stringify(STATS)); } catch (e) {} }
var FREE = { salt: "", cats: {} };
function loadFree() {
  try {
    var f = JSON.parse(localStorage.getItem(FREE_KEY) || "null");
    if (f && typeof f.salt === "string" && f.cats) FREE = { salt: f.salt, cats: f.cats };
  } catch (e) {}
}
function saveFree() { try { localStorage.setItem(FREE_KEY, JSON.stringify(FREE)); } catch (e) {} }
function getFreeCat(cid) {
  if (!FREE.salt) FREE.salt = "k" + ((Math.random() * 1e9) | 0).toString(36);
  if (!FREE.cats[cid]) FREE.cats[cid] = { n: 1, g: "", w: 0, s: "p", r: 1 };
  return FREE.cats[cid];
}

// ---- game state ----
var mode = "daily", cat = "animals", answer = "", hint = "";
var guessed = {}, wrong = 0, status = "playing", ranked = true, hintShown = true;
function guessedStr() { return Object.keys(guessed).sort().join(""); }
function setGuessed(s) { guessed = {}; (s || "").split("").forEach(function (c) { if (/^[A-Z]$/.test(c)) guessed[c] = 1; }); }
function statusCode() { return status === "playing" ? "p" : (status === "won" ? "w" : "l"); }
function persist() {
  if (mode === "daily") {
    try { localStorage.setItem(DAILY_KEY, JSON.stringify({ d: utcDayStr(), g: guessedStr(), w: wrong, s: statusCode(), r: ranked ? 1 : 0 })); } catch (e) {}
  } else {
    var st = getFreeCat(cat);
    st.g = guessedStr(); st.w = wrong; st.s = statusCode(); st.r = ranked ? 1 : 0;
    saveFree();
  }
}

// ---- DOM refs ----
var msgEl, slots = [], keyEls = {}, pipEls = [], catEls = {};
var KEYS = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function frozen() { return window.__qaFreeze === true || document.body.classList.contains("nofx"); }

function buildCatbar() {
  var bar = document.getElementById("catbar");
  bar.innerHTML = ""; catEls = {};
  CATS.forEach(function (c) {
    var b = document.createElement("button");
    b.type = "button"; b.className = "catchip"; b.dataset.cat = c.id;
    b.textContent = c.em + " " + catName(c.id, LANG);
    bar.appendChild(b); catEls[c.id] = b;
  });
  bar.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".catchip"); if (!b) return;
    e.preventDefault(); NPHG_Sound.resume(); switchCat(b.dataset.cat);
  }, { passive: false });
}
function buildKeys() {
  var keysEl = document.getElementById("keys");
  keysEl.innerHTML = ""; keyEls = {};
  for (var r = 0; r < 3; r++) {
    var row = document.createElement("div"); row.className = "krow";
    for (var i = 0; i < KEYS[r].length; i++) {
      var ch = KEYS[r][i];
      var b = document.createElement("button"); b.type = "button"; b.className = "key"; b.dataset.k = ch;
      b.textContent = ch; row.appendChild(b); keyEls[ch] = b;
    }
    keysEl.appendChild(row);
  }
  keysEl.addEventListener("pointerdown", function (e) {
    var b = e.target.closest(".key"); if (!b) return;
    e.preventDefault(); NPHG_Sound.resume(); guess(b.dataset.k.toUpperCase());
  }, { passive: false });
}
function buildWord() {
  var w = document.getElementById("word");
  w.innerHTML = ""; slots = [];
  for (var i = 0; i < answer.length; i++) {
    var s = document.createElement("div");
    s.className = answer[i] === " " ? "slot sp" : "slot";
    w.appendChild(s); slots.push(s);
  }
  var pips = document.getElementById("pips");
  pips.innerHTML = ""; pipEls = [];
  for (var p = 0; p < 6; p++) { var pip = document.createElement("div"); pip.className = "pip"; pips.appendChild(pip); pipEls.push(pip); }
}

// ---- render (idempotent, QA-syncable) ----
function render() {
  for (var i = 0; i < answer.length; i++) {
    var s = slots[i], ch = answer[i];
    if (ch === " ") { s.className = "slot sp"; s.textContent = ""; continue; }
    if (guessed[ch]) { s.textContent = ch; if (!s.classList.contains("g")) { s.className = "slot g"; } }
    else if (status === "lost") { s.textContent = ch; if (!s.classList.contains("x")) { s.className = "slot x"; } }
    else { s.textContent = ""; s.className = "slot"; }
  }
  for (var p = 0; p < 6; p++) pipEls[p].className = "pip" + (p < wrong ? " x" : "");
  var gsvg = document.getElementById("gallows");
  var parts = gsvg ? gsvg.querySelectorAll(".part") : [];
  for (var g = 0; g < parts.length; g++) parts[g].classList.toggle("on", g < wrong);
  for (var k in keyEls) keyEls[k].className = "key" + (guessed[k.toUpperCase()] ? (answer.indexOf(k.toUpperCase()) >= 0 ? " g" : " x") : "");
  for (var c in catEls) catEls[c].classList.toggle("on", c === cat);
  document.getElementById("tab-daily").classList.toggle("on", mode === "daily");
  document.getElementById("tab-practice").classList.toggle("on", mode === "practice");
  renderChips();
  renderHint();
}
function renderChips() {
  var st = readStreak();
  var sc = document.getElementById("streak");
  sc.textContent = "🔥" + st.count;
  sc.title = T("streak") + (st.best ? " · best " + st.best : "");
  document.getElementById("hintBtn").classList.toggle("off", !hintShown);
  document.getElementById("muteBtn").textContent = NPHG_Sound.muted() ? "🔇" : "🔊";
}
function renderHint() {
  var h = document.getElementById("hint");
  h.textContent = catEmoji(cat) + " " + (hint || "");
  h.classList.toggle("hideh", !hintShown);
}
function setMsg(text, cls) { msgEl.textContent = text || ""; msgEl.className = cls || ""; }
function flashMsg(text, cls, ms) {
  setMsg(text, cls);
  clearTimeout(flashMsg._t);
  flashMsg._t = setTimeout(function () { if (msgEl.textContent === text) setMsg(""); }, ms || 1600);
}

// ---- juice ----
function popSlot(i, k) {
  var s = slots[i]; if (!s) return;
  s.classList.remove("g"); void s.offsetWidth; s.className = "slot g";
  NPHG_Sound.hit(k);
}
function shakeWord() {
  var w = document.getElementById("word");
  w.classList.add("shake");
  setTimeout(function () { w.classList.remove("shake"); }, 420);
}
function keyDup(ch) {
  var b = keyEls[ch.toLowerCase()]; if (!b) return;
  b.classList.add("dup");
  setTimeout(function () { b.classList.remove("dup"); }, 380);
}
function particles(el) {
  if (frozen() || !el) return;
  var r = el.getBoundingClientRect();
  for (var i = 0; i < 10; i++) {
    var p = document.createElement("span"); p.className = "pt";
    p.style.left = (r.left + r.width / 2) + "px";
    p.style.top = (r.top + r.height / 2) + "px";
    p.style.setProperty("--dx", ((Math.random() - .5) * 110).toFixed(0) + "px");
    p.style.setProperty("--dy", ((Math.random() - .5) * 90 - 20).toFixed(0) + "px");
    document.body.appendChild(p);
    (function (el2) { setTimeout(function () { el2.remove(); }, 650); })(p);
  }
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
function pulseHint() {
  hintShown = true;
  var h = document.getElementById("hint");
  renderHint();
  h.classList.remove("pulse"); void h.offsetWidth; h.classList.add("pulse");
  setTimeout(function () { h.classList.remove("pulse"); }, 850);
}

// ---- core loop: guess a letter ----
function guess(ch) {
  if (status !== "playing" || !/^[A-Z]$/.test(ch)) return;
  if (guessed[ch]) {
    flashMsg(T("already").replace("{L}", ch), "warn");
    NPHG_Sound.dup(); keyDup(ch);
    return;
  }
  guessed[ch] = 1;
  if (answer.indexOf(ch) >= 0) {
    var idxs = [];
    for (var i = 0; i < answer.length; i++) if (answer[i] === ch) idxs.push(i);
    render();
    idxs.forEach(function (idx, k) {
      var d = frozen() ? 0 : k * 90;
      if (d) setTimeout(function () { popSlot(idx, k); }, d);
      else popSlot(idx, k);
    });
    if (wonCheck()) finish(true); else persist();
  } else {
    wrong++;
    NPHG_Sound.miss();
    render();
    particles(keyEls[ch.toLowerCase()]);
    shakeWord();
    if (wrong >= 6) finish(false); else persist();
  }
}
function wonCheck() {
  for (var i = 0; i < answer.length; i++) {
    var c = answer[i];
    if (c !== " " && !guessed[c]) return false;
  }
  return true;
}

// ---- finish / streak / share ----
function finish(won) {
  status = won ? "won" : "lost";
  if (ranked) { if (won) STATS.w++; else STATS.l++; saveStats(); }
  if (mode === "daily" && ranked) {
    var st = readStreak();
    if (won) streakApply(st, utcDayStr()); else streakBreak(st);
    saveStreak(st);
  }
  persist();
  render();
  setTimeout(function () { showEnd(won); }, frozen() ? 60 : 800);
  if (won) { NPHG_Sound.win(); confetti(); } else NPHG_Sound.lose();
}
function shareText() {
  var head = mode === "daily"
    ? "Neon Hangman #" + dayIndex() + " · " + catName(cat, "en")
    : "Neon Hangman · " + catName(cat, "en");
  var line = status === "won"
    ? T("solved").replace("{n}", wrong)
    : T("outMiss").replace("{W}", answer);
  var parts = [head, line];
  var st = readStreak();
  if (st.count > 0) parts.push("🔥" + st.count);
  parts.push("https://seyrs1985.github.io/neonplay/neon-hangman/");
  return parts.join("\n");
}
function copyShare(btn) {
  var txt = shareText();
  function done() { btn.textContent = T("copied"); setTimeout(function () { btn.textContent = T("share"); }, 1500); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(done, done);
  else done();
}
function showEnd(won) {
  document.getElementById("epTitle").textContent = won ? T("winTitle") : T("loseTitle");
  document.getElementById("epWord").textContent = answer;
  document.getElementById("epHint").textContent = catEmoji(cat) + " " + hint;
  var note = won
    ? (mode === "daily" ? T("tomorrow") : T("solved").replace("{n}", wrong))
    : T("missedNote");
  var st = readStreak();
  if (st.count > 0) note += " 🔥" + st.count;
  note += " · " + T("record").replace("{w}", STATS.w).replace("{l}", STATS.l);
  document.getElementById("epNote").textContent = note;
  document.getElementById("epRetry").style.display = status === "lost" ? "block" : "none";
  document.getElementById("epNext").textContent = mode === "practice" ? T("nextWord") : T("keepPlaying");
  document.getElementById("epClose").textContent = T("close");
  document.getElementById("epShare").textContent = T("share");
  document.getElementById("epRetry").textContent = T("retry");
  document.getElementById("endPanel").classList.remove("hide");
}
function hidePanel() { document.getElementById("endPanel").classList.add("hide"); }

// ---- modes ----
function startDaily() {
  mode = "daily"; ranked = true;
  var pick = dailyPick(utcDayStr());
  cat = pick.cat; answer = pick.w; hint = pick.h;
  guessed = {}; wrong = 0; status = "playing";
  try {
    var s = JSON.parse(localStorage.getItem(DAILY_KEY) || "null");
    if (s && s.d === utcDayStr()) {
      setGuessed(s.g || ""); wrong = Math.min(6, s.w || 0);
      ranked = s.r !== 0;
      if (s.s === "w") status = "won";
      else if (s.s === "l") status = "lost";
      else if (wrong >= 6) status = "lost";
    }
  } catch (e) {}
  buildWord(); render();
  if (status !== "playing") {
    if (status === "won") setMsg(T("dailyDone"), "info");
    setTimeout(function () { showEnd(status === "won"); }, 400);
  } else setMsg("", "");
}
function startPractice(cid) {
  mode = "practice";
  cat = BY[cid] ? cid : (BY[cat] ? cat : "animals");
  var st = getFreeCat(cat);
  var pick = practicePick(FREE.salt, cat, st.n);
  answer = pick.w; hint = pick.h;
  setGuessed(st.g || ""); wrong = Math.min(6, st.w || 0);
  status = "playing"; ranked = st.r !== 0;
  if (st.s === "w") status = "won";
  else if (st.s === "l") status = "lost";
  else if (wrong >= 6) status = "lost";
  buildWord(); render();
  if (status !== "playing") setTimeout(function () { showEnd(status === "won"); }, 300);
  else setMsg("", "");
}
function switchCat(cid) {
  if (!BY[cid] || cid === cat && mode === "practice") { if (BY[cid]) { cat = cid; render(); } return; }
  persist();
  startPractice(cid);
}
function newWord() {
  var st = getFreeCat(cat);
  st.n++; st.g = ""; st.w = 0; st.s = "p"; st.r = 1;
  saveFree();
  hidePanel();
  startPractice(cat);
}
function retry() {
  guessed = {}; wrong = 0; status = "playing"; ranked = false;
  hidePanel();
  buildWord(); render(); persist();
  setMsg("", "");
}

// ---- QA / autotest hooks ----
window.__qaFreeze = false;
window.__qaState = function () {
  var keys = {};
  for (var k in guessed) keys[k] = answer.indexOf(k) >= 0 ? "g" : "x";
  return {
    mode: mode, cat: cat, answer: answer, hint: hint,
    guessed: guessedStr(), wrong: wrong, status: status, ranked: ranked,
    keys: keys, parts: wrong, hintShown: hintShown,
    panelOpen: !document.getElementById("endPanel").classList.contains("hide"),
    hintText: document.getElementById("hint").textContent,
    streak: JSON.parse(JSON.stringify(readStreak())),
    stats: JSON.parse(JSON.stringify(STATS)),
    wordCells: slots.map(function (s) { return s.textContent; })
  };
};
window.__qaRender = function () { render(); };
window.__qa = {
  guess: guess,
  clickKey: function (ch) {
    var b = keyEls[String(ch).toLowerCase()];
    if (!b) throw new Error("no key " + ch);
    b.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
  },
  setAnswer: function (w) {
    w = String(w || "").toUpperCase().replace(/\s+/g, " ").trim();
    if (!/^[A-Z]{2,}(?: [A-Z]{2,}){0,2}$/.test(w)) throw new Error("bad answer " + w);
    var found = null;
    for (var i = 0; i < ALL.length; i++) if (ALL[i].w === w) { found = ALL[i]; break; }
    answer = w; hint = found ? found.h : "A practice word for testing.";
    guessed = {}; wrong = 0; status = "playing"; ranked = true;
    hidePanel(); buildWord(); render(); setMsg("", "");
  },
  setMode: function (m) { if (m === "daily") startDaily(); else startPractice(cat); },
  setCat: function (cid) { switchCat(cid); },
  newWord: newWord,
  retry: retry,
  dailyFor: dailyPick,
  streakApply: streakApply, freshStreak: freshStreak, utcDayStr: utcDayStr
};

// ---- in-page deterministic self-check (?autotest=1) ----
function runAutotest() {
  var R = [];
  function chk(name, ok) { R.push({ name: name, ok: !!ok }); }
  // 1. bank integrity
  var counts = CATS.map(function (c) { return BY[c.id].length; });
  chk("bank: 6 cats, ≥55 each", counts.length === 6 && counts.every(function (n) { return n >= 55; }));
  chk("bank: ≥350 entries", ALL.length >= 350);
  chk("bank: unique words", ALL.length === new Set(ALL.map(function (e) { return e.w; })).size);
  chk("bank: word format + hint ≥8 chars", ALL.every(function (e) {
    return /^[A-Z]{2,}(?: [A-Z]{2,}){0,2}$/.test(e.w) && e.w.length <= 13 && e.h.length >= 8;
  }));
  // 2. daily determinism + category rotation
  var d1 = dailyPick("2026-09-15"), d2 = dailyPick("2026-09-15");
  chk("daily: deterministic same word", d1.w === d2.w && d1.cat === d2.cat);
  var rot = new Set();
  for (var i = 0; i < 14; i++) rot.add(dailyPick(utcDayStr(-i)).cat);
  chk("daily: rotates categories (≥2 of 6 in 14d)", rot.size >= 2);
  // 3. win flow (fresh state, injected answer)
  window.__qa.setAnswer("TIGER");
  "TIGER".split("").forEach(function (c) { guess(c); });
  var s1 = window.__qaState();
  chk("flow: win detected, 0 misses", s1.status === "won" && s1.wrong === 0);
  chk("flow: keyboard colored g", s1.keys.T === "g" && s1.keys.I === "g");
  chk("flow: word cells revealed", s1.wordCells.join("") === "TIGER");
  // 4. fail flow: 6 misses
  window.__qa.setAnswer("ZEBRA");
  ["X", "Y", "J", "Q", "W", "V"].forEach(function (c) { guess(c); });
  var s2 = window.__qaState();
  chk("flow: 6 misses → lost", s2.status === "lost" && s2.wrong === 6);
  chk("flow: miss keys colored x", s2.keys.X === "x" && s2.keys.V === "x");
  chk("flow: answer revealed on loss", s2.wordCells.join("") === "ZEBRA");
  // 5. category switch (practice)
  window.__qa.setMode("practice");
  window.__qa.setCat("food");
  var s3 = window.__qaState();
  chk("cat: switch to food picks food word", s3.cat === "food" && BY.food.some(function (e) { return e.w === s3.answer; }));
  chk("cat: hint shown & matches bank", s3.hintText.indexOf(s3.hint.split(" ")[0]) >= 0 && s3.hint.length >= 8);
  // 6. streak stack incl monthly mulligan (pure sim)
  var st = freshStreak();
  streakApply(st, utcDayStr(-3));
  var c1 = st.count;
  streakApply(st, utcDayStr(-1));
  var c2 = st.count;
  chk("streak: gap-2 mulligan keeps chain", c1 === 1 && c2 === 2 && st.protect === 0);
  // 7. share text
  var sh = shareText();
  chk("share: head + misses + url", /Neon Hangman/.test(sh) && /6/.test(sh) && /neon-hangman\/$/.test(sh));
  window.__autotest = { allPass: R.every(function (r) { return r.ok; }), results: R };
}
window.__qaRunAutotest = runAutotest;

// ---- wiring / boot ----
function boot() {
  msgEl = document.getElementById("msg");
  if (window.__qaFreeze) document.body.classList.add("nofx");
  buildCatbar(); buildKeys();
  document.getElementById("tab-daily").addEventListener("click", function () { NPHG_Sound.resume(); startDaily(); });
  document.getElementById("tab-practice").addEventListener("click", function () { NPHG_Sound.resume(); startPractice(cat); });
  document.getElementById("hintBtn").addEventListener("click", function () {
    NPHG_Sound.resume();
    hintShown = !hintShown;
    if (hintShown) pulseHint(); else { renderHint(); flashMsg(T("hintHidden"), "info"); }
    renderChips();
  });
  document.getElementById("muteBtn").addEventListener("click", function () {
    NPHG_Sound.resume(); NPHG_Sound.toggle(); renderChips();
  });
  document.getElementById("epShare").addEventListener("click", function () { copyShare(this); });
  document.getElementById("epRetry").addEventListener("click", retry);
  document.getElementById("epNext").addEventListener("click", function () {
    hidePanel();
    if (mode === "practice") newWord(); else startPractice(cat);
  });
  document.getElementById("epClose").addEventListener("click", hidePanel);
  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    var k = e.key;
    if (k && k.length === 1 && /^[a-zA-Z]$/.test(k)) {
      NPHG_Sound.resume();
      var up = k.toUpperCase();
      if (status === "playing") guess(up);
      else if (up === "H") pulseHint();
      else if (up === "M") { NPHG_Sound.toggle(); renderChips(); }
      return;
    }
    if (k === "Enter") {
      e.preventDefault();
      if (!document.getElementById("endPanel").classList.contains("hide")) hidePanel();
      else if (status === "lost") retry();
      else if (mode === "practice") newWord();
    }
    if (k === "Escape") hidePanel();
  });
  document.addEventListener("pointerdown", function () { NPHG_Sound.resume(); }, { passive: true });
  document.addEventListener("pointercancel", function () {}, { passive: true });
  document.addEventListener("visibilitychange", function () { if (!document.hidden) render(); });
  document.getElementById("tab-daily").textContent = T("daily");
  document.getElementById("tab-practice").textContent = T("practice");
  loadFree();
  startDaily();
  if (new URLSearchParams(location.search).get("autotest") === "1") runAutotest();
}
boot();
