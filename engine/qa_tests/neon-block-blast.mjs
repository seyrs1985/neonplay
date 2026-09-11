/* neon-block-blast QA — design doc acceptance:
 * A) placement scores, full-line clears multiply score (double-line >= 40)
 * B) when every remaining candidate is out of moves → settlement panel.
 * White-box hooks (game is IIFE-scoped); boards are constructed via __qa. */
export default async function (h) {
  await h.evaluate(`try{localStorage.removeItem("nbb_best")}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) {
    await h.sleep(300);
    const ok = await h.evaluate(`typeof __qaState === 'function'`).catch(() => false);
    if (ok) break;
  }
  const st = () => h.evaluate(`__qaState()`);

  // --- A) line-clear scoring: full-minus-one row 3, drop 1x1 into the gap ---
  await h.evaluate(`__qa.clearBoard(); __qa.setShapes(0, 9, 9)`);
  await h.evaluate(`(function(){var a=new Array(64).fill(1);a[27]=0;__qa.setBoard(a);})()`);
  await h.sleep(200);
  const rA = await h.evaluate(`__qa.placeAt(0, 3, 3)`);
  await h.sleep(600);
  const sA = await st();
  if (rA !== "ok") return { pass: false, detail: `A: placement rejected: ${rA}` };
  if (sA.score < 40) return { pass: false, detail: `A: line-clear score missing: ${sA.score}` };
  const row3 = sA.board.slice(24, 32).every(v => v === 0);
  if (!row3) return { pass: false, detail: `A: row 3 not cleared: ${sA.board.slice(24, 32).join("")}` };

  // --- B) settlement: checkerboard hollow + 1x1 candidate fills the last
  //     usable hole (no line clear) → both 2x2s unfittable → GAME OVER
  await h.evaluate(`__qa.clearBoard(); __qa.setShapes(0, 9, 9);
    (function(){var a=new Array(64).fill(0);
      for(var r=0;r<8;r++)for(var c=0;c<8;c++){var odd=(r+c)%2===1;if(odd)a[r*8+c]=1;}
      a[0]=0; /* the single extra hole the 1x1 will fill */
      __qa.setBoard(a);})()`);
  await h.sleep(200);
  const rB = await h.evaluate(`__qa.placeAt(0, 0, 0)`);
  await h.sleep(400);
  const sB = await st();
  if (rB !== "ok") return { pass: false, detail: `B: placement rejected: ${rB}` };
  const overShown = await h.evaluate(`document.getElementById('over').style.display`);
  if (overShown !== "flex" || !sB.over)
    return { pass: false, detail: `B: settlement panel not shown (display=${overShown} over=${sB.over})` };
  const ovScore = await h.evaluate(`document.getElementById('ovScore').textContent`);
  if (ovScore !== String(sB.score)) return { pass: false, detail: `B: settlement score mismatch: ${ovScore} vs ${sB.score}` };

  return { pass: true, detail: `A: double-line clear score=${sA.score}; B: no-fit settlement panel with score=${ovScore}` };
}
