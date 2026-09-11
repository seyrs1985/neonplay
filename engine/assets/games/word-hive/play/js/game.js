/* Word Hive — game core (word-hive.md MVP, PUZZLES from the design doc).
 * Connections-style grouping: DOM 4x4 grid, three modes, hint ladder. */
'use strict';

// ---- i18n (np_core) ----
var L = {
  en: { daily: "Daily", lib: "Library", zen: "Zen", hint: "💡 Hints", shuffle: "⇄ Shuffle",
    submit: "Submit", deselect: "Deselect", oneAway: "One away...", wrong: "Not quite",
    solvedAll: "Hive complete!", failed: "Out of lives", failedNote: "The board was revealed — retry any time (practice, unranked).",
    winNote: "{m} mistakes{h}. {b}", hintsUsed: ", used hints", share: "Copy result", retry: "Retry",
    close: "Close", left: "left", dailyDone: "Daily cleared ✓", guesses: "Guesses" },
  zh: { daily: "每日精选", lib: "图鉴", zen: "无尽禅", hint: "💡 提示", shuffle: "⇄ 洗牌",
    submit: "提交", deselect: "取消选择", oneAway: "就差一个……", wrong: "不对哦",
    solvedAll: "蜂巢全部点亮！", failed: "体力耗尽", failedNote: "谜底已揭示——随时重试同板（练习模式，不计战绩）。",
    winNote: "{m} 次失误{h}。{b}", hintsUsed: "，用了提示", share: "复制战绩", retry: "重试",
    close: "关闭", left: "剩余", dailyDone: "今日已完成 ✓", guesses: "猜测" },
  es: { daily: "Diario", lib: "Colección", zen: "Zen", hint: "💡 Pistas", shuffle: "⇄ Mezclar",
    submit: "Enviar", deselect: "Quitar selección", oneAway: "Casi…", wrong: "No exactamente",
    solvedAll: "¡Colmena completa!", failed: "Sin vidas", failedNote: "El tablero fue revelado — reintenta cuando quieras (práctica, sin rango).",
    winNote: "{m} errores{h}. {b}", hintsUsed: ", con pistas", share: "Copiar resultado", retry: "Reintentar",
    close: "Cerrar", left: "restantes", dailyDone: "Diario completado ✓", guesses: "Intentos" },
  pt: { daily: "Diário", lib: "Coleção", zen: "Zen", hint: "💡 Dicas", shuffle: "⇄ Embaralhar",
    submit: "Enviar", deselect: "Desmarcar", oneAway: "Quase…", wrong: "Não exatamente",
    solvedAll: "Colmeia completa!", failed: "Sem vidas", failedNote: "O tabuleiro foi revelado — tente quando quiser (prática, sem ranking).",
    winNote: "{m} erros{h}. {b}", hintsUsed: ", com dicas", share: "Copiar resultado", retry: "Tentar de novo",
    close: "Fechar", left: "restantes", dailyDone: "Diário concluído ✓", guesses: "Tentativas" },
  ru: { daily: "Ежедневный", lib: "Коллекция", zen: "Дзен", hint: "💡 Подсказки", shuffle: "⇄ Перемешать",
    submit: "Отправить", deselect: "Снять выбор", oneAway: "Почти…", wrong: "Не совсем",
    solvedAll: "Улей полностью освещён!", failed: "Жизни кончились", failedNote: "Поле раскрыто — переиграйте в любой момент (тренировка, без рейтинга).",
    winNote: "{m} ошибок{h}. {b}", hintsUsed: ", с подсказками", share: "Скопировать результат", retry: "Ещё раз",
    close: "Закрыть", left: "осталось", dailyDone: "Ежедневный пройден ✓", guesses: "Попытки" },
  ja: { daily: "デイリー", lib: "図鑑", zen: "禅モード", hint: "💡 ヒント", shuffle: "⇄ シャッフル",
    submit: "送信", deselect: "選択解除", oneAway: "あと1つ…", wrong: "違いました",
    solvedAll: "ハイブ完成！", failed: "ライフ切れ", failedNote: "盤面が公開されました — いつでも再挑戦できます（練習・ランキング外）。",
    winNote: "{m} ミス{h}。{b}", hintsUsed: "、ヒント使用", share: "結果をコピー", retry: "リトライ",
    close: "閉じる", left: "残り", dailyDone: "デイリー達成 ✓", guesses: "試行" },
  ko: { daily: "일일", lib: "도감", zen: "젠 모드", hint: "💡 힌트", shuffle: "⇄ 섞기",
    submit: "제출", deselect: "선택 해제", oneAway: "하나만 더…", wrong: "아니었네요",
    solvedAll: "벌집 완성!", failed: "목숨 소진", failedNote: "판이 공개되었습니다 — 언제든 다시 도전하세요(연습, 순위 없음).",
    winNote: "실수 {m}번{h}. {b}", hintsUsed: ", 힌트 사용", share: "결과 복사", retry: "재도전",
    close: "닫기", left: "남음", dailyDone: "일일 완료 ✓", guesses: "시도" },
  de: { daily: "Tagesaufgabe", lib: "Bibliothek", zen: "Zen", hint: "💡 Hinweise", shuffle: "⇄ Mischen",
    submit: "Abschicken", deselect: "Abwählen", oneAway: "Ganz nah…", wrong: "Nicht ganz",
    solvedAll: "Bienenstock komplett!", failed: "Keine Leben mehr", failedNote: "Das Brett wurde aufgedeckt — jederzeit erneut versuchen (Übung, ohne Rangliste).",
    winNote: "{m} Fehler{h}. {b}", hintsUsed: ", Hinweise genutzt", share: "Ergebnis kopieren", retry: "Nochmal",
    close: "Schließen", left: "übrig", dailyDone: "Tagesaufgabe geschafft ✓", guesses: "Versuche" },
  fr: { daily: "Quotidien", lib: "Collection", zen: "Zen", hint: "💡 Indices", shuffle: "⇄ Mélanger",
    submit: "Valider", deselect: "Désélectionner", oneAway: "Presque…", wrong: "Pas tout à fait",
    solvedAll: "Ruche complète !", failed: "Plus de vies", failedNote: "La grille a été révélée — réessaie quand tu veux (entraînement, non classé).",
    winNote: "{m} erreurs{h}. {b}", hintsUsed: ", indices utilisés", share: "Copier le résultat", retry: "Réessayer",
    close: "Fermer", left: "restants", dailyDone: "Quotidien terminé ✓", guesses: "Essais" },
  id: { daily: "Harian", lib: "Koleksi", zen: "Zen", hint: "💡 Petunjuk", shuffle: "⇄ Acak",
    submit: "Kirim", deselect: "Batal pilih", oneAway: "Tinggal satu…", wrong: "Belum tepat",
    solvedAll: "Sarang lengkap!", failed: "Kehabisan nyawa", failedNote: "Papan sudah dibuka — coba lagi kapan saja (latihan, tak berperingkat).",
    winNote: "{m} kesalahan{h}. {b}", hintsUsed: ", pakai petunjuk", share: "Salin hasil", retry: "Coba lagi",
    close: "Tutup", left: "sisa", dailyDone: "Harian selesai ✓", guesses: "Percobaan" }
};
function T(k) { return npT(L, k); }

