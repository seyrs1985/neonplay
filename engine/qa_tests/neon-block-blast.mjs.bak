export default async function (h) {
  await h.evaluate(`try{localStorage.clear()}catch(e){}; location.reload()`);
  for (let i = 0; i < 20; i++) { await h.sleep(300); const ok = await h.evaluate(`typeof __qaState==='function'`).catch(()=>false); if (ok) break; }
  await h.evaluate(`__qa.clearBoard(); __qa.setShapes(0,1,2);
    (function(){var a=new Array(64).fill(0);for(var c=0;c<8;c++)if(c!==5)a[c]=1;__qa.setBoard(a);})()`);
  await h.sleep(300);
  const before = await h.evaluate(`JSON.stringify(__qaState().board.slice(0,8))`);
  const r = await h.evaluate(`__qa.placeAt(0,0,5)`);
  const mid = await h.evaluate(`JSON.stringify(__qaState().board.slice(0,8))`);
  await h.sleep(700);
  const after = await h.evaluate(`JSON.stringify(__qaState().board.slice(0,8)) + ' score=' + __qaState().score`);
  return { pass: after.indexOf('00000000') === 0, detail: 'before='+before+' r='+r+' mid='+mid+' after='+after };
}