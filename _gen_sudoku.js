// Pre-generator: build 60 unique-solution sudoku boards (20 per difficulty)
// and emit a JSON table. Run ONCE at dev time; output goes into game.js data.
const fs = require("fs");
const src = fs.readFileSync("engine/assets/games/sudoku/play/js/game.js", "utf8");

function grab(name) {
  const start = src.indexOf("function " + name);
  if (start < 0) throw new Error("missing " + name);
  let depth = 0, i = src.indexOf("{", start);
  for (let j = i; j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}") { depth--; if (depth === 0) return src.slice(start, j + 1); }
  }
  throw new Error("unbalanced " + name);
}
eval(grab("mulberry32"));
eval(grab("hashStr"));
eval(grab("peersOf"));
eval(grab("countSolutions"));
eval(grab("genSolution"));
eval(grab("digHoles"));
eval(grab("todayStr"));
var PEERS = [];
for (var pi = 0; pi < 81; pi++) PEERS.push(peersOf(pi));

const CFG = [["easy", 42], ["med", 36], ["hard", 30]];
const out = [];
for (const [name, clues] of CFG) {
  let k = 0;
  while (k < 20) {
    const rng = mulberry32(hashStr(`np-sudoku-${name}-${k}`));
    const sol = genSolution(rng);
    const g = digHoles(sol, rng, clues);
    const cnt = countSolutions(g, 2);
    if (cnt !== 1) { console.error(`REJECT ${name}#${k}: ${cnt} solutions`); k++; continue; }
    out.push({ d: name, clues: g.filter(Boolean).length,
      puzzle: g.join("").replace(/0/g, "."), solution: sol.join("") });
    k++;
    console.log(`${name} ${k}/20 ok (clues=${g.filter(Boolean).length})`);
  }
}
fs.writeFileSync("engine/_sudoku_table.json", JSON.stringify(out));
console.log("TOTAL", out.length);