// ---- 10 handcrafted boards (design doc — do not reorder words) ----
var PUZZLES = [
 {n:1, groups:[
   {c:'y', en:'Planets',      zh:'行星', words:['MARS','VENUS','MERCURY','JUPITER']},
   {c:'g', en:'Metals',       zh:'金属', words:['IRON','GOLD','SILVER','COPPER']},
   {c:'b', en:'Fruits',       zh:'水果', words:['MANGO','PEACH','CHERRY','LEMON']},
   {c:'p', en:'Colors',       zh:'颜色', words:['CRIMSON','TEAL','INDIGO','IVORY']}]},
 {n:2, groups:[
   {c:'y', en:'Colors',       zh:'颜色', words:['SCARLET','MAGENTA','CYAN','LILAC']},
   {c:'g', en:'Zoo animals',  zh:'动物园动物', words:['PANDA','FALCON','OTTER','LEMUR']},
   {c:'b', en:'Pizza toppings',zh:'披萨配料', words:['PEPPERONI','OLIVE','MUSHROOM','PINEAPPLE']},
   {c:'p', en:'___-man (heroes)',zh:'-man前缀(超级英雄)', words:['SPIDER','BAT','ANT','IRON']}]},
 {n:3, groups:[
   {c:'y', en:'Ice cream flavors',zh:'冰淇淋口味', words:['VANILLA','CHOCOLATE','STRAWBERRY','PISTACHIO']},
   {c:'g', en:'Enormous',    zh:'巨大的', words:['HUGE','GIANT','MAMMOTH','COLOSSAL']},
   {c:'b', en:'Card games',  zh:'牌类游戏', words:['POKER','BRIDGE','SOLITAIRE','HEARTS']},
   {c:'p', en:'Music genres',zh:'音乐流派', words:['JAZZ','BLUES','PUNK','FUNK']}]},
 {n:4, groups:[
   {c:'y', en:'Snakes',      zh:'蛇', words:['COBRA','VIPER','ADDER','BOA']},
   {c:'g', en:'Gems',        zh:'宝石', words:['OPAL','TOPAZ','GARNET','AMETHYST']},
   {c:'b', en:'Programming languages',zh:'编程语言', words:['PYTHON','JAVA','RUBY','PEARL']},
   {c:'p', en:'Card suits',  zh:'扑克花色', words:['HEART','DIAMOND','CLUB','SPADE']}]},
 {n:5, groups:[
   {c:'y', en:'Birds',       zh:'鸟类', words:['RAVEN','ROBIN','FINCH','FALCON']},
   {c:'g', en:'Casino items',zh:'赌场物品', words:['SLOT','CHIP','DECK','BET']},
   {c:'b', en:'___light',    zh:'___光', words:['MOON','DAY','FLASH','SPOT']},
   {c:'p', en:'Shades of green',zh:'绿色系', words:['OLIVE','SAGE','MINT','LIME']}]},
 {n:6, groups:[
   {c:'y', en:'Instruments', zh:'乐器', words:['CELLO','FLUTE','TRUMPET','HARP']},
   {c:'g', en:'Pets',        zh:'宠物', words:['HAMSTER','PARROT','RABBIT','CANARY']},
   {c:'b', en:'Greek letters',zh:'希腊字母', words:['ALPHA','BETA','GAMMA','DELTA']},
   {c:'p', en:'___fish',     zh:'___鱼', words:['SWORD','STAR','CAT','GOLD']}]},
 {n:7, groups:[
   {c:'y', en:'Coffee drinks',zh:'咖啡', words:['LATTE','MOCHA','ESPRESSO','AMERICANO']},
   {c:'g', en:'Kitchen tools',zh:'厨具', words:['WHISK','LADLE','GRATER','TONGS']},
   {c:'b', en:'Herbs',       zh:'香草', words:['BASIL','THYME','SAGE','MINT']},
   {c:'p', en:'Cooking methods',zh:'烹饪方式', words:['BAKE','GRILL','STEAM','POACH']}]},
 {n:8, groups:[
   {c:'y', en:'Animals',     zh:'动物', words:['ELEPHANT','GIRAFFE','ZEBRA','GAZELLE']},
   {c:'g', en:'Board games', zh:'桌游', words:['RISK','CLUE','OTHELLO','SORRY']},
   {c:'b', en:'Retro arcade games',zh:'复古街机游戏', words:['PONG','TETRIS','SNAKE','ASTEROIDS']},
   {c:'p', en:'Things with rings',zh:'有环的东西', words:['ONION','SATURN','TREE','BOXING']}]},
 {n:9, groups:[
   {c:'y', en:'Farm animals',zh:'农场动物', words:['GOAT','SHEEP','PIG','COW']},
   {c:'g', en:'Weather',     zh:'天气', words:['STORM','BLIZZARD','DRIZZLE','HAIL']},
   {c:'b', en:'Units of measure',zh:'计量单位', words:['INCH','OUNCE','FATHOM','KNOT']},
   {c:'p', en:'Palindromes', zh:'回文词', words:['LEVEL','KAYAK','ROTOR','CIVIC']}]},
 {n:10,groups:[
   {c:'y', en:'Cheeses',     zh:'奶酪', words:['BRIE','EDAM','GOUDA','FETA']},
   {c:'g', en:'Dog commands',zh:'狗狗指令', words:['SIT','STAY','HEEL','FETCH']},
   {c:'b', en:'___board',    zh:'___板', words:['KEY','SKATE','CARD','CHALK']},
   {c:'p', en:'Chess pieces',zh:'国际象棋棋子', words:['PAWN','ROOK','BISHOP','KNIGHT']}]},
];
var COLORS = { y: "#ffd54a", g: "#39ff88", b: "#00e5ff", p: "#ff2d95" };
function groupLabel(g) { return npLang() === "zh" ? g.zh : g.en; }

// ---- state ----
var SAVE_KEY = "np_wh_save";
var S = { solved: [], dailyDone: "", wins: 0 };
try {
  var d = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
  if (d) { S.solved = d.solved || []; S.dailyDone = d.dailyDone || ""; S.wins = d.wins || 0; }
} catch (e) {}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(S)); } catch (e) {} }

var mode = "daily", curBoard = null, selected, solved, lives, mistakes, hintsLeft;
var hintShown = {}, guessRows = [], hintUsed = false, over = false, lock = false;
var zenBoard = (Math.random() * 10) | 0;

function dayIndex() { return Math.floor(Date.now() / 86400000); }

// ---- board setup ----
function startBoard(n, isZen) {
  curBoard = PUZZLES[n];
  selected = []; solved = []; mistakes = 0; over = false; lock = false;
  hintsLeft = 3; hintShown = {}; guessRows = []; hintUsed = false;
  lives = isZen ? Infinity : 4;
  document.getElementById("endPanel").classList.add("hide");
  document.getElementById("solvedBanners").innerHTML = "";
  document.getElementById("msg").textContent = "";
  renderLives(); renderGrid(); renderHint();
}
function boardWords() {
  var all = [];
  curBoard.groups.forEach(function (g) { all = all.concat(g.words); });
  return all;
}
function shuffleArr(a) {
  for (var i = a.length - 1; i > 0; i--) {
    var j = (Math.random() * (i + 1)) | 0;
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}
function renderGrid() {
  var g = document.getElementById("grid");
  g.innerHTML = "";
  var words = boardWords().filter(function (w) {
    return !solved.some(function (grp) { return grp.words.indexOf(w) >= 0; });
  });
  shuffleArr(words);
  words.forEach(function (w) {
    var b = document.createElement("button");
    b.className = "wtile" + (selected.indexOf(w) >= 0 ? " sel" : "");
    b.textContent = w;
    b.addEventListener("click", function () { toggleWord(w, b); });
    g.appendChild(b);
  });
}
function renderLives() {
  var lv = document.getElementById("lives");
  lv.innerHTML = "";
  var total = mode === "zen" ? 0 : 4;
  for (var i = 0; i < total; i++) {
    var h = document.createElement("span");
    h.className = "hiv" + (lives !== Infinity && i >= lives ? " off" : "");
    lv.appendChild(h);
  }
}
function renderHint() {
  var b = document.getElementById("hintBtn");
  b.textContent = T("hint") + " ×" + hintsLeft;
  b.disabled = hintsLeft <= 0;
}
function setMsg(text, cls) {
  var m = document.getElementById("msg");
  m.textContent = text; m.className = cls || "";
}

// ---- selection + submit ----
function toggleWord(w) {
  if (over || lock) return;
  var i = selected.indexOf(w);
  if (i >= 0) selected.splice(i, 1);
  else if (selected.length < 4) selected.push(w);
  renderGrid(); updateSubmit();
}
function updateSubmit() {
  document.getElementById("submit").disabled = selected.length !== 4;
  document.getElementById("deselect").disabled = selected.length === 0;
}
function submitGuess() {
  if (selected.length !== 4 || over || lock) return;
  var groupsOf = selected.map(function (w) {
    return curBoard.groups.find(function (g) { return g.words.indexOf(w) >= 0; });
  });
  var first = groupsOf[0];
  var allSame = groupsOf.every(function (g) { return g === first; });
  guessRows.push(allSame ? [COLORS[first.c], COLORS[first.c], COLORS[first.c], COLORS[first.c]] : ["❌", "❌", "❌", "❌"]);
  if (allSame) { solveGroup(first); return; }
  // wrong: one-away check
  var counts = {};
  groupsOf.forEach(function (g) { counts[g.en] = (counts[g.en] || 0) + 1; });
  var best = 0; for (var k in counts) if (counts[k] > best) best = counts[k];
  shake();
  if (best === 3) setMsg(T("oneAway"), "oneway");
  else setMsg(T("wrong"), "info");
  if (mode !== "zen") {
    lives--;
    renderLives();
    if (lives <= 0) { failAll(); return; }
  }
  selected = []; renderGrid(); updateSubmit();
}
function shake() {
  var g = document.getElementById("grid");
  g.classList.add("shake");
  setTimeout(function () { g.classList.remove("shake"); }, 420);
}
function solveGroup(g) {
  solved.push(g);
  selected = [];
  var banner = document.createElement("div");
  banner.className = "banner";
  banner.style.background = COLORS[g.c];
  banner.innerHTML = '<div class="bn">' + groupLabel(g) + "</div><div class='bw'>" + g.words.join(", ") + "</div>";
  document.getElementById("solvedBanners").appendChild(banner);
  renderGrid(); updateSubmit();
  if (solved.length === 4) winBoard();
}
function failAll() {
  over = true;
  // reveal remaining groups one by one
  var left = curBoard.groups.filter(function (g) {
    return !solved.some(function (s) { return s.en === g.en; });
  });
  document.getElementById("solvedBanners").innerHTML = "";
  solved = [];
  left.forEach(function (g, i) {
    setTimeout(function () {
      var banner = document.createElement("div");
      banner.className = "banner";
      banner.style.background = COLORS[g.c];
      banner.innerHTML = '<div class="bn">' + groupLabel(g) + "</div><div class='bw'>" + g.words.join(", ") + "</div>";
      document.getElementById("solvedBanners").appendChild(banner);
    }, i * 350);
  });
  setTimeout(function () { showEnd(false); }, left.length * 350 + 300);
}
function winBoard() {
  over = true;
  if (hintUsed) hintMark = " 💡";
  var isDaily = mode === "daily";
  if (isDaily && S.dailyDone !== todayStr()) { S.dailyDone = todayStr(); S.wins++; save(); }
  if (mode === "lib") { S.wins++; save(); }
  if (isDaily || mode === "lib") confettiRain();
  showEnd(true);
}
var hintMark = "";
function todayStr() { var d = new Date(); return d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2); }
function showEnd(won) {
  var bd = curBoard.n;
  var shareRows = guessRows.map(function (row) {
    return row.map(function (c) { return typeof c === "string" ? c : "🟩"; }).join("");
  }).join("<br>");
  document.getElementById("epTitle").textContent = won ? T("solvedAll") : T("failed");
  document.getElementById("epRows").innerHTML = won ? shareRows : "";
  document.getElementById("epNote").textContent = won
    ? T("winNote").replace("{m}", mistakes).replace("{h}", hintUsed ? T("hintsUsed") : "").replace("{b}", "Word Hive #" + bd)
    : T("failedNote");
  document.getElementById("epShare").style.display = won ? "" : "none";
  document.getElementById("epRetry").textContent = won ? T("close") : T("retry");
  document.getElementById("endPanel").classList.remove("hide");
}
function confettiRain() {
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

// ---- hints (3-level ladder, 3 per board) ----
function useHint() {
  if (over || lock || hintsLeft <= 0) return;
  var left = curBoard.groups.filter(function (g) {
    return !solved.some(function (s) { return s.en === g.en; });
  });
  if (!left.length) return;
  var g = left[(Math.random() * left.length) | 0];
  hintsLeft--; hintUsed = true; renderHint();
  if (hintsLeft === 2) {
    setMsg("💡 " + groupLabel(g), "oneway");
  } else if (hintsLeft === 1) {
    var w = g.words.filter(function (x) { return selected.indexOf(x) < 0; })[0] || g.words[0];
    setMsg("💡 " + groupLabel(g) + ": " + w, "oneway");
  } else {
    // solve the group outright
    selected = g.words.slice();
    renderGrid(); updateSubmit();
    setTimeout(submitGuess, 250);
  }
}

// ---- modes ----
function setMode(m, libN) {
  mode = m; over = false;
  document.getElementById("tab-daily").classList.toggle("on", m === "daily");
  document.getElementById("tab-lib").classList.toggle("on", m === "lib");
  document.getElementById("tab-zen").classList.toggle("on", m === "zen");
  var lib = document.getElementById("libSel");
  if (m === "lib") {
    lib.classList.remove("hide");
    lib.innerHTML = "";
    PUZZLES.forEach(function (p) {
      var b = document.createElement("button");
      b.textContent = p.n;
      if (S.solved.indexOf(p.n) >= 0) b.classList.add("done");
      b.addEventListener("click", function () {
        startBoard(p.n - 1, false);
        curBoardN = p.n - 1;
      });
      lib.appendChild(b);
    });
    startBoard(libN !== undefined ? libN : 0, false);
    curBoardN = libN !== undefined ? libN : 0;
  } else {
    lib.classList.add("hide");
    if (m === "daily") startBoard(dayIndex() % 10, false);
    else startBoard(zenBoard, true);
  }
}
var curBoardN = 0;

// ---- hooks ----
window.__qaState = function () {
  return {
    mode: mode, board: curBoard ? curBoard.n : 0,
    lives: lives, mistakes: mistakes, hintsLeft: hintsLeft,
    solvedCount: solved.length, selected: selected.slice(),
    over: over, dailyDone: S.dailyDone, words: boardWords().slice(0, 4)
  };
};
window.__qa = {
  click: function (w) {
    var b = [...document.querySelectorAll(".wtile")].find(function (x) { return x.textContent === w; });
    if (b) b.click(); else throw new Error("word not on board: " + w);
  },
  selectWords: function (arr) {  // white-box: set selection directly, then repaint
    selected = arr.slice();
    renderGrid(); updateSubmit();
  },
  submit: function () { document.getElementById("submit").click(); },
  hint: function () { useHint(); },
  setDay: function (n) { var real = Date.now; Date.now = function () { return real() + n * 86400000; }; }
};

// ---- wiring ----
document.getElementById("submit").addEventListener("click", submitGuess);
document.getElementById("deselect").addEventListener("click", function () { selected = []; renderGrid(); updateSubmit(); });
document.getElementById("shuffleBtn").addEventListener("click", function () { renderGrid(); });
document.getElementById("hintBtn").addEventListener("click", useHint);
document.getElementById("tab-daily").addEventListener("click", function () { setMode("daily"); });
document.getElementById("tab-lib").addEventListener("click", function () { setMode("lib"); });
document.getElementById("tab-zen").addEventListener("click", function () { zenBoard = (Math.random() * 10) | 0; setMode("zen"); });
document.getElementById("epShare").addEventListener("click", function () {
  var text = "Word Hive #" + curBoard.n + "\n" + guessRows.map(function (row) {
    return row.map(function (c) { return typeof c === "string" ? c : "🟩"; }).join("");
  }).join("\n") + "\n" + mistakes + " mistakes" + (hintUsed ? " 💡" : "") + " → https://seyrs1985.github.io/neonplay/word-hive/";
  if (navigator.clipboard) navigator.clipboard.writeText(text);
  this.textContent = "✓";
});
document.getElementById("epRetry").addEventListener("click", function () {
  document.getElementById("endPanel").classList.add("hide");
  if (!over || true) startBoard(curBoardN, mode === "zen");  // retry same board, fresh lives
});
document.addEventListener("keydown", function (e) {
  if (e.key === "s" || e.key === "S") renderGrid();
  else if (e.key === "h" || e.key === "H") useHint();
  else if (e.key === "u" || e.key === "U") { selected.pop(); renderGrid(); updateSubmit(); }
});
document.addEventListener("pointercancel", function () {}, { passive: true });

// ---- boot ----
document.getElementById("tab-daily").textContent = T("daily");
document.getElementById("tab-lib").textContent = T("lib");
document.getElementById("tab-zen").textContent = T("zen");
document.getElementById("hintBtn").textContent = T("hint");
document.getElementById("shuffleBtn").textContent = T("shuffle");
document.getElementById("submit").textContent = T("submit");
document.getElementById("deselect").textContent = T("deselect");
setMode("daily");
